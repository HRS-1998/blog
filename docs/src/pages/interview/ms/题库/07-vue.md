# 7 Vue

对标 P6/P7 的 Vue3 面试考察：响应式系统与依赖收集、编译优化与 diff 算法、调度器与批量更新、组件模型与通信、状态管理与路由、SSR 与微前端集成、自定义渲染器与 mini-vue 手写。每题给出核心答案、知识点拆解与 P7 视角的加分项。

## Q：Vue 响应式原理：Vue2 defineProperty vs Vue3 Proxy？依赖收集与触发更新的链路？

**核心答案**：Vue2 在初始化时递归遍历 data，用 `Object.defineProperty` 把每个属性改写成 getter/setter，读取时收集 Dep（依赖）、赋值时触发通知；它监听不到属性的新增/删除和数组下标/length 变更，所以需要 `$set`/`$delete` 和重写七个数组变异方法来打补丁，且初始化时必须全量递归，大对象初始化开销大。Vue3 改用 `Proxy` 代理整个对象，13 种 trap 全覆盖（含 has/deleteProperty/ownKeys），新增删除、数组索引、length、Map/Set 全部天然劫持，并且是惰性深层代理——嵌套对象只有在被访问时才被 `reactive()` 包装。依赖收集链路：组件渲染函数是一个 `ReactiveEffect`，render 期间读数据触发 get trap → `track(target, key)`，把 activeEffect 存入 `targetMap: WeakMap<target, Map<key, Dep>>`；赋值触发 set trap → `hasChanged` 判断 → `trigger(target, key, type)` → 找到 dep 里的 effect → 调用 `effect.scheduler` 把更新任务推入队列批量执行，而不是同步重跑。

**知识点解析**：

- Vue2 的改造与补丁：defineProperty 只能劫持"已知属性"，`$set` 本质是对数组走 splice、对对象走 defineReactive 后手动 `dep.notify()`；数组不逐项劫持是性能权衡（下拉 10 万项不能全部 defineProperty），代价是 `arr[0] = x` 与 `arr.length = 0` 失效。

```js
// Vue2 defineReactive 简化版
function defineReactive(obj, key, val) {
  const dep = new Dep()               // 每个属性一个 Dep（依赖集合）
  observe(val)                          // 递归：初始化时全量深层劫持
  Object.defineProperty(obj, key, {
    get() {
      if (Dep.target) dep.depend()   // 正在求值的 watcher 订阅该属性
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      observe(newVal)                 // 新值也要递归劫持
      dep.notify()                    // 通知所有 watcher 重新执行
    },
  })
}
```

- Vue3 track 源码（简化自 reactivity 包，逐行解释）：

```ts
let activeEffect: ReactiveEffect | undefined
export const targetMap = new WeakMap<object, Map<string | symbol, Dep>>()

export function track(target: object, key: string | symbol) {
  if (!shouldTrack || !activeEffect) return     // 1. 没有正在运行的 effect 或被暂停（pauseTracking），不收集
  let depsMap = targetMap.get(target)           // 2. WeakMap 按 target（原始对象）隔离，利于 GC
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)                   // 3. 第二层 Map：属性 key -> Dep
  if (!dep) depsMap.set(key, (dep = createDep()))
  trackEffect(activeEffect, dep)               // 4. dep 记录 effect，effect.deps 也反向记录 dep，
}                                              //    双向记录是为了 effect 重跑前能做依赖清理（cleanup）
```

- Vue3 trigger 源码（简化版，逐行解释）：

```ts
export function trigger(target: object, type: TriggerOpTypes, key?: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return                          // 1. 从未被追踪的对象直接返回
  let deps: Dep[] = []
  if (key !== void 0) deps.push(depsMap.get(key))            // 2. 收集该 key 的依赖
  if (type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE) {
    deps.push(depsMap.get(isArray(target) ? 'length' : ITERATE_KEY))  // 3. 新增/删除属性会影响
  }                                                          //    v-for 迭代（ITERATE_KEY）或数组 length
  for (const dep of deps) {
    if (dep) {
      for (const effect of dep) {
        if (effect !== activeEffect || effect.allowRecurse) { // 4. 防止 effect 内部改自己依赖的值造成死循环
          if (effect.scheduler) effect.scheduler()            // 5. 有调度器则入队批量执行（渲染 effect 走这条）
          else effect.run()                                   // 6. 否则同步重跑（纯 computed 依赖等）
        }
      }
    }
  }
}
```

- trigger 里 `ITERATE_KEY` 是个隐蔽点：`v-for` 遍历对象时收集的不是具体 key，而是一个特殊 symbol `ITERATE_KEY`，所以新增/删除属性必须额外触发它，否则列表不更新——这是 Vue2 `$set` 在 Vue3 里被消灭的底层原因。
- Vue3.4 的 Dep 结构升级：3.4 之前 Dep 是 `Set<ReactiveEffect>`，3.4 改为链表 + 版本计数（link/unlink 双向链表），解决了 3.0-3.3 中"分支切换需要全量删除再重收集依赖"的清理开销，computed 判断是否需要重算也从"值变了才通知"升级为"dirty 标记 + 值比较"双层机制。
- 完整链路串起来：`state.count++` → set trap → `hasChanged` 为 true → trigger → 组件 render effect 的 scheduler → `queueJob(update)` → 微任务 `flushJobs` → `componentUpdateFn` 重跑 render 生成新 vnode → patch 更新 DOM。

**加分项（P7 视角）**：

- Reflect 与 Proxy 的配合不是"顺手"，而是为了 receiver：`Reflect.get(target, key, receiver)` 保证当子对象也是 Proxy 时，get trap 里 `this` 指向的是代理而非原对象，否则深层惰性代理会失效（面试常见追问"为什么必须用 Reflect"）。
- Vue2 递归劫持有真实性能事故：超大表单/图表数据初始化会卡主线程，业界常用 `Object.freeze` 跳过劫持（Vue2 里 frozen 对象直接不 observe）；Vue3 的惰性代理 + `markRaw`/`shallowReactive` 把这个优化做成了官方 API。
- 生产案例：把三万行表格数据从 `reactive` 换成 `shallowReactive` + 手动 `triggerRef`，首屏渲染从 2.4s 降到 800ms——响应式不是免费的，Proxy 的 get trap 在高频读路径上依然有开销，超大只读数据应该用 `markRaw` 彻底跳出响应式。
- 延伸问题：为什么 targetMap 的 key 是原始对象而不是 Proxy？因为嵌套属性每次取值会生成新的代理（`toRaw(reactive(o)) === o`），用原始对象做 key 才能保证同一份数据的依赖始终落在同一个 Map 节点上。

## Q：Vue3 编译优化：静态提升、patchFlag、block tree？Vue3 快在哪里？

**核心答案**：Vue3 的性能优势来自"编译时尽可能提取信息、运行时尽可能少做比较"三条主线。静态提升（hoistStatic）把纯静态 vnode 提到 render 函数外只创建一次，后续渲染直接复用引用，diff 阶段看到同一引用直接跳过；patchFlag 给动态节点打上位标记，让 patch 只比较"会变的部分"（文本/类名/样式/props），把全量 props 对比降级成点对点更新；block tree 把模板中所有动态节点拍平收集到 block 的 `dynamicChildren` 数组，更新时不再递归整棵 vnode 树，而是只遍历这个动态节点列表，静态子树整个被跳过。另外事件处理函数默认开启 cacheHandlers 缓存内联函数避免子组件无谓更新。所以 Vue3 的更新速度与模板总体积解耦，只和动态内容数量成正比，而 Vue2 的更新要从根组件开始全量 new Vnode + 全树 diff。

**知识点解析**：

- 静态提升示例，输入模板（必须放围栏内）：

```html
<template>
  <div class="box">
    <h1>静态标题</h1>
    <p>{{ msg }}</p>
  </div>
</template>
```

编译产物（SFC playground 可验证）：

```js
const _hoisted_1 = { class: "box" }
// hoistStatic：静态节点提到 render 外，只创建一次；HOISTED 标记让它 diff 时直接跳过
const _hoisted_2 = /*#__PURE__*/_createVNode("h1", null, "静态标题", -1 /* HOISTED */)

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _hoisted_2,
    _createVNode("p", null, _toDisplayString(_ctx.msg), 1 /* TEXT */)
  ]))
}
```

- patchFlag 位标记（compiler-core 里的 PatchFlags）：

```ts
export const enum PatchFlags {
  TEXT = 1,          // 动态文本节点：只 patch 文本内容
  CLASS = 2,         // 动态 class：只比 class
  STYLE = 4,         // 动态 style：只比 style
  PROPS = 8,         // 动态非 class/style 的 props：配合 dynamicProps 白名单比
  FULL_PROPS = 16,   // 带 key 的动态 props / 需要全量比 props
  NEED_HYDRATION = 32,   // SSR hydration 事件需要特殊处理
  STABLE_FRAGMENT = 64, // 子节点顺序不变的 fragment：只比内容不比顺序
  KEYED_FRAGMENT = 128, // 带 key 的 fragment：走完整 keyed diff
  UNKEYED_FRAGMENT = 256,
  NEED_PATCH = 512, // 只需要非 props 的 patch（如 ref、指令）
  DYNAMIC_SLOTS = 1024, // 动态插槽：槽可能变，需要强制更新子组件
  HOISTED = -1,     // 静态提升节点：patch 时直接 return，核心跳过逻辑
  BAIL = -2,        // 手写 render 函数 / 无法优化：退化为 Vue2 式全量 diff
}
```

- block tree 原理：`_openBlock()` 开启一个收集上下文，随后 `createElementBlock` 创建的 block 节点会把当前层及子层级所有"非稳定结构包裹"的动态 vnode（带 patchFlag 的）收进 `dynamicChildren`；patch 时 `patchBlockChildren` 只遍历该数组，children 里成百上千的静态节点完全不参与递归。遇到 v-if/v-for 这类"不稳定结构"会降级为单独的 Fragment block，保证索引不错位。
- 为什么 Vue2 慢：Vue2 的 render 是全量执行（哪怕静态内容每次也 new Vnode），patch 是同层递归全比较，唯一跳过手段是"sameVnode 则复用"；数据量一大，开销 O(模板总节点数) 而非 O(动态节点数)。
- cacheHandlers：`@click="onClick"` 内联箭头函数每次 render 都新建，若子组件用 props 比较会触发无谓更新；编译器把它缓存到 `_cache`，配合 patchFlag 让带事件的节点也不需要全量 props 比对。

```js
// 开启 cacheHandlers 后
onClick: _cache[0] || (_cache[0] = (...args) => _ctx.onClick(...args))
```

**加分项（P7 视角）**：

- 优化是有条件的：`BAIL` 说明了边界——手写 h()/JSX 渲染函数没有编译期信息，patchFlag 是 -2，全部退回全量 diff；所以"模板优先于 JSX"不只是风格问题，是性能问题（可量化的架构决策依据）。
- 大型列表是 block tree 的反模式场景：v-for 里几千个节点都是动态的，dynamicChildren 和普通 children 一样大，收益归零；此时真正有效的是 v-memo（Q12 展开）或虚拟滚动，说明"编译优化解决的是结构性开销，数据量开销要靠运行时策略"。
- 源码级细节：`hoistStatic` 会做缓存字符串去重（createStaticVNode + `cachedIndex`），以及超过一定数量（默认 20 个常量）会把静态节点转成 `innerHTML` 一次性插入的 StaticVNode；patchFlag 与 `dynamicChildren` 的配合实现在 `patchElement` 里，先走 `n1 === n2` 引用相等快速路径，再走 `patchBlockChildren`。
- 与 React fiber 的对比话术：Vue 用编译期信息换运行时轻量更新（无需 fiber 中断调度也能保持响应），React 选择运行时通用（JSX 无约束）代价是 reconciler 需要可中断调度兜底——两种架构取舍，P7 层面要能对照讲清。

## Q：diff 算法：双端 diff 与最长递增子序列？key 的作用与常见误区？

**核心答案**：Vue2 用双端 diff：新旧两组 vnode 的头尾各一个指针共四个索引，每轮依次做"新头旧头、新尾旧尾、旧头新尾、旧尾新头"四次比较，命中就复用移动，都不命中再把旧节点做成 key→index 哈希表用新头去查，O(n) 完成但每轮最多四次比较加哈希兜底。Vue3 改成"快速 diff + 最长递增子序列（LIS）"：先做头尾预处理（同步头部与同步尾部，这是它比双端快的主要原因，前端常见的纯追加/纯删除场景直接被预处理消化掉），然后对剩余中间乱序段，构建"新子节点 key→新下标"哈希表，遍历旧子节点求出每个可复用节点在新序列中的位置数组，对这个位置数组求 LIS——在最长递增子序列里的节点不用动，其余节点用 patchMove 移动即可，把 DOM 移动次数压到理论最小。key 的作用是在 diff 中标识节点身份：sameVnode 判断（key 与 type 相等）决定是否复用。常见误区是用 index 当 key：头部插入/删除时 index 与节点错位，导致原地 patch 更新错误数据、复用错误状态（输入框、复选框、动画），以及引用类型 props 全不等引发全量更新；另一个误区是随机数当 key——每次都不相等，等于每次都销毁重建。

**知识点解析**：

- Vue2 双端 diff 四次比较示意：

```js
// Vue2 patchVnode -> updateChildren 核心（简化）
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  if (isSameVNode(oldStartVnode, newStartVnode)) {        // 情形1：头头相同
    patchVnode(oldStartVnode, newStartVnode); oldStartV++; newStartV++
  } else if (isSameVNode(oldEndVnode, newEndVnode)) {     // 情形2：尾尾相同
    patchVnode(oldEndVnode, newEndVnode); oldEndV--; newEndV--
  } else if (isSameVNode(oldStartVnode, newEndVnode)) {   // 情形3：旧头==新尾，移动到尾部
    patchVnode(oldStartVnode, newEndVnode)
    nodeOps.insertBefore(parent, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
    oldStartV++; newEndV--
  } else if (isSameVNode(oldEndVnode, newStartVnode)) {   // 情形4：旧尾==新头，移动到头部
    patchVnode(oldEndVnode, newStartVnode)
    nodeOps.insertBefore(parent, oldEndVnode.elm, oldStartVnode.elm)
    oldEndV--; newStartV++
  } else {                                                // 兜底：key 哈希表查找
    idxInOld = oldKeyToIdx[newStartVnode.key]             // 旧头哈希表：key -> 旧下标
    if (isUndef(idxInOld)) createElm(newStartVnode)       // 新节点：真实创建
    else { patchVnode(oldCh[idxInOld], newStartVnode); oldCh[idxInOld] = undefined; move }
    newStartV++
  }
}
```

- Vue3 patchKeyedChildren 流程五步：1）同步头部 while 头部 sameVnode 就 patch 前进；2）同步尾部，同上；3）旧的先遍历完 → 批量 mount 新的剩余节点；4）新的先遍历完 → 批量 unmount 旧的剩余节点；5）处理中间乱序段。

- 第 5 步源码级实现（简化自 runtime-core/src/renderer.ts）：

```ts
// 5.1 构建 key -> newIndex 映射
const keyToNewIndexMap = new Map()
for (i = s2; i <= e2; i++) keyToNewIndexMap.set(newChildren[i].key, i)

// 5.2 遍历旧中间节点，能复用的记录"新下标"，不能复用的直接卸载
let patched = 0, moved = false
let lastIndex = 0                              // 目前"已复用节点中最大的新下标"，用于 O(n) 探测逆序
const toBeMounted = e2 - s2 + 1
const newIndexToOldIndexMap = new Array(toBeMounted).fill(0)  // 0 表示该位置是新增节点
for (i = s1; i <= e1; i++) {
  const prevChild = oldChildren[i]
  if (patched >= toBeMounted) { unmount(prevChild); continue }
  const newIndex = prevChild.key != null ? keyToNewIndexMap.get(prevChild.key) : findIndexInOld(...)
  if (newIndex === undefined) {
    unmount(prevChild)                         // 旧节点在新列表中不存在 -> 卸载
  } else {
    newIndexToOldIndexMap[newIndex - s2] = i + 1  // +1 避开 0（0 语义是"新增"）
    if (newIndex < lastIndex) moved = true     // 新下标比之前出现过的最大下标还小 -> 有逆序，需要 LIS
    else lastIndex = newIndex
    patch(prevChild, newChildren[newIndex])    // 就地更新内容（不动位置）
    patched++
  }
}

// 5.3 moved 为 false 时跳过 LIS（纯新增场景零移动），为 true 时求 LIS
const increasingNewIndexSequence = moved
  ? getSequence(newIndexToOldIndexMap)
  : []
let j = increasingNewIndexSequence.length - 1
// 5.4 从后向前遍历：i 对上新下标，先 mount 再 move，保证 insertBefore 的锚点节点已存在
for (i = toBeMounted - 1; i >= 0; i--) {
  const nextIndex = s2 + i
  const anchor = i + 1 < newChildren.length ? newChildren[nextIndex + 1].el : null
  if (newIndexToOldIndexMap[i] === 0) {
    mount(newChildren[nextIndex], parent, anchor)     // 新增节点
  } else if (moved) {
    if (j < 0 || i !== increasingNewIndexSequence[j]) {
      hostInsert(newChildren[nextIndex].el, parent, anchor)  // 不在 LIS 里 -> 移动
    } else {
      j--                                             // 在 LIS 里 -> 不动
    }
  }
}
```

- 最长递增子序列实现（Vue 源码用的是"贪心 + 二分 + 前驱数组回溯"的 O(n log n) 版本，且返回的是下标序列）：

```ts
function getSequence(arr: number[]): number[] {
  const p = arr.slice()          // p[i]: arr[i] 的前驱下标，用于回溯真实序列
  const result = [0]             // result 存的是"下标"，对应值构成递增序列（不一定是最终 LIS，需回溯）
  let i, j, u, v, c
  for (i = 0; i < arr.length; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {            // Vue 特有：0（新增占位）不参与 LIS
      j = result[result.length - 1]
      if (arr[j] < arrI) {       // 比结果末尾大 -> 直接追加，LIS 变长
        p[i] = j; result.push(i); continue
      }
      u = 0; v = result.length - 1
      while (u < v) {            // 二分找到 result 中第一个 >= arrI 的位置
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) u = c + 1
        else v = c
      }
      if (arrI < arr[result[u]]) {  // 替换掉该位置 -> 让"尾巴更小"，为后面留增长空间
        if (u > 0) p[i] = result[u - 1]
        result[u] = i
      }
    }
  }
  u = result.length              // 回溯前驱数组，得到真实下标序列
  v = result[u - 1]
  while (u-- > 0) { result[u] = v; v = p[v] }
  return result
}
```

- key 误区一：index 当 key，头部插入的场景中所有节点 sameVnode 判定错位，DOM 复用错误节点，状态型元素（input 的 value 非受控值、checkbox 勾选、transition 动画、focus）全部张冠李戴。
- key 误区二：随机值当 key，key 每次变 → sameVnode 全部失败 → 全部走"卸载旧 + 挂载新"，比不写 key 还慢。
- key 误区三：用对象引用当 key（:key="item"），数据每次请求重建对象 → 等效随机值。
- key 误区四：认为"静态列表不需要 key"——不写 key 时 Vue 走 unkeyed 分支（PatchFlags.UNKEYED_FRAGMENT），仍能工作，但只要可能重排就必须提供稳定业务 id。

**加分项（P7 视角）**：

- 为什么 Vue3 放弃双端：双端的优势在"已知新旧指针可双向收敛"，但它要求两套子节点数组都能头尾访问；Vue3 的编译优化里 Fragment/Teleport 等结构子节点可能是"未知形态"，双端预处理不可用；且头尾同步对"尾部追加/头部删除"这类真实场景（聊天列表、日志）命中率远高于双端的四次比较，实测 inferno 风格的预处理+LIS 更快（尤雨溪在 RFC 中引用了 inferno 的 benchmark 结论）。
- 复杂度对比要讲准：双端与预处理+LIS 都不是"更优 O"，核心差距在于常数项——预处理消化了大部分真实 diff、LIS 让移动次数最小化（双端只保证能复用，不保证移动最少）。-snabbdom 用简化版 LIS、React 传统列表 diff 用 index 比对（这就是 React 中 index key 问题的根源）。
- 生产案例：虚拟列表组件中 key 设计错误导致滚动时复用错行，用行数据的稳定 id（而非虚拟下标）作为 key 修复；深挖一层：虚拟滚动场景中"窗口移动"本质是头部批量删除+尾部批量插入，会被 Vue3 头尾预处理直接命中，几乎零 diff 成本。
- 追问"Vue 为什么不像 React 一样提 key 是可选的"：Vue 的 key 同时服务于 v-if/v-else 分支切换的身份判定与手动强制替换策略，语义比 React 更重。

## Q：computed vs watch vs watchEffect：实现原理与懒执行调度？

**核心答案**：computed 是"懒求值 + 缓存"的响应式派生值：内部是一个带 getter 的 ComputedRefImpl，首次访问才执行 getter 并把依赖收集到自己身上（此时自己作为 effect 又被访问它的渲染 effect 订阅），期间依赖不变则直接返回缓存，依赖变化只把 dirty 置 true 并通知订阅者，而不重算——直到下次被读取才真正重算。watch 是"显式声明源 + 懒回调"的侦听器，可以侦听 getter/ref/reactive 属性/数组多个源，回调在依赖变化时默认异步批量执行（flush: 'pre'，组件更新前），拿到新旧值。watchEffect 是"自动依赖 + 立即执行"：创建时同步跑一遍回调自动收集所有用到的响应式数据，依赖变化即重新执行，无需声明源。三者的调度差异：computed 走 effect.run 的同步重算（由访问触发）加 dirty 机制；watch/watchEffect 都通过 scheduler 把 job 推入 queueJob，在 flush 队列里按 pre/component/post 分桶在微任务中执行。

**知识点解析**：

- computed 核心实现（简化，3.4 前版本结构更直观）：

```ts
class ComputedRefImpl<T> {
  public dep: Dep = new Dep()          // 反向依赖：谁在使用我（通常是渲染 effect 或别的 computed）
  private _value: T
  public _dirty = true                  // 脏标记：true 表示缓存失效需要重算
  public readonly effect: ReactiveEffect

  constructor(getter, private setter) {
    this.effect = new ReactiveEffect(getter, () => {
      // scheduler：依赖变化时不重算，只标脏 + 通知"我的订阅者"（可能级联标脏）
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)          // 让订阅我的渲染 effect 进入更新队列
      }
    })
  }

  get value() {
    // 读取入口：可能发生在渲染期间（trackRefValue 收集到渲染 effect）
    trackRefValue(this)
    if (this._dirty) {
      this._dirty = false              // 先复位再执行，防止 getter 里递归读自己死循环
      this._value = this.effect.run()  // activeEffect = computed effect，getter 内的依赖全归它
    }
    return this._value                  // 非脏直接走缓存，getter 不执行
  }
  set value(newValue) { this.setter(newValue) }
}
```

- computed 链式传播：computed A 依赖 computed B 时，B 的订阅者里有 A。B 变脏时通过 scheduler 把 A 也标脏；A 只有被读取才重算——多层派生也不会产生风暴。
- watch 的源类型转换（source 经 `watch` 入口归一化）：

```ts
function watch(source, cb, options) {
  const getter = isRef(source)      ? () => source.value
    : isReactive(source)            ? () => traverse(source)       // reactive 对象：递归触碰所有属性，全量侦听
    : isFunction(source)            ? source                        // getter 函数：自定义侦听目标
    : isArray(source)               ? source.map(s => toGetter(s))  // 数组：多源
    : INVALID
  // 深度：deep 选项让 getter 返回值走 traverse 递归访问
  const effect = new ReactiveEffect(getter, scheduler)
  const job = () => {
    const newValue = effect.run()
    if (deep || hasChanged(newValue, oldValue) || isObject(newValue)) {
      cb(newValue, oldValue)   // 触发用户回调
      oldValue = newValue
    }
  }
}
```

- 三者对比选型：模板里用的派生值用 computed；需要在数据变化时执行副作用（请求、埋点、操作存储）且要旧值/初始不执行用 watch；副作用就是"把数据同步到别处"且不需要旧值用 watchEffect。
- 懒执行调度的三个关键点：1）watch 默认不 immediate，创建时只有一次 `effect.run()` 用于收依赖但不调回调；2）回调被包成 job 推入队列，一帧内多次变更只回调一次；3）flush 时机三选一：pre（默认，组件更新前）、post（组件更新后，可拿最新 DOM）、sync（同步立即，慎用，失去批量）。

```ts
// watchEffect 的执行时机选项
watchEffect(fn, { flush: 'post' })   // 需要读更新后 DOM 的副作用用 post
```

- 清理副作用：onCleanup 用于防竞态，异步回调完成前依赖又变了，旧请求结果要丢弃。

```ts
watch(id, async (newId, oldId, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())       // 下一次触发前/停止侦听时调用
  const data = await fetch(`/api/${newId}`, { signal: controller.signal })
  list.value = data
})
```

**加分项（P7 视角）**：

- Vue 3.4 computed 重构细节：Dep 改为链表后，computed 的"依赖失效传播"从触发式改为 dirty 计算传播，配合 `globalVersion` 计数，访问 computed 时若版本未变连 dep 遍历都不需要，官方 benchmark 中"从未读取的 computed 变化零开销"显著提升——可以讲成"懒执行的极端化：连标记脏都省了"。
- watch 与 watchEffect 的本质统一：两者共用 ReactiveEffect + scheduler，watch 只是"getter 归一化 + 新旧值对比 + 回调包装"的 watchEffect 特例；源码里 doWatch 一个函数同时实现两者。
- 常见坑：watch 侦听 reactive 对象属性写法 `watch(() => state.obj.count)` 时如果 state.obj 被整体替换，闭包里的路径才生效；解构 props 侦听必须用 getter 形式（`() => props.foo`），直接侦听解构值拿到的是快照。
- 生产案例：搜索联想用 watch + debounce + onCleanup AbortController 三件套，把"请求竞态覆盖新结果"的 bug 类别整体消灭；把派生列表从模板内联表达式改成 computed 后，render 次数不变但 render 内计算量为零（缓存命中）。

## Q：nextTick 原理：微任务队列与批量更新机制？

**核心答案**：nextTick 的本质是"把回调排到当前这批 DOM 更新之后"：Vue 的数据变更并不直接改 DOM，而是通过 trigger → effect.scheduler → queueJob 把组件更新任务推入队列，并在首次入队时通过 Promise.resolve().then(flushJobs) 把"真正执行更新"这件事注册成一个微任务；nextTick 同样把用户回调注册成微任务，且 flushJobs 是先注册的那个，所以同一个 tick 内先 flush 更新再跑用户回调——回调里就能拿到更新后的 DOM。这是典型的"微任务批量 + 去重"模式：同一帧内改同一个状态 N 次，队列里只有一个 job（按 uid 去重），组件只重渲染一次。之所以选微任务而不是宏任务：微任务在当前 JS 调用栈清空后立即执行，早于渲染，DOM 更新能合并进当前帧，避免 settimeout 造成的一次额外绘制与闪烁。

**知识点解析**：

- nextTick 实现（runtime-core/src/scheduler.ts，逐行解释）：

```ts
const resolvedPromise = Promise.resolve()
let currentFlushPromise: Promise<void> | null = null

export function nextTick<T>(fn?: () => T): Promise<T> {
  const p = currentFlushPromise || resolvedPromise
  // 关键：fn 被挂到 currentFlushPromise 后面（then 链），
  // 而 currentFlushPromise 的 resolve 恰好在 flushJobs 执行完成时调用，
  // 所以 fn 必然在所有组件更新完成之后执行
  return fn ? p.then(fn) : p
}
```

- queueJob 入队去重（逐行解释）：

```ts
const queue: SchedulerJob[] = []
export function queueJob(job: SchedulerJob) {
  // 去重：每个组件的 update 函数都有唯一 uid，一帧内多次触发同一组件更新只保留一个
  if (!queue.includes(job)) {
    if (job.id == null) {
      queue.push(job)                 // 无 id（如用户 watch 的 job）：直接入队
    } else {
      // 有 id：按 id 升序插入（父组件 id 小于子组件，保证父先更新）
      // findInsertionIndex 用二分找到第一个 id 大于当前 job 的位置
      queue.splice(findInsertionIndex(job.id), 0, job)
    }
    queueFlush()
  }
}

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)  // 微任务：当前同步代码全部跑完后才 flush
  }
}
```

- flushJobs 主体（逐行解释）：

```ts
function flushJobs(seen?: CountMap) {
  isFlushPending = false
  isFlushing = true
  flushIndex = 0
  queue.sort(comparator)              // 1. 最终按 id 升序排：组件(小 id)先于子组件、先于用户 watch(id+1e9)
  for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
    const job = queue[flushIndex]
    if (job && job.active) {
      if (__DEV__ && checkDuplicateIds) { /* 开发环境重复 id 检测 */ }
      callWithErrorHandling(job, ...)  // 2. 真正执行组件 update / watch 回调
    }
  }
  flushIndex = 0
  queue.length = 0                     // 3. 清空队列；执行期间新入队的 job 会在下面第二轮消化
  flushPostFlushCbs(seen)              // 4. 执行 post 队列（watchEffect flush:'post'、directive mounted 等）
  if (queue.length || pendingPostFlushCbs.length) {
    flushJobs(seen)                    // 5. flush 过程中又产生了新任务 -> 递归再来一轮（微任务内同步递归，有上限保护）
  } else {
    isFlushing = false
    currentFlushPromise = null         // 6. 复位，此时 nextTick 的 then 链被 resolve
  }
}
```

- 使用场景：改完数据立刻要读 DOM 尺寸/滚动位置/输入框焦点，或要在 DOM 更新后再执行第三方库（图表、编辑器）初始化。

```js
const state = reactive({ list: [] })
async function load() {
  state.list = await fetchList()
  await nextTick()                    // 等待 DOM 更新完成
  container.scrollTop = container.scrollHeight   // 拿到真实高度滚动到底部
}
```

- 批量更新的收益验证：循环里改同一状态 1000 次，render 只执行 1 次；watch 回调也只触发 1 次（拿到最终值），这是"数据层同步、视图层异步"的设计哲学。

**加分项（P7 视角）**：

- 微任务降级历史：Vue2 的 nextTick 有一段 famous 的降级链（Promise → MutationObserver → setImmediate → setTimeout），因为当年要兼容不支持 Promise 的环境；Vue3 直接放弃 IE，固定 Promise，代码量骤减——可以引申"框架对运行时基线的选择本质是对支持成本的取舍"。
- id 排序的深意：组件 uid 递增保证父组件 id 恒小于子组件，所以队列天然"父更新在前"；用户 watch job 的 id 被设计为 ownerScopeId + 1e9（极大值），保证 watch 回调在组件渲染之后执行，回调里读到的是新 DOM 的世界——排错时这个顺序意识很重要。
- Vue2 与 Vue3 nextTick 的一个可感知差异：Vue2 里 nextTick 回调执行时组件更新未必完全结束（父更新链），Vue3 的 currentFlushPromise 把"flush 完整结束（含 post 队列）"作为 resolve 点，语义更严格。
- 追问"为什么不合并到 requestAnimationFrame"：rAF 是宏任务级的帧回调，时机晚于微任务，若把 DOM 更新放 rAF 会多等一次绘制且与浏览器渲染管线交错引入不确定性；Vue 的策略是"微任务内合并更新，赶在浏览器绘制之前"，恰好一个自然帧内完成数据→DOM→绘制。

## Q：组件通信有哪些方式？各自的选型？provide/inject 的响应性陷阱？

**核心答案**：按关系选型：父子用 props/emit（含 v-model 双向、多个 v-model、defineModel 宏）；跨层用 provide/inject；兄弟或跨组件用事件总线（mitt）或状态管理（Pinia）；模板内容分发用插槽 slot；透传未声明属性用 attrs；父调子方法用 ref + defineExpose；全局长生命周期数据用 Pinia。provide/inject 的响应性陷阱核心是一句话：provide 的是"值"还是"响应式引用"——传值时子组件拿到的是快照，后续修改不联动；必须传 ref/reactive/computed 引用本身，且子组件不要解构（解构 reactive 或对 ref 取 .value 都会把响应性"兑现"成普通值）。深层组件想改数据也不该直接改注入的 reactive（破坏单向数据流），正确做法是 provide 一个"修改函数"或用组合式函数封装读写。

**知识点解析**：

- 全家桶通信方式与适用面：

```ts
// 1. 父传子：props + defineProps（含类型推导）
const props = defineProps<{ title: string; items?: Item[] }>()

// 2. 子传父：emit + defineEmits
const emit = defineEmits<{ (e: 'change', v: number): void }>()

// 3. 双向：v-model（Vue3 是 modelValue + update:modelValue 语法糖，支持多个）
const tab = defineModel<number>()                    // Vue3.4+ 简化写法
const title = defineModel<string>('title')           // 具名 v-model:title

// 4. 跨层：provide / inject（见下）

// 5. 父调子：ref + defineExpose 暴露受控接口
defineExpose({ focus: () => inputRef.value?.focus() })

// 6. 兄弟/跨页：事件总线 mitt 或 Pinia
import mitt from 'mitt'
export const emitter = mitt<{ refresh: number }>()

// 7. 内容分发：slot / 作用域插槽（子把数据回传给父的插槽内容）
// 8. 属性透传：$attrs（class/style/事件落到根元素，inheritAttrs: false 时手动绑定）
```

- provide/inject 正确姿势（传引用不传值）：

```ts
// 父组件：key 用 InjectionKey 保住类型
import { provide, inject, ref, readonly, InjectionKey } from 'vue'
export const ThemeKey: InjectionKey<Ref<string>> = Symbol('theme')

const theme = ref('dark')
provide(ThemeKey, theme)                  // 传 ref 本身（正确）
provide('changeTheme', (v: string) => theme.value = v)   // 修改走函数，保单向数据流

// 子组件（任意深度）
const theme = inject(ThemeKey)             // 类型是 Ref<string> | undefined
theme?.value                              // 必须通过 .value 访问才保持响应
```

- 响应性陷阱演示（错误写法对比）：

```ts
// 陷阱一：provide 值不 provide 引用 —— 子组件拿到一次性快照
const count = ref(0)
provide('count', count.value)   // 错：number 快照，父组件改 count 子组件不更新
provide('count', count)         // 对：Ref 引用

// 陷阱二：inject 后解构 reactive —— 解构瞬间取值，脱离代理
const ctx = reactive({ user: 'a', role: 'admin' })
provide('ctx', ctx)
// 子组件
const { user } = inject('ctx')          // 错：user 是普通字符串
const ctx2 = toRefs(inject('ctx')!)      // 对：转成 ref 再解构

// 陷阱三：非响应式对象 —— provide 普通对象后往里塞值，子组件不更新
provide('config', { theme: 'dark' })    // 错：非 reactive，改了也没人知道
```

- 默认值与可选：`inject(key, '默认值')` 第二参静态默认，`inject(key, () => factory())` 工厂形式适合默认值需要每次新建对象的场景。
- v-model 与 sync 的历史：Vue2 的 .sync 修饰符在 Vue3 里被多 v-model 取代，`v-model:title="t"` 展开为 `:title + @update:title`。

**加分项（P7 视角）**：

- 选型决策树可以直接背：有"谁拥有数据"的问题找共同父级（状态提升）或 Pinia；有"跨多层配置透传"问题找 provide/inject（主题、i18n、表单上下文）；有"高频双向"用 defineModel 而不是手写 emit；事件总线在现代项目里基本应该被 Pinia 取代——全局事件名是字符串魔法，类型与生命周期都失控。
- provide/inject 的响应性为什么"看起来能工作"：组件 render 时 inject 到的 ref 被读取会 track 当前渲染 effect，所以不写任何代码也能更新——但这个联动只覆盖"模板读取"，写在 setTimeout 回调里的读取不走这条链，理解这点能解释一批"有时更新有时不更新"的疑难杂症。
- 源码级：provide 的实现是把 `provides` 设为父组件 `provides` 的原型（`instance.provides = parent.provides` 的 Object.create），所以 inject 查找是原型链向上递归；这使得 provide/inject 的成本是 O(深度) 但常量极小，也解释了为什么"应用级 provide"（app.provide）挂在最顶端。
- 生产案例：动态主题/暗色模式用 provide(ThemeKey, readonly(themeRef)) + 修改函数，避免业务组件改注入值导致多实例不同步；表单组件库（form-item 自动校验）用 provide/inject 拿 form 上下文，是"库作者必须掌握的通信方式"的最好例子。

## Q：生命周期：选项式与组合式对照？setup 执行时机？keep-alive 钩子？

**核心答案**：组合式钩子与选项式一一对应：setup 本身替代 beforeCreate/created（setup 在 props 解析之后、beforeCreate 之前执行，内部代码就相当于 created 阶段，同步请求应放这里）；onBeforeMount/onMounted、onBeforeUpdate/onUpdated、onBeforeUnmount/onUnmounted 语义相同，区别是组合式钩子必须在 setup 同步调用注册（内部按当前组件实例入栈，异步调用时 activeInstance 已弹出导致注册到错误组件或报警告）。keep-alive 有专属的 activated/deactivated（缓存激活/失活，替代挂载卸载语义）。另有错误处理 onErrorCaptured、SSR 的 onServerPrefetch、仅开发期的 renderTracked/renderTriggered 调试钩子。核心时机链：createVNode → 组件实例初始化（props → slots → setup 执行）→ setupRenderEffect 创建渲染 effect → beforeMount → 首次 render + patch → mounted（子先父后，入队 postFlushCbs）。

**知识点解析**：

- 对照表：

```text
选项式 (Options API)        组合式 (Composition API)      备注
beforeCreate / created  ->  setup() 本体                  setup 里写的代码即此阶段
beforeMount             ->  onBeforeMount                 首次渲染前
mounted                 ->  onMounted                     DOM 就绪，子先父后
beforeUpdate            ->  onBeforeUpdate                响应式数据变、DOM 未变
updated                 ->  onUpdated                     DOM 更新后，子先父后
beforeUnmount           ->  onBeforeUnmount               （Vue2 叫 beforeDestroy）
unmounted               ->  onUnmounted                   （Vue2 叫 destroyed）
errorCaptured           ->  onErrorCaptured              错误捕获，可 return false 阻断
renderTracked/Triggered ->  onRenderTracked/onRenderTriggered  仅开发环境
activated/deactivated   ->  onActivated/onDeactivated    keep-alive 专属
serverPrefetch          ->  onServerPrefetch              SSR 数据预取
```

- setup 执行时机源码定位：runtime-core 的 `createComponentInstance` 初始化（props/slots 先就位），`setupComponent` 里执行 setup（拿到返回值：render 函数或 bindings 对象），随后 `setupRenderEffect` 建立 effect；所以"setup 在 beforeCreate 之前执行"的准确表述是：instance 已创建、props 已解析，但 render effect 未建立。
- mounted/updated 的"子先父后"实现：不是同步调用，而是把钩子作为 post 队列任务入队（queuePostRenderEffect），flushJobs 统一执行，插入顺序天然按完成序（子组件 patch 先完成先入队）。
- 组合式钩子必须同步注册的原因：

```ts
// 简化自 runtime-core/src/component.ts
let currentInstance = null
export function getCurrentInstance() { return currentInstance }

export function onMounted(fn) {
  if (currentInstance) {
    // 钩子以闭包推入实例的 mounted 数组；实例激活期间才注册得上
    currentInstance.isMounted ? injectHook('mounted', fn, currentInstance) : (currentInstance.m || []).push(fn)
  } else {
    warn('onMounted 在 setup 外调用无效')   // 异步回调里 currentInstance 已被清空
  }
}
```

- keep-alive 钩子语义：被缓存组件第二次进入不触发 mounted，触发 activated；移出缓存/卸载父级才 unmounted；离开缓存时触发 deactivated。缓存实现是 vnode 级别：keep-alive 内部维护 cache Map 与 keys 集合，命中缓存的旧 vnode 被拷贝 shapeFlag（COMPONENT_KEPT_ALIVE）后直接复用，unmount 分支被改写为"移入隐藏容器"而非销毁；max 属性用 LRU 淘汰（Q17 手写 LRU 是同款思路）。

```ts
// keep-alive 缓存组件的使用
// <KeepAlive include="A,B" exclude="C" :max="10"> <component :is="view" /> </KeepAlive>
onActivated(() => { console.log('重新进入缓存组件，可恢复轮询/定时器') })
onDeactivated(() => { console.log('离开但未销毁，应清理定时器') })
```

- onUnmounted 清理规范：定时器、事件监听、ResizeObserver、socket 全部要在这清理；组合式代码更推荐"创建与清理成对"的写法——onScopeEffect / tryOnScopeDispose 封装通用清理逻辑。

**加分项（P7 视角）**：

- 源码时机链完整版：`createApp().mount()` → createVNode(component) → render → patch → processComponent → mountComponent：createComponentInstance → setupComponent（执行 setup）→ setupRenderEffect：创建 ReactiveEffect（render 为 getter、updateComponentFn 为 run 体、queueJob 为 scheduler）→ effect.run() 首渲染（beforeMount 在 run 前调用）→ patch 子树 → queuePostRenderEffect(mounted)——面试白板能画全这条链是 P7 硬指标。
- 钩子与 scheduler 的联动：所有生命周期"post 类"（mounted/updated/activated）本质是 postFlushCbs 队列任务，所以它们与 nextTick 的时序是"同队列、先进先出"——`onMounted` 与 `await nextTick()` 后回调谁先，取决于入队顺序，这个细节能解释很多"偶现时序 bug"。
- Suspense 与 async setup 的例外：async setup 会让组件挂起（pending），beforeMount/mounted 推迟到依赖 resolve 后，这套机制与 keep-alive 有 shapeFlag 联动（keep-alive 内的 suspense 组件不会被缓存）——说明"生命周期不是简单函数调用，而是由 vnode 的标志位驱动的状态机"。
- 微前端/库场景坑：手动调用 unmount 时 options 钩子 onUnmounted 一定触发，但若父级是被 keep-alive 缓存的，unmount 会被降级为 deactivate——在微前端卸载子应用时要显式 `<KeepAlive>` 无关化处理，否则定时器泄漏。

## Q：v-if vs v-show vs component :is 的选型？渲染函数 h() 与 JSX？

**核心答案**：v-if 是"真条件渲染"——false 分支的 vnode 不生成、已有 DOM 会卸载，切换开销大（重建组件实例与 DOM、重走生命周期）但初始开销小，适合低频切换和初始大概率不渲染的分支；v-show 是"永远渲染 + display:none"——初始就渲染，切换只是改样式，切换开销几乎为零但初始成本固定，适合高频切换（tooltip、hover 弹层、折叠面板）。component :is 用于动态组件切换，本质是按变量名解析组件构造器生成不同 vnode，key 不同则完全重建，常配合 keep-alive 缓存切换态；如果切换的两个组件 DOM 结构相似，可以提 key 用 :is + 复用策略。h() 是 createElement 的别名，签名为 h(type, props, children)，children 可以是字符串、vnode 数组（需注意 key），组件还可以是插槽对象；JSX 是 h() 的语法糖（vue-jsx 插件编译成 h 调用），拥有完整 JS 表达力，但会失去模板编译优化（patchFlag 退化为 BAIL），所以选型默认模板，仅在动态结构复杂（递归组件、根据配置渲染表单、列表项渲染函数配置化）时用 JSX/渲染函数。

**知识点解析**：

- 选型决策：

```text
分支大概率不渲染 / 切换低频 / 分支内有重组件  -> v-if（含 v-else-if / v-else / template 包裹多元素）
初始就频繁切换 / 简单显示隐藏 / 不支持 template 上的 v-if -> v-show
运行时才知道渲染哪个组件（路由/页签/配置驱动）-> component :is，页签配 KeepAlive
一个组件模板受太多条件嵌套（v-if 三层以上）   -> 抽子组件或 computed 计算出渲染目标
```

- v-if 与 v-for 同级的坑：Vue3 中 v-if 优先级高于 v-for，同名变量会在 v-if 里取不到（官方 lint 禁止）；应拆开，用 computed 预过滤。

```html
<!-- 错误：v-if 里 item 还不存在 -->
<li v-for="item in list" v-if="item.active">{{ item.name }}</li>

<!-- 正确：computed 先过滤 -->
<li v-for="item in activeList" :key="item.id">{{ item.name }}</li>
```

- component :is 的三种形态：

```ts
// 1. 字符串（注册过的组件名/HTML 标签）
// <component :is="currentTab" />

// 2. 组件对象（静态导入）
import TabA from './TabA.vue'
// <component :is="TabA" />

// 3. 异步组件（懒加载）
const TabB = defineAsyncComponent(() => import('./TabB.vue'))
```

- h() 签名与 children 细节：

```ts
import { h, resolveComponent } from 'vue'

// h(type, props, children)
h('div', { class: 'box', onClick: handler }, [
  h('span', { key: 1 }, '文本'),
  h('p', { key: 2 }, [h('b', '嵌套')]),
])

// 组件 + 插槽对象形式 children（对象 key 是插槽名）
h(MyDialog, { modelValue: open.value, 'onUpdate:modelValue': (v) => (open.value = v) }, {
  header: () => h('h3', '标题'),
  default: () => h('p', '内容'),
})
```

- JSX 写法与差异点：

```tsx
// .tsx 文件：v-if -> 三元/&&，v-for -> map，v-model -> modelValue + onUpdate:modelValue
export default defineComponent({
  props: { items: Array as () => Item[] },
  setup(props) {
    return () => (
      <ul class="list">
        {props.items?.map((it) => (
          <li key={it.id} class={{ active: it.active }}>
            {it.active ? it.name : <del>{it.name}</del>}
          </li>
        ))}
      </ul>
    )
  },
})
```

- 为什么 JSX 失去编译优化：模板编译器能静态分析出动态/静态边界（Q2 的 patchFlag/block tree），JSX 编译只做"h 调用的语法转换"，没有模板的结构约束可分析，所以 patchFlag 为 BAIL，diff 走全量——这是"表达力与优化"的取舍。

**加分项（P7 视角）**：

- 性能量化话术：v-if 切换一次 = 完整 unmount + mount（组件树越深越贵，含 setup、请求、状态重建）；v-show 切换 = 一次样式 patch（纳秒级）；但 v-show 的隐藏组件仍占用 DOM 节点与内存、其内部的 watch/effect 依然活跃——大数据量弹层用 v-show 会造成隐性内存与更新开销，选型要算总账。
- component :is 与 keep-alive 的 include 匹配依据是组件的 name（script setup 里用 defineOptions 或文件名推断），踩坑率极高：缓存不生效第一排查项就是 name 对不上。
- 函数式组件（无状态、无实例）在 Vue3 中性能收益已很小（Vue3 有实例缓存优化），主要价值从"性能"变成了"逻辑复用单元"；但纯渲染函数组件配合 TSX 是做"配置驱动表单/低代码渲染器"的主流方案——可以在简历项目里展开。
- 追问"渲染函数里怎么拿到编译期的优化"：Vue3 的 h() 可以手动传第三个 patchFlag 参数和 dynamicChildren（这正是模板编译产物在用的私有参数），业务层不建议写但面试能说出"优化能力在 API 层是保留的"是加分认知。

## Q：ref vs reactive：深浅响应、toRefs/toRef/toRaw、解构为何丢失响应性？

**核心答案**：ref 是"任何值都能包"的响应式盒子：对象/基本类型通吃，内部是 RefImpl，访问要走 .value，值是对象时会自动调 toReactive（即 reactive()）做深层代理，所以 ref 默认也是深的。reactive 只能包对象类型（Proxy 无法代理基本类型），返回代理对象本身（无 .value），深层的、惰性的（访问到才转）。shallowRef/shallowReactive 只代理第一层：.value 赋值/顶层属性变更触发更新，深层修改不追踪，需要 triggerRef 手动通知。解构丢失响应性的原因：reactive 的响应性存在于"代理对象"上，解构等于通过代理读了一次属性值，拿到的是脱离代理的普通值（或内层代理），后续修改不经过任何 trap，自然无通知；解决方式是对 reactive 用 toRefs/toRef 把每个属性转成"仍指向源对象的 ref"，或对 props 用 Vue3.5 的响应式 props 解构（编译器把解构访问改写回 props.x）。toRaw 用于拿回原始对象，绕过响应式做高开销只读操作或做依赖比对。

**知识点解析**：

- ref 的深浅实现（简化源码，逐行解释）：

```ts
class RefImpl<T> {
  private _value: T
  public dep: Dep
  constructor(value: T, public readonly __v_isShallow: boolean) {
    this.dep = new Dep()
    this._value = this.__v_isShallow ? value : toReactive(value)  // 非浅层：对象值立即转 reactive
  }
  get value() {
    this.dep.track()                                   // 读：收集当前 activeEffect（含 render effect）
    if (this._dirty) { /* computed 特化逻辑，普通 ref 直接走 */ }
    return this._value
  }
  set value(newVal) {
    newVal = this.__v_isShallow ? newVal : toReactive(newVal)     // 新值也是对象 -> 深层代理
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = newVal
      this.dep.trigger()                                // 写：通知（Object.is 比较变化才触发）
    }
  }
}
export const toReactive = (value) => isObject(value) ? reactive(value) : value
```

- 解构丢失响应性的本质演示：

```ts
const state = reactive({ count: 0, nested: { num: 1 } })

let { count } = state        // 等价于 const count = state.count
// 此刻 state.count 走了一次 get trap 返回 0（基本类型），
// count 只是普通 number，之后 state.count++ 不会让 count 变，count = 5 也不会通知任何 effect

let { nested } = state       // nested 是内层代理（get trap 时懒转换的）
nested.num++                 // 这个仍然响应！因为拿到的是 Proxy 本身
// 结论：解构"基本类型"必丢，解构"对象"拿到的内层代理不丢但引用固化（重新给 state.nested 赋值则断开）
```

- toRefs/toRef 修复解构（实现是 ObjectRefImpl，逐行解释）：

```ts
class ObjectRefImpl<T, K extends keyof T> {
  constructor(private object: T, private key: K) {}   // 只存"源对象 + 属性名"，不复制值
  get value() { return this.object[this.key] }       // 每次读都现场走源对象（可能是 reactive）的 get trap
  set value(v) { this.object[this.key] = v }        // 写同理，经过 trap -> 触发更新
}
export function toRef<T, K>(object: T, key: K) { return isRef(object[key]) ? object[key] : new ObjectRefImpl(object, key) }
export function toRefs<T>(object: T) {
  const ret = {}
  for (const key in object) ret[key] = toRef(object, key)   // 逐属性转 ref，返回的是"属性访问代理"
  return ret
}
```

```ts
// 使用：函数复用逻辑时保持解构后可写且响应
function useFeature() {
  const state = reactive({ count: 0, name: 'a' })
  return toRefs(state)          // 调用方解构得到 Ref，不丢响应
}
const { count, name } = useFeature()   // count.value 依然联动 state.count
```

- toRaw 与 markRaw：

```ts
const state = reactive({ big: markRaw(bigChartData) })  // markRaw：永远不转代理（图表/地图实例必用）
const raw = toRaw(state)        // toRaw：拿原始对象（reactive(obj) 的 obj），高开销只读遍历用
```

- props 解构的版本演进：Vue3.0-3.4 里 `const { title } = props` 丢失响应（props 本身是 shallowReactive），只能写 `props.title` 或 `toRefs(props)`；Vue3.5 起编译器支持响应式解构——`const { title = '默认' } = props` 被编译回 `props.title` 的访问并支持默认值。

**加分项（P7 视角）**：

- 选型建议可以直接定团队规范：统一用 ref + .value（心智简单、可替换整个对象、基础类型通吃），reactive 只在"聚合局部状态对象"时使用；其实现代规范（如 Anthony Fu 风格）甚至倾向"全部 ref"以避免解构陷阱，这是可以直接讲的工程决策。
- 深浅响应的性能账：reactive 惰性深层代理解决了 Vue2 全量递归的初始化问题，但读路径 trap 成本仍在；真实优化路径是 shallowReactive + 局部 toRef、或"深数据 markRaw + 需要驱动 UI 的字段单独 ref"——B 端大表格组件的标准做法。
- 追问"ref 为什么需要 .value"：基本类型无法被 Proxy 拦截，只能包一层对象用 getter/setter；而保留 .value 让"属性访问"在类型层可追踪（TS Ref 类型）；Vue 编译器同时做了模板内自动解包（template 里不用写 .value）与 reactive 顶层属性解包（`reactive({ count: ref(0) }).count` 自动解包为 0）——细节满分点。
- 生产案例：ECharts 实例必须 markRaw（Proxy 包住实例后内部 this 指向与内部属性遍历会被劫持，出现奇怪的渲染异常与内存泄漏），toRaw 用于大数据 diff 比对时绕过 trap 提升一倍以上遍历性能。

## Q：自定义渲染器 createRenderer 如何工作？跨端渲染（canvas/原生）原理？

**核心答案**：Vue 的运行时分成 runtime-core（平台无关：响应式、组件系统、虚拟 DOM diff、指令/插槽/生命周期）与 runtime-dom（浏览器平台的 nodeOps 与 patchProp 实现）。createRenderer 是工厂函数：接收一个"宿主操作集"（createElement、insert、remove、patchProp、querySelector 等），返回使用这些操作完成创建/更新/删除的 renderer（含 patch/render/createApp）。runtime-dom 的 createApp 只是把 DOM 操作喂给 createRenderer 的产物再挂上 mount 到元素的能力；所以"跨端"的本质是：换一套 nodeOps——canvas 渲染器把"创建元素"换成 new 一个图形对象并 draw 到画布，原生渲染器（如 Weex/uni-app 小程序端）把 createElement 换成 wx 的节点创建 API，diff/调度/响应式整套机制原样复用。这就是 Vue3 架构上"编译器、运行时核心、平台运行时"三层解耦的价值。

**知识点解析**：

- createRenderer 的接口形状（runtime-core/src/renderer.ts）：

```ts
export interface RendererOptions<HostNode = RendererNode, HostElement = RendererElement> {
  patchProp(el: HostElement, key: string, prevValue: any, nextValue: any, ...): void
  createElement(type: string): HostElement
  createText(text: string): HostNode
  setText(node: HostNode, text: string): void
  setElementText(el: HostElement, text: string): void
  insert(child: HostNode, parent: HostElement, anchor?: HostNode | null): void
  remove(child: HostNode): void
  parentNode(node: HostNode): HostElement | null
  nextSibling(node: HostNode): HostNode | null
  querySelector?(selector: string): HostElement | null
}
export function createRenderer<HostNode, HostElement>(options: RendererOptions) {
  // patch / patchElement / patchChildren / mountComponent / unmount ...
  // 这些算法全部只调用 options 里的抽象操作，不含任何 document API
  return { render, createApp: createAppAPI(render, hydrate) }
}
```

- runtime-dom 怎么接入：`createApp = (...args) => { const app = ensureHydrationRenderer().createApp(...args); ... }`，其中 renderer 由 `createRenderer(nodeOps, patchProp)` 创建，nodeOps 就是薄封装的 document.createElement 等。

- 一个可运行的最小 canvas 渲染器骨架：

```ts
import { createRenderer } from '@vue/runtime-core'

// 节点用普通对象表示，父子的 insert/remove 维护一个逻辑树，渲染时整帧重绘
const canvasObjects = new Map()    // 虚拟节点 -> canvas 绘制上下文数据
let ctx: CanvasRenderingContext2D

function drawAll() {               // 简化策略：脏标记后整帧重绘（可优化为脏矩形）
  ctx.clearRect(0, 0, W, H)
  traverse(rootContainer, (node) => drawNode(node))
}

const nodeOps = {
  createElement: (type) => ({ type, children: [], props: {} }),
  insert: (child, parent, anchor) => {
    const i = anchor ? parent.children.indexOf(anchor) : -1
    if (i >= 0) parent.children.splice(i, 0, child)
    else parent.children.push(child)
    drawAll()                       // 结构变化触发重绘
  },
  remove: (child) => { /* 从 parent.children 移除 + drawAll() */ },
  createText: (text) => ({ type: 'text', text }),
  setText: (node, text) => { node.text = text; drawAll() },
  setElementText: (el, text) => { el.children = [ { type: 'text', text } ]; drawAll() },
  parentNode: (node) => node.parent || null,
  nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
  patchProp: (el, key, _, value) => {
    el.props[key] = value           // width/height/fill/x/y 全存数据，drawAll 消费
    drawAll()
  },
}

const { createApp } = createRenderer(nodeOps)
const app = createApp({ setup: () => () => null /* 返回 vnode */ })
// app.mount(fakeRoot) 之后，数据变化 -> 响应式 -> diff -> nodeOps -> canvas 重绘
```

- 三种真实"跨端"形态对照：1）@vue/server-renderer——nodeOps 换成"拼字符串"，render 产出 HTML（SSR 的实现基座）；2）小程序端（uni-app）——createElement 换成 wx 的 createVirtualNode，把 Vue 的 DOM 操作翻译成 setData；3）WebGL/Three 系（TresJS）——节点换成 Three 对象树，diff 操作 Three 实例的 position/material。

**加分项（P7 视角）**：

- 看出"渲染器与响应式是正交的"是关键认知：createRenderer 解决"视图协议"，@vue/reactivity 单独成包（可以在 React/原生 JS 里用）解决"数据协议"，两个维度组合出 all in vue 的生态位——讲架构时这是最有含金量的表述。
- 整帧重绘是演示策略，真实 canvas 渲染器（如 vue-canvas-render 的思路）要做"渲染调度与 diff 对齐"：让 vnode diff 的粒度映射到重绘区域（脏矩形/分层离屏 canvas），否则 diff 的精细优化被整帧 draw 抵消——能点出这层"优化断层"即是 P7 水位。
- hydration 也是 renderer 的一部分：createRenderer 返回的 hydrate 函数负责"在已有 DOM 上对齐 vnode"（SSR 激活），其入口挂在 createAppAPI 里——把 Q15 的 hydration 细节与此处串起来讲，形成知识闭环。
- 面试追问"自定义渲染器怎么处理事件"：patchProp 里 key 以 on 开头的事件没有 addEventListener 可用，需要自己实现合成事件（在 canvas 上监听原生事件，按坐标命中测试反查逻辑树分发）——与小程序里"事件桥接"是同一类问题。

## Q：Vue3 编译器架构：parse→transform→generate？手写 mini-compiler 的思路？

**核心答案**：Vue3 编译器分三段式。parse（baseParse）：带游标的 parserContext 逐字符扫描，产出树形 AST——节点类型有 Root/Element/Text/Interpolation（插值）/Comment，元素上挂着 helpers、props（指令与属性）、children；compiler-dom 在此层扩展 HTML 特有解析（v-html、实体解码等）。transform（transform 阶段的核心设计）：以"插件化转换器"遍历 AST——transformIf/transformFor/transformText/transformElement/transformExpression/各指令转换器，每个 transform 读上下文（nodeTransforms 队列 + directiveTransforms），把描述性 AST 增强为"代码生成导向"的 codegenNode（astIf 对应 codegen 条件表达式节点）；@vitejs/plugin-vue 的 script setup 编译（compileScript）在这个阶段产出"binding 元数据"，标记哪些标识符来自 setup 作用域，使 template 可以内联访问并支持 tree-shaking（inline 模式）。generate：genFunctionPreamble（import 语句）+ genNode 递归生成 render 函数代码字符串，静态节点收集 ast.hoists 生成提升语句。手写 mini 编译器的思路完全一致：正则/状态机切 token → 建树 → transform 把 if/for 指令改写成三元表达式/map 调用 → 字符串拼接生成函数体 → new Function 执行。

**知识点解析**：

- 三段整体流程：

```text
template 字符串
  -> parse        baseParse(context)          产出 AST（描述"是什么"）
  -> transform    transform(ast, nodeTransforms, directiveTransforms)  产出 codegenNode（描述"怎么生成"）
  -> generate     generate(ast)               产出 render 函数源码字符串 + 静态提升数组
  -> new Function 编译为可执行 render
```

- transform 的插件列表（compiler-core 默认注册，节选）：

```ts
export function getBaseTransformPreset(prefixIdentifiers?: boolean): TransformPreset {
  return [
    [
      [transformIf, transformFor, ...trackVForScopes?, transformExpression, transformSlotOutlet, transformElement, transformSlotChildren, trackSlotScopes, transformText],
    ],
    {
      on: transformOn,          // v-on 指令 -> mergeProps(onClick: handler)
      bind: transformBind,      // v-bind:xxx -> props
      cloak: noopDirectiveTransform,
    },
  ]
}
```

- 一个指令的完整变形（v-if 为例）：

```html
<div><p v-if="ok">{{ msg }}</p></div>
```

```ts
// transformIf 后的 AST（示意）：结构化分支被改写为 codegen 节点
// ELEMENT(p) 上挂 ifCodegen: { condition: _ctx.ok, consequent: <p codegen>, alternate: undefined }
// generate 时输出：
export function render(_ctx, _cache) {
  return _createElementVNode("div", null, [
    _ctx.ok
      ? _createVNode("p", null, _toDisplayString(_ctx.msg), 1 /* TEXT */)
      : _createCommentVNode("v-if", true)
  ])
}
```

- mini-compiler 最小骨架（四步，可直接运行级别思路）：

```ts
// 1. parse：把模板切成节点树（这里只处理标签/文本/插值三类）
function parse(template: string) {
  const root = { type: 'Root', children: [] }
  const stack = [root]
  let i = 0
  while (i < template.length) {
    if (template.startsWith('<', i)) {
      const closeIdx = template.indexOf('>', i)
      const raw = template.slice(i + 1, closeIdx)
      if (raw.startsWith('/')) { stack.pop() }                       // 闭合标签出栈
      else {
        const [tag, ...attrPairs] = raw.split(/\s+/)
        const node = { type: 'Element', tag, props: Object.fromEntries(
          attrPairs.map((a) => { const [k, v] = a.split('='); return [k, v?.replace(/["']/g, '') || true] })
        ), children: [] }
        stack[stack.length - 1].children.push(node)
        stack.push(node)
      }
      i = closeIdx + 1
    } else {
      const next = template.indexOf('<', i)
      const text = template.slice(i, next === -1 ? template.length : next)
      const node = parseText(text)    // 区分纯文本与 {{ 插值 }}：按双大括号切分
      if (node) stack[stack.length - 1].children.push(node)
      i = next === -1 ? template.length : next
    }
  }
  return root
}

// 2. transform：把指令节点转成可生成的结构（v-if -> 三元、v-for -> map）
function transform(ast) {
  traverse(ast, (node) => {
    if (node.type !== 'Element') return
    if (node.props['v-if']) {
      node.type = 'If'
      node.condition = node.props['v-if'].replace(/\{\{|\}\}/g, '').trim()
      delete node.props['v-if']
    }
    if (node.props['v-for']) { /* 类似：转 { type: 'For', list, item } */ }
  })
  return ast
}

// 3. generate：递归拼字符串
function genNode(node): string {
  if (node.type === 'Text') return JSON.stringify(node.text)
  if (node.type === 'Interpolation') return `_ctx.${node.expr}`      // 插值 -> 取上下文
  if (node.type === 'If') return `${node.condition} ? ${genChild(node)} : null`
  if (node.type === 'Element') {
    const props = Object.entries(node.props).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')
    const children = node.children.map(genNode).filter(Boolean)
    return `h("${node.tag}", { ${props} }, [${children.join(', ')}])`
  }
  return 'null'
}

// 4. 编译执行：render(ctx) 拿到 vnode
export function compile(template: string) {
  const ast = transform(parse(template))
  const code = genNode(ast.children[0]) ?? 'null'
  // eslint-disable-next-line no-new-func
  return new Function('h', '_ctx', `return ${code}`) as (h: any, ctx: any) => any
}
```

**加分项（P7 视角）**：

- 编译期做的不只是"语法转换"，还有"语义分析"：source-position 保留（开发期能定位模板哪一行报错）、v-for 作用域追踪（trackVForScopes 决定插槽里变量取 _ctx 还是局部项）、以及 SFC 的 usedVars 分析（决定 props 解构、defineProps 类型转运行时等）——这是 compileScript 被称为"编译器里最难的部分"的原因，能点到即加分。
- inline 模式的 tree-shaking：默认产物 `_ctx.msg` 要运行时走 ctx 代理（带解析成本）；compileScript 产出 binding 元数据后，inline 模式直接生成 `msg.value`（setup 顶层变量访问），render 里不再 import vue 的全量 helper，按需 import 到组件文件内——最终包里未用的 helper 全被摇掉，这是 Vue3 组件库体积优化的核心机制。
- 源码到构建工具链的映射：@vitejs/plugin-vue 拆 SFC（parse + compileScript + compileTemplate），模板在开发态走 `@vuni/compiler-sfc` 的运行时编译器（带代码缓存），生产走完整编译（SSR 编译目标是 `_ssrRenderVDom`/字符串拼接的 SSR 模式）——SSR 编译就是把 codegen 目标换成字符串拼接，与 Q10 自定义渲染器思想同源。
- 手写编译器的评价点：能不能处理好"插值与文本混合、自闭合标签、注释、表达式转义"决定了 demo 与可用的差距；P7 层面建议按 compiler-core 的 context（source/index/line/column 推进）结构写，而不是正则一把梭，可维护性差一个量级。

## Q：Vue 性能优化：v-memo、shallowRef、虚拟滚动、组件懒加载策略？

**核心答案**：Vue 的性能优化分四层。渲染层：v-memo 用依赖数组缓存整棵子树的 vnode，依赖不变直接复用旧 vnode（连 diff 都跳过），适合"行内多字段、行数组不常变"的大列表；shallowRef/shallowReactive 砍掉深层代理，把 Proxy 开销从 O(数据量) 降到 O(1)。数据层：超大只读数据 markRaw 彻底脱离响应式，配合手动 triggerRef 精准通知；computed 缓存派生计算。视图层：虚拟滚动只渲染视口内 ± buffer 行，万行列表 DOM 数量恒定（定位用等高公式 O(1) 或动态高度缓存 + 二分查找）；图片/组件级懒加载。加载层：路由级 dynamic import 分包、组件级 defineAsyncComponent、配合 Suspense 与骨架屏，首屏 JS 体积直接决定 TTI；keep-alive 缓存切换成本高的页面。优化顺序一定是"先测量（devtools profiler、performance 面板）再动手"，大部分卡顿来自意外的深层 watch 与无 key 大列表重渲染。

**知识点解析**：

- v-memo 的语义与边界：

```html
<div v-for="item in list" :key="item.id" v-memo="[item.selected, item.id]">
  <!-- 该 div 整棵子树只在 selected/id 变化时才参与 diff；行内几十个字段更新时其余行零成本 -->
  <span>...</span>
  <ChildComp :data="item" />
</div>
```

```ts
// 原理：v-memo 编译为缓存比较
// withMemo([item.selected], () => {
//   return (openBlock(), createElementBlock(...整棵子树...))
// }, _cache, index)
// 依赖数组 Object.is 逐项比较，全等则直接返回缓存 vnode，
// 父级 patch 看到 n1 === n2（同引用）直接跳过 —— 是"跳过 diff"而不是"跳过 DOM"
```

- 虚拟滚动核心实现（等高版，逐行解释）：

```ts
function useVirtualList(source: Ref<Item[]>, itemHeight: number, containerHeight: number) {
  const containerRef = ref<HTMLElement>()
  const scrollTop = ref(0)

  const visible = computed(() => {
    const start = Math.max(0, Math.floor(scrollTop.value / itemHeight) - 5)  // 1. 头部缓冲 5 行
    const end = Math.min(
      source.value.length,
      Math.ceil((scrollTop.value + containerHeight) / itemHeight) + 5        // 2. 尾部缓冲 5 行
    )
    return { start, end, slice: source.value.slice(start, end) }              // 3. 只切窗口数据
  })

  onMounted(() => {
    const onScroll = (e: Event) => { scrollTop.value = (e.target as HTMLElement).scrollTop }
    containerRef.value?.addEventListener('scroll', onScroll, { passive: true })  // 4. passive 提升滚动帧率
  })

  return { containerRef, visible }
}
```

```html
<!-- 结构：外层定高滚动容器 + 内层撑高占位 + 绝对/相对偏移的渲染窗口 -->
<div ref="containerRef" style="height: 600px; overflow-y: auto;">
  <div :style="{ height: totalHeight + 'px', position: 'relative' }">
    <div :style="{ transform: 'translateY(' + visible.start * itemHeight + 'px)' }">
      <div v-for="item in visible.slice" :key="item.id">...</div>
    </div>
  </div>
</div>
```

- 懒加载策略分层：

```ts
// 1. 路由级分包：路由组件动态 import（Webpack/Vite 自动按路由切 chunk）
const routes = [
  { path: '/admin', component: () => import('./views/Admin.vue') },
]

// 2. 组件级：defineAsyncComponent + loading/error 组件 + 超时
const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  loadingComponent: Skeleton,
  delay: 200,           // 200ms 内加载完不闪骨架屏
  timeout: 10000,
})

// 3. 视口内懒加载：进入可视区才挂载（v-if + IntersectionObserver）
// 4. 预取策略：Vite 下 import(/* @vite-ignore */ ...) 或构建产物 <link rel="prefetch">
```

- 其他高频手法汇总：v-once 一次性静态化、`Object.freeze`/markRaw 大数据、避免 deep watch（用 getter 侦听具体字段）、稳定 key、事件缓存 cacheHandlers（编译期自动）、keep-alive include 白名单化（防止缓存失控内存涨）、SSR/SSG 首屏直出。

**加分项（P7 视角）**：

- 优化的第一性原理表述：渲染成本 = render 执行成本 + diff 成本 + DOM 操作成本；v-memo 同时砍掉前两项（缓存整个 vnode 产物）、patchFlag/block tree 砍 diff 项、虚拟滚动直接砍 DOM 数量、shallowRef 砍的是 render 前的响应式 track 成本——能把每个优化手法映射到公式里的一项，是 P7 的框架化表达。
- v-memo 的坑：缓存导致子组件 props 深层变化不更新（memo 依赖没写全）；v-memo 与 v-for 同用时 key 必须稳定；v-memo 数组里放对象引用基本等于没缓存（每次新引用）。生产事故常见于"行内弹层状态被缓存"。
- 动态高度虚拟滚动方案：预估高度渲染 → ResizeObserver 实测后写回高度缓存（prefix sum 前缀和数组）→ 二分找 start（缓存的 positions 数组满足单调）→ 校准 scrollTop 与锚点偏移；能讲清"预估-实测-校准"闭环就超越了 90% 的候选人（vue-virtual-scroller 的 VariableHeight 实现）。
- 指标化：给方案配数字才有说服力——例如"3 万行表格从 reactive 换 shallowReactive + 行级 v-memo，首屏 render 从 4.1s 降到 620ms（devtools Profiler 实测）、交互帧率从 12fps 到 55fps"，强调所有结论来自 flamegraph 而非感觉。

## Q：状态管理：Pinia vs Vuex 架构差异、模块化、SSR 下的 store 序列化？

**核心答案**：Vuex 是单一 store 树 + module 命名空间（namespaced）架构，state 修改必须走 mutation（同步，为了 devtools 时间旅行与严格模式）+ action（异步）的固定链路，TS 支持靠手写类型映射（InjectionKey/增强），样板代码多。Pinia 干掉了 mutation（state 可以直接改或 $patch 批量改），store 是扁平的、每个 defineStore 一个独立 store（天然模块化、天然 code-split），内部实现是"state 用 reactive、getters 用 computed、$subscribe 基于 $patch 的 effect 追踪"，devtools 与严格模式不依赖 mutation 约束而靠 patch 拦截实现，所以链路更短。SSR 序列化：Pinia 服务端渲染时每个 store 的 state 就是 `pinia.state.value` 这个大 reactive 对象，渲染完成后整体 JSON 序列化挂到 `window.__INITIAL_STATE__`；客户端创建 pinia 后把这份状态直接赋回 `pinia.state.value`（Nuxt 里 @pinia/nuxt 自动完成，配合 payload 机制），hydration 阶段首次渲染直接命中相同状态避免二次请求。

**知识点解析**：

- 两者 API 对照：

```ts
// Vuex4：一个模块的完整样板
const useStore = () => useVuexStore(key)   // 还要 provide key 保类型
const count = computed(() => store.state.mod.count)
const double = computed(() => store.getters['mod/double'])
store.commit('mod/increment')              // 同步走 mutation
store.dispatch('mod/fetchList')            // 异步走 action

// Pinia：直给
export const useCartStore = defineStore('cart', {
  state: () => ({ items: [] as Item[] }),
  getters: { total: (s) => s.items.length },     // 直接就是 state 参数，无命名空间前缀
  actions: {
    async fetch() {                              // 异步同步一个 actions，无 mutation 层
      this.items = await api.list()              // 直接改 state（devtools 依然能记录）
    },
  },
})
const cart = useCartStore()
const { items } = storeToRefs(cart)              // 解构要 storeToRefs（同 Q9 原理：reactive 解构丢响应）
```

- Pinia 组合式（setup）写法，模块化的现代形态：

```ts
export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const isLogin = computed(() => !!token.value)
  async function login(name: string, pwd: string) {
    token.value = await api.login(name, pwd)
  }
  return { token, isLogin, login }
})
// store 之间组合：在 action/setup 里直接调用别的 store
export const useOrderStore = defineStore('order', () => {
  const user = useUserStore()           // 跨 store 组合，Pinia 官方推荐方式
  const canPay = computed(() => user.isLogin && balance.value > 0)
})
```

- SSR 手动接线的完整序列化/激活流程：

```ts
// entry-server.ts
const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
// 渲染前：服务端请求并填充 store
const user = useUserStore(pinia)
await user.fetchProfile()                 // 必须传 pinia 实例（服务端无组件上下文）
const html = await renderToString(app)
// 渲染后：整体序列化
const serialized = JSON.stringify(pinia.state.value)   // 所有已创建 store 的 state 快照
ctx.state = { __INITIAL_STATE__: serialized }

// entry-client.ts
const pinia = createPinia()
if (window.__INITIAL_STATE__) {
  pinia.state.value = JSON.parse(window.__INITIAL_STATE__)  // 激活：一次性灌回
}
const app = createApp(App)
app.use(pinia)
app.mount('#app')                        // hydration 使用已就绪的 state，不再二次请求
```

- $patch 两种形态与 $subscribe：

```ts
store.$patch({ count: store.count + 1 })            // 对象形式：一次 commit 多字段
store.$patch((state) => { state.items.push(item) }) // 函数形式：直接操作 draft
store.$subscribe((mutation, state) => {             // 订阅变更（持久化插件原理）
  localStorage.setItem('cart', JSON.stringify(state))
})
```

**加分项（P7 视角）**：

- 为什么 Vuex 需要 mutation 而 Pinia 不需要：Vuex 严格模式靠 `store._committing` 标志（mutation 外改 state 即警告），要求把同步变更收敛到 mutation 才能被 devtools 记录成时间旅行节点；Pinia 的 state 是 reactive，devtools 订阅的是 mutation.type 为 patch/direct 的事件流，靠 proxy + $patch 拦截拿到变更，约束从"API 设计强制"变成了"工具可观测"——架构上是把复杂度从用户侧移到框架侧。
- SSR 序列化的坑：Date/Map/Set/类实例 JSON 序列化会丢类型（日期变字符串），要在 store 里自定义 revive/dead 逻辑或序列化插件做"按类型 reviver"；以及跨请求状态污染——模块级 store 单例在 Node 常驻进程中被多个请求共享，所以 Pinia 要求"每个请求 createPinia + useStore(pinia 实例)"，这是 Nuxt SSR 面试的高频深水区。
- 模块化对照话术：Vuex 的 module + namespaced 是"运行时命名空间"，跨模块要 rootState/dispatch 字符串路径；Pinia 的模块化是"代码组织即模块"，跨 store 是函数调用、类型自动推导、可 tree-shake——再加上 store 惰性创建（首次 useStore 才初始化），天然配合路由分包。
- 生产案例：把 Vuex 迁 Pinia 的量化收益（某后台项目：删掉 30% 样板文件、TS 报错从 200+ 降到 0、HMR 从整树刷新到单 store 热替换）；持久化插件用 $subscribe + $reset 对照实现，注意 $reset 只对 option 式 store 有默认实现。

## Q：Vue Router：history vs hash 模式实现、导航守卫完整链、动态路由？

**核心答案**：hash 模式基于 `location.hash` 与 `hashchange` 事件：井号后路径改变不发请求、不触发整页刷新，路由库监听事件切组件；不需要服务端配合，SEO 弱、URL 带井号。history 模式基于 History API：pushState/replaceState 改 URL 不发请求也不触发 popstate（路由库需要自己拦截导航：Vue Router 用 history.pushState 的返回值/异常探测与自己的 go 包装），浏览器前进后退触发 popstate 让路由库同步；缺点是刷新/直接访问子路径时服务器按路径找不到资源，必须配置"所有路由 fallback 到 index.html"（nginx try_files / SPA fallback）。导航守卫完整链（Vue Router 4）：离开守卫（beforeRouteLeave）→ 全局 beforeEach → 复用组件 beforeRouteUpdate → 路由记录 beforeEnter → 解析异步路由组件 → 进入组件 beforeRouteEnter → 全局 beforeResolve → 导航确认（替换 history state）→ 全局 afterEach → 触发 DOM 更新（组件挂载/更新）→ beforeRouteEnter 里 next 传入的回调以实例为参数执行。动态路由指路径参数（:id）与运行时 addRoute/removeRoute（典型场景：登录后按权限动态挂路由）。

**知识点解析**：

- 两种模式的底层行为对照：

```text
hash 模式：
  URL: https://a.com/#/user/1
  改变: location.hash = '/user/1'   -> 触发 hashchange -> router 匹配
  刷新: 井号后内容不会发给服务器，服务器只看到 /，天然免配置

history 模式：
  URL: https://a.com/user/1
  改变: history.pushState(state, '', '/user/1') -> 不触发任何事件！
         -> router 在调用点主动执行"匹配 -> 守卫 -> 确认 -> 渲染"
  后进后退: popstate 事件 -> router 同步一次导航
  刷新: GET /user/1 到达服务器 -> 必须配置 fallback 到 index.html
```

```nginx
# history 模式的服务端 fallback（nginx）
location / {
  try_files $uri $uri/ /index.html;
}
```

- 导航守卫完整链（Vue Router 4 顺序，可直接背）：

```text
1.  导航被触发（点击 router-link / push / replace / 浏览器前进后退）
2.  失活组件里调用 beforeRouteLeave
3.  调用全局 beforeEach
4.  复用组件里调用 beforeRouteUpdate（:id 变化且组件复用时）
5.  路由配置里调用 beforeEnter
6.  解析异步路由组件（() => import() 在这里才加载，天然代码分割点）
7.  激活组件里调用 beforeRouteEnter（此时实例未创建，拿不到 this）
8.  调用全局 beforeResolve（导航即将确认前的最后一道闸）
9.  导航被确认
10. 调用全局 afterEach（含 failure）
11. 触发 DOM 更新（组件挂载 / 复用组件 patch）
12. 执行 beforeRouteEnter 中 next(vm => ...) 传入的回调（此时实例已创建）
```

- Vue Router 4 守卫新写法（next 可选，返回值即决议）：

```ts
router.beforeEach(async (to, from) => {
  const user = useUserStore()
  if (to.meta.requiresAuth && !user.isLogin) {
    // 返回路由位置 = next({ ... })；返回 false = 中止；不返回 = 放行
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 抛出 Error 会进入 onError 且导航失败
})

// 组件内守卫（组合式）
onBeforeRouteUpdate((to, from) => { /* /user/1 -> /user/2 组件复用时 */ })
onBeforeRouteLeave((to, from) => { /* 离开确认 */ })
```

- 动态路由与权限系统：

```ts
// 路径参数：:id + 可选 + 重复 + 自定义正则
{ path: '/user/:id(\\d+)', component: User }        // 只匹配数字
{ path: '/docs/:pathMatch(.*)*', component: NotFound }  // 捕获全部（404 兜底）

// 运行时按权限挂载
const routes = await api.getRoutes(user.role)      // 后端下发路由表
routes.forEach((r) => router.addRoute(r))          // addRoute(name?, route)
// 注意：挂载完成后要 router.replace(router.currentRoute.value.fullPath) 重试一次导航
//      否则首次登录后的首次跳转会命中"未匹配"状态
router.hasRoute('Admin') && router.removeRoute('Admin')

// 传参写法对照
router.push({ name: 'user', params: { id: '1' }, query: { tab: 'info' }, hash: '#anchor' })
```

- 路由匹配打分机制：Vue Router 4 用"路径段计分"（静态段 > 动态段 > 可选段 > 重复段 > 通配），同前缀多条规则按分高者赢，不再依赖注册顺序——解释了为什么 404 通配必须放最后其实"不必须，但习惯上放最后更可读"。

**加分项（P7 视角）**：

- pushState 的一个实现细节：Vue Router 4 在 push 时会尝试 `history.pushState` 并检查返回值/异常，用于探测"同源同文档"限制与 Safari 旧版的 100 次 pushState 限额；`router.go` 与浏览器后退共用的 popstate 消费链路里有"非受控导航"状态（POP 类型导航带 noListeners 标记）——能讲到这个深度说明真读过源码。
- 导航守卫链的工程化：完整链中最贵的一环往往是第 6 步异步组件（网络加载 chunk），生产上要配合 webpackPrefetch/路由预取；权限系统里 beforeEnter 与全局 beforeEach 的职责切分（前者记录级、后者会话级），避免双重鉴权请求。
- 动态路由的内存泄漏点：addRoute 挂的组件若用了 keep-alive include 白名单，登出时要同步 removeRoute + 清 keep-alive 缓存，否则"权限变更后仍能进入已卸载路由的缓存组件"是真实安全事故。
- Nuxt 下的路由层：文件路由 + 中间件（defineNuxtRouteMiddleware）本质是把 beforeEach 的事件化写法编译进路由插件，可以对比手写 Vue Router 讲"约定式路由如何降低 90% 样板"。

## Q：SSR/Nuxt：同构原理、hydration、Nuxt3 的 nitro 与混合渲染？

**核心答案**：同构指"一套组件代码跑在两端"：服务端用 createSSRApp + @vue/server-renderer 的 renderToString，把组件渲染成 HTML 字符串直出（首屏快、SEO 可抓取）；客户端加载同一套组件 bundle，进入 hydration（水合/激活）阶段——不是重新渲染，而是把 DOM 事件与响应式状态"附着"到服务端产出的静态 DOM 上。hydration 的过程：客户端 render 生成 vnode 树，与服务器 HTML 按"骨架对骨架"比对（只验结构与关键属性，不重设 DOM 文本），对得上就复用节点并挂上事件、绑定 vnode.el；对不上（服务端/客户端渲染结果不一致）在开发模式报 hydration mismatch 警告，生产可能引发整棵子树重挂。Nuxt3 的 nitro 是它替代 webpack-dev-server/Vite server 的"服务引擎"：基于 h3（轻量 HTTP 框架）+ unjs 生态，统一处理 SSR/静态/API 路由，产物打包成跨运行时目标（Node/Serverless/Edge/Worker），运行时按路由规则做混合渲染（hybrid rendering）——路由级配置 ssr: true/false/`experimental`、prerender 预渲染、swr/isr 缓存策略、cdn 缓存头。

**知识点解析**：

- 同构的最小手工实现（vite-plugin-ssr / Vite SSR 思路）：

```ts
// entry-server.ts
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
export async function render(url: string, manifest: any) {
  const app = createSSRApp(App)
  app.use(router)
  router.push(url)
  await router.isReady()                       // 等路由解析完成再渲染
  const ctx = {}
  const html = await renderToString(app, ctx)  // ctx.modules 记录用到的组件 -> 用来算 CSS/JS 依赖
  return { html, state: JSON.stringify(pinia.state.value), ctx }
}

// entry-client.ts
import { createSSRApp } from 'vue'             // 注意：客户端 hydrate 也必须 createSSRApp
const app = createSSRApp(App)
// mount 时传 true：走 hydrate 而不是 mount（服务端有 HTML 可以"认领"）
app.mount('#app', true)
```

- hydration 的判定细节（renderer.ts hydrate 分支）：

```ts
// 简化：hydrate 时的元素处理
const hydrateElement = (el, vnode) => {
  // 1. 期望节点类型匹配（Element 对 Element，Text 对 Text），不匹配 -> mismatch
  if (vnode.type === 'input') { /* input 的 value/checked 特殊：以客户端为准且告警 */ }
  // 2. props 只做"有副作用属性"的校验与绑定（class、事件、受控属性），不重设文本内容
  for (const key in vnode.props) { if (isOn(key)) patchEvent(el, key, vnode.props[key]) }
  // 3. vnode.el = el：把已有 DOM 节点挂到 vnode 上，后续 patch 就能正常 diff
  vnode.el = el
}
// 文本子节点只做开发期断言（textContent 比对），生产直接信任服务端结果 —— 水合成本远低于渲染
```

- 常见 mismatch 场景与解法：

```ts
// 1. 随机值/时间：服务端与客户端必然不同
const id = Math.random()          // 错：两边不一致
const id = useId()                // 对：Vue3.5 内置，同构稳定 id

// 2. 条件依赖客户端环境
const width = window.innerWidth   // 错：服务端无 window 报错
const width = ref(0)
onMounted(() => (width.value = window.innerWidth))   // 对：副作用挪到 mounted

// 3. 初始化数据不同（服务端有 payload，客户端没带就重新请求了）
//    解法：pinia.state.value = window.__INITIAL_STATE__（见 Q13）
```

- Nuxt3 架构分层：vite/webpack 双构建 + vue-router 文件路由 + nitro 服务端。nitro 的路由规则（混合渲染核心）：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },                    // 构建期预渲染成静态 HTML
    '/blog/**': { isr: 3600 },                   // ISR：增量静态再生成（复用 1 小时）
    '/admin/**': { ssr: false },                 // 纯 SPA：跳过 SSR，输出壳
    '/api/**': { cors: true, headers: { 'x-cache': 'miss' } },  // API 路由跨域
    '/legacy/**': { redirect: { to: '/new/**', statusCode: 302 } },
  },
  nitro: {
    preset: 'vercel-edge',                       // 部署目标：node / serverless / edge worker
    prerender: { crawlLinks: true, routes: ['/'] },  // 预渲染爬虫：从 / 出发抓内链
  },
})
```

- Nuxt3 的数据层同构：useFetch/useAsyncData 在服务端执行并把结果写进 payload（内联到 HTML 的 script），客户端 hydration 阶段直接从 payload 读、不重复请求；key 相同的多次调用自动去重。

**加分项（P7 视角）**：

- hydration 的性能真相：虽然"水合比渲染便宜"，但客户端仍要执行全部组件的 render + 建 vnode 树做比对，大页面的 hydration 依然是 TTI 瓶颈——业界的解法方向： islands 架构（Astro 的孤岛注水：整页静态化、只对有交互的组件注水）、resumability（Qwik：序列化执行状态、恢复时不再重放渲染）、Vue 生态对应的是 Nuxt 的 islands 组件（NuxtIsland，服务端渲染局部孤岛）与 ServerOnly 组件——能把"注水成本公式（组件数 x 渲染函数成本）"和三种范式串讲是顶级加分。
- renderToString 的 ctx.modules 收集机制：渲染过程追踪每个组件的模块 id，产出 manifest 后精确算出"本页需要的 chunk 列表"，实现按路由的最小资源注入（Nuxt/vue SSR 的 link 注入都靠它）；同时 ctx teleports 把 Teleport 内容（如 modal）回传到 HTML 尾部。
- nitro 的设计取舍：h3 事件抽象（event handler 纯函数）让同一份代码跑在 node/edge/serverless（跨 runtime 的 API 层抹平），代价是深度绑定 unjs 生态——对照 Next.js 自研 server 讲"引擎收敛 vs 生态复用"两种路线。
- SSR 不是银弹：直出拉长了服务端 TTFB（Node 同步渲染阻塞）、内存态（每个请求独立 pinia/router 实例）使并发容量下降；对内容站（SEO）与首屏敏感的 C 端才值得，后台管理系统 ssr: false 反而是正确答案——选型判断比实现更能体现 P7。

## Q：微前端中 Vue 应用如何接入？Wujie/qiankun 的样式与状态隔离、通信方案？

**核心答案**：Vue 应用接入微前端有三种主流姿势：1）qiankun（基于 single-spa + HTML Entry）：子应用导出 bootstrap/mount/unmount 生命周期，主应用 loadMicroApp/start 注册，通过 start 时的 sandbox 配置（jsSandbox/strictStyleIsolation/experimentalStyleIsolation）做隔离；2）Wujie（无界）：用 iframe（JS 隔离）+ WebComponent shadowroot（DOM/CSS 隔离）的组合，Vue 子应用通过 loadApp({ url, el }) 接入，天然更强隔离；3）Module Federation/Web Components 自组织。样式隔离：qiankun 的 strictStyleIsolation 用 shadow DOM（会穿透弹层与全局样式失联，几乎不可用），experimentalStyleIsolation 是编译期给选择器加 `div[data-qiankun="appName"]` 前缀（运行时改写 style 标签内容），Wujie 直接把子应用 DOM 放进 shadowroot、样式天然不泄漏但"子应用样式想反向影响弹层"需要 reroute 处理。状态与通信：跨应用优先"自定义事件 + 毫无依赖的 mitt/Customevent 总线"（事件解耦），复杂场景用共同依赖的全局 store（对 Vue 技术栈：共享一个 Pinia 实例模块，通过主应用 Provide 或者 Module Federation 共享依赖单例）。

**知识点解析**：

- qiankun 接入生命周期（子应用 main.ts）：

```ts
// 子应用：独立可运行，同时能被主应用编排
let instance: App | null = null
export async function bootstrap() { console.log('init') }
export async function mount(props: { container: HTMLElement; token?: string }) {
  instance = createApp(App)
  instance.use(pinia).use(router)
  instance.mount(props.container.querySelector('#app')!)   // 挂载点来自主应用容器
}
export async function unmount() {
  instance?.unmount()      // 必须卸载干净：销毁 effect、清定时器、断开 socket
  instance = null
}
// 独立运行兜底
if (!window.__POWERED_BY_QIANKUN__) { createApp(App).use(router).mount('#app') }
```

- Wujie 接入（主应用）：

```ts
import { startApp } from 'wujie'
startApp({
  name: 'vue-sub',
  url: 'http://localhost:7200/',
  el: '#sub-container',
  props: { token: 'xxx' },                   // 注入给子应用的通信数据
  sync: true,                                 // 路由同步：子路由变化同步到主 URL
  alive: true,                                // 保活模式：预加载+缓存实例，切换零成本
  degrade: false,                             // 低版本浏览器降级为 iframe 渲染
  plugins: [{ cssExcludes: ['reset.css'] }],  // 排除子应用的污染性全局样式
})
```

- 通信三件套（推荐顺序）：

```ts
// 1. 事件总线（跨技术栈通用，Wujie 官方 emitter）
import { bus } from 'wujie'
bus.$emit('token-refresh', 'newToken')
bus.$on('token-refresh', (t: string) => { user.token = t })

// 2. props 下发 + 子应用 emit 上报（qiankun props / wujie props）
// 主应用 -> 子应用：单向数据注入；子 -> 主：props 里传回调

// 3. 共享状态模块（同技术栈才可用）：主应用 createPinia 后把实例传给子应用
// 子应用 mount(props) 里 app.use(props.pinia)  —— 两个应用共享同一个响应式树
```

- 样式隔离方案对比：

```text
qiankun strictStyleIsolation: shadow DOM     隔离最强，但 element-plus 等组件库的
                                             弹层挂 body 会逃出 shadowRoot 失样式，基本弃用
qiankun experimentalStyleIsolation: 前缀改写  给子应用所有样式规则加 [data-qiankun=app] 前缀，
                                             运行时正则改写 style 内容，成本高且动态样式需重写
Wujie: shadowroot + 子应用 DOM 全量内嵌      CSS 天然隔离；全局样式失效问题用 props 传递
                                             CSS 变量（--primary）穿透 shadow 边界解决
```

- JS 隔离的底层差异：qiankun 用 Proxy 伪造 window（快照沙箱 legacy / 代理沙箱），子应用对 window 的写被劫持到 fakeWindow；Wujie 用 iframe 的真实 window（js 天然隔离 + 降级成本低），DOM 通过 proxy 把 document 操作代理回 shadowroot 内。

**加分项（P7 视角）**：

- 技术选型话术：qiankun 的优势是生态与 multiple framework 共存的历史积累，代价是 JS 沙箱的 Proxy 劫持对奇异代码（with、eval、Object.defineProperty window）兼容性差；Wujie 用"iframe 跑 JS + shadowroot 跑 DOM"的物理隔离换"兼容性极强"，代价是 iframe 通信的一层 postMessage/代理成本与预载内存占用——没有银弹，只有"隔离强度 vs 兼容成本"的权衡曲线。
- Vue 特有的坑：多个子应用共享 Vue 依赖时必须保证"单实例 Vue 模块"（Module Federation shared 单例或 CDN externals），否则两个 Vue runtime 各自的 effect 队列/全局队列互不相通，跨应用组件通信看似正常、响应式却完全断链；Pinia 共享同理，必须共享 @vue/reactivity 的同一个副本。
- 卸载完整性与内存：unmount 阶段必须处理 Vue 之外的东西——router 的 afterEach 全局守卫要还原、keep-alive 缓存要清、ResizeObserver/setInterval 全清；qiankun 的 JS 沙箱能还原 window，还原不了"挂到 document 上的监听"，这是子应用"第二次进入变慢/重复请求"的根因。
- 生产案例：主应用（Vue3）+ 三个子应用（Vue2/Vue3/React 老系统）用 qiankun 平稳迁移，六个月后把高交互子应用切到 Wujie 保活模式把切换耗时从 900ms 降到 60ms——微前端的落地主线是"渐进迁移而不是永久架构"，能讲出退出路径（最终合并回单体模块联邦）是高阶认知。

## Q：Vue3 scheduler 调度器的实现（队列/优先级/flushJobs）？

**核心答案**：scheduler 是 Vue3 响应式与渲染之间的一层"任务编排系统"，核心数据结构是三个：主队列 queue（组件 update 与 flush:'pre' 的 watch/watchEffect job）、post 队列 pendingPostFlushCbs（mounted/updated 等钩子、flush:'post' 的 job）、以及一个 currentFlushPromise 串联微任务时序。优先级不是多队列抢占式，而是"单队列 + id 排序"：组件 update job 的 id 是实例 uid，父组件先创建 uid 更小天然排前，保证父组件先更新（父更新中可能卸载子组件，跳过子更新防止空指针）；用户 watch job 的 id 默认视为 Infinity（排在所有组件更新之后执行，所以回调里能拿到新 DOM 的世界），3.4 起用位标志 flags（PRE/POST/ALLOW_RECURSE/QUEUED）替代布尔字段，3.5 为 KeepAlive 引入 pausedJobs 暂停机制。flushJobs 执行流程：复位标记 → queue.sort 按比较器排序 → 逐个执行（执行中新产生的 job 因为 flushIndex 游标推进也能在本轮被消化）→ 清空 queue → 执行 post 队列（Set 去重 + 排序）→ 若执行期间又入队则递归再刷一轮 → resolve currentFlushPromise，nextTick 链随之兑现。

**知识点解析**：

- job 的数据形状（3.4+）：

```ts
export interface SchedulerJob extends Function {
  id?: number                     // 排序键：组件 update = 实例 uid；未设置按 Infinity
  flags: number                   // 位标志：QUEUED / PRE / POST / ALLOW_RECURSE / PAUSED / DISPOSED
  i?: ComponentInternalInstance   // owner 实例（调用钩子时恢复上下文）
}
export const enum SchedulerJobFlags {
  QUEUED = 1 << 0,        // 已在队列中（去重标记，替代旧版 queue.includes 的 O(n) 查找）
  PRE = 1 << 1,           // 组件更新前语义
  POST = 1 << 2,           // 组件更新后语义（进 post 队列）
  ALLOW_RECURSE = 1 << 3,  // 允许 job 执行中再次触发自己（如 watch 回调里改依赖源，防死循环前提下放行一轮）
}
```

- 入队与查找插入位置（简化自 scheduler.ts，逐行解释）：

```ts
function queueJob(job: SchedulerJob) {
  // 1. 已入队（QUEUED）且不允许递归 -> 直接返回，实现"同帧多次触发只跑一次"
  if (!(job.flags & SchedulerJobFlags.QUEUED) || (job.flags & SchedulerJobFlags.ALLOW_RECURSE)) {
    job.flags |= SchedulerJobFlags.QUEUED
    const pos = findInsertionIndex(job)   // 2. 二分找插入位，保持队列按 id 升序（替代旧版整体 sort）
    queue.splice(pos, 0, job)            // 3. 有序插入：稳定地排在同 id 任务之后
    if (pos === 0) queueFlush()           // 4. 插到队首说明比现有全部任务优先级高 -> 触发一次 flush 调度
  }
}

function findInsertionIndex(job: SchedulerJob) {
  let lo = 0, hi = queue.length - 1
  const jobId = getId(job)                // 无 id 视为 Infinity（用户 watch），永远排最后
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const queueJobId = getId(queue[mid])
    if (queueJobId <= jobId) lo = mid + 1 // 等于也往后插：同 id 保持先进先执行
    else hi = mid - 1
  }
  return lo
}
```

- flushJobs 主体（逐行解释）：

```ts
function flushJobs(seen?: CountMap) {
  isFlushPending = false
  isFlushing = true                       // 1. 进入 flushing：此后入队 allowRecurse 任务可判定为"递归合法"
  queue.sort(comparator)                  // 2. 最终排序兜底：父组件(uid 小)先更新，PRE 语义优先
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && !(job.flags & SchedulerJobFlags.DISPOSED)) {
        callWithErrorHandling(job, job.i, ErrorCodes.SCHEDULER)  // 3. 执行 job；job 内部改动数据可能
      }                                                               //    递归入队新任务（游标后追加，本轮消化）
    }
  } finally {
    flushIndex = 0
    queue.length = 0                      // 4. 清空主队列
    flushPostFlushCbs(seen)               // 5. 执行 post 队列：mounted/updated/activated/post-watchEffect
    isFlushing = false
    currentFlushPromise = null            // 6. resolve：nextTick 的 then 链兑现，用户回调看到的是更新后 DOM
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen)                     // 7. flush 期间又产生了新任务 -> 递归一轮（仍是同一个微任务）
    }
  }
}

const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b)
  if (diff === 0) {                        // 同 id 时 PRE 任务排前面，保证"更新前语义"严格先于组件重渲染
    if (a.flags & SchedulerJobFlags.PRE && !(b.flags & SchedulerJobFlags.PRE)) return -1
    if (b.flags & SchedulerJobFlags.PRE && !(a.flags & SchedulerJobFlags.PRE)) return 1
  }
  return diff
}
```

- post 队列的去重与排序：

```ts
function queuePostFlushCb(cb: SchedulerJobs) {
  if (isArray(cb)) for (const c of cb) pendingPostFlushCbs.push(c)   // 批量入 post 队列
  else pendingPostFlushCbs.push(cb)
  if (!isFlushing && !isFlushPending) queueFlush()
}
function flushPostFlushCbs() {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)]   // 1. Set 去重：同一 mounted 钩子只跑一次
    pendingPostFlushCbs.length = 0
    deduped.sort(comparator)                            // 2. 同样按 id 排序：子组件先入队先 mounted
    for (const job of deduped) job()                    // 3. 同步顺序执行
  }
}
```

- 优先级的本质总结：Vue scheduler 没有时间片、没有抢占，"优先级"表达为三种静态语义——PRE（组件更新前）、组件更新（按 uid 树序）、POST（更新后）；再叠加 id 大小决定先后。这与 React 的 lane/优先级中断模型是两种设计哲学。

**加分项（P7 视角）**：

- 演进史可以讲成一条优化线：3.0 的 `queue.includes` O(n) 去重 → 3.3 允许递归任务的 indexOf 游标查找 → 3.4 的 QUEUED 位标志 O(1) 去重 + 有序插入替代整体 sort（从 O(n log n) 降到 O(n) 均摊）→ 3.5 的 pausedJobs（KeepAlive 切走时暂停后台任务，激活时恢复，解决"隐藏页签还在刷接口"的真实痛点）——能按版本讲清每次改动动机，说明持续在追源码。
- sync 侦听为什么危险：watch(flush:'sync') 绕过 scheduler 直接在 trigger 里同步执行，一帧内改十次跑十次回调且在数据层"撕开"批量语义；同理 `effect.run()` 与"job 化执行"的差异是"数据变化同步、视图更新异步"哲学的根基。
- scheduler 与生命周期的闭环：post 队列既是 mounted/updated 的载体也是 nextTick 的对齐点，`onMounted` 与 `flush:'post'` 的 watchEffect 在同队列按入队序执行——由此可推导"子组件 mounted 先于父组件"与"post watch 在 mounted 之后还是之前"这类时序题，而不是死记结论。
- Vue 3.4 的 computed 与 scheduler 的协同：computed 的 scheduler 只做"标脏 + 入队"，真正重算推迟到 job 执行时按需进行，配合 `MaybeDirty` 级联检查避免了"未使用的 computed 重算风暴"——把 Q4 的懒执行与本题的队列机制串起来，是响应式到视图的完整闭环叙述。

## Q：手写 mini-vue：响应式系统 + 编译器 + 渲染器的最小实现思路？

**核心答案**：mini-vue 的目标是把 Vue 拆成三个可独立运行又互相咬合的模块：响应式系统（reactive/ref/effect/track/trigger + scheduler）提供"数据变了通知谁"；渲染器（h 生成 vnode、render 做 patch：挂载/更新/卸载三分支 + 简化 diff）提供"怎么把 vnode 变成宿主视图"；编译器（parse/transform/generate + new Function）提供"模板字符串怎么变成 render 函数"。三者串联的最小闭环：编译器把模板编译出 render → 组件 setup 执行并把 setup 的返回值与 render 组合 → 用 ReactiveEffect 包一层"调用 render 生成 vnode → 调 renderer.patch 更新视图" → effect 首次执行即挂载，后续依赖变化经 trigger → scheduler（微任务批量）→ 重跑 render → diff → 更新。实现顺序建议自底向上：先 reactive/ref/effect（纯逻辑，单测友好），再渲染器 mount/patch，再接 effect 与 scheduler，最后写编译器做字符串到 render 的通路。

**知识点解析**：

- 模块一：响应式系统（reactive + ref + effect 最小集）：

```ts
// ---------- 依赖存储 ----------
let activeEffect: Function | null = null
const targetMap = new WeakMap<object, Map<string | symbol, Set<Function>>>()

function track(target: object, key: string | symbol) {
  if (!activeEffect) return                        // 1. 非追踪期（无运行中 effect）直接返回
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)                            // 2. dep 记住 effect
  ;(activeEffect as any).deps.push(dep)            // 3. effect 反向记住 dep：重跑前清理旧依赖（分支切换）
}

function trigger(target: object, key: string | symbol) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  for (const effect of [...dep]) {                 // 4. 拷贝再遍历：回调里增删 dep 不影响本轮
    effect === activeEffect || (effect as any).options?.scheduler
      ? (effect as any).options?.scheduler?.(effect)   // 5. 有调度器交给调度器（渲染批量、computed 标脏）
      : effect()                                       // 6. 否则同步执行
  }
}

// ---------- effect ----------
function effect(fn: Function, options: any = {}) {
  const effectFn: any = () => {
    cleanup(effectFn)                              // 1. 清旧依赖：v-if 切分支后旧依赖不再触发
    activeEffect = effectFn
    const res = fn()                               // 2. 执行副作用并重新收集依赖
    activeEffect = null
    return res
  }
  effectFn.deps = []
  effectFn.options = options
  if (!options.lazy) effectFn()                    // 3. 非 lazy（非 computed）立即执行一次
  return effectFn
}
function cleanup(fn: any) {
  fn.deps.forEach((dep: Set<any>) => dep.delete(fn))
  fn.deps = []
}

// ---------- reactive / ref ----------
function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      track(target, key)
      return typeof res === 'object' && res !== null ? reactive(res) : res   // 惰性深层代理
    },
    set(target, key, value, receiver) {
      const old = Reflect.get(target, key, receiver)
      const res = Reflect.set(target, key, value, receiver)
      if (!Object.is(old, value)) trigger(target, key)                        // 变了才通知
      return res
    },
    deleteProperty(target, key) {
      const had = key in target
      const res = Reflect.deleteProperty(target, key)
      if (had) trigger(target, key)                                           // 删除也通知（Vue2 做不到的点）
      return res
    },
  })
}

function ref<V>(value: V) {
  const wrapper = { value }                         // 包一层对象：基本类型没有 getter 可劫持
  Object.defineProperty(wrapper, '__isRef', { value: true })   // 标记：渲染层解包用
  return reactive(wrapper) as Ref<V>               // 复用 reactive：get value/set value 自动 track/trigger
}
```

- 模块二：渲染器（h + patch 的挂载/更新/卸载三分支 + 简化 diff）：

```ts
// ---------- vnode ----------
function h(type: any, props: any = {}, children: any = null) {
  return { type, props, children,
    el: null, key: props?.key ?? null }
}
function shouldSetAsProps(el: HTMLElement, key: string) {
  // 特殊处理：form 的 value 属性要设置成 property 而非 attribute（用户输入后 attribute 不同步）
  return key === 'value' && 'value' in el ? true : key in el
}

// ---------- render：核心 patch(n1 旧, n2 新, container) ----------
function patch(n1: any, n2: any, container: HTMLElement) {
  if (n1 && n1.type === n2.type && n1.key === n2.key) {
    patchElement(n1, n2, container)                 // 1. 类型+key 相同 -> 更新分支
  } else {
    if (n1) unmount(n1)                             // 2. 有旧但不同 -> 卸载旧的
    mount(n2, container)                            // 3. 挂载新的
  }
}

function mount(vnode: any, container: HTMLElement, anchor?: Node) {
  if (typeof vnode.type === 'string') {
    vnode.el = document.createElement(vnode.type)   // 4. 普通元素：属性/事件/子节点三步挂载
    for (const key in vnode.props) {
      if (key.startsWith('on')) {
        vnode.el.addEventListener(key.slice(2).toLowerCase(), vnode.props[key])
      } else if (key === 'key') continue
      else if (shouldSetAsProps(vnode.el, key)) {
        (vnode.el as any)[key] = vnode.props[key] === '' ? true : vnode.props[key]
      } else vnode.el.setAttribute(key, vnode.props[key])
    }
    mountChildren(vnode.children, vnode.el)         // 文本 or 数组递归 mount
    anchor ? container.insertBefore(vnode.el, anchor) : container.appendChild(vnode.el)
  } else if (typeof vnode.type === 'object') {
    mountComponent(vnode, container, anchor)       // 5. 组件：见模块三的"咬合点"
  }
}

function patchElement(n1: any, n2: any) {
  const el = (n2.el = n1.el)
  patchProps(n1.props, n2.props, el)                // 6. props 逐项 diff（旧有新无 -> 置空/移除）
  patchChildren(n1, n2, el)                         // 7. 子节点 diff：文本比内容、数组走简化 keyed diff
}

// 简化版 keyed diff（思路与 Vue3 同构：头尾同步 + 未知段重挂/移动）
function patchChildren(n1: any, n2: any, el: HTMLElement) {
  if (typeof n2.children === 'string') {
    if (Array.isArray(n1.children)) n1.children.forEach(unmount)
    el.textContent = n2.children
  } else if (Array.isArray(n2.children)) {
    if (Array.isArray(n1.children)) diffChildren(n1.children, n2.children, el)
    else { el.textContent = ''; n2.children.forEach((c: any) => mount(c, el)) }
  } else {
    if (Array.isArray(n1.children)) n1.children.forEach(unmount)
    el.textContent = ''
  }
}
function unmount(vnode: any) {
  if (typeof vnode.type === 'object') unmountComponent(vnode)   // 组件卸载要调 onUnmounted 钩子
  else vnode.el.parentNode?.removeChild(vnode.el)
}
```

- 模块三：编译器 + 组件系统咬合点（render 函数由 effect 驱动）：

```ts
// ---------- 组件挂载：渲染器与响应式的咬合点 ----------
function mountComponent(vnode: any, container: HTMLElement, anchor?: Node) {
  const instance = { vnode, state: null, subTree: null, isMounted: false }
  ;(vnode as any).component = instance

  const renderComponent = () => {
    if (!instance.isMounted) {
      // 首挂：setup 执行（返回函数当 render、返回对象当状态暴露给模板）
      const setupResult = vnode.type.setup?.(vnode.props) ?? null
      instance.state = typeof setupResult === 'function' ? null : setupResult
      const renderFn = typeof setupResult === 'function' ? setupResult : vnode.type.render
      const subTree = (instance.subTree = normalizeRenderResult(renderFn, instance))
      // 用 effect 包渲染：render 里读 state -> track；state 变 -> trigger -> job 入队
      instance.update = effect(() => {
        if (instance.isMounted) {
          const prev = instance.subTree
          const next = normalizeRenderResult(renderFn, instance)
          instance.subTree = next
          patch(prev, next, container)              // 更新路径：新 vnode diff 旧 vnode
        } else {
          mount(subTree, container, anchor)         // 挂载路径
          instance.isMounted = true
        }
      }, { scheduler: queueJob })                   // 关键：渲染用 scheduler，实现一帧一次的批量更新
    }
  }
  renderComponent()
}

// ---------- mini scheduler：与 Q5/17 同款微任务批量 ----------
const queue: any[] = []
let flushing = false
function queueJob(job: any) {
  if (!queue.includes(job)) queue.push(job)
  if (!flushing) { flushing = true; Promise.resolve().then(flushJobs) }
}
function flushJobs() {
  const jobs = queue.splice(0)                     // 取走全部再执行：执行中入队进下一轮
  jobs.forEach((j) => j())
  flushing = false
  if (queue.length) flushJobs()                    // flush 期间又入队 -> 再刷一轮
}

// ---------- 编译器：模板 -> render（与 Q11 mini-compiler 共用 parse/transform/generate）----------
function compileToFunction(template: string) {
  const code = generate(transform(parse(template)))
  // eslint-disable-next-line no-new-func
  return new Function('_ctx', `with(this){ return ${code} }`) as any
}
```

- 三模块咬合后的总时序：

```text
createApp(App).mount('#app')
  -> mountComponent -> setup() 执行 -> effect(render 包装, scheduler: queueJob)
  -> effect 立即执行：render() 生成 vnode -> patch -> mount 真实 DOM（读 state 完成依赖收集）
用户改 state.count
  -> set trap -> trigger -> 渲染 effect 的 scheduler -> queueJob 入队去重
  -> 微任务 flushJobs -> effect 重跑 -> 新 vnode -> patchElement -> DOM 更新
```

**加分项（P7 视角）**：

- 实现里每一个"看似多余"的细节都是真 Vue 的坑位：cleanup 解决分支切换后的依赖残留（else 分支的旧依赖会在条件变化后幽灵触发）、trigger 里拷贝 Set 防止边遍历边增删、form 的 value 走 property 而非 attribute（用户改过 input 后 attribute 失真）、`with(this)` 让模板编译无需 prefixIdentifiers 也能取到 setup 状态——讲 mini-vue 时能点出"这行代码对应 Vue 的哪个 bug"是区分度最大的表达方式。
- 从 mini 到真的差距清单（诚实面对简化项）：没有 patchFlag/block tree（可后续加静态提升）、diff 只做了头尾同步没有 LIS、ref 用 reactive 复用而真 Vue 是独立的 RefImpl + dep 链表、没有 keep-alive/teleport/suspense/transition 的 DOM 操作合成（真正的 patch 里 insert/remove 会被这些组件改写锚点）、没有组件 props 响应化与生命周期完整时序——面试主动列"我简化了什么"远比回避更可信。
- 推荐的实现顺序与验证方式：TDD 式逐模块验收——响应式部分用 `expect(calls).toBe(1)` 断言"同帧多次 set 只触发一次"、渲染器部分跑 todo-list demo 验证 key 复用、最后接编译器跑通 `createApp({ template: ... })`；这套"里程碑验收"本身可以作为向面试官展示的工程素养。
- 延伸方向：在 mini-vue 上加 shallowRef/自定义 ref 调度（Q12 性能手段的可视化）、加 createRenderer 抽象 nodeOps（Q10，让同一套 patch 跑在 canvas 上）、把 diff 升级成 LIS 版（Q3 源码已给全）——一个仓库讲透整个 Vue 面试体系，这是简历项目从"用了 Vue"升级到"懂了 Vue"的杠杆点。











