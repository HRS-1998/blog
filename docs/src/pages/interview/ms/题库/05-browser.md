# 5 浏览器原理 / 性能 / 安全

浏览器原理、性能、安全高频题库：覆盖导航全链路、渲染流水线、缓存体系、Core Web Vitals、多进程架构、V8 管线、内存泄漏排查、XSS/CSRF/供应链安全、CORS、存储选型、PWA、长任务治理与首屏秒开案例，按 P6 体系化回答 + P7 深度权衡双层组织，对标 7 年经验的面试强度。

## Q：从输入 URL 到页面呈现的完整过程？（含 DNS/TCP/TLS/请求队列/渲染各阶段）

**核心答案**：这是一道体系题，考察的是把"网络栈 + 渲染管线 + 进程架构"串成一条时间线的能力。主线是：输入后先做 URL 规范化与 HSTS 检查，命中本地缓存直接返回；未命中则走 DNS 递归解析拿 IP，再建 TCP 三次握手、TLS 握手（HTTP/3 则是 QUIC 一次握手），请求从渲染进程经网络服务进程发出，收到响应后 HTML 字节流进入渲染流水线——DOM 解析、CSSOM 构建、样式计算、布局、绘制、分层、合成，同时 JS 在事件循环里驱动交互，直到触发 load 事件。7 年经验要能讲清每个阶段的"谁在做"（哪个进程/线程）、"失败会怎样"（降级/重试）、"优化埋点在哪"。

**知识点解析**：

- 阶段一：URL 解析与安全检查。地址栏输入后浏览器做规范化（补协议、补 host、处理 IDN 域名的 punycode 编码）；查 HSTS 列表，命中则强制 https；同源导航可能直接走前进/后退缓存（BFCache）恢复页面，零网络零渲染。

- 阶段二：缓存查找（强缓存优先于一切网络动作）。顺序大致是：Service Worker → 内存缓存 → 磁盘缓存 → DNS 缓存。命中 `Cache-Control: max-age` 未过期的资源直接使用，不发请求；`no-cache` 或过期则进入协商。

- 阶段三：DNS 解析。浏览器缓存 → OS 缓存（hosts）→ 本地 DNS 服务器递归查询（根 → 顶级域 → 权威服务器）。DNS 是 UDP 53 端口（报文大或响应不稳定时自动转 TCP/EDNS）。优化点：`dns-prefetch`/`preconnect`、HTTPDNS、DoH（DNS over HTTPS）。

- 阶段四：TCP 三次握手。SYN → SYN+ACK → ACK，1 个 RTT；TCP Slow Start 决定了新连接前几个包的拥塞窗口很小，这是"首包资源要小"的协议层原因。优化点：TCP Fast Open、连接复用（keep-alive）、HTTP/2 多路复用。

- 阶段五：TLS 握手。TLS 1.2 需要 2 个 RTT（ClientHello/ServerHello + 密钥交换），TLS 1.3 压缩到 1 个 RTT，会话恢复可 0-RTT。浏览器校验证书链到内置根 CA，同时校验域名匹配与有效期。优化点：TLS 1.3、OCSP Stapling、会话票据。

```text
DNS(UDP 1-RTT) → TCP(1-RTT) → TLS1.3(1-RTT) → HTTP(req+resp 至少 1-RTT)
首次访问冷连接 ≈ 4 个 RTT；HTTPS 域名 TTL 内复用可省到 1 个 RTT
```

- 阶段六：请求排队与进程分工。渲染进程自身不发网络包，通过 IPC 把请求交给浏览器进程的网络服务进程（Network Service）；HTTP/1.1 下同域名 6 个 TCP 连接排队，HTTP/2 在单连接上以流（stream）多路复用，但服务器端可能有自己的优先级调度与请求队列。响应经过网络进程 → IPC → 渲染进程的资源加载器交给 HTML 解析器。

- 阶段七：渲染。字节流 → 分词 → DOM 树（遇到同步脚本阻塞并执行，preload scanner 继续扫描发请求）；同时构建 CSSOM；两者就绪后做样式计算 → 布局树 → 绘制指令 → 分层 → 光栅化（GPU 进程配合）→ 合成帧上屏。这一步详细展开见下一题。

- 阶段八：可交互与事件时序。`DOMContentLoaded` 在 DOM 构建完触发，`load` 在所有资源（含图片）加载完触发，两者之间页面"能看未必能点"。现代指标看 LCP/INP，而不是 load。

```js
// 面试时主动给出埋点视角：用 Performance API 把链路拆成可量化指标
const [nav] = performance.getEntriesByType('navigation');
nav.domainLookupEnd - nav.domainLookupStart; // DNS 耗时
nav.connectEnd - nav.secureConnectionStart;  // TLS 耗时
nav.responseStart - nav.requestStart;        // 服务器响应
nav.domContentLoadedEventEnd;                // DCL
nav.loadEventStart;                          // load
```

**加分项（P7 视角）**：

- 协议层对比：HTTP/2 解决队头阻塞（HTTP 层）但 TCP 层丢包重传仍会阻塞所有流；HTTP/3 改用 QUIC over UDP，流之间独立、0-RTT 建连、连接迁移（切 Wi-Fi/5G 不断链）——能主动讲出"为什么大厂在推 H3 + 0-RTT"是协议层的加分点。
- 事故视角：线上出现过 DNS 解析失败导致白屏（第三方权威 DNS 抖动），解法是 HTTPDNS + 页面兜底静态化；TLS 握手慢可用 SSL Labs 排查证书链不全（多一级验证多一个 RTT），这是真实容量与故障考量。
- 渲染层陷阱：BFCache 会在某些场景失效（beforeunload 监听器、打开的 IndexedDB 连接），秒开方案要考虑导航恢复而非只有网络优化；讲出"从 load 时间转向以用户感知指标度量"说明做过体系升级。

## Q：渲染流水线：DOM→CSSOM→Layout→Paint→Composite 各阶段职责是什么？

**核心答案**：流水线是"解析（Parse）→ 样式（Style）→ 布局（Layout）→ 绘制（Paint）→ 合成（Composite）"五个阶段。Parse 阶段把 HTML/CSS 字节流解析成 DOM 树和 CSSOM 树；Style 阶段为每个 DOM 节点匹配选择器、计算最终样式，生成带样式的布局树（Render Tree）；Layout 计算每个盒子的几何信息（位置、大小），递归产出 Box Tree；Paint 把布局结果转成一系列绘制指令（paint records），并做分层决策；Composite 将各图层的光栅化结果按合成顺序在合成器线程上合成为最终帧，交 GPU 上屏。关键理解：布局在主线程、光栅化可在光栅线程/GPU、合成在合成器线程，所以 transform/opacity 动画能完全绕开主线程。

**知识点解析**：

- 各阶段输入输出链：

```text
HTML 字节流 --HTML 解析器--> DOM 树
CSS 字节流  --CSS 解析器--> CSSOM 树
DOM + CSSOM --样式计算--> 布局树（Layout Tree，含 computed style）
布局树 --Layout--> 几何信息（Box Tree，每个盒子的 x/y/width/height）
布局树 --Paint--> 绘制操作列表（Paint Ops）+ 分层决策（Layer Tree）
Layer Tree --光栅化--> 瓦片（tiles，GPU 内存里的位图）
tiles --Composite--> 合成帧（cc 层提交，vsync 上屏）
```

- DOM 与 CSSOM 的"构造顺序问题"：CSSOM 构建会阻塞渲染（render blocking），但不阻塞 DOM 解析；同步脚本会阻塞 DOM 解析，且脚本执行前必须等 CSSOM 就绪（因为 JS 可能读取样式）——这是"CSS 放头、JS 放尾/defer"建议的底层原因。
- Style 阶段成本：选择器匹配是从右往左，引擎按 id/class/tag 建倒排索引加速；样式继承与层叠在这一步合并。大型样式表的成本主要在匹配与级联，而不是选择器长度本身。
- Layout 阶段的脏标记：只有 dirty 的子树会重新布局（增量布局），但像窗口 resize、字体加载完成这类全局事件会让整棵树失效——"改一个元素高度为什么全页回流"常被面试官追问，答案是取决于失效传播范围。
- Paint 阶段只记录"怎么画"，真正的像素生成在光栅化：优先用 GPU 光栅（ accelerated rasterization），大层被切成瓦片按可视优先级光栅化，所以"看哪画哪、边滚边画"是常态。
- Composite 阶段：合成器线程独立于主线程，只要合成层不变，滚动就能 60fps；`will-change: transform`、3D transform 提升合成层后，动画只改 transform，跳过 Layout/Paint。

```js
// 三种改动对应的三种代价（面试高频对比）
el.style.width = '100px';  // Layout(回流) → Paint → Composite，代价最大
el.style.background = 'red'; // 跳过 Layout：Paint → Composite
el.style.transform = 'translateX(10px)'; // 跳过 Layout/Paint：仅 Composite
```

**加分项（P7 视角）**：

- 引擎术语纠正：Chrome（Blink）实际流水线是 Parse → Style → Layout → Paint Invalidaton → Composite Assignments，渲染树概念已被"布局树 + 绘制属性树（paint property tree：transform/clip/effect）"替代；重绘不再直接画像素而是产出 display list diff，能讲到属性树说明读过现代渲染架构。
- 合成层的边界膨胀（layer explosion）：无脑 `will-change` 会造成每个元素一张 GPU 纹理，内存暴涨导致低端机闪退；真实经验是"只在动画前 100ms 加、动画后移除"，并用 Layers 面板查看层大小与内存。
- 性能预算：60fps 下每帧 16.67ms，Layout 通常 1-4ms、Paint 视面积而定，超过 10ms 的单帧要拿 trace 分析；能主动讲"用 RAIL 模型划分响应/动画/空闲预算"是体系化加分。

## Q：回流/重绘/合成的触发条件与优化？Performance 面板如何分析？

**核心答案**：回流（Layout）的触发条件是"几何信息或影响布局的样式变更"：窗口 resize、字体变化、增删 DOM、读 offsetTop/getComputedStyle 这类强制同步布局；重绘（Paint）的触发是"只改视觉不影响几何"的样式（color/background/box-shadow）；合成只发生在改动 transform/opacity 且元素已提升为合成层时。优化核心是三点：读写分离避免强制同步布局、用 transform/opacity 替代几何动画、用 CSS containment 隔离失效传播。Performance 面板分析看四条泳道：Main（主线程火焰图找长任务）、GPU/Compositor（合成是否在主线程外）、Frames（掉帧与帧耗时）、Interactions/Locations 定位到具体函数调用栈。

**知识点解析**：

- 触发条件分类：

```text
回流：resize、字体加载、增删/移动 DOM、改 width/height/padding/position、读 offset*/scroll*/client*、getComputedStyle
重绘：改 color/background-color/visibility/box-shadow/border-color（不影响几何）
合成：改 transform（translate/scale/rotate）/opacity，且元素已在独立合成层
```

- 强制同步布局（Layout Thrashing）是最高频考点：一帧内"写-读-写-读"交替，每次读都迫使浏览器同步执行未完成的布局。

```js
// 反例：读写交替，N 个元素 = N 次同步回流
els.forEach((el) => {
  const h = el.offsetHeight;      // 读：强制同步布局
  el.style.height = h + 10 + 'px'; // 写：布局失效
});

// 正例：先批量读、再批量写，只触发一次回流
const heights = els.map((el) => el.offsetHeight);
els.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';
});
```

- CSS containment 隔离：`contain: layout paint` 让子树布局变化不向外传播，长列表每项加 `contain: content` 能把单条更新限制在卡片内部；`content-visibility: auto` 让屏幕外内容跳过渲染，虚拟列表的"CSS 原生版"。
- 动画优化铁律：位置用 `translate`、显隐用 `opacity`、避免在动画里读布局属性；`will-change` 提前提升合成层，但要复用和及时回收。

- Performance 面板实操步骤：

  1. 开启 Screenshots 和 CPU 4x slowdown（模拟低端机，否则本机看不到问题）
  2. 录制操作 → 停止 → 看 Frames 泳道红色掉帧位置
  3. Main 泳道横向超长的任务即长任务；点开后自下而上读火焰图，紫色（Layout）绿色（Paint）占比即瓶颈
  4. 勾选 Rendering 面板的 Layout Shift Regions / Paint flashing 做可视化验证
  5. Bottom-Up + Call Tree 按 Total/ Self 排序定位到具体函数

**加分项（P7 视角）**：

- 深度区分：回流后不一定立即重绘，浏览器会把布局失效和绘制失效都记到帧边界统一处理（帧生命周期内的批处理），所以"改 100 个样式赋值 100 次"在多数场景只有一次回流——真正致命的是读写交替造成的同步布局，这个认知纠偏能体现深度。
- 源码/规范层：`containment` 与 `content-visibility` 定义在 CSS Containment Module，浏览器还实现了 anchor positioning 时代的 layout invalidation 细化；能提到 Blink 的 LayoutNG 重写后增量布局性能显著优于旧 Layout 引擎是加分点。
- 监控体系：实验室（Lighthouse CI 卡阈值）+ 线上（PerformanceObserver 采 longtask/layout-shift 上报）双轨，长任务归因用 `longtasks` + `attribution`（LoAF，Long Animation Frames API）拿到罪魁函数名——把"截图工具"上升成"线上诊断系统"是 P7 期待。

## Q：强缓存、协商缓存机制？Expires/Cache-Control/ETag/Last-Modified 优先级？

**核心答案**：缓存分两级。强缓存：缓存未过期时浏览器直接使用本地副本、不发任何请求，由 `Cache-Control: max-age` 控制（优先级高于 `Expires`）；协商缓存：缓存过期或标记 `no-cache` 后，浏览器带验证字段（`If-None-Match` 对应 `ETag`、`If-Modified-Since` 对应 `Last-Modified`）发起条件请求，服务器资源未变则返回 304 无 body，变了返回 200 全量。优先级：`Cache-Control` > `Expires`；`ETag` > `Last-Modified`。工程上的黄金组合是：HTML 用 `no-cache` 走协商保新鲜，带 hash 的静态资源用 `max-age=31536000, immutable` 永久强缓存。

**知识点解析**：

- 强缓存与协商缓存的完整判定流程：

```text
请求资源 → 有缓存？
  ├─ 无 → 正常请求 200
  ├─ 有 → Cache-Control/Expires 未过期？→ 是 → 200 (from disk/memory cache)，零请求
  │        └─ 否/带 no-cache → 发条件请求
  │             ├─ ETag 存在 → 带 If-None-Match: <etag>
  │             └─ 否则 Last-Modified → 带 If-Modified-Since: <time>
  │                  ├─ 资源未变 → 304（只传头，不传 body）
  │                  └─ 资源变了 → 200 + 新资源 + 新验证字段
```

- 两大验证字段对比：`Last-Modified` 只精确到秒、且"内容没变但修改时间变了"（重新部署 touch 文件）会误判变更；`ETag` 是内容指纹（通常是 mtime+size 或内容 hash），精确但服务器要为每个资源计算维护。所以规范规定同时存在时 ETag 优先。

- 强缓存响应头标准写法：

```http
# HTML：不缓存死，每次协商
Cache-Control: no-cache

# 带 hash 的静态资源：一年强缓存 + immutable（浏览器连重新验证都不发）
Cache-Control: public, max-age=31536000, immutable

# 需要重新验证的接口数据
Cache-Control: no-store            # 敏感数据，彻底不落盘
Cache-Control: max-age=0, must-revalidate  # 立即过期且必须回源
```

- 优先级与覆盖关系：`Cache-Control` 中 `max-age` 覆盖 `Expires`；`no-store` 优先级最高（连缓存都不存，谈何协商）；`no-cache` 不是"不缓存"而是"缓存了但每次必须协商"，这个命名是著名面试陷阱。
- 启发式缓存：响应既没有 `Cache-Control` 也没有 `Expires` 时，浏览器会取 `(Date - Last-Modified) * 10%` 作为缓存时长——这就是"没配缓存头的资源也能命中缓存"的原因，也是事故来源。
- 存储位置：内存缓存（memory cache）存当前会话高频小资源（渲染进程内存，关标签页即失），磁盘缓存（disk cache）持久化并遵循上述策略；Chrome DevTools 里 from memory/disk cache 的区别本质是"存哪、活多久"。
- 部署配合：文件名带内容 hash 是整套策略的前提——hash 变了 URL 就变，天然绕过旧缓存；HTML 引用新 hash 文件实现"秒级生效"。只改内容不改文件名 + 长强缓存 = 用户永远看不到更新，这是真实事故高频题。

**加分项（P7 视角）**：

- 边缘与源站分层：`s-maxage`（共享缓存如 CDN 的有效期）与 `max-age`（浏览器）分开设置，配合 `stale-while-revalidate` / `stale-if-error` 让 CDN 过期后先回旧内容再异步刷新——能讲 CDN 命中率、回源率、cache-control 分层治理是架构加分。
- 移动端与弱网：`immutable` 的由来是 Facebook 推动浏览器厂商支持——刷新（F5）会对 max-age 资源重新协商、强制刷新（Ctrl+F5）全部绕过缓存，immutable 让普通刷新也不发请求；移动 WebView 有自己的 HTTP 缓存目录配额，LRU 淘汰策略由实现决定。
- 事故复盘话术：一次"发版后部分用户白屏"排查——Nginx 对 index.html 误配了 `max-age=86400`，用户拿到旧 HTML 请求已删除的旧 hash JS 得 404；治理动作是 HTML 强制 no-cache + 接入 CI 校验响应头 + 灰度期间保留旧版本资源（回滚友好）。能完整讲出"现象→根因→机制→治理"闭环是 P7 信号。

## Q：Core Web Vitals：LCP/INP/CLS 的定义、采集 API、优化手段？

**核心答案**：Core Web Vitals 是 Google 定义的用户体验核心指标三件套。LCP（Largest Contentful Paint，最大内容绘制）度量加载体验，视口内最大图片/文本块完成渲染的时间，好的标准 ≤ 2.5s；INP（Interaction to Next Paint，交互到下次绘制）在 2024 年 3 月取代 FID 度量交互响应，取页面所有交互中接近最差的那次（去掉最差一次取次差，近似 p98）从输入到下一帧绘制的时长，好 ≤ 200ms；CLS（Cumulative Layout Shift，累积布局偏移）度量视觉稳定性，统计所有"意外偏移"分数（影响区域占比 × 移动距离占比）之和，好 ≤ 0.1。三者都通过 PerformanceObserver 采集，配合 web-vitals 官方库在真实用户环境（RUM）上报。

**知识点解析**：

- LCP 采集：

```js
// web-vitals 官方库（内部基于 PerformanceObserver + buffered 属性拿历史条目）
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log); // { name: 'LCP', value: 1234, rating: 'good' }

// 原生等价写法
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1]; // 取最后一次（可能被更大元素替换）
  console.log('LCP', last.startTime, last.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

- LCP 优化手段：识别 LCP 元素（preload / `fetchpriority="high"`）；LCP 图片不要 lazy loading；首屏关键 CSS 内联、其余 defer；去掉阻塞渲染的同步脚本；CDN 边缘节点 + HTTP/2/3 提前传输；SSR/流式传输让 HTML 早到。LCP 子阶段分解：TTFB（服务器慢）→ 资源加载延迟（发现慢）→ 资源加载时长（传输慢）→ 渲染延迟（被 JS/CSS 阻塞），用 `lcpElement` + 各阶段差值定位瓶颈在哪段。
- INP 采集与优化：观测 `event` 类型条目的 `startTime` 与下一帧渲染的差值。优化手段：拆长任务（见长任务治理题）、事件回调里只做最小工作重活交给 idle/worker、避免过大的渲染更新、输入处理标记 `passive`、拆分点击到响应的逻辑用 `requestAnimationFrame` 收敛到一次绘制。

```js
// 手动理解 INP 的原理：交互延迟 = 事件处理 + 后续渲染阻塞
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.interactionId / processingStart / duration
    console.log(entry.name, entry.duration, entry.interactionType);
  }
}).observe({ type: 'event', buffered: true });
```

- CLS 采集：`layout-shift` 条目，`value = impactFraction * distanceFraction`，且仅当无 `hadRecentInput`（用户输入后 500ms 内的偏移不算）时累加。

```js
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });
```

- CLS 优化手段：图片/视频/广告位写死 width/height 或 aspect-ratio；字体用 `font-display: optional/swap` + preload，避免 FOUT 造成的位移；动态内容插入用占位；不要在已有内容上方注入（Toast 覆盖式而非挤压式）；骨架屏维持最终布局。
- 指标口径：实验室数据（Lighthouse，模拟环境）看趋势，现场数据（CrUX / 自建 RUM）才是 Google 排名采用的数据源——两者经常打架（实验室 CDN 未命中、无真实缓存），P6 要知道差异，P7 要能解释为什么。

**加分项（P7 视角）**：

- 口径演进史：FID 只测"首次交互的输入延迟"且不含处理与渲染时间，游戏化空间大（首屏无交互就能拿满分），INP 覆盖全生命周期所有交互、取 p98 附近值，直接把长任务治理从"可选"变"必选"——能讲清这次替换的动机说明持续跟进标准演进。
- 数据体系建设：RUM 采样上报按 `deviceType/netType/路由` 维度聚合，p75 为合格口径（CWV 官方阈值按 p75 达标）；配私有大盘 + 告警（某版本 INP p75 突增回滚）、与 SEO 流量联动归因（CWV 是排名信号）——把指标做成业务语言是加分点。
- 陷阱认知：SPA 路由切换后 LCP 不重置（口径是整页生命周期），所以 SPA 要按路由自定义"虚拟页面"采集；INP 在低端机的中位数为高端机的 2-4 倍，实验室必须 4x CPU throttle 且真机校准。

## Q：浏览器的多进程架构：主进程/渲染进程/GPU 进程/网络服务进程如何分工？什么是站点隔离？

**核心答案**：现代 Chrome 是"浏览器主进程（Browser Process）+ 每标签页渲染进程（Renderer）+ GPU 进程 + 若干工具进程（网络服务 Network Service、存储 Storage Service、音频、设备等）"的架构。主进程负责地址栏、书签、前进后退与进程间调度仲裁；渲染进程跑 Blink + V8，负责 DOM/布局/JS 执行，运行在沙箱里没有直接磁盘/网络权限；网络与磁盘 IO 都通过 IPC 委托给主进程的工具进程；GPU 进程统一接收各渲染进程的合成帧与 WebGL 命令，转换为 GPU 调用。站点隔离（Site Isolation）进一步保证"每个站点（scheme + 注册域 eTLD+1）一个渲染进程"，跨站 iframe 用 OOPIF（out-of-process iframe）拆出去，使恶意站点无法与其它站点共享同一进程地址空间。

**知识点解析**：

- 各进程职责表：

```text
浏览器主进程   UI/标签管理/权限弹窗/进程仲裁，唯一直接持有系统能力的"管家"
渲染进程      每站点实例一个：Blink 排版 + V8 执行，沙箱内无网络/文件/输入设备权限
GPU 进程      所有渲染进程共享一个：光栅化/合成/WebGL 命令，避免 GPU 上下文争抢
网络服务进程  实际发网络请求、管连接池/缓存（磁盘缓存也在此）
存储服务进程  IndexedDB/Cookies/LocalStorage 等持久化统一管理
工具进程      音频服务、设备、扩展（部分独立崩溃域）
```

- 为什么多进程：三重收益——稳定性（一个标签页崩溃只丢一个进程）、安全（渲染进程被攻破也拿不到系统能力，沙箱最小权限）、性能/公平（进程级资源隔离避免一个页面拖死全部，也支持并行）。
- 沙箱的实现：渲染进程的系统调用都被代理到主进程审计，文件/网络/设备访问必须走 IPC 白名单；所以渲染进程里的网络请求是"渲染进程 → IPC → 网络服务进程"的真实路径——这解释了 Q1 中的请求排队发生在哪。
- 站点隔离细节：隔离单位是 site（eTLD+1），不是 origin——`a.example.com` 与 `b.example.com` 同 site 可同进程，但 `github.io` 不同用户仓库是跨站（eTLD+1 含公开后缀）；同源策略是"页面内 JS 无法读取跨源数据"，进程隔离把边界下沉到操作系统层，即使渲染引擎被 RCE 攻破（如幽灵/熔断类旁路攻击）也难以跨站窃取 cookie。
- 进程数量权衡：每个进程固定开销（V8 isolate、Blink 对象）约几十 MB，低端机内存吃紧，Chrome 有进程合并策略（同一 site 多个标签可共享一个渲染进程的 site instance），手机上甚至退化为单渲染进程多站点。

**加分项（P7 视角）**：

- 演进史与动机：Chrome 2008 年以多进程起家（对标单进程 Firefox 的崩溃问题），2008-2018 站点隔离因内存成本不敢全量，2018 年 Spectre/Meltdown 旁路攻击（高精度计时器跨进程读缓存）让"同源策略的软件边界"不够可信，Chrome 在桌面端全量开启站点隔离并在 2024 年前后推进手机端（按内存阈值）——把安全事件与架构演进关联是典型 P7 叙事。
- 与前端工程的连接：Web Worker/SharedArrayBuffer 曾因 Spectre 被限制（跨域隔离 COOP/COEP 要求），要启用 SAB 做多线程音视频处理必须配 `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`——这是架构决策直接落到业务配置的例子。
- 容量视角：Electron 应用卡顿排查时发现每 BrowserWindow 一个渲染进程 + 主进程职责过载（同步 IPC 打满），治理是窗口复用、代理对象合并、重活下沉 UtilityProcess——能把浏览器架构知识用到客户端/微前端（iframe 隔离 vs 微应用沙箱的进程/上下文对比）是横向加分。

## Q：V8 执行管线：解析→字节码→JIT 热点优化？Sparkplug/Maglev/TurboFan 分别是什么？

**核心答案**：V8 的执行管线是"解析 → 字节码解释执行（Ignition）→ 分层 JIT 编译"。Parser 先做懒解析（函数体先预解析、真正调用时才全量解析）产出 AST；Ignition 把 AST 编译为字节码并在解释器中运行，同时通过内联缓存（IC）收集类型反馈；同一函数变"热"后逐级升级：Sparkplug（基线编译器）把字节码快速编译为未优化机器码，比解释执行快且编译代价低；更热时进入 Maglev（中端编译器）利用类型反馈生成部分优化的机器码，比 Sparkplug 快 10-20%；最热的函数交给 TurboFan 基于推测做深度优化（内联、逃逸分析、去虚拟化），收益最大但假设被打破会触发反优化（Deopt）回退到 Ignition。层级越深编译越慢，所以 V8 的设计是"用空间换台阶"。

**知识点解析**：

- 管线全景：

```text
源码
 ├─ Parser（全量解析）──→ AST
 └─ PreParser（懒解析：函数体只看结构不生成 AST，跳过成本低）
AST → Ignition（字节码生成 + 解释执行，含 Inline Cache 收集类型反馈）
      │ 函数调用次数/回边计数达到阈值（分层触发）
      ├─ 热度低 → Sparkplug（Baseline，2021）：字节码→机器码一一对应，编译快、执行比解释快
      ├─ 更热   → Maglev（Mid-tier，2023）：利用 IC 反馈做单态假设的半优化
      └─ 最热   → TurboFan（Top-tier，Sea of Nodes IR）：深度优化 + 推测执行
任何一层的假设被打破 → Deopt → 回到 Ignition（丢失优化状态，重新攒热度）
```

- 隐藏类（Hidden Class / Map）：V8 给相同形状的对象共享隐藏类，属性访问按"类 + offset"偏移完成；动态增删属性、参数形状变化会让对象切换 Map、IC 退化为 megamorphic（查哈希表），性能掉一个量级——这就是"构造函数初始化全部字段、保持参数形状稳定"的底层原因。

```js
// 单态（monomorphic）：IC 命中，快
function getX(p) { return p.x; }
const a = { x: 1, y: 2 };
// 多态（polymorphic）到超态（megamorphic）：IC 失效
const b = { y: 2, x: 1 };  // 形状不同
const c = { x: 1, z: 3 };  // 又不同
```

- 类型反馈与推测优化：TurboFan 依据 IC 里"这个加法一直是两个小整数"的观察，直接编译为 int32 加法并假设不会溢出；一旦来个字符串拼接，假设被打破触发 Deopt，函数回到字节码并把该位点标记为多态。频繁 Deopt 会出现"优化-反优化抖动"，性能比不优化还差。
- 三层编译器的定位对比：Ignition 负责冷启动（启动快、内存省）；Sparkplug 解决"中等热度函数不值得 TurboFan 重编译"的空档；Maglev 是 Sparkplug 与 TurboFan 间的性价比层，特别改善真实站点中大量"温热"函数；TurboFan 负责热点极致性能。能讲出"分层是为了摊平编译开销与收益曲线"即抓住本质。
- 数组与元素类型：V8 数组按元素类型分 Packing（PACKED_SMI → PACKED_DOUBLE → PACKED_ELEMENTS），一旦混入非数值就永久降到通用模式且不可逆。

**加分项（P7 视角）**：

- 工具链应用：`node --trace-opt/--trace-deopt` 看优化与反优化，`--print-bytecode` 看字节码，Chrome Coverage 面板的字节码覆盖率指导代码分割（未执行代码不该进首屏 bundle）——把 V8 管线转化为首屏体积治理手段是体系加分。
- GC 视角（Orinoco）：分代（新生代 Scavenger 复制算法 / 老年代标记-清除-整理 Mark-Sweep-Compact）、并行/并发/增量三种手段降低停顿；大对象直接进大对象空间，闭包持有大对象是泄漏与 GC 抖动的双重来源，见内存泄漏题。
- 框架映射：Vue 3 / Solid 的"编译时优化"思路正是把运行时的多态与动态分发尽量在编译期消解（静态提升、patchFlag、信号细粒度更新），减少 TurboFan 需要的投机；能对比 React 运行时调度与编译时框架在 V8 层面的成本结构，是跨栈深度。

## Q：内存泄漏如何排查？Heap Snapshot/Performance Monitor/WeakRef 追踪方法？

**核心答案**：内存泄漏的工程定义是"不再需要的对象仍被引用，GC 无法回收，堆随时间单调上涨"。前端高频来源：未解绑的事件监听/定时器、闭包意外持有大对象（缓存无上限、闭包捕获整个组件作用域）、全局变量（尤其未声明直接赋值）、游离 DOM（节点从文档移除但 JS 仍持有引用）、Map/Set 做缓存永不清理、Canvas/离屏资源不释放。排查三板斧：Performance Monitor 看实时 JS Heap 趋势定位"是否泄漏"；Heap Snapshot 三次快照对比法定位"泄漏对象的保留链（Retainers）"；Allocation Timeline / instrumentation 捕获"谁在持续分配"。治理手段是弱引用：用 WeakMap/WeakSet 做对象级缓存、用 WeakRef + FinalizationRegistry 做可回收的缓存与资源兜底。

**知识点解析**：

- 高频泄漏场景代码化：

```js
// 1. 定时器与监听器未清理（SPA 组件卸载后仍持有闭包）
function mount() {
  const bigData = new Array(1e6).fill('x');
  const timer = setInterval(() => render(bigData), 1000);
  window.addEventListener('resize', () => console.log(bigData.length));
  // 卸载时未 clearInterval / removeEventListener → bigData 永不可达回收
}

// 2. 游离 DOM：节点 remove 了，但对象池仍引用
const cache = [];
function removeCard(el) {
  el.remove();        // 只脱离文档
  cache.push(el);     // DOM 节点仍被 JS 持有 → detached DOM 泄漏
}

// 3. 无上限缓存：Map 永不淘汰（应换 WeakMap 或 LRU）
const userCache = new Map();
function getUser(id) {
  if (!userCache.has(id)) userCache.set(id, loadUser(id));
  return userCache.get(id);
}
```

- Heap Snapshot 三次快照法（标准流程）：

  1. 操作前拍快照 1；执行可疑操作（如打开-关闭弹窗 5 次）；拍快照 2；重复操作 5 次；拍快照 3
  2. 在快照 3 选"Objects allocated between Snapshot 1 and Snapshot 2"
  3. 按 Retained Size 降序，找 Delta 不为零且数量递增的构造器（如 Detached HTMLDivElement、ArrayBuffer）
  4. 展开对象看 Retainers 保留链，链上第一个"业务可控"的引用就是泄漏点

- Performance Monitor 快速验证：打开 DevTools → More Tools → Performance Monitor，观察 JS Heap Size 与 DOM Nodes 两条曲线——反复"进入-退出"某页面，若曲线阶梯式上涨不回落即是泄漏；DOM Nodes 涨说明游离 DOM，JS Heap 涨配合 Snapshot 定位。Chrome 任务管理器（Shift+Esc）看单进程内存适合判断量级与是否 GPU 内存。
- WeakRef 正确姿势：

```js
// WeakMap：键是对象，键没了整个条目可被回收（注意：值不能反向强引用键）
const meta = new WeakMap();
meta.set(domNode, { listeners: [], state: {} }); // domNode 移除后条目自动可回收

// WeakRef + FinalizationRegistry：可被回收的缓存 + 回收时兜底清理
const cache = new Map();
const registry = new FinalizationRegistry((key) => {
  const ref = cache.get(key);
  if (ref && !ref.deref()) cache.delete(key); // 目标已回收则清掉条目
});

function cacheUser(key, user) {
  cache.set(key, new WeakRef(user));
  registry.register(user, key);
}

// 注意：WeakRef.deref() 的结果不稳定，不能用于关键业务逻辑；
// FinalizationRegistry 回调时机由 GC 决定，只做"最终兜底"不做正确性依赖
```

- 监控与自动化：线上用 `performance.memory.usedJSHeapSize`（Chrome 私有，趋势可用）+ 定期采样上报；测试环境用 Puppeteer 跑"操作 N 轮 → 强制 GC（--expose-gc）→ 比对堆大小"做成 CI 泄漏门禁。

**加分项（P7 视角）**：

- 语义辨析：泄漏（leak，不可达但被引用）vs 内存膨胀（bloat，可达但设计过大，如一次拉 10 万条数据全量渲染）vs 碎片/停顿（GC 抖动，帧预算被 GC 占用）；三者排查路径完全不同（Snapshot / 数据流与虚拟化设计 / Allocation profile），先分类再动手是 P7 素质。
- 深度机制：Minor GC 用半空间复制（Scavenger，存活对象少时极快），两次存活晋升老年代；WeakRef/WeakMap 的可回收性依赖"未被标记为强可达"的标记阶段判定，所以 WeakMap 条目回收发生在下次 Major GC；讲出这些能接住"为什么 WeakMap 立即删不掉"的追问。
- 真实案例话术：管理后台跑一天必崩 → Performance Monitor 锁定弹窗组件 → Snapshot 发现全局事件总线（mitt）未 off、监听闭包捕获整个组件实例 → 治理：onUnmounted 自动解绑（封装 useEventListener/useInterval）+ lint 规则禁止裸 addEventListener + CI 泄漏门禁；量化收益：8 小时堆增长从 1.2GB 降到 60MB。

## Q：XSS 的类型与防御（CSP/转义/trusted-types）？CSRF 如何防御（SameSite/Token）？

**核心答案**：XSS 是"攻击者代码注入到我的页面执行"，按注入途径分存储型（入库后渲染时执行）、反射型（URL 参数回显执行）、DOM 型（前端自身 API 如 innerHTML/eval 把不可信数据当代码执行）三类。防御纵深：输出按上下文转义（HTML/属性/JS/URL 各不同）、输入净化用 DOMPurify 而非自写正则、CSP 收敛脚本来源（nonce/strict-dynamic）、Trusted Types 从 API 层面禁止不安全注入、HttpOnly 保护会话 cookie。CSRF 则是"恶意站点借用户身份向我的站点发请求"，利用的是 cookie 会自动附带；防御组合是 SameSite 属性（默认 Lax 已挡大部分）、CSRF Token（服务端下发、请求携带并校验）、校验 Origin/Referer、敏感操作二次验证。

**知识点解析**：

- XSS 三类型与关键差异：

```text
存储型：payload 存进数据库 → 任何访问者渲染时执行（评论区、个人简介）——危害最大
反射型：payload 在请求参数里 → 服务端原样拼回 HTML（搜索词回显）——需要诱导点击
DOM 型：  不经过服务器，前端 JS 自己把不可信数据写入危险 sink（innerHTML/document.write/eval）
```

- 按上下文转义是核心：HTML 上下文转 `&lt;`，JS 上下文要防 `</script>` 闭合（HTML 解析优先于 JS），URL 上下文要防 `javascript:` 伪协议；只做全局 escapeHTML 挡不住属性注入（引号闭合）和 JS 注入。

```js
// DOM 净化的正确姿势：DOMPurify（白名单解析而非正则黑名单，能防 mXSS 变异攻击）
import DOMPurify from 'dompurify';
el.innerHTML = DOMPurify.render(dirtyHtml); // 白名单标签/属性/协议

// 危险 sink 清单（CSP 与 Trusted Types 的核心防护对象）
// innerHTML / outerHTML / insertAdjacentHTML / document.write / eval /
// new Function / setTimeout(string) / location.href = untrusted / a.href = untrusted
```

- CSP 三代演进：

```http
# 1.0 白名单（易被打穿：JSONP 端点、angular 模板注入等绕过）
Content-Security-Policy: script-src 'self' https://cdn.example.com

# 2.0 nonce（每次响应随机值，只有带 nonce 的内联脚本能跑）
Content-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'

# 3. trusted-types（把"谁能调用危险 sink"变成类型系统问题）
Content-Security-Policy: require-trusted-types-for 'script'
```

- Trusted Types：开启后 innerHTML 等危险 API 只接受经过注册策略（createHTML/createScript）处理过的 TrustedHTML/TrustedScript 对象，把净化收敛到一处，属于"从补丁式转义升级为架构约束"。
- CSRF 防御三板斧与原理：

```text
1. SameSite=Strict/Lax：跨站请求不带 cookie，直接断掉攻击链
   （Chrome 80 起默认 Lax：顶级导航 GET 带、跨站 POST/XHR/fetch 不带）
2. CSRF Token：服务端在表单/页面注入随机 token，提交时校验
   ——攻击者站点读不到我的 cookie 也读不到页面 DOM（同源策略），无法伪造
3. 校验 Origin/Referer + 自定义头（如 X-Requested-With）配合 CORS 白名单
```

- SameSite=Strict 的误伤：从外部链接点进来（支付宝回跳）首次请求不带 cookie，表现为"偶发登出"；解法是 Lax + 关键操作二次校验，或 `SameSite=None; Secure` 用于确需跨站的第三方场景（支付回调、嵌入式 iframe）。

**加分项（P7 视角）**：

- 组合纵深：XSS 与 CSRF 的根本区别一句话——XSS 是"在我的域执行你的代码"（信任了数据），CSRF 是"在你的域发我的请求"（信任了 cookie）；两者可以组合（XSS 偷 token 后 CSRF 防御全失效，所以 token 不能放 localStorage 的论证要带上 XSS 风险评估）。
- mXSS 与富文本：利用解析器差异（innerHTML 读回再写出的双重变异、svg/math 命名空间切换）绕过正则过滤，只有基于真实解析器白名单的 DOMPurify 可靠；能讲"为什么不能用正则做净化"体现纵深理解。
- 落地经验：CSP 上线三步走——Report-Only 收集误伤 → 修正 nonce 构建链路（webpack/vite 的 inline script 注入要配合）→ 强制开启 + 违规上报接入告警；讲出灰度与误伤治理过程比背 header 名字值钱。

## Q：点击劫持、原型污染、供应链攻击（SRI/integrity）分别如何防范？

**核心答案**：点击劫持（Clickjacking）是把目标站点透明 iframe 叠加在恶意页面上，诱导用户"点到别人的按钮"，防御用 `X-Frame-Options: DENY/SAMEORIGIN` 或现代等价物 CSP `frame-ancestors`（支持多域名且优先级更高），配合 JS 层 framebusting 兜底。原型污染（Prototype Pollution）主要发生在 Node.js 侧：`JSON.parse` 或深合并（lodash merge 类）允许 `__proto__`/`constructor.prototype` 键逐层写入 Object.prototype，污染后影响所有对象（可升级为 RCE/XSS），防御是递归校验键名、用 `Object.create(null)`/Map、冻结原型、升级含补丁的依赖版本。供应链攻击是"依赖包本身被投毒"，防范靠锁文件 + 审计 + 私有 registry + 部署时完整性校验，浏览器侧用 SRI（`integrity` 属性）校验 CDN 脚本哈希，npm 侧用 provenance/签名与 install scripts 治理。

**知识点解析**：

- 点击劫持防御：

```http
# 老标准：单一来源，粒度粗
X-Frame-Options: DENY            # 任何站都不许嵌我
X-Frame-Options: SAMEORIGIN      # 只许同源嵌

# 现代标准：CSP 指令，支持多来源与 ancestor 精确控制，覆盖 XFO
Content-Security-Policy: frame-ancestors 'self' https://trusted.example.com
```

```js
// JS 兜底（老浏览器）：检测到被嵌则顶掉父页
if (window.self !== window.top) {
  window.top.location = window.self.location;
}
```

- 原型污染原理与防御：

```js
// 漏洞模式：不校验 key 的递归合并
function merge(target, source) {
  for (const key in source) {
    // 攻击 payload: {"__proto__": {"isAdmin": true}}
    if (typeof source[key] === 'object') {
      merge(target[key] = target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// 防御：拒绝危险键 + null 原型对象
const UNSAFE = /^(__proto__|constructor|prototype)$/;
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (UNSAFE.test(key)) continue;
    // ...
  }
}
const safe = Object.create(null);   // 无原型链，天然免疫
const map = new Map();              // 键可以是任意字符串且不碰原型
Object.freeze(Object.prototype);    // Node 侧深度冻结（注意兼容风险）
```

- 前端侧同样存在风险：`Object.assign` 到对象、`qs`/`lodash-es` 老版本处理 URL 参数与 `location.hash` 解析结果写入对象，都可能把 `?__proto__[x]=1` 变成 DOM XSS 跳板；查询参数解析结果应过 schema（zod/ajv）。
- 供应链攻击与 SRI：

```html
<!-- SRI：subresource integrity，哈希不匹配则拒绝执行 -->
<script
  src="https://cdn.example.com/vue.global.prod.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

- SRI 注意点：必须与 `crossorigin` 同用（校验发生在 CORS 响应上）；只对"内容不该变"的静态资源有效，带 hash 的构建产物天然适合；反向风险是"CDN 被黑改内容 + 每次发布换哈希"的运维成本，因此要与构建流水线自动生成 integrity 集成。
- 工程化纵深：lockfile 提交并校验（`npm ci`/`pnpm i --frozen-lockfile`）、`npm audit`/OSV 扫描卡 CI、最小化依赖与 `--ignore-scripts`、私有 registry 代理（ verdaccio/Nexus）隔离直接拉公网、provenance（npm 信任的构建来源签名）验证、运行时防护（冻结环境、按需 polyfill）。

**加分项（P7 视角）**：

- 事件演进视角：2024 年 XZ Utils 后门（SSH 服务端供应链投毒）、原型污染在 Express 老版本 + EJS 链式利用导致 RCE——能举"依赖 → 框架 → RCE"的完整攻击链说明做过安全共建而非背概念。
- 治理体系：建立 SBOM（软件物料清单）+ 依赖风险评分（QoS/维护活跃度）引入卡点、关键依赖双源（内部 fork 镜像）、紧急漏洞响应 SOP（24h 内出影响面评估：谁引入 → 谁在跑 → 谁升级）；把"防攻击"升维成"可应急"。
- 组合案例：静态资源全量上 SRI + CSP（脚本白名单）+ CDN 只读；说明"单一手段都能被绕，纵深组合才成体系"，并指出 CSP report-uri 的违规监控是发现"被投毒/被劫持"的第一报警器。

## Q：CORS 详细字段有哪些？预检请求何时触发？withCredentials 是什么？JSONP 原理？

**核心答案**：CORS 是跨源资源共享的标准机制：浏览器在跨源请求上自动附加 `Origin`，服务器用 `Access-Control-Allow-Origin` 等响应头声明许可。简单请求（GET/HEAD/POST + 限定的 Content-Type 且不带自定义头）直接发送、响应头校验；非简单请求（PUT/DELETE、`application/json`、自定义头）先发 OPTIONS 预检，服务器以 `Access-Control-Allow-Methods/Headers/Max-Age` 应答，通过后才发真实请求。`withCredentials` 让跨源请求携带 cookie/HTTP 认证/TLS 客户端证书，此时服务器必须返回具体 origin（不能 `*`）且显式 `Access-Control-Allow-Credentials: true`。JSONP 是 CORS 普及前的方案：利用 `script` 标签不受同源限制的特性，把数据包在回调函数里返回，仅支持 GET、无错误处理、且有 XSS 风险，现代项目应弃用。

**知识点解析**：

- 完整字段清单：

```http
# —— 请求方（浏览器自动附加，JS 不可改）——
Origin: https://app.example.com            # 标识发起源
Access-Control-Request-Method: PUT         # 仅预检：告知实际方法
Access-Control-Request-Headers: x-token   # 仅预检：告知自定义头

# —— 响应方（服务器配置）——
Access-Control-Allow-Origin: https://app.example.com  # 或 *（非凭证时）
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, X-Token
Access-Control-Expose-Headers: X-Request-Id            # 允许 JS 读的非简单响应头
Access-Control-Max-Age: 600                             # 预检结果缓存 10 分钟
Access-Control-Allow-Credentials: true                  # 允许携带凭证
```

- 简单请求的判定（同时满足才免预检）：方法是 GET/HEAD/POST；`Content-Type` 仅限 `text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`；请求头仅限 CORS 安全头集合（Accept/Accept-Language/Content-Language/Content-Type 等）；注意 `fetch` 默认 `credentials: 'same-origin'`，历史 XHR 默认不跨源带 cookie。
- 预检流程示例：

```text
1. OPTIONS /api/user  + Origin + Access-Control-Request-Method: PUT
2. 服务器 204 + Allow-Origin/Allow-Methods/Allow-Headers + Max-Age
3. 浏览器校验通过 → 缓存预检结果（Max-Age 内不再预检）
4. 发出真实 PUT 请求 → 响应仍须带 Allow-Origin，否则 JS 读不到
预检失败的表现：控制台报 CORS error，真实请求根本没发出（Network 里只看到 OPTIONS）
```

- withCredentials 细节：

```js
const xhr = new XMLHttpRequest();
xhr.withCredentials = true; // XHR 写法

fetch('https://api.example.com/me', {
  credentials: 'include', // fetch 写法：include=总是带；same-origin=默认；omit=不带
});
// 服务器必须：
// 1. Access-Control-Allow-Origin 回具体 origin，禁止 *
// 2. Access-Control-Allow-Credentials: true
// 3. cookie 的 SameSite 允许跨站发送（见 CSRF 题）
```

- 常见报错归因：预检 404（网关/后端没处理 OPTIONS，NGINX 要配 `if ($request_method = OPTIONS)` 直接收）；Allow-Origin 回了多个值/逗号拼接（规范只允许一个，多域名要服务端动态判断后回一个）；Allow-Headers 漏了实际发的自定义头。
- JSONP 原理与局限：

```js
// 前端：声明回调 + script 标签请求数据
window.jsonpCb = (data) => console.log(data);
const s = document.createElement('script');
s.src = 'https://api.example.com/user?callback=jsonpCb';
document.body.appendChild(s);

// 服务端返回：jsonpCb({"name":"ct"});  —— 可执行的 JS
// 局限：只能 GET；无 HTTP 状态码错误语义；回调名全局可被抢注；服务端可控 JS 在我域执行
// —— 服务端被攻破即等价 XSS，因此被 CORS 全面替代
```

**加分项（P7 视角）**：

- 同源策略的本质辨析：SOP 限制的是"读响应"，不是"发请求"（请求早就发出去了，CSRF 正因此成立）；CORS 的机制是"用响应头豁免读权限"；能讲清"发不出去 vs 读不到"与 no-cors 模式（opaque response）是理解而非背诵。
- 生产事故视角：预检失败的排查清单——网关层 OPTIONS 处理、Allow-Origin 动态白名单（含端口与协议，`https://a.com` 与 `https://a.com:443` 是否归一）、CDN 缓存了 OPTIONS 响应导致头丢失；预检每域名一次 Max-Age 内免发，跨域接口网关统一配置能把预检成本压到可忽略。
- 架构取舍：网关统一 CORS（BFF/独立网关配置一次）vs 每服务自配（重复且易漏）；跨域 cookie 的现代替代是 `SameSite=None; Secure` + Partitioned（CHIPS）或 token 方案；微前端跨域共享 cookie 的 double-cookie 与 top-level domain 收敛（a.example.com 与 b.example.com 收到 example.com 域 cookie）也是高频追问。

## Q：存储体系：Cookie 属性全解、localStorage/IndexedDB/Cache API 如何选型？

**核心答案**：浏览器存储按容量与能力分层。Cookie：每条约 4KB、每个域名几十条上限，随请求自动携带，属性有 `Domain/Path/Expires/Max-Age/Secure/HttpOnly/SameSite/Partitioned`，定位是"会话与身份"，不该当数据仓库。localStorage：同步 API、约 5-10MB、字符串键值、同源共享且多标签页串行锁，适合小体量配置与 token 类数据（注意 XSS 与存储上限异常）。sessionStorage：标签页级隔离、关闭即失。IndexedDB：异步、大容量（数百 MB 到磁盘配额）、事务型、索引与游标查询，适合结构化离线数据。Cache API：专为 Request/Response 设计，配合 Service Worker 做离线与缓存策略。选型口诀：身份用 cookie（HttpOnly）、小配置用 localStorage、大结构化数据用 IndexedDB、网络资源缓存用 Cache API。

**知识点解析**：

- Cookie 属性全解：

```http
Set-Cookie: sid=abc123;
  Domain=.example.com;      # 指定域（带点=含子域），默认仅当前 host
  Path=/;                   # 生效路径，默认当前文档路径
  Max-Age=3600;             # 相对秒数（优先于 Expires）
  Expires=Wed, 21 Sep 2026 12:00:00 GMT;  # 绝对时间
  Secure;                   # 仅 HTTPS 传输
  HttpOnly;                 # JS 不可读（document.cookie 拿不到），防 XSS 窃取
  SameSite=Lax;             # Strict/Lax/None，控制跨站携带（CSRF 防御主轴）
  Partitioned               # 第三方 cookie 按顶级站点分区（CHIPS，应对第三方 cookie 淘汰）
```

- SameSite 三档：`Strict` 完全不跨站携带（外部链接跳入首请求无 cookie，体验像登出）；`Lax` 默认值，顶级导航 GET 携带、POST/XHR 不带，挡掉绝大多数 CSRF；`None` 必须配 `Secure`，用于确需跨站的嵌入场景。第三方 cookie 正被逐步淘汰，跨站身份要么 CHIPS（Partitioned）要么走 token/storage partitioning。
- localStorage 使用要点与陷阱：

```js
// 同步阻塞主线程：大 JSON 序列化 + 读写会卡帧，大对象不要放这
localStorage.setItem('config', JSON.stringify(bigObj));

// 容量异常必须捕获（约 5MB，且按 UTF-16 编码计费）
try {
  localStorage.setItem('k', 'v');
} catch (e) {
  // QuotaExceededError：Safari 隐私模式曾直接 throw
}

// 跨标签页通信：storage 事件只在"其他标签页"触发
window.addEventListener('storage', (e) => {
  console.log(e.key, e.oldValue, '->', e.newValue);
});
```

- IndexedDB 核心模型：

```js
const req = indexedDB.open('app', 1);
req.onupgradeneeded = (e) => {
  const db = e.target.result;
  const store = db.createObjectStore('messages', { keyPath: 'id' });
  store.createIndex('byConv', 'conversationId'); // 建索引才能按字段查
};
req.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('messages', 'readonly'); // 一切操作都在事务里
  tx.objectStore('messages').index('byConv').getAll('conv-1').onsuccess = (ev) => {
    console.log(ev.target.result);
  };
};
```

- Cache API 语义：以 Request（默认 URL）为键存 Response 对象，`cache.match(request)` 匹配，支持 Vary 头分键；它独立于 HTTP 缓存，可编程控制生命周期——但必须由 Service Worker 拦截 fetch 才能参与请求链路（window 上下文也能直接读写，用于预热）。
- 选型对比表：

| 存储 | 容量 | 模型 | 同步性 | 适用 |
| --- | --- | --- | --- | --- |
| Cookie | ~4KB/条 | 字符串随请求传 | 同步随请求 | 会话身份 |
| localStorage | ~5-10MB | 字符串 KV | 同步 | 配置/token/开关 |
| sessionStorage | ~5MB | 字符串 KV | 同步 | 标签页内临时态 |
| IndexedDB | 磁盘配额（GB 级） | 事务型对象库+索引 | 异步 | 离线数据/消息/草稿 |
| Cache API | 磁盘配额 | Request→Response | 异步 | PWA 资源缓存 |

**加分项（P7 视角）**：

- 存储隔离趋势：第三方 cookie 淘汰（Privacy Sandbox）带来 Storage Partitioning（localStorage/IndexedDB/Caches 都按顶级站点分区）；跨站身份的替代方案族谱：CHIPS、First-Party Sets（Related Website Sets）、FedCM——能讲趋势与迁移成本是前瞻性加分。
- 容量与清理：`navigator.storage.estimate()` 查配额用量、`navigator.storage.persist()` 申请免清理；存储压力下浏览器按 LRU（先清 last access 最久的 origin）整体逐出——离线应用必须显式申请持久化并设计降级。
- 封装层实践：原生 IndexedDB 事件回调难用，工程上用 idb（Promise 封装）或 Dexie.js，或用 IndexedDB 模拟 localStorage 语义的 localForage；讲出"容量估算 + 写入失败降级 + 版本迁移（onupgradeneeded 中做 schema 升级）"的完整设计是落地能力。

## Q：PWA：Service Worker 生命周期、缓存策略模式（stale-while-revalidate 等）？

**核心答案**：Service Worker（SW）是注册在 origin+scope 上的事件驱动 Worker，充当页面与网络之间的可编程代理，使离线可用与缓存策略可控成为可能。生命周期是：`register`（页面线程发起）→ `install`（预缓存关键资源，成功才激活）→ `waiting`（旧 SW 等待旧页面全部关闭，skipWaiting 可立即接管）→ `activate`（清理旧缓存，clients.claim() 立即接管已打开页面）→ `fetch/message/push/sync` 长期事件驱动，浏览器闲置约 30s 后可能被终止、事件来时再唤醒。缓存策略是 Workbox 归纳的经典模式集：cache-first、network-first、stale-while-revalidate、network-only、cache-only，按资源类型组合使用。

**知识点解析**：

- 生命周期状态机：

```text
register(page) → parsed → installing ──失败──→ redundant（作废）
                              │ install 完成（waitUntil 内预缓存成功）
                              ↓
                           installed(waiting) ←—— 旧 SW 仍控制已打开页面
                              │ 旧页面全关闭 或 skipWaiting()
                              ↓
                           activating → activate（删旧缓存）→ activated
activated 后：fetch / message / push / sync 事件驱动；空闲可被杀，事件唤起
```

```js
// 注册与更新检测：每次页面加载 register 同一 URL，浏览器按字节比对发现新版本
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' });
}
```

- install/activate 的关键 API：`event.waitUntil(promise)` 延长生命周期直到异步完成；`self.skipWaiting()` 让新 SW 不等旧页面关闭立即接管；`clients.claim()` 让激活后的 SW 立即控制未受控页面——两者组合实现"刷新即新版"，但要注意接管瞬间新旧资源混用导致的版本撕裂（配合 `controllerchange` 事件提示用户刷新）。

- 拦截 fetch 与策略实现：

```js
// stale-while-revalidate：先回缓存（快），同时后台更新（新）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // POST 交给网络

  event.respondWith(
    caches.open('runtime-v1').then(async (cache) => {
      const cached = await cache.match(request);
      const refresh = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone()); // body 只能读一次，clone 后再消费
          }
          return response;
        })
        .catch(() => cached); // 断网且无缓存时的兜底链
      return cached || refresh; // 有缓存立刻回，无缓存等网络
    })
  );
});
```

- 五种经典策略速记：

| 策略 | 行为 | 适用 |
| --- | --- | --- |
| cache-first | 缓存优先，未命中走网络 | 带 hash 静态资源 |
| network-first | 网络优先，失败回缓存 | API 数据（新鲜优先） |
| stale-while-revalidate | 立即回旧缓存 + 后台更新 | 低频更新的可容忍数据 |
| network-only | 总是网络 | 支付、敏感接口 |
| cache-only | 总是缓存 | 离线预置内容 |

- 更新与缓存版本治理：缓存名带版本（`runtime-v1`），activate 时 `caches.keys()` 删除非当前版本——"新版本预缓存成功 → 激活 → 清旧缓存"保证原子切换；sw.js 本身要用 `Cache-Control: no-cache` 防止浏览器缓存住旧 SW 导致"永远更新不了"。

**加分项（P7 视角）**：

- 一致性难题：skipWaiting + clients.claim 立即接管后，旧 HTML 可能请求新 SW 拦截的新接口出现版本不匹配；工程方案是"双缓存并存到旧页面全部退出"（不 skipWaiting）或资源版本协商（HTML 声明依赖版本，SW 按版本路由缓存）——讲出版本撕裂问题说明真踩过坑。
- 与 HTTP 缓存的分层：SW 缓存 > HTTP 缓存（SW fetch 时仍可能命中 HTTP 缓存，可用 `cache: 'reload'` 强制绕过）；更新检测的默认字节比对可配 `updateViaCache: 'none'`；CDN 与 SW 的失效协同（HTML 不缓存 + 资源 hash 化）是端到端一致性的关键。
- 场景延伸：push 通知（VAPID 公钥订阅 + 服务器 web-push）、Background Sync（断网排队重试）、Workbox 的 precache + runtimeCaching 声明式配置与构建期 manifest 注入；讲"离线消息队列用 IndexedDB + Background Sync 重放"把 PWA 落到业务闭环。

## Q：首屏优化的体系化方案？（度量→归因→治理的闭环）

**核心答案**：首屏优化不是招式罗列，而是"度量 → 归因 → 治理 → 度量"的闭环。度量层：定义北极星指标（LCP p75 + 业务首屏时长），实验室（Lighthouse CI）与真实用户（RUM，PerformanceObserver + sendBeacon 上报）双轨采集，按设备/网络/路由分维度看分位数。归因层：把 LCP 拆成 TTFB/资源加载延迟/资源加载时长/渲染延迟四段定位瓶颈段，配合瀑布图、Coverage 面板、Bundle Analyzer 找到具体资源与代码。治理层：网络侧（CDN、协议升级、预连接、preload）、资源侧（代码分割、tree-shaking、关键 CSS 内联、图片压缩与现代格式）、渲染侧（SSR/流式/骨架屏）、机制侧（性能预算 + CI 卡点 + 回归告警）。闭环的关键是"任何优化必须先有基线、后有量化收益、最终固化为流程"，否则一次迭代就回退。

**知识点解析**：

- 度量层：实验室 vs 真实用户双轨：

```js
// RUM 上报：页面卸载时用 sendBeacon 保证送达
addEventListener('pagehide', () => {
  navigator.sendBeacon('/perf', JSON.stringify({
    lcp: lcpValue, inp: inpValue, cls: clsValue,
    route: location.pathname,
    net: navigator.connection?.effectiveType, // 4g/wifi 分维度
    device: navigator.hardwareConcurrency,    // 低端机单独看
  }));
}, { once: true });
```

- 归因层：LCP 四段拆解法（定位瓶颈在哪一段，避免瞎优化）：

```text
TTFB            慢 → 服务端/CDN 问题：SSR 慢、无边缘缓存、回源链路长
资源加载延迟    慢 → 发现问题：LCP 图片没 preload、被低优先级排队（加 fetchpriority）
资源加载时长    慢 → 传输问题：图片过大（换 WebP/AVIF、CDN 裁剪）、带宽瓶颈
元素渲染延迟    慢 → 渲染阻塞：同步脚本、阻塞渲染的 CSS、hydration 耗时
```

- 治理层按四条线推进：

  1. 网络线：全站 CDN + HTTP/3、关键域名 preconnect、HTML 边缘缓存（stale-while-revalidate）
  2. 资源线：路由级代码分割 + 组件级 lazy、首屏关键 CSS 内联、图片 `srcset`/懒加载（LCP 图除外）、字体 preload + swap
  3. 渲染线：SSR/流式渲染（见第 16 题对比）、骨架屏维持布局、第三方脚本延迟/异步化
  4. 机制线：performance budget（首屏 JS ≤ 200KB 之类）、CI 中 Lighthouse 分数卡点、体积 diff 评审、线上指标告警

- 常见反模式：没有基线就优化（无法证明收益）；只看实验室分数（CrUX 与 Lighthouse 数据源不一致）；一次大优化后无看板守卫，三个月回退；只压 JS 体积不治理第三方脚本（埋点/广告 SDK 常占首屏阻塞的大头）。
- 报告机制：把性能指标接入需求流程（上线单必须带性能影响评估）、每周性能周报（p75 趋势 + Top 劣化页面）、竞品对标——度量只有变成组织动作才有闭环。

**加分项（P7 视角）**：

- 优先级框架：收益/成本矩阵决定治理顺序——通常 TTFB（边缘缓存 + SSR 流式）和 LCP 资源（preload + fetchpriority + 图片格式）是性价比最高的两刀，先把 p75 从 4s 压到 2.5s 往往不需要重构，深水区（hydration、第三方依赖替换）才需要架构动作；能给出"先做什么后做什么"的排序逻辑是 P7 信号。
- 数据严谨性：分位数用 p75 而非平均数（长尾被平均掩盖）；采样率与置信度（小流量页面低采样会抖动）；灰度期对照组（A/B 同时段对比，避免"周五晚上网速好"的辛普森悖论）；指标口径变更（FID→INP）时的历史数据衔接。
- 组织与机制：性能的敌人是"新需求不断进来"——真正有效的不是一次优化而是预算卡点 + 归因到人（哪个 PR 引入了劣化、Slack 机器人自动 @）；讲出"把性能从运动式优化变成流水线上的门禁"的机制设计经验，是 P7 区别于 P6 的核心。

## Q：长任务如何治理？requestIdleCallback、时间分片、INP 与 TBT 的关系？

**核心答案**：长任务是主线程上超过 50ms 的同步执行块，它同时伤害三个指标：输入响应（INP 变差，交互要排在长任务后面）、可交互时间（TBT 变差）和掉帧（动画 jank）。治理思路四层：第一层拆任务，把大同步块切成 ≤ 50ms 的片段，让出主线程给输入与渲染；第二层挪任务，纯计算挪到 Web Worker；第三层削任务，惰性初始化、按需执行、用 IntersectionObserver 延迟到可见时再做；第四层调度，用 `scheduler.yield()`（新标准）或 `requestIdleCallback`（空闲执行）或 MessageChannel（比 setTimeout 4ms 紧急）控制让出时机。TBT 是实验室指标（FCP 到可交互之间所有长任务"阻塞部分"之和），INP 是线上真实交互延迟——TBT 优化的代码通常也会优化 INP，但 INP 还多覆盖了"事件处理与渲染更新"本身的开销。

**知识点解析**：

- 长任务与指标的关系：

```text
长任务(>50ms) 的"阻塞部分" = duration - 50ms
TBT = Σ 阻塞部分（只统计 FCP~TTI 窗口内，实验室 Lighthouse）
INP = 真实用户所有交互中接近最差一次的"输入→下一帧渲染"延迟（线上 RUM）
关系：TBT 好 ≈ 主线程空，是 INP 好的必要不充分条件；
     INP 还包含回调自身执行 + 后续渲染更新的耗时
```

- 检测长任务：

```js
// 线上采集
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    reportLongTask({ start: entry.startTime, duration: entry.duration });
  }
}).observe({ type: 'longtask', buffered: true });

// 调试归因：Long Animation Frames API（LoAF）能看到脚本源、执行者与每帧耗时
new PerformanceObserver((l) => {
  for (const frame of l.getEntries()) {
    frame.scripts.forEach((s) => {
      console.log('凶手', s.name, s.duration, s.invokerType);
    });
  }
}).observe({ type: 'long-animation-frame', buffered: true });
```

- requestIdleCallback 的正确用法：

```js
function processQueue(deadline) {
  while (tasks.length && deadline.timeRemaining() > 5) {
    tasks.pop()(); // 每段执行前检查剩余预算，超时立即让出
  }
  if (tasks.length) requestIdleCallback(processQueue); // 未做完继续排队
}
requestIdleCallback(processQueue, { timeout: 2000 }); // timeout 防止一直没空闲

// 注意：idle 回调里禁止改 DOM 强制布局？——不是禁止，而是改了会吃掉预算；
// 最佳实践是 idle 里做纯计算/预取，DOM 更新交给 rAF
```

- 时间分片让出主线程的几种方式对比：

```js
// 1. scheduler.yield：新标准，让出后同优先级任务续排（顺序保证最好）
const scheduler = await new Scheduler();
async function workLoop() {
  while (tasks.length) {
    tasks.pop()();
    await scheduler.yield(); // 让出并允许输入/渲染插队
  }
}

// 2. MessageChannel：宏任务让出，比 setTimeout 少 4ms 嵌套惩罚，React 调度器路线
const ch = new MessageChannel();
ch.port1.onmessage = () => { tasks.pop()(); if (tasks.length) ch.port2.postMessage(0); };
ch.port2.postMessage(0);

// 3. setTimeout(0)：简单但嵌套超过 5 次被钳到 4ms，且优先级最低
// 4. rAF 分片：把任务对齐到帧预算（先 rAF 再 idle 是"先渲染后计算"的经典组合）
```

- Worker 化：纯计算（排序/过滤/解析/加密/大 JSON）搬到 Worker，主线程只收结果；SharedArrayBuffer + COOP/COEP 可共享内存（见多进程题），Atomics.wait 做同步协作。
- React 的映射：Concurrent 的本质就是把"一次 render 几百 ms"拆成可中断分片（用 MessageChannel 驱动调度器 + lane 优先级），`useTransition`/`startTransition` 让紧急输入插队——前端框架的调度与浏览器长任务治理是同一命题。

**加分项（P7 视角）**：

- 调度语义深度：`scheduler.postTask`（优先级：user-blocking/user-visible/background）与 `scheduler.yield({ priority })` 一起构成 W3C Scheduling 提案；能对比"isInputPending 误判（检查成本与信号缺失）、timeout 强制执行的副作用"说明读过提案与实测，而不是只背 API。
- INP 治理实战：点击慢的归因方法——LoAF 找到脚本 → 拆分"输入处理（同步，<50ms）+ 状态更新（可 transition 化）+ 大 DOM 更新（虚拟化/分页）"；关键经验是"长任务指标好但 INP 仍差"的典型原因是交互回调触发了强制同步布局或超大重渲染，两个监控要一起看。
- 容量与灰度：分片调度在低端机（hardwareConcurrency ≤ 4）收益最大，但会让总耗时变长（调度开销），所以高优先级交互不分片、空闲任务才分片；能讲"分片是拿吞吐换响应"的权衡 + 按 CPU 核数自适应分片粒度，是带过真实优化的标志。

## Q：首屏秒开案例：SSR/预渲染/离线包/CDN 边缘渲染的选型权衡？

**核心答案**：以我负责的内容社区 H5（活动页 + 详情页混合，日活百万级，三四线城市用户占比高）为例讲选型。背景：CSR 单页应用首屏 LCP p75 高达 4.2s（TTFB 300ms + bundle 1.8MB + 请求瀑布三层），运营投诉"活动上线即流失"。方案对比：SSR 人力成本与服务器成本最高但覆盖所有动态路由；预渲染只适合静态内容页；离线包只作用于自家 App WebView 内；CDN 边缘渲染解决动态内容的 TTFB 但受限于边缘运行时与冷启动。最终组合：App 内走离线包 + 局部 SSR，App 外走边缘渲染 + 流式 SSR，静态活动页走预渲染。收益：LCP p75 从 4.2s 降到 1.6s，App 内首屏 LCP 稳定在 1.1s，活动页到达转化率 +7%，服务器渲染成本通过边缘与缓存降到原方案的 1/5。

**知识点解析**：

- 背景与瓶颈定位（先归因再选型）：瀑布图显示首屏链路是"HTML → bundle → 首屏接口 → 二级接口"四层串行，LCP 元素是接口返回后渲染的文章封面图；即瓶颈不在单一环节而在"串行深度"，所以任何单点优化（压缩 bundle）都不可能达标，必须同时压缩 TTFB 与首屏数据到达时间。

- 四个方案的对比矩阵（面试时画表）：

| 维度 | SSR（Node 服务） | 预渲染（构建时） | 离线包（App 内） | CDN 边缘渲染（ESR） |
| --- | --- | --- | --- | --- |
| 动态内容 | 支持 | 不支持（构建时定死） | 支持（仍需接口） | 支持（边缘取数受限） |
| TTFB | 300-800ms（含取数） | 极低（静态文件） | 极低（本地磁盘） | 低（边缘就近 + 缓存） |
| 首屏 JS 体积 | 不减（仍需 hydration） | 不减 | 减为增量 | 不减 |
| 成本 | 高（服务器 + 运维） | 低（构建时间） | 中（包版本管理） | 中（边缘函数计费） |
| 失效半径 | 服务挂全挂 | 构建产物错需重发 | 版本错需热修 | 边缘回源雪崩风险 |

- 落地组合与理由：

  1. App 内（60% 流量）：离线包。App 启动时增量下载全量资源包（zip 差量更新，默认包 2.5MB、单次差量 < 100KB），WebView 请求拦截命中本地文件，等效"资源零网络"；配合服务端预取接口（客户端代理请求详情接口，WebView ready 时直接注入数据），LCP 只剩渲染时间约 1.1s
  2. App 外（40% 流量）：边缘渲染 + 流式 SSR。HTML 骨架与静态资源全部边缘缓存（stale-while-revalidate），动态首屏数据在边缘函数请求（边缘有同机房专线，回源延迟 30ms 级），HTML 采用流式输出——先 flush 头部与骨架，数据段边取边推
  3. 纯静态活动页：预渲染。营销页生命周期短、内容不变，构建时生成静态 HTML 上 CDN，构建成本可控（100 页约多 2 分钟）

- 关键工程细节：hydration 体积治理（按路由引入客户端组件、非交互区域不 hydrate）；流式边界设计（Suspense/模板注义分段，首字节时间 < 200ms）；离线包灰度与强制版本（服务端下发最低版本号，低于则忽略包走网络）；回滚预案（离线包开关 + 边缘渲染降级为纯 CDN 静态兜底页）。

- 量化收益（结尾必须给数字）：

```text
基线（CSR）：LCP p75 = 4.2s，INP p75 = 340ms，首屏 JS = 1.8MB
上线（组合方案）：
  App 内： LCP p75 = 1.1s（-74%），资源网络请求 0 次
  App 外： LCP p75 = 1.6s（-62%），TTFB p75 = 380ms → 210ms
  全量：   活动页到达转化 +7%，跳出率 -11%，服务器渲染 QPS 成本为纯 SSR 方案测算的 1/5
守卫：性能预算（首屏 JS ≤ 300KB）+ Lighthouse CI 卡点 + RUM 告警，三个月后指标无回退
```

**加分项（P7 视角）**：

- 决策复盘：真正的权衡点是"团队人力与故障半径"——纯 SSR 方案需要维护 Node 集群（发布、扩容、降级演练），边缘渲染把这个问题转嫁给 CDN 厂商但引入运行时限制（部分 npm 包不兼容 workerd）；选型的最后一票往往是"谁能简单降级"：边缘渲染挂了退静态壳，SSR 挂了页面白屏，前者才敢全量。
- 架构演进观：hydration 是当前方案的隐性负债（客户端仍要完整执行框架），下一步是 Islands 架构（Astro 思路：只有交互组件 hydrate）与 Resumability（Qwik 思路：服务端序列化执行状态，客户端零重放）；能指出"我们的方案在哪些流量形态下会被替换"体现架构前瞻。
- 治理与协作：秒开项目的组织难度大于技术难度——离线包需要客户端团队排期、边缘渲染需要后端与 CDN 厂商联调、预渲染需要营销团队接受构建延迟；能讲"如何用数据（分层 LCP 归因报告）说服各方投入、如何设计灰度与回滚"是 P7 的核心叙事能力。
