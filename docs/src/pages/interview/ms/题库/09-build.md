# 9 构建工具

构建工具题库：覆盖 Webpack 全链路（流程/tapable/Loader/Plugin/分包/Tree-shaking/缓存体系）、Vite 双引擎原理与 Rolldown 演进、SourceMap、esbuild/Swc/Babel 性能本质、Babel 全链路、pnpm Monorepo、产物体积治理、库多格式产物，最后一题是 P7 架构设计压轴题（构建提速完整案例），按 P6 体系化 + P7 深度权衡双层组织。

## Q：Webpack 的构建流程？tapable 事件流机制是怎样的？

**核心答案**：Webpack 构建分三大阶段：初始化（合并配置、创建全局唯一的 Compiler、依次执行所有插件的 apply 注册钩子）、构建（从 entry 出发对每个模块"调用 Loader 转换 → acorn 解析 AST → 收集依赖 → 递归处理"，最终产出完整模块依赖图）、生成（seal 阶段把模块组装成 chunk、optimize 系列优化、再 emit 成 bundle 写入文件系统）。整个流程不写死在某个函数里，而是被拆散成上百个钩子，由 tapable 提供的发布订阅体系串联——Compiler 钩子贯穿全生命周期（run/compilation/emit/done），Compilation 钩子对应单次编译内部（buildModule/seal/optimizeChunks/processAssets）。tapable 的核心是 10 种 Hook 类型（同步/异步 × 串行/并行/瀑布/熔断组合）+ 一套"代码生成"式的调用实现：call 方法体是启动时用 new Function 拼出来的顺序调用代码，比手写循环还快。

**知识点解析**：

- 构建主流程（面试按这个顺序讲，每一步对应源码位置）：

```text
1. 参数初始化     CLI 参数 + webpack.config 合并 → createCompiler
2. 创建 Compiler  全局唯一；遍历 plugins 逐个 plugin.apply(compiler) 注册钩子
3. 触发 run 钩子  开始编译；Compiler.run() → compile()
4. 创建 Compilation  单次编译的上下文（模块工厂、模块图、chunk 图都挂它上面）
5. make 阶段      入口模块进入 compilation.addEntry → buildModule：
                  - 先按 rule 匹配 Loader，从右到左执行转换源码
                  - 再用 acorn 把转换后代码解析成 AST
                  - traverse AST 找到 import/require 依赖
                  - 依赖入队，递归回到上一步，直到没有新模块
6. seal 阶段      根据入口+异步 import 组装 chunk 图；
                  依次触发 optimizeChunks / optimizeModules /
                  optimizeAssets（tree-shaking、splitChunks、压缩都在这条链上）
7. emit 阶段      compilation.assets（内存中的产物表）写入 output 目录
8. done 钩子      输出 stats，构建结束（watch 模式下文件变更重新回到第 4 步）
```

- Compiler 与 Compilation 的区别：Compiler 全局一份，代表"整个 webpack 环境"，挂载的钩子在多次构建（watch 触发）之间复用；Compilation 每次编译（或每次增量编译）新建一份，代表"这一次构建"，所以插件里拿 compilation 一定要在 compilation 钩子回调里取，不能在 apply 时缓存死。

- tapable 十种 Hook 按两个维度组合：执行方式（Basic 不关心返回值 / Bail 熔断 / Waterfall 瀑布 / Loop 循环）× 执行时机（Sync 同步 / AsyncSeries 串行异步 / AsyncParallel 并发异步）。命名即语义，例如：

```js
const { SyncHook, SyncBailHook, AsyncSeriesHook, AsyncParallelHook } = require('tapable');

const hooks = {
  // 同步串行：所有回调依次执行，忽略返回值（如 compiler.run）
  start: new SyncHook(['stats']),
  // 熔断：任一回调返回非 undefined 立即结束后续（如 optimizeModules 前的判断链）
  shouldEmit: new SyncBailHook(['compilation']),
  // 异步串行：回调按注册顺序执行完才进入下一个（如 emit 写文件）
  emit: new AsyncSeriesHook(['compilation']),
  // 异步并发：所有回调同时执行，全部结束后 call 的回调触发
  compile: new AsyncParallelHook(['params']),
};

hooks.emit.tapAsync('MyPlugin', (compilation, cb) => {
  setTimeout(() => cb(), 100);
});
hooks.emit.tapPromise('MyPlugin2', (compilation) => Promise.resolve());
hooks.start.call(stats); // 同步 hook 只能 call，异步 hook 调 callAsync/promise
```

- 手写一个极简 tapable，说清"代码生成"这个性能关键点：

```js
class SyncHook {
  constructor(args = []) {
    this.args = args;   // 形参名列表，代码生成时用来声明函数参数
    this.taps = [];     // 订阅列表：{ name, fn }
  }
  tap(name, fn) {
    this.taps.push({ name, fn });
  }
  call(...args) {
    // 朴素实现：for 循环遍历。tapable 真实实现是代码生成：
    // 把 taps 拼成 "fn0(x); fn1(x); fn2(x);" 用 new Function 一次编译成 call 方法体
    // —— 调用时零循环、零分发、可被 JS 引擎内联，这是"框架比手写循环还快"的原因
    for (const t of this.taps) t.fn(...args);
  }
}
```

- 异步 Hook 的两种注册方式对应两种异步风格：tapAsync（Node callback，最后一个参数是 cb，cb(err) 报错）与 tapPromise（返回 Promise，reject 即报错）；callAsync/promise 的总回调在所有订阅完成后触发，任何一个失败立即短路——插件里忘了调 cb 会导致构建永久挂起，这是写插件最常见的事故。

**加分项（P7 视角）**：

- 代码生成的代价被摊销：tapable 在第一次 call 时才按 taps 数量生成分发函数并缓存（lazy compile），taps 数量固定后后续调用走同一段编译产物；HookCodeFactory 会按 Hook 类型拼出不同的代码模板（Bail 版嵌 if 判断返回值、Waterfall 版把上一个结果传给下一个、AsyncSeries 版拼 promise 链或 callback 递归），能讲出"为什么 SyncHook 有 call/callAsync 两个入口但内部各自编译"说明读过源码。
- Webpack 5 的增量体系建立在 hooks 之上：cache.type filesystem 序列化的粒度是"模块"，watch 模式下 make 阶段对未变更模块直接从缓存恢复 Module 对象，只重跑 seal；再把 moduleIds: deterministic（基于内容 hash 的短数字 id）配合，保证"改一个业务文件不会引起全量 id 漂移导致 vendor chunk hash 变化"，缓存体系是流程题的高阶延伸。
- 对比 Vite 的插件体系：Rollup/Vite 插件是"扁平的构建钩子"（buildStart/resolveId/load/transform/generateBundle），按管线顺序执行；Webpack 是"广播式事件流"，任意阶段可插任意个订阅者。前者可预测性强、易实现 pipeline 并行，后者自由度高、生态复杂度也高——两种设计哲学的对比是区分"用过"和"懂原理"的分界。

## Q：Webpack 核心概念：module/chunk/bundle 的关系？splitChunks 分包策略如何制定？

**核心答案**：module 是构建期的最小单位——一切资源（js/ts/css/图片/字体）在 Webpack 眼里都是模块；chunk 是打包过程中的中间聚合体，由若干 module 组成，来源有三种（entry 入口及同步依赖、import() 异步导入、splitChunks 主动拆分）；bundle 是最终落盘的产物文件，一个 chunk 通常对应一个 bundle，但可以一对多（js 产出 + sourcemap、mini-css-extract-plugin 从 js chunk 里再剥离出 css 文件）。三者关系可以一句话概括：module 是原料，chunk 是加工中的逻辑分组（发生在 seal 阶段），bundle 是 chunk 序列化后的输出。splitChunks 的制定原则是"按变化频率分层 + 按引用关系分组"：把稳定的三方框架、UI 库、工具库与高频变动的业务代码隔离，最大化 HTTP 缓存命中，同时用 moduleIds 与 runtimeChunk 保证局改动不引起全局 hash 漂移。

**知识点解析**：

- chunk 的三种出生方式：

```text
1. entry chunk     每个 entry（含多页应用的每个入口）+ 它的全部同步依赖
2. async chunk     import() 动态导入的模块自成一块（splitChunks.chunks 默认 'async'）
3. split chunk     SplitChunksPlugin 在 optimizeChunks 钩子里按 cacheGroups
                   把满足条件的公共模块"搬"出原 chunk 形成新块
```

- 关键机制：模块提升与 chunk 组装发生在 seal 阶段；SplitChunksPlugin 监听 optimizeChunks，遍历所有 chunk graph 统计每个 module 的引用计数，满足 minChunks/minSize 的候选模块按 cacheGroups 的 test 匹配分组，priority 决定归属，最后改写 chunk graph。所以 splitChunks 是"图的后处理"，理解这点就能解释为什么它能跨入口/跨异步块提公共模块。

- 分包策略模板（可直接背的生产配置）：

```js
optimization: {
  moduleIds: 'deterministic',   // 内容 hash 数字 id：增删模块不影响无关模块 id
  runtimeChunk: 'single',       // webpack runtime 单独成块，改业务不动 vendor hash
  splitChunks: {
    chunks: 'all',              // 同步入口 + 异步块都参与拆分（默认只拆 async）
    minSize: 20000,             // 小于 20KB 不值得单独成块（HTTP/2 也有解析成本）
    maxSize: 240000,            // 超过 240KB 尝试二次拆分（只作提示，不强保证）
    maxInitialRequests: 5,      // 入口并行请求上限，防拆太碎
    maxAsyncRequests: 5,
    cacheGroups: {
      react: {                  // 框架层：升级频率极低，缓存价值最高
        test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
        name: 'react',
        priority: 20,
        enforce: true,
      },
      ui: {                     // 组件库：跟随库版本，独立缓存
        test: /[\\/]node_modules[\\/](@arcodesign|ant-design)[\\/]/,
        name: 'ui',
        priority: 15,
      },
      vendor: {                 // 其余三方：稳定层兜底
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        minChunks: 2,
        priority: 10,
        reuseExistingChunk: true, // 已拆出的块直接复用，避免重复打包
      },
      commons: {                // 业务公共：被 2+ 入口引用的业务模块
        name: 'commons',
        minChunks: 2,
        priority: 5,
        reuseExistingChunk: true,
      },
    },
  },
}
```

- 策略制定的四条判断标准：变化频率（越稳定越靠前单独拆）、体积（拆完要真的有缓存收益，别拆出 2KB 的块）、引用关系（被多个入口共享才值得拆）、加载时机（initial 影响首屏请求数，async 只影响对应路由）。chunks 配置的差异要能说清：all 最彻底；initial 只拆同步共享；async 是默认值，多页共享逻辑容易被忽略。

- hash 漂移问题（分包的真正难点不在拆而在稳）：默认的 id 分配依赖模块出现顺序，新增一个 import 可能让全部模块 id 后移，导致所有 chunk hash 变化、用户缓存全失效。三件套防护：moduleIds: deterministic、runtimeChunk 抽离 runtime、namedChunkIds 在 dev 下用路径名稳定 id。

**加分项（P7 视角）**：

- 反向权衡：拆分不是越细越好。拆得过碎的三个代价——首屏并行请求数增加（HTTP/2 解决连接数但每块仍有请求/解析/编译成本）、块间依赖形成串行瀑布（A 依赖 B 依赖 C 时动态加载要三轮发现）、chunk graph 本身变大（每个块都有 runtime 记录）。一个量化结论：拆分粒度以"单块 50KB-500KB、initial 请求 ≤ 6"为常见甜点区，具体以 bundle analyzer 实测为准。
- 缓存命中率应该被监控而不是拍脑袋：产物 hash 版本发布后，通过 CDN 日志或 Performance API 统计 vendor 块的缓存复用率；如果每次发版 vendor hash 都变，优先查 id 漂移与 runtimeChunk，而不是继续加 cacheGroups——"先度量再拆分"是 P7 与 P6 的分界。
- 与 Module Federation 的关系：splitChunks 解决的是"单应用内部"的缓存分层；跨应用共享（微前端、多站点共用组件库）要用 MF 的 shared/remote 机制在运行时做依赖协商，二者经常组合——MF shared 配置不当会出现共享包被重复加载或多版本并存，那是另一个治理话题。

## Q：Loader 与 Plugin 的区别与实现原理？（手写一个 loader 和 plugin）

**核心答案**：Loader 是文件转换器，只做一件事——输入模块源码字符串，输出转换后的字符串，链式执行（从右到左、从下到上，类似 compose），无法介入构建流程本身；Plugin 是基于 tapable 钩子的订阅者，形式是带 apply(compiler) 方法的对象，可以介入构建全生命周期的任意阶段，访问/修改 compilation 里的模块图、chunk、产物。一句话：Loader 负责"这个文件怎么变成模块"，Plugin 负责"构建流程的每个环节我可以做什么"。实现上，Loader 本质是纯函数 + this 注入的 loaderContext API（this.async/this.getOptions/this.resourcePath），Plugin 本质是"注册若干钩子回调，在回调里改 compiler/compilation 状态"。

**知识点解析**：

- Loader 链式执行规则：配置写的是 `['style-loader', 'css-loader', 'sass-loader']`，执行顺序是 sass → css → style（从右到左），前一个的输出是后一个的输入。此外还有 pitch 阶段：所有 loader 先从左到右走一遍 pitch，某个 pitch 有返回值会直接跳回（后面 loader 与其自身的 normal 阶段都不执行）——style-loader 就是靠 pitch 拦截来接收 css-loader 传出的数组并注入 DOM 的。

```text
pitch 阶段（左 → 右）：style-loader.pitch → css-loader.pitch → sass-loader.pitch
normal 阶段（右 → 左）：sass-loader(源码) → css-loader(CSS字符串) → style-loader(数组)
任一 pitch 返回值：立即掉头，该返回值作为上一个 loader 的输入
```

- 手写 Loader 之一：同步替换型（给每个模块注入构建时间戳 banner）：

```js
// loaders/banner-loader.js
module.exports = function (source) {
  // this 是 loaderContext，不要用箭头函数
  const options = this.getOptions() || {};          // 解析好的 options（schema 校验可配）
  const author = options.author || 'platform';
  const banner = `/* build by ${author} @ ${new Date().toISOString()} */\n`;
  // 同步 loader：直接 return；需要返回 sourcemap 时用 this.callback(null, code, map)
  return banner + source;
};
```

- 手写 Loader 之二：异步重型转换型（压缩图片，展示 this.async 用法）：

```js
// loaders/squoosh-loader.js
const { compress } = require('imagetools'); // 假设的异步压缩库

module.exports = function (source) {
  const callback = this.async(); // 声明异步：webpack 挂起本模块，直到 callback 被调
  const options = this.getOptions() || {};
  compress(source, options)
    .then(({ data, map }) => callback(null, data, map /*, meta */))
    .catch((err) => callback(err));
};

// webpack.config.js 中注册
module.exports = {
  module: {
    rules: [
      { test: /\.(png|jpe?g)$/, type: 'asset/resource', use: [{ loader: path.resolve('loaders/squoosh-loader.js'), options: { quality: 80 } }] },
    ],
  },
};
```

- 手写 Plugin：产物清单 + 体积告警（用 webpack 5 推荐的 processAssets 钩子）：

```js
// plugins/build-manifest-plugin.js
class BuildManifestPlugin {
  constructor(options = {}) {
    this.warnSize = options.warnSize || 500 * 1024; // 默认 500KB 告警
  }

  apply(compiler) {
    // webpack 5 推荐用 compilation.hooks.processAssets 替代已废弃的 emit
    compiler.hooks.compilation.tap('BuildManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'BuildManifestPlugin',
          // REPORT 阶段：产物已生成、还能追加新文件
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        (assets) => {
          const manifest = {};
          const oversize = [];

          for (const [filename, asset] of Object.entries(assets)) {
            const size = asset.size();
            manifest[filename] = { size, gzip: Math.round(size * 0.32) };
            if (size > this.warnSize && filename.endsWith('.js')) {
              oversize.push(`${filename}: ${(size / 1024).toFixed(1)}KB`);
            }
          }

          // 向产物表追加 manifest.json（SourceMapSource/直接对象均可）
          const content = JSON.stringify(manifest, null, 2);
          compilation.emitAsset(
            'manifest.json',
            new compiler.webpack.sources.RawSource(content)
          );

          if (oversize.length) {
            console.warn(`[BuildManifest] 超过 ${this.warnSize / 1024}KB 的产物:\n  ${oversize.join('\n  ')}`);
          }
        }
      );
    });
  }
}

module.exports = { BuildManifestPlugin };
```

- 选型原则：只涉及"内容变换"（语法降级、样式预处理、资源内联）就写 Loader；需要"流程介入"（产物操作、注入变量、拷贝文件、上报统计）就写 Plugin。很多能力两者都能做（如文件处理），优先选更简单、副作用更少的那个。

**加分项（P7 视角）**：

- Loader 的性能细节：this.cacheable()（默认可缓存）；loader 里禁止写跨模块的可变状态（并发与缓存恢复时会错乱）；返回 sourcemap 链（babel 传 map、下一环续传）是高质量 loader 的标志，否则产物调试时 map 断链。pitch 拦截的另一个经典应用是 babel-loader 与 thread-loader 的协作。
- Plugin 的稳定性设计：钩子回调必须幂等可重入（watch 模式下 compilation 会多次创建）；修改 chunk/assets 时注意 snapshot 与 hash 的一致性（用 compilation.updateAsset 而不是直接改对象）；webpack 5 把大量 emit 期操作规范到 processAssets 的 stage 枚举，能说清 PREPROCESS/ADDITIONS/OPTIMIZE/REPORT 各阶段语义说明跟进了新体系。
- 生态对照：Vite/Rollup 插件一个对象同时暴露 resolveId/load/transform/generateBundle——"一个插件完成 Webpack 里 loader+plugin 两个人的事"，但代价是约束更强（约定大于配置）；能对比两套插件模型的设计取舍（自由度 vs 可组合性），是把工具用透的信号。

## Q：Webpack 性能优化：cache、thread-loader、sourcemap 选型？DLL 为什么被废弃？

**核心答案**：提速三板斧按收益排序：持久缓存（webpack 5 的 cache.type: 'filesystem' 把每个模块的序列化结果缓存到 node_modules/.cache，二次构建只处理变化模块，收益最大且无副作用）；并行与换引擎（thread-loader 把重型 loader 丢进 worker 池，或直接换 esbuild-loader/swc 替代 babel，后者往往比加线程更划算）；关闭开发期昂贵特性（sourcemap 用 eval-cheap-module-source-map、关闭 minimizer、缩窄 resolve 范围）。DLL 被 Webpack 5 官方废弃，因为它的收益（预构建不变的三方依赖）被持久缓存完全覆盖，而它的成本（维护 dll manifest、与 splitChunks 缓存策略冲突、多一套构建流程）一点没少——"用两套缓存机制解决同一个问题，还要付出对齐成本"，所以新项目不应再用。

**知识点解析**：

- 持久缓存配置与失效条件：

```js
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      // 这些文件变化 → 缓存整体失效（必须配，否则配置变了缓存还复用，出诡异 bug）
      config: [__filename],
      tsconfig: [path.resolve(__dirname, 'tsconfig.json')],
    },
    version: `${process.env.NODE_ENV}`, // 环境不同缓存隔离
  },
};
```

- thread-loader 的正确用法与边界：放在 loader 数组最前面，其后所有 loader 进 worker 池执行；只对重型 loader（babel-loader、ts-loader）开启；每个文件要经历主进程 → worker 序列化 → 执行 → 结果回传，小文件场景通信开销可能吞掉并行收益；worker 数量默认 cpu 核数 - 1。worker 内拿不到自定义 loader API 与主进程状态（不能写 loader 里的 this.tap 之类）。

```js
module: {
  rules: [
    {
      test: /\.(t|j)sx?$/,
      include: path.resolve('src'),
      use: [
        { loader: 'thread-loader', options: { workers: 4 } },
        { loader: 'babel-loader' },
      ],
    },
  ],
}
```

- sourcemap 选型速查（eval 前缀快在"不生成 map 文件、以 eval 包裹字符串内联"，cheap 跳过列映射）：

```text
开发环境:  eval-cheap-module-source-map（主流选择：快 + 能定位到源文件行）
           eval-source-map（要列级精确定位时；更慢）
           eval-cheap-module-source-map 的 module 表示 loader 转换前的源
预发环境:  source-map / hidden-source-map（接近线上行为排查问题）
生产环境:  hidden-source-map（生成 map 但产物不引用，上传监控平台）
           或 source-map 仅限内网版本；绝不能裸奔 nosources-source-map
```

- DLL 的机制与废弃原因（面试要能讲"为什么"）：DllPlugin 把 react/vue 等不变依赖预先打包成 dll.js + manifest.json（记录模块到 dll 内位置的映射），主构建直接引用映射跳过编译。问题在于：manifest 与主构建的模块解析、splitChunks 的分组、moduleIds 必须保持一致，任何一步错位就静默打出重复代码或运行时错误；升级依赖要重跑 dll；而 webpack 5 持久缓存以"模块级"粒度缓存，不变依赖二次构建本来就是毫秒级跳过——DLL 的收益归零，维护成本还在。

**加分项（P7 视角）**：

- 度量先行：优化前用 speed-measure-plugin（webpack 5 需社区分支）或 stats 的 timing 拆出各 loader/plugin 耗时占比，再决定投入方向；多数项目瓶颈集中在 babel-loader 与 ts 类型检查（应把 typecheck 挪到 fork-ts-checker-webpack-plugin 异步并行）。
- CI 场景的缓存策略：本地缓存不能直接复用到 CI（路径/环境不同导致全 miss），要么在 CI 上挂 node_modules/.cache 的产物缓存（配合 cache.version 与 runner 环境指纹），要么换 esbuild/swc 引擎直接把转换耗时打下来——"CI 缓存命中率"是被多数团队忽略的指标，却是流水线耗时的决定项。
- 更彻底的路线：把 babel 从主链路整体移除（目标浏览器现代话后 @babel/preset-env 几乎无事可做，只剩 JSX/TS 转换），用 esbuild-loader 全量替换后 30 万行项目转换耗时普遍从分钟级进到秒级；这属于"删优化"而不是"加优化"，是提速的最高段位。

## Q：Tree-shaking 原理：ESM 静态分析、sideEffects 标记？为什么 CJS 做不到？

**核心答案**：Tree-shaking 分两步：先由打包器基于 ESM 的静态结构做"标记"——import/export 只能出现在顶层、模块路径必须是字符串字面量，因此构建期就能构建出完整的导出/引用关系图，把"从未被 import 的导出"标记为 unused（webpack 的 optimization.usedExports）；再由压缩器做"摇掉"——terser/esbuild 的死代码消除基于这些标记与纯函数注释真正删除代码。sideEffects 是包级别的补充声明：它告诉打包器"这个包的哪些文件没有副作用"，从而允许更激进的行为——模块哪怕一个导出都没被用到，也可以整文件跳过而不引入（usedExports 是模块内按导出裁剪，sideEffects 是模块级整文件裁剪）。CJS 做不到的根本原因：require 与 module.exports 是运行时 API，可以出现在 if/循环/函数里、路径可以拼接、exports 对象可以在运行时增删改属性，静态分析无法证明"这段赋值没有副作用"，只能保守地全量保留。

**知识点解析**：

- ESM 静态性 vs CJS 动态性对比（一句话版：ESM 的依赖图在编译期可完整确定，CJS 的依赖图只有执行才知道）：

```js
// ESM：只能在顶层、路径必须是字面量 → 构建期即可完整分析
import { debounce } from 'lodash-es';

// CJS：全是运行时行为，以下写法都是合法的
if (debug) { require('./logger'); }
const name = './mo' + 'dule';
const mod = require(name);            // 动态路径：分析不出依赖谁
module.exports[Math.random() > .5 ? 'a' : 'b'] = 1; // 运行时改导出表
exports.done = false; setTimeout(() => { exports.done = true; }, 1000); // 导出值可变
```

- ESM 的另一个基础：export 是绑定（live binding）而非值拷贝——导出的是对变量的引用，模块内变量变化对外可见，因此打包器只需维护一张"导出名 → 内存槽"的表做重命名扁平化，不需要执行任何代码就能完成链接（scope hoisting / concatenateModules 就是把这张表拍平后内联进同一作用域）。

- sideEffects 的写法与语义：

```json
// package.json —— 三方库作者的声明责任
{
  "name": "my-ui",
  "sideEffects": false,
  "sideEffects": ["**/*.css", "./es/polyfills.js"]
}
```

  两条都要能解释：第一行表示"全部文件无副作用，没被用到的文件可以不打包"；第二行是白名单——CSS 文件、polyfill 这类"导入即生效"的文件必须排除在摇除范围外，否则样式静默丢失。这也是排查"为什么引入组件库样式没了"的第一反应：库的 sideEffects 声明错了。

- pure 注释：打包器无法证明函数调用无副作用时，靠 `/*#__PURE__*/` 手工背书，压缩器据此删除整条表达式（常见于三方的工具函数工厂与 Vue 的 defineComponent 包装）。

```js
const config = /*#__PURE__*/ createConfig(); // 未使用 config 时整句可删
```

- 生效前提清单（面试常追问"为什么我摇不掉"）：optimization.usedExports 与 minimize 同时开启；依赖包提供 ESM 入口且 package.json 正确声明 module/sideEffects；没有 CJS 中转（require 了 CJS 版产物则整包退化保守）；类方法/原型挂载/动态属性访问无法证明纯；副作用导入（如全局 polyfill）被白名单保护。

**加分项（P7 视角）**：

- webpack 与 Rollup 的实现差异：Rollup 的 tree-shaking 建立在"输出即重新生成代码"的模型上，分析粒度更细（基于作用域与表达式级别的活性分析），产物天然无模块边界；webpack 是"模块拼接 + 压缩期裁剪"，中间层（runtime 与模块包装）必须保留，所以同等条件下 Rollup 对库的摇除效果更好——这也是库打包偏好 Rollup 的原因之一。
- 验证手段要落地：用 webpack-bundle-analyzer 或 rollup-plugin-visualizer 检查产物里是否出现未引用导出；对库作者用 agadoo（检测包是否可 tree-shake）把 sideEffects/exports 字段校验加进 CI——"库的摇除友好性"是库质量指标，但多数团队没有卡点。
- 演进视角：Vite 生产链路的摇除由 Rollup（及未来的 Rolldown）承担，dev 阶段则完全不做 tree-shaking（按需转换单文件，天然没有全图信息）——"dev 不摇、build 才摇"带来的一个经典坑是 dev 正常、线上某段初始化代码被误判删除（副作用标注缺失），排查思路直接从 sideEffects 白名单入手。

## Q：Vite 原理：dev 阶段 no-bundle（esbuild 预构建/按需转换）、HTTP 缓存协商？

**核心答案**：Vite dev 的核心是"把打包这个步骤从启动时挪到访问时"：启动只做依赖预构建，不打包任何业务代码；浏览器通过原生 ESM（入口是 type="module" 的 script）逐文件发起请求，dev server 中间件拦截后用 esbuild 实时把单文件转译（TS/JSX → 浏览器可执行的 ESM JS）返回，改哪个文件只需重新转译哪个文件。预构建解决两个问题：node_modules 里的 CJS/UMD 包浏览器无法以 ESM import，用 esbuild 统一转成 ESM；lodash-es 这类上百个小文件的包会产生请求瀑布，预构建合并成单文件。缓存上采用分层策略：预构建产物带 hash 文件名走强缓存（max-age=31536000, immutable），业务源码不 hash 走协商缓存（ETag/If-None-Match 返回 304），配合 HMR 的 WebSocket 通道实现秒级反馈。速度本质 = 启动不打包 + 按需转译 + esbuild 引擎快 + 缓存分层四项叠加。

**知识点解析**：

- dev 首屏请求链路（能画出这张图基本就过关）：

```text
1. GET /                     → index.html（dev server transformIndexHtml 注入 @vite/client）
2. <script type="module" src="/src/main.ts">   ← 浏览器原生 ESM 入口
3. GET /src/main.ts          → esbuild/on-demand 转译（import 路径改写成 /node_modules/.vite/deps/xxx.js）
4. GET /node_modules/.vite/deps/vue.js          → 预构建产物（强缓存）
5. 浏览器解析每个 import，继续逐个请求 → 深度优先递归加载整棵依赖树
```

- 预构建（dep optimization）细节：启动时扫描入口找到裸模块导入（bare import），esbuild 打包成 ESM 输出到 node_modules/.vite/deps；对 monorepo 里的本地链接包（link: / workspace 协议）不做预构建（源码随时在变）；缓存失效三条件——package-lock 变化、vite 配置里相关字段变化（optimizeDeps/resolve）、手动 --force。重新预构建后文件 hash 变化 → 强缓存自动失效，这就是"文件名带 hash 才敢 immutable"的实践。

```js
// vite.config.js —— 手动控制预构建
export default {
  optimizeDeps: {
    include: ['lodash-es', 'echarts/core'], // 提前预构建，避免运行时发现新依赖触发二次预构建 reload
    exclude: ['my-local-package'],          // workspace 内部包不预构建
  },
};
```

- HTTP 缓存协商双轨制：

```text
强缓存（预构建产物）：
  Cache-Control: max-age=31536000, immutable
  文件名含 hash（vue.abc123.js）→ 内容变则名变，名变则 URL 变 → 无需协商

协商缓存（业务源码）：
  ETag: "内存中转换结果的哈希"
  浏览器带 If-None-Match → 内容未变返回 304（无 body）→ 只有头部开销
  源码文件名不能 hash（路径就是 /src/main.ts），所以只能协商
```

- HMR 为什么快：模块改动 → 服务端沿 importer 反向找到 HMR boundary（接受自身更新的组件）→ WebSocket 推送 update → 浏览器只重新 import 该模块 URL 加时间戳（t=timestamp query 绕过 304）→ 组件热替换。失败或越界（改到被非自接受模块依赖的文件）才整页 reload。

- 与 Webpack dev server 的本质差异：Webpack dev 也要启动即全量打包（或预打包 dll），冷启动与项目规模线性相关；HMR 时改动模块及其依赖链要重新增量打包再推 bundle。Vite 冷启动时间与项目规模基本解耦（只与预构建的依赖数量相关），HMR 是单文件粒度重转译。

**加分项（P7 视角）**：

- 按需转译的隐藏成本：深链路 import 会在 dev 下产生大量串行请求（每层 import 都要等上一层响应后才发现），大项目首屏 dev 体验会掉到"几百个请求"；Vite 的缓解手段是 HTTP/2、预构建合并、以及 warmup（server.warmup 预转常用文件）——能讲出"no-bundle 的代价转移到网络往返"说明理解了 trade-off 而不是背结论。
- 双引擎割裂的后果：dev 用 esbuild 转译、build 用 Rollup 打包，转换语义存在差异（如 CJS interop 细节、宏处理），偶发"dev 正常 build 报错"；插件作者要同时兼容两套管线（vite-plugin-legacy 等都要写两份逻辑）——这是引出 Rolldown 统一引擎的直接动机，下一题展开。
- 生产环境不走 no-bundle 的原因：浏览器原生 ESM 的嵌套请求在弱网/无 HTTP2 下灾难、无 tree-shaking、无代码压缩与兼容降级；所以 Vite 的完整表述是"dev no-bundle + build Rollup"——把"开发体验"与"产物质量"分开优化，是它对 Webpack 全场景统一模型的重新切分。

## Q：Vite 生产构建为什么用 Rollup 而不是 esbuild？Rolldown 的定位是什么？

**核心答案**：因为生产构建要的不是快，而是"产物的完整语义与生态兼容"。esbuild 的短板在三个硬需求上：代码分割（code splitting）能力长期不完善、CSS 处理链（CSS 代码分割、变量提取、PostCSS 生态）缺失或弱化、插件钩子太少（onResolve/onLoad 粒度粗，无法表达 transform/generateBundle/renderChunk 这类产物级处理）。而 Rollup 恰好相反：速度慢（JS 单线程 + AST 遍历开销大）但产物干净（scope hoisting 天然无模块包装）、tree-shaking 粒度细、多格式输出（ESM/CJS/UMD/IIFE）成熟、插件生态完整。于是 Vite 做了务实选择：dev 用 esbuild 吃速度、build 用 Rollup 吃质量。代价是双引擎割裂（语义差异、插件双写、build 成为流水线瓶颈）。Rolldown 就是来终结这个割裂的：Rust 实现的 Rollup 兼容打包器，目标是同时替代 dev 的 esbuild（转换/预构建）与 build 的 Rollup（打包），统一插件体系与语义，让 Vite 从"两个引擎拼接"变成"一个 Rust 引擎到底"。

**知识点解析**：

- 为什么 esbuild 做不了生产构建（逐条对应硬需求）：

```text
1. code splitting：esbuild 支持基础拆分，但高级语义（多入口共享块
   的精细控制、manualChunks 等价物、循环依赖下的拆分正确性）不完整
2. CSS：生产需要 CSS 代码分割（JS chunk 对应的 CSS 文件）、
   CSS modules、postcss 插件链——esbuild 的 CSS 能力只够 dev 转换
3. 插件钩子：onResolve/onLoad 两个钩子无法表达
   "在产物生成后改写/追加文件"（generateBundle）、
   "对 chunk 做二次处理"（renderChunk）这类产物级操作
4. 语义兼容：esbuild 的 CJS interop / target 行为与标准工具链
   存在差异，且某些转换不可逆，排查成本高
```

- Rollup 的产物优势（为什么库场景几乎无脑选它）：输出即重新生成的代码，无 runtime 包装（webpack 的 __webpack_require__ 模块引导代码不存在）、scope hoisting 把模块内联进同一作用域、tree-shaking 基于作用域活性分析更彻底——对"产物即门面"的库，这几条是决定性的。

- Rolldown 的技术定位：基于 Rust + oxc 工具链（oxc 提供 parser/resolver/transformer，是 Rust 版的"babel+swc 工具箱"）；插件 API 兼容 Rollup（resolveId/load/transform/generateBundle 原样可用）；并行化策略——解析、转换、链接各阶段任务级并行（Rayon 式线程池），AST 在阶段间以 Rust 结构传递，无序列化开销。

- 迁移现状（2026 视角）：rolldown-vite 以独立包发布，可作为 vite 的直接替换做回归验证；Vite 团队的路线是验证稳定后并入主线成为默认引擎；esbuild 在新架构里的角色收缩为可选的 minifier 与兜底转换器（配合 oxc-minifier 二选一）。

```json
// 迁移方式：仅替换依赖，配置不动
{
  "devDependencies": {
    "vite": "npm:rolldown-vite@latest",
    "typescript": "^5.6.0"
  }
}
```

**加分项（P7 视角）**：

- 加速不止于语言：Rolldown 的收益 = Rust 原生速度 × 阶段并行 × 更激进的模块图算法（实验性的 Oxcresolver 与跨 chunk 去重）；同样重要的是"消除 dev/build 语义差"这类正确性收益——技术选型时把"减少双链路维护成本"算进 ROI，是架构视角的得分点。
- 生态位全景（一句话给面试官画图）：Babel 生态兼容王但慢；swc 转换快但插件生态弱；esbuild 打包/转换都快但语义与钩子受限；Rollup 语义全但慢；Rolldown 试图做"Rust 速度 + Rollup 兼容"；Rspack 做"Rust 速度 + Webpack 兼容"。两大阵营分别押注"继承 Vite/Rollup"与"继承 Webpack"，选择取决于存量迁移成本。
- 冷启动之外的 build 瓶颈迁移：换 Rolldown 后瓶颈常移到插件（很多插件本身是低效 JS，如逐文件正则大字符串操作）与 sourcemap 生成；P7 的做法是把"引擎升级"当第一步，配 build profiling 持续定位下一个瓶颈，而不是止步于"我们用了新引擎"。

## Q：按需加载：import() 动态导入原理、分包边界、预加载策略？

**核心答案**：import() 是 ESM 的动态导入语法，返回一个 Promise；Webpack 遇到 import() 会在依赖图里创建新的异步 chunk，产物里对应一个独立文件，运行时按需通过 script 标签（JSONP 风格）或 fetch 加载该 chunk、执行后 resolve 模块。分包边界的设计原则是"按用户路径切，不按代码目录切"：路由级（每个页面一块）、重交互组件（编辑器/图表，交互后才需要）、低频功能（设置/导出）。预加载解决"点击时才去下载太慢"：prefetch（浏览器空闲时预取，webpack 的 /* webpackPrefetch: true */ 会注入 link rel=prefetch）适合"大概率会访问的下一页"，preload（父 chunk 加载时并行拉取，link rel=preload）适合"本屏必然用到的延迟模块"；进阶做法是行为预加载——hover/可视区/路由切换前手动触发 import()，把加载时机从"点击"提前到"意图出现"。

**知识点解析**：

- import() 的三层语义（语法层/打包层/运行时层）：

```js
// 语法层：TC39 提案，已进标准；返回 promise，模块只执行一次（有模块缓存）
const { openModal } = await import('./components/HeavyModal.vue');

// 打包层：webpack 把 './components/HeavyModal.vue' 及其独占依赖
// 从父 chunk 里切出来，生成独立文件，父 chunk 里只留一个"模块 id + 加载器引用"

// 运行时层（webpack）：本质是动态插 script 标签
// __webpack_require__.e(chunkId)  →  加载并执行 chunk
//   →  chunk 自注册到全局模块表  →  promise resolve 出模块
```

- 分包边界四原则 + 粒度判断：

```text
路由级     React.lazy(() => import('./pages/Detail'))
           Vue: defineAsyncComponent(() => import('./Detail.vue'))
重组件     编辑器、图表库、地图：首屏不渲染就不加载
低频功能   导出/打印/设置面板：多数用户整个生命周期只用一次或不用
业务模块   被多个异步块共享的模块交给 splitChunks 处理（自动）
反模式     拆太碎：chunk 间依赖形成串行瀑布（A 依赖 B 依赖 C 要三轮网络发现）
           拆太粗：缓存粒度差、单块过大解析阻塞
```

- 预加载策略对比（含 Vite 的自动行为）：

```js
// Webpack 魔法注释
import(/* webpackChunkName: "editor" */ /* webpackPrefetch: true */ './Editor');
// → 产物注入 <link rel="prefetch" href="editor.chunk.js">（空闲时低优先级预取）
import(/* webpackPreload: true */ './Chart');
// → 与父 chunk 并行加载（当前导航必然要用）

// Vite：动态 import 被 __vitePreload 包装，
// 自动注入 chunk 自身 + 其 CSS + 其静态依赖 chunk 的 modulepreload；
// 路由库场景常配 import.meta.glob 批量映射：
const pages = import.meta.glob('./pages/*.vue'); // 惰性：每个页面一个动态 import
```

- 行为预加载（把意图当信号，比 prefetch 注释更可控）：

```js
// hover 即预取：点击时 chunk 已在缓存，体感"零加载"
router.afterEach((to) => {
  const next = predictNextRoute(to); // 业务定义的"下一页预测"
  if (next) next.then(() => {});     // 触发 import() 预取
});

// 可视区预加载：IntersectionObserver 检测即将进入视口的重组件
observer.on('near', () => import('./BigList.vue'));
```

- 判断分包是否健康的量化口径：首屏 JS 体积（Lighthouse/CI 卡点）、LCP/INP 相关的加载瀑布图（Network 面板看 chunk 是否串行）、缓存复用率（发版后 vendor/公共块 hash 是否稳定）。

**加分项（P7 视角）**：

- 异步边界的运行时成本要能说清：每个异步 chunk 携带模块映射元数据；chunk 间共享模块默认会被提升到公共块，但 maxAsyncRequests 限制下可能内联复制——"拆分后总传输体积反而变大"是真实会发生的反直觉现象，解释路径是共享模块多副本 vs 请求上限的取舍。
- 失败处理是生产必修课：动态 chunk 加载失败（发版后旧 hash 文件被删、弱网）必须捕获并给恢复路径（重试 + 失败则整页 reload 到新版本），React 里是 lazy + ErrorBoundary，Vue 里是 onErrorCaptured 兜底 reload——"按需加载"方案不配失败恢复等于给线上埋雷。
- 与微前端的边界：import() 解决的是"单应用内的时机问题"，跨应用共享代码要用 Module Federation 的 remote/shared（运行时协商单例与版本）；两者常组合——远程模块本身也是异步边界，但治理目标从"加载时机"升级到"依赖共享与版本协商"。

## Q：SourceMap 原理与生产环境方案（防盗链、私有化映射、错误还原）？

**核心答案**：SourceMap 是一份"生成代码位置 → 源码位置"的映射表，随产物输出为 .map 文件（或在 eval 内联），核心字段是 sources（源文件路径表）、names（标识符表）、mappings（用 VLQ + base64 编码的位置差分序列）。生产环境的标准做法是 hidden-source-map：生成 map 但产物末尾不挂 sourceMappingURL，map 不部署到 CDN，而是随 CI 上传到内部监控平台；线上报错拿到的是压缩后的堆栈，平台用 map 反查出原始文件行列与函数名，实现"错误还原"。防盗链的三层手段：map 与源码不出内网/可信域（访问鉴权）、产物引用剥离（hidden）、必要时 names/sources 脱敏（nosources 或自建脱敏，只保留行号不留源码内容）。

**知识点解析**：

- .map 文件结构与 mappings 编码（能解释 VLQ 就到位）：

```json
{
  "version": 3,
  "file": "app.a1b2c3.js",
  "sources": ["../src/utils/format.ts", "../src/api/user.ts"],
  "sourcesContent": ["export const fmt = ...", "..."],
  "names": ["fmt", "queryUser"],
  "mappings": "AAAA,CAAC,EAAE,GAAG,CAAC"
}
```

```text
mappings 每段是一组 VLQ 编码的差分值：
  [生成文件列偏移, 源文件索引, 源文件行偏移, 源文件列偏移, (可选)名字索引]
  —— 位置用"相对上一个位置"的增量编码，改动一处源码不会影响整段 mappings
  分号 ; 分隔生成文件的"行"，逗号 , 分隔行内的"段"
  VLQ：把数字拆成 5bit 一组，最高位标记"还有后续"，base64 字符表编码
```

- 链式映射：代码经过 loader/转换器/压缩器多轮处理，每一步的 map 必须向上合并（compose）——babel 输出 code+map，terser 接收上一步 map 并把自己的 map 与之合并成"最终产物 → 原始 TS"的直达映射。任何一环丢了 map，链路就断在那一环，之后的定位全部失效——这是"为什么压缩必须开 sourcemap 才能还原"的原因。

- 生产环境三种方案对比：

```text
方案A：hidden-source-map + 私有化平台（主流）
  产物不引用 map；map 上传 Sentry/自建平台；
  报错堆栈（压缩后）+ map → 平台反查源码位置
  成本：要自建/采购平台，注意 sourcesContent 上传的合规边界（源码出境）

方案B：nosources-source-map
  map 里不含 sourcesContent（源码文本），只有路径与行号；
  泄漏面小但反查时需要按路径找到对应 commit 的源码还原

方案C：完全不出 map
  报错只有压缩后位置；靠构建时记录产物版本 + 本地离线反查
  （CI 存档每个版本的 map，用户报错带版本号，本地工具还原）
```

- 错误还原的最小实现（监控平台的核心逻辑）：

```js
const { SourceMapConsumer } = require('source-map');

async function resolveStack(minifiedFile, line, column, mapJson) {
  const consumer = await new SourceMapConsumer(mapJson);
  // 压缩后的行列 → 原始源码位置 + 名字 + 源文件
  const pos = consumer.originalPositionFor({ line, column });
  // { source: 'src/utils/format.ts', line: 42, column: 7, name: 'fmt' }
  return pos;
}
```

- 防盗链细节：CDN 层对 *.map 直接 403 或仅内网回源可见；上传平台时 map 与发布版本强绑定（release 版本号 + commit），防"串版本反查出错误源码"；错误上报里必须带产物 hash/版本，否则 map 对不上是常态事故。

**加分项（P7 视角）**：

- sourcemap 对构建速度的影响常被低估：generate map 是 O(代码量) 的高成本步骤，CI 拆分"构建产物"与"生成并上传 map"可并行；另外 map 的体积可达产物的数倍，上传走增量与压缩（gzip 后 mappings 可减 70%+），CI 存档要设保留期。
- eval 系 map 的原理差异：eval-source-map 把 map 以 dataURL 塞进 eval 的字符串里，dev 下省一次文件读取与网络请求，但只适合单文件转译场景；生产绝不能用（把源码完整内联进产物）。
- 进阶：SourceMap v3 的 index map（sources 与 mappings 的分片）被用于超大产物的分段映射（esbuild/Rollup 的分块 map）；错误还原平台要处理行列偏移在多轮 map 合并后的精度损耗（cheap 模式只有行级），还原准确率是监控平台的硬指标——能讲"还原失败率"的团队是真把这套跑通了。

## Q：esbuild/Swc/Babel 对比：为什么 AST 转换速度差这么多（Go/Rust 单线程多协程）？

**核心答案**：速度差是"语言实现成本 × 并行模型 × AST 表示"三个因子的乘积。Babel 用 JS 写：每个文件都要经过 parse → traverse（访问者模式逐节点回调）→ generate，全程产生海量 JS 对象（AST 节点、作用域、路径包装对象），GC 压力大、单文件内完全串行，跨文件并行还要付 worker 通信成本。esbuild 用 Go：AST 是紧凑的 struct 数组（内存连续、指针少），解析与打印是手写优化的代码，天然共享内存的多核并行（goroutine 池按文件粒度分发任务，无序列化）。swc 用 Rust 同理，外加零成本抽象保证高级 API 不付出运行时代价。量级上，转换速度通常是 Babel 的 10-100 倍。但要强调：快是有代价的——esbuild/swc 的插件生态、转换语义兼容度、产物可控性都不及 Babel，这是"速度 vs 兼容"的取舍而非纯优劣。

**知识点解析**：

- 三个引擎的架构对照：

```text
Babel（JS）
  parse(acorn) → traverse(visitor 模式逐节点回调) → generate
  AST = 普通对象树，包装层多（Path/scope/traversal 上下文）
  单文件串行；多文件 worker 并行要付 JSON 序列化 + 进程通信
  插件 = 最灵活（任意 visitor 改任意节点），生态最全（preset-env 兼容矩阵）

esbuild（Go）
  手写 lexer/parser → struct AST（值语义、连续内存）→ 手写 printer
  全流程共享内存，goroutine 按文件粒度并行（无序列化开销）
  并发安全的数据结构 + 少量锁；解析速度本身也快（优化过的查表实现）

swc（Rust）
  与 esbuild 同级的转换速度，定位"可编程的 Rust Babel"
  零成本抽象：插件用 Rust 写时无解释开销；WASM 插件兼容生态但慢于原生
  承担 Next.js 的编译层（SWC transform + 自动 polyfill 决策）
```

- 关键概念"多协程/多线程并行 AST"到底并行在哪：并行的是"文件间"（每个文件的解析转换独立，任务队列分发给线程池），而不是"单文件内"（单文件 parse 有固有序号依赖）；共享的模块图/符号表用细粒度锁或阶段化构建（先并行 parse，再串行链接）——能说清"并行的是任务不是算法"是理解这道题的门槛。

- 选型矩阵（按场景给结论）：

```text
业务应用（浏览器目标现代）：esbuild/swc 转换，基本用不到 Babel
需要高度自定义转换/装饰器完整语义/Babel 插件生态：Babel
库作者：Rollup + babel 或 swc；测试环境 jest 用 esbuild-jest/swc-jest 提速
Next.js：内置 swc（自动决定 polyfill 与转译目标）
存量老项目（IE/低版本安卓）：Babel 的 preset-env 兼容矩阵仍是唯一完整解
```

- 为什么 Babel 慢得这么稳定：访问者模式的每次节点进出都是函数调用 + 上下文对象构造；AST 节点在 V8 里多为 dictionary mode 对象（属性动态添加导致 hidden class 失效）；一个中型文件百万级节点操作 × 多插件重复 traverse——Babel 7 的按需 traverse、babel-preset-env 的懒加载只能缓解不能逆转。

**加分项（P7 视角）**：

- "迁移不掉 Babel"的真实原因盘点：私有 Babel 插件（内联常量、国际化提取、埋点注入）、装饰器与 legacy 装饰器语义差异、CJS interop 边界行为差异（esbuild 的 default 导入处理曾被社区反复投诉）、source map 兼容——迁移要跑双引擎产物 diff（AST 级或 bundle 级快照对比），不是改个 loader 名字那么简单。
- 引擎之外的瓶颈转移：换 esbuild/swc 后构建瓶颈常移到 terser（压缩）与 sourcemap 生成；对应解法是 esbuild minify / oxc-minifier，或压缩与 map 生成并行——P7 的习惯是每次优化后重新 profile，而不是宣布胜利。
- 演进判断：oxc（Rust 工具箱：parser/resolver/transform/minifier/linter）正在被 Rolldown/Vite 采用，swc 与 oxc 的关系是"应用级全家桶 vs 工具箱级积木"；2026 前端工具链的主流叙事已经是"Rust/Go 引擎 + JS 插件胶水层"，插件层的 JS 逐渐成为新的性能天花板。

## Q：Babel 全链路：parse→transform→generate？polyfill vs transform-runtime？

**核心答案**：Babel 的工作分三段：parse（用 acorn fork 解析成 ESTree AST）、transform（traverse AST，按 plugins 注册的 visitor 改写节点）、generate（把 AST 打印回代码并生成 sourcemap）。核心认知：Babel 只做"语法转换"（箭头函数、类、可选链这类"新语法 → 老语法"），不做"API 补齐"（Promise.all、Array.includes 这类运行时方法缺失要靠 polyfill）——两者由不同机制负责。polyfill 方案是 @babel/polyfill（按 preset-env 的 useBuiltIns: usage 按需注入 core-js 的模块，污染全局）；transform-runtime 的区别是把 helpers 与 polyfill 改成从 @babel/runtime-corejs3 引入"纯净版"（不污染全局、相同 helper 全局去重），代价是产物显式 import 依赖运行时包——库作者必须用它，应用二选一时按"是否需要全局污染"决定。

**知识点解析**：

- 三段流程与每段产物：

```text
input.js
  → babylon/acorn parse        →  AST（ESTree 结构）
  → traverse + visitors        →  新 AST（插件在此改写）
  → @babel/generator           →  output.js + sourcemap
注：syntax plugin 只影响 parse（让新语法可解析，如 jsx/ts）；
    transform plugin 才改写 AST；preset 是插件集合的快捷方式
```

- 语法 vs API 的分界（Babel 面试的第一道分水岭）：

```js
// 语法：编译期可改写 —— Babel 负责
const f = (a = 1) => a ?? 0;          // 默认参数、空值合并 → ES5 函数 + 判断
class A {}                            // 类 → 构造函数 + 原型

// API：运行时才存在 —— Babel 无能为力，需要 polyfill
new Promise(...);                     // 旧引擎没有这个构造器
[1, 2].includes(1);                  // 旧引擎的原型上没有这个方法
'abc'.replaceAll('a', 'b');          // 同上
```

- 两种 polyfill 方案的配置与差异：

```js
// 方案一：preset-env + core-js（应用代码适用，接受全局污染）
presets: [
  ['@babel/preset-env', {
    targets: '> 0.25%, not dead',
    useBuiltIns: 'usage',   // 按文件里实际用到的 API 注入，而非全量
    corejs: { version: 3, proposals: false },
  }],
],

// 方案二：transform-runtime（库必用，不污染全局）
plugins: [
  ['@babel/plugin-transform-runtime', {
    corejs: { version: 3 },   // 配 @babel/runtime-corejs3 这个依赖包
  }],
],
```

```text
                     全局 polyfill            transform-runtime
注入位置             模块顶部 import core-js   模块内 import @babel/runtime-corejs3
全局污染             有（原型/全局对象被改）   无（用纯函数包装替代）
helper 去重         每个文件重复内联          统一从 runtime 包引入
适用                 应用（全家桶一次性补齐）   库（不能替用户决定全局环境）
```

- helpers 去重细节：_classCallCheck 这类转换辅助函数默认内联进每个文件，100 个类 = 100 份拷贝；transform-runtime 把它们变成对 @babel/runtime 的具名 import，产物与编译顺序无关——这也是库必须配 runtime 的原因（不然用户侧的体积不可控）。

- preset-env 的决策输入：targets（browserslist）决定转与不转——目标浏览器已支持的语法直接跳过；这就是"同一个 Babel 在不同项目体积差异巨大"的原因，也是为什么 targets 写得过宽是体积事故的常见源头。

**加分项（P7 视角）**：

- polyfill 的注入粒度演进：全量 core-js（几百 KB）→ useBuiltIns: usage（按需，但分析不到第三方依赖内部用到的 API 与动态字符串用法）→ 现代方案干脆放弃静态注入，改用运行时检测（polyfill.io 服务或 CDN 的 UA 条件下发，注意 2024 polyfill.io 供应链投毒事件后必须自托管）——能把"按需 polyfill 的安全边界"讲清是资深信号。
- 目标环境决策权前移：2026 的主流做法是把 targets 定得很现代（evergreen 浏览器），Babel 退化为 JSX/TS 转译器（甚至直接交给 esbuild/swc），polyfill 交给"按 UA 条件加载的极薄补丁"；能讲"从 polyfill 策略看浏览器兼容治理的成本变迁"是加分叙事。
- 与压缩链路的组合细节：Babel 注入的 helpers 与 core-js 引用会参与 tree-shaking，但 sideEffects 配置错误的包会把整个 core-js 拉进来——体积排查时要能区分"语法转换引入的 helpers 体积"与"API 补齐引入的 polyfill 体积"，两者治理手段完全不同。

## Q：Monorepo：pnpm workspace 原理（符号链接/虚拟store）、幽灵依赖如何治理？

**核心答案**：pnpm 的存储分三层：全局 content-addressable store（按文件内容哈希存储，同一内容全机只有一份）、项目的 node_modules/.pnpm 虚拟 store（每个包版本一个目录，如 .pnpm/lodash@4.17.21/node_modules/lodash，其依赖通过符号链接互相指向）、顶层 node_modules（只有 package.json 直接声明的依赖，且是指向 .pnpm 的符号链接）。这个结构天然治理了幽灵依赖——由于 node_modules 顶层只有直接依赖，代码里 require 未声明的包会直接找不到（Node 的解析沿真实路径回溯，而 .pnpm 内部的符号链接布局保证只有声明的依赖可解析）。对比 npm/yarn classic 的 hoisting：把所有传递依赖拍平到顶层 node_modules，任何未声明的包都能被 require 到，这就是幽灵依赖的来源。pnpm 也提供兜底：pnpm-workspace 或 .npmrc 的 shamefully-hoist、public-hoist-pattern 可以选择性提升（为兼容老旧工具链）。

**知识点解析**：

- 三层结构图（面试画这张图）：

```text
全局 store（~/.pnpm-store 或 D:\.pnpm-store）
  └── 内容哈希寻址：v3/files/ab/cdef...  ← 全机去重，硬链接来源

项目 node_modules/.pnpm/（虚拟 store）
  ├── .pnpm/react@18.3.1/node_modules/
  │     ├── react/            ← 硬链接自全局 store
  │     └── loose-envify/     ← react 的依赖：符号链接到 .pnpm/loose-envify@x.x.x
  ├── .pnpm/axios@1.7.0/node_modules/
  │     ├── axios/
  │     └── follow-redirects/ ← 符号链接（axios 只能看见自己声明的依赖）

项目 node_modules/（顶层：只有直接依赖）
  ├── react -> .pnpm/react@18.3.1/node_modules/react   （符号链接）
  └── axios -> .pnpm/axios@1.7.0/node_modules/axios    （符号链接）
```

- 幽灵依赖的成因与 pnpm 的解法对照：

```text
npm/yarn classic（hoisting 拍平）：
  node_modules/  react, axios, follow-redirects(未被声明却在这！), ...
  → import 'follow-redirects' 能成功 —— 没声明却可用 = 幽灵依赖
  → 事故：某天 axios 升级换了依赖，项目直接编译报错（隐性依赖显性化）

pnpm 默认（strict）：
  顶层只有 react/axios —— import 'follow-redirects' 直接报错
  → 依赖必须在 package.json 声明，供应链可见性完整
```

- workspace 配置与常用命令：

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/utils/*'
```

```bash
pnpm add lodash --filter web                 # 给指定子包装依赖
pnpm add utils --filter web --workspace      # 声明内部包依赖（协议 workspace:^）
pnpm --filter web... build                   # 含依赖拓扑的构建（web 及其内部依赖）
pnpm -r run build                            # 按拓扑序全量执行
pnpm --filter web deploy                     # 部署时只带该包的依赖子树
```

- 幽灵依赖的主动治理工具链（迁移到 pnpm 之外的补充手段）：

```text
1. 依赖可见性检测：eslint-plugin-import 的 no-extraneous-dependencies
   + 规则约束"import 必须来自 package.json 声明"
2. 依赖图审计：dependency-cruiser 输出违规引用并 CI 卡点
3. 迁移期兜底：.npmrc 配 public-hoist-pattern=*eslint* 等白名单
   （给不认符号链接的老工具放行，收敛后逐步删除）
```

- workspace 协议与发布联动：内部依赖写 "utils": "workspace:^"，开发期符号链接直连源码；发布时 pnpm 自动把 workspace:^ 替换成真实版本号——这是"源码即依赖、发布自动改写"的关键机制。

**加分项（P7 视角）**：

- 符号链接的工程暗坑清单：Windows 下需要开发者模式或管理员权限；Jest 默认 cache 对 symlink 的 watch 行为、Docker 构建上下文忽略 symlink 目标（COPY 后断链）、个别打包器（老版本 Metro/某些 webpack resolve 配置）不解析真实路径导致重复打包同一包——迁移 pnpm 前要过一遍工具链的 symlink 兼容矩阵，这是真实迁移评估项。
- 与 npm/yarn 的全景对比：npm3+ 用 hoist 治理重复但制造幽灵依赖；yarn classic 同样 hoist；yarn berry（PnP）用 .zip + 内存映射彻底消灭 node_modules，速度快但生态兼容差（多数工具不认）；pnpm 用"符号链接 + 虚拟 store"在兼容 node_modules 协议的前提下拿到结构正确性——目前是事实最优解，能讲三者演进的取舍链条是加分叙事。
- 多版本收敛问题：同一包允许共存多版本（.pnpm 里按版本隔离），这解决了地狱但掩盖了治理信号——用 pnpm why 或 renovate 输出"同一包的版本分布"，把重复版本收敛（如 5 个 lodash 版本 → 1 个）是 monorepo 体积治理（第 13 题）在依赖层的延伸。

## Q：构建产物分析：bundle 分析工具、体积治理（公共依赖多版本收敛）？

**核心答案**：产物治理的闭环是"可视化定位 → 归因分类 → 逐类治理 → CI 卡点防回归"。分析工具按打包器分：webpack-bundle-analyzer（可视化 treemap）、webpack 的 stats + 官方 analyze、rollup-plugin-visualizer（Vite/Rollup 场景，sourcemap 级归因）；此外 source-map-explorer 直接对产物 + map 做归因（不依赖构建插件，可分析线上任意产物）。体积问题归类通常四类：公共依赖多版本共存（治理手段是版本收敛与单例化）、整包引入未摇除（换按需 API 或换包）、复制型代码（ Moment 全量 locale、多份 lodash、图标全量导出）、与运行时无关的代码（source map 内联、注释、未压缩资源）。公共依赖多版本收敛是 monorepo 重灾区：A 依赖 axios@1.2、B 依赖 axios@1.7，打包器按模块图各自引入——收敛靠"锁定版本 + 打包器 alias + 共享声明"三板斧，最后用 CI 体积预算卡点守住成果。

**知识点解析**：

- 分析工具矩阵（面试给结论性的"哪个场景用哪个"）：

```text
webpack-bundle-analyzer   开发期可视化 treemap，模块级归因
source-map-explorer      产物 + .map 直接归因，可分析线上任意历史产物
                          （不侵入构建，最好用的"事后审计"工具）
rollup-plugin-visualizer  Vite/Rollup 生态标准，支持 treemap/sunburst/network
webpack --json + 逐 chunk 统计   脚本化输出，喂给 CI 做趋势
ImportCost / webpack-import-cost  编辑器级实时提示（开发时感知）
```

- 典型体积问题与对应解法（背这张映射表）：

```text
问题                          解法
─────────────────────────────────────────────────────────
moment 全量 locale(240KB+)    dayjs 替换 / 按需注册 / webpack IgnorePlugin
lodash 全量引入               lodash-es + 按需 + tree-shaking 验证
图标库全量导出                 按需组件 / unplugin-icons / SVGR 按需
组件库 JS 全量                 babel-plugin-import（老）/ 自动摇除验证（新）
已不再使用的依赖残留           depcheck + knip 清理死代码与死依赖
vendor 块肥大                 splitChunks 分层 + 检查是否把大而全的 SDK 混入
sourcemap 内联进产物          关闭内联（devtool 配置检查）
```

- 公共依赖多版本收敛三板斧：

```js
// 1. 锁版本：monorepo 统一 catalog（pnpm v9 catalog）
// pnpm-workspace.yaml:
//   catalog:
//     lodash-es: ^4.17.21
// 子包 package.json: "lodash-es": "catalog:default"
// → 全仓一个版本号，新增子包只能引用 catalog，杜绝漂移

// 2. 打包器强收敛：alias 把所有版本指向同一个
// vite.config.js
resolve: {
  alias: [{ find: /^lodash-es$/, replacement: require.resolve('lodash-es') }],
},

// 3. 共享声明：webpack splitChunks 强制合并 / Module Federation shared 单例
// monorepo 内部工具包依赖同一 UI 库时，shared: { vue: { singleton: true } }
```

- CI 体积预算卡点（防回归的核心，比一次性优化更重要）：

```js
// scripts/size-limit.mjs —— 构建后对比预算，超限直接失败
import { readFile } from 'node:fs/promises';

const BUDGET = { 'main.js': 180 * 1024, 'vendor.js': 300 * 1024, 'index.css': 60 * 1024 };
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));

let failed = false;
for (const [file, budget] of Object.entries(BUDGET)) {
  const actual = manifest[file]?.size ?? 0;
  const ok = actual <= budget;
  console[ok ? 'log' : 'error'](`${ok ? 'PASS' : 'FAIL'} ${file}: ${(actual / 1024).toFixed(0)}KB / ${(budget / 1024).toFixed(0)}KB`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
```

- 归因的正确姿势：先看 gzip 后体积（网络传输口径）再看原始体积（解析/编译口径）——两者独立考核：传输靠压缩与按需，解析靠总量削减。仅看一个口径会得出错误结论（如 gzip 后很小的巨型 JSON 依然有解析成本）。

**加分项（P7 视角）**：

- 体积治理的度量体系：单次数值没有意义，要建"产物体积时间序列"（每次发布记录各 chunk 大小 + 依赖构成快照），PR 里自动 comment 增量（+12KB，来自新增 echarts）——把归因自动化到"谁引入的、什么时候引入的"级别，体积问题才不会反复。
- 多版本判定的技术细节：打包器按"包名 + 版本"作为模块身份，同一版本内部去重靠模块图；收敛的收益不仅是体积，还有"两份 axios 实例导致拦截器不生效"这类运行时 bug——能举出"多版本导致的运行时单例分裂"案例（axios 拦截器、dayjs 插件注册）说明真的踩过。
- 终局思维：产物治理的上游是"引入决策"（技术选型时把包的体积/摇除友好性作为评审项），下游是"加载策略"（第 8 题的按需与预加载）；bundle analyzer 只是中间的观测手段——把工具讲成体系的一环而非全部，是 P7 与 P6 的分界。

## Q：库开发：CJS/ESM/UMD 多格式产物、external、dual-package hazard？

**核心答案**：现代库的标准产物组合是：ESM（module/exports 字段，给打包器与现代 Node）、CJS（main 字段，给老 Node 与老工具链）、UMD（浏览器 script 标签直接引用，可选）、以及类型（types 字段指向 .d.ts）。external 是"这些依赖不进我的产物"的声明：运行时依赖（react、vue）必须 external（否则与宿主的框架形成双实例），工具类库通常也 external 让用户侧 tree-shake 与去重；构建工具负责把 import 转成产物格式。dual-package hazard（双包陷阱）指"同一包同时提供 ESM 与 CJS 入口，且两个入口各自实例化了模块内的状态"，导致用户混用（一处 import ESM、另一处经传递依赖走 CJS）时拿到两个单例——instanceof 失败、全局缓存分裂、React context 不匹配等诡异 bug。标准解法是"单一事实源"：状态逻辑只在一个格式里实现（通常是 CJS 或 ESM），另一个格式只做 re-export，绝不各自构建一份。

**知识点解析**：

- package.json 入口字段全景（2026 版本写法）：

```json
{
  "name": "my-ui",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": ["**/*.css"],
  "files": ["dist"]
}
```

  字段解释：exports 是现代标准（Node 12.7+，同时约束深路径访问——没在 exports 声明的子路径无法被导入，防内部结构泄漏）；types 必须放在 exports 内的第一个 key（TS 按顺序匹配）；main/module 是 exports 之前的兜底。

- 一次构建出多格式的配置（Vite 库模式 + Rollup output）：

```js
// vite.config.js —— 库模式
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs', 'umd'],
      name: 'MyUI',           // UMD 全局变量名
      fileName: (format) => `index.${format === 'es' ? 'js' : format}.js`,
    },
    rollupOptions: {
      external: ['vue', 'vue-router'],          // 不打进产物的运行时依赖
      output: {
        exports: 'named',
        globals: { vue: 'Vue', 'vue-router': 'VueRouter' }, // UMD 外部依赖的全局名
        assetFileNames: 'styles.[ext]',
      },
    },
  },
});
```

- external 的三类判断标准：

```text
必须 external：运行时依赖与 peerDependencies（react/vue——打进产物必然双实例）
建议 external：工具链里宿主大概率已有的包（lodash-es、axios——让用户侧去重与摇除）
不 external（bundle）：内部源码、小型零依赖工具（合并进产物减少用户安装负担）、
                      polyfill 决策交给库时（少见，多为 CLI 场景）
判断口径：这个包"在用户项目里应该只有一份实例吗"——是则 external
```

- dual-package hazard 的标准复现与两种解法：

```js
// 包内有一个模块级单例状态（CJS 与 ESM 各构建一份 → 两个独立闭包）
let instanceCount = 0;
export function create() { return { id: ++instanceCount }; }

// 用户侧混用：
import { create } from 'my-lib';              // ESM：counter 是 A 份
const legacy = require('my-lib-legacy');      // 某依赖内部走 CJS：counter 是 B 份
// instanceof / 单例缓存全部失灵

// 解法一（推荐）：ESM 入口直接 re-export CJS 产物（或在 CJS 产物上加 ESM 包装）
// dist/index.js
// export * from './index.cjs' 的语义由打包器生成（esm shim 只做转发）
// → 状态只在 index.cjs 里实例化一次

// 解法二：esbuild/rollup 的 esm 产物保持与 CJS 相同的模块实例
// 用同一份实现 + 两种加载协议包装（isomorphic 模式）
```

**加分项（P7 视角）**：

- exports 的深路径治理：把内部模块的深路径入口显式声明（"./hooks": { import: "./hooks.js" }），配合 sideEffects 让用户按需引入且摇除友好——深路径是组件库按需加载零成本方案的本质（比 babel-plugin-import 更通用）。
- 发布校验体系：publint（校验 exports/main/types 字段正确性）、attw（arethetypeswrong，验证类型解析路径）、npm pack --dry-run 检查 files 覆盖、以及"CI 里真实建一个 ESM + 一个 CJS 消费项目跑双冒烟"——库的格式事故几乎都发生在"类型能解析但运行时 undefined"这类边界，靠人工 review 防不住。
- 边界认知：UMD 正在退出（2026 场景下 CDN script 引入可由 ESM CDN（esm.sh/jsdelivr +esm）替代，"type": "module" 的包越来越多直接放弃 CJS）；但企业内部组件库（宿主是 webpack + CJS 互操作场景）短期内三格式仍是标配——能讲"按消费方矩阵决定产物矩阵"（内部库 vs 开源库的格式裁剪）是库设计成熟的标志。

## Q：从 0 设计一套企业级构建体系（构建提速 3 分钟→30 秒的完整案例）？

**核心答案**：这道题不是考优化清单，是考"体系化方法论"：先建度量（没有 profile 就没有优化方向），再按"删 → 换 → 并 → 缓 → 卡"五层递进——删掉不必要的转换（现代 target 让大部分转译无意义）、换掉慢引擎（Babel→esbuild/swc、Webpack→Rspack/Vite）、并行化（类型检查、压缩、sourcemap 与主流程解耦）、缓存体系（本地持久缓存 + CI 缓存 + 远程缓存三层）、最后 CI 体积与耗时卡点防回归。真实案例的数字基线：1200+ 模块的中后台 monorepo，webpack 全量构建 3 分钟（CI 5 分钟），最终全量 30 秒、增量 8 秒、CI 2 分钟。关键是每一步都有 profile 数据支撑优先级，而不是拍脑袋加配置。

**知识点解析**：

- 案例背景与瓶颈定位（先量化再动手，profile 输出示例）：

```text
背景：中后台 monorepo（pnpm workspace）
  8 个应用 + 30 个内部包；webpack 5 + babel + ts-loader；
  本地 dev 启动 90s，生产 build 180s，CI 流水线 300s（含安装）

第一步：profile（speed-measure-webpack-plugin 分支版 + stats.timing）
  babel-loader         78s   43%  ← 最大头：preset-env 全量转译
  ts 类型检查(同步)     45s   25%  ← ts-loader 的 forkTsChecks 未异步化
  terser 压缩          28s   16%  ← 单线程 JS 压缩
  css/less + postcss   12s    7%
  其他(解析/拷贝)       17s    9%
  结论：80% 耗时在"转译 + 类型检查 + 压缩"三个可替换环节
```

- 分阶段优化（每阶段给"做了什么 + 为什么 + 收益"）：

```text
阶段一：删（收益最大且零风险）—— 目标 browserslist 从 IE11 收敛到
  evergreen；preset-env 的 transform 面缩小 80%（语法大多原生支持）
  本地 build 180s → 110s；产物体积 -18%（polyfill 大减）

阶段二：换 —— babel-loader → esbuild-loader（保留一个 babel 通道
  只处理含 legacy 装饰器的目录）；ts-loader → esbuild 转译 +
  fork-ts-checker 异步类型检查（类型错误不再阻塞 emit）
  110s → 52s

阶段三：并行与解耦 —— terser → esbuild minify（28s → 6s）；
  sourcemap 生成与上传拆成独立 CI job（主构建不等 map）；
  css 单独 pipeline 并行
  52s → 41s

阶段四：缓存体系（三层）——
  本地：cache.type filesystem（二次构建 41s → 8s）
  CI：node_modules/.cache 打进 runner 缓存（命中时 CI 300s → 90s）
  远程：构建产物按"影响文件集哈希"存 OSS，PR 场景直接复用
  全量 41s / 增量 8s；CI 平均 300s → 120s

阶段五：架构级 —— 新应用用 Vite 起（dev 秒开），
  存量 webpack 应用保持渐进迁移（共用同一套 eslint/测试/发布）
  —— 体系兼容两种引擎，避免"一刀切重写"的风险

最终：全量 30s / 增量 8s / CI 2 分钟（安装与部署占大头，构建不再瓶颈）
```

- 核心配置落地（阶段二 + 阶段四的关键片段）：

```js
// webpack.config.js（提速后）
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: { config: [__filename] },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: path.resolve('src'),
        exclude: /legacy-decorators/,
        use: [{ loader: 'esbuild-loader', options: { target: 'es2020' } }],
      },
      // 仅 legacy 目录保留 babel（装饰器语义）
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [{ loader: 'esbuild-loader', options: { minify: true } }],
  },
  // 类型检查交给 fork-ts-checker-webpack-plugin（异步）
  plugins: [new ForkTsCheckerWebpackPlugin({ typescript: { mode: 'write-references' } })],
};
```

- 量化收益汇总表（面试时直接给这张）：

```text
指标                优化前    优化后    手段
本地 dev 启动        90s      12s      缓存 + 预构建 + （新应用 Vite 秒级）
本地全量 build       180s     30s      删转译 + 换引擎 + 并行
本地二次构建         180s      8s      filesystem cache
CI（含安装部署）     300s     120s     runner 缓存 + map 拆分 + 产物复用
产物 gzip 体积       1.2MB    0.95MB   target 收敛 + polyfill 减量
回归（每周构建失败）  2-3 次   ~0       类型检查异步化后不再阻断误报
```

- 防回归与治理机制（不做这步，三个月后打回原形）：

```text
1. 耗时与体积看板：CI 每次记录 build 时间与 chunk 体积，
   PR 自动 comment 增量；超阈值（+10% 耗时 / +50KB 体积）标红
2. 预算卡点：size-limit 式 CI 任务，超预算直接 fail
3. 依赖引入评审：新增重型依赖（>100KB）必须在 PR 里说明并给摇除验证
4. 引擎与配置统一：构建配置收敛到内部 CLI（packages/build-tool），
   应用不写自定义 webpack 配置——统一升级、统一优化
5. 缓存命中率监控：filesystem cache 与 CI cache 的命中率定期 review，
   命中率下降说明有人在污染 cache version
```

**加分项（P7 视角）**：

- 推进策略比技术更难：改构建链路的 PR 会引发"全量回归测试"，落地方式是灰度（先 1 个应用试点两周 → 数据说话 → 批量迁移脚本 + 内部 CLI 收编），并且全程保留回滚开关（环境变量切回旧链路）——P7 的交付物是"低风险迁移路径 + 数据"，不是一个炫技配置。
- 度量体系是体系化与零散优化的分水岭：耗时（分阶段 timing）、体积（分 chunk + gzip 双口径）、缓存命中率、构建失败率四个指标必须长期入库；没有趋势数据，"30 秒"只是某天的快照，团队也不会相信优化的持续价值。
- 终局判断：这套体系的下一站是"构建即缓存"——Turborepo/Nx 式的任务级远程缓存（按输入哈希复用任意任务产物）、Rolldown 统一引擎、以及增量构建下"按需构建受影响应用"（changeset + 拓扑影响分析只构建变更相关的 app）；能从"单应用提速"讲到"整个仓库的任务调度"维度，是从高级工程师到架构岗视角的跨越。





