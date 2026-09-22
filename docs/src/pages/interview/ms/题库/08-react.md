# 8 React

React 题库：非主力栈但需体系化掌握——Fiber 与 Hooks 给到源码级解释，Concurrent、RSC 与 React 19 覆盖架构演进，全程对照 Vue 讲差异（最后一题是 P7 架构对比关键区分题），按 P6 体系化 + P7 深度双层组织。

## Q：Fiber 架构：链表结构、双缓冲、可中断渲染原理？

**核心答案**：Fiber 是 React 16 对协调器（Reconciler）的重写，把过去不可中断的递归 diff 改造成基于链表的可中断、可恢复的增量渲染。每个组件实例对应一个 Fiber 节点，通过 return/child/sibling 三个指针串成"树形链表"，渲染时以工作循环逐节点执行，每个节点就是一个工作单元，可以随时暂停并从断点恢复。双缓冲指同时维护 current（屏幕上正在显示）与 workInProgress（内存中正在构建）两棵 Fiber 树，二者通过 alternate 指针互指，render 阶段在 workInProgress 树上打副作用标记，commit 阶段一次性原子地替换 root.current，保证用户永远看不到半成品 UI。可中断的前提是 render 阶段必须纯净无副作用，这也是 React 强调"渲染必须是纯函数"的原因。

**知识点解析**：

- Fiber 节点核心字段（源码位置 react-reconciler/src/ReactFiber.js，字段有删减）：

```js
function FiberNode(tag, pendingProps, key, mode) {
  // 实例属性
  this.tag = tag;             // 节点类型：FunctionComponent / HostComponent 等
  this.key = key;
  this.type = null;           // 函数组件引用 / 类 / 'div' 字符串
  this.stateNode = null;      // 对应 DOM 节点或类组件实例

  // 链表结构：用三个指针把树拍平成链表
  this.return = null;   // 父节点（return 意为"处理完向上返回"）
  this.child = null;    // 第一个子节点
  this.sibling = null;  // 第一个右兄弟节点
  this.index = 0;       // 在父节点 children 中的位置，diff 用

  // 工作单元数据
  this.pendingProps = pendingProps; // 新 props
  this.memoizedProps = null;        // 上次渲染用的 props
  this.memoizedState = null;        // 上次 state；函数组件的 hooks 链表也挂这里
  this.updateQueue = null;          // 待处理的更新队列（setState 产生）

  // 副作用与调度
  this.flags = NoFlags;  // Placement / Update / ChildDeletion 等副作用标记
  this.lanes = NoLanes;  // React 18 的优先级模型（31 位二进制）
  this.alternate = null; // 双缓冲：指向另一棵树中的"自己"
}
```

- 链表遍历顺序（beginWork/completeWork 双阶段 DFS）：beginWork 自顶向下处理节点并返回 child；没有 child 时 completeWork 自底向上创建真实 DOM、上浮副作用标记（flags 沿 return 冒泡到父节点收集）；child 及其兄弟处理完后回溯 return。等价于递归遍历，但可以在任意两个节点之间暂停。

```js
// 工作循环（react-reconciler/src/ReactFiberWorkLoop.js，逻辑简化）
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    // performUnitOfWork = beginWork（向下）+ completeWork（向上回溯）
    workInProgress = performUnitOfWork(workInProgress);
  }
}
// shouldYield：当前时间是否超过本时间片截止时间（默认 5ms）
// 时间片由 Scheduler 用 MessageChannel 宏任务驱动，切片结束让出主线程
```

- 双缓冲的意义：与显卡"前台帧 + 后台帧"同理。workInProgress 树构建完成并 commit 后才整体替换 current，构建失败可整棵丢弃、基于 current 重来；已 commit 的 current 始终可交互。alternate 指针让两棵树节点一一对应，下次更新可复用节点避免重建，props 未变时直接 bailout（打上一个标记跳过子树）。
- 三阶段流水线：Scheduler（排队、切片、按优先级调度）→ render/reconcile（可中断，产出副作用链表）→ commit（不可中断，同步执行 beforeMutation / mutation / layout 三个子阶段）。
- 为什么要可中断：同步渲染下长列表更新一次可能几百毫秒，期间输入、动画全部卡死；可中断渲染让高优先级任务（用户输入）随时打断低优先级任务（大列表渲染），这是 Concurrent 特性的地基。

**加分项（P7 视角）**：

- 优先级模型演进：React 17 用 expirationTime（一个绝对时间戳）表示优先级，只能表达"整体更紧急"，无法让多个不同优先级更新在同一次渲染中交织；React 18 改成 31 位二进制的 lanes（车道模型），一个 Fiber 可同时挂多个 lane，位运算判断"本次渲染要处理哪些更新"，这是 transition、Suspense、自动批处理共同的基建。
- 为什么不用 requestIdleCallback：其触发时机与频率不可控（浏览器忙时可能长时间不回调）、兼容性差，Scheduler 用 MessageChannel 宏任务自己实现切片，5ms 一片，可并行任务按优先级插队。
- 与 Vue 对比（能讲清这层是分水岭）：Vue 依赖收集天然是细粒度更新——某个数据变了只有直接依赖它的副作用重算，不需要时间切片来救帧；React 是组件级推倒重跑，"从组件开始整棵子树重新执行函数"，只能靠切片防长任务阻塞交互。两类架构殊途同归：Vue 靠编译器 + 响应式省掉不必要的工作，React 靠调度把必要的工作拆散。
- 生产案例：React 17 迁移 React 18 时必须换 `createRoot(rootElement).render()`，`ReactDOM.render` 是 legacy 模式，render 阶段仍同步不切片——迁移点没做对，Concurrent 优化全部无效，这是升级排查的第一步。

## Q：生命周期与函数组件：class 三阶段 vs hooks 等价实现？

**核心答案**：class 组件生命周期分挂载、更新、卸载三阶段。挂载：constructor → getDerivedStateFromProps → render → componentDidMount；更新：new props / setState / forceUpdate → getDerivedStateFromProps → shouldComponentUpdate → render → getSnapshotBeforeUpdate → componentDidUpdate；卸载：componentWillUnmount。React 16.3 废弃了 componentWillReceiveProps / componentWillUpdate / componentWillMount（改加 UNSAFE_ 前缀），因为在可中断渲染下它们可能被调用多次，副作用不安全。函数组件没有生命周期，只有"副作用的执行时机"——useEffect 的挂载/依赖变化/cleanup 是三阶段的等价物，但心智模型不同：class 是"时间点上的回调"，hooks 是"每次渲染的快照 + 声明依赖的数据流"。

**知识点解析**：

- class 三阶段完整顺序（React 16.3+ 版本，全程只有 render 与生命周期是用户代码）：

```text
挂载:  constructor → getDerivedStateFromProps → render → componentDidMount
更新:  getDerivedStateFromProps → shouldComponentUpdate → render
       → getSnapshotBeforeUpdate → componentDidUpdate
卸载:  componentWillUnmount
错误:  getDerivedStateFromError（渲染阶段，返回 state 显示降级 UI）
       componentDidCatch（commit 阶段，可上报日志）
```

- hooks 等价实现对照（注意是"近似等价"，时机与语义都有差异）：

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  // ≈ componentDidMount + componentDidUpdate(依赖变化) + componentWillUnmount
  useEffect(() => {
    const channel = subscribe(userId);  // didMount / didUpdate
    return () => channel.close();        // willUnmount（依赖变化前也会先执行）
  }, [userId]);

  // ≈ componentDidMount（同步、DOM 更新后、绘制前，适合量布局）
  useLayoutEffect(() => measure(), []);

  return <div>{user?.name}</div>;
}
```

- 没有直接等价物的部分：getSnapshotBeforeUpdate（DOM 更新前读旧布局，如滚动位置）没有 hook 对应，只能在 useLayoutEffect 里读 ref 近似（此时 DOM 已是新值，需先在渲染时记录旧值）；错误边界 getDerivedStateFromError / componentDidCatch 至今只能用 class 组件实现（官方推荐直接用 react-error-boundary 库封装好的 ErrorBoundary）。
- getDerivedStateFromProps 的"等价"是渲染期间调整 state 模式，但官方更推荐两种替代：派生值直接在渲染时计算；props 变化需要重置 state 时直接换 key。

```jsx
// props 变化想重置全部内部 state：给 key，key 变 → 整个组件卸载重建
<UserProfile key={userId} userId={userId} />
```

- StrictMode（React 18 dev）会"挂载 → 立即卸载 → 再挂载"跑两遍 effect，用于暴露缺失的 cleanup；生产不执行，但升级时大量"请求发了两次"的告警来自这里，属于定位问题的能力而非 bug。

**加分项（P7 视角）**：

- 源码层：生命周期只是协调器在特定阶段调用的回调——componentDidMount 在 commit 的 layout 子阶段（commitLayoutEffects）执行，shouldComponentUpdate 在 render 阶段 beginWork 里调用；这解释了为什么 UNSAFE_ 生命周期危险：它们在 render 阶段被调用，而 Concurrent 下 render 阶段可能被打断重来。
- 架构差异：class 把"订阅/取消订阅"拆在 didMount 和 willUnmount 两处，逻辑按时间点割裂；hooks 把同一关注点聚合在一个 effect 里、按依赖数组声明数据流——这是"面向生命周期编程 vs 面向数据流编程"的本质区别，可类比 Vue 的 watch/computed 同为数据流导向。
- 迁移策略：大项目 class → hooks 不建议一刀切。新组件 ESLint 强制 hooks + react-hooks 规则卡点，旧 class 组件用适配层渐进包装；React 19 后函数组件 ref 可直接作为 props 传入（不再需要 forwardRef），class 最后一点优势也在消失。

## Q：Hooks 原理：链表存储、闭包陷阱？setState 批处理与 React 18 自动批处理？

**核心答案**：函数组件每次渲染都是重新执行函数，所以 hooks 的数据必须存在函数外部——存在对应 Fiber 节点的 memoizedState 字段上，以单链表按调用顺序串联，这正是"hooks 不能写在条件/循环里"的原因：顺序错位就会读到别的 hook 的状态。useState 的每次 setState 生成一个 update 对象，追加到 hook 的环形链表上，调度渲染时按优先级折叠出最终 state。闭包陷阱指每次渲染都产生捕获当次 state/props 的新闭包，旧闭包里的值不会自动更新，表现为"过期状态"。批处理指一次事件里多次 setState 合并为一次渲染：React 17 只在合成事件回调内批处理，React 18 借助 lane 优先级模型把批处理扩展到 Promise、setTimeout、原生事件等所有上下文，即自动批处理。

**知识点解析**：

- hooks 链表结构（源码 ReactFiberHooks.js 的 mountWorkInProgressHook/updateWorkInProgressHook，逻辑简化）：

```js
// fiber.memoizedState 指向 hooks 单链表，每个 hook 节点：
{
  memoizedState: null,  // 该 hook 的数据：useState 存 state、useEffect 存 effect 对象
  baseState: null,      // 跳过低优先级更新时，作为重放基准的 state
  baseQueue: null,      // 被跳过的低优先级 update（下一次还要处理）
  queue: {
    pending: null,      // update 的【环形链表】
    lastRenderedState: init, // eagerState 优化用的"上次计算出的 state"
  },
  next: null            // 指向下一个 hook —— 规则的根源
}
```

- update 环形链表：queue.pending 指向最后插入的 update，pending.next 指向最早的一个，O(1) 追加且支持按优先级分段消费——updateQueue 用环而不是数组，是为了低优先级 update 被跳过后能整段保留重放（React 18 前依赖 baseState + baseQueue 重放）。
- dispatchSetState 的 eagerState 优化（源码逻辑简化）：当前队列空闲时先"乐观计算"新值，与旧值相同则连调度都省掉。

```js
function dispatchSetState(fiber, queue, action) {
  const lane = requestUpdateLane(fiber);        // 取当前优先级
  const update = { action, lane, next: null };  // 挂入环形链表
  if (fiber.lanes === NoLanes) {
    // 队列空闲 → 提前用 reducer 算一把
    const currentState = queue.lastRenderedState;
    const eagerState = basicStateReducer(currentState, action);
    if (Object.is(eagerState, currentState)) return; // 值没变，直接不调度！
  }
  // 否则：入队 + scheduleUpdateOnFiber 安排渲染
}
```

- 闭包陷阱的两种典型与解法：

```jsx
// 陷阱一：定时器里永远是旧值 —— effect 只在首挂载执行，捕获首屏的 count
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000); // count 恒为 0
  return () => clearInterval(id);
}, []);
// 解法 A：函数式更新，基于最新 state 计算
setCount((c) => c + 1);
// 解法 B：把 count 放进依赖数组，让 effect 随值重建

// 陷阱二：useCallback 漏写依赖 → 回调捕获旧 props/state
const handleClick = useCallback(() => log(userId), []); // log 永远拿到首屏 userId
// 解法：补全依赖；或用 useRef/useEffectEvent 拿"最新值"
```

- useRef 是闭包陷阱的官方逃生舱：ref 对象跨渲染稳定存放在 fiber 上，读写 current 永远取最新值，且改动不触发渲染。
- 批处理对比：

```jsx
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
  // React 17：合成事件内批处理 → 1 次渲染
  // React 17：Promise/setTimeout 回调里 → 2 次渲染（不批）
  // React 18 createRoot：任何位置 → 1 次渲染（自动批处理）
  // React 18 想强制同步刷出：flushSync(() => setCount(1))
}
```

**加分项（P7 视角）**：

- React 17 批处理的实现是一个模块级变量 executionContext 里的 BatchedContext 位：合成事件派发前后 set/reset 该标记，render 时收集所有 update 一次性处理；出了 React 事件就失效，所以社区要靠 unstable_batchedUpdates 手动包。React 18 的改法是把"优先级合并"下放到 lane 模型：多次 setState 只是在同一 Fiber 上合 lane（按位或），render 时统一消费——批处理从"环境开关"变成"调度模型内生能力"，才可能覆盖所有上下文。
- 闭包陷阱的架构级解读：React 的"不可变 + 快照"模型天然制造 stale closure，代价换来的是渲染可重放、可并发、可中断的一致性；Vue 的响应式模型里 getter 永远读到最新值，没有 stale closure，但需要小心 effect 依赖追踪是否命中。两种模型各自把复杂度放在不同位置，这题答到这层才算架构视角。
- 生产案例：旧代码在 setTimeout 里连发多个 setState，升级 React 18 后由多次渲染合并为一次，页面行为可能变化（依赖中间态的逻辑会坏）；官方升级文档专门列出此条，迁移前要审查这类代码。

## Q：useEffect vs useLayoutEffect vs useInsertionEffect 的执行时机？

**核心答案**：三个 hook 都在 commit 阶段执行，差别在"相对 DOM 变更和浏览器绘制的位置"。useLayoutEffect 在 DOM 变更之后、浏览器绘制之前同步执行，会阻塞绘制，适合读取/同步布局（量尺寸、滚动位置）；useEffect 在绘制之后异步执行（通过 Scheduler 调度的任务里 flush），不阻塞页面，适合订阅、请求、日志等无视觉依赖的副作用；useInsertionEffect 在所有 layoutEffect 之前执行，且此时 refs 还未挂上，是给 CSS-in-JS 库插样式用的，避免"先读布局再插样式导致二次回流"。顺序口诀：DOM 变更 → useInsertionEffect → useLayoutEffect → 浏览器绘制 → useEffect。

**知识点解析**：

- 执行时序图：

```text
render 阶段（可中断）
  └→ commit 阶段（同步）
       ├─ beforeMutation：getSnapshotBeforeUpdate
       ├─ mutation：DOM 插入/更新/删除（useInsertionEffect 的 cleanup + 执行）
       ├─ layout：useLayoutEffect 的 cleanup + 执行、挂 refs、componentDidMount
  └→ 浏览器绘制（paint）
  └→ 下一轮宏任务：useEffect 的 cleanup + 执行（passive effects）
```

- useEffect 的"异步"实现：commit 完成后不直接执行 effect，而是 scheduleCallback 以 NormalPriority 调度一个 flushPassiveEffects 任务；多数情况下它在绘制后立即执行，但若被更高优先级任务（用户输入）插队，可能推迟——所以不能假设"useEffect 在下一次交互前一定跑完"。
- useLayoutEffect 的典型场景（同步读布局，避免"闪一下"）：

```jsx
function Tooltip() {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    // DOM 已更新但还没绘制：在这里量尺寸并同步 state，
    // 用户不会看到旧位置 → 新位置的闪烁（绘制被推迟到两次更新之后）
    const rect = ref.current.getBoundingClientRect();
    setPos(clamp(rect.top));
  }, [deps]);
  return <div ref={ref} style={{ top: pos }} />;
}
```

- useInsertionEffect：设计动机是 styled-components 这类库——旧方案在 layoutEffect 里插入样式，读布局的代码可能先执行，造成样式抖动（FOUC）与强制同步布局两次；在插入阶段先挂样式即可保证 layoutEffect 读到正确布局。限制：不能读 refs、不能 setState，只该干插样式一件事。
- cleanup 执行时机：更新时先执行上一个 effect 的 cleanup 再执行新 effect；卸载时只执行 cleanup。StrictMode 下挂载会"effect → cleanup → effect"双跑。
- SSR 注意：服务端无法执行 layoutEffect，用了会告警，可用 useEffect 替代或用 useIsomorphicLayoutEffect 兼容写法。

**加分项（P7 视角）**：

- 死循环陷阱：useLayoutEffect 里 setState 会在绘制前同步再渲染一轮，写错依赖极易"渲染 → effect → setState → 渲染"死循环；useEffect 里 setState 同样会多一轮绘制但至少用户先看到首屏。能用 useEffect 就不用 useLayoutEffect 是默认原则，布局同步是例外。
- 源码层：passive effects 有专门的 flushPassiveEffects 队列，且在下一次 render 开始前会强制 flush 未执行的 effects（保证卸载组件的 cleanup 不被无限推迟）；effect 的 tags 存在 fiber.updateQueue 的 effect 环形链表上，与 update 队列同构。
- Vue 对照：Vue 的 watch/watchEffect 有 flush 选项——'pre'（组件更新前）、'post'（对应 layoutEffect，DOM 已更新）、'sync'；useLayoutEffect ≈ flush: 'post' 的 watcher，useEffect 没有严格对应（Vue 没有"绘制后"时机，post 就是 DOM 更新后）。能做这个映射说明两边都吃透了。

## Q：useMemo/useCallback/useRef 的正确使用与性能误区（序列化 props 比较）？

**核心答案**：useMemo 缓存"计算结果"，useCallback 缓存"函数引用"（等价 useMemo 返回函数），依赖数组用 Object.is 逐项浅比较，相等则直接返回上次缓存值；useRef 是跨渲染稳定的可变盒子，不止用于 DOM，也是"最新值容器"。正确使用只有三类场景：计算确实昂贵、引用需要稳定（传给 memo 子组件或作为 effect 依赖）、配合 useRef 存最新值。最大误区是到处包——每个 hook 都有依赖比较与缓存内存成本，组件本身很便宜时纯属负优化。序列化 props 比较指用 JSON.stringify 之类做深比较来自定义 React.memo 的 shouldUpdate，属于"打补丁"手段：对象深层不稳定时应该先解决引用稳定，而不是引入深比较。

**知识点解析**：

- memo 生效的完整链路：父重渲染 → 子组件被 React.memo 包裹 → props 逐项 Object.is 比较 → 全等才跳过。任何一项是新引用都穿透：

```jsx
const List = React.memo(function List({ items, onClick, style }) {
  return <div style={style} onClick={onClick}>{items.map(/* ... */)}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);
  // 三个 props 每次渲染都是新引用 → React.memo 完全失效
  return (
    <List
      items={data.filter(d => d.active)}   // 每次新数组
      onClick={() => console.log(count)}   // 每次新函数
      style={{ color: 'red' }}             // 每次新对象（双花括号内联字面量）
    />
  );
}

// 修复：引用稳定化
const items = useMemo(() => data.filter(d => d.active), [data]);
const onClick = useCallback(() => console.log(count), [count]);
const style = useMemo(() => ({ color: 'red' }), []);
```

- 序列化/深比较 props（兜底方案而非首选）：

```jsx
// 自定义比较器：字段级浅比较（推荐，精确控制）
const MemoList = React.memo(List, (prev, next) =>
  prev.items.length === next.items.length && prev.query === next.query
);

// JSON.stringify 全量序列化比较（能跑但有三宗罪）：
// 1. key 顺序不同 → 结果不同；2. 函数/undefined/循环引用处理不了；3. 大对象序列化本身比渲染还贵
const areEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
```

- useMemo 的三个语义边界：它只是"性能建议"不是"缓存保证"（React 可能在内存压力下丢弃）；不能当副作用依赖的"变化检测器"用（应使用 useEffect + 上一个值模式）；依赖数组忽略 React 本身也 lint 得出来（react-hooks/exhaustive-deps）。
- useRef 的两大高阶用法：最新值容器（解闭包陷阱）、保存不触发渲染的可变实例属性（定时器 id、订阅句柄）。误用：渲染期间读写 ref.current 会破坏渲染纯度（Concurrent 下同一次渲染可能被重放）。

```jsx
function latestValueRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }); // 提交后再更新，渲染期间只读
  return ref;
}
```

- 性能决策顺序：先用 Profiler 确认有热点 → 状态下放（把 state 移到真正使用它的子组件）→ 组合模式（children 作为 props，内容由父渲染好传入，子组件重渲染时 children 引用不变）→ 最后才是 memo + 稳定 props。

**加分项（P7 视角）**：

- React Compiler（原 React Forget）：编译期自动插入 memoization——基于静态分析数据流的"是否变化"推断，构建时给每个值/函数自动 memo，官方目标是让开发者删掉绝大多数手写 useMemo/useCallback/React.memo；回答这题时主动提"未来这类手艺会被编译器接管，所以现在更应该理解 memo 的成本模型而不是堆 API"是明显的加分信号。
- 成本模型量化：memo 比较是 O(props 数) 的浅比较 + 常驻内存缓存；一个 20 行的展示组件 memo 化几乎必然负优化，而 5000 行列表项 memo 化收益巨大——"优化是测出来的，不是包出来的"。
- Vue 对照（P6 就该会，P7 必答）：Vue 的 props 天然是响应式代理，子组件模板只依赖被访问的 props，父组件其他数据变化不会导致子组件重渲染，所以 Vue 没有 memo 文化；React 的不可变模型导致"父渲染 → 默认全子树重跑"，memo 是给这个默认行为打的补丁。v-memo 是 Vue 3.2 给极端场景（大 v-for）的补充指令，定位和 React.memo 完全不同。

## Q：状态管理：Context 分片、Zustand/Jotai/Redux Toolkit 如何选型？

**核心答案**：Context 的设计初衷是"依赖注入"（主题、语言、当前用户这类低频全局值），不是状态管理库——context value 变化会使所有消费组件重渲染，且 Provider 包裹的中间组件无法阻止。缓解手段是分片（按领域拆多个 Provider）+ 下放（value 里高频变化的部分拆出独立 context）+ 状态外置（Context 只存 store 引用，组件从 store 订阅切片）。选型逻辑：需要 DevTools 时间旅行、团队大、规范重 → Redux Toolkit；个人/中小项目要零样板、订阅粒度细、包体小 → Zustand；状态天然是"原子化、图状依赖"（表单、派生联动）→ Jotai；服务端状态（缓存、重试、失效）单独交给 TanStack Query，不塞进客户端状态库——"服务端状态与客户端状态分离"是现代选型的第一原则。

**知识点解析**：

- Context 的重渲染问题与分片模式：

```jsx
// 反例：一个大 context，任何字段变化 → 所有消费组件重渲染
const AppContext = createContext();
const { user, theme, notifications } = value; // notifications 高频变化

// 正解一：分片——按变化频率拆
const UserContext = createContext(null);    // 低频：登录后不变
const ThemeContext = createContext(null);   // 低频
const ToastContext = createContext(null);   // 高频：独立拆出去

// 正解二：状态外置——Context 只提供稳定的 store 引用
// 消费方用 useSyncExternalStore 精确订阅切片，没订阅的组件不渲染
const StoreContext = createContext(null);   // value = { getState, subscribe }（稳定引用）
```

- Zustand 核心 API（create + 选择器订阅）：

```js
import { create } from 'zustand';

const useBearStore = create((set, get) => ({
  bears: 0,
  inc: () => set((s) => ({ bears: s.bears + 1 })),
  reset: () => set({ bears: 0 }),
}));

// 组件里：选择器只订阅切片，bears 不变则本组件不重渲染
const bears = useBearStore((s) => s.bears);
const inc = useBearStore((s) => s.inc); // 引用稳定，天然免 useCallback
```

- Zustand 原理一句话：模块级 store（createStore + listeners Set），set 遍历通知 listener，组件通过 useSyncExternalStore 订阅 getState 快照；选择器结果用 Object.is 判断要不要重渲染。没有 Provider、没有 Context，天然支持组件外调用（`useBearStore.getState()` 在工具函数/路由守卫里直接可用）。
- Jotai 原子模型：状态定义为原子，派生用派生原子，写操作用 writeAtom，组件订阅到的依赖图自动追踪、自动按需更新——心智与 Vue 的 computed 链非常接近，适合深联动表单。
- Redux Toolkit（RTK）：createSlice 声明式 reducer + Immer 内置可变写法（produce 代理翻译成不可变更新）+ RTK Query 数据层，配 DevTools 与中间件生态；代价是概念多（dispatch/action/reducer/middleware）、样板与包体偏大，换来强约束与可追溯调试。
- 服务端状态边界：列表、详情、用户信息这类"本质是服务端数据的缓存"用 TanStack Query/SWR 管理（缓存失效、重试、去重、一致性），客户端状态库只留 UI 状态与跨页业务态——混在一起是大多数"全局 store 越来越乱"的根因。

**加分项（P7 视角）**：

- useSyncExternalStore 是 React 18 给外部 store 的官方协议：getSnapshot 返回值必须稳定（同一状态返回同一引用，否则死循环），内部用两次读取检测 tearing（并发渲染不同分支读到不同版本），这把 zustand/redux 的并发一致性接进了 React 调度体系——能讲到这一层的候选人极少。
- Redux 仍在金融、大型 B 端流行的真实原因不是技术而是组织：强单向数据流 + action 日志 = 可审计、可回放、新人可读；选型报告里"规范收益 > 开发效率"的判断本身就是架构能力。
- Vue 对照：Pinia 同样是"外部 store + 细粒度订阅"，但订阅靠 Proxy 依赖收集自动完成，组件只写 `const store = useStore()` 再在模板里读 store.xxx，不需要手写选择器（不写选择器也能只重渲染依赖项）；React 侧选择器是必需品，因为 React 无法自动追踪读取。这正是响应式与拉取式模型的又一个分叉点。

## Q：Concurrent 模式：时间切片、transition、useDeferredValue/startTransition？

**核心答案**：Concurrent（并发）指 React 可以同时维护多份"渲染任务"并按优先级调度：高优先级更新（输入、点击）随时打断正在进行的低优先级渲染，抢完后基于最新 state 重新开始被丢掉的工作。三个支撑点：时间切片（render 阶段按 5ms 一片让出主线程）、lane 优先级模型、可丢弃/可重放的 updateQueue。开发者侧 API 是 startTransition / useDeferredValue——把"非紧急更新"标记为 TransitionLane：紧急更新立即提交保证输入跟手，低优先级更新在后台切片渲染、完成后延迟提交，两者数值不同时用户先看到紧急的。典型场景：搜索框即时回显输入（紧急）+ 结果列表过滤（低优先）。

**知识点解析**：

- 不用 transition 的问题：输入与结果列表在同一次同步渲染里，列表 5000 条时每敲一个字阻塞几百毫秒，输入框卡顿丢字。用了之后两条更新通道分流：

```jsx
function SearchBox({ query, setQuery, onFilter }) {
  const [input, setInput] = useState(query);

  function handleChange(e) {
    const value = e.target.value;
    setInput(value);              // 紧急：同步渲染，输入立即回显
    startTransition(() => {       // 低优先：切片渲染，可被打断
      onFilter(value);            // setQuery → 列表过滤
    });
  }
  return <input value={input} onChange={handleChange} />;
}
```

- useDeferredValue：同一件事的"值版"——不改变更新发起点，而是让某个 props/state 的"消费渲染"被推迟。

```jsx
const deferredQuery = useDeferredValue(query);
// query 更新 → 组件先带旧 deferredQuery 同步渲染（快，输入跟手）
// 之后再以低优先级切片渲染新 deferredQuery 的大列表
const items = useMemo(() => filter(data, deferredQuery), [deferredQuery]);
// isStale 可用于降透明度做视觉反馈，标记"结果在追赶输入"
```

- 时间切片实现链路：Scheduler 维护两个小顶堆（taskQueue 按 startTime、timerQueue 按 expirationTime），MessageChannel 宏任务逐个取出执行，超过 5ms 切片让出；render 阶段每处理一个 Fiber 检查 shouldYield，true 则保存 workInProgress 断点并退出，宏任务下轮恢复。
- 打断与重放：被高优先级打断时，低优先级 lane 上的 update 不丢——它们仍挂在 hook 的 queue 上，高优先级渲染完成后剩余 lane 会被重新调度，基于新的 baseState 重放（配合useTransition 的 isPending 提供加载态）。
- 优先级从高到低（React 18 lane 体系）：离散事件（SyncLane/DiscreteEventLane 输入、点击）> 连续事件（连续滑动）> DefaultLane（一般 setState）> TransitionLane（startTransition）> IdleLane（offscreen 预渲染）。
- useTransition vs useDeferredValue 选谁：能拿到 setState 调用点（事件处理器里）用 startTransition 更明确；值来自 props 或想保持组件受控简洁，用 useDeferredValue。

**加分项（P7 视角）**：

- 饥饿（starvation）问题：低优先级更新一直被抢怎么办？Scheduler 对超时任务按 expirationTime 升级处理，等待过久的任务最终会被强制执行；能主动提"优先级调度必须配饥饿策略"说明真读过调度器。
- 保守边界：transition 内的更新必须是"可被丢弃重放"的——不纯的渲染（期间改外部可变状态）在被打断重放时会执行多次产生脏写；这也解释了为什么 effect 在 commit 阶段而渲染必须纯净，两者是同一设计契约。
- Vue 对照：Vue 没有时间切片（尤雨溪明确论证过：依赖收集让组件更新成本与模板规模成正比、通常足够小，不需要切片救帧），对应能力是 `v-memo` / `defer + Transition`（Vue 3.5 的 useId 时代配套方案）；"Vue 靠细粒度把单帧工作做小、React 靠调度把大工作拆散"是两种工程哲学，面试里这条对比几乎必追问。

## Q：Suspense 与流式 SSR（React 18/19 服务端组件 RSC 架构）？

**核心答案**：Suspense 声明"子树未就绪时显示什么"，把"加载态"从命令式（loading 状态 + 条件渲染）变成声明式边界，React 18 起贯穿 CSR 懒加载（React.lazy）、数据请求（组件 throw promise）、SSR 流式渲染三条链路。流式 SSR：renderToPipeableStream 先尽早冲刷首屏 shell，被 Suspense 包裹的慢模块完成后再以 script 标签补发片段并原位替换 fallback——首字节时间（TTFB/FCP）不再被最慢模块拖累。选择性水合（selective hydration）：各 Suspense 边界的数据齐了就先水合哪块，用户点击某块未水合区域时 React 会优先提升它的水合优先级并重放事件。RSC（React Server Components，React 19 默认内建）：服务端组件在服务端渲染成可序列化的 UI 树流（Flight 协议）下发给客户端，客户端组件只承担交互部分，服务端组件零打包体积、可直接 async/await 访问数据库与文件系统。

**知识点解析**：

- 三个阶段演进：React 16 Suspense 只有 lazy 语义；18 加成"数据 + SSR 流式 + 选择性水合"（配 `renderToPipeableStream` + `hydrateRoot`）；19 把 Suspense 与 RSC/use() 深度整合成默认架构。
- 流式 SSR 的结构：

```jsx
// 服务端（Node）
import { renderToPipeableStream } from 'react-dom/server';

renderToPipeableStream(
  <Layout>
    <Suspense fallback={<SlowFallback />}>
      <SlowDataComponent />  {/* 慢：等数据齐再补发 */}
    </Suspense>
    <Article />              {/* 快：随 shell 首次冲刷 */}
  </Layout>,
  {
    onShellReady() {
      shell.pipe(res);        // 尽早输出首屏骨架（fallback 版本）
    },
  }
);
// 浏览器收到：<div id="S:0">fallback</div> ... 之后追加
// <div hidden id="B:0">真实内容</div> + <script>$RC("B:0","S:0")</script> 原位换掉
```

- 选择性水合 + 事件重放：未水合区域先只挂原生事件捕获，用户点击时 React 记录事件、提升该边界的 lane 优先完成水合再重放 click——用户永远不用"等全页水合完才能交互"。
- RSC 的心智模型：

```jsx
// app/page.tsx —— 默认就是 Server Component（零客户端体积）
import { db } from '@/db';
export default async function Page() {
  const posts = await db.query('SELECT * FROM posts'); // 服务端直连
  return (
    <>
      <PostList posts={posts} />
      {/* children 由服务端传给客户端组件，边界处序列化 */}
      <LikeButton>{'use client' /* 点击态才进 bundle */}</LikeButton>
    </>
  );
}
```

- RSC 三条规则：'use client' 文件是边界，客户端组件不能再 import 服务端组件（但服务端组件可作为 props.children 传进来）；服务端组件不能用 useState/useEffect/事件回调/浏览器 API；每次导航重新在服务端执行（树不常驻服务端内存）。
- Suspense 数据请求范式：传统库（如旧版 react-loadable 之外的 Relay/SWR 模式）组件渲染时 throw promise，最近 Suspense 的边界接住并显示 fallback，resolve 后 React 从中断处"重放"该子树。

**加分项（P7 视角）**：

- 术语辨析：SSR（HTML 字符串）→ 流式 SSR（分块 HTML）→ RSC（流式 UI 树 + 少量客户端 JS）→ 流式 SSR + RSC 混合（Next.js App Router 的现实形态：RSC payload 流嵌在 HTML 流中，水合后继续追加）。能画出这条演进线并指出每步解决什么瓶颈（TTFB、交互时间、bundle 体积、数据瀑布）是区分度所在。
- 水合错误与回退：hydration mismatch（服务端/客户端输出不一致）在流式 + 选择性水合下排查更难，React 19 提供 onRecoverableError 与错误根（onUncaughtError/onCaughtError）作为可观测钩子；时间戳、随机数、locale 格式化是三大经典来源。
- Vue 对照：Nuxt 3 的 payload extraction + islands（serverComponent/ClientOnly）对应 RSC 精神，但 Vue 生态没有等价的 RSC 运行时协议，Vue 3.5+ 的思路是在 SSR 输出里剥离"未变化水合数据"减轻水合成本；React 用"组件级服务端化"换 bundle，Vue 用"序列化精简"换水合——对比维度清晰即可拿分。

## Q：合成事件系统：事件委托到 root、与原生事件差异、优先级？

**核心答案**：React 自建一套事件系统：不把监听器绑在每个 DOM 上，而是在每个应用的根容器（root container）上注册一批原生监听器，事件触发后从原生事件构造合成事件（SyntheticEvent），再按 Fiber 树模拟捕获/冒泡两阶段把事件派发给对应的 JSX 处理器——即"事件委托 + 统一分发"。意义有三：跨浏览器统一接口（normalize）、省内存（千行列表只挂一份监听）、事件与 Fiber 优先级系统打通（事件类型决定更新优先级）。React 17 起委托目标从 document 改为 root 容器，解决多应用共存（微前端）与正确使用原生捕获事件的问题。

**知识点解析**：

- 委托结构：root 上为每种事件类型各挂一个"代理监听器"（如 click），依赖 React 版本在 capture/bubble 两阶段模拟；某些不冒泡/特殊事件（resize、scroll、媒体事件、invalid）直接绑在元素本身，不进委托系统。
- 合成事件与原生事件的关系：

```jsx
function Demo() {
  useEffect(() => {
    const el = ref.current;
    el.addEventListener('click', () => console.log('原生监听')); // 直接绑定
    return () => el.removeEventListener('click', handle);
  }, []);
  return <div ref={ref} onClick={() => console.log('合成事件')}>点我</div>;
}
// 点击输出：原生监听 → 合成事件
// 原生先触发（根上的原生监听器拿到事件后，才开始构造合成事件并派发 JSX 的 onClick）
```

- SyntheticEvent 要点：与原生同名属性对齐（target/currentTarget/stopPropagation/preventDefault），是 Event 的薄包装；e.nativeEvent 拿原生事件。React 16 的"事件池"（对象复用，回调外访问 e.target 变 undefined，必须 e.persist()）在 React 17 已移除，现在是每次新建，不再有这个坑。
- stopPropagation 的边界：合成事件的 stopPropagation 只能拦住 React 树内后续派发（JSX 上的父级 onClick 不再触发），拦不住 root 上其他原生监听器（包括另一个 React 应用的）；需要拦根上原生监听要用 e.nativeEvent.stopImmediatePropagation()。
- onChange 的"合成语义"：React 的 onChange 不是原生 change（失焦才触发），而是由 input/change/keydown 等多个原生事件合成的"即时输入"事件，每次击键都触发——这是受控组件能逐键同步的原因，也是 React 对 DOM 标准语义的"修正"。
- 事件优先级（Concurrent 的入口）：源码 getEventPriority 按事件类型映射 lane——离散事件（click、keydown）→ DiscreteEventLane（同步级，保证交互即时反馈）；连续事件（mousemove、touchmove、wheel）→ ContinuousEventLane（可中断但优先于默认）；其他（如 focus）→ DefaultLane。事件触发本身就是"产生一个 setState + 一个带优先级的调度任务"。

**加分项（P7 视角）**：

- 为什么 17 把委托从 document 下沉到 root：document 级委托在微前端多 React 应用共存时互相干扰（A 应用的事件派发遍历会让 B 应用的处理逻辑介入）；同时 root 级捕获监听让 React 的捕获阶段语义与 DOM 真实顺序一致——微前端场景（qiankun/wujie 嵌 React 子应用）遇到过"事件错乱"的，根因多在这一层，能主动联系到简历里的微前端项目是亮点。
- 水合事件重放：SSR 下用户在水合完成前点击未水合区域，React 会在根上"录下"离散事件，等目标边界完成水合后按记录重放——这就是离散事件走同步 lane 的原因，保证"点一次只生效一次"。
- Vue 对照：Vue 的 v-on 是每个元素直接 addEventListener，无委托无合成层（除少数跨浏览器 normalize），语义直白、无"池/优先级/重放"复杂度，代价是万级节点时监听器数量大；React 用一层系统复杂度换全局调度能力——事件系统是"React 拿调度权"的入口，这层解读能直接抬升答题高度。

## Q：diff 与 key？受控/非受控组件？HOC vs render props vs hooks？

**核心答案**：diff 是 Reconciler 生成新 Fiber 树时与旧树对齐的启发式算法，复杂度从理论 O(n³) 用两个假设砍到 O(n)：同层比较（跨层级移动按删除+新建处理）、类型相同直接复用（state 保留）。key 的作用是给同层节点唯一身份，让" reordered/inserted"能识别为"同一个节点移动了"而非"一系列新节点"，避免状态错位与整段重建。受控组件把输入值交给 state 管理（value + onChange，单一数据源），非受控组件由 DOM 自己管值（defaultValue + ref，读时才取）。逻辑复用三方案：HOC 包装组件再转发 props（隐式、嵌套地狱、命名冲突）；render props 用 children/函数 prop 显式传入渲染（嵌套深但数据流清晰）；自定义 hooks 直接在函数内复用状态逻辑，不产生额外组件层级——是当前标准答案。

**知识点解析**：

- diff 策略三层：树级（root 类型不同整树重建）、组件级（同类型组件保留实例只更新 props——class 实例与 state 存活）、元素级（同层 children 逐个按 key 匹配）。元素级实现是 reconcileChildFibers：单元素直接按位置比对，多元素两轮遍历——第一轮按 newChildren 顺序与旧 Fiber 逐个比对（不匹配立即跳出），第二轮对剩余旧 children 建 key → Fiber 的 Map，新列表逐个查 Map 匹配，命中即复用（可移动），未命中新建，多余的打 ChildDeletion。
- key 的两大规则：唯一 + 稳定。index 作 key 的经典事故：

```jsx
// 列表 [a, b, c] 用 index 作 key，头部插入 d 变成 [d, a, b, c]
// diff 结果：key=1 的 a 位置变成了 b 的内容……React 认为是"每个位置的项都改了"
// 后果 1：内部 state（输入框草稿、勾选态）跟着位置错位
// 后果 2：本可复用的 DOM 全部重建，input 还会丢焦点
{items.map((item, i) => <Row key={i} data={item} />)}   // 事故写法
{items.map((item) => <Row key={item.id} data={item} />)} // 正确：业务 id
// index 作 key 仅在"列表纯静态、无增删排序"时可接受
```

- 受控 vs 非受控：

```jsx
// 受控：值是 state 的投影，改值必经 onChange（单一数据源，便于校验/联动/回显）
<input value={text} onChange={(e) => setText(e.target.value)} />
// 非受控：DOM 自己存值，要时再取（少一层渲染，适合巨型表单/不关心中间态）
<input defaultValue={initial} ref={inputRef} />
const value = inputRef.current.value; // 提交时一次性读取
// 给受控组件写了 value 但没 onChange → React 警告并只读，必须二选一
```

- 三种逻辑复用方案对比（以"复用鼠标位置"为例）：

```jsx
// HOC：包装组件，注入 props —— 隐式、多 HOC 嵌套 + 同名 props 覆盖
const withMouse = (Comp) => (props) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => { /* 监听 mousemove */ return () => {}; }, []);
  return <Comp {...props} pos={pos} />;
};

// render props：把渲染交给外部函数 —— 显式但回调嵌套深
<Mouse>{(pos) => <Cat pos={pos} />}</Mouse>

// 自定义 hooks（标准答案）：无组件层级、可组合、可测试
function useMouse() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const fn = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);
  return pos;
}
```

- HOC 的三个历史坑：refs 不会自动穿透（React.forwardRef 前）、静态属性需手动 hoist（hoist-non-react-statics）、包一层 Wrapper 导致 DevTools 里组件树变深 + 全量重新挂载风险。

**加分项（P7 视角）**：

- 源码层：diff 产出不是补丁集而是"新 Fiber + flags 标记"，commit 阶段按 flags 执行 DOM 增删改；React 的"两轮遍历 + Map"是 O(n) 工程解，Vue 3 的同层 diff 用"首尾双向指针 + 最长递增子序列"求最小移动次数，思想更接近传统树 diff——两家的算法取舍（简单可预测 vs 移动最优化）值得对比讲。
- 受控的进阶取舍：react-hook-form 走非受控 + 原生校验，几万字段也不重渲染，正是用"放弃受控"换性能的工程证明；Formik 受控全量 rerender 在大表单会明显劣化——能举例"同一问题的性能代差"很加分。
- key 的隐藏能力：key 不只是列表优化，还是"强制重置组件"的官方手段（换 key 即卸载重建，state 归零），等价于 v-if 之外的另一种"实例控制"——把 key 讲成"身份系统"而不是"性能参数"，是答这道题的最高视角。

## Q：React 19 新特性：Actions/useOptimistic/use、React Compiler？

**核心答案**：React 19 的主线是"把异步突变（mutation）变成一等公民"。Actions 泛化了 transition：async 函数里调用 setState 会自动被当作 transition 处理，配 useActionState 管理"提交中/错误/返回值"，表单可直接 `action={fn}` 提交（自动携带 FormData，无 JS 时也能工作）。useOptimistic 在 transition 进行期间渲染"乐观值"，请求失败或新值到达时自动回滚——乐观更新从手写 try/catch 变成声明式 API。use() 是新的"读取器"：解包 Promise 或 Context，且允许在条件/循环里调用（唯一不遵守"顶层调用"规则的 API），是 Suspense 数据流的一部分。React Compiler（编译器，原 React Forget）在构建期自动插入 memoization，目标是不再手写 useMemo/useCallback/React.memo。其他实用升级：ref 可直接作为 props（forwardRef 废弃）、ref cleanup 函数、context 直接用 `<Context>`、原生支持文档元数据（title/meta）与 preloading API。

**知识点解析**：

- Actions + useActionState + useOptimistic 组合：

```jsx
import { useActionState, useOptimistic } from 'react';

function CommentForm({ addComment }) {
  // useActionState(pending 时渲染...)
  const [error, submitAction, isPending] = useActionState(
    async (prevState, formData) => {
      try {
        await addComment(formData.get('text')); // 异步 mutation
        return null;
      } catch (e) { return '提交失败'; }
    },
    null
  );

  // 乐观 UI：transition 期间显示"假定成功"的值
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (old, newText) => [...old, { text: newText, pending: true }]
  );

  return (
    <form action={submitAction} onSubmit={(e) => {
      const fd = new FormData(e.currentTarget);
      addOptimistic(fd.get('text')); // 先上屏，失败自动回滚
    }}>
      <input name="text" required />
      <button disabled={isPending}>发送</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

- use() 的语义与边界：

```jsx
import { use } from 'react';

function Message({ messagePromise }) {
  // 解包 Promise：未 resolve 时最近 Suspense 边界接管显示 fallback
  const message = use(messagePromise);
  // 也可以条件调用：use 是唯一允许写在 if 里的"类 hook"
  // 也可以 use(ContextValue) 替代 useContext
  return <p>{message}</p>;
}
// 使用方：<Suspense fallback={<Loading />}><Message messagePromise={p} /></Suspense>
// RSC 页面里把 promise 作为 props 从服务端传下来，客户端 use() 读取
```

- React Compiler：Babel 插件在构建期做数据流分析，自动为组件/元素/hook 产物插入缓存，等价于把全量手写 memo 化；对不符合 Rules of React（渲染不纯、条件调用 hooks）的代码自动跳过该组件（可配 eslint-plugin-react-compiler 提前暴露）。落地方式：next.config 或 Vite babel 插件渐进启用。
- ref 即 props：

```jsx
// React 19：函数组件直接收 ref，不再需要 forwardRef
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
// React 19：ref cleanup
<input
  ref={(node) => {
    node.focus();
    return () => node.blur(); // 卸载时执行清理，替代旧"返回清理函数不可用"的限制
  }}
/>;
```

- 文档元数据：组件里直接写 `<title>`、`<meta>`、`<link>`，React 自动 hoist 到 head——Next.js 的 SEO 能力下沉到了核心。

**加分项（P7 视角）**：

- Compiler 的技术定位：它不是"响应式化"而是"自动记忆化"——仍然基于"React 负责重渲染、编译器负责让重渲染便宜"的假设，与 Vue/Solid 的编译期响应式（编译产物直接按依赖更新，无 VDOM diff）路线不同；2025 年已进入稳定版（React 19.x 配套），Instagram 等大规模落地报告交互延迟显著下降，能引用这些生产数据是亮点。
- useOptimistic 的实现本质：内部是 transition + 一个"当前 transition 期间的覆盖层 state"，transition 结束（含失败）后覆盖层失效即回滚——乐观 UI 的正确性依赖"回滚边界 = transition 边界"，嵌套 transition 的回滚顺序是深水区。
- use() 与 hook 的本质区别：hooks 是"渲染期间到 fiber 状态的注册"，use() 是"读取一个可能未就绪的值并抛给 Suspense"——把 Suspense 从"代码分割"工具真正扩展成"统一异步模型"（数据、动态模块、context 全走同一条未就绪语义），这是 React 异步故事收口的一步。
- 迁移视角：React 19 移除了 propTypes/字符串 refs/test-utils 等历史 API，16.8 以下老项目需多级跳板；给团队出"19 落地清单"（codemod 跑 forwardRef 删除、错误根 onCaughtError 接监控、SSR API 全量换 renderToReadableStream）是真实架构输出。

## Q：Next.js：App Router/RSC/Server Actions、缓存分层？

**核心答案**：App Router 是 Next.js 13 引入、基于 RSC 的新路由体系：目录即路由（page.tsx / layout.tsx / loading.tsx / error.tsx），组件默认服务端渲染、零客户端 JS；'use client' 声明客户端边界，交互逻辑从边界文件开始进 bundle。Server Actions（'use server'）把服务端函数变成可从表单/事件直接调用的 RPC 端点，天然支持渐进增强（form action 无 JS 也能提交），并自带请求级去重与 revalidate 钩子。缓存分四层：请求记忆化（fetch 按请求去重）、数据缓存（fetch 结果跨请求缓存，Next 15 起默认 no-store）、全路由缓存（静态路由的 HTML+RSC payload）、路由器缓存（浏览器端的预取与页面栈缓存）——四层位置、失效手段、默认值各不相同，是 App Router 工程化里最容易出事故的地方。

**知识点解析**：

- App Router 基本形态：

```text
app/
├── layout.tsx        # 根布局（持久化，导航不重挂载）
├── page.tsx          # 路由页面（Server Component 默认）
├── loading.tsx       # Suspense fallback（流式 SSR 边界）
├── error.tsx         # 错误边界（client component）
├── globals.css
└── dashboard/
    ├── page.tsx
    └── settings/
        └── page.tsx  # /dashboard/settings，嵌套 layout.tsx 共享
```

- RSC 数据获取：页面组件直接 async，fetch 标注缓存策略：

```jsx
// app/posts/page.tsx（Server Component）
export default async function Posts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }, // ISR：60s 内读缓存，之后 SWR
    // next: { revalidate: false, cache: 'force-cache' } // 永久缓存
    // cache: 'no-store' (Next 15 默认) // 不缓存
  });
  const posts = await res.json();
  return <PostList posts={posts} />;
}
```

- Server Actions 与失效：

```jsx
// app/actions.ts
'use server';
import { revalidateTag } from 'next/cache';

export async function createPost(formData: FormData) {
  await db.insert({ title: formData.get('title') });
  revalidateTag('posts'); // 按标签失效：数据缓存 + 路由缓存一起失效
  // revalidatePath('/posts')：按路径失效
}

// 表单里直接用，无 JS 也能提交（渐进增强）
<form action={createPost}><input name="title" /><button>发布</button></form>
```

- 四层缓存对照（Next 14 语义，15 的变更见加分项）：

```text
1 请求记忆化   React Request Memoization  单次请求内 fetch 去重        自动
2 数据缓存     Data Cache                  fetch 结果跨请求/跨用户       revalidate / tag
3 全路由缓存   Full Route Cache           静态路由的 HTML + RSC payload  跟随数据缓存失效
4 路由器缓存   Router Cache（客户端）      预取的 RSC payload 按路由缓存 router.refresh / 时间过期
```

- 客户端边界的三个工程规则：'use client' 文件里 import 的所有模块都进 bundle，边界要放在叶子节点尽量下移；客户端组件不能 import 服务端组件，但可以接收服务端渲染的 children；全局 Context Provider 必须包在 'use client' 组件里再嵌回 layout。

**加分项（P7 视角）**：

- Next 15 的语义修正（面试常考时效性）：GET fetch 与客户端路由缓存默认不再缓存（`cache: 'force-cache'` 与 `staleTimes` 需显式开启），官方承认 14 的"默认全缓存"心智成本太高、事故太多（改库忘失效、CMS 内容不更新）；Next 16 进一步推出 `use cache` 指令 + dynamicIO 把"缓存"从路由层语义改造成组件级显式声明——能讲出"默认值演进史"说明真踩过坑。
- Server Actions 安全模型：它本质是暴露 POST 端点的 RPC，必须自己校验输入（zod）与鉴权（cookie/session），且 action 无幂等约束——重复提交需用 useFormState 的 pending 或 crypto token 防重；"RPC 化降低门槛的同时放大攻击面"是安全审计必谈点。
- 数据瀑布优化：await 串行 fetch 会把 TTFB 变成 f1 + f2 + ...，解法是服务端 Promise 并行预取（Promise.all / preload）+ Suspense 边界切开流式输出；RSC payload 双流（HTML 流内嵌 payload）导致回包变大是隐性成本，需配 preloading 与 selective hydration 观测。
- 与 Nuxt 对照：Nuxt 3 用 payload extraction + routeRules（isr/swr/prerender）解决同两件事（数据序列化 + 分层缓存），Vue 侧是 Nitro 服务器 + 无 RSC 运行时；给团队做技术选型报告时，"团队 React/Vue 基因 + RSC 生态成熟度（Next 一家独大）"通常比纯性能指标权重更高。

## Q：React 性能：Profiler 使用、重渲染归因、虚拟列表接入？

**核心答案**：方法论是"先测量、后归因、再优化"：用 React DevTools Profiler 的火焰图按 commit 看每次渲染耗时与渲染原因（state 变化 / props 变化 / context 变化 / 父组件重渲染，React 18+ 会标注"为什么渲染"），或在代码里用 Profiler 组件的 onRender 回调埋点。归因三类：自身 state 变了（正常）、父组件重渲染把我带上（用 memo/组合/状态下放切断）、订阅的 context 或 store 切片变了（拆 context/收紧选择器）。虚拟列表是大数据量渲染的终极手段：只渲染视口内可见行 + 上下 overscan，用绝对定位或 transform 平移行，配合行高估算与动态测量，把 O(n) DOM 降到 O(可见行数)。

**知识点解析**：

- Profiler 两种用法：

```jsx
// 1) DevTools 面板：录制 → 操作 → 火焰图看每个 commit
//    点击组件可见"渲染原因"：props changed / state changed / context changed
//    长条 = 该组件 render + 子树 render 的耗时，叶子 = 自身耗时
// 2) 代码埋点（可上报生产，React 会给阶段标记）：
<Profiler id="SearchPanel" onRender={(id, phase, duration) => {
  if (duration > 16) perf.mark('slow-render', { id, phase, duration });
}}>
  <SearchPanel />
</Profiler>
```

- 重渲染归因清单（排查顺序）：

```text
1 自身 useState/useReducer 变化 → 正常，检查是否"state 放太高"（状态下放）
2 父组件重渲染 → 默认全子树跟着跑：
   a 父 state 与我无关 → React.memo + 稳定 props，或 children 组合
   b 中间组件被迫重渲染 → 把状态移到最小公共分支（state colocation）
3 context 变化 → 所有 consumer 重渲染 → 拆 context / use() 精确消费
4 外部 store（zustand 等）→ 选择器太粗（返回新对象）→ 收窄选择器
5 Suspense/lazy 等"结构性"重挂载 → 检查组件位置是否在条件分支里
```

- 组合模式切断"传染性渲染"（比 memo 更优先的手段）：

```jsx
// 反例：<SlowPage><ExpensiveTree /></SlowPage>
// SlowPage 的 state 一变，ExpensiveTree 作为 children 虽是"props"，但
// children 是父组件渲染时创建的元素 —— 依然新引用，照样重渲染

// 正解：状态下放 —— 让持有 state 的小组件自己动，ExpensiveTree 不在其子树
function SlowPage() {
  return (<>
    <Tabs />          {/* state 在 Tabs 内部，变化不影响下方 */}
    <ExpensiveTree />  {/* 稳定，不重渲染 */}
  </>);
}
```

- 虚拟列表接入（以 TanStack Virtual 为例，react-window 同理）：

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function BigList({ rows }) { // 10 万行
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,      // 行高估算，动态测量后自动校正
    overscan: 8,                  // 视口外多渲染 8 行，滚动不白屏
  });
  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      {/* 总高撑出滚动条 */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={rows[vi.index].id}
            style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%',
              transform: `translateY(${vi.start}px)`, // 用 transform，避免重排
            }}
          >
            <Row data={rows[vi.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- 虚拟化代价清单：搜索/全选等"跨行操作"要自己处理索引映射；行高动态要测量缓存并校正滚动位置；键盘导航、无障碍、打印、SEO 都受影响——接入前先问"是否真的到了量级"（经验阈值：千行以下用 memo 通常够，万行起再虚拟化）。

**加分项（P7 视角）**：

- 虚拟列表的深水细节：动态行高用 ResizeObserver 测量 + 累计偏移数组（二分查找定位），避免全量重排；快速滚动白屏用 overscan + `contain: strict` 限制重绘范围；表格场景要做"行 + 列"双向虚拟化并处理行列交叉单元格复用（antd Table 配 vxe-table 的经验可以直接对标）。
- 生产可观测：DevTools Profiler 仅 dev 可用，线上用 Profiler API 抽样上报 + performance.mark 串联自定义指标；配合 React 19 的 `performance.mark`（`render-(...)` 自动标记）定位到"哪次交互触发哪次慢渲染"，比肉眼猜高一个量级。
- 与 Vue 对照：Vue 侧同样的手段是 v-memo 行级缓存、shallowRef 大数组（跳过深层代理）、触发式更新 triggerRef；BI 大屏项目里"10 万行表格"的真实方案通常是"虚拟滚动 + Web Worker 过滤 + 分页取数"组合拳，框架差异反而是次要变量——能讲到这一层说明性能优化是体系能力而非 API 记忆。

## Q：Vue 与 React 架构对比（P7 高频）：响应式 vs 不可变、模板 vs JSX、心智模型差异？

**核心答案**：一句话定位：React 是"库 + 不可变数据 + 推倒重跑 + 调度器"，核心抽象是 UI = f(state)——数据不可变，变了就整组件重新执行函数，靠 Fiber 调度把这份昂贵的"重跑"切散、靠 memo/Compiler 把它变便宜；Vue 是"框架 + 可变响应式 + 依赖追踪 + 编译优化"，核心抽象是"状态与副作用的自动连接"——数据可变，Proxy 在被读取时收集依赖、被写入时精确通知，只重算真正依赖它的部分，靠编译器（PatchFlag、静态提升）把 diff 本身变便宜。所以 React 把复杂度放在"运行时调度与使用者的 memo 纪律"上，Vue 把复杂度放在"编译器理解模板 + 响应式边界"上。模板 vs JSX 是同一分叉的表现：JSX 是全表达力的 JS，优化只能在运行时（或后来的 React Compiler），模板是受限 DSL，受限换来静态可分析，编译期就知道"哪棵子树永远不变、哪个绑定是动态的"。没有绝对优劣，选型看团队心智、生态与场景。

**知识点解析**：

- 数据模型：不可变 vs 可变响应式，各自付的"税"。

```jsx
// React：不可变。改数据 = 生成新引用，"引用变了"就是更新信号
setTodos([...todos, newTodo]);        // 新数组
setUser({ ...user, name: 'ct' });     // 新对象
// 代价 1：stale closure（读到旧快照）是常态问题
// 代价 2：大对象深拷贝/结构共享的样板代码
// 收益 1：渲染是纯函数、可重放可中断，Concurrent 的地基
// 收益 2：时间旅行/undo 只存引用，对象比较便宜
```

```js
// Vue：可变 + Proxy。改数据 = 原地写，代理负责"谁在依赖我"
todos.value.push(newTodo);            // 原地变更，依赖 todos 的副作用自动更新
user.value.name = 'ct';               // 深层写入也精确通知
// 收益 1：没有 stale closure，任何时刻读 state 都是最新值
// 收益 2：不需要 memo/依赖数组文化的"手艺税"
// 代价 1：解构会丢响应式（toRefs/ref 解构），心智转移为"什么会被追踪"
// 代价 2：Concurrent 语义更难做（细粒度更新天然没有"整树快照"可回放）
```

- 更新机制：组件级"推倒重跑" vs 细粒度"拉取重算"。

```text
React 更新链路（推 push）：
  setState → lane 调度 → 从触发组件开始整棵子树重新执行函数 →
  Fiber diff（双树对比、flags） → commit
  优化手段全部是"截断重跑范围"：memo、bailout、Compiler 自动 memo

Vue 更新链路（拉 pull）：
  赋值 → proxy set 触发 targetMap 里的 effect →
  组件 render effect 重新执行 → 编译产物带 PatchFlag 的 diff（跳过静态/未变节点）
  优化是"编译期预先知道哪里可能变"：静态提升、PatchFlag、Block Tree 收集动态节点
```

- 调度器的存在性差异：React 必须有时间切片（Fiber/lanes/中断重放），因为单次"推倒重跑"可能很贵；Vue 官方明确不做时间切片，因为依赖收集让单次更新天然与"模板里实际依赖"成正比，通常足够小。一个把问题"拆散了做"，一个把问题"提前删掉了"。
- 模板 vs JSX 的本质：表达力与可分析性的交换。

```jsx
// JSX：任意 JS。表达式、三目、map、IIFE、条件 hook 外的逻辑……编译后就是函数调用
<div className={cls(isActive && 'active', rest)}>
  {items.map((it) => (it.show ? <Row key={it.id} it={it} /> : null))}
</div>
// 运行时才知道结构 → 只能运行时 diff（React Compiler 在编译期补 memo，但不消除 diff）
```

```html
<!-- Vue 模板：受限 DSL。编译器能证明的都提前做完 -->
<div :class="{ active: isActive }">
  <span>静态文本</span>            <!-- 静态提升：hoist 到 render 外，永不重渲染 -->
  <Row v-for="it in items" v-if="it.show" :key="it.id" :it="it" />
</div>
<!-- 编译产物带 PatchFlag：class 是动态的（位标记）、span 是静态的
     Block Tree 只收集动态节点，diff 时静态部分直接跳过 -->
```

- 心智模型差异清单（面试可逐条口述）：

```text
1 更新语义：React"数据一变、整个函数重跑"（快照语义，每次渲染一套闭包）
           Vue"数据一变、依赖它的地方重算"（始终最新值语义）
2 依赖声明：React 手写依赖数组（useMemo/useEffect deps），漏写即 stale bug
           Vue 自动追踪，心智转移为"别弄丢响应式连接"（解构/解包）
3 性能纪律：React 性能是开发者责任（memo/useCallback/状态设计）
           Vue 性能是框架责任（优化主要发生在编译期），例外场景才用 v-memo/shallowRef
4 组件通信：React 单向 props + 回调，跨层用 Context，重渲染靠 memo 控制
           Vue props/emit + v-model 双向语法糖 + provide/inject 细粒度注入
5 逻辑复用：React 自定义 hooks（约束：顶层调用、依赖数组）
           Vue 组合式函数（无调用位置约束、自动依赖追踪）
6 转义逃生舱：React 只有"全量重跑"，逃生靠 useRef 拿稳定引用
           Vue 有 shallowRef/triggerRef/markRaw 分级"退出响应式"
```

- SSR 与新架构：React 走 RSC（服务端组件化 + Flight 流式 UI 树 + Next.js 全栈一体化），把"少发货端 JS"做成了运行时协议；Vue 走 Nuxt（Nitro + payload 精简水合 + islands），RSC 等价物长期缺位，Vue 3.5+ 靠响应式 props 解构与 SSR 流式缓冲追体验。生态权力结构也不同：React 是 Meta 出内核、社区出一切（router/state/Next 全非官方），Vue 是官方全家桶（router/pinia/nuxt 半官方）——前者创新快碎片化，后者一致性强节奏慢。

**加分项（P7 视角）**：

- 趋势收敛（最能体现持续关注）：两边在互相学习对方的强项——React Compiler 用编译期分析自动 memo（把"Vue 式的性能是框架责任"引入 React，但仍是 VDOM 路线内的优化，非响应式）；Vue 的 Vapor Mode（无 VDOM、编译产物直接按动态点生成更新指令）与 Solid 的 Signals 路线合流（把"React 式的细粒度可组合"用编译实现）。终局判断：模板约束 + 编译优化 + 细粒度信号是行业共识方向，JSX 阵营靠 Compiler 逼近，差异在"运行时协议保留多少"。
- 场景化性能结论（避免"谁更快"的弱答案）：高频小更新（拖拽、动画联动、实时图表）Vue/Solid 类细粒度模型有结构性优势（无 diff、无调度开销）；大规模同构列表、复杂可中断交互、需要 Suspense 级别流式协议的 SSR，React 的调度与 RSC 生态有结构性优势；普通 CRUD 中后台两者差距小于工程化水平差距——把对比落到"机制 → 场景 → 结论"三段式，才是架构师答案。
- 团队与组织维度（P7 真正被考的）：技术选型报告应包含——人才市场供给（React 岗位与候选人池显著更大）、现有代码资产与迁移成本（微前端 wujie/qiankun 可以让两栈共存过渡）、全栈一体化诉求（RSC/Next 对 SEO 与首屏的硬指标）、长期维护（官方全家桶降低决策成本 vs 社区生态的灵活性）。能说出"我们 90% 前端资产是 Vue，只在营销官网（SEO + 内容驱动）引入 Next.js SSR"这类带边界条件的混合架构决策，比背对比表高一个层级。
- 收尾定式：Vue 和 React 的竞争本质是两条降低前端复杂度的路线——Vue 说"框架足够聪明，开发者写直觉代码"；React 说"模型足够简单（纯函数重跑），复杂度交给调度器和编译器"。作为架构师的工作不是站队，而是清楚每种复杂度被转移到了哪里：转移给框架（Vue）、转移给运行时（React 调度）、转移给编译器（Compiler/Vapor）、还是转移给开发者（memo 纪律/响应式陷阱）——这个"复杂度守恒"视角是这道题的满分收束。
