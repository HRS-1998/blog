# 3 HTML / DOM

HTML 语义、脚本加载策略、DOM 构建与操作、事件模型、观察器 API、虚拟列表、无障碍、表单与文件、iframe 通信、SPA 路由、Web API 权限、Canvas/SVG、Web Component 共 12 道高频题，覆盖 P6 基础与 P7 深度。

## Q：script 的 defer / async / module 有什么区别？preload、prefetch、preconnect、dns-prefetch 分别解决什么问题？

**核心答案**：`defer` 是并行下载、DOM 解析完成后按文档顺序执行，时机在 `DOMContentLoaded` 之前；`async` 是并行下载、下载完立即执行，会打断 HTML 解析且执行顺序不可控；`type="module"` 默认带 `defer` 语义（内联 module 也延迟执行），其作用域是模块级的并自动严格模式。`preload` 用最高优先级提前拉取**当前页面必需**的资源；`prefetch` 在浏览器空闲时以最低优先级预取**下一跳**可能用到的资源；`preconnect` 提前完成 DNS + TCP + TLS 握手；`dns-prefetch` 只提前做 DNS 解析，是 `preconnect` 的低成本降级。

**知识点解析**：

- 三种脚本加载语义对比：

  | 属性 | 下载 | 执行时机 | 执行顺序 | 阻塞解析 |
  | --- | --- | --- | --- | --- |
  | 默认 | 阻塞 | 下载完立即执行 | 文档顺序 | 阻塞下载和执行 |
  | `defer` | 并行 | DOM 解析完、`DOMContentLoaded` 前 | 文档顺序 | 不阻塞 |
  | `async` | 并行 | 下载完立即执行 | 不可控 | 执行时阻塞 |
  | `type="module"` | 并行 | 同 `defer` | 依赖图顺序 | 不阻塞 |

- 内联 script 写 `defer`/`async` 会被忽略（内联没有下载过程）；但内联 `<script type="module" async>` 是有效的，模块图加载完立即执行。
- `async` 只适合完全独立的脚本（埋点、广告、A/B 实验 SDK），凡是依赖 DOM 或其他脚本的都要用 `defer`。
- 资源提示（Resource Hints）写法：

  ```html
  <!-- dns-prefetch：只解析 DNS，成本最低 -->
  <link rel="dns-prefetch" href="//cdn.example.com" />

  <!-- preconnect：DNS + TCP + TLS 一次做完，用于关键的第三方域 -->
  <link rel="preconnect" href="//cdn.example.com" crossorigin />

  <!-- preload：当前页面必需的关键资源，高优先级 -->
  <link rel="preload" href="/app.js" as="script" />
  <link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin />

  <!-- prefetch：下一跳可能用到的资源，空闲时低优先级 -->
  <link rel="prefetch" href="/next-page-chunk.js" as="script" />

  <!-- modulepreload：预取整个 ES Module 依赖图 -->
  <link rel="modulepreload" href="/entry.mjs" />
  ```

- `preload` 的 `as` 属性必须和实际请求类型一致，否则资源会因缓存键不匹配被下载两次；字体 preload 必须带 `crossorigin`（字体永远以 CORS 模式请求），这是最著名的踩坑点。

**加分项（P7 视角）**：

- 规范层面：`defer`/`async` 定义在 HTML Standard 的 script processing model 中，`async=false` 可以动态脚本上"反向关闭"异步——动态 `createElement('script')` 默认 `async=true`，设置 `script.async = false` 可恢复有序执行，这是早年模块加载器的底层原理。
- `preconnect` 只建议给"接下来 10 秒内一定会用"的关键域（一般不超过 3-4 个），过多握手白白占用连接池；`dns-prefetch` 当作兜底同时写，Safari 对 `preconnect` 支持不完整。
- Chrome 73+ 起 `preload` 的 `as="script"` 优先级低于写在 HTML 里的 `<script src>`，关键路径脚本应直接内联标签而不是 preload；新版更推荐 `fetchpriority="high"` 精确控制优先级。
- 生产案例：HTTP/2 Server Push 曾被用来推 preload，但因推送命中率低、可能挤占关键资源，Chrome 已于 2022 年移除——"优先级提示"（fetchpriority）取代了"提前推送"的思路。

## Q：浏览器的 DOM 树是如何构建的？DocumentFragment 为什么能优化批量插入？

**核心答案**：DOM 构建是流式的增量过程：网络层交来的字节流经解码（encoding sniffing）进入分词器（tokenizer）产出 token，树构建器（tree builder）按 HTML 规范的 insertion mode 把 token 组装成 DOM 树，同时修正嵌套错误（如 `<p>` 内遇到块级元素自动闭合）。遇到同步 `<script>` 会暂停解析先执行脚本，因为脚本可能读取或改写当前 DOM。`DocumentFragment` 是一个"离线文档"节点：挂在上面的子节点不处于文档流中，插入真实 DOM 时会把所有子节点一次性搬过去，整个过程只触发一次 reflow，而循环 `appendChild` 每次都可能触发回流。

**知识点解析**：

- 解析管线：`字节流 → 预扫描（speculative parsing）→ 分词 → 树构建 → DOM 树 → 与 CSSOM 合成渲染树`。预加载扫描器（preload scanner）在主解析器被脚本卡住时，仍会继续向后扫描 `<img>/<link>/<script>` 提前发起请求，所以"脚本放头部会阻塞"阻塞的是解析执行，不是资源发现。
- 树构建的错误容忍：`<table>` 外的 `<tr>` 被丢弃、`<li>` 自动闭合前一个 `<li>`，靠的是规范定义的解析算法而非浏览器各自为政，这也是"HTML 永远解析得出来"的原因。
- DocumentFragment 批量插入对比：

  ```js
  // 反例：N 次插入，每次都可能触发回流（虽然现代浏览器有批处理优化，仍触发 N 次布局失效）
  const ul = document.querySelector('ul')
  for (let i = 0; i < 10000; i++) {
    const li = document.createElement('li')
    li.textContent = 'item ' + i
    ul.appendChild(li)
  }

  // 正例：fragment 离线构建，一次性插入，只有一次回流
  const fragment = document.createDocumentFragment()
  for (let i = 0; i < 10000; i++) {
    const li = document.createElement('li')
    li.textContent = 'item ' + i
    fragment.appendChild(li)
  }
  ul.appendChild(fragment) // fragment 本身不会进 DOM，只有子节点进
  ```

- 另一条路线：`innerHTML` 一次性赋值（解析 HTML 字符串）通常比逐个 `createElement` 更快，但有 XSS 风险（内容不可信时禁止拼接）；`insertAdjacentHTML('beforeend', html)` 可以避免"读-改-写"整个子树。
- fragment 与真实节点的区别：没有 `parentNode`（是 `null`）、不参与事件冒泡（不在文档中）、插入后自身被"掏空"（子节点移入目标，fragment 变回空壳）。

**加分项（P7 视角）**：

- 规范层面：HTML 解析是单线程、不可回溯的单遍算法（对比 XML 解析器可中断回滚），这是历史包袱也是性能优势——解析时间复杂度是线性的；`document.write` 是唯一能"插队"向输入流注入 token 的 API，异步调用会强制文档重新打开，这也是它被判定为"毁灭性 API"的原因。
- 性能权衡：fragment 优化的是"DOM 插入次数"，但 10 万节点级别的内存占用、样式计算、绘制成本不会消失——大数据量真正的解法是虚拟列表（见下一节）或分页。
- 框架映射：Vue/React 的虚拟 DOM 本质是把"diff 计算移到内存、把真实 DOM 操作收敛为一次批量 patch"，与 fragment 的思想同源；Vue 3 内部 compile 产出的 block tree 就是在压缩需要对比的动态节点范围。
- 生产案例：Web Worker 中不能操作 DOM，但可以 `structuredClone` 传输；一些高性能表格库在 Worker 里构建 HTML 字符串、主线程一次 `innerHTML` 落地，绕开主线程解析瓶颈。

## Q：完整描述 DOM 事件模型的链路，addEventListener 第三个参数有哪些门道？

**核心答案**：事件流分三个阶段：捕获阶段（从 `window` 逐层向下到目标元素的父级）、目标阶段（在目标元素上触发，按注册时 capture 标志决定看起来属于哪段，`event.eventPhase` 为 2）、冒泡阶段（从目标逐层回到 `window`）。`addEventListener(type, listener, optionsOrCapture)` 第三个参数传布尔值表示是否捕获；传对象时可配置 `capture`、`once`、`passive`、`signal` 四个字段。`passive: true` 承诺不在监听器里调用 `preventDefault()`，浏览器无需等待监听器执行完就能直接滚动，是移动端滚动性能的关键。

**知识点解析**：

- 事件流全链路：

  ```js
  // 事件依次经过的节点：window → document → html → body → ... → target → ... → body → html → document → window
  //                                  |—— 捕获阶段 ——→ 目标 ←—— 冒泡阶段 ——|
  document.querySelector('#outer').addEventListener('click', (e) => {
    console.log('outer 捕获', e.eventPhase) // 1 捕获阶段
  }, true)

  document.querySelector('#inner').addEventListener('click', (e) => {
    console.log('inner', e.eventPhase)      // 2 目标阶段
  })

  document.querySelector('#outer').addEventListener('click', (e) => {
    console.log('outer 冒泡', e.eventPhase) // 3 冒泡阶段
  })
  ```

- 第三个参数对象形式：

  ```js
  element.addEventListener('click', handler, {
    capture: false,          // 是否在捕获阶段触发
    once: true,              // 触发一次后自动 removeEventListener
    passive: true,           // 承诺不 preventDefault，滚动类事件性能优化
    signal: abortController.signal, // 用 AbortController 统一卸载监听
  })
  ```

- `passive` 的默认值：Chrome 56 起，`window`/`document`/`document.body` 上的 `touchstart`、`touchmove`、`wheel` 监听器默认 `passive: true`——在这些目标上写 `e.preventDefault()` 会无效并在控制台报警告，必须显式传 `{ passive: false }`。
- `stopPropagation()` 阻止事件继续传播（同元素同类型的其他监听器仍会执行）；`stopImmediatePropagation()` 连同元素上后续注册的监听器一起拦掉。
- 事件委托（事件代理）：把监听器挂在稳定父节点上，利用冒泡统一处理子节点事件，动态增删子元素无需重新绑定，是 `e.target` 与 `e.currentTarget` 的经典区分场景：

  ```js
  ul.addEventListener('click', (e) => {
    // e.target：实际点击的元素（可能是 li 里的 span）
    // e.currentTarget：绑定监听器的元素（ul，冒泡阶段到达它）
    const li = e.target.closest('li')
    if (!li || !ul.contains(li)) return
    console.log('点击了', li.dataset.id)
  })
  ```

- 自定义事件：`new CustomEvent('my-event', { detail: payload, bubbles: true })` + `dispatchEvent()`，可用来做组件间解耦通信。

**加分项（P7 视角）**：

- 规范层面：捕获-冒泡双阶段是 DOM Level 2 为了调和 Netscape（捕获派）与 IE（冒泡派）的历史妥协；目标阶段在规范里其实仍按"先注册的先执行"处理 capture 与 bubble 监听（现代浏览器实现为 capture 监听在目标节点也先于 bubble 触发，顺序由注册时的 capture 标志决定，而不是严格三段）。
- 性能权衡：`once` 和 `signal` 解决的是监听器泄漏——SPA 中组件卸载忘记移除监听器是内存泄漏高发点，`AbortController` 可以一个信号批量注销一组监听器（fetch、事件、监听统一取消）。
- 框架映射：React 17 起把事件委托从 `document` 下移到 root 容器，原因包括多个 React 版本共存时 `stopPropagation` 互相干扰；Vue 的 `.capture`/`.once`/`.passive` 修饰符就是 addEventListener options 的语法糖。
- 生产案例：埋点系统常挂在捕获阶段（`capture: true`）保证在业务代码 `stopPropagation` 之前拿到事件； Passive Event Listeners 上线后 Google 自测移动端滚动帧率提升明显，Lighthouse 会把 touch/wheel 监听器缺 passive 列为性能扣分项。

## Q：IntersectionObserver / MutationObserver / ResizeObserver 的原理和使用场景？

**核心答案**：三者都是"浏览器帮你在合适的时机回调"的观察器，取代高频 scroll/resize 轮询。`IntersectionObserver` 观察元素与视口（或指定根元素）的交叉状态变化，回调在渲染帧中批量触发，适合图片懒加载、无限滚动、曝光埋点；`MutationObserver` 观察 DOM 子树的结构、属性、文本变化，回调合并到微任务中执行，适合编辑器同步、水印防篡改、第三方脚本监控；`ResizeObserver` 观察单个元素 content box 尺寸变化（不依赖 window resize），回调发生在"布局之后、绘制之前"，适合自适应组件（如表格列宽、图表容器）。共同优点：不阻塞主线程的高频事件风暴，浏览器自行节流到帧级别。

**知识点解析**：

- IntersectionObserver 核心 API：

  ```js
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // entry.isIntersecting 是否进入可视区
      // entry.intersectionRatio 交叉比例（0 ~ 1）
      // entry.target 被观察的元素
      if (entry.isIntersecting) {
        entry.target.src = entry.target.dataset.src // 懒加载真实图片
        io.unobserve(entry.target)                   // 一次性观察后取消
      }
    })
  }, {
    root: null,          // 默认视口；传某个元素则以它为参照系
    rootMargin: '200px', // 提前 200px 开始加载（支持 px 和 %）
    threshold: [0, 0.5, 1], // 交叉比例越过这些阈值时都触发回调
  })

  document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img))
  ```

- 为什么不用 scroll + `getBoundingClientRect()`：scroll 事件一帧可触发多次，`getBoundingClientRect` 每次调用都强制同步布局（layout thrashing），万级元素下主线程被打爆；IO 的相交计算在渲染流程内部完成，回调带批处理的 `entries` 数组。
- MutationObserver 监视能力与微任务时机：

  ```js
  const mo = new MutationObserver((mutations) => {
    // 多次 DOM 变更会被合并成一批，在当前宏任务结束后的微任务中触发一次
    mutations.forEach((m) => {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => console.log('新增', n))
        m.removedNodes.forEach((n) => console.log('移除', n))
      }
      if (m.type === 'attributes') console.log(m.attributeName, m.oldValue)
    })
  })

  mo.observe(document.body, {
    childList: true,       // 子节点增删
    subtree: true,        // 整棵子树
    attributes: true,     // 属性变化
    attributeOldValue: true,
    characterData: true,  // 文本变化
  })

  // mo.disconnect() 停止观察；mo.takeRecords() 取走尚未回调的记录
  ```

- ResizeObserver 与 `window.resize` 的区别：元素尺寸变化的原因很多（容器被折叠、内容变化、断点切换），`window.resize` 只能感知窗口变化；RO 直接观察元素本身，且回调自带 `contentRect`（content box 尺寸）：

  ```js
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // entry.contentRect: { width, height, top, left }
      chart.resize(entry.contentRect.width, entry.contentRect.height)
    }
  })
  ro.observe(document.querySelector('.chart-container'))
  ```

- 生命周期管理：`observe()` 开始观察、`unobserve(target)` 停止单个、`disconnect()` 全部停止；观察器对已移除 DOM 的引用需要手动清理，否则内存泄漏。

**加分项（P7 视角）**：

- 规范层面：IO 的回调时机是"渲染帧更新 rendering steps 中的 intersection observation 步骤"，因此与视觉状态严格同步；`rootMargin` 百分比参照的是 root 尺寸而不是目标元素；IO 的实现允许浏览器最多延迟一帧（规格允许 frame budget 内合并），这解释了为何偶见回调与视觉有一帧误差。
- ResizeObserver loop：RO 回调里同步改变布局会再次触发 RO，形成循环；浏览器规定"一帧内连续触发超过两次即抛出 `ResizeObserver loop limit exceeded` 错误"（不中断执行），常见于"根据宽度设置高度"的组件——解法是把写入延迟到 `requestAnimationFrame`。
- 生产案例：曝光埋点用 `threshold: [0.5]` + `rootMargin` 微调判定"有效曝光"；防删水印的攻防——MutationObserver 监听水印节点被移除后立即重新插入，同时用 `attributeFilter` 防改样式。
- 框架映射：`vueuse` 的 `useIntersectionObserver`、React 的 `react-virtual` 全部基于 IO；Vue 3 的 `v-intersection` 类指令封装里必须处理"指令卸载时 unobserve"，这是面试常追问的内存泄漏点。

## Q：手写一个虚拟列表，说说完整实现原理？

**核心答案**：十万条数据直接渲染会创建十万级 DOM 节点，内存、布局计算、绘制全部崩掉，滚动帧率骤降。虚拟列表的核心是"**只渲染可视区 + 上下缓冲区的少量条目**"：用一个占位元素撑起 `总条数 × 条高` 的真实滚动条，滚动时根据 `scrollTop` 反算出当前应该渲染的索引区间，把渲染窗口用 `transform: translateY` 定位到正确的视觉位置。定高场景索引计算是 O(1)；不定高场景需要"预估高度 + 实测缓存 + 滚动中动态修正"。

**知识点解析**：

- 四个组成部分：滚动容器（固定高度 `overflow: auto`）、总高度占位（撑出真实滚动条）、渲染窗口（绝对定位，只装二三十个真实节点）、索引计算（scrollTop 换算 startIndex/endIndex）。
- 定高版本完整可运行代码（新建 html 文件直接打开即可）：

  ```html
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>定高虚拟列表</title>
    <style>
      body { margin: 0; font-family: sans-serif; }
      #scroll-box {
        height: 600px;        /* 滚动容器高度 = 可视区 */
        overflow: auto;       /* 产生滚动条 */
        position: relative;   /* 渲染窗口的定位基准 */
        border: 1px solid #ccc;
      }
      #placeholder {          /* 占位元素：只负责撑高度 */
        width: 1px;
      }
      #render-list {          /* 渲染窗口：绝对定位脱离文档流 */
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        will-change: transform;
      }
      .item {
        height: 50px;         /* 定高条目：虚拟列表的关键前提 */
        box-sizing: border-box;
        border-bottom: 1px solid #eee;
        line-height: 50px;
        padding-left: 12px;
      }
    </style>
  </head>
  <body>
    <div id="scroll-box">
      <div id="placeholder"></div>
      <div id="render-list"></div>
    </div>

    <script>
      // ===== 配置 =====
      const TOTAL = 100000        // 模拟 10 万条数据
      const ITEM_HEIGHT = 50      // 每条固定高度
      const VIEW_HEIGHT = 600     // 可视区高度
      const BUFFER = 5            // 上下缓冲条数：防止快速滚动白屏

      const scrollBox = document.getElementById('scroll-box')
      const placeholder = document.getElementById('placeholder')
      const renderList = document.getElementById('render-list')

      // 1. 占位元素撑起总高度，得到"数据全在"一样的滚动条
      placeholder.style.height = TOTAL * ITEM_HEIGHT + 'px'

      // 2. 一屏最多渲染的条数（ceil 保证滚动中不露底）
      const visibleCount = Math.ceil(VIEW_HEIGHT / ITEM_HEIGHT)

      let renderedStart = -1      // 当前渲染窗口起点缓存
      let ticking = false         // requestAnimationFrame 节流

      function render() {
        ticking = false
        // 3. scrollTop 反推起始索引，向上多渲染 BUFFER 条
        const start = Math.max(
          0,
          Math.floor(scrollBox.scrollTop / ITEM_HEIGHT) - BUFFER
        )
        const end = Math.min(TOTAL, start + visibleCount + BUFFER * 2)

        if (start === renderedStart) return   // 窗口没变，不重渲染
        renderedStart = start

        // 4. 用 DocumentFragment 离线拼装，一次性插入
        const fragment = document.createDocumentFragment()
        for (let i = start; i < end; i++) {
          const div = document.createElement('div')
          div.className = 'item'
          div.textContent = '第 ' + (i + 1) + ' 条数据'
          fragment.appendChild(div)
        }
        renderList.innerHTML = ''
        renderList.appendChild(fragment)

        // 5. 渲染窗口整体偏移到正确视觉位置（只改 transform，不触发布局）
        renderList.style.transform =
          'translateY(' + start * ITEM_HEIGHT + 'px)'
      }

      // 6. 监听滚动，rAF 节流到每帧最多渲染一次
      scrollBox.addEventListener('scroll', () => {
        if (!ticking) {
          ticking = true
          requestAnimationFrame(render)
        }
      })

      render() // 首屏渲染
    </script>
  </body>
  </html>
  ```

- 关键细节：`visibleCount` 用 `Math.ceil`；缓冲区 BUFFER 是为了快速滚动时不闪白；偏移用 `transform` 而不是 `top`，前者走合成层不触发重排；重渲染前先比对 `renderedStart` 避免无效更新。
- 不定高场景的通用解法：维护 `estimatedHeight`（预估）与 `measuredCache`（实测 Map），渲染后用 `ResizeObserver` 实测真实高度回写缓存；startIndex 通过"缓存前缀和 + 二分查找"定位；总高度 = 已测部分之和 + 未测数量 × 预估，滚动中不断修正，可能出现轻微跳动，可用"锚点补偿"（记录偏移差值反向修正 scrollTop）优化。
- 快速滚动白屏的兜底：加大缓冲区、用骨架屏占位、或 `content-visibility: auto` 配合 `contain-intrinsic-size` 让浏览器跳过屏外渲染（CSS 原生虚拟化思路）。

**加分项（P7 视角）**：

- 性能权衡：DOM 数量从 10 万降到 ~25 个，内存占用从数百 MB 降到 KB 级；但滚动中的"重建节点 + GC"有成本，优化方向是复用节点池（只改文本与位置，不销毁重建）和差量更新。
- 生产实现对照：`react-virtualized`/`react-window` 的 `FixedSizeList` 与上述定高版同构；`vue-virtual-scroller` 支持动态高度的 `DynamicScroller` 采用"预估 + 实测 + 重排补偿"三段式；面试能手写定高版并能讲清动态版策略即达标。
- 横向对比：`content-visibility: auto` 是"渲染虚拟化"（DOM 仍在，跳过布局绘制），长列表 DOM 本身仍占内存；JS 虚拟列表是"DOM 虚拟化"，两者可叠加。
- 生产案例：埋点方案里虚拟列表的曝光统计必须在"渲染窗口变化"时机打点而不是 scroll 时机，否则快速划过的条目会漏报；编辑器场景（代码编辑器 Monaco）用虚拟化 + 固定行高 + 同步测量，是其百万行流畅滚动的基础。

## Q：什么是语义化与可访问性（a11y）？ARIA、tab 顺序、无障碍审计怎么做？

**核心答案**：语义化是用最准确的 HTML 标签表达内容结构（`header/nav/main/article/section/aside/footer`、按钮用 `<button>` 而不是 `<div>`），浏览器据此构建"可访问性树"（accessibility tree），屏幕阅读器、搜索引擎、浏览器扩展都消费这棵树。ARIA（`role`、`aria-*`）只在原生标签无法表达时做补充，第一法则是"能原生不 ARIA"（ARIA 的第一规则）。tab 顺序由 DOM 顺序决定，`tabindex="0"` 加入 tab 序、`"-1"` 可编程聚焦但不进 tab 序、正值会破坏自然顺序必须避免。审计用 Lighthouse/axe 自动扫描 + 键盘走查 + 屏幕阅读器（NVDA/VoiceOver）人工验证。

**知识点解析**：

- 语义化标签的分层结构：

  ```html
  <body>
    <header><!-- 页头：logo、标题 -->
      <nav aria-label="主导航"><!-- 导航区 -->
        <ul>
          <li><a href="/home">首页</a></li>
          <li><a href="/about" aria-current="page">关于</a></li>
        </ul>
      </nav>
    </header>
    <main><!-- 每页唯一的主内容区 -->
      <article>
        <h1>文章标题</h1>
        <section aria-labelledby="s1"><h2 id="s1">小节</h2></section>
      </article>
      <aside><!-- 侧边相关内容 --></aside>
    </main>
    <footer><!-- 页脚 --></footer>
  </body>
  ```

- ARIA 三板斧：`role` 定义角色（如 `role="tablist"`、`role="dialog"`）、`aria-*` 状态属性（`aria-expanded`、`aria-checked`、`aria-disabled`）、`aria-label`/`aria-labelledby` 提供可读名称。经典误区：`<div role="button">` 需要补齐键盘支持（Enter/Space 触发、`tabindex`），否则比不写更糟。
- `tabindex` 语义表：

  | 值 | 效果 | 使用建议 |
  | --- | --- | --- |
  | 不写 | 天然可聚焦元素按 DOM 顺序 | 默认行为，优先 |
  | `0` | 任意元素加入 tab 序 | 自定义交互组件必须加 |
  | `-1` | 不进 tab 序，但可 `focus()` | 焦点管理（弹窗聚焦、`focus()` 回落） |
  | 正值 | 强制插队到 tab 序最前 | 永远别用，破坏全站顺序 |

- 弹窗焦点管理清单：打开时焦点移入弹窗（首个可交互元素或容器 `tabindex="-1"`）、内部 tab 循环（焦点陷阱）、Esc 关闭、关闭后焦点还给触发器——这套是 a11y 面试的必答题。
- 审计工具链：CI 里跑 `@axe-core/playwright` 或 Lighthouse 的 a11y category（底层都是 axe 规则）；`window.addEventListener('keydown')` 拔掉鼠标纯键盘走查；开发期浏览器 DevTools 的 Accessibility 面板可以直接查看元素的可访问性树。
- `aria-live="polite"`（打断不急时播报）与 `aria-live="assertive"`（立即播报）用于异步内容播报；`alt` 文本描述图片用途而非"图片"二字；装饰性图片用 `alt=""`。

**加分项（P7 视角）**：

- 规范层面：WAI-ARIA 1.2 定义了 role 分类（widget / document / landmark / live region 等）；HTML AAM（Accessibility API Mappings）规定每种 HTML 元素如何映射到各平台 API（Windows UIA、macOS AX API），原生元素映射是浏览器内置的，ARIA 是手动补映射——这就是"原生优先"的技术根源。
- 合规视角：国内《信息无障碍通用设计规范》与国际 ADA / EN 301 549 / WCAG 2.1（A/AA/AAA 分级）是 toB 与出海项目的硬要求，政府、金融、教育类项目审计不过会直接丢单；WCAG 的 POUR 原则（可感知、可操作、可理解、鲁棒）是方案评审的通用话术。
- 生产案例：自动审计只能覆盖约 30% 的 WCAG 问题（颜色对比度、焦点顺序、语义误用大头都要靠人工）；常见事故是"骨架屏 div 无 role 导致读屏用户看到一串空白"、"loading 未用 aria-busy"、"路由跳转后焦点仍留在旧位置"（SPA 通用病，需要在路由切换后 `focus()` 到 main 并加 `tabindex="-1"`）。
- 工程化：ESLint 插件 `jsx-a11y` / `vue-a11y` 在编码期拦截（如 `no-static-element-interactions`）；Storybook 的 a11y 插件逐组件跑 axe，把无障碍左移到开发阶段。

<!-- CONTINUE -->

## Q：表单进阶：FormData、原生校验 API、File / Blob / FileReader 与流式上传？

**核心答案**：`FormData` 把表单序列化为 `multipart/form-data` 键值对（含文件），可直接作为 `fetch` 的 body。原生校验有两层：声明式属性（`required`、`pattern`、`min/max/step`、`type=email` 等）+ 命令式 API（`checkValidity()`、`reportValidity()`、`setCustomValidity()`，配合 `:valid/:invalid` 伪类）；`novalidate` 可以关掉默认气泡自己接管提示。`File` 继承自 `Blob`，文件读取主要靠 `FileReader`（异步，有 onprogress）或 `blob.arrayBuffer()/text()`（Promise 风格）；大文件上传的现代方案是 `file.stream()` 拿到 `ReadableStream` 做分片 + 并发 + 进度上报，或者直接流式 POST。

**知识点解析**：

- FormData 基本用法与注意点：

  ```js
  const form = document.querySelector('form')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(form) // 一行拿走全部字段
    fd.append('role', 'admin')    // 追加字段
    fd.append('avatar', fileInput.files[0], 'avatar.png') // 追加文件

    // 注意一：不要手动设置 Content-Type，浏览器会带 boundary
    const res = await fetch('/api/user', { method: 'POST', body: fd })

    // 注意二：JSON 想进 FormData 只能是字符串
    fd.append('meta', JSON.stringify({ from: 'h5' }))
  })
  ```

- 原生校验 API 全家桶：

  ```js
  const input = document.querySelector('input[name=email]')

  input.checkValidity()                    // 校验并返回布尔（不弹 UI）
  input.reportValidity()                   // 校验 + 触发默认错误气泡
  input.setCustomValidity('该邮箱已被注册') // 自定义错误文案
  input.validity                          // 状态对象：valueMissing / patternMismatch / tooShort ...

  input.addEventListener('invalid', () => { // 提交时逐字段触发
    input.setAttribute('aria-invalid', 'true')
  })

  form.noValidate = true // 等价于 novalidate 属性：自己接管全部提示
  ```

- Blob / File / FileReader 关系：`Blob` 是不可变二进制数据的抽象（`type`、`size`、`slice`）；`File` 是带文件名和最后修改时间的 Blob；`FileReader` 异步读取为 `Data URL`、文本或 `ArrayBuffer`，图片本地预览的两种方式：

  ```js
  // 方式一：FileReader 转成 Data URL（base64，体积膨胀约 33%）
  const reader = new FileReader()
  reader.onload = (e) => (img.src = e.target.result)
  reader.readAsDataURL(file)

  // 方式二：createObjectURL 生成 blob: 临时 URL（更快，需手动 revoke）
  const url = URL.createObjectURL(file)
  img.src = url
  img.onload = () => URL.revokeObjectURL(url)
  ```

- 流式 / 分片上传核心思路：`file.slice(start, end)` 切块并发上传，全部成功后请求合并；进度用 XHR 的 `upload.onprogress`（fetch 需包一层 `ReadableStream` 计数才能做进度）：

  ```js
  async function uploadBigFile(file, chunkSize = 5 * 1024 * 1024) {
    const chunks = Math.ceil(file.size / chunkSize)
    const results = await Promise.all(
      Array.from({ length: chunks }, (_, i) => {
        const blob = file.slice(i * chunkSize, (i + 1) * chunkSize)
        const fd = new FormData()
        fd.append('file', blob)
        fd.append('index', i)
        return fetch(`/api/upload/chunk?name=${file.name}`, {
          method: 'POST',
          body: fd,
        })
      })
    )
    return fetch(`/api/upload/merge?name=${file.name}&total=${chunks}`, {
      method: 'POST',
    })
  }
  ```

- `file.stream()` 返回 `ReadableStream`，配合 `TextDecoderStream` 等转换流可以在读取的同时逐块处理（边下边解压、大文件逐行解析），这是响应式处理大文件的正统姿势。

**加分项（P7 视角）**：

- 规范层面：`FormData` 遍历时的顺序与表单字段顺序一致；`form.requestSubmit()` 会带上 submitter 触发完整提交流程（含校验），比 `form.submit()`（跳过校验、不触发 submit 事件）语义正确——这是自动登录脚本踩坑点。
- 性能权衡：大文件预览用 `createObjectURL`（零拷贝、快）优于 `readAsDataURL`（base64 膨胀）；但 blob URL 生命周期挂到 document，必须 `revokeObjectURL` 否则内存常驻。
- 生产案例：网盘类上传的完整链路是"前端计算文件 hash（spark-md5 分片增量算）→ 秒传接口探测 → 已存在则跳过 → 断点续传按已传分片差量补传"，虚拟列表同源思想是"把 O(全量) 的操作降为 O(增量)"。
- `showOpenFilePicker` / `showSaveFilePicker`（File System Access API）可以拿到可写文件句柄，实现在线编辑器"直接保存回本地"，是传统 input file 的下一代方案。

## Q：iframe 通信：postMessage 与目标 Origin 校验怎么做？sandbox 属性有什么用？

**核心答案**：跨域 iframe 无法互相读取 DOM 和变量，唯一通道是 `otherWindow.postMessage(message, targetOrigin)`；接收方在 `message` 事件里必须校验 `event.origin` 是否在白名单内，否则等于向任意页面广播数据。`targetOrigin` 参数必须写精确源（如 `https://a.com`），写 `*` 会失去发送侧的保护（双向都不校验，且 `File` 等结构化克隆对象通道可能被降级）。`sandbox` 属性通过"默认全禁、逐项放行"的白名单模型约束 iframe 内脚本的能力，是嵌入不可信第三方页面的安全围栏。

**知识点解析**：

- 基本通信（父到子 / 子到父）：

  ```js
  // ===== 父页面：发送并接收回信 =====
  const iframe = document.querySelector('iframe')

  // 必须等 iframe 加载完成，否则 contentWindow 可能拿不到监听器
  iframe.addEventListener('load', () => {
    iframe.contentWindow.postMessage(
      { type: 'PARENT_HELLO', payload: 'hi' },
      'https://child.com' // 目标 Origin：不是自己的 Origin，是对面子的
    )
  })

  window.addEventListener('message', (e) => {
    if (e.origin !== 'https://child.com') return // 回信也要校验来源
    if (e.data?.type === 'CHILD_REPLY') console.log('收到子页面回信', e.data.payload)
  })

  // ===== 子页面（https://child.com）=====
  window.addEventListener('message', (e) => {
    if (e.origin !== 'https://parent.com') return // 第一道闸：校验来源
    if (e.data?.type === 'PARENT_HELLO') {
      e.source.postMessage(
        { type: 'CHILD_REPLY', payload: 'pong' },
        e.origin // 回信目标用 e.origin 而不是硬编码，更稳
      )
    }
  })
  ```

- 安全面试清单：发送侧 `targetOrigin` 不写 `*`；接收侧校验 `event.origin`；数据本身也做格式与字段校验（白名单 type + zod 校验式兜底）；`event.source` 校验是否预期窗口。
- `sandbox` 常用放行项：

  ```html
  <!-- 不写 sandbox：iframe 拥有完整能力（同源时可操作父页面） -->
  <!-- 空值 sandbox=""：禁掉脚本、表单、弹窗、同源访问等一切 -->

  <iframe
    src="https://untrusted.com/embed"
    sandbox="allow-scripts allow-forms"
  ></iframe>
  <!-- allow-scripts：允许跑脚本 -->
  <!-- allow-forms：允许提交表单 -->
  <!-- allow-same-origin：允许保留同源（能读 cookie/storage/DOM） -->
  <!-- allow-popups：允许 window.open -->
  <!-- allow-downloads / allow-modals / allow-top-navigation 等 -->

  <!-- 巨坑：allow-scripts + allow-same-origin 同时开，
       且 iframe 内容与宿主同源时，脚本可以删掉自己的 sandbox 属性 -->
  ```

- 补充属性：`allow="camera; microphone; fullscreen"`（Feature Policy/Permissions Policy）控制页面级能力授权，与 sandbox 是互补关系——sandbox 管"行为"，allow 管"能力"。

**加分项（P7 视角）**：

- 规范层面：`postMessage` 的消息经结构化克隆传输，`Function`、`DOM` 节点、`Symbol` 不可传；`Transferable`（`ArrayBuffer`、`MessagePort`）可零拷贝转移——把 `MessageChannel` 的 port 转给 iframe，可以建立点对点私有通道，彻底避免广播。
- 安全权衡：同源 iframe 可以直接 `contentDocument` 操作 DOM，无需 postMessage；跨域时 `contentDocument` 只能读到 `null`（同源策略），但 `contentWindow` 始终可拿（跨域只能 postMessage）。`event.origin` 是浏览器注入、不可伪造的，这是整套校验的信任根。
- 生产案例：微前端 qiankun 的父子通信本质是封装好的 postMessage + origin 校验 + 事件订阅；第三方支付回调页、地图组件、视频播放器都是实战场景；`SameSite=Lax/Strict` cookie 时代下，第三方 iframe 里的登录态默认带不上，需要 `SameSite=None; Secure` 显式声明或令牌后传。
- 反向风险：`window.open` 打开的页面与 opener 之间也是同样的 postMessage 模型，但 `window.opener` 指针需要 `rel="noopener"` 切断（tab-nabbing 钓鱼攻击），这与 iframe 同源策略一起构成"跨窗口安全"的完整考点。

## Q：history API 与 hash 路由的原理？如何手写一个 SPA 路由（监听 popstate）？

**核心答案**：hash 路由利用 `URL#` 后面的部分变化**不会发起请求、不会刷新页面**的特性，通过监听 `hashchange` 事件驱动视图更新，兼容所有浏览器（含 IE8）且不需要服务端配合。history 路由依赖 History API 的 `pushState(state, title, url)` 和 `replaceState`——它们能修改地址栏并操作历史栈**而不触发任何事件、不发请求**，跳转靠代码主动调用；用户点后退/前进按钮时浏览器触发 `popstate` 事件（注意：`pushState/replaceState` 本身不触发 `popstate`）。history 模式 URL 更干净，但刷新时服务端必须把所有路径兜底到入口 HTML，否则 404。

**知识点解析**：

- 两种模式的本质差异：

  | 维度 | hash 模式 | history 模式 |
  | --- | --- | --- |
  | URL 形态 | `/#/user?id=1` | `/user?id=1` |
  | 是否发请求 | 永不发（# 后不发服务器） | 刷新/直接访问会发 |
  | 路由变化事件 | `hashchange` | `popstate`（仅导航键触发） |
  | 服务端配置 | 无需 | 需 fallback 到 index.html |
  | SEO | 较差 | 较好 |
  | 兼容性 | 全部浏览器 | HTML5 起 |

- History API 核心：`pushState(state, title, url)` 压栈并改地址（同源限制）、`replaceState` 替换当前记录、`back()/forward()/go(n)` 编程式导航、`popstate` 事件的 `event.state` 取出当时存入的 state 对象、`window.onbeforeunload` 拦截真正离开。
- 手写完整 SPA 路由（hash 与 history 双模式，新建 html 文件直接打开即可运行）：

  ```html
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>手写 SPA 路由</title>
    <style>
      nav a { margin-right: 12px; }
      #view { padding: 24px; border: 1px solid #ccc; margin-top: 16px; }
      .active { color: #fff; background: #42b983; padding: 4px 8px; }
    </style>
  </head>
  <body>
    <nav>
      <!-- history 模式用普通路径，hash 模式用 # 路径，都能跑 -->
      <a href="/" data-link>首页</a>
      <a href="/about" data-link>关于</a>
      <a href="/user/42" data-link>用户 42</a>
      <button onclick="router.go('/about')">编程式跳转</button>
      <button onclick="history.back()">后退</button>
    </nav>
    <div id="view"></div>

    <script>
      // ===== 1. 路由表：模式匹配 + 动态参数 =====
      const routes = [
        { path: '/', render: (params, query) => '<h1>首页</h1>' },
        { path: '/about', render: () => '<h1>关于页</h1>' },
        { path: '/user/:id', render: (p, q) =>
          '<h1>用户 ' + p.id + '</h1><p>query: ' + JSON.stringify(q) + '</p>' },
      ]

      // ===== 2. 抽象路由器（构造时选模式）=====
      function createRouter(mode) {
        function getRoute() {
          // hash 模式取 # 后面的部分；history 模式取 pathname
          const raw = mode === 'hash'
            ? location.hash.slice(1) || '/'
            : location.pathname
          const [pathname, search = ''] = raw.split('?')
          const query = Object.fromEntries(new URLSearchParams(search))
          // 逐条匹配：把 /user/:id 编译成正则
          for (const route of routes) {
            const pattern = route.path.replace(/:([^/]+)/g, '([^/]+)')
            const match = pathname.match(new RegExp('^' + pattern + '/?$'))
            if (match) {
              const keys = (route.path.match(/:([^/]+)/g) || []).map(k => k.slice(1))
              const params = Object.fromEntries(keys.map((k, i) => [k, match[i + 1]]))
              return { route, params, query }
            }
          }
          return { route: { render: () => '<h1>404</h1>' }, params: {}, query: {} }
        }

        function renderView() {
          const { route, params, query } = getRoute()
          document.getElementById('view').innerHTML = route.render(params, query)
          // 同步高亮：把当前路径写回导航
          document.querySelectorAll('nav a[data-link]').forEach((a) => {
            a.classList.toggle('active', a.getAttribute('href') === getRoute().pathnameHash || a.getAttribute('href') === location.pathname)
          })
        }

        function navigate(path, replace) {
          if (mode === 'hash') {
            location.hash = '#' + path          // 触发 hashchange
            if (replace) location.replace('#' + path)
          } else {
            const url = location.origin + path
            replace ? history.replaceState({ path }, '', url)
                    : history.pushState({ path }, '', url)
            renderView()                        // pushState 不触发 popstate，必须手动渲染
          }
        }

        // ===== 3. 事件监听：两种模式各挂各的 =====
        if (mode === 'hash') {
          window.addEventListener('hashchange', renderView)
        } else {
          // popstate 只在"后退/前进/go/back"时触发
          window.addEventListener('popstate', renderView)
          // 拦截 <a> 点击，阻止默认跳转，改为 pushState
          document.addEventListener('click', (e) => {
            const a = e.target.closest('a[data-link]')
            if (!a) return
            e.preventDefault()
            navigate(new URL(a.href, location.origin).pathname)
          })
        }

        renderView() // 首屏渲染
        return { navigate, go: (p) => navigate(p) }
      }

      // ===== 4. 启动：本地 file:// 打开请用 hash；配了服务端 fallback 可用 history =====
      const useHistory = location.protocol.startsWith('http')
      const router = createRouter(useHistory ? 'history' : 'hash')
    </script>
  </body>
  </html>
  ```

- 关键实现细节：`pushState` 之后必须**手动调用一次渲染**（这是 history 模式与 hash 模式最大的实现差异）；`popstate` 里拿不到"目标路径"只能读 `location`；`<a>` 拦截要 `preventDefault` 再 `navigate`，否则整页刷新；动态参数用 `:id` 编译为正则捕获组匹配。
- 导航守卫的扩展点：在 `navigate` 与 `popstate` 处理里插入 `beforeEach(to, from, next)` 队列，异步守卫（鉴权）用 Promise 串行执行，取消导航的方式是"不渲染且 `history.pushState` 回退"。

**加分项（P7 视角）**：

- 规范层面：History API 的 url 参数受同源限制（跨域会抛错）；`pushState` 的 state 对象经结构化克隆存储（约 640KB 上限，Safari 曾严格到 100KB 并对 `state` 直接 `null`），刷新后 `event.state` 仍可还原，这是"路由状态持久化"的正规姿势（vue-router 的 `history.state` 里存了 `current` 与滚动位置键）。
- scroll restoration：`history.scrollRestoration = 'manual'` 接管滚动恢复，SPA 需要自己缓存每个路由的 `scrollY`，在 `popstate`（后退）时恢复、pushState（前进）时滚回顶部——vue-router 4 与 React Router 6 都内置了这套逻辑。
- 生产事故：history 模式上线忘记配 nginx `try_files $uri $uri/ /index.html`，用户刷新白屏 404 是最高频的发布事故；hash 模式做 SEO 时需要 SSR 渲染 `<meta>` 与首屏（`#` 后内容不进搜索引擎），微信分享的落地页参数曾被 `#` 截断（hash 参数在分享链路丢失），要改用 history 或 query 传参。
- 框架对照：vue-router 4 的 `createWebHistory` 用 `popstate + pushState`，`createWebHashHistory` 用 `hashchange`，其内部正是上文这套"事件驱动 + 路由表匹配 + 守卫队列"的工程化封装；React Router 6 进一步把路由匹配抽象成 `@remix-run/router` 的评分制（specificity）匹配，比正则逐条匹配更精确。

## Q：剪贴板、通知、全屏、Web Share 等 Web API 的权限模型是怎样的？

**核心答案**：现代 Web API 采用"**分层门控**"模型：先检查 API 是否存在（能力检测），再要求**安全上下文**（HTTPS 或 localhost），再要求**用户激活**（transient activation，即最近有用户手势），最后才是**用户授权**（弹窗询问，结果分为 granted / denied / prompt 三态，可用 Permissions API 查询）。剪贴板写入需要手势但不弹窗、读取需要授权（防"剪贴板嗅探"）；通知必须显式 `requestPermission()` 且由用户选择；全屏要求手势触发、iframe 需 `allow="fullscreen"`；Web Share 只需用户激活不弹系统权限框，但只能拉起系统分享面板。

**知识点解析**：

- 权限模型分层金字塔（从下往上逐级收紧）：

  | 层级 | 机制 | 典型代表 |
  | --- | --- | --- |
  | 能力检测 | `'xxx' in navigator` | 所有 API 的第一步 |
  | 安全上下文 | `window.isSecureContext`，仅 HTTPS/localhost | 剪贴板、通知、分享、全屏 |
  | 用户激活 | 用户手势后短时间窗口（点击/按键） | 剪贴板写、全屏、Web Share、弹窗 |
  | 用户授权 | 浏览器弹窗，granted/denied/prompt | 通知、地理位置、剪贴板读 |
  | 委托策略 | iframe 的 `allow` 属性 / Permissions-Policy 头 | 全屏、通知、摄像头在嵌入场景 |

- Permissions API 统一查询三态与订阅变化：

  ```js
  async function checkPermission(name) {
    // name 如 'notifications'、'geolocation'、'clipboard-read'
    const status = await navigator.permissions.query({ name })
    console.log(status.state) // 'granted' | 'denied' | 'prompt'
    status.onchange = () => console.log('权限变化为', status.state)
    return status.state
  }
  // 注意：denied 后不会再弹窗，只能引导用户去浏览器设置里手动重置
  ```

- 剪贴板：写要手势、读要授权：

  ```js
  // 写入：需要 transient activation（点击等手势的直接调用栈内），不弹窗
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText('https://example.com')
  })

  // 读取：Chrome 走权限三态 + 弹窗；Safari 弹"粘贴"确认按钮（更强交互）
  button.addEventListener('click', async () => {
    const text = await navigator.clipboard.readText() // 可能抛 NotAllowedError
  })

  // 兼容降级：execCommand 已废弃但兼容性最好（同样要求手势）
  function legacyCopy(text) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  ```

- 通知：先请求、后展示，PWA 场景必须走 Service Worker：

  ```js
  async function askAndNotify() {
    const permission = await Notification.requestPermission() // 旧版是回调式
    if (permission !== 'granted') return
    // 页面内直接弹（仅桌面有效，移动端部分浏览器不支持）
    new Notification('标题', { body: '内容', icon: '/logo.png' })
    // PWA 正道：注册 SW 后由它展示（可离线、可配合 Push API）
    const reg = await navigator.serviceWorker.ready
    reg.showNotification('标题', {
      body: '内容',
      tag: 'order-1',       // 同 tag 覆盖旧通知
      data: { url: '/order' }, // 点击跳转数据
    })
  }
  ```

- 全屏：元素级请求，必须手势内调用：

  ```js
  button.addEventListener('click', async () => {
    try {
      await document.documentElement.requestFullscreen() // 必须用户激活
    } catch (e) {
      console.error('全屏失败', e) // 嵌套 iframe 未授权时抛错
    }
  })

  document.addEventListener('fullscreenchange', () => {
    console.log('当前全屏元素：', document.fullscreenElement)
  })
  // iframe 内全屏需要父页面放行：<iframe allow="fullscreen">
  ```

- Web Share：只做"拉起系统面板"，无独立权限位：

  ```js
  button.addEventListener('click', async () => {
    if (!navigator.share) return // 桌面 Chrome 长期不支持，桌面 Safari 支持
    try {
      await navigator.share({ title: '标题', text: '内容', url: location.href })
    } catch (e) {
      console.log('用户取消了分享') // AbortError，不算异常事故
    }
  })
  ```

- 通用错误处理清单：API 不存在（`!navigator.clipboard`）、非安全上下文（http 下 API 直接 undefined）、无手势（NotAllowedError / InvalidStateError）、权限拒绝（NotAllowedError）、iframe 未授权（全屏/通知的 PermissionDeniedError）。

**加分项（P7 视角）**：

- 规范层面：transient activation 是 HTML 规范定义的"短期激活"概念（点击后约 5 秒内有效、且被某些 API 消耗后失效），sticky activation 则是"本次会话曾经交互过"；Permissions API 规范试图统一各 API 的权限名（如 `clipboard-read`、`clipboard-write`），但各浏览器支持矩阵残缺，生产上通常"查得到就查、查不到直接调用再 catch"。
- 安全权衡：剪贴板读取是敏感面——任意页面静默读剪贴板等于偷密码管理器刚复制的密码，所以 Chrome 设计成"三态权限 + 弹窗"、Safari 更激进地要求用户在原生菜单里点"粘贴"；反过来 `paste` 事件里读 `e.clipboardData` 不需要权限，因为动作由用户 Ctrl+V 发起，授权已经隐含在手势里。
- 生产案例：iOS 16.4 起 PWA "添加到主屏幕"后才支持 Web Push（先 `requestPermission` 再 `subscribe` 拿 endpoint）；国内微信内置浏览器不支持 Notification 与大部分权限弹窗，分享一律接 JS-SDK；企业内网 http 环境下 `navigator.clipboard` 是 undefined，只能退回 execCommand，这是内网系统复制功能失效的经典工单。
- 权限被拒的产品自救：`denied` 是终态、代码无法再次唤起弹窗，标准做法是检测到 denied 后展示引导层（"请点击地址栏左侧图标 → 网站设置 → 开启通知"），并提供降级路径（通知拒给就改轮询、剪贴板读被拒就提供手动粘贴框）。

## Q：Canvas 和 SVG 如何选型？高 DPI 如何适配？离屏渲染 OffscreenCanvas 是什么？

**核心答案**：Canvas 是**立即模式**（immediate mode）位图绘制——JS 调用一次画一笔，浏览器不保留图形对象，改一个元素也要整体重画，适合高频重绘、海量图元、像素操作（游戏、图表、粒子、视频处理）。SVG 是**保留模式**（retained mode）矢量 DOM——每个图形是一个节点、可单独事件与 CSS 样式、无限缩放不糊，适合静态或低频交互的图形（图标、流程图、地图、大屏可视化）。高 DPI 适配的核心是 `devicePixelRatio`：把 canvas 的像素宽高放大 dpr 倍、CSS 尺寸保持不变、再用 `ctx.scale(dpr, dpr)` 抹平坐标系，否则在 2x/3x 屏上全是毛边。`OffscreenCanvas` 把 canvas 的绘制搬到 Worker 线程执行，绘制不占主线程，还可以配合 `transferControlToOffscreen` 实现完全后台渲染。

**知识点解析**：

- 选型对比表：

  | 维度 | Canvas | SVG |
  | --- | --- | --- |
  | 渲染模式 | 立即模式（画完即忘） | 保留模式（DOM 常驻） |
  | 图元数量 | 数万级无压力 | 千级以上 DOM 与命中测试变慢 |
  | 事件处理 | 只能监听 canvas 整体，自行做几何命中 | 每个元素原生事件 + a11y |
  | 缩放 | 位图，放大模糊（需重设尺寸重画） | 矢量，无损缩放 |
  | CSS / 动画 | JS 驱动重绘 | CSS、SMIL、原生 transition |
  | 文本与 SEO | 无障碍与搜索引擎不可见 | 是 DOM，可读可搜 |
  | 适用 | 游戏、热力图、粒子、大数据图表 | 图标、图标系统、流程图、交互地图 |

- 高 DPI 适配完整代码（含 resize 监听）：

  ```js
  function setupCanvas(canvas, cssWidth, cssHeight) {
    const dpr = window.devicePixelRatio || 1 // 2x 屏是 2，3x 屏是 3，缩放页面时还会变
    // 1. CSS 尺寸：决定布局上占多大空间
    canvas.style.width = cssWidth + 'px'
    canvas.style.height = cssHeight + 'px'
    // 2. 像素尺寸：物理像素必须是 CSS 尺寸 × dpr，才有足够采样密度
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    // 3. 把坐标系缩回去：后续代码继续按 CSS 像素画，线条粗细/字号不变
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    return ctx
  }

  // 组件初始化：容器尺寸变化时重建（ResizeObserver 比窗口 resize 更准）
  const canvas = document.querySelector('canvas')
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    const ctx = setupCanvas(canvas, width, height)
    draw(ctx) // 重设 width 会清空画布并重置状态，必须整体重画
  })
  ro.observe(canvas.parentElement)
  ```

- 关键坑：直接改 `canvas.width` 会**清空画布并重置所有状态**（变换、样式），所以 dpr 缩放必须每次重画时重做；`devicePixelRatio` 在用户缩放页面（Ctrl+加减）时会变，需要监听 `matchMedia('(resolution: ' + dpr + 'dppx)')` 的 change；导出图片时若想固定清晰度，可以离屏建一个 dpr 倍的 canvas 画完再 `toDataURL`。
- OffscreenCanvas 的两种用法：

  ```js
  // 用法一：Worker 里从零创建，画完转成 Blob 回传主线程
  // main.js
  const worker = new Worker('render-worker.js')
  worker.postMessage({ width: 800, height: 600 })
  worker.onmessage = (e) => {
    const blob = e.data // 离屏画布转换成的 Blob
    const url = URL.createObjectURL(blob)
    document.querySelector('img').src = url
  }

  // render-worker.js
  onmessage = (e) => {
    const { width, height } = e.data
    const off = new OffscreenCanvas(width, height) // Worker 里没有 DOM，但没有 canvas 就没有 2D/WebGL
    const ctx = off.getContext('2d')
    // ... 复杂绘制：热力图插值、图像卷积，全都不阻塞主线程
    const blob = off.convertToBlob({ type: 'image/png' })
    postMessage(blob)
  }
  ```

  ```js
  // 用法二：把页面上的 canvas 控制权整体移交给 Worker（一次性、不可逆）
  const canvas = document.querySelector('canvas')
  const off = canvas.transferControlToOffscreen() // 此后主线程不能再碰它
  const worker = new Worker('render-worker.js')
  worker.postMessage({ canvas: off }, [off]) // Transferable 零拷贝移交

  // render-worker.js 里直接对它 getContext + rAF 循环：
  // 每帧绘制都在 Worker，主线程只负责布局与交互 —— 服务器端渲染大屏常用
  ```

- OffscreenCanvas 的兼容性：Chrome/Edge/ Safari 16.4+ 支持 2D，Firefox 105+ 支持；不支持时降级为主线程绘制（`typeof OffscreenCanvas === 'undefined'` 检测）。

**加分项（P7 视角）**：

- 性能权衡：SVG 慢在"DOM 管理 + 样式重算 + 命中测试"，Canvas 慢在"主线程 JS 绘制"，海量图元的行业方案是混合架构——ECharts 用 Canvas/SVG 双引擎按图元数量切换，地图类（如 Mapbox GL）用 WebGL 把绘制交给 GPU；`desynchronized: true` 的 context 属性可降低输入延迟（游戏/笔迹场景），`alpha: false` 可省去合成透明度的开销。
- dpr 的极端场景：3x 手机屏 + Windows 缩放 150% 时 dpr 可能是 4.5，8000×4000 的 canvas 会撞显存/纹理上限（Safari 约 16384px 或总面积限制），大屏可视化要"分区 tile + 视口内重画"而不是无脑放大；视频弹幕场景通常反过来把 dpr 钳制在 1.5 以内在清晰度与性能间折中。
- 生产案例：签名板必须存矢量轨迹（重绘时 dpr 适配无损）而不是只存位图；`html2canvas` 类截图在 2x 屏糊就是因为它内部 canvas 没乘 dpr；Chrome 的 `canvas` 在 dpr 变化时会触发 `ResizeObserver`（CSS 尺寸没变但快照需要更新），不少图表库因此改用 rAF 轮询尺寸。
- 规范层面：OffscreenCanvas 与 `transferControlToOffscreen` 定义在 HTML Standard（canvas 章节），其设计动机就是"把 DOM 相关的呈现与纯计算绘制解耦"，与 WebGL 的 `commit()` 配合可实现 Worker 内多帧渲染；这也解释了它为何不可逆——渲染管线一旦移交，主线程的 canvas 只剩合成层占位。

## Q：Web Component 是什么？Shadow DOM 如何实现样式隔离？custom element 生命周期有哪些？

**核心答案**：Web Component 是浏览器原生的组件化标准，由三项技术组成：**Custom Elements**（注册自定义标签并挂生命周期）、**Shadow DOM**（在元素内创建一棵隔离的影子 DOM 树，样式与外界互不穿透）、**HTML Templates**（`<template>` 内容不渲染但可克隆复用）。Shadow DOM 的隔离是双向的：外层页面 CSS 选择器默认选不进 shadow 内部（`:host` 只能影响宿主自身），shadow 内的样式也不会泄漏出去，从根上解决了全局 CSS 污染。custom element 生命周期是：`constructor`（升级时，禁止改属性）→ `connectedCallback`（插入文档）→ `disconnectedCallback`（移出文档）→ `attributeChangedCallback`（`observedAttributes` 声明的属性变化）→ `adoptedCallback`（移入新 document，如 iframe）。

**知识点解析**：

- 一个完整的最小组件（模板 + 样式隔离 + 生命周期）：

  ```html
  <!DOCTYPE html>
  <html lang="zh-CN">
  <body>
    <!-- 1. template：内容 inert，不渲染、不发请求、可克隆 -->
    <template id="tpl">
      <style>
        /* 这些样式只作用于 shadow 内部，页面上的 button { } 选不进来 */
        :host { display: inline-block; }        /* :host 指宿主元素自身 */
        :host([type="primary"]) .btn {           /* 响应宿主身上的属性 */
          background: #42b983; color: #fff;
        }
        .btn { padding: 6px 16px; border: 1px solid #ccc; cursor: pointer; }
      </style>
      <button class="btn"><slot></slot></button>
      <!-- slot：把外部传进来的子内容投影到 shadow 内部指定位置 -->
    </template>

    <my-button type="primary">提交</my-button>

    <script>
      class MyButton extends HTMLElement {
        static get observedAttributes() {
          return ['type'] // 只有这里声明的属性变化才触发 attributeChangedCallback
        }

        constructor() {
          super()
          // open：外界可通过 element.shadowRoot 访问；closed 则拿不到引用
          this.attachShadow({ mode: 'open' })
          const tpl = document.getElementById('tpl')
          this.shadowRoot.appendChild(tpl.content.cloneNode(true))
          this.shadowRoot.querySelector('.btn').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('my-click', { detail: { v: 1 } }))
          })
        }

        connectedCallback() {
          // 插入文档：此时才能保证有父级、可测量尺寸；适合取数据与初始渲染
          console.log('connected')
        }

        disconnectedCallback() {
          // 移出文档：清定时器、断监听，防止内存泄漏
        }

        attributeChangedCallback(name, oldVal, newVal) {
          if (name === 'type' && oldVal !== newVal) {
            // 属性变化 → 同步到 shadow 内部（手动受控，不是自动响应）
          }
        }

        adoptedCallback() {
          // 被移动到另一个 document（如 document.adoptNode 从 iframe 里拿过来）
        }
      }

      customElements.define('my-button', MyButton)
    </script>
  </body>
  </html>
  ```

- Shadow DOM 隔离规则速查：外→内被挡（页面选择器选不进 shadow 子树）；内→外被挡（shadow 里的样式不污染页面）；**例外通道**：可继承属性（color、font）会穿透 shadow 边界继续继承；CSS 自定义属性（`--primary-color`）穿透读取，这是**设计令牌注入**的标准做法；`::part()` 与 `exportparts` 属性允许外界定向样式化 shadow 内部标记了 `part` 的节点；`<slot>` 是内容投影不是复制，外界子节点仍在外层 DOM 树上。
- 生命周期时序细节：`constructor` 里禁止读取子元素与属性（升级可能发生在解析中途）、必须先 `super()`、禁止 `document.write` 级副作用；`connectedCallback` 可能被**多次触发**（移入移出 DOM），业务要幂等；`attributeChangedCallback` 首次设置属性时会先于 `connectedCallback` 触发（升级阶段）；`customElements.whenDefined(name)` 返回 Promise，可等待"含占位内容的组件升级完"再做逻辑。
- 三种注册约束：标签名必须含连字符（`my-button` 合法、`mybutton` 报错，防与未来原生标签冲突）；一个标签名只能 define 一次（重复抛错）；不能继承自 `HTMLButtonElement` 直接扩展（要扩展需 `customElements.define('my-button', class extends HTMLButtonElement {}, { extends: 'button' })` 定制内置元素，但 Safari 拒绝支持）。

**加分项（P7 视角）**：

- 规范层面：Shadow DOM 有两种宿主——"开放 shadow"（`element.shadowRoot` 可访问）与"闭合 shadow"（返回 null，但闭合只是拿不到引用、不是安全边界，DevTools 仍可查看）；事件在 shadow 边界会被"重定向"（retarget），`event.target` 对外表现为宿主元素，`composedPath()` 才能拿到内部真实路径——这是跨边界事件委托的关键知识点。
- 样式隔离的工程化：设计系统通常"结构走 shadow、主题走 CSS 变量 + `::part`"，避免 closed mode 引发的测试与无障碍困难；`:host-context()` 可根据祖先状态换肤但 Firefox 长期不支持；表单元素参与需要 `ElementInternals`（`attachInternals()`）实现"非 shadow 也能用 form 关联"，配合 `formAssociated: true` 静态字段让自定义输入控件真正进表单。
- 框架映射与互操作：Lit（Google）在 Web Component 上层补齐了响应式属性（装饰器 `@property`）、模板编译与批量更新；Vue 的 SFC 是"构建时组件"而 Web Component 是"运行时标准"，Vue 3 的 `defineCustomElement` 把 Vue 组件输出为真正的 custom element；React 18 及之前把 custom element 当作"不可控属性传递"曾大量踩坑（属性 vs 特性的序列化），React 19 才完整支持。
- 生产案例：微前端领域（如腾讯 无界/ wujie、YouTube 播放器、GitHub 的相对时间组件 relative-time）大量用 Web Component 做"跨技术栈的原子组件"，因为它是唯一不依赖任何框架的运行时分发单位；内部系统做过 A/B：同一组件分别用 Vue 发布与 Web Component 发布，后者在 jQuery/React/Vue 混合的老页面上接入成本几乎为零，代价是要自己补一套响应式更新与测试工具链。

