// ============================================================================
// Mini-Webpack：面试手写版核心实现（Node 内置模块，零依赖，可直接运行）
//
// 覆盖 Webpack 的核心流程与核心方法：
//   ① Compiler / Compilation（编译器骨架）
//   ② buildModule   —— 模块构建：解析 → 转换 → 找依赖
//   ③ make          —— 从入口递归构建模块依赖图（BFS 队列）
//   ④ generate      —— 生成 chunk：模块表 + __webpack_require__ 运行时
//   ⑤ emit          —— 产物写盘
//
// 运行方式：
//   node mini_webpack.js test     → 跑内置 demo，在 /tmp 输出 bundle.js 并执行验证
//
// ============================================================================
//
// ──────────────────── 打包流程图（从入口到产物）────────────────────
//
//  webpack(entry, options)
//        │
//        ▼
//  [1] 初始化 Compiler（合并配置、注册插件 hooks —— 真实 webpack 的 tapable）
//        │
//        ▼
//  [2] compiler.run() → 触发 compilation
//        │
//        ▼
//  [3] make ★核心：构建模块依赖图
//        │   从 entry 开始：
//        │   ┌────────────────────────────────────────────────┐
//        │   │ buildModule(modulePath)                        │ │
//        │   │   a. readSource  读源码                         │ │
//        │   │   b. 使用 loaders 转换（这里支持自定义函数）      │ │
//        │   │   c. parse 用正则收集所有 require('...') 依赖    │ │
//        │   │   d. transformCode 把 require(...) 改写成        │ │
//        │   │      __webpack_require__('<模块id>')             │ │
//        │   └────────────────────────────────────────────────┘ │
//        │   依赖进队列（BFS），逐个 buildModule，直到队列空      │
//        │   → 得到 modules: Map<id, {id, deps, code}>          │
//        │   （这一步就是 webpack "从入口递归找依赖" 的全过程）    │
//        ▼
//  [4] seal / generate ★核心：拼装 chunk
//        │   产物 = IIFE + __webpack_modules__ 模块表 + 运行时
//        │   运行时三件套：
//        │     __webpack_require__(id)  —— 模块加载器（带缓存）
//        │     __webpack_module_cache__ —— 已加载模块缓存（单例）
//        │     入口调用 __webpack_require__('src/main.js')
//        ▼
//  [5] emit：fs.writeFileSync('dist/bundle.js', 产物)
//        │
//        ▼
//  产物是一个自执行的 JS 文件，浏览器/Node 直接跑，无任何外部依赖
//
// ──────────────────── 产物运行流程图（bundle.js 执行时）──────────────
//
//  执行 IIFE
//     │
//     ▼
//  __webpack_require__('./src/main.js')   ← 从入口开始
//     │
//     ├─ 查缓存 __webpack_module_cache__[id] 命中 → 直接 return（★模块单例，
//     │  同一模块无论被 require 多少次，工厂函数只执行一次）
//     │
//     ├─ 未命中 → 新建 module = { exports: {} }
//     │           存入缓存（★先存缓存再执行——循环依赖的关键处理）
//     │
//     ├─ 执行模块工厂：function(module, exports, __webpack_require__){...}
//     │   模块内部调用 __webpack_require__('./src/utils.js')
//     │        → 递归回到上面（深度优先加载依赖树）
//     │
//     └─ return module.exports
//
// ──────────────────── 循环依赖的执行顺序（面试高频）─────────────────
//
//  main.js require a.js → a.js require b.js → b.js require main.js(循环!)
//  处理方式：b 拿到的是 main「执行到一半」的 exports（部分值）。
//  关键在于「先缓存再执行」：b 里读 main 的导出时若 main 还没赋值，
//  拿到的是 undefined —— 这就是 webpack 循环依赖的著名坑，
//  解法：尽量在用到时再取（延迟访问），或导出函数而非值。
// ============================================================================

// ──────────────────── 文件结构总览 ────────────────────
//
// │ 章节                          │ 核心函数（★ = 面试重点） │ 职责                          │
// │ ─────────────────────────────┼──────────────────────────┼─────────────────────────────── │
// │ 顶部：三张流程图               │ ——                       │ 打包流程 / 产物运行 / 循环依赖  │
// │ 一、模块构建                  │ parseDependencies ★      │ 正则收集 require 依赖           │
// │                              │ getModuleId              │ 模块 id 规则（相对 root 路径）   │
// │                              │ buildModule ★★★          │ 读源码→loader→收集→改写→包工厂  │
// │                              │ resolveSpec              │ 说明符 → 模块 id（解析候选后缀） │
// │ 二、依赖图构建                │ make ★★★                 │ BFS 队列从 entry 构建整个模块图  │
// │                              │ resolveAbs               │ 说明符 → 绝对路径              │
// │ 三、产物生成                  │ generate ★★★             │ 模块表 + __webpack_require__   │
// │                              │ indent                   │ 产物缩进美化（可读性）          │
// │ 四、Compiler                 │ compile ★                │ 编排 make→generate→emit 五阶段 │
// │                              │ webpack                  │ 顶层入口（合并配置）            │
// │ 五、自测                     │ ——                       │ 循环依赖 demo + JSON 模块验证  │
// │ 六、面试要点速答              │ ——                       │ 6 道高频题（流程/循环依赖等）   │
//
// 阅读路线：make（图怎么建）→ generate（产物怎么拼）→ 产物里的
// __webpack_require__（运行时怎么跑）——这三处是 webpack 的心脏。

const fs = require('fs');
const path = require('path');

// ============================================================================
// 一、模块构建 ★★★核心
// ============================================================================

// ★核心 1.1：Parser —— 用正则从源码中收集 require 依赖
// 【原理】webpack 依赖收集的真实实现是 acorn 词法分析（AST），
// 这里用正则演示思想。正则版的局限：注释里的 require、字符串拼接的
// 动态路径收集不到 —— 这也是 webpack 要求静态路径的原因（动态路径
// 需要用 require.context）。
function parseDependencies(code) {
  const deps = [];
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = requireRegex.exec(code))) {
    deps.push(match[1]);
  }
  return deps;
}

// ★核心 1.2：模块 id 规则 —— 相对项目根的路径（真实 webpack 早期版本
// 就是相对路径 id；4+ 默认数字 id，5 支持确定性 hash id）
const getModuleId = (filePath, rootDir) =>
  './' + path.relative(rootDir, filePath).replace(/\\/g, '/');

// ★核心 1.3：buildModule —— 单个模块的完整构建（webpack 心脏）
// 对应真实源码里的 NormalModule.build()：
//   runLoaders（loader 转换）→ parser.parse（依赖收集）→ generator（改写）
function buildModule(filePath, { root: rootDir, loaders = [] }) {
  // ① 读源码
  let code = fs.readFileSync(filePath, 'utf-8');

  // ①.5 【内置 loader】.json 转成 JS 模块
  // 真实 webpack 内置了 json-loader 同样的逻辑：JSON 不是合法的
  // 模块代码（没有赋值语句），必须包成 module.exports = {...}
  if (filePath.endsWith('.json')) {
    code = `module.exports = ${code.trim()};`;
  }

  // ② 跑 loaders：链式转换，后进先出（pitch 阶段之外，从右到左执行）
  // 【loader 本质】纯函数：接收源码字符串，返回转换后的字符串。
  // style-loader / css-loader / babel-loader 都是这个签名。
  for (const loader of [...loaders].reverse()) {
    code = loader(code, filePath);
  }

  // ③ 收集依赖
  const deps = parseDependencies(code);

  // ④ 改写 require 为 __webpack_require__
  // 【为什么必须改写】产物里所有模块挤在一个文件里，'./utils' 这种
  // 相对路径已经失去意义（相对于谁？），必须换成全局的模块 id 查表
  code = code.replace(
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    (full, spec) =>
      `__webpack_require__("${resolveSpec(spec, filePath, rootDir)}")`,
  );

  // ⑤ 包成模块工厂函数（webpack 产物的真实形态）
  // 每个模块是一个 function(module, exports, __webpack_require__)，
  // 不立即执行 —— 由运行时按需调用（这就是 webpack 能做懒加载的基础）
  const id = getModuleId(filePath, rootDir);
  const transformed = `function (module, exports, __webpack_require__) {\n${code}\n}`;

  return { id, filePath, deps, code: transformed };
}

// 工具：把 require 的说明符解析成「相对 root 的模块 id」
function resolveSpec(spec, fromFile, rootDir) {
  const base = spec.startsWith('.')
    ? path.resolve(path.dirname(fromFile), spec) // 相对路径：基于引用者目录
    : path.join(rootDir, 'node_modules', spec); // bare import：node_modules
  const candidates = [base, base + '.js', base + '.json', base + '/index.js'];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error(`模块解析失败: ${spec} (from ${fromFile})`);
  return getModuleId(found, rootDir);
}

// ============================================================================
// 二、依赖图构建 ★★★核心
// ============================================================================

// ★核心 2.1：make —— 从入口出发构建整个模块图（BFS 队列）
// 【为什么是队列而不是递归？】等价（都是遍历），但队列天然支持
// 后续演进：按批处理、并发调度（真实 webpack 4+ 用异步队列 + 并行
// 构建提速）。visited Map 保证每个模块只构建一次。
function make(entryFile, options) {
  const modules = new Map(); // id → module（最终的「模块表」）
  const rootDir = options.root;

  const queue = [{ file: path.resolve(entryFile) }];
  while (queue.length) {
    const { file } = queue.shift();
    const mod = buildModule(file, options);
    if (modules.has(mod.id)) continue; // 已构建（去重）
    modules.set(mod.id, mod);
    // 依赖进队：依赖是相对该模块的说明符，先解析成绝对路径
    for (const dep of mod.deps) {
      const depPath = resolveAbs(dep, file, options.root);
      if (![...modules.values()].some((m) => m.filePath === depPath)) {
        queue.push({ file: depPath });
      }
    }
  }
  return modules;
}

function resolveAbs(spec, fromFile, rootDir) {
  const base = spec.startsWith('.')
    ? path.resolve(path.dirname(fromFile), spec)
    : path.join(rootDir, 'node_modules', spec);
  const candidates = [base, base + '.js', base + '.json', base + '/index.js'];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error(`模块解析失败: ${spec}`);
  return found;
}

// ============================================================================
// 三、产物生成 ★★★核心（seal / generate）
// ============================================================================

// 工具：给模块工厂函数体加缩进（让产物可读）
function indent(code, spaces) {
  const pad = ' '.repeat(spaces);
  return code
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}

// ★核心 3.1：generate —— 把模块表 + 运行时拼成最终 bundle
// 产物结构（和真实 webpack 输出同构，可对照 dist/bundle.js 学习）：
//   (() => {                            ← IIFE 隔离作用域
//     var __webpack_modules__ = {...}   ← 模块表：id → 工厂函数
//     var __webpack_module_cache__ = {} ← 模块缓存（单例保证）
//     function __webpack_require__(id) {...}  ← 运行时加载器
//     __webpack_require__(入口id)       ← 从入口启动
//   })();
function generate(modules, entryId) {
  // 序列化模块表。【注意】不能用 JSON.stringify 整体序列化——
  // 模块的 value 必须是「函数表达式」而非字符串，否则运行时拿到的是
  // 字符串，__webpack_require__ 调用时会报 "is not a function"。
  // 所以手工拼：key 用 JSON.stringify 保证合法，value 直接嵌入函数体
  const moduleMapEntries = [...modules.values()]
    .map((mod) => `  ${JSON.stringify(mod.id)}:\n${indent(mod.code, 2)}`)
    .join(',\n');

  return `// ======== mini-webpack bundle ========
(() => {
  // 模块表：id → 工厂函数（不执行，等 require 时才调用）
  var __webpack_modules__ = {
${moduleMapEntries}
  };

  // 模块缓存：id → module.exports
  // ★单例关键：require 两次同一模块，工厂只执行一次
  var __webpack_module_cache__ = {};

  // ★★★ 运行时加载器 —— 整个 bundle 的心脏
  function __webpack_require__(moduleId) {
    // ① 查缓存：命中直接返回（CommonJS 模块单例语义）
    var cached = __webpack_module_cache__[moduleId];
    if (cached !== undefined) return cached.exports;

    // ② 新建模块对象并【先存缓存再执行】
    //   ★循环依赖的处理就在这：a↔b 互相引用时，后进入的那个
    //   拿到的是「执行到一半」的 exports（拿到部分值不崩溃）
    var module = (__webpack_module_cache__[moduleId] = { exports: {} });

    // ③ 执行模块工厂（module.exports 被模块代码填充）
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);

    // ④ 返回导出值（模块内部可能重写了 module.exports）
    return module.exports;
  }

  // 兼容 ESM 情况的标记（真实 webpack 有 __esModule 互操作，这里从简）
  __webpack_require__.d = function (exports, definition) {
    for (var key in definition) {
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: definition[key],
      });
    }
  };

  // ⑤ 启动：加载入口模块，整个应用开始执行
  __webpack_require__(${JSON.stringify(entryId)});
})();
`;
}

// ============================================================================
// 四、Compiler —— 流程编排（对应真实 webpack 的 Compiler/Compilation）
// ============================================================================

// ★核心 4.1：compile —— 完整编译流程的编排
// 真实 webpack 的生命周期 hooks（tapable 事件流）在这里用注释标出对应位置：
function compile(options) {
  console.log('[mini-webpack] ① 编译开始 make 阶段（构建依赖图）');
  const modules = make(options.entry, options); // hooks: make / buildModule

  console.log(
    `[mini-webpack] ② 依赖图完成：${modules.size} 个模块 →`,
    [...modules.keys()].join(', '),
  );

  console.log('[mini-webpack] ③ seal 阶段（拼装 chunk）');
  const entryId = getModuleId(path.resolve(options.entry), options.root);
  const bundle = generate(modules, entryId); // hooks: seal / chunkAsset

  console.log('[mini-webpack] ④ emit 阶段（产物写盘）');
  const outPath = path.resolve(options.output.path, options.output.filename);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, bundle); // hooks: emit / afterEmit

  console.log(
    '[mini-webpack] ⑤ done！产物:',
    outPath,
    `(${bundle.length} 字节)`,
  );
  return outPath;
}

// ★核心 4.2：webpack() —— 顶层入口，面试白板从这个函数开始写
function webpack(options) {
  // 合并配置（真实 webpack 有完整的 defaults 深合并）
  const merged = {
    root: options.root || process.cwd(),
    entry: options.entry,
    output: options.output || { path: 'dist', filename: 'bundle.js' },
    loaders: options.loaders || [],
  };
  return { compile: () => compile(merged) };
}

// ============================================================================
// 五、【自测】node mini_webpack.js test
// 构造 demo 项目 → 打包 → 直接执行产物 → 验证输出
// ============================================================================
if (process.argv[2] === 'test') {
  const os = require('os');
  const demoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-wp-'));

  // ── demo 项目结构 ──
  // main.js → a.js → b.js（b 又 require main，构造循环依赖）
  //        → info.json（验证非 js 模块）
  const w = (name, content) =>
    fs.writeFileSync(path.join(demoDir, name), content);

  w(
    'main.js',
    `const { a } = require('./a');
const info = require('./info.json');
console.log('[产物执行] a =', a);
console.log('[产物执行] info =', info.name);
console.log('[产物执行] main 加载完成');`,
  );

  w(
    'a.js',
    `const { b } = require('./b');
exports.a = 'a-with-' + b;`,
  );

  w(
    'b.js',
    `// 循环依赖演示：b require 了 main
const main = require('./main.js');
// main 还没执行完（正处于 require('./a') 内部），拿到部分 exports
console.log('[产物执行] 循环依赖：b 里读 main.exports =', JSON.stringify(main));
exports.b = 'b';`,
  );

  w('info.json', `{"name":"mini-webpack"}`);

  // ── 打包 ──
  const compiler = webpack({
    root: demoDir,
    entry: path.join(demoDir, 'main.js'),
    output: { path: path.join(demoDir, 'dist'), filename: 'bundle.js' },
  });
  const outPath = compiler.compile();

  // ── 执行产物验证 ──
  console.log('\n===== 直接执行打包产物 =====');
  require(outPath); // 产物是纯 CJS 兼容的 IIFE，可直接 require 执行

  console.log('\n===== 产物源码（前 60 行）=====');
  console.log(
    fs.readFileSync(outPath, 'utf-8').split('\n').slice(0, 60).join('\n'),
  );

  fs.rmSync(demoDir, { recursive: true, force: true });
}

// ============================================================================
// 六、面试要点速答
// ============================================================================
// Q1：webpack 打包的完整流程？
// A：初始化（合并配置/挂插件）→ make（从 entry 递归 buildModule：
//    读文件 → loader 转换 → 收集依赖 → 改写 require）→ seal（模块表
//    + runtime 拼成 chunk）→ emit（写盘）。见 compile() 的 5 步日志。
//
// Q2：webpack 和 vite 的 dev 差异？
// A：webpack 启动就要把整个依赖图构建成 bundle（越改越慢）；
//    vite dev 不打包，浏览器原生 ESM 按需请求。两者 build 都要打包，
//    webpack 用自己的模块表方案，vite 用 Rollup ESM 方案。
//
// Q3：bundle 里的 __webpack_require__ 是什么？
// A：运行时模块加载器：查缓存 → 未命中则新建 module {exports:{}}
//    → 【先存缓存】→ 执行工厂函数 → 返回 module.exports。
//    模块表 __webpack_modules__ 是 id 到工厂函数的映射，全部惰性执行。
//
// Q4：webpack 怎么处理循环依赖？
// A：「先存缓存再执行」。a require b 时 b 再 require a，b 拿到的是
//    缓存里那个"执行到一半"的 module.exports（部分值）。CJS 只能这样
//    容忍；ESM 的 import 提升有更好的 live binding 语义（值绑定）。
//
// Q5：loader 和 plugin 的区别？
// A：loader = 文件转换器（纯函数字符串进字符串出，链式，右到左），
//    处理"模块怎么变"；plugin = 事件流钩子（tapable，贯穿整个生命周期，
//    处理"流程怎么变"：打包优化/产物处理/注入环境变量）。
//
// Q6：module / chunk / bundle 的关系？
// A：module = 一切资源文件（js/css/图片都算）；chunk = 打包过程的
//    模块集合（入口 chunk / 异步 import() 拆的 chunk / splitChunks 拆的）；
//    bundle = 最终写盘的文件（一个 chunk 通常产出一个 bundle 文件）。
