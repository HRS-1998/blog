# 写 Vue3 核心响应式系统 (Mini-Vue)

本文档包含一个完整且可运行的迷你版 Vue 3 响应式系统。代码涵盖了 `reactive`、`ref`、`effect` 以及核心的异步调度器（`Scheduler`），完美模拟了 Vue 3 的批量更新机制。

## 一、 核心源码实现

```javascript
// mini-vue

let targetMap = new WeakMap();
let activeEffect = null;
// 依赖收集
function track(target, key) {
  if (!activeEffect) return;
  let targetDep = targetMap.get(target);
  if (!targetDep) {
    targetDep = new Map();
    targetMap.set(target, targetDep);
  }
  let deps = targetDep.get(key);
  if (!deps) {
    deps = new Set();
    targetDep.set(key, deps);
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}
// 依赖触发
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (!deps) return;
  if (deps.size) {
    const effectsToRun = new Set(deps);
    effectsToRun.forEach((effect) => {
      if (effect.scheduler) {
        effect.scheduler(effect);
      } else {
        effect();
      }
    });
  }
}
// 清空函数
function clearUp(effect) {
  const deps = effect.deps;
  if (deps.length) {
    deps.forEach((dep) => {
      dep.delete(effect); // 将 effect 从它曾经收集过的所有 dep (Set) 中移除
    });
  }
  deps.length = 0; // 清空 deps 数组，避免内存泄漏
}
// 副作用
function effect(fn, options = {}) {
  const _effect = function () {
    // 清空依赖
    clearUp(_effect);
    activeEffect = _effect;
    fn();
    activeEffect = null;
  };
  _effect.deps = [];
  _effect.scheduler = options.scheduler;
  _effect();
  return _effect;
}

function reactive(target) {
  if (typeof target !== 'object' || target === null) {
    return target;
  }
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      if (typeof res === 'object' && res !== null) return reactive(res);
      return res;
    },
    set(target, key, value, receiver) {
      const oldVal = Reflect.get(target, key, receiver);
      const res = Reflect.set(target, key, value, receiver);
      if (oldVal !== value) {
        trigger(target, key);
      }
      return res;
    },
  });
}

function ref(value) {
  const refObj = {
    get value() {
      track(refObj, 'value');
      return value;
    },
    set value(newVal) {
      if (value !== newVal) {
        value = newVal;
        trigger(refObj, 'value');
      }
    },
  };

  return refObj;
}

const queue = [];
let isFlushing = false;

function flushFn(job) {
  if (!queue.includes(job)) queue.push(job);
  if (isFlushing) return;
  isFlushing = true;
  Promise.resolve().then(() => {
    const jobs = queue.slice();
    // 先清空队列并复位，再执行 jobs
    // 执行期间新触发的事件会进入下一轮微任务，避免任务丢失或重复执行
    queue.length = 0;
    isFlushing = false;
    jobs.forEach((job) => {
      job();
    });
  });
}

// ==================== 测试用例 ====================

// --- 测试1：基础响应式 + 首次执行 ---
console.log('--- 测试1：基础响应式 ---');
const state = reactive({ count: 0 });
effect(() => {
  console.log('count:', state.count); // 期望：立即打印 count: 0
});
state.count = 1; // 期望：打印 count: 1
state.count = 1; // 期望：无打印（同值不触发）

// --- 测试2：嵌套对象 ---
console.log('--- 测试2：嵌套对象 ---');
const state2 = reactive({ user: { name: '张三' } });
effect(() => {
  console.log('name:', state2.user.name); // 期望：立即打印 name: 张三
});
state2.user.name = '李四'; // 期望：打印 name: 李四

// --- 测试3：ref ---
console.log('--- 测试3：ref ---');
const num = ref(0);
effect(() => {
  console.log('num:', num.value); // 期望：立即打印 num: 0
});
num.value = 10; // 期望：打印 num: 10
num.value = 10; // 期望：无打印（同值不触发）

// --- 测试4：cleanup（依赖变化后旧依赖不触发） ---
console.log('--- 测试4：cleanup ---');
const state3 = reactive({ ok: true, msgA: 'A', msgB: 'B' });
effect(() => {
  console.log('分支:', state3.ok ? state3.msgA : state3.msgB);
  // 期望：立即打印 分支: A
});
state3.msgB = 'B2'; // 期望：无打印（msgB 不在依赖里，cleanup 生效）
state3.ok = false; // 期望：打印 分支: B2（切换分支重新收集；msgB 此时已是 'B2'）
state3.msgB = 'B3'; // 期望：打印 分支: B3（现在 msgB 是依赖了）

// --- 测试5：scheduler 批量调度（微任务去重） ---
console.log('--- 测试5：scheduler ---');
const state4 = reactive({ count: 0 });
let runCount = 0;
effect(
  () => {
    runCount++;
    console.log('scheduler count:', state4.count);
  },
  {
    scheduler: (job) => flushFn(job),
  },
);
// 注意：effect 首次执行是同步的，此时已打印一次 scheduler count: 0
state4.count = 1;
state4.count = 2;
state4.count = 3;
console.log('同步代码执行完毕，runCount =', runCount); // 期望：1（三次修改还没触发执行）
// 微任务中：期望只打印一次 scheduler count: 3（三次修改合并为一次）
Promise.resolve().then(() => {
  console.log('微任务结束，runCount =', runCount); // 期望：2
});
```

---

## 二、 targetMap 的完整数据结构

依赖关系存储是一个三层（+一条反向引用）的结构：

```text
targetMap: WeakMap<Target, Map<Key, Set<EffectFn>>>
              │
              │ key = 原始对象（注意：是 Proxy 的 target 原对象，不是 proxy 本身）
              ▼
         depsMap: Map
              │
              │ key = 对象的属性名（字符串）
              ▼
         dep: Set<EffectFn>
              │
              │ 存放订阅了该属性的所有副作用函数 _effect
              ▼
         _effect: {
           [Function: _effect],   // 可执行的副作用函数
           deps: [Set, Set, ...], // ★ 反向引用：本 effect 被收集进了哪些 dep（Set 的数组）
           scheduler: fn | undefined,
         }
```

### 2.1 以测试用例为例的实际内容

运行完测试 1~5 后，`targetMap` 的实际内容（示意）：

```text
targetMap (WeakMap)
├─ key: 原始对象 { count: 1 }               ← 测试1的 state（proxy 的 target）
│    └─ Map
│         └─ 'count' → Set [ effect_A ]
│                        └─ effect_A.deps = [ 那个 Set 自己 ]
│
├─ key: 原始对象 { user: { name: '李四' } }   ← 测试2的 state2
│    └─ Map
│         └─ 'user' → Set [ effect_B ]        ← track(外层对象, 'user')
│
├─ key: 原始对象 { name: '李四' }             ← 测试2内层的 user 对象
│    └─ Map
│         └─ 'name' → Set [ effect_B ]        ← track(内层原始对象, 'name')
│                                              修改 state2.user.name 走这条链触发
│
├─ key: refObj { value: 10 }                 ← 测试3的 num（ref 直接拿 refObj 当 target）
│    └─ Map
│         └─ 'value' → Set [ effect_C ]
│
└─ key: 原始对象 { ok, msgA, msgB }          ← 测试4的 state3
     └─ Map
          ├─ 'ok'   → Set [ effect_D ]
          └─ 'msgB' → Set [ effect_D ]        ← 'msgA' 在 ok=false 后被 cleanup 移除了
                                                （effect_D.deps = [ok的Set, msgB的Set]）
```

### 2.2 关键设计点

1. **为什么最外层是 WeakMap？**
   key 是原始对象，WeakMap 的 key 是**弱引用**——当 `state` 不再被引用时，它及它的整棵依赖树会被垃圾回收自动清理，不需要手动注销，避免内存泄漏。这就是不能用普通 Map 的原因。
2. **为什么中间层是 Map？**
   属性名做 key，`Map` 支持任意类型 key（包括 Symbol），遍历/增删语义比普通对象更清晰。Vue 源码里这一层就叫 `depsMap`。
3. **为什么最内层是 Set？**
   同一个属性可能被多个 effect 读取，Set 自动去重——同一个 effect 重复读 `state.count` 也只存一份。
4. **双向引用是闭环的关键**
   - 正向：`targetMap → dep Set → effect`，`trigger` 顺着它找到要执行的副作用
   - 反向：`effect.deps 数组 → 各个 Set`，`cleanup/clearUp` 顺着它把自己从所有 Set 里删掉

5. **track 的 target 是原始对象，不是 proxy**
   get/set 拦截器收到的 `target` 参数就是原对象，`targetMap.get(target)` 查询时也传原对象，两边天然一致。
6. **ref 复用同一套结构**
   `refObj` 自己作为 target、`'value'` 作为 key，直接挂进 targetMap——这是设计上很优雅的一点，reactive 和 ref 共用 track/trigger 全套机制，不需要任何特判。

---

## 三、 核心亮点与面试加分项

1. **Scheduler 批量更新**：
   通过 `Promise.resolve().then()` 将 DOM 更新推迟到微任务中。无论同步代码中修改了多少次数据，`queueJob` 都会保证同一个 `effect` 只入队一次，最终在微任务中**只执行一次**。这就是 Vue 3 `$nextTick` 的底层原理。
2. **防死循环机制**：
   在 `trigger` 中使用 `new Set(dep)` 进行浅拷贝后再遍历，防止在 `effect` 执行期间修改了依赖集合导致无限循环。
3. **惰性代理 (Lazy Proxy)**：
   `reactive` 在 `get` 拦截器中判断，只有当读取到的值依然是对象时，才递归调用 `reactive`。这避免了初始化时对深层对象的无意义代理，大幅提升性能。
4. **WeakMap 防内存泄漏**：
   使用 `WeakMap` 存储依赖关系，当响应式对象被销毁时，对应的依赖映射会被垃圾回收器（GC）自动回收。

---

## 四、 架构流程图

```text
[修改数据] state.count = 1
      │
      ▼
[Proxy Set] ──> trigger(target, key)
      │
      ▼
[获取 Dep] ──> 发现 effect 绑定了 scheduler
      │
      ▼
[执行 Scheduler] ──> queueJob(effect)
      │
      ▼
[推入微任务队列] ──> Promise.resolve().then(flushJobs)
      │
      ▼
[微任务执行] ──> 批量执行队列中的 effect ──> 更新 DOM
```

**在写完上述代码后，面试官通常会继续深挖。你可以主动抛出以下亮点：**

1. **为什么用 `WeakMap` **而不是** `Map`？**
   - **答** **：**`WeakMap` **的键必须是对象，且是弱引用。当响应式对象被销毁时，**`WeakMap` **中的依赖映射会自动被垃圾回收（GC），避免了内存泄漏，不需要像 Vue 2 那样手动清理依赖。**
2. **为什么 `ref` **不用** `Proxy` **实现？\*\*\*\*
   - **答** **：**`Proxy` **只能代理对象，无法直接代理基本数据类型。**`ref` **实际上是一个包含** `value` **属性的包装对象，通过** `getter/setter` **拦截** `.value` **的读写来实现响应式。**
3. **Vue 3 相比 Vue 2 的 `Object.defineProperty` **有什么优势？\*\*\*\*
   - **答** **：**`defineProperty` **只能监听已存在的属性，无法监听数组索引变化和对象属性的增删（需要** `$set`）。而 `Proxy` **可以拦截整个对象的操作，天然支持动态新增属性和数组方法，且采用“惰性代理”（访问到嵌套对象时才代理），性能更好。**
