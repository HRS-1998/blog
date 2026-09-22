# 11 小程序 / UniApp

对标 P6/P7 的小程序与跨端考察：双线程架构与通信桥、setData 原理级优化、生命周期与组件模型、分包与体积治理、登录态体系、首屏与渲染性能、Skyline 新渲染引擎、UniApp 多端编译原理与 Taro 对比、跨端工程化、H5 互跳鉴权与线上问题排查。每题给出核心答案、知识点拆解与 P7 视角的加分项。

## Q：微信小程序双线程架构：渲染层/逻辑层为什么分离？通信桥如何工作？

**核心答案**：小程序采用"渲染层 WebView + 逻辑层 JsCore"的双线程模型，两个线程之间不允许直接引用，所有数据与事件都经由 Native 层的 WeixinJSBridge 中转。分离的核心动机有三个：一是安全与管控，逻辑层运行在无 DOM/BOM 的沙箱里，拿不到 WebView 的 window 对象，无法随意操作页面、劫持 cookie 或注入脚本，页面跳转、网络请求、存储访问全部收敛到经审计的 `wx.*` API；二是稳定性，JS 执行与页面渲染互不阻塞，单个 WebView 渲染异常不会拖垮业务逻辑，逻辑层也永远不会被长任务卡住 UI（代价是自己也要避免长任务）；三是解耦复用，页面栈里每个页面一个 WebView，共享一个逻辑层线程，天然的"多渲染实例 + 单逻辑实例"结构。通信桥本质是一条"序列化消息总线"：`setData` 走逻辑层到渲染层的下行通道（iOS 用 JSCore evaluateScript，Android 走 Native 中转后再 evaluateJavascript 注入 WebView），事件回调走渲染层到逻辑层的上行通道，消息体必须 JSON 序列化，函数、undefined、原型链全部丢失，这也是 setData 一切性能问题的根源。

**知识点解析**：

- 整体架构分层（面试画图题，能默画这张图基本就过）：

```text
┌────────────────────────────────────────────────┐
│  渲染层（每个页面一个 WebView，可多个）           │
│  WXML 编译产物(虚拟树 JS) + WXSS + 基础库视图部分 │
│  组件系统：exparser（类 Shadow DOM 实现）         │
└──────────────△─────────────────┬───────────────┘
               │ 事件(序列化后上传) │ 渲染指令(注入 JS)
┌──────────────┴─────────────────▽───────────────┐
│  Native 层（微信客户端）                          │
│  WeixinJSBridge：evaluateJavascript / onMessage  │
│  原生能力：存储、网络、支付、多媒体、路由         │
└──────────────┬─────────────────────────────────┘
               │ invoke/callback（同样序列化）
┌──────────────▽─────────────────────────────────┐
│  逻辑层（App Service，仅一个线程）               │
│  JsCore(iOS)/V8(Android)，无 DOM/BOM 沙箱       │
│  运行 WAService.js + 业务代码 + getApp()/Page()  │
└────────────────────────────────────────────────┘
```

- 下行链路（setData 的完整旅程）：逻辑层把传入对象挂在 `this.data` 上（同步），随后调用 `__appServiceSDK__` 的 publish → 数据被 JSON 序列化（会过滤函数/undefined）→ 通过 Native 的消息通道分发到目标页面的 WebView → Native 在 WebView 上 `evaluateJavascript` 执行一段框架预置的接收代码 → 渲染层反序列化后交给 exparser 组件系统，按数据路径更新组件树并触发局部重渲染。两次序列化、一次跨线程、一次 JS 注入，构成 setData 的固有成本。

```js
// 通信桥消息的简化结构（源码级面试可画出该协议）
// 逻辑层 -> Native：publish
WeixinJSBridge.publish('appServiceData', {
  data: JSON.stringify({ list: [/* 大对象在这里被序列化 */] }),
  options: { path: 'pages/index/index' }
})
// Native -> 渲染层：注入执行（Android 上是一次 evaluateJavascript）
// 渲染层收到后 parse，再按 setData 的 path 做最小化更新
// 上行链路：用户 tap -> 渲染层序列化事件对象(e.detail/touches)
// -> Native 转发 -> 逻辑层 WAService 分发到 Page 的 handler
```

- 序列化层的坑（P6 到 P7 的分水岭）：JSON 序列化意味着 `Date` 变字符串、`RegExp`/函数/`undefined` 直接丢失、`NaN`/`Infinity` 变 null、循环引用直接报错；`this.data` 里存函数没有意义。另一个隐蔽点是身份断裂——传到渲染层的是"数据的副本"，逻辑层持有原始对象引用，两个线程里的对象永远不可能相等，所以"改了 data 不 setData 不生效，setData 了但 this.data 上的引用对象改内部字段也不生效"这类问题都源于此。
- 逻辑层单线程的推论：所有页面共享一个 JS 线程，A 页面的死循环会让整个小程序（包括所有页面的事件回调）无响应；`setTimeout` 等宏任务与 `wx.request` 回调都在这一个线程排队。这解释了为什么官方规范强调"逻辑层避免长任务、大数据计算放云函数或分片"。
- 事件链路的性能体感：一次 tap 要经历"渲染层捕获 → 序列化 → Native 转发 → 逻辑层 handler → setData → 序列化回传 → 渲染层更新"一整个环，往返延迟在低端安卓机上可达几十毫秒，这是"小程序点击总感觉比 H5 慢半拍"的架构性原因，也是 wxs/worklet（Q7）存在的意义。

**加分项（P7 视角）**：

- 与浏览器对比定式：浏览器是"单线程共享内存"（JS 与渲染共享同一个进程上下文，直接操作 DOM），小程序是"双线程消息传递"（share-nothing，actor 模型）。后者牺牲了通信性能换取安全边界——这是平台方（微信）与宿主（开发者）之间信任成本最小化的设计，理解"这个架构是为平台的管控诉求服务的，而非性能"才算读懂了设计文档。
- 为什么不用 React Native 式的"JS 驱动原生渲染"？微信的选择是把渲染层留在 WebView 体系：Web 技术栈成熟、CSS 表达力完整、页面栈天然隔离、基础库可随客户端热更新。Skyline（Q8）是微信对"WebView 性能天花板"的回应，但仍然保留双线程，说明"逻辑层沙箱"这条底线不可动摇。
- 生产案例：一次"页面切换后 setData 失效"的线上问题——原因是 setData 的回调在页面已 unload 后到达，渲染层 WebView 已销毁，消息被静默丢弃。排查手段是在基础库层 hook setData 打点（本地注入一个 wrapper 记录每次调用时机与页面状态），这类"桥层黑盒"问题的定位能力是区分高级工程师的关键。
- 追问预演："两个页面能直接共享 JS 变量吗？"可以——逻辑层单线程共享 getApp() 全局数据，但注意 App.onLaunch 与分包页面 onLoad 的时序；"渲染层和逻辑层谁先初始化？"渲染层 WebView 先创建、先展示启动页/骨架，逻辑层注入完成回调 onLaunch 后才有数据通信。

## Q：setData 原理与性能：数据序列化传输、最小化更新策略、长列表优化？

**核心答案**：setData 是双线程之间唯一的"数据视图同步"通道，成本由四部分组成：逻辑层 JSON 序列化、跨线程传输（官方限制单次数据量 1MB，性能建议控制在几十 KB 以内）、渲染层反序列化、组件树按路径做局部更新。优化总纲是"少传、低频、路径化"：只传变化的数据并用数据路径写法做点更新；界面无关的数据不进 data 挂 this；高频调用做合并节流；动画/滚动联动类需求下沉到 wxs 或 CSS，彻底绕开桥。长列表的治理思路是"分页加载 + 虚拟列表 + 图片懒加载"三板斧：用 recycle-view 或自实现的视口回收方案让节点数量与数据总量解耦。我们团队的一次典型优化：1 万条商品的长列表页，全量 setData 500KB 导致低端机每次交互卡顿 300ms 以上，改为"分页 + 只传增量 + 虚拟列表"后，单次 setData 稳定在 2KB 内、交互耗时降到 20ms 量级。

**知识点解析**：

- 性能成本的量级拆解（压测口径，面试给数据是硬通货）：

```text
数据量      序列化+传输+反序列化   渲染层节点更新   用户体感(低端安卓)
1KB         ~2ms                几乎可忽略      无感
10KB        ~10ms               ~10ms          勉强无感
100KB       ~60-100ms           明显           掉帧感
1MB(上限)   300ms+              数百ms~秒级    明显卡顿/白屏
频率: 每秒>10 次中量级 setData, 桥将成为串行瓶颈,
      后发的 setData 会排队, 表现为"数据更新延迟越叠越多"
```

- 最小化更新：官方支持数据路径语法，只序列化并更新命中的那个节点，避免整列表重传。

```js
// 反例：整列表重传(5000 条 × 200B ≈ 1MB)
this.setData({ list: this.data.list })

// 正例 1：路径化点更新，只传变化的一个元素
this.setData({ 'list[123].checked': true })

// 正例 2：追加增量，而不是整个数组换新
const len = this.data.list.length
this.setData({ [`list[${len}]`]: newItems[0] })

// 反例 2：界面无关数据进 data(每次 setData 都可能被带上)
this.setData({ userId: 1 })   // userId 永远不用于渲染
// 正确做法：挂实例字段，完全不经过桥
this.userId = 1
```

- 频率治理：输入框搜索、拖拽进度这类高频场景，先合并再发送；`wx:if` 与 `hidden` 的选择同理——hidden 只是 CSS 隐藏，节点仍在组件树里参与更新。

```js
// 高频输入的节流 setData（注意用 timestamp 而非 data 存状态）
onSearchInput(e) {
  const kw = e.detail.value
  this._lastInput = kw
  if (this._timer) return            // 合并同一周期内的多次输入
  this._timer = setTimeout(() => {
    this._timer = null
    this.setData({ keyword: this._lastInput })
  }, 200)
}
```

- 长列表虚拟列表自实现原理：外层 `scroll-view`（或页面滚动）监听 scroll，用总条数 × 估算行高撑起一个占位容器，只渲染 `视口高度/行高 + 上下缓冲` 的那几屏节点，滚动时通过 slice 平移窗口。官方 npm 组件 `recycle-view` 做了更完整的回收与定高/变高支持；Skyline 的 scroll-view 支持 lazy-mount 后可视区域渲染可进一步简化实现。

```html
<!-- 虚拟列表骨架：占位高度撑出滚动条，真实节点只渲染视口窗口 -->
<scroll-view scroll-y type="list" scroll-top="{{scrollTop}}" bindscroll="onScroll">
  <view style="height: {{totalHeight}}px">
    <view style="transform: translateY({{offset}}px)">
      <view wx:for="{{visibleItems}}" wx:key="id">{{item.text}}</view>
    </view>
  </view>
</scroll-view>
```

```js
onScroll(e) {
  const scrollTop = e.detail.scrollTop
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER)
  const end = start + Math.ceil(VIEWPORT_H / ROW_H) + BUFFER * 2
  // 只 setData 窗口内的可见下标与偏移量，数据量恒定（几条），与列表总量无关
  this.setData({ visibleItems: allItems.slice(start, end), offset: start * ROW_H })
}
```

- 长列表周边优化：`image` 组件加 `lazy-load`；图片走 CDN 按容器尺寸裁剪（把 1080px 原图换成 350px 的裁剪地址，列表滚动性能立竿见影）；行内避免深层级节点嵌套（渲染层节点数直接影响 exparser 更新成本）；`wx:key` 必须稳定唯一——缺失 key 会导致整段节点销毁重建，滚动中的列表会闪烁。

**加分项（P7 视角）**：

- 原理层追问"data 放 this 上为什么不会被框架 GC 或者丢失"：逻辑层页面实例由页面栈持有，页面 unload 后实例销毁，this 上的字段随之释放；而 data 会被基础库镜像一份用于渲染层同步，界面无关数据放 data 等于"双线程各存一份 + 每次更新都可能参与序列化"，这是最小化更新的第一性原理。
- 方案权衡：虚拟列表的固定行高假设在"图文混排变高流"里会碎掉，工程上要么用双 pass 渲染（先渲染测高再修正 totalHeight，需缓存行高），要么接受近似值 + 过渡动画掩盖跳动；recycle-view 的成本是包体积与 API 侵入，Skyline lazy-mount 的成本是新渲染引擎的兼容面。给出"变高场景我们最终选了行高缓存 + 一次修正"这种带取舍的结论，比背 API 高一层。
- 生产案例：一次"滚动越来越卡"的排查——virtual list 本身没问题，根因是 onScroll 里每次都 setData 了 6 个字段，其中 3 个滚动相关字段其实可以交给 wxs 在渲染层直接计算（transform 偏移根本不需要回逻辑层）。把偏移计算挪到 wxs 后，onScroll 的 setData 频率从每秒 30 次降到 0，滚动掉帧率从 40% 降到 3%。教训：先问"这份数据真的需要过桥吗"，再谈怎么优化过桥。
- 体系化总结（可直接背）：setData 优化三定律——数据最小化（路径化）、频率最低化（合并节流/下沉 wxs）、依赖解耦（无关数据离开 data）；长列表三定律——节点数与总量解耦（虚拟化）、图片与数据量解耦（CDN 裁剪/懒加载）、更新与滚动解耦（wxs 响应式）。

## Q：小程序生命周期：App/Page/Component 钩子与页面栈？

**核心答案**：生命周期分三层。App 层是 `onLaunch`（冷启动全局仅一次）→ `onShow`/`onHide`（前后台切换）→ `onError`/`onPageNotFound` 等兜底钩子；Page 层按"onLoad（一次，收 query）→ onShow（每次可见）→ onReady（一次，首渲染完成）→ onHide → onUnload"循环，另有 `onReachBottom`/`onPullDownRefresh`/`onShareAppMessage` 等页面事件钩子；Component 层是 created → attached → ready → moved → detached（新版统一收进 lifetimes 字段），并额外有 pageLifetimes 感知宿主页面的 show/hide/resize。页面栈是维护页面跳转关系的核心结构，`navigateTo` 压栈、`navigateBack` 出栈、`redirectTo` 替换栈顶、`reLaunch` 清空重置、`switchTab` 切换 Tab（Tab 页不在普通栈内），栈上限 10 层，`getCurrentPages()` 可拿到栈内实例。面试的关键区分点：onLoad 与 onShow 的语义差（参数获取 vs 数据刷新）、onReady 与 onShow 的时机差（首渲染完成仅一次）、以及"Component 构造页面"时生命周期在 methods 里的写法差异。

**知识点解析**：

- 完整时序（口述版本，标注唯一性）：

```text
冷启动: App.onLaunch -> App.onShow -> Page.onLoad -> Page.onShow -> Page.onReady
热启动(从后台切回, 未杀进程): App.onShow -> Page.onShow
前进 A->B: A.onHide -> B.onLoad -> B.onShow -> B.onReady
返回 B->A: B.onUnload -> A.onShow
Tab 切换: A.onHide -> Tab.onLoad/Tab.onShow(switchTab 清掉非 Tab 页面)
杀进程: 无 onUnload/onHide，下次冷启动从头来（所以重要状态要落 storage）
```

- 页面栈操作与治理（10 层上限是真实生产事故来源）：

```js
// 页面栈上限 10：getCurrentPages().length >= 10 时 navigateTo 静默失败
const pages = getCurrentPages()
if (pages.length >= 10) {
  // 治理手段：用 redirect 替换栈顶，或回退到已有页再前进
  wx.redirectTo({ url: '/pages/detail/detail?id=1' })
} else {
  wx.navigateTo({ url: '/pages/detail/detail?id=1' })
}

// 常见的"返回刷新"模式：onShow 里对比标记决定是否拉数据
onShow() {
  const newTag = wx.getStorageSync('list_dirty')
  if (newTag !== this._dirtyTag) {
    this._dirtyTag = newTag
    this.fetchList()   // 从编辑页返回后刷新列表
  }
}
```

- Component 生命周期与 pureDataPattern 等进阶配置：

```js
Component({
  lifetimes: {
    attached() {
      // 已进入节点树，this.setData 可用；created 阶段不行
    },
    ready() { /* 布局完成，可拿节点信息 */ },
    detached() { /* 清理定时器/订阅 */ }
  },
  pageLifetimes: {
    show() {},   // 感知宿主页面 onShow，常用于返回本页时刷新轮播
    hide() {},   // 宿主页隐藏时暂停定时器/动画
  }
})
// 注意：组件用 Component 构造页面时，onLoad/onShow 放在 methods 里
Component({
  methods: {
    onLoad(query) { /* query 是页面参数 */ }
  }
})
```

- 高频追问速答：
  - onPullDownRefresh 需要在 json 里 `enablePullDownRefresh: true`，结束后必须手动 `wx.stopPullDownRefresh()`，否则转圈不停。
  - onPageScroll 是高频钩子，每帧触发且走桥通信，长页面慎用——滚动吸顶需求优先用 wxs 或 CSS `position: sticky`。
  - App.onLaunch 与首页 onLoad 的时序：onLaunch 先于页面钩子，但 onLaunch 里的异步请求不会阻塞页面渲染，需要登录态的接口要在页面侧做依赖编排（Promise 化的 init 串联）。
  - 转发相关：onShareAppMessage（发给好友）、onShareTimeline（朋友圈）返回自定义标题/路径/图片，前者不设置则菜单置灰。

**加分项（P7 视角）**：

- onShow 的滥用是小程序最常见的设计坏味道：把所有"可能需要刷新"的逻辑堆进 onShow，导致页面每次返回都全量重拉。我们的规范是 onShow 只做"廉价的状态 diff"（本地标记/时间戳对比），确认脏了才走网络——把"刷新语义"从生命周期钩子里剥离成显式的状态管理，是这类页面的治理终点。
- 页面栈的架构用法：把 getCurrentPages 当全局状态通道（栈顶 `pages[pages.length-2]` 直接改上一页数据）是社区流行的黑魔法，能绕过事件总线，但造成页面间强耦合且热重启后失效；规范做法仍是"事件订阅 + storage 兜底 + 状态放全局 store"。能讲清这两条路线的边界，才算有生产视角。
- 冷启动优化的钩子编排：onLoad 里同步 setData 初始骨架数据（保证首屏有东西）、关键请求并行发出但只在 onReady 后再 setData 复杂结构；启动期代码尽量少——按需注入（Q5）让非首屏页面代码不参与启动注入，直接缩短 onLaunch 前的注入阶段。
- 追问"onUnload 里能 setData 吗"：可以但无意义（视图即将销毁），且双线程下回调可能晚于页面销毁导致静默失败——这是 Q1 桥层黑盒问题的生命周期侧表现。

## Q：自定义组件：properties/observers、behaviors、插槽与抽象节点？

**核心答案**：Component 构造器是小程序组件化的核心，properties 声明外部传入的属性（类型/默认值/变化回调），observers 是统一的数据监听器，可同时观察 data 与 properties、支持字段路径与通配符，能力上覆盖并取代了 properties 旧版的 observer 字段。behaviors 是 mixin 机制，多 behavior 同名冲突时"后引用的覆盖先引用的、组件自身覆盖 behavior"，但生命周期不覆盖而是全部执行。插槽分单插槽与 multipleSlots 多插槽，但小程序原生不支持作用域插槽（父级拿不到子组件数据），这个空缺由抽象节点 generic 补位：组件声明泛型节点，使用方通过 usingComponents 指定具体实现，实现"依赖注入式"的组件组合。配套考点是样式隔离（styleIsolation 三档）与 externalClasses，以及 pureDataPattern 纯数据字段——声明不参与渲染的数据，避免无谓的桥传输。

**知识点解析**：

- properties 与 observers 的标准写法与三个坑：

```js
Component({
  properties: {
    count: {
      type: Number,
      value: 0,
      // 旧版 observer 已不推荐，新代码统一用 observers
    },
    item: { type: Object, value: null }
  },
  data: { inner: 0 },
  observers: {
    // 支持 data 与 properties 的字段路径、通配符
    count: function (val) {
      this.setData({ inner: val * 2 })     // 坑 1：不要监听后再 setData 同一字段，死循环
    },
    'item.price, item.num': function (p, n) {   // 多字段同时监听
      this.setData({ total: p * n })
    },
    // 注意：observers 在 setData 之后才触发，且入参是"已经 setData 的新值"
  },
  options: {
    pureDataPattern: /^_/     // 坑 2：下划线开头的字段不参与渲染，不做桥同步
  }
})
```

- 坑 3：对象属性是"序列化副本"传递——父组件改 `obj.inner.x` 不会触发子组件 observers（身份在桥上断裂，见 Q1），必须整体替换对象引用；这也是"传对象不如传扁平 props"的工程建议来源。
- behaviors：字段冲突的覆盖优先级与生命周期聚合。

```js
// behaviors 是"显式 mixin"：字段冲突按 后者覆盖前者、组件 > behavior
const hoverBehavior = Behavior({
  data: { hover: false },
  lifetimes: {
    attached() { console.log('behavior attached 也会执行，不会被子组件同钩子覆盖') }
  },
  methods: {
    toggleHover() { this.setData({ hover: !this.data.hover }) }
  }
})
Component({
  behaviors: [hoverBehavior],
  lifetimes: { attached() { /* 与 behavior 的 attached 都会执行 */ } }
})
```

- 多插槽与样式隔离：

```html
<!-- 组件 wxml：multipleSlots 开启后可用命名插槽 -->
<view class="head"><slot name="title" /></view>
<view class="body"><slot /></view>
```

```js
Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'isolated'   // isolated(默认,完全隔离) / apply-shared(页面样式进组件)
                                // / shared(双向) —— 隔离与可控性的三档权衡
  }
})
```

- 抽象节点（generic）：解决"插槽内容只能由父级写死"的限制，组件库的"可替换渲染器"标准方案。

```json
// 组件配置：声明 select-node 是一个抽象节点
{ "component": true, "usingComponents": {} }
```

```html
<!-- select-list.wxml：组件内部只写抽象节点 -->
<view wx:for="{{list}}" wx:key="id">
  <select-node item="{{item}}" bind:pick="onPick" />
</view>
```

```json
// 页面使用时注入具体实现 + 同名占位（异步分包场景防白屏）
{ "usingComponents": { "select-node": "generic://item-impl", "item-impl": "/components/radio-item" } }
```

**加分项（P7 视角）**：

- 作用域插槽的跨端真相：原生微信没有作用域插槽，但 uni-app 编译 Vue 的 v-slot 到 mp-weixin 时会做"编译期展开"——把子组件模板内联到父级或用数据反传模拟，语义可用但实现退化；Taro（React children）则靠运行时把 children 也纳入 vdom 树统一 setData。能对比出"能力缺失 → 编译期魔法补齐"这条跨端规律，说明你真的做过组件库。
- 组件库设计实践：我们内部的业务组件全部用 generic 做列表渲染器注入，配合 abstract node 的 componentPlaceholder（异步分包下先渲染占位组件）避免首屏白块；styleIsolation 统一用 apply-shared 接收设计变量，同时暴露 externalClasses 给业务方改关键样式——隔离与开放之间的度，是组件库被多少人用起来的决定因素。
- 性能视角：组件数量直接决定渲染层成本，一个自定义组件边界就是一次 exparser 子树更新单位；"过度组件化"（每行一个自定义组件的万行列表）比纯 wxml 更慢。原则：组件化为了复用与隔离，不为组件化而组件化；高频更新的大列表内部用扁平 wxml 节点。

## Q：小程序分包：分包加载、独立分包、分包预下载？体积如何治理？

**核心答案**：分包把代码包按目录切成多个可独立下载的单元，启动时只下载主包，进入分包页面时才按需下载对应分包，用"时间换空间"把首屏启动与业务模块解耦。三个关键机制：普通分包（复用主包资源，app.js 正常执行）、独立分包（independent: true，可脱离主包独立启动，不下载主包、不执行 App 实例，适合扫码直达的活动/登录页）、分包预下载（preloadRule，进入某页面时在后台提前拉取指定分包，进页面时已就绪）。体积红线：单个主包/分包 2MB，整包上限经历 8MB → 20MB → 30MB 的演进（以官方文档为准）。治理思路四步：测量（依赖分析定位大户）→ 外移（静态资源全部上 CDN，代码包里只留逻辑）→ 按需（组件库按页面级声明、按需注入 lazyCodeLoading、异步 getComponent）→ 切分（按业务域与访问路径设计分包边界，预下载兜底体验）。

**知识点解析**：

- 配置全景（app.json）：

```json
{
  "pages": ["pages/index/index"],
  "subpackages": [
    {
      "root": "packageActivity",
      "pages": ["pages/lottery/lottery"],
      "independent": false
    },
    {
      "root": "packageLogin",
      "pages": ["pages/auth/auth"],
      "independent": true,
      "preloadRule": {}
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["packageActivity"]
    }
  },
  "lazyCodeLoading": "requiredComponents"
}
```

- 独立分包的三个限制（面试高频陷阱）：
  - 不能 require 主包代码与资源（图片/组件），必须完全自包含；
  - App.onLaunch 不执行（app 实例可能不存在），`getApp()` 需要判空——全局初始化逻辑要么冗余进独立分包，要么等 navigateTo 主包页面时由主包补执行；
  - 主包插件与主包预下载数据不可用。收益是"扫码直达活动页"场景不下载主包就能渲染，弱网首开提升显著。
- 预下载规则：`preloadRule` 的 key 是触发页面路径，packages 是要预取的分包名或 root，network 控制网络（all/wifi）；同页面预下载总量有限额（2MB 量级），且独立分包之间互不预载。原则：预下载配置跟着"用户下一步高概率访问路径"走，如首页预下载详情分包、结算页预下载售后分包。
- 体积治理实操：

```text
1. 测量：微信开发者工具"代码依赖分析"按目录/文件给出体积排行；
        miniprogram-ci 的 analyse 接口可接 CI 出趋势报表（超阈值阻断合并）
2. 外移：本地图片/字体/雪碧图全部上 CDN，用 https 地址引用；
        唯一例外：tabBar 图标必须打包（客户端限制）
3. 按需：组件库不做全局注册，逐页面 usingComponents；
        lazyCodeLoading: requiredComponents 让未引用组件的代码不注入启动期
4. 切分：按业务域分包（交易/售后/会员），再按访问路径配 preloadRule；
        tabBar 页面必须在主包，注意首页依赖的公共逻辑会被打进主包
```

- 一个隐蔽规则：公共 npm 组件与公共 js 被主包页面引用就打进主包，被多分包引用则各分包各打一份（或走"分包异步化"—— 2021 后支持的跨分包引用与 js 按需注入，`"componentPlaceholder"` 配合异步分包）。分包异步化允许分包 A 异步 require 分包 B 的组件与 js，解决"公共代码被迫进主包"的老问题。

**加分项（P7 视角）**：

- 治理的元问题：体积治理本质是"启动耗时资产"的预算管理。我们会给每个业务域定包体预算（如主包 1.5MB 红线），CI 里超预算即失败，把"治理"从运动式优化变成常态化门禁；配合按业务域的包体趋势看板，谁引了大依赖一目了然。这是 P7 视角——机制建设大于单点优化。
- 分包边界的架构判据：按"用户访问路径"而非"代码目录结构"切分。判断题——售后域和交易域共用一个公共组件：方案 A 打进主包（主包膨胀），方案 B 各自冗余一份（总体积膨胀），方案 C 分包异步化（引入运行时依赖关系）。我们选 C 的前提是该组件加载失败有降级 UI；能带着失败降级聊架构选择的，是合格的架构师答案。
- 独立分包的进阶用法：把"登录/扫码落地页"做成独立分包，扫码进入不拉主包，登录后 `wx.reLaunch` 到主包首页。注意点：独立分包里 App 未创建，全局请求拦截器/token 逻辑都要在分包内自建一份轻量版本——用"薄入口 + 主包厚运行时"的结构描述这个模式会很加分。

## Q：小程序登录态：code2session 完整流程、token 存储与续期？

**核心答案**：完整链路是：前端 `wx.login()` 拿到临时凭证 code（约 5 分钟有效，一次性）→ 业务后端携带 code、appid、secret 调用微信 `code2session` 接口 → 返回 openid（用户在单个小程序的唯一标识）、unionid（绑定开放平台后跨应用统一标识）、session_key（会话密钥，只允许留在后端）→ 后端用 openid/unionid 关联自家用户体系，签发业务 token（JWT 或 session）下发给前端 → 前端存 `wx.setStorageSync` 并在请求头携带。铁律有三条：secret 与 session_key 永不下发前端；code 只用于换身份，不拿来做业务凭证；业务 token 与微信侧会话（session_key）是两套独立的过期体系，分别处理。续期采用双 token 模型：短效 access_token（请求头携带）+ 长效 refresh_token（静默续期），401 时统一拦截刷新后重放原请求；微信侧用 `wx.checkSession()` 判断 session_key 是否过期，过期重新 wx.login 换 code。

**知识点解析**：

- 完整时序（能画出这张图本题过半）：

```text
小程序前端                 业务后端                  微信服务器
   │ wx.login() 获取 code   │                          │
   │ ─────── code ────────>│ code2session(appid,      │
   │                        │  secret, js_code) ─────>│
   │                        │<── openid/unionid/       │
   │                        │    session_key ─────────│
   │                        │ 查库/注册用户, 签发 token │
   │<──── token(双token) ───│  session_key 落库, 不下发  │
   │ setStorageSync 持久化   │                          │
   │ 后续请求 Authorization: Bearer token ──────────────>│
```

- 前端标准实现（含静默续期与 401 重放）：

```js
// 请求封装：登录态初始化 + 401 刷新重放
let refreshing = null   // 单飞锁：并发 401 只触发一次刷新

async function request(options) {
  const token = wx.getStorageSync('access_token')
  const res = await rawRequest({ ...options, header: { ...options.header, Authorization: `Bearer ${token}` } })
  if (res.statusCode === 401) {
    refreshing = refreshing || refreshToken()
    const ok = await refreshing
    refreshing = null
    if (!ok) { logout(); throw new Error('auth expired') }
    return rawRequest({ ...options, header: { Authorization: `Bearer ${wx.getStorageSync('access_token')}` } })
  }
  return res
}

async function refreshToken() {
  const rt = wx.getStorageSync('refresh_token')
  const { data } = await rawRequest({ url: '/auth/refresh', method: 'POST', data: { refreshToken: rt } })
  wx.setStorageSync('access_token', data.accessToken)
  wx.setStorageSync('refresh_token', data.refreshToken)
  return true
}
```

- 微信侧会话（session_key）与业务 token 的关系（最容易混的点）：
  - session_key 用于解密开放数据（历史上解密 getUserProfile 的 encryptedData、校验 watermark）；新接口体系下手机号走 `button open-type="getPhoneNumber"` 拿 code 换手机号，session_key 的使用面已大幅收窄，但"过期了 code2session 会换新、旧的解密失败"这个模型仍要懂。
  - `wx.checkSession()` 检查的是微信侧会话，返回成功只代表 session_key 未过期，不代表业务 token 有效——两个过期体系不要互相代替。
  - token 过期由业务后端控制（我们线上 access_token 2 小时、refresh_token 30 天），可配合 `wx.getStorageSync` 里的过期时间戳做本地预判，减少 401 往返。
- 存储与安全边界：小程序 storage 是明文本地存储，root/越狱设备可提取——所以 token 短效化 + 服务端设备指纹风控是必须的；openid/unionid 不要当作敏感凭据下发前端做鉴权（它们是"标识"不是"凭证"）；请求默认不带 cookie，鉴权头必须显式携带。

**加分项（P7 视角）**：

- unionid 体系是"一个用户，一片生态"的钥匙：同主体的小程序、公众号、App 绑定到微信开放平台后共享 unionid，后端用它做账号归一（扫码登录、小程序、公众号客服消息命中同一账户）。追问"没绑开放平台怎么办"：以 openid 为主体各自建账户，再通过手机号/微信授权做账号合并——合并时点上会有一段双账户共存，需要主键迁移方案，这类细节是电商类业务的真实考题。
- 埋坑实录：token 存 storage 在"小程序冷启动与 storage 读写的时序"上踩过坑——onLaunch 里同步 `getStorageSync` 一般可靠，但异步存储在极少数低端机上出现首请求不带 token；我们最终把 token 初始化放进请求拦截器内联同步读取，而不是启动时缓存到内存变量。另外 wx.login 的 code 有效期短，"先 login 后网络失败再重试"要把 code 的获取时机放在请求成功前一刻，否则偶发 code 已过期。
- 安全纵深：小程序请求可被 Charles 抓包（HTTPS 也挡不住本地信任证书的调试机），所以重要操作（支付确认、改手机号）必须有服务端二次校验（短信验证码/操作频率限制），前端校验只防误不防恶；access_token 泄露的爆炸半径控制 = 短时效 + 单设备互踢策略。

## Q：小程序性能优化：首屏（数据预拉取/骨架屏）、渲染（wxs/虚拟列表）？

**核心答案**：首屏优化的主线是压缩"启动 → 首次渲染完成"的时间线：启动期用分包 + 按需注入 + 初始渲染缓存（initialRenderingCache）减少代码下载与注入耗时；数据期用"数据预拉取"（微信在启动阶段并发拉取开发者配置的接口，提前于 onLaunch 回调）与"周期性更新"减少首屏接口等待；视觉期用骨架屏（官方工具可从页面自动生成）代替白屏，让"感知性能"先于"绝对性能"达标。渲染优化的主线是"让高频交互不过桥"：wxs 把响应函数放进渲染层执行（滚动联动/吸顶/锚点高亮完全绕开双线程通信），虚拟列表让节点数与数据总量解耦，图片走 CDN 裁剪与懒加载。体系化指标：以启动耗时（wx.getPerformance）、首次渲染时长、setData 调用频次与数据量、FPS 与白屏率为北极星，用体验评分做回归门禁。

**知识点解析**：

- 首屏时间线与各阶段武器：

```text
启动 → 首屏的耗时构成(逐段治理):
1. 代码包下载与准备   分包/分包预下载/lazyCodeLoading 按需注入
2. 启动页(微信壳)     initialRenderingCache 初始渲染缓存, 先亮缓存骨架
3. 注入与回调 onLaunch 启动期依赖瘦身(公共库按需/异步 getComponent)
4. 首页首渲染         data 初始值即骨架数据; 关键接口预拉取/并行
5. 数据回来二次渲染   接口字段裁剪、图片 CDN 尺寸裁剪
```

- 数据预拉取：在微信后台配置接口 URL 与参数模板，微信客户端在启动小程序时（onLaunch 之前）就并发请求，进页面直接读缓存数据渲染首屏。适合"首屏接口重且稳定"的首页/活动页；注意拉取时机依赖微信侧的启动流程，需返回 JSON 且带上版本号做缓存失效。

```js
// 页面侧读取预拉取数据(与 wx.request 的缓存读取统一封装)
onLoad() {
  const prefetch = wx.getStorageSync('__APP_PREFETCH__')
  if (prefetch && prefetch.version === this._pv) {
    this.setData({ list: prefetch.list })   // 先渲染预拉数据, 秒开
  } else {
    this.fetchList()                        // 预拉未命中/失效再实时拉
  }
}
```

- 骨架屏：开发者工具"生成骨架屏"自动产出 .skeleton.wxml/wxss，在数据回来前用结构占位。关键纪律：骨架屏结构与真实结构布局一致（防抖动），data 初始值直接是骨架渲染所需字段——首帧不等待任何接口。

```js
// 骨架 → 内容的两段式渲染
data: {
  loading: true,   // 初始即 true，首帧就有骨架
  list: []
},
onLoad() {
  this.fetchList().then(() => this.setData({ loading: false }))
}
```

```html
<view wx:if="{{loading}}" class="skeleton-list">
  <view class="skeleton-item" wx:for="{{[1,2,3]}}" wx:key="*this" />
</view>
<view wx:else>
  <view class="real-item" wx:for="{{list}}" wx:key="id">{{item.title}}</view>
</view>
```

- wxs 响应事件（渲染优化的杀手锏）：WXS 是运行在渲染层的受限 JS，事件响应不经逻辑层，专治高频联动。

```html
<!-- 吸顶导航：wxs 里直接改 class，全程零桥通信 -->
<wxs module="nav" src="./nav.wxs" />
<view class="{{nav.sticky(scrollTop) ? 'bar sticky' : 'bar'}}">导航栏</view>
```

```js
// nav.wxs：注意 wxs 语法受限（不支持 ES6+，var、无箭头函数）
var sticky = function (scrollTop) {
  return scrollTop > 120
}
module.exports = { sticky: sticky }
```

```html
<!-- 虚拟列表 + wxs 的组合：滚动偏移在渲染层完成，不 setData -->
```

- wxs 的限制与演进：只支持 ES5 语法子集、无法调 wx API、运行在渲染层（性能好但无业务状态）；Skyline 渲染引擎下由能力更强的 worklet 取代（Q8），写法仍是"函数下沉渲染层"的思想延续。

**加分项（P7 视角）**：

- 感知性能与绝对性能的双线汇报：一次真实优化里，启动耗时只从 2.1s 压到 1.6s（代码包与接口已接近极限），但把骨架屏 + 初始渲染缓存上线后用户"可交互体感"的投诉降了七成——性能优化的最后一公里往往是视觉策略。汇报口径建议"启动耗时 + 首屏可见 + 可交互"三指标并列，只报单一秒数会被业务方用体感打脸。
- 优化前的度量纪律：先接 `wx.getPerformance` 上报（observe firstRender/evaluateScript/route 等条目）+ 自定义分段打点，再动手。我们踩过的反例：把性能瓶颈定位成接口慢，优化两周无果，trace 后发现是"启动注入阶段某个 200KB 的图表库全量注入"——lazyCodeLoading 上了之后启动耗时直接砍半。先测量再优化，是被反复验证的工程铁律。
- 体系化沉淀：体验评分（devtools Audits）接 CI 只能拦开发期，线上靠"性能看板 + 分版本对比 + 分机型分层（iOS/高端安卓/低端安卓）"，低端机单独设 P90 红线。跨团队推进时把优化项做成 checklist 模板（新页面创建即带骨架/虚拟列表/图片裁剪的默认配置），比优化存量页面更有杠杆。

## Q：小程序原理级：虚拟 DOM 树如何渲染到 native？Skyline 框架是什么？

**核心答案**：先纠正题干里常见的误解：微信小程序的虚拟树默认不是渲染到 native，而是渲染到 WebView——WXML 在构建期被 wcc 编译器转换成 JS 函数，运行时生成虚拟树（类似 React 元素树的描述对象），通过桥传给渲染层的 exparser 组件框架驱动 WebView 更新；真正接近 native 的是两块：原生组件的同层渲染（video/map/canvas 等由客户端原生控件渲染，通过同层渲染技术与 WebView 合流显示），以及新一代渲染引擎 Skyline。Skyline 是微信自研的自绘渲染引擎：不再依赖 WebView，直接用客户端的渲染管线（Flutter 风格的自绘体系）画界面，组件框架由 exparser 升级为 glass-easel，配套 worklet 机制让动画逻辑直接在渲染线程执行（绕过逻辑层线程），目标是"接近原生的渲染性能 + 保留 Web 开发体验"。它保留双线程安全模型（逻辑层沙箱不变），是"渲染层替换计划"而非架构革命。

**知识点解析**：

- 编译期链路（wcc/wcsc 的角色）：

```text
WXML --(wcc 编译)--> 一段 JS 函数: $gwx('pages/index/index.wxml') 返回虚拟树描述
WXSS --(wcsc 编译)--> 注入 WebView 的样式函数
WXS  --(编译)------> 渲染层可执行 JS(事件响应/格式化)
运行时: 逻辑层 setData(数据) -> 桥 -> 渲染层执行 $gwx 产物生成新树
        -> 与旧树 diff -> patch 到组件树 -> WebView 重排重绘
```

- 同层渲染：原生组件（video/map/canvas/input 等）旧方案是"原生控件浮在 WebView 之上"（层级最高、无法被 WebView 元素覆盖），同层渲染让原生控件插入 WebView 的渲染流（iOS 基于 WKWebView 的原生嵌入、Android 基于 Chromium 的 child surface），可以被普通节点覆盖、随页面滚动。这就是"小程序有原生味道"的来源。
- Skyline 的四个核心变化（逐条对应解决的旧问题）：

```text
1. 自绘渲染替代 WebView     -> WebView 初始化/排版/重排成本消失
2. glass-easel 替代 exparser -> 组件框架更轻, 编译期组件而非纯运行时组件
3. worklet 替代 wxs          -> 渲染线程执行 JS, 支持 ES 标准, 面向动画
4. lazy mount/自定义 scroll-view -> 节点按需上树, 长列表天然高效
```

- worklet 示意（渲染线程动画，零通信成本）：

```js
// worklet 在渲染线程跑，不经过逻辑层
const { shared } = wx.worklet
const progress = shared(0)
wx.worklet.runOnUI(() => {
  'worklet'
  // 这里的代码在渲染线程执行，帧率与逻辑层 JS 是否繁忙无关
  progress.value = 1
})
```

- 启用方式与兼容策略：app.json 里 `"renderer": "skyline"` + `"rendererOptions": { "skyline": {...} }`，支持按页面粒度灰度（部分页面 Skyline、部分 WebView 共存），组件库需要兼容双引擎。这是渐进式替换的典型工程策略。
- 一句话区分三者：WebView 渲染（默认）= Web 技术栈全量复用；同层渲染 = WebView + 关键控件原生化；Skyline = 抛弃 WebView 的自绘渲染，逻辑层双线程模型不变。

**加分项（P7 视角）**：

- 历史脉络能体现技术视野：小程序渲染演进三代——Webview 时代（快但糙）、同层渲染时代（解决层级与滚动）、自绘时代（Skyline，对标 Flutter/Argon/新渲染引擎的行业趋势）；逻辑层演进是 JsCore/V8 注入 + 按需注入；框架层是 exparser → glass-easel（编译期组件、更小的运行时）。每个演进都在"开发体验、性能、兼容性"三角里挪重心，能按这条线讲的是真理解了架构。
- Skyline 的成本要敢讲：CSS 支持是子集（部分属性不支持，复杂选择器受限）、双引擎并存的兼容测试面、对存量组件库的改造成本、调试链路变化。我们的策略是"新页面用 Skyline（长列表/动画重灾区），老页面 WebView 不动"——按收益选战场，而不是全量切换。
- 对照业界的同构问题：React Native 的"JS 驱动原生树"瓶颈（串行桥 + 长列表）催生了 Fabric 同步渲染与 JSI，Flutter 干脆选择自绘 + Dart；小程序的答案是"保留 Web 描述能力 + 替换渲染后端 + 渲染线程可编程（worklet）"。三者殊途同归：把 JS 与渲染的通信从"消息总线"改成"共享/下沉"，能横向对比说明你的理解超出了单一平台。

## Q：UniApp 架构：编译到多端的原理（条件编译/语法转换）、Vue3 运行时？

**核心答案**：UniApp 是"一套代码，多端运行"的跨端框架，架构上是"编译器 + 运行时"双层。编译层（基于 vite/webpack 插件体系，Vue3 版是 vite 插件链）做三件事：把 .vue 单文件组件编译成各端的产物形态——H5 是标准 Vue 应用、App 侧是 JS 引擎 + 原生渲染（或 WebView 渲染）、小程序端则把 template 编译成 WXML、script 编译成跑在小程序逻辑层的代码、style 编译成 WXSS，并注入各端运行时；条件编译（`#ifdef MP-WEIXIN` 注释/JS/CSS 三种形态）在编译期做代码裁剪，实现按平台差异化而不引入运行时分支；API 与组件的跨端抹平由运行时适配层完成。Vue3 版本的关键升级是重写了小程序端运行时：不再为每个平台手写一套模拟层，而是实现了"@dcloudio/uni-mp-Weixin" 的 mini-program 渲染器——Vue 的 runtime-core 通过自定义渲染器（custom renderer API）把 vnode patch 的操作翻译成 setData，组件系统直接复用小程序的 Component/Page，模板编译目标由"生成 WXML + 指令映射"承担，让 Vue3 的响应式系统在双线程模型上原生效能运转。

**知识点解析**：

- 编译流水线（Vue3/vite 版）：

```text
.vue SFC
  ├─ template -> 各端编译:
  │     H5: 标准 vue 编译(生成 render 函数)
  │     小程序: 生成 WXML + 数据绑定表达式改写(事件/指令/插槽的映射表)
  ├─ script   -> 保留 Vue 运行时, 打包到逻辑层(双线程下 Vue 跑在逻辑层)
  ├─ style    -> WXSS/原生 CSS(scoped 在小程序端退化为组件样式隔离)
  └─ 条件编译: 注释式标记在编译期裁剪, 产物无跨端死代码
```

- 条件编译的三种形态（面试必写示例）：

```html
<!-- 模板里 -->
<view>
  <view>公共内容</view>
  <!-- #ifdef MP-WEIXIN -->
  <button open-type="share">微信专属转发按钮</button>
  <!-- #endif -->
  <!-- #ifdef H5 || APP-PLUS -->
  <button @click="h5Share">H5/App 分享</button>
  <!-- #endif -->
</view>
```

```js
// js 里
// #ifdef MP-WEIXIN
wx.login({ success: (r) => saveCode(r.code) })
// #endif
// #ifdef H5
location.href = oauthUrl
// #endif
```

```css
/* css 里 */
/* #ifdef H5 */
.banner { height: 60px; }
/* #endif */
/* #ifdef MP-WEIXIN */
.banner { height: 88rpx; }
/* #endif */
```

- Vue3 运行时如何落到小程序（核心机制，原理级）：Vue 组件树的宿主组件是小程序自定义组件，Vue 的 createRenderer 被替换为小程序渲染器——patch 产生的节点变更被收集，最终合并成一次 setData 调用下发；ref/reactive/computed 等能力完全在逻辑层内原生工作，不经过桥。

```text
Vue3 响应式(逻辑层原生) -> 组件 render -> vnode -> patch
  -> 小程序渲染器: 收集变更 -> 合并 setData(路径化) -> 桥 -> WebView
关键点: Vue 的 diff 在逻辑层完成, setData 只发"结果差异",
       所以 uni-app 的性能下限取决于"框架合并 setData 的粒度"
```

- App 端的两条渲染路径：vue 页面默认走 WebView 渲染（uni-app 编译为 Web 技术栈）；nvue 页面走 weex 原生渲染（组件为原生控件、布局为 flex 子集），适合长列表/视频流等高性能页。两者可共存，路由级选择。
- 工程结构要点：`manifest.json` 管各端应用配置（appid、权限、SDK），`pages.json` 统一管路由/导航栏/ tabBar（替代各端各自的配置文件），这两个文件本身就是"跨端配置抹平层"的一部分。

**加分项（P7 视角）**：

- 性能的机制级认知：uni-app 小程序端的历史演进——Vue2 时代是"全量数据模拟 + 手写适配层"，Vue3 时代用自定义渲染器把 diff 结果直接翻译为路径化 setData，配合编译期把静态节点沉到 WXML，性能已接近原生开发；但极限场景（万级列表、超高频更新）仍受"框架要维护 vnode 树 + setData 合并策略"的约束，会比手写小程序多一层开销。能讲"框架税"具体交在哪里，比站队"uni 快/慢"可信得多。
- 生态与工程策略：我们用 uni-app 的边界判断——五端以上复用、业务型中低复杂度、团队 Vue 栈为主时收益最大；当某端（通常是微信小程序）成为核心渠道且性能敏感时，策略是"uni 为主体 + 核心页面用原生小程序分包重写"（uni 支持小程序原生组件混用，把原生页面以分包形式集成），用架构混搭保住两端下限。
- 追问"条件编译会不会导致代码分叉失控"：会，这是跨端框架的熵增定律。治理手段——平台差异收敛到 `platforms/` 目录的适配层模块（差异不上散在业务代码里，而是集中在 adapter：`import { pay } from '@/platforms/pay'`，各平台实现同签名接口），业务代码只面向统一接口；条件编译占比作为 CI 指标监控，超标 code review 拒绝。

## Q：跨端适配：样式单位、API 差异抹平、平台特性代码如何组织？

**核心答案**：跨端适配三件事——样式、API、能力差异。样式上以 rpx（responsive pixel）为基准单位：750rpx 恒等于屏幕宽度，天然按屏宽等比缩放，配合 `uni.upx2px` 做逻辑像素换算；字体的取舍是经典分歧——正文用 rpx 会随大屏放大到失真，重要文本建议 px 固定字号、布局尺寸用 rpx；safe-area 用 env(safe-area-inset-*) 处理刘海屏与底部横条。API 抹平靠 uni.xxx 统一命名空间（uni.request/uni.setStorage/uni.login...），各端由运行时适配层映射到 wx.xxx / 原生 / 浏览器实现，但"抹平只覆盖交集"——超出交集的平台特有能力（微信支付开放参数、App 原生插件、H5 的 URL 操作）必须走条件编译。平台特性代码的组织原则是"差异集中化"：按平台建 adapter 模块，统一接口签名，业务层零条件编译；能力检测（uni.canIUse / 运行时 getSystemInfo）兜底运行期差异。

**知识点解析**：

- 单位体系与换算：

```text
rpx: 750rpx = 屏幕宽度(iPhone 标准基准 375pt), 等比缩放
px:  物理逻辑像素, 不随屏宽缩放
换算: px = rpx * (屏幕宽度 / 750), uni.upx2px(100) / uni.px2upx(50) 运行时换算
实战建议: 布局/间距用 rpx; 字号与 1px 细线用 px(大屏字体等比放大可读性变差);
         底部安全区: padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx)
```

- API 抹平层与差异处理的三个层级：

```js
// 层级 1: 交集 API —— 直接用 uni 命名空间, 零成本
uni.request({ url, data })
uni.setStorageSync('token', t)

// 层级 2: 同名不同参/不同能力 —— uni 已抹平大半, 但注意返回结构差异
// 例: uni.login 在微信返回 code, 在 App 端返回的是 uni id token 相关结构
// 层级 3: 平台独有 —— 必须条件编译
// #ifdef MP-WEIXIN
wx.requestSubscribeMessage({ tmplIds: [id] })   // 订阅消息, 微信独有
// #endif
// #ifdef APP-PLUS
plus.runtime.getProperty(plus.runtime.appid, (info) => { /* App 版本 */ })
// #endif
```

- 平台特性代码组织（adapter 模式，团队规范级答案）：

```text
src/
  platforms/
    pay/
      index.js          # export { pay } from 按端解析的文件
      pay.weixin.js     # 微信: wx.requestPayment
      pay.app.js        # App: plus.payment(苹果/安卓渠道差异)
      pay.h5.js         # H5: 跳转收银台 URL
    share/
      share.weixin.js   # onShareAppMessage / 海报
      share.h5.js       # JS-SDK 分享
  api/                  # 业务接口层, 只依赖 platforms 的统一签名
  pages/                # 业务页面, 禁止出现平台 API(ESLint 规则约束)
```

```js
// platforms/pay/index.js —— Vite 的 define/alias 按端注入实现
// vite.config: resolve.alias['@platform-pay'] = 按端指向 pay.weixin.js 等
// 业务侧统一调用:
import { pay } from '@platform-pay'
async function doPay(order) {
  const res = await pay({ orderId: order.id, amount: order.fee })
  if (res.success) this.afterPay(order)
}
```

- 运行期差异检测（编译期解决不了的部分）：

```js
// 品牌/系统/版本差异只能运行时判断
const sys = uni.getSystemInfoSync()
if (sys.platform === 'ios') { /* iOS 特殊处理 */ }
if (sys.uniRuntimeVersion) { /* 基础库版本兼容 */ }
// App.vue 或入口统一注入全局平台标识, 避免散落判断
```

**加分项（P7 视角）**：

- rpx 的坑位清单（实战才能答出的细节）：1px 边框在低分屏会被 rpx 算成亚像素而"消失"，要用 px；rpx 不适用于 font-size 之外还有 canvas 绘制坐标（canvas 用 px，需要 upx2px 换算后绘制）；iPad/大屏开启"适配平板"后 750rpx 的等比放大会导致列表卡片巨大，需要 media query 或 splitSizes 策略切换双栏布局——大屏适配是 rpx 模型的系统性短板。
- "抹平的代价"论述：统一 API 层是双刃剑——交集之上的能力被"钝化"（拿不到平台最新特性，如小程序新组件滞后支持），所以规范里明确"平台新特性允许条件编译直连原生 API，但必须包进 adapter"——抹平层管共性，adapter 管个性，边界清晰才不失控。
- 质量门禁：跨端最大的成本是回归矩阵。我们的实践是 CI 上按端矩阵构建（H5/微信/支付宝/App）+ 核心流程自动化（uni 端可结合 miniprogram-automator 驱动微信开发者工具跑 E2E），加上"平台差异单元测试"（adapter 层 mock 各端全局对象跑同一套用例）。没有测试矩阵的多端项目，等于每次发版都在裸奔。

## Q：Taro 对比 UniApp：编译时 vs 运行时方案、React 语法支持原理？

**核心答案**：两者都做"跨端到小程序"，但技术路线基因不同。UniApp 是 Vue 系（DCloud 出品），Vue3 版走"编译 WXML + 自定义渲染器翻译 setData"路线，模板的静态结构编译进 WXML，动态部分由渲染器驱动。Taro 起点是 React 系（京东出品），其关键差异在"如何支持 JSX 这种完全动态的语法"：Taro 3 之前是纯编译时方案——把 JSX 结构在编译期静态分析转成 WXML 模板，模板能力与 JSX 表达力严重不匹配（动态结构受限、map 里写复杂逻辑编译失败）；Taro 3 转向运行时方案——不再生成 WXML，每个小程序页面只挂一个"模板容器"，React 的 reconcile 在小程序逻辑层完整跑，渲染器把 vnode 树整体（或差量）通过 setData 同步给渲染层的模板解释器，模板用递归引用的"插槽化结构"动态渲染任意 vnode。一句话对比：Taro 是"运行时框架 + 小程序当渲染后端"，UniApp 是"编译期转译 + 各端原生形态"。Vue3 后的 UniApp 吸收了类似思想（渲染器翻译），两者在原理层已趋同，真正的差异在生态与语法栈（React/Taro vs Vue/Uni）。

**知识点解析**：

- Taro 3 运行时方案的机制（本题原理核心）：

```text
Taro 3 架构:
逻辑层(JsCore):
  React/Vue 运行时 + Taro 运行时(仿 DOM/BOM: document.createElement...)
  -> 业务组件 render 产出 TaroElement 树(仿 vnode/DOM 混合体)
  -> 每次更新: 从根节点收集变更 -> setData(整棵树的数据形式) ->
渲染层(WebView):
  预置的"递归模板"(base template) + 自定义组件嵌套
  -> 解释收到的树数据, 动态生成任意结构的 WXML 节点
本质: 小程序被当成"浏览器内核的替代品", React 认为自己在写 DOM
```

- 为什么 React 需要运行时而 Vue 可以偏编译：JSX 是"用 JS 表达 UI"（图灵完备，任意条件/循环/高阶组件包裹），无法静态翻译成声明式模板；Vue 模板本身是声明式 DSL（受限语法），编译器可以完整静态分析——指令、静态提升、跳过 diff 都建立在这个约束上。这就是"语法表达力 vs 可优化性"的经典权衡，也是 Vue/Solid 选择模板、React 选择 JSX 的深层原因在小程序跨端上的重演。
- 两条路线的对比矩阵（背熟可直接答）：

```text
维度          编译时方案(Taro1/2, uni 模板层)   运行时方案(Taro3+)
语法支持      受限(模板能表达的子集)            完整(任意 JSX/Vue 写法)
动态结构      编译期分析, 不支持即报错           运行时解释, 全支持
包体积        小(无运行时)                      大(框架+模板解释器)
首屏/更新性能  好(原生模板, 路径更新)            有框架税(setData 整树/差量同步)
三方库生态    难复用(需适配)                    可复用(逻辑层是标准 JS 环境)
```

- Taro 对 React 特性的落地细节：事件系统在逻辑层模拟（合成事件、冒泡捕获），hooks 完整可用（跑在标准 React reconciler 上），HOC/render props 无差别；代价是事件回调后的一次 setData 由运行时统一合并，开发者不能像原生小程序那样手工路径化控制——性能调优从"setData 手艺"变成"React 调优 + 框架配置"。
- 选型速答（业务向）：React 团队/已有 React 组件资产 → Taro；Vue 团队/需要 App 端（nvue 原生渲染、插件市场）→ UniApp；极致性能的核心微信页面 → 原生小程序。三者不互斥，混合架构（uni 主体 + 原生分包）在电商类项目常见。

**加分项（P7 视角）**：

- 技术判断的纵深：Taro 3 的运行时方案本质上是把"React 任意写法"的复杂度从编译期转移到运行期，与 React Native 的思路同源（JS 驱动、渲染后端可替换）；而 uni-app Vue3 走的是 Vue 官方 custom renderer 的正统扩展路径（和 vue-three-js 一个原理，只是把 DOM 操作换成 setData）。理解这两条"扩展点"——reconciler 可换渲染后端（React）与 createRenderer 可自定义宿主（Vue）——比记住框架对比表重要得多，因为它是你自己设计跨端渲染器的知识地基。
- 历史视角加分：Taro 1/2 编译期方案的失败教训是行业级案例——JSX 表达力与 WXML 模板的鸿沟导致大量"写法黑名单"，社区抱怨最终倒逼 Taro 3 重写；uni-app 反而因为 Vue 模板与 WXML 同构度高，一直走编译路线。这说明跨端框架的第一性约束是"源语言的语法约束程度"，而不是工程能力。
- 生产视角的落地话术：我们团队在微信小程序核心交易页用原生（性能与最新特性），营销/工具类多端页面用 uni（复用与效率），并约定 adapter 层隔离差异；跨端框架的选型报告核心是"各端流量占比 × 团队栈 × 性能敏感度"三因子——能给出带权重的决策框架而非站队，是这道题的真实考点。

## Q：小程序与 H5 互跳、web-view 通信、鉴权如何共享？

**核心答案**：互跳分三个方向。小程序跳 H5 唯一通道是 `web-view` 组件，域名必须在后台配置"业务域名"（HTTPS + 域名校验文件放服务器根目录 + 主体需一致，个人主体小程序不可用 web-view）。H5 跳小程序有官方两条路：微信内网页用开放标签 `wx-open-launch-weapp`（认证服务号 + JS-SDK），微信外用 URL Scheme / URL Link（后端调接口生成，跳转中间页再唤起）。web-view 通信是最大的坑点：官方不提供实时双向通道，H5 侧 `wx.miniProgram.postMessage` 只在后退、组件销毁、分享这三个时机才把消息批量回传给小程序的 bindmessage，所以实时通信要靠 URL 参数（小程序→H5）、`wx.miniProgram.navigateTo` 带 query 回跳（H5→小程序）或 WebSocket 中转。鉴权共享的标准方案是"unionid 统一账号 + 一次性 ticket 换会话"：小程序侧 code2session、H5 侧网页授权拿到同一 unionid 归一账户；进入 web-view 时把短时效一次性 code 拼在 URL 上，H5 用它换取自己的会话，绝不能直接把长效 token 暴露在 URL 里。

**知识点解析**：

- 互跳通道全景：

```text
小程序 -> H5:  <web-view src="https://h5.example.com/page?a=1" />
   前提: 后台配置业务域名(下载校验文件放根目录, 域名需备案+HTTPS+同主体)
H5 -> 小程序(微信内): 微信开放标签 wx-open-launch-weapp(需认证服务号+JS-SDK)
H5 -> 小程序(微信外): URL Scheme(后端 generateScheme 生成) / URL Link
                        邮件/短信/二维码场景, 经中间页唤起小程序
小程序 -> 小程序: navigateToMiniProgram(需后台配置关联 AppID)
```

- web-view 的通信现状（三个官方时机是面试分水岭）：

```html
<!-- 小程序侧 -->
<web-view
  src="{{h5Url}}"
  bindmessage="onWebViewMessage"
  bindload="onLoad"
  binderror="onError"
/>
```

```html
<!-- H5 侧(引入微信 JS-SDK 1.4+): postMessage 并非实时到达 -->
<script>
wx.miniProgram.postMessage({ data: { action: 'syncCart', num: 3 } })
// 只有"后退 / web-view 组件销毁 / 用户分享"时, 累积消息才会批量回传
wx.miniProgram.navigateTo({ url: '/pages/result/result?status=ok' })
// navigateTo 的 query 是最可靠的 H5 -> 小程序带数据通道
</script>
```

```js
// 小程序侧收消息
onWebViewMessage(e) {
  // e.detail.data 是数组: 历次 postMessage 的累积
  const msgs = e.detail.data
  const last = msgs[msgs.length - 1]
  if (last.action === 'syncCart') this.syncCartFromH5(last.num)
}
```

- 实时双向通信的工程方案（绕过官方限制）：

```text
方案 A: URL 参数下行 + navigateTo 回跳上行(实现简单, 无实时性)
方案 B: WebSocket 中转(H5 与小程序都连自建 ws 服务, 服务端路由消息)
        适合 web-view 内嵌客服/支付结果页轮询类需求
方案 C: 轮询 + storage 集合页(后台二次进入时 setData 兜底, 体验最差)
选型: 非实时用 A, 强实时用 B, 并用 bindload/URL hash 变化做简单事件
```

- 鉴权共享的完整时序（ticket 模式）：

```text
1. 小程序内已登录(后端签发了会话 S1, 关联 unionid)
2. 打开 web-view 前: 请求后端生成一次性 ticket(30s 有效, 绑定用户+用途)
   this.setData({ h5Url: `https://h5.example.com/m/?ticket=${t}` })
3. H5 加载: 服务端用 ticket 换取会话(S2, 独立作用域)
   - H5 页面是自家服务端渲染/接口, ticket 在服务端校验后即刻作废
   - 一次性 + 短时效: URL 泄露/重放的爆炸半径被压到最小
4. 账号归一: 小程序 code2session 与 H5 网页授权拿同一 unionid(开放平台),
   两个会话在后端映射同一 uid, 购物车/资产天然互通
```

- 环境探测（H5 侧代码分支的前提）：

```js
// H5 侧判断"是否运行在小程序 web-view 里"
const inWxMini = /miniProgram/i.test(navigator.userAgent) ||
                 (window.__wxjs_environment === 'miniprogram')
if (inWxMini) {
  wx.miniProgram.navigateTo({ url: '/pages/order/list' })
} else {
  location.href = '/order/list'   // 普通浏览器降级
}
```

**加分项（P7 视角）**：

- 安全面要敢往深讲：web-view 是小程序安全模型上的"豁口"（H5 的 JS 能力不受小程序沙箱约束），所以官方用三重门禁——业务域名校验文件（证明域名控制权）、主体一致性、HTTPS。攻击面推演：URL 直接拼长效 token 会被浏览器历史/代理日志/referer 泄露；ticket 模式的要点是"证明过身份的凭证一次性消费"，配合绑定 IP/UA 与 HSTS。能从"凭证生命周期"角度设计鉴权共享，是安全意识的直接体现。
- 体验与架构的真实案例：我们一个"小程序 + 内嵌营销 H5"的项目，最初 H5 用 postMessage 回传购物车变更，测试发现消息"总在最后一步才到"（三个时机的坑），后改为"URL 参数下行 + navigateTo 上行 + 服务端事件兜底"，并规定 H5 内所有跳转必须走 wx.miniProgram.navigateTo 而不是 H5 内路由（否则会出现"WebView 里再开页面、返回顺序错乱"的双层历史栈问题）——web-view 的历史栈治理是被低估的深坑。
- 唤端能力的边界感：URL Scheme 有"有效期与访问次数配额"，高频营销场景要用"中间页 + 动态生成 + 配额监控"；开放标签要求用户主动点击，不能自动跳转。把"平台限制"当作产品设计约束提前同步给业务方，是资深工程师的协作价值。

## Q：小程序线上问题排查：vConsole、真机调试、性能 trace？

**核心答案**：小程序线上问题的排查体系分四层。第一层"开发者侧复现"：真机调试（开发者工具通过局域网/USB 连真机，可在工具里直接调试手机上的小程序，断点/审查元素与真机环境一致）；微信开发者工具里的 vConsole 面板与手机端"开发调试"开关（体验版/开发版右胶囊 → 打开调试）提供 console/network/storage/页面信息的移动端查看。第二层"用户侧取证"：线上正式包用户侧无法开控制台，必须依赖官方日志体系——`wx.getRealtimeLogManager` 实时日志（后台按 OpenID 检索，定位具体用户的问题）、`wx.getLogManager` 本地日志（用户反馈时随反馈包上传）、`App.onError`/`onUnhandledRejection` 全局异常捕获接自建监控。第三层"性能定位"：真机 Trace（开发者工具 Performance → 真机 Trace，录制后导出 .trace 文件用 chrome://tracing 打开，看 JS 执行/渲染/通信的分段时间线）+ `wx.getPerformance` 埋点（firstRender/evaluateScript/route 等指标）。第四层"发布兜底"：后台分阶段灰度发布（按比例/按用户）、快速回退版本、We 分析/小程序数据助手看大盘面。核心方法论：线上问题的本质是"把不可复现变成可观测"——日志先行、灰度止损、trace 定位。

**知识点解析**：

- 全局异常与日志的标准接入（每个小程序都该有的底座）：

```js
// app.js —— 三类兜底 + 日志器统一封装
const logger = wx.getRealtimeLogManager()   // 实时日志: 后台可按 OpenID 检索
const localLog = wx.getLogManager({ level: 0 })  // 本地日志: 用户反馈时上传

App({
  onError(msg) {
    // JS 运行时错误的总闸: 上报自建监控(Sentry 类) + 实时日志双通道
    logger.error('appOnError', msg)
    reportError(msg)
  },
  onUnhandledRejection(res) {
    // Promise 未捕获 rejection(接口 then 里抛错但不 reject 处理的都到这)
    logger.warn('unhandledRejection', res.reason && res.reason.message)
  },
  onPageNotFound(res) {
    // 扫码进失效页 -> 重定向首页, 避免白屏
    wx.reLaunch({ url: '/pages/index/index' })
  }
})
```

- 真机调试与 vConsole 的边界（很多人混淆）：

```text
工具上的"真机调试": 工具与手机建立连接, 断点在工具、执行在手机
   适合: 逻辑/断点/审查元素, 与真机表现一致的开发期定位
手机端 vConsole(打开调试): 体验版/开发版可用
   适合: 手机上看 network/console/storage, 现场演示与自测
   限制: 正式版用户侧无法打开(这正是必须有实时日志的原因);
         部分原生组件/性能表现与关闭调试时有差异
```

- 性能 trace 的完整用法（P6 到 P7 的实操题）：

```text
1. 开发者工具 -> Performance 面板 -> 真机 Trace(2.10.1+ 基础库)
2. 手机上复现卡顿操作, 停止录制, 导出 .trace 文件
3. Chrome 打开 chrome://tracing 导入, 按线程泳道看:
   - AppService 线程: JS 执行分段(哪个函数吃掉主线程时间)
   - 渲染相关: setData 后的 render/paint 耗时
   - 能直观看到"长任务在哪个 request 回调里" -> 精确定位到代码行
配套代码级埋点:
```

```js
// wx.getPerformance: 启动/路由/渲染的关键时间条目
const perf = wx.getPerformance()
const observer = perf.createObserver((list) => {
  list.getEntries().forEach((entry) => {
    // entryType: navigation/route/render/script
    report(entry.name, entry.duration)   // 上报大盘, 分版本对比
  })
})
observer.observe({ entryTypes: ['render', 'script'] })
```

- 线上白屏/卡死的排查树（实战沉淀的决策路径）：

```text
白屏:
  ├─ 分包下载失败(弱网/包体) -> 按渠道看启动成功率, 版本回退
  ├─ onLaunch 同步抛错 -> onError 日志检索 + 灰度圈定版本
  ├─ 低版本基础库语法不兼容 -> checkSystemVersion 上报 + 增强编译(ES6->ES5)
  └─ setData 大数据卡死 -> trace 确认(Q2 的治理)
用户反馈:
  ├─ 拿 OpenID -> 实时日志后台按用户检索时间线
  ├─ 复现不了的偶现问题 -> localLog 随反馈上传(反馈入口要引导用户触发)
  └─ 大盘异常 -> We 分析看版本/机型/地域分布, 定位是否某渠道集中
```

**加分项（P7 视角）**：

- 可观测性体系设计（P7 的真实考点）：我们把监控分三桶——错误（onError/rejection/接口 5xx/业务失败码）、性能（启动/首屏/setData 频次与体积/P95 分版本）、业务埋点（漏斗关键点），统一通过采样 + 聚合上报（navigation 合并批次，避免监控本身拖垮小程序），告警接企业微信。上线一个"监控覆盖率 dashboard"：每个版本的崩溃率、启动 P90、慢页面排行，事故时"先看大盘圈版本 → 灰度止损 → 实时日志定位用户 → trace 复现"是标准作业流程（SOP）。能讲出 SOP 而不是单个工具，是资深与初级的分界。
- 灰度即止血：小程序后台支持按比例分阶段发布与版本回退，我们的规范是"新版本 5% 观察 30 分钟（崩溃率/关键接口成功率）再放量"；依赖 SDK/基础库的改动要同时上报基础库版本，因为"基础库兼容性问题"是线上事故里最隐蔽的一类（特定版本 JsCore 的语法行为差异）。
- 一次真实的偶现问题复盘（叙事模板）：用户反馈"支付后订单页偶发白屏"——大盘无异常，实时日志检索该用户发现一条 `navigateTo:fail timeout`；真机 Trace 复现出"支付回调后立即 redirectTo 新分包页面，分包下载慢导致超时"；修复为"支付成功页常驻主包 + 分包下载完成后再跳转"。复盘要点：偶现问题的定位靠"用户级日志时间线 + 场景还原"，纯靠工具扫是扫不出来的——把日志密度设计好（关键动作必打点），排查能力才有地基。
