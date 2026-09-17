// mini-vue

let targetMap = new WeakMap();
let activeEffect = null;
// ==================== 【新增】依赖收集开关 ====================
// 为什么需要？
// 数组的 push/pop 等方法内部会「读取 length + 逐个读取元素」（用于合法性检查），
// 这些内部读取不属于用户语义，如果不屏蔽会被 track 收集 length 依赖，
// 造成 push 自己触发自己的死循环。Vue 3 源码用 pauseTracking/resumeTracking。
let shouldTrack = true;
const pauseTracking = () => (shouldTrack = false);
const resumeTracking = () => (shouldTrack = true);

// 依赖收集
function track(target, key) {
  // 【旧写法】if (!activeEffect) return;
  // 【新增】同时检查 shouldTrack：数组方法执行期间暂停收集
  if (!activeEffect || !shouldTrack) return;
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

// ==================== 【优化】effect 栈 ====================
// 为什么要引入 effectStack？
// 旧写法（全局单一 activeEffect，执行完置 null）在「嵌套 effect」时会丢依赖：
//   effect(() => {              ← 外层执行，activeEffect = 外层
//     effect(() => obj.a);      ← 内层执行，activeEffect = 内层，执行完 activeEffect = null
//     obj.b;                    ← ❌ 此时 activeEffect 是 null，track 直接 return，obj.b 收集不到！
//   });
// 之前 computed 里用 backup/restore 临时补救，但那是治标——根源是"外层是谁"这个信息
// 在内层执行完后就丢了。
// 栈的本质：把「正在执行的 effect 链」存起来。内层执行完毕后弹栈，
// activeEffect 恢复为栈顶（即外层 effect），外层后续的读取照常收集。
// Vue 3 源码 effect.ts 用的就是同一方案（effectStack / ActiveSub 链）。
const effectStack = [];

// 副作用
function effect(fn, options = {}) {
  const _effect = function () {
    // 清空依赖
    clearUp(_effect);
    // 【旧写法，已被 effectStack 替代】
    // 旧写法问题：fn() 内部如果又执行了别的 effect（嵌套），
    // 内层结束时会把 activeEffect 置为 null，外层"回不来了"。
    // activeEffect = _effect;
    // fn();
    // activeEffect = null;
    effectStack.push(_effect); // 入栈：记住当前正在执行的 effect
    activeEffect = _effect; // 栈顶即当前活跃 effect
    fn(); // 执行函数，内部读取数据时会触发 Proxy 的 get，从而收集依赖
    effectStack.pop(); // 出栈：当前 effect 执行完毕
    // 恢复 activeEffect 为新的栈顶（可能是外层 effect，栈空则为 null）
    activeEffect = effectStack[effectStack.length - 1] || null;
  };
  _effect.deps = [];
  _effect.scheduler = options.scheduler;
  // 【新增】登记到当前 effectScope（如果有），scope.stop() 时会一并清空
  if (activeEffectScope) {
    activeEffectScope.effects.push(_effect);
  }
  _effect();
  return _effect;
}

// ==================== 【新增】Proxy 缓存 ====================
// 为什么要缓存？
// 旧写法（get 里每次都 return reactive(res)）每次访问嵌套对象都 new 一个新 Proxy：
//   obj.info === obj.info   // false！身份比较失效
// 后果：includes / indexOf / === / Set 去重 全部出问题，且重复创建代理有性能开销。
// 缓存方案：模块级 WeakMap 记录「原始对象 → 代理」，命中直接返回同一个 proxy。
// Vue 3 源码 reactive.ts 里的 reactiveMap 就是这个。
const reactiveMap = new WeakMap(); // 原始对象 → proxy
const rawMap = new WeakMap(); // proxy → 原始对象（toRaw 反向查询用）

// 【新增】toRaw：拿到响应式对象背后的原始对象
// 使用场景：不想触发依赖收集的纯读取、第三方库要求原对象、做相等性比较
function toRaw(observed) {
  return rawMap.get(observed) || observed;
}

// ==================== 【新增】数组方法增强 ====================
// 两个问题的解法（Vue 3 源码 arrayInstrumentations）：
// 1. includes/indexOf 查找身份不一致：数组里存的是原始对象，查找时传的可能是代理
//    （或反之）→ === 比较失败。解法：代理上找不到就去原始数组上再找一次。
// 2. push/pop 等方法内部会读 length → track 收集 length 依赖 →
//    push 又改 length → trigger 自己 → 死循环。解法：执行期间 pauseTracking。
const arrayInstrumentations = {};
['includes', 'indexOf', 'lastIndexOf'].forEach((method) => {
  const origin = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    const res = origin.apply(this, args); // this 是代理数组
    if (res === false || res === -1) {
      // 代理上没找到 → 到原始数组上再找（元素身份可能是原始对象）
      return origin.apply(toRaw(this), args);
    }
    return res;
  };
});
['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
  const origin = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    pauseTracking(); // 屏蔽方法内部的 length/元素读取，防止误收集
    const res = origin.apply(this, args);
    resumeTracking();
    return res;
  };
});

// ==================== 【新增】ITERATE_KEY ====================
// for...in 遍历依赖哪个"属性"？没有具体的 key —— Vue 用一个特殊 Symbol 作为 key，
// ownKeys 拦截器 track 它；新增/删除属性时除了 trigger 具体属性，还要 trigger 它，
// 这样 for...in 的 effect 才会在结构变化时重跑。
const ITERATE_KEY = Symbol('iterate');

function reactive(target) {
  if (typeof target !== 'object' || target === null) {
    return target;
  }
  // 【新增】缓存命中：同一个原始对象永远返回同一个 proxy
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target);
  }
  // 【新增】Map/Set 集合类型走专门的处理器（Proxy 拦不到集合方法调用）
  if (target instanceof Map || target instanceof Set) {
    return reactiveCollection(target);
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 【新增】isReactive 的实现基础：拦截保留字属性的读取，
      // 不走 Reflect.get，也不 track（标记查询不应建立依赖）
      if (key === '__v_isReactive') return true;
      // 【新增】数组方法增强：命中增强表就返回增强版方法
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return arrayInstrumentations[key];
      }
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      if (typeof res === 'object' && res !== null) return reactive(res);
      return res;
    },
    set(target, key, value, receiver) {
      // 【注意】hadKey 必须在 set 之前计算！放在 Reflect.set 之后的话，
      // 新写入的属性已经存在了，会被误判为"旧属性"，ITERATE_KEY 就永远不触发
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const oldVal = Reflect.get(target, key, receiver);
      const res = Reflect.set(target, key, value, receiver);
      // 【新增】新增属性（原来不存在）时，额外触发 ITERATE_KEY，让 for...in 重跑
      if (oldVal !== value) {
        trigger(target, key);
        if (!hadKey) trigger(target, ITERATE_KEY);
      }
      // 【新增】数组新增元素时，额外触发 'length' 的依赖
      // 为什么需要？push(4) 的执行顺序是：先 set 索引 3（这一步就顺带把原始数组
      // 的 length 改成了 4），再 set length。等 length 的 set trap 执行时
      // oldVal 读出来已经是 4，"值没变"的判断会漏掉触发。
      // 所以 Vue 源码对「数组 + 新增整数键」的情况，主动把 length 依赖也触发一遍。
      if (Array.isArray(target) && !hadKey && String(Math.trunc(Number(key))) === key && Number(key) >= 0) {
        trigger(target, 'length');
      }
      return res;
    },
    // 【新增】in 操作符拦截：'key' in obj 时收集依赖
    has(target, key) {
      track(target, key);
      return Reflect.has(target, key);
    },
    // 【新增】delete 拦截：属性存在且删除成功时触发更新
    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const res = Reflect.deleteProperty(target, key);
      if (hadKey && res) {
        trigger(target, key);
        trigger(target, ITERATE_KEY); // 结构变了，for...in 也要重跑
      }
      return res;
    },
    // 【新增】Object.keys / for...in 拦截：收集 ITERATE_KEY 依赖
    ownKeys(target) {
      track(target, ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
  });
  // 【新增】登记双向映射：reactiveMap 正向缓存 + rawMap 反向查询
  reactiveMap.set(target, proxy);
  rawMap.set(proxy, target);
  // 【旧写法】直接 return new Proxy(target, {...})，无缓存
  return proxy;
}

// ==================== 【新增】Map/Set 集合响应式 ====================
// 为什么集合需要单独处理？
// Proxy 只能拦截「属性访问」，而 map.set(k,v) 是一次方法调用（get 拿到 set 函数再执行），
// 内部的哈希读写根本不经过 set trap → 修改不会被捕获。所以 Vue 的方案是
// 重写集合方法：get trap 返回包装过的方法，在包装里手动 track/trigger。
function reactiveCollection(target) {
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      if (key === '__v_isReactive') return true;
      // size 是访问器属性，必须以原始对象为 this 读取（代理上会抛错）
      if (key === 'size') {
        track(target, ITERATE_KEY);
        return Reflect.get(target, key, target);
      }
      const method = target[key];
      if (typeof method !== 'function') return Reflect.get(target, key, receiver);
      const raw = method.bind(target); // 方法必须在原始对象上调用
      const isMutating = ['add', 'set', 'delete', 'clear'].includes(key);
      if (isMutating) {
        return (...args) => {
          const res = raw(...args);
          // clear 动了整个结构，用 ITERATE_KEY；其他用操作的 key
          trigger(target, key === 'clear' ? ITERATE_KEY : args[0]);
          return res;
        };
      }
      if (key === 'get' || key === 'has') {
        return (...args) => {
          track(target, args[0]);
          return raw(...args);
        };
      }
      return raw; // forEach 等其余方法不增强（演示版）
    },
  });
  reactiveMap.set(target, proxy);
  rawMap.set(proxy, target);
  return proxy;
}

function ref(value) {
  const refObj = {
    // 【新增】isRef 的实现基础：ref 对象身上的标记属性
    __v_isRef: true,
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

// ==================== 【新增】isRef ====================
// 为什么不能靠 "有没有 value 属性" 判断？
// 任何普通对象都可能有 value 字段（{ value: 1 } 也是合法对象），
// 所以 Vue 的方案是给 ref 打上不可伪造的标记属性 __v_isRef。
function isRef(value) {
  return !!(value && value.__v_isRef === true);
}

// ==================== 【新增】isReactive / isReadonly ====================
// 为什么不能靠 instanceof Proxy 判断？
// Proxy 没有可查询的构造器（无法 instanceof），只能通过拦截保留字属性来暴露身份：
// reactive 的 get 拦截器里对 '__v_isReactive' 返回 true（见 reactive 内），
// readonly 的 get 拦截器里对 '__v_isReadonly' 返回 true（见 readonly 内）。
function isReactive(value) {
  return !!(value && value.__v_isReactive === true);
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

// ==================== 【新增】nextTick ====================
// 把回调排到微任务队列，确保在当前同步代码 + flushFn 的更新任务都执行完之后再运行
const nextTick = (fn) => Promise.resolve().then(fn);

// ==================== 【新增】computed ====================
// 缓存计算属性：dirty 标记实现惰性求值，依赖变化时只标脏 + 通知，不立即重算
function computed(getter) {
  let value;
  let dirty = true;
  const effectFn = effect(
    () => {
      value = getter();
    },
    {
      // 依赖变化时不重算，只标脏并通知依赖了该 computed 的外层 effect
      scheduler() {
        if (!dirty) {
          dirty = true;
          trigger(refObj, 'value');
        }
      },
    },
  );
  const refObj = {
    get value() {
      if (dirty) {
        // 惰性求值：只有真正读取 .value 且依赖变了（脏），才重新执行 getter
        // 注意：effectFn 的返回值是 undefined，取值要通过闭包变量 value
        dirty = false;
        // 【旧写法，已被 effectStack 替代】
        // 旧写法问题：effectFn（内层 effect）执行完会把 activeEffect 置为 null，
        // 导致后面的 track(refObj, 'value') 收集不到「读取 computed 的外层 effect」，
        // 依赖传递断裂（state → computed → effect 链路断在最后一环）。
        // 所以旧写法只能手动 backup/restore activeEffect 来"打补丁"：
        // const backupEffect = activeEffect;
        // effectFn();
        // activeEffect = backupEffect;
        //
        // 有了 effectStack 之后，effectFn 出栈时会自动把 activeEffect
        // 恢复为外层 effect，这里直接执行即可，不再需要补丁。
        effectFn();
      }
      // 读取 computed 的 effect 也要被收集，形成 computed → 外层 effect 的依赖传递
      track(refObj, 'value');
      return value;
    },
  };
  return refObj;
}

// ==================== 【新增】watch ====================
// 深度遍历：把对象的所有嵌套属性都读一遍，触发 get 从而收集完整依赖
function traverse(obj, seen = new Set()) {
  if (typeof obj !== 'object' || obj === null || seen.has(obj)) return obj;
  seen.add(obj);
  for (const key in obj) {
    traverse(obj[key], seen);
  }
  return obj;
}

function watch(source, cb, options = {}) {
  const { immediate = false } = options;
  // source 支持三种：getter 函数 / ref / reactive 对象
  let getter;
  if (typeof source === 'function') {
    getter = source;
  } else if (isRef(source)) {
    // 【旧写法，已被 isRef 替代】
    // 旧写法靠 'value' in source 粗略猜测，任何带 value 字段的普通对象都会被误判为 ref
    // typeof source === 'object' && source !== null && 'value' in source && !('get' in source)
    getter = () => source.value;
  } else {
    getter = () => traverse(source);
  }

  let oldValue, newValue;
  const effectFn = effect(
    () => {
      newValue = getter();
    },
    {
      // 依赖变化时：先重跑 effectFn 拿到新值，再执行回调
      scheduler() {
        effectFn();
        cb(newValue, oldValue);
        oldValue = newValue;
      },
    },
  );
  oldValue = newValue;

  if (immediate) cb(newValue, undefined);
}

// ==================== 【新增】toRef ====================
// 把 reactive 对象的某个属性转成 ref：新旧值读写都代理回原对象
// 典型场景：解构 reactive 后保持响应式（reactive 解构会丢失响应）
function toRef(obj, key) {
  const refObj = {
    get value() {
      // obj 是 reactive proxy，这里的读取会正常触发依赖收集
      return obj[key];
    },
    set value(newVal) {
      // 写回原对象，会正常触发更新
      obj[key] = newVal;
    },
  };
  return refObj;
}

// ==================== 【新增】toRefs ====================
// 把整个 reactive 对象的所有属性批量转成 ref，返回普通对象包着一堆 ref
// 典型用法：setup() { return { ...toRefs(state) } }，模板里能直接用 name 而不用 state.name
function toRefs(obj) {
  const res = {};
  for (const key in obj) {
    res[key] = toRef(obj, key);
  }
  return res;
}

// ==================== 【新增】readonly ====================
// 只读代理：get 正常收集依赖（能被 effect 追踪），set 直接告警并失败
// 【新增】readonly 自己的缓存：和 reactiveMap 同理，避免重复创建只读代理
const readonlyMap = new WeakMap();

function readonly(target) {
  if (typeof target !== 'object' || target === null) return target;
  if (readonlyMap.has(target)) {
    return readonlyMap.get(target);
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 【新增】isReadonly 的实现基础（同 isReactive 的保留字方案）
      if (key === '__v_isReadonly') return true;
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      // 嵌套对象也要保持只读（惰性递归）
      if (typeof res === 'object' && res !== null) return readonly(res);
      return res;
    },
    set() {
      console.warn(`[mini-vue] readonly 的对象不允许修改`);
      return false; // 拦截写入，Reflect.set 不会被调用
    },
  });
  readonlyMap.set(target, proxy);
  return proxy;
}

// 【新增】isReadonly
function isReadonly(value) {
  return !!(value && value.__v_isReadonly === true);
}

// ==================== 【新增】unref / proxyRefs ====================
// unref：是 ref 就读 .value，不是就原样返回（模板里 {{ xxx }} 的自动解包语义）
function unref(val) {
  return isRef(val) ? val.value : val;
}

// proxyRefs：返回一个"读写时自动解包 ref"的代理
// 这是 Vue 模板里不用写 .value 的原理：setup 返回的对象经过 proxyRefs 包装
function proxyRefs(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      return unref(Reflect.get(target, key, receiver)); // 读时解包
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      // 场景：属性本身是 ref，赋的是裸值 → 写进 ref.value（保持响应式）
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  });
}

// ==================== 【新增】effectScope ====================
// 为什么需要？
// 组件卸载时，它创建的所有 effect 必须全部停止，否则副作用还在跑（内存泄漏 + 幽灵更新）。
// 手动一个个 stop 太繁琐 —— scope 把同一作用域创建的 effect 记录成组，一键停止。
// Vue 3 的组件 setup 就运行在一个 effectScope 里。
let activeEffectScope = null;

function effectScope() {
  const scope = {
    effects: [],
    active: true,
    stop() {
      if (!this.active) return;
      this.effects.forEach((effectFn) => clearUp(effectFn)); // 清空所有依赖，effect 失效
      this.effects.length = 0;
      this.active = false;
    },
    run(fn) {
      const prevScope = activeEffectScope;
      activeEffectScope = this; // 期间创建的 effect 会自动登记到本 scope
      try {
        return fn();
      } finally {
        activeEffectScope = prevScope;
      }
    },
  };
  return scope;
}

// ==================== 【新增】shallowReactive ====================
// 浅层响应式：只有第一层属性是响应式的，嵌套对象保持原样（不递归代理）
// 典型场景：大而深的静态数据结构，只有顶层会变，避免深层代理开销
function shallowReactive(target) {
  if (typeof target !== 'object' || target === null) return target;
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      // 【对比 reactive】这里不再递归：嵌套对象直接返回原对象，不包装
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

// --- 【新增】测试6：computed 缓存 + 惰性求值 ---
console.log('--- 测试6：computed ---');
const state5 = reactive({ count: 1 });
let getterRunCount = 0;
const double = computed(() => {
  getterRunCount++;
  return state5.count * 2;
});
console.log('double.value:', double.value); // 期望：2，getterRunCount = 1
console.log('再次读取:', double.value); // 期望：2，getterRunCount 仍为 1（缓存生效，未重算）
state5.count = 10;
console.log('依赖变更后读取:', double.value); // 期望：20，getterRunCount = 2（脏了才重算）

// --- 【新增】测试7：computed 依赖传递给 effect ---
console.log('--- 测试7：computed → effect ---');
const state6 = reactive({ num: 1 });
const squared = computed(() => state6.num * state6.num);
effect(() => {
  console.log('squared:', squared.value); // 期望：立即打印 squared: 1
});
state6.num = 3; // 期望：打印 squared: 9（computed 的 scheduler 触发了外层 effect）

// --- 【新增】测试8：watch 三种 source ---
console.log('--- 测试8：watch ---');
const state7 = reactive({ a: 1, b: { c: 2 } });

// 8.1 getter 函数
watch(
  () => state7.a,
  (newVal, oldVal) => {
    console.log(`watch a: ${oldVal} -> ${newVal}`);
  },
);
state7.a = 100; // 期望：打印 watch a: 1 -> 100

// 8.2 ref
const wNum = ref(1);
watch(wNum, (newVal, oldVal) => {
  console.log(`watch ref: ${oldVal} -> ${newVal}`);
});
wNum.value = 5; // 期望：打印 watch ref: 1 -> 5

// 8.3 reactive 对象（深度监听）
watch(state7, () => {
  console.log('watch 对象: 深层变化被捕获');
});
state7.b.c = 99; // 期望：打印（traverse 收集了嵌套属性的依赖）

// --- 【新增】测试9：nextTick（更新之后的回调） ---
console.log('--- 测试9：nextTick ---');
const state8 = reactive({ msg: 'hello' });
effect(
  () => {
    console.log('msg:', state8.msg);
  },
  {
    scheduler: (job) => flushFn(job),
  },
);
state8.msg = 'world';
nextTick(() => {
  console.log('nextTick: 在批量更新之后执行'); // 期望：在 msg: world 之后打印
});

// --- 【新增】测试10：toRef / toRefs（解构后保持响应式） ---
console.log('--- 测试10：toRef / toRefs ---');
const state9 = reactive({ name: '张三', age: 20 });

// 10.1 toRef：单属性
const nameRef = toRef(state9, 'name');
effect(() => {
  console.log('nameRef:', nameRef.value); // 期望：立即打印 nameRef: 张三
});
state9.name = '李四'; // 期望：打印 nameRef: 李四（toRef 依赖原对象，原对象变它也变）
nameRef.value = '王五'; // 期望：打印 nameRef: 王五（改 ref 写回原对象，同样触发）

// 10.2 toRefs：批量转
const { name: nRef, age: aRef } = toRefs(state9);
effect(() => {
  console.log('解构后:', nRef.value, aRef.value); // 期望：打印 解构后: 王五 20
});
state9.age = 21; // 期望：打印 解构后: 王五 21（解构没有丢失响应式）

// --- 【新增】测试11：readonly（只读） ---
console.log('--- 测试11：readonly ---');
const original = reactive({ count: 0, nested: { inner: 1 } });
const ro = readonly(original);
effect(() => {
  console.log('readonly count:', ro.count); // 期望：立即打印 readonly count: 0
});
original.count = 5; // 期望：打印 readonly count: 5（readonly 依赖原对象，原对象变它也变）
ro.count = 100; // 期望：警告，且不打印（写入被拦截）
console.log('写入后 ro.count =', ro.count); // 期望：仍是 5

// --- 【新增】测试12：shallowReactive（浅层响应式） ---
console.log('--- 测试12：shallowReactive ---');
const shallowState = shallowReactive({ count: 0, nested: { inner: 1 } });
effect(() => {
  console.log('shallow count:', shallowState.count); // 期望：立即打印 shallow count: 0
});
shallowState.count = 1; // 期望：打印 shallow count: 1（第一层是响应式的）
effect(() => {
  // 嵌套对象没有被代理，读取 inner 不会收集依赖
  console.log('shallow inner:', shallowState.nested.inner);
});
shallowState.nested.inner = 100; // 期望：无打印（深层不响应）

// --- 【新增】测试13：嵌套 effect（effectStack 生效的证明） ---
console.log('--- 测试13：嵌套 effect ---');
const state10 = reactive({ a: 1, b: 2 });
effect(() => {
  // 内层 effect 执行完后，外层继续读 b —— 旧写法下 b 会收集不到依赖
  effect(() => {
    console.log('嵌套内层 a:', state10.a);
  });
  console.log('嵌套外层 b:', state10.b);
  // 期望：立即打印 嵌套内层 a: 1 / 嵌套外层 b: 2
});
state10.b = 20; // 期望：打印 嵌套外层 b: 20（b 的依赖被正确收集了）
// 注意：b 的更新同时会重跑外层 effect，内层 effect 会再次执行并打印 a
state10.a = 10; // 期望：打印 嵌套内层 a: 10

// --- 【新增】测试14：Proxy 缓存（同一原始对象 → 同一代理） ---
console.log('--- 测试14：Proxy 缓存 ---');
const rawObj = { info: { x: 1 } };
const p1 = reactive(rawObj);
const p2 = reactive(rawObj);
console.log('reactive(rawObj) === reactive(rawObj):', p1 === p2); // 期望：true
console.log('p1.info === p1.info:', p1.info === p1.info); // 期望：true（缓存前是 false）
const arr = [1, 2, 3];
const pArr = reactive(arr);
console.log('数组 includes 能正常工作:', pArr.includes(2)); // 期望：true（身份稳定后集合方法可用）

// --- 【新增】测试15：toRaw ---
console.log('--- 测试15：toRaw ---');
console.log('toRaw(p1) === rawObj:', toRaw(p1) === rawObj); // 期望：true
console.log('toRaw(普通对象) 原样返回:', toRaw({ a: 1 })); // 期望：{ a: 1 }
const ro2 = readonly(rawObj);
console.log('toRaw(readonly):', toRaw(ro2) === rawObj); // 期望：false（未登记 readonly 的 rawMap，见注释）

// --- 【新增】测试16：isRef / isReactive / isReadonly ---
console.log('--- 测试16：类型判断 ---');
console.log('isRef(ref(1)):', isRef(ref(1))); // 期望：true
console.log('isRef({ value: 1 }):', isRef({ value: 1 })); // 期望：false（普通对象带 value 也不算）
console.log('isReactive(reactive({})):', isReactive(reactive({}))); // 期望：true
console.log('isReactive(ref(1)):', isReactive(ref(1))); // 期望：false
console.log('isReactive(普通对象):', isReactive({ a: 1 })); // 期望：false
console.log('isReadonly(readonly({})):', isReadonly(readonly({}))); // 期望：true
console.log('isReadonly(reactive({})):', isReadonly(reactive({}))); // 期望：false
// 嵌套对象经由 reactive 代理返回，也带标记
console.log('isReactive(p1.info):', isReactive(p1.info)); // 期望：true

// --- 【新增】测试17：delete 和 in 操作符 ---
console.log('--- 测试17：delete / in ---');
const state11 = reactive({ a: 1, b: 2 });
effect(() => {
  console.log('in 检查:', 'a' in state11); // 期望：立即打印 true
});
delete state11.a; // 期望：打印 in 检查: false（deleteProperty 拦截生效）

effect(() => {
  console.log('读取 a:', state11.a);
});
delete state11.b; // 期望：无打印（b 不是依赖）

// --- 【新增】测试18：for...in 迭代（ownKeys + ITERATE_KEY） ---
console.log('--- 测试18：for...in ---');
const state12 = reactive({ x: 1 });
effect(() => {
  const keys = [];
  for (const k in state12) keys.push(k);
  console.log('keys:', keys.join(',')); // 期望：立即打印 keys: x
});
state12.newKey = 'new'; // 期望：打印 keys: x,newKey（新增属性触发 ITERATE_KEY）
delete state12.newKey; // 期望：打印 keys: x（删除属性也触发 ITERATE_KEY）

// --- 【新增】测试19：数组（方法增强 + 不死循环） ---
console.log('--- 测试19：数组 ---');
const arr2 = reactive([1, 2, 3]);
effect(() => {
  console.log('数组长度:', arr2.length, '包含2:', arr2.includes(2)); // 期望：3 true
});
arr2.push(4); // 期望：打印 数组长度: 4 包含2: true（且不会死循环）
// 身份查找：数组里存原始对象，用代理去 includes
const rawItem = { id: 1 };
const arr3 = reactive([rawItem]);
console.log('代理数组 includes 原始对象:', arr3.includes(rawItem)); // 期望：true（增强版双向查找）

// --- 【新增】测试20：unref / proxyRefs ---
console.log('--- 测试20：unref / proxyRefs ---');
const r1 = ref(10);
console.log('unref(r1):', unref(r1)); // 期望：10
console.log('unref(普通值):', unref(5)); // 期望：5
const setupObj = proxyRefs({ name: ref('张三'), age: 20 });
console.log('读时自动解包:', setupObj.name); // 期望：'张三'（不用 .value）
setupObj.name = '李四'; // 写时自动写进 ref.value
console.log('写后 ref 同步:', r1 && setupObj.name); // 期望：'李四'

// --- 【新增】测试21：effectScope ---
console.log('--- 测试21：effectScope ---');
const scope = effectScope();
const state13 = reactive({ v: 1 });
scope.run(() => {
  effect(() => {
    console.log('scope 内 effect:', state13.v); // 期望：立即打印 1
  });
});
state13.v = 2; // 期望：打印 scope 内 effect: 2
scope.stop(); // 停止作用域内所有 effect
state13.v = 3; // 期望：无打印（effect 已随 scope 停止，不再触发）

// --- 【新增】测试22：Map / Set 集合响应式 ---
console.log('--- 测试22：Map/Set ---');
const m = reactive(new Map());
const s = reactive(new Set());
effect(() => {
  console.log('map size:', m.size, 'map.get(a):', m.get('a')); // 期望：0 undefined
});
m.set('a', 100); // 期望：打印 map size: 1 map.get(a): 100（set 被增强版拦截）
m.set('a', 200); // 期望：打印 map size: 1 map.get(a): 200（get('a') 收集了依赖，覆盖写入同样触发）




