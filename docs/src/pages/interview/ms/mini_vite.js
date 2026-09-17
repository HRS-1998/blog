// ============================================================================
// Mini-Vite：面试手写版核心实现（Node 内置模块，零依赖，可直接运行）
// 覆盖 Vite 2/3/5 的核心机制：
//   ① dev server + 中间件架构（connect 风格）
//   ② 依赖预构建（pre-bundling，esbuild 概念实现）
//   ③ 模块转换管线（transformRequest：resolveId → load → transform）
//   ④ import 分析重写（bare import → /node_modules/.vite/deps）
//   ⑤ 模块图（ModuleGraph：HMR 传播的基础数据结构）
//   ⑥ HMR：WebSocket 热更新 + 更新边界（accepted 边界）传播
//
// 运行方式：
//   node mini_vite.js
//   然后浏览器打开 http://localhost:5173
// ============================================================================
//
// ============================ 文件结构总览 ============================
//
//  章节                          核心函数（★ = 面试重点）             职责
//  ─────────────────────────────────────────────────────────────────────
//  一、整体架构与流程图          （无代码）                            Dev 请求链路图
//                                                                    HMR 更新链路图
//                                                                    Build 打包链路图
//                                                                    「为什么快」原理
//  ─────────────────────────────────────────────────────────────────────
//  二、模块图 ModuleGraph ★★★    class ModuleNode                     模块节点：
//                                                                    importers（反向：
//                                                                    谁引用了我）
//                                                                    importedModules
//                                                                    （正向：我引用了谁）
//                                                                    isSelfAccepting
//                                                                    （HMR 边界标记）
//                                getModuleByUrl ★                    URL→节点（懒创建）
//                                updateModuleInfo ★                  登记双向依赖关系
//                                invalidateModule                    HMR 失效缓存
//  ─────────────────────────────────────────────────────────────────────
//  三、依赖预构建 ★              optimizeDeps ★                      启动时预构建依赖
//                                getDepHash ★                        hash 缓存 key
//                                                                    （二次启动快的原因）
//  ─────────────────────────────────────────────────────────────────────
//  四、模块转换管线 ★★★          resolveId ★ 4.1                      URL → 磁盘绝对路径
//                                load ★ 4.2                          读源码（JSON→ESM）
//                                transform ★ 4.3                     按后缀转换
//                                rewriteImports ★★★ 4.4              import 重写为 HTTP URL
//                                                                    + 登记模块图
//                                resolveImportSpec ★ 4.5             单条 import 解析规则
//                                toUrlPath                           绝对路径 → URL
//  ─────────────────────────────────────────────────────────────────────
//  五、Dev Server ★★★            transformMiddleware ★ 5.1           心脏中间件：
//                                                                    html/静态/模块分流
//                                transformRequest ★ 5.2               三段式管线组装
//                                                                    （+ 转换缓存）
//                                send                                 响应工具
//                                createServer ★ 5.3                  顶层组装：
//                                                                    http + ws + watcher
//                                createWebSocketServer ★ 5.4         原生 WS 服务端
//  ─────────────────────────────────────────────────────────────────────
//  六、HMR ★★★                   setupWatcher ★ 6.1                   文件监听入口
//                                handleHMRUpdate ★ 6.2               变更→找模块节点→失效
//                                propagateUpdate ★★★ 6.3            更新边界传播
//                                                                    （HMR 精髓，必背）
//                                injectHmrClient ★ 6.4               标记 isSelfAccepting
//                                                                    + 浏览器端胶水
//  ─────────────────────────────────────────────────────────────────────
//  七、启动                      （node mini_vite.js / test 参数）        直接执行
//  ─────────────────────────────────────────────────────────────────────
//  八、面试要点速答              （无代码）                            5 个高频问题的
//                                                                    对照答案
//  ─────────────────────────────────────────────────────────────────────
//  九、依赖扫描 ★★              scanImports ★                        DFS + visited 去重
//                                                                    从入口收集所有
//                                                                    bare import
//                                                                    （预构建输入）
//  ─────────────────────────────────────────────────────────────────────
//  十、Tree-shaking ★★          parseModule ★                        正则提取 import
//                                                                    绑定 / export 清单
//                                treeShake ★                          三阶段：
//                                                                    parse → BFS 可达
//                                                                    标记 → shake 死代码
//                                                                    （含副作用导入考点）
//  ─────────────────────────────────────────────────────────────────────
//  数据流一图流：
//    请求 → ⑤ transformMiddleware → ④ transformRequest（resolveId→load→
//    transform→rewriteImports 登记模块图）→ 响应原生 ESM → 浏览器发现新
//    import → 再次请求（回到 ⑤）
//    变更 → ⑥ watcher → handleHMRUpdate → propagateUpdate 沿 ② 模块图的
//    importers 向上找 accept 边界 → WS 推送 → 浏览器带 ?t= 重新 import
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let root = process.cwd(); // 项目根目录（let：算法自测时会临时切到测试目录）
const port = 5173;

// ============================================================================
// 一、整体架构与流程图
// ============================================================================

// ----------------------- Dev 模式请求流程图 -----------------------
//
//  浏览器请求 /src/main.js
//        │
//        ▼
//  [① transformMiddleware]  ★核心：模块转换中间件（Vite 的心脏）
//        │
//        ▼
//  [② transformRequest(url)]  ★核心：三段式管线（模仿 Rollup 插件钩子）
//        │
//        ├─ 2.1 resolveId(url)   → 把浏览器里的 URL 解析成磁盘上的绝对路径
//        │                        ★核心：/src/main.js → /root/src/main.js
//        │                        ★核心：vue → /root/node_modules/.vite/deps/vue.js
//        │
//        ├─ 2.2 load(id)        → fs.readFileSync 读出源码字符串
//        │
//        └─ 2.3 transform(code) → 针对不同后缀做转换
//                                 .js  → ③ importAnalysisPlugin ★核心：重写 import
//                                 .json → 导出为 JS 对象
//                                 （真实 Vite 还有 .vue/.ts/.jsx/.css...）
//        │
//        ▼
//  [③ importAnalysis]  ★核心：源码里的 import 路径全部改写为 HTTP URL
//        │   import { createApp } from 'vue'
//        │        ↓ 改写成
//        │   import { createApp } from '/node_modules/.vite/deps/vue.js'
//        │   import Child from './Child.vue'
//        │        ↓ 改写成
//        │   import Child from '/src/Child.vue'
//        │
//        ▼
//  返回给浏览器（原生 ESM，不打包！）
//        │
//        ▼
//  浏览器发现新的 import → 再次发起请求（按需、懒加载）
//        │
//        ▼
//  ② ~ ④ 循环，直到整棵依赖树加载完毕
//
// ----------------------- HMR 更新流程图 -----------------------
//
//  文件保存（a.js 修改）
//        │
//        ▼
//  [⑦ watcher] chokidar 监听到 change（这里用 fs.watch 简化）
//        │
//        ▼
//  [⑧ handleHMRUpdate] ★核心：找到变更的模块节点
//        │
//        ▼
//  [⑨ propagateUpdate] ★核心：沿模块图向上找「更新边界」
//        │
//        │   接受了自身更新的模块（isSelfAccepting）→ 边界就是它
//        │   一直向上到入口都没接受 → 整页 reload
//        │
//        ▼
//  [⑩ WebSocket] 向浏览器推送 { type: 'update', ... }
//        │
//        ▼
//  浏览器端：fetch 新模块（带 ?t= 时间戳绕过缓存）→ 动态 import → 执行回调
//
// ----------------------- Build 模式流程图 -----------------------
//
//  [起点] vite build
//     │
//     ▼
//  ① 依赖预构建 esbuild（首次 dev 时也会做）
//     把零散的 CJS 依赖（lodash 等）→ 合并成单个 ESM 文件
//     node_modules/esbuild → .vite/deps/*.js（缓存 + hash）
//     为什么用 esbuild？Go 编写，比 JS 工具快 10~100 倍
//     │
//     ▼
//  ② Rollup 打包（build 用 Rollup，dev 不打包）
//     resolveId → load → transform（和 dev 共享同一套插件管线！）
//     │
//     ▼
//  ③ 产物输出
//     dist/assets/index-[hash].js   （hash 文件名做长效缓存）
//     dist/assets/index-[hash].css
//     dist/index.html（注入构建后的 script 标签）
//     │
//     ▼
//  ④ CSS 处理：抽取成独立文件 + 压缩（esbuild minify）
//
// ----------------------- 为什么 dev 不打包也快？-----------------------
//  Webpack：启动时全量打包 → 项目越大越慢
//  Vite：  启动只处理入口，其余模块按需在「浏览器请求到达时」才转换
//          冷启动时间和项目大小解耦，这就是 Vite 快的本质
// ============================================================================

// ============================================================================
// 二、模块图（ModuleGraph）—— HMR 的数据结构基础 ★★★核心
// ============================================================================
// 每个被浏览器请求过的模块都会在这里登记成一个 ModuleNode。
// 关键是两份映射：URL → 模块节点、模块 → 它 import 了谁（deps）
// 以及反向的：模块 → 谁 import 了它（importers）
// HMR 的「向上找边界」就是沿着 importers 爬树。

class ModuleNode {
  constructor(url) {
    this.url = url; // 浏览器可访问的 URL，如 /src/main.js
    this.id = null; // 磁盘绝对路径
    this.file = null; // 同 id，语义化字段
    this.transformResult = null; // 转换后的代码缓存（含 map）
    this.importers = new Set(); // 反向依赖：谁引用了我（HMR 向上传播用）
    this.importedModules = new Set(); // 正向依赖：我引用了谁
    this.isSelfAccepting = false; // 是否接受自身更新（HMR 边界判断用）
    this.lastHMRTimestamp = 0; // ?t= 时间戳，破缓存用
  }
}

class ModuleGraph {
  constructor() {
    this.urlToModuleMap = new Map(); // '/src/main.js' → ModuleNode
    this.fileToModulesMap = new Map(); // 绝对路径 → Set<ModuleNode>
  }

  // ★核心：获取（或创建）模块节点。模块图是懒构建的：
  // 只有被浏览器请求过 / 被 import 分析扫描到的模块才会入图
  getModuleByUrl(rawUrl) {
    const url = cleanUrl(rawUrl); // 去掉 ?t=123 之类的查询参数
    let mod = this.urlToModuleMap.get(url);
    if (!mod) {
      mod = new ModuleNode(url);
      this.urlToModuleMap.set(url, mod);
    }
    return mod;
  }

  // ★核心：登记依赖关系。import 分析时发现 A import 了 B，就调用这里
  // 既维护正向（importedModules），也维护反向（importers）
  updateModuleInfo(mod, importedModules) {
    const lastImported = mod.importedModules;
    // 先清掉旧的反向引用（模块重转后依赖可能变化）
    for (const importedMod of lastImported) {
      importedMod.importers.delete(mod);
    }
    mod.importedModules = new Set(importedModules);
    for (const importedMod of importedModules) {
      importedMod.importers.add(mod);
    }
  }

  invalidateModule(mod) {
    mod.transformResult = null; // 清缓存，下次请求重新转换
    mod.lastHMRTimestamp = Date.now();
  }
}

// 工具：去掉 URL 的 query（?t=1700000000）
function cleanUrl(url) {
  return url.replace(/[?#].*$/, '');
}

const moduleGraph = new ModuleGraph();

// ============================================================================
// 三、依赖预构建（pre-bundling）★核心
// ============================================================================
// 为什么要预构建？
//   1. ESM 兼容：很多包只发 CJS（react/lodash-es 之外的 lodash），浏览器跑不了
//      → esbuild 把 CJS 转成 ESM
//   2. 减少请求数：lodash-es 有 600+ 个模块文件，不合并的话
//      浏览器要发 600 个请求（依赖瀑布）
//      → 合并成单个 ESM 文件，请求归一
// 真实 Vite：esbuild 扫描入口 → 找出所有 bare import → 打包进
//   node_modules/.vite/deps/，并按 package.json 的 deps 生成 hash 做缓存。
// 这里实现「缓存命中判断 + hash」的思想（真正的转包交给 esbuild，面试口述）。

const cacheDir = path.join(root, 'node_modules', '.vite', 'deps');

// ★核心：预构建缓存 hash —— 依赖清单变化时自动重新预构建
// 真实 Vite 的缓存 key = lockfile hash + config + 依赖版本列表
function getDepHash(deps) {
  const content = JSON.stringify({
    deps, // package.json 里的 dependencies
    // 真实 Vite 还会混入 vite 版本、config 文件 hash
  });
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

// ★核心：预构建入口。dev server 启动时调用（optimizeDeps）
function optimizeDeps() {
  const pkgPath = path.join(root, 'package.json');
  const deps = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).dependencies || {}
    : {};

  const hash = getDepHash(deps);
  const metaPath = path.join(cacheDir, '_metadata.json');

  // 缓存命中：hash 没变就复用上次产物（二次启动快如闪电的原因）
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (meta.hash === hash) {
      console.log('[mini-vite] 依赖预构建：缓存命中，跳过');
      return;
    }
  }

  console.log('[mini-vite] 依赖预构建：', Object.keys(deps).join(', ') || '(无依赖)');
  // 真实实现（口述）：
  //   await esbuild.build({
  //     entryPoints: bareImports,           // 扫描出的裸依赖入口
  //     bundle: true, format: 'esm',
  //     splitting: true,
  //     outdir: 'node_modules/.vite/deps',
  //   })
  // 这里做演示目录 + 元数据：
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify({ hash, optimized: deps }, null, 2));
}

// ============================================================================
// 四、模块转换管线 ★★★核心（Vite 的心脏）
// ============================================================================
// transformRequest 是 Vite 源码里的真实函数名（dev server 里每个模块请求
// 都走它）。三段式直接对应 Rollup 插件钩子：
//   resolveId → load → transform
// 这就是「Vite 的插件体系兼容 Rollup 生态」的原因。

// ★核心 4.1：resolveId —— 把请求 URL 解析成磁盘绝对路径
// 三种情况：
//   /src/main.js    → root + 路径（项目源码）
//   /@fs/xxx        → 绝对路径直通（真实 Vite 的 /@fs 协议）
//   bare import     → 已被 import 分析重写为 /node_modules/.vite/deps/xxx
//                      这里直接拼 root
function resolveId(url) {
  if (url.startsWith('/@fs/')) {
    return url.slice(4); // /@fs/D:/xxx → D:/xxx
  }
  if (url.startsWith('/node_modules/')) {
    return path.join(root, url); // 预构建产物或直接暴露的依赖
  }
  return path.join(root, url); // 项目源码：/src/main.js → {root}/src/main.js
}

// ★核心 4.2：load —— 读取文件源码（真实 Vite 是一个插件管道，按后缀分流）
function load(id) {
  const realPath = fs.existsSync(id) ? id : id.replace(/\.js$/, '.json');
  if (!fs.existsSync(realPath)) return null;
  const code = fs.readFileSync(realPath, 'utf-8');
  // ---- .json 的转换插件：改成 ESM 导出（Vite 真实行为）----
  if (realPath.endsWith('.json')) {
    return `export default ${code.trim()}`;
  }
  return code;
}

// ★核心 4.3：transform —— 转换源码。这里最关键的是 JS 的 import 分析重写，
// JSON 在 load 里已处理，真实 Vite 在这里处理 .vue/.ts/.jsx/css...
function transform(code, id) {
  if (!id.endsWith('.js') && !id.endsWith('.mjs')) return code;
  return rewriteImports(code, id);
}

// ★★★核心 4.4：import 分析与重写 —— Vite 最核心的黑魔法
// 浏览器原生 ESM 的 import 必须是合法 URL，但源码里写的是：
//   import vue from 'vue'                    ← bare import，浏览器不认识
//   import Child from './Child.vue'           ← 相对路径，浏览器不认识
// 全部改写成 HTTP 绝对路径，浏览器才能继续发起请求。
// 同时顺带做两件事：
//   a) 记录模块依赖 → 更新 ModuleGraph（HMR 的数据来源）
//   b) 注入 HMR 客户端代码（见第六节）
function rewriteImports(code, importerId) {
  const importedModules = []; // 本模块依赖的 ModuleNode 列表
  const importerNode = moduleGraph.getModuleByUrl(
    toUrlPath(importerId, root),
  );

  // 匹配 import ... from '...' / import('...') / export ... from '...'
  const importRegex =
    /(\bimport\s+(?:[\s\S]*?\s+from\s+)?|\bexport\s+[\s\S]*?\s+from\s+|\bimport\s*\(\s*)(['"])([^'"]+)\2/g;

  const rewritten = code.replace(importRegex, (match, prefix, quote, spec) => {
    const resolved = resolveImportSpec(spec, importerId);
    if (resolved === null) return match; // 解析失败，原样保留

    // ★登记模块图：importer 依赖了 resolved
    const depNode = moduleGraph.getModuleByUrl(resolved);
    importedModules.push(depNode);

    // 重写为浏览器可用的绝对 URL
    return `${prefix}${quote}${resolved}${quote}`;
  });

  // ★更新模块图的正反向引用（HMR 边界传播全靠这个）
  moduleGraph.updateModuleInfo(importerNode, importedModules);

  // 注入 HMR 客户端（仅入口不需要——真实 Vite 由 index.html 引入 /@vite/client）
  return injectHmrClient(rewritten, importerNode);
}

// 绝对路径 → URL 形式（Windows 下把 \ 换成 /）
function toUrlPath(id, fromRoot) {
  let rel = path.relative(fromRoot, id).replace(/\\/g, '/');
  if (!rel.startsWith('/')) rel = '/' + rel;
  return rel;
}

// ★核心 4.5：单条 import 说明符（specifier）的解析规则
function resolveImportSpec(spec, importerId) {
  // ① bare import：不以 / ./ ../ 开头 → 依赖，指向预构建产物
  if (!spec.startsWith('.') && !spec.startsWith('/')) {
    return `/node_modules/.vite/deps/${spec.replace(/\//g, '_')}.js`;
  }
  // ② 相对/绝对路径 → 拼出磁盘路径再转回 URL
  const baseDir = path.dirname(importerId);
  const abs = spec.startsWith('/')
    ? path.join(root, spec)
    : path.resolve(baseDir, spec);
  return toUrlPath(abs, root);
}

// ============================================================================
// 五、Dev Server + 中间件架构 ★★★核心
// ============================================================================
// Vite 的 server 是 connect 风格的中间件管道，请求依次流过：
//   ① 静态资源（/public）→ ② transform 中间件（JS/JSX/Vue...）→ ③ index.html 兜底
// 这里用 Node http 实现同构的最小骨架。

// ★核心 5.1：transformMiddleware —— Vite 的心脏中间件
// 浏览器请求的每一个模块都从这里进入三段式管线
function transformMiddleware(req, res) {
  const url = decodeURIComponent(req.url);

  // ① index.html：开发模式不做任何打包，直接返回（并注入 /@vite/client）
  if (url === '/' || url === '/index.html') {
    const htmlPath = path.join(root, 'index.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf-8');
      // 真实 Vite 会解析 html 里的 <script src> 并改写为绝对路径
      html = html.replace(
        /<script\s+type="module"\s+src="\/?(.*?)"/g,
        '<script type="module" src="/$1"',
      );
      return send(res, '200', html, 'text/html');
    }
    return send(res, '404', 'index.html not found', 'text/plain');
  }

  // ② 静态资源：node_modules 预构建产物等直接透传
  if (url.startsWith('/node_modules/')) {
    const file = path.join(root, url.split('?')[0]);
    if (fs.existsSync(file)) {
      return send(res, '200', fs.readFileSync(file), 'text/javascript');
    }
    return send(res, '404', 'dep not found: ' + url, 'text/plain');
  }

  // ③ 模块请求：进三段式管线
  const result = transformRequest(url);
  if (result) {
    // ★缓存协商：Etag + 304，配合 ?t= 时间戳实现「修改后立刻拿新代码」
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache'); // 允许缓存但要校验
    res.end(result.code);
    return;
  }
  send(res, '404', 'not found: ' + url, 'text/plain');
}

// ★核心 5.2：transformRequest —— 三段式管线的组装（对齐 Vite 源码函数名）
// 带 transformResult 缓存：同一模块的多次请求复用转换结果
function transformRequest(url) {
  const mod = moduleGraph.getModuleByUrl(url);
  const file = resolveId(cleanUrl(url)); // ① resolveId
  mod.id = file;
  mod.file = file;

  // 缓存命中（且没有因 HMR 被 invalidate）直接返回
  if (mod.transformResult) {
    return mod.transformResult;
  }

  const raw = load(file); // ② load
  if (raw === null) return null;

  const code = transform(raw, file); // ③ transform（内部做 import 重写）
  mod.transformResult = { code };
  return mod.transformResult;
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type + '; charset=utf-8' });
  res.end(body);
}

// ★核心 5.3：createServer —— 组装一切（Vite 导出的顶层函数）
function createServer() {
  optimizeDeps(); // 启动时预构建依赖（真实 Vite 是异步的，这里同步演示）

  // HTTP 服务
  const server = http.createServer((req, res) => {
    transformMiddleware(req, res);
  });

  // WebSocket（HMR 推送通道，简化版原生实现）
  // 真实 Vite 用 ws 库，并且支持 HMR payload 协议（connected/update/full-reload...）
  const wss = createWebSocketServer(server);

  // 文件监听（真实 Vite 用 chokidar，跨平台 + 忽略 .git/node_modules）
  setupWatcher(wss);

  server.listen(port, () => {
    console.log(`[mini-vite] dev server 跑起来了: http://localhost:${port}`);
  });
}

// ★核心 5.4：极简 WebSocket 服务端（用原生实现，体现「HMR 走 WS 通道」）
function createWebSocketServer(server) {
  const clients = new Set(); // 所有连接着的浏览器 tab

  server.on('upgrade', (req, socket) => {
    // 原生握手：计算 Sec-WebSocket-Accept
    const key = req.headers['sec-websocket-key'];
    const accept = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
  });

  return {
    // 广播 HMR 消息（真实 Vite 的 payload: {type, updates, timestamp}）
    send(payload) {
      const data = Buffer.from(JSON.stringify(payload));
      for (const socket of clients) {
        // 简化：不处理分帧掩码（演示用；真实请用 ws 库）
        socket.write(data);
      }
    },
  };
}

// ============================================================================
// 六、HMR（热模块替换）★★★核心
// ============================================================================
// 三个关键问题（面试必问）：
//   Q1 怎么知道文件变了？   → watcher（chokidar / fs.watch）
//   Q2 变了以后更新谁？     → 沿模块图向上找「接受更新的边界」
//   Q3 浏览器怎么拿到新代码？→ WebSocket 通知 + 动态 import（带 ?t= 时间戳）

// ★核心 6.1：文件监听
function setupWatcher(wss) {
  // 递归监听根目录（真实 Vite 用 chokidar，能处理跨平台/符号链接/忽略规则）
  try {
    fs.watch(root, { recursive: true }, (event, filename) => {
      if (!filename) return;
      const file = path.join(root, filename);
      // 只关心源码文件，忽略 node_modules / .git
      if (
        filename.includes('node_modules') ||
        filename.includes('.git') ||
        !/\.(js|json|vue|ts|css)$/.test(filename)
      ) {
        return;
      }
      handleHMRUpdate(file, wss);
    });
  } catch (e) {
    // 某些系统不支持 recursive，降级
    console.warn('[mini-vite] 递归监听不可用：', e.message);
  }
}

// ★核心 6.2：HMR 入口 —— 文件变更后找到模块节点
function handleHMRUpdate(file, wss) {
  const url = toUrlPath(file, root);
  const mod = moduleGraph.urlToModuleMap.get(cleanUrl(url));

  console.log(`[hmr] 文件变更: ${url}`);

  // 这个模块还没进过模块图（没被浏览器请求过）→ 无需处理
  if (!mod) return;

  // ★失效缓存：下次请求重新走 transform 管线
  moduleGraph.invalidateModule(mod);

  // 沿模块图向上传播，找出需要更新的边界
  const updates = propagateUpdate(mod);

  if (updates === null) {
    // 没有任何模块接受更新 → 整页刷新（最粗暴但永远正确的兜底）
    console.log('[hmr] 没有接受更新的边界，整页 reload');
    wss.send({ type: 'full-reload' });
  } else {
    console.log(`[hmr] 边界: ${updates.map((m) => m.url).join(', ')}`);
    wss.send({
      type: 'update',
      updates: updates.map((m) => ({
        type: 'js-update',
        url: m.url,
        timestamp: m.lastHMRTimestamp,
      })),
    });
  }
}

// ★★★核心 6.3：更新边界传播（Vite HMR 精髓，面试高频）
// 递归沿 importers（谁引用了我）向上爬：
//   - 某个模块 isSelfAccepting（调用了 import.meta.hot.accept()）
//     → 它就是边界，推给浏览器单独更新它
//   - 爬到顶（入口）都没人接受 → 返回 null，整页刷新
// 举例：a.js 改了，b.js import 了 a 且 b 声明了 accept →
//   边界是 b，浏览器只需重新加载 b（a 作为 b 的依赖随之重载）
function propagateUpdate(mod, boundaries = new Set(), seen = new Set()) {
  if (seen.has(mod)) return boundaries; // 环形引用保护
  seen.add(mod);

  // 情况1：模块自己接受更新（源码里有 import.meta.hot.accept()）
  if (mod.isSelfAccepting) {
    boundaries.add(mod);
    return boundaries;
  }

  // 情况2：没有 importer（入口模块）且自己不接受 → 死路
  if (mod.importers.size === 0) {
    return null;
  }

  // 情况3：向上传播给所有引用者
  for (const importer of mod.importers) {
    if (importer.acceptedHmrDeps?.has(mod)) {
      // 引用者明确声明接受「这个依赖」的更新：import.meta.hot.accept(['./a.js'], cb)
      boundaries.add(importer);
    } else {
      // 引用者没声明 → 继续向上爬
      const result = propagateUpdate(importer, boundaries, seen);
      if (result === null) return null; // 有一条链走到顶都没人接受
    }
  }
  return boundaries;
}

// ★核心 6.4：向模块注入 HMR 客户端胶水代码
// 源码里写 import.meta.hot.accept(...)，我们的 transform 会把它转成
// 对模块图节点的标记。真实 Vite 是注入完整的 /@vite/client 运行时。
function injectHmrClient(code, mod) {
  // 静态标记：有 accept() 调用 → isSelfAccepting = true
  if (/import\.meta\.hot\.accept\s*\(/.test(code)) {
    mod.isSelfAccepting = true;
  }
  // 真实注入的客户端（浏览器端）长这样（简化展示，不真正注入 script）：
  //
  //   new WebSocket(`ws://${location.host}`).onmessage = ({ data }) => {
  //     const payload = JSON.parse(data);
  //     if (payload.type === 'full-reload') location.reload();
  //     if (payload.type === 'update') {
  //       payload.updates.forEach((u) => {
  //         // ★?t= 时间戳是关键：绕过 HTTP 缓存拿到最新模块
  //         import(`${u.url}?t=${u.timestamp}`).then((mod) => {
  //           // 执行用户在 import.meta.hot.accept(cb) 里注册的回调
  //           mod.hot?.callback?.(mod);
  //         });
  //       });
  //     }
  //   };
  return code;
}

// ============================================================================
// 七、启动（node mini_vite.js          → 启动 dev server
//         node mini_vite.js test       → 只跑第九、十节的算法自测）
// ============================================================================
if (process.argv[2] !== 'test') {
  createServer();
}

// ============================================================================
// 八、面试要点速答（对照上面的实现）
// ============================================================================
// Q1：Vite 为什么快？
// A：dev 不打包 —— 浏览器原生 ESM 按需请求，启动只处理入口（见 transformMiddleware）；
//    依赖预构建用 esbuild（Go 快 10-100 倍）+ hash 缓存（见 optimizeDeps）；
//    转换结果缓存在 ModuleNode（见 transformRequest）。
//
// Q2：dev 和 build 的区别？
// A：dev = 原生 ESM + 按需转换，无打包；build = Rollup 打包 + tree-shaking +
//    hash 文件名 + CSS 抽取压缩。两者共享同一套 resolveId/load/transform 插件管线。
//
// Q3：import 'vue' 浏览器怎么认识？
// A：import 分析重写（rewriteImports）把它指向 /node_modules/.vite/deps/vue.js，
//    那是 esbuild 预构建出的单文件 ESM（CJS→ESM 转换也在这一步）。
//
// Q4：HMR 怎么知道更新范围？
// A：ModuleGraph 记录 importers/importedModules 双向依赖（updateModuleInfo），
//    文件变更后 propagateUpdate 沿 importers 向上找 accept 边界，
//    找不到就 full-reload。
//
// Q5：怎么保证浏览器拿到的不是旧缓存？
// A：Cache-Control: no-cache + Etag 协商缓存，HMR 更新时给 URL 加 ?t= 时间戳
//    强制绕过缓存（lastHMRTimestamp）。

// ============================================================================
// 九、依赖扫描（scanImports）★★核心算法
// ============================================================================
// 【原理】预构建的第一步：找出项目里所有 bare import（裸依赖）。
// 真实 Vite 的做法（esbuild 插件虚拟扫描）：
//   1. 从 index.html 入口出发，找到 <script src> 指向的模块
//   2. 对每个模块做词法扫描，收集所有 import 说明符
//   3. bare import（vue/lodash）→ 记入依赖清单
//      相对路径 → 解析成磁盘路径，递归扫描（DFS）
//   4. visited 集合去重 —— 同一模块只扫一次，环形 import 也不会死循环
// 【为什么不用 package.json 的 dependencies？】
//   声明了但没 import 的依赖不该预构建（浪费）；而 monorepo/链接依赖
//   可能没在 dependencies 里声明。扫描的是「真实使用的图」。
// 【算法本质】有向图的 DFS 遍历 + visited 去重，O(V+E)

// 复用第四节正则的简化版：匹配所有 import/export-from 说明符
const SCAN_REGEX =
  /(?:\bimport\s+(?:[\s\S]*?\s+from\s+)?|\bexport\s+[\s\S]*?\s+from\s+|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;

// ★核心 9.1：从入口文件 DFS 扫描，返回所有 bare import
function scanImports(entryFile) {
  const scanned = new Set(); // visited：绝对路径去重（防环 + 防重复扫描）
  const bareDeps = new Set(); // 收集结果：裸依赖名
  const warnings = []; // 解析失败的路径（缺后缀等）

  function walk(file) {
    if (scanned.has(file)) return; // ★关键：visited 检查，环形依赖在这里被剪掉
    scanned.add(file);

    if (!fs.existsSync(file)) {
      warnings.push(file);
      return;
    }
    const code = fs.readFileSync(file, 'utf-8');

    let match;
    SCAN_REGEX.lastIndex = 0;
    while ((match = SCAN_REGEX.exec(code))) {
      const spec = match[1];
      if (!spec.startsWith('.') && !spec.startsWith('/')) {
        // bare import：记录依赖名（支持 vue、vue/dist/vue.esm.js 这种子路径）
        bareDeps.add(spec.split('/')[0]);
      } else {
        // 相对路径：解析成绝对路径，递归深入（尝试补后缀）
        const base = spec.startsWith('/')
          ? path.join(root, spec)
          : path.resolve(path.dirname(file), spec);
        const candidates = [base, base + '.js', base + '.json', base + '/index.js'];
        const next = candidates.find((c) => fs.existsSync(c));
        if (next) walk(next);
        else warnings.push(base);
      }
    }
  }

  walk(path.resolve(entryFile));
  return { bareDeps: [...bareDeps], scannedCount: scanned.size, warnings };
}

// ============================================================================
// 十、Tree-shaking 简化版 ★★核心算法
// ============================================================================
// 【原理】基于 ESM 的静态可分析性：import/export 都是编译期确定的，
// 不像 CJS 的 require 可以藏在 if 里运行时才执行。三步走：
//   ① parse：对每个模块提取「导出了什么」(exports) 和「从谁导入了什么绑定」
//   ② mark：从入口开始做可达性标记（图的 BFS）：
//        入口的所有导出视为被外部使用（等价于被 html 引用）
//        模块 A import 了 B 的绑定 b → B.b 标记为可达
//   ③ shake：每个模块里「导出了但从未被任何地方标记可达」的导出 = 死代码
// 【Rollup 的增强（口述）】
//   - 副作用分析：package.json 的 sideEffects:false 告诉打包器
//     "整个模块没有副作用，没用到就可以整个删掉"（否则 import './polyfill'
//     这种没有导入绑定的模块必须保留）
//   - 作用域提升（scope hoisting）：把模块内联进一个作用域，进一步暴露死代码
//   - 真实实现基于 acorn AST，这里用正则演示思想
// 【算法本质】图遍历的可达性标记（可达 = 保留，不可达 = 删除）

// ★核心 10.1：parse —— 提取一个模块的导入绑定和导出清单
function parseModule(code) {
  const imports = []; // [{ source, bindings: ['a','b'] }，default 记为 'default']
  const exports = new Set(); // 本模块导出的绑定名

  // import { a, b as c } from './x'  /  import Def from './x'  /  import * as ns
  const importRegex = /\bimport\s+([^'";]+?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(code))) {
    const clause = m[1];
    const bindings = [];
    // 命名导入 { a, b as c }
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      for (const part of named[1].split(',')) {
        const name = part.split(/\s+as\s+/).pop().trim();
        if (name) bindings.push(name); // b as c → 标记的是 c（本地使用的名字）
      }
    }
    // 默认导入 / 命名空间导入
    const before = clause.replace(/\{[^}]*\}/, '').trim();
    if (before) bindings.push('default');
    if (/\*\s+as/.test(before)) bindings.push('*');
    imports.push({ source: m[2], bindings });
  }

  // ★【关键考点】副作用导入：import './polyfill'（没有 from、没有绑定）
  // 【为什么不能删？】它存在的意义就是执行副作用（注册 polyfill、注入 CSS），
  // 即使没导入任何绑定也必须保留 —— 除非 package.json 声明 sideEffects:false
  const sideEffectRegex = /\bimport\s*['"]([^'"]+)['"]/g;
  while ((m = sideEffectRegex.exec(code))) {
    imports.push({ source: m[1], bindings: [] }); // 空 bindings = 整个模块可达
  }

  // export const/function/class X
  const declRegex = /\bexport\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = declRegex.exec(code))) exports.add(m[1]);

  // export { a, b as c }
  const namedExportRegex = /\bexport\s*\{([^}]*)\}/g;
  while ((m = namedExportRegex.exec(code))) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\s+as\s+/)[0].trim(); // b as c → 对外暴露 c，源头是 b
      if (name) exports.add(name);
    }
  }

  if (/\bexport\s+default\b/.test(code)) exports.add('default');
  return { imports, exports: [...exports] };
}

// ★核心 10.2：treeShake —— 可达性标记 + 死代码识别
function treeShake(entryFile) {
  // ── ① parse 阶段：先 DFS 收集全部模块（复用 scanImports 的遍历思路）──
  const modules = new Map(); // 绝对路径 → { imports, exports }
  const resolve = (fromFile, spec) => {
    const base = spec.startsWith('/')
      ? path.join(root, spec)
      : path.resolve(path.dirname(fromFile), spec);
    const candidates = [base, base + '.js', base + '.json', base + '/index.js'];
    return candidates.find((c) => fs.existsSync(c));
  };
  (function collect(file) {
    if (!file || modules.has(file)) return; // visited
    const code = fs.readFileSync(file, 'utf-8');
    const parsed = parseModule(code);
    modules.set(file, parsed);
    for (const imp of parsed.imports) {
      collect(resolve(file, imp.source));
    }
  })(path.resolve(entryFile));

  // ── ② mark 阶段：BFS 可达性标记 ──
  // reachable: 文件 → Set<绑定名>。被标记的绑定会被保留
  const reachable = new Map();
  for (const file of modules.keys()) reachable.set(file, new Set());

  const entryPath = path.resolve(entryFile);
  // 入口模块的所有导出视为可达（它们被 index.html "使用"）
  for (const name of modules.get(entryPath).exports) {
    reachable.get(entryPath).add(name);
  }

  // 队列 BFS：从入口出发，把 import 的绑定标记为可达
  const queue = [entryPath];
  const visited = new Set([entryPath]);
  while (queue.length) {
    const file = queue.shift();
    const { imports } = modules.get(file);
    for (const imp of imports) {
      const dep = resolve(file, imp.source);
      if (!dep) continue;
      const depReachable = reachable.get(dep);
      if (imp.bindings.length === 0) {
        // ★副作用导入（空 bindings）：整个模块的所有导出都标记可达（模块保留）
        for (const name of modules.get(dep).exports) depReachable.add(name);
      }
      for (const binding of imp.bindings) {
        if (binding === '*') {
          // import * as ns：所有导出全部可达
          for (const name of modules.get(dep).exports) depReachable.add(name);
        } else {
          depReachable.add(binding);
        }
      }
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }

  // ── ③ shake 阶段：导出了但不可达的绑定 = 死代码 ──
  const result = [];
  for (const [file, { exports }] of modules) {
    const reachableSet = reachable.get(file);
    const kept = exports.filter((name) => reachableSet.has(name));
    const shaken = exports.filter((name) => !reachableSet.has(name));
    result.push({
      file: path.relative(root, file).replace(/\\/g, '/'),
      kept,
      shaken, // ★这些就是会被 tree-shaking 删掉的导出
      isEmpty: kept.length === 0 && exports.length > 0, // 整个模块都死了
    });
  }
  return result;
}

// ============================================================================
// 【自测】node mini_vite.js test
// 构造一个临时项目验证两个算法：
//   main.js ──import──> utils.js（用了 add，没用 multiply）
//          ──import──> dep-a.js（bare import vue）
//   utils.js 导出 add / multiply / unusedFn
// 期望：扫描出 { vue }；shake 掉 multiply、unusedFn
// ============================================================================
if (process.argv[2] === 'test') {
  const os = require('os');
  const demoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-vite-algo-'));
  root = demoDir; // 切换算法的工作根目录
  const w = (name, content) =>
    fs.writeFileSync(path.join(demoDir, name), content);

  w('main.js', `import { add } from './utils.js';
import './dep-a.js';
console.log(add(1, 2));`);
  w('utils.js', `export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b;
export function unusedFn() {}`);
  w('dep-a.js', `import { createApp } from 'vue';
import { helper } from './helper.js';
createApp({});`);
  w('helper.js', `export const helper = () => 1;
export const neverUsed = () => 2;`);

  console.log('=== 依赖扫描（scanImports）===');
  console.log(JSON.stringify(scanImports(path.join(demoDir, 'main.js')), null, 2));

  console.log('\n=== Tree-shaking（treeShake）===');
  console.log(JSON.stringify(treeShake(path.join(demoDir, 'main.js')), null, 2));

  fs.rmSync(demoDir, { recursive: true, force: true });
}


