# 面试题库扩充实施计划（7年前端 P6/P7）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 7 年经验 P6/P7 前端面试建立分主题的完整题库（问题 + 详细答案 + 知识点解释），覆盖框架/HTML/JS/TS/CSS/浏览器/HTTP/构建/CI-CD/小程序/客户端/Node 等领域。

**Architecture:** 新建 `docs/src/pages/interview/ms/题库/` 目录，按主题拆分为 13 个独立 md 文件（每个文件单一职责、可独立复习）。沿用现有题库 `## Q：xxx` 的问答格式。原 `项目.md` 保留不动，`大纲.md` 末尾追加题库索引，sidebar 增加子分组。

**Tech Stack:** VitePress 1.0.0-rc.44（本地搜索自动覆盖新页面）

## 全局写作规范（每个任务必须遵守）

1. 文件头：`# N 主题名`，随后一行简介（对标 7 年 P6/P7，答案要有深度：原理 + 对比 + 生产实践）
2. 每题格式（严格遵循，含空行）：

```markdown
## Q：问题标题？

**核心答案**：直接回答（3-8 句）。

**知识点解析**：

- 知识点1：解释
- 知识点2：解释

**加分项（P7 视角）**：

- 结合生产实践的深度补充（原理层/权衡层/故障案例层）

```

3. 代码示例一律用围栏代码块（```js / ```ts / ```html 等），**围栏外严禁出现 `{{` `}}`**（会导致 VitePress 构建把内容当 Vue 模板执行而报错）
4. 标题前后必须空行；有序列表 `1. ` 数字后必须有空格
5. 答案深度要求：P6 答到"是什么+为什么+怎么用"；P7 加分项答到"源码/协议层原理、方案对比权衡、线上故障与容量考量"
6. 每个文件完成即提交一次

## 文件结构总览

- Create: `docs/src/pages/interview/ms/题库/01-js.md` —— JavaScript 核心
- Create: `docs/src/pages/interview/ms/题库/02-ts.md` —— TypeScript
- Create: `docs/src/pages/interview/ms/题库/03-html-dom.md` —— HTML/BOM/DOM
- Create: `docs/src/pages/interview/ms/题库/04-css.md` —— CSS
- Create: `docs/src/pages/interview/ms/题库/05-browser.md` —— 浏览器原理/性能/安全
- Create: `docs/src/pages/interview/ms/题库/06-http.md` —— HTTP/网络
- Create: `docs/src/pages/interview/ms/题库/07-vue.md` —— Vue 框架
- Create: `docs/src/pages/interview/ms/题库/08-react.md` —— React 框架
- Create: `docs/src/pages/interview/ms/题库/09-build.md` —— 构建工具（Webpack/Vite/Rollup/esbuild）
- Create: `docs/src/pages/interview/ms/题库/10-cicd.md` —— CI/CD 与工程化（Monorepo/pnpm/微前端）
- Create: `docs/src/pages/interview/ms/题库/11-miniprogram.md` —— 小程序/UniApp 跨端
- Create: `docs/src/pages/interview/ms/题库/12-client.md` —— 客户端/跨端（Flutter/Electron/RN）
- Create: `docs/src/pages/interview/ms/题库/13-node.md` —— Node.js
- Modify: `docs/src/pages/interview/ms/大纲.md` —— 末尾追加题库索引
- Modify: `docs/.vitepress/config.mjs:146` —— sidebar "面试题库" 改为分组

---

### Task 1: 01-js.md（JavaScript 核心）

**Files:**
- Create: `docs/src/pages/interview/ms/题库/01-js.md`

- [ ] **Step 1: 写入文件**，包含以下 22 题（每题按全局规范写完整答案）：
  1. this 指向的完整规则（默认/隐式/显式/new/箭头函数），手写 call/apply/bind
  2. 闭包原理与内存模型；V8 闭包变量存储位置；生产中的内存泄漏案例
  3. 原型链与继承：class extends 编译后是什么；Object.create 实现
  4. 事件循环：浏览器与 Node 事件循环差异；微任务优先级的底层原因
  5. Promise 原理：手写 Promise A+（状态机 + then 链）；async/await 是 Generator 的语法糖吗
  6. 垃圾回收：V8 新生代/老生代、标记清除、增量标记、并发回收
  7. 执行上下文：VO/AO/GO；变量提升与暂时性死区的字节码层面解释
  8. 深拷贝：structuredClone 的边界；循环引用/WeakMap 方案；性能对比
  9. 防抖节流 + requestAnimationFrame 节流方案；leading/trailing 参数
  10. 柯里化与偏函数；compose/reduce 实现函数管道
  11. ES Module 与 CommonJS 的加载/拷贝差异；循环依赖两者的表现
  12. WeakMap/WeakRef/FinalizationRegistry 的应用场景（缓存/监听器回收）
  13. Proxy vs Object.defineProperty：为什么 Vue3 用 Proxy；13 种 trap
  14. 拦截器/装饰器模式在 JS 中的实现；ES 装饰器提案现状
  15. BigInt/Number 精度：0.1+0.2、toFixed 银行家舍入、大数处理方案
  16. 事件委托原理 + 自定义事件 dispatchEvent；Passive 事件监听
  17. fetch vs XHR：AbortController、流式读取、keepalive
  18. Web Worker/SharedWorker/Service Worker 通信模型与适用场景
  19. 可观测性：Error 的分类捕获（window.onerror/unhandledrejection/SourceMap 还原）
  20. 惰性求值与短路；函数记忆化 memoize 实现
  21. 手写：instanceof / 类型判断 / 深比较 isEqual / 发布订阅 EventEmitter
  22. 手写：并发控制器（limit 并发数的请求调度器），AbortController 取消
- [ ] **Step 2: 格式自检**：`grep -n "{{" 文件` 确认匹配行均在围栏内；标题均有前后空行
- [ ] **Step 3: Commit**：`git add 该文件 && git commit -m "docs: 题库-js核心"`

### Task 2: 02-ts.md（TypeScript）

**Files:**
- Create: `docs/src/pages/interview/ms/题库/02-ts.md`

- [ ] **Step 1: 写入文件**，包含以下 16 题：
  1. ts 类型系统：结构化类型 vs 名义类型；TypeScript 是结构性类型语言意味着什么
  2. interface vs type 的 6 个差异点（声明合并/extends/映射/infer）
  3. 泛型：约束 extends、默认值、泛型类；手写 TypedEventEmitter
  4. 工具类型原理：手写 Partial/Required/Pick/Omit/Record/ReturnType
  5. 高级类型：手写 DeepReadonly / DeepPartial / Awaited / UnionToIntersection
  6. 条件类型与 infer：提取 Promise 返回值、数组元素、函数参数
  7. keyof/typeof/索引访问；as const 与字面量类型收窄
  8. 协变/逆变/双变：函数参数的严格模式检查；any vs unknown vs never
  9. 类型体操：TupleToUnion / LengthOfString / 递归类型与尾递归优化限制
  10. 类型收窄：判别联合、is 类型谓词、satisfies 关键字（4.9+）
  11. 装饰器与元数据：reflect-metadata；TS5 装饰器与实验性装饰器差异
  12. tsconfig 关键项：strict 全家桶、moduleResolution、paths、isolatedModules
  13. TS 编译流程：类型检查与转译分离；为什么 isolatedModules 影响打包器
  14. 类型声明文件：@types、declare、三斜线指令；为无类型的 JS 库补类型
  15. 性能：project references、类型检查慢的排查（tsc --diagnostics）
  16. 迁移实践：JS 项目渐进式迁移 TS 的策略（allowJs/检查等级/公共 API 先行）
- [ ] **Step 2: 格式自检**（同 Task 1 Step 2）
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-typescript"`

### Task 3: 03-html-dom.md（HTML/BOM/DOM）

- Create: `docs/src/pages/interview/ms/题库/03-html-dom.md`

- [ ] **Step 1: 写入文件**，包含以下 12 题：
  1. defer/async/module 脚本加载语义；preload/prefetch/preconnect/dns-prefetch
  2. DOM 树构建过程；文档片段 DocumentFragment 与批量插入优化
  3. 事件模型完整链路：捕获/目标/冒泡 + addEventListener 第三参数全解
  4. IntersectionObserver/MutationObserver/ResizeObserver 原理与场景
  5. 虚拟列表完整实现原理（滚动容器 + 可视区计算 + 缓冲区 + 占位高度）
  6. 语义化与可访问性：ARIA、tab 顺序、无障碍审计
  7. 表单：FormData、原生校验 API、File/Blob/FileReader/流式上传
  8. iframe 通信：postMessage 与目标Origin校验；Sandbox 属性
  9. history API 与 hash 路由原理；SPA 路由手写（监听 popstate）
  10. 剪贴板/通知/全屏/共享等 Web API 权限模型
  11. Canvas vs SVG 选型；高 DPI 适配；离屏渲染 OffscreenCanvas
  12. Web Component：Shadow DOM 隔离、custom element 生命周期
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-html-dom"`

### Task 4: 04-css.md（CSS）

- Create: `docs/src/pages/interview/ms/题库/04-css.md`

- [ ] **Step 1: 写入文件**，包含以下 16 题：
  1. BFC 原理、触发条件、应用（清浮动/防 margin 合并/自适应布局）
  2. 层叠上下文完整规则：z-index 生效条件、stacking level 比较链
  3. 盒模型：box-sizing、margin 合并规则、负 margin 行为
  4. flex 布局：flex:1 展开式、容器/项目全属性、常见塌陷问题
  5. grid 布局：显隐式网格、fr/minmax/auto-fill、子网格
  6. 定位方案：absolute 相对谁、sticky 失效原因、居中的 8 种方案
  7. 响应式：媒体查询、容器查询、clamp()/min()/vw 单位方案
  8. 移动端适配：rem/em/vw 方案对比、1px 问题、安全区 env()
  9. 动画性能：transform/opacity 为什么不触发重排；will-init 与合成层爆炸
  10. CSS 变量与主题切换：--var、@property、dark mode 策略
  11. 隔离方案：scoped/CT@keyframesBEM/CSS Modules/Tailwind/Shadow DOM 对比
  12. 预处理器与后处理器：Sass 原理、PostCSS 插件链、Lightning CSS
  13. 关键渲染路径中的 CSS：FOUC/FOUT、字体加载 font-display、preload 字体
  14. CSS 性能：选择器从右到左匹配、样式计算成本、contain 属性
  15. Houdini 与 @property 类型化自定义属性
  16. 大规模 CSS 架构：设计令牌、原子化权衡、样式体积治理
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-css"`

### Task 5: 05-browser.md（浏览器原理/性能/安全）

- Create: `docs/src/pages/interview/ms/题库/05-browser.md`

- [ ] **Step 1: 写入文件**，包含以下 16 题：
  1. 从输入 URL 到页面呈现完整过程（含 DNS/TCP/TLS/队列/渲染）
  2. 渲染流水线：DOM→CSSOM→Layout→Paint→Composite 各阶段职责
  3. 回流/重绘/合成的触发条件与优化；Performance 面板分析方法
  4. 强缓存/协商缓存：Expires/Age/Cache-Control/ETag/Last-Modified 优先级
  5. Core Web Vitals：LCP/INP/CLS 的定义、采集 API、优化手段
  6. 多进程架构：浏览器主进程/渲染进程/GPU 进程/网络服务进程分工；站点隔离
  7. V8 执行管线：解析→字节码→JIT 热点优化；Sparkplug/Maglev/TurboFan
  8. 内存泄漏排查：Heap Snapshot/Performance Monitor/WeakRef 追踪
  9. 安全：XSS 类型与防御（CSP/转义/trusted-types）、CSRF（SameSite/Token）
  10. 安全：点击劫持、原型污染、供应链攻击（SRI/integrity）
  11. 跨域：CORS 详细字段、预检触发条件、withCredentials、JSONP 原理
  12. 存储体系：Cookie 属性全解、localStorage/IndexedDB/Cache API 选型
  13. PWA：Service Worker 生命周期、缓存策略模式（stale-while-revalidate）
  14. 首屏优化体系化方案（7年经验视角：度量→归因→治理闭环）
  15. 长任务治理：requestIdleCallback、时间分片、INP 与 TBT
  16. 首屏秒开案例：SSR/预渲染/离线包/CDN 边缘渲染的选型权衡
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-浏览器"`

### Task 6: 06-http.md（HTTP/网络）

- Create: `docs/src/pages/interview/ms/题库/06-http.md`

- [ ] **Step 1: 写入文件**，包含以下 14 题：
  1. HTTP/1.1 vs HTTP/2 vs HTTP/3：队头阻塞、多路复用、QUIC 原理
  2. HTTPS 完整握手：TLS1.2 与 1.3 差异、证书链校验、会话复用
  3. GET/POST 语义差异；幂等性；幂等 API 设计原则
  4. 状态码全解：301/302/307/308、304 完整决策链、416/429/451
  5. TCP：三次握手/四次挥手、滑动窗口、拥塞控制与前端影响（慢启动）
  6. WebSocket：握手升级协议、心跳、粘包处理；对比 SSE/长轮询
  7. DNS 解析链路与缓存层级；HTTPDNS 解决什么问题
  8. CDN 原理：回源、边缘缓存、动态加速；命中率优化
  9. Cookie 与 Token 鉴权：JWT 结构/续期/注销难题、双 token 方案
  10. 跨域认证：SameSite 演进、第三方 Cookie 治理与替代方案
  11. 请求调度：并发限制、重试策略（指数退避/抖动）、超时设计
  12. 上传下载：分片上传、断点续传（Range/If-Match）、秒传（哈希）
  13. 网络层故障排查：DevTools/抓包/HAR 分析方法论
  14. 实时性与弱网：RTT 优化、HTTP/3 0-RTT、离线队列
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-http"`

### Task 7: 07-vue.md（Vue 框架）

- Create: `docs/src/pages/interview/ms/题库/07-vue.md`

- [ ] **Step 1: 写入文件**，包含以下 18 题：
  1. 响应式原理：Vue2 defineProperty vs Vue3 Proxy，依赖收集与触发链路
  2. 编译优化：静态提升、patchFlag、block tree；Vue3 快在哪
  3. diff 算法：双端 diff 与最长递增子序列；key 的作用与误区
  4. computed vs watch vs watchEffect：实现原理与懒执行调度
  5. nextTick 原理：微任务队列与批量更新机制
  6. 组件通信 10 种方式与选型；provide/inject 响应性陷阱
  7. 生命周期：选项式与组合式对照；setup 执行时机；keep-alive 钩子
  8. v-if vs v-show vs component is；渲染函数 h() 与 JSX
  9. ref vs reactive：深浅响应、toRefs/toRef/toRaw、解构丢失响应性
  10. 自定义渲染器 createRenderer；跨端渲染原理（如何渲染到 canvas/原生）
  11. Vue3 编译器架构：parse→transform→generate；手写 mini-compiler 思路
  12. 性能优化：v-memo、shallowRef、虚拟滚动、组件懒加载策略
  13. 状态管理：Pinia vs Vuex 架构差异、模块化、SSR 下的 store 序列化
  14. Vue Router：history vs hash 模式实现、导航守卫完整链、动态路由
  15. SSR/Nuxt：同构原理、hydration、Nuxt3 的 nitro 与混合渲染
  16. 微前端中 Vue 应用接入：Wujie/qiankun 样式与状态隔离、通信方案
  17. 源码级：scheduler 调度器实现（队列/优先级/flushJobs）
  18. 手写 mini-vue：响应式系统 + 编译器 + 渲染器的最小实现思路
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-vue"`

### Task 8: 08-react.md（React 框架）

- Create: `docs/src/pages/interview/ms/题库/08-react.md`

- [ ] **Step 1: 写入文件**，包含以下 14 题：
  1. Fiber 架构：链表结构、双缓冲、可中断渲染原理
  2. 生命周期与函数组件：class 三阶段 vs hooks 等价实现
  3. Hooks 原理：链表存储、闭包陷阱；useState/setState 批处理（18 自动批处理）
  4. useEffect vs useLayoutEffect vs useInsertionEffect 执行时机
  5. useMemo/useCallback/useRef 正确使用与性能误区（序列化 props 比较）
  6. 状态管理：Context 分片、Zustand/Jotai/Redux Toolkit 选型
  7. Concurrent 模式：时间切片、transition、useDeferredValue/startTransition
  8. Suspense 与流式 SSR（React 18/19 服务端组件 RSC 架构）
  9. 合成事件系统：事件委托到 root、与原生事件差异、优先级
  10. diff 与 key；受控/非受控组件；高阶组件 vs render props vs hooks
  11. React 19 新特性：Actions/useOptimistic/use、编译器 React Compiler
  12. Next.js：App Router/RSC/Server Actions、缓存分层
  13. 性能：React Profiler、重渲染归因、虚拟列表接入
  14. Vue 与 React 架构对比（P7 高频）：响应式 vs 不可变、模板 vs JSX、心智模型
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-react"`

### Task 9: 09-build.md（构建工具）

- Create: `docs/src/pages/interview/ms/题库/09-build.md`

- [ ] **Step 1: 写入文件**，包含以下 15 题：
  1. Webpack 构建流程：初始化→编译→输出；tapable 事件流
  2. Webpack 核心概念：module/chunk/bundle；chunk 分包（splitChunks）策略
  3. Loader 与 Plugin 区别与实现原理（手写 loader/plugin）
  4. Webpack 性能优化：cache、thread-loader、DLL 已废弃的原因、sourcemap 选型
  5. Tree-shaking 原理：ESM 静态分析、副作用标记 sideEffects；为什么 CJS 不行
  6. Vite 原理：dev 阶段 no-bundle（esbuild 预构建/按需转换）、HTTP 缓存协商
  7. Vite 生产构建为什么用 Rollup 而不是 esbuild； Rolldown 的定位
  8. 按需加载：import() 动态导入原理、分包边界、预加载策略
  9. SourceMap 原理与生产环境方案（防盗链、私有化映射、错误还原）
  10. esbuild/Swc/Babel 对比：AST 转换速度差异的原因（Go/Rust 单线程多协程）
  11. Babel 全链路：parse→transform→generate；polyfill vs transform-runtime
  12. Monorepo：pnpm workspace 原理（符号链接/虚拟store）、幽灵依赖治理
  13. 构建产物分析：bundle 分析、体积治理（公共依赖多版本收敛）
  14. 库开发：CJS/ESM/UMD 多格式产物、external、dual-package hazard
  15. 从 0 设计一套企业级构建体系（P7 案例题：构建提速 3 分钟→30 秒）
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-构建"`

### Task 10: 10-cicd.md（CI/CD 与工程化）

- Create: `docs/src/pages/interview/ms/题库/10-cicd.md`

- [ ] **Step 1: 写入文件**，包含以下 13 题：
  1. CI/CD 完整链路：lint→test→build→deploy；分支策略（trunk-based vs git flow）
  2. 前端部署方案：静态资源 CDN + index.html 分离、灰度发布、回滚机制
  3. Docker 化前端：多阶段构建、nginx 配置（gzip/缓存/ history 回退）
  4. 版本策略：semver、changesets、锁文件治理
  5. 代码质量体系：ESLint/Prettier/Stylelint/husky+lint-staged/CI 卡点
  6. 单元测试：Vitest/Jest 选型、组件测试、覆盖率指标合理性
  7. E2E 测试：Playwright vs Cypress、CI 中的稳定性治理（重试/flaky）
  8. 微前端：qiankun/Wujie/无界原理对比、沙箱实现（Proxy 快照）、通信
  9. 微前端落地难题：样式隔离、公共依赖、路由同步、部署独立化
  10. 研发效能度量：构建时长/MR 周期/部署频率；DORA 指标在前端的落地
  11. 环境体系：dev/test/staging/prod 的配置管理与特性开关
  12. npm 包发布流程：scope、.npmrc、2FA、私有 registry（Verdaccio）
  13. 设计一套前端监控平台的架构（P7 案例题：采集→传输→计算→告警）
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-cicd"`

### Task 11: 11-miniprogram.md（小程序/UniApp 跨端）

- Create: `docs/src/pages/interview/ms/题库/11-miniprogram.md`

- [ ] **Step 1: 写入文件**，包含以下 13 题：
  1. 微信小程序双线程架构：渲染层/逻辑层分离原因、通信桥
  2. setData 原理与性能：数据序列化传输、最小化更新策略、长列表优化
  3. 小程序生命周期：App/Page/Component 钩子与页面栈
  4. 自定义组件：properties/observers、behaviors、插槽与抽象节点
  5. 小程序分包：分包加载、独立分包、分包预下载；体积治理
  6. 小程序登录态：code2session 流程、token 存储与续期
  7. 小程序性能优化：首屏（数据预拉取/骨架屏）、渲染（wxs/虚拟列表）
  8. 小程序原理级：虚拟 DOM 树到 native 渲染、Skyline 框架
  9. UniApp 架构：编译到多端的原理（条件编译/语法转换）、vue3 运行时
  10. 跨端适配：样式单位、API 差异抹平、平台特性代码组织
  11. Taro 对比 UniApp：编译时 vs 运行时方案、React 语法支持原理
  12. 小程序与 H5 互跳、web-view 通信、鉴权共享
  13. 小程序线上问题排查：vConsole、真机调试、性能 trace
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-小程序"`

### Task 12: 12-client.md（客户端/跨端）

- Create: `docs/src/pages/interview/ms/题库/12-client.md`

- [ ] **Step 1: 写入文件**，包含以下 11 题：
  1. 跨端方案图谱：H5/混合/RN/Flutter/自绘引擎的渲染与通信模型对比
  2. Hybrid 容器：JSBridge 原理（URL scheme vs 注入对象）、桥协议设计
  3. 离线包机制：增量更新、双 buffer 切换、版本管理与兜底
  4. RN 原理：虚拟 DOM 到原生组件的映射、Fabric 渲染器、Hermes 引擎
  5. Flutter：Widget/Element/RenderObject 三棵树、Skia/Impeller 自绘
  6. Flutter 与前端技术栈结合：dart:js 互调、PlatformView 嵌 H5
  7. Electron 架构：主/渲染进程、IPC、上下文隔离、性能治理
  8. 桌面端实践：自动更新、崩溃收集、代码签名、安装包体积优化
  9. 跨端选型方法论（P7 案例题）：性能/成本/团队技能/生态五维评估
  10. 动态化方案：Lynx/动态模板/自研 DSL 的可行性边界
  11. 客户端容器演进：从 WebView 到自研容器的架构路径
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-客户端"`

### Task 13: 13-node.md（Node.js）

- Create: `docs/src/pages/interview/ms/题库/13-node.md`

- [ ] **Step 1: 写入文件**，包含以下 13 题：
  1. Node 事件循环六阶段：timers/poll/check 各阶段职责；与浏览器差异
  2. 微任务与 process.nextTick 优先级；setImmediate vs setTimeout 顺序
  3. Stream：四种流类型、背压 pipe 处理、大文件处理实践
  4. Buffer 原理与编码；Blob vs Buffer；共享内存
  5. 模块体系：CJS 加载缓存、ESM 顶层 await、双模块格式共存
  6. 多进程：child_process vs worker_threads vs cluster；进程守护 PM2
  7. 中间件原理：手写 Koa 洋葱模型（compose）；Koa vs Express
  8. BFF 层设计：聚合/裁剪/鉴权；GraphQL 与 REST 的选型
  9. SSR 服务：内存泄漏排查、进程管理、优雅退出、流量洪峰降级
  10. Node 性能：CPU profiling、V8 堆快照、事件循环延迟监控
  11. Nestjs/分层架构：DI/IoC、AOP、模块化组织大型服务
  12. 文件上传/导出大流量场景：流式处理、临时文件、限流
  13. 部署：Docker + pm2/K8s、健康检查、日志（pino）与链路追踪
- [ ] **Step 2: 格式自检**
- [ ] **Step 3: Commit**：`git commit -m "docs: 题库-node"`

### Task 14: 大纲.md 追加题库索引

**Files:**
- Modify: `docs/src/pages/interview/ms/大纲.md`（文件末尾追加）

- [ ] **Step 1: 末尾追加索引章节**：

```markdown
## 19 分主题题库（含详细答案）

- [01 JavaScript 核心](./题库/01-js.md)
- [02 TypeScript](./题库/02-ts.md)
- [03 HTML/DOM](./题库/03-html-dom.md)
- [04 CSS](./题库/04-css.md)
- [05 浏览器原理/性能/安全](./题库/05-browser.md)
- [06 HTTP/网络](./题库/06-http.md)
- [07 Vue](./题库/07-vue.md)
- [08 React](./题库/08-react.md)
- [09 构建工具](./题库/09-build.md)
- [10 CI/CD 与工程化](./题库/10-cicd.md)
- [11 小程序/UniApp](./题库/11-miniprogram.md)
- [12 客户端/跨端](./题库/12-client.md)
- [13 Node.js](./题库/13-node.md)
```

- [ ] **Step 2: Commit**：`git commit -m "docs: 大纲追加题库索引"`

### Task 15: 侧边栏配置 + 全量验证

**Files:**
- Modify: `docs/.vitepress/config.mjs`（"手写与面试"分组内，把 `面试题库` 单条改为子分组）

- [ ] **Step 1: 修改 config.mjs**：将 `{ text: '面试题库', link: '/pages/interview/ms/项目.md' }` 替换为：

```js
{
  text: '面试题库',
  items: [
    { text: '综合题库', link: '/pages/interview/ms/项目.md' },
    { text: 'JS', link: '/pages/interview/ms/题库/01-js.md' },
    { text: 'TS', link: '/pages/interview/ms/题库/02-ts.md' },
    { text: 'HTML/DOM', link: '/pages/interview/ms/题库/03-html-dom.md' },
    { text: 'CSS', link: '/pages/interview/ms/题库/04-css.md' },
    { text: '浏览器', link: '/pages/interview/ms/题库/05-browser.md' },
    { text: 'HTTP', link: '/pages/interview/ms/题库/06-http.md' },
    { text: 'Vue', link: '/pages/interview/ms/题库/07-vue.md' },
    { text: 'React', link: '/pages/interview/ms/题库/08-react.md' },
    { text: '构建', link: '/pages/interview/ms/题库/09-build.md' },
    { text: 'CI/CD', link: '/pages/interview/ms/题库/10-cicd.md' },
    { text: '小程序', link: '/pages/interview/ms/题库/11-miniprogram.md' },
    { text: '跨端', link: '/pages/interview/ms/题库/12-client.md' },
    { text: 'Node', link: '/pages/interview/ms/题库/13-node.md' },
  ],
  collapsed: true,
},
```

- [ ] **Step 2: 全量构建验证**

Run: `npm run docs:build`
Expected: exit 0，无 TypeError / RollupError

- [ ] **Step 3: 死链与文件覆盖校验**

Run: `find docs/src/pages/interview/ms/题库 -name "*.md" | wc -l`
Expected: 13

- [ ] **Step 4: Commit**：`git commit -m "feat: 面试题库扩充-13个主题"`

## Self-Review 结论

- 覆盖度：用户要求的 前端框架(Vue/React)、html、js、ts、css、浏览器、http、构建、ci/cd、小程序、客户端、node 共 12 个领域全部有对应 Task（Task 1-13），另加大纲索引与 sidebar（Task 14-15）✓
- 与既有内容的关系：`项目.md` 保留为综合题库，`大纲.md` 只追加索引不改动既有内容 ✓
- 无占位符：每题均为具体问题，答案按统一模板与深度要求编写 ✓
