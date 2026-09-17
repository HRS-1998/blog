// ================= 1. 核心依赖存储与全局变量 =================
let activeEffect = null; // 当前正在执行的副作用函数
const targetMap = new WeakMap(); // 依赖关系存储：WeakMap<Target, Map<Key, Set<Effect>>>

// ================= 2. 依赖收集 (Track) =================
function track(target, key) {
  if (!activeEffect) return; // 没有活跃的 effect，无需收集

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set(); // 使用 Set 自动去重
    depsMap.set(key, dep);
  }

  dep.add(activeEffect); // 将当前 effect 添加到依赖集合中
  // 【双向绑定】：将当前的 dep 收集到 activeEffect 的 deps 数组中，方便后续清理
  activeEffect.deps.push(dep);
}

// ================= 3. 触发更新 (Trigger) =================
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const dep = depsMap.get(key);
  if (dep) {
    // 复制一份再遍历，防止在 effect 执行期间修改了 dep 集合导致死循环或报错
    const effectsToRun = new Set(dep);
    effectsToRun.forEach((effect) => {
      // 【核心调度】：如果 effect 绑定了调度器，则执行调度器；否则直接执行
      if (effect.scheduler) {
        effect.scheduler(effect);
      } else {
        effect();
      }
    });
  }
}

// ================= 4. 副作用函数 (Effect) =================
function effect(fn, options = {}) {
  const _effect = function () {
    cleanup(_effect); // 【核心新增】：每次执行前，先清理旧的依赖

    activeEffect = _effect; // 设置为当前活跃 effect
    fn(); // 执行函数，内部读取数据时会触发 Proxy 的 get，从而收集依赖
    activeEffect = null; // 执行完毕，重置
  };

  // 将调度器挂载到 effect 上
  _effect.scheduler = options.scheduler;
  // 【核心新增】：记录当前 effect 收集了哪些 dep (Set)
  _effect.deps = [];

  _effect(); // 立即执行一次，完成首次依赖收集
  return _effect;
}

// 【核心新增】：清理函数，将 effect 从它曾经收集过的所有 dep (Set) 中移除
function cleanup(effect) {
  const { deps } = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0; // 清空数组，准备下一轮收集
  }
}

// ================= 5. 响应式对象 (Reactive) =================
function reactive(target) {
  if (typeof target !== 'object' || target === null) return target;

  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key); // 【核心】读取时收集依赖

      // 惰性递归：只有当读取到的值还是对象时，才将其转为响应式
      if (typeof res === 'object' && res !== null) {
        return reactive(res);
      }
      return res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const res = Reflect.set(target, key, value, receiver);

      // 【核心】仅在值发生变化时触发更新
      if (oldValue !== value) {
        trigger(target, key);
      }
      return res;
    },
  });
}

// ================= 6. 基本类型响应式 (Ref) =================
function ref(value) {
  const refObject = {
    get value() {
      track(refObject, 'value'); // 读取 .value 时收集依赖
      return value;
    },
    set value(newValue) {
      if (newValue !== value) {
        value = newValue;
        trigger(refObject, 'value'); // 修改 .value 时触发更新
      }
    },
  };
  return refObject;
}

// ================= 7. 异步调度器 (Scheduler) =================
// 模拟 Vue 3 的 nextTick 批量更新机制
const queue = []; // 任务队列
let isFlushing = false; // 是否正在刷新队列

function queueJob(job) {
  // 如果队列中还没有这个 job，才将其加入（去重）
  if (!queue.includes(job)) {
    queue.push(job);
  }

  // 如果当前没有正在刷新的微任务，则开启一个微任务
  if (!isFlushing) {
    isFlushing = true;
    Promise.resolve().then(() => {
      // 复制队列并清空，防止在 flush 期间又有新任务加入导致死循环
      const jobsCopy = queue.splice(0);
      jobsCopy.forEach((job) => job());
      isFlushing = false;
    });
  }
}

console.log('🚀 Mini-Vue 完整测试开始：');

// 1. 测试 reactive + scheduler (批量更新)
const state = reactive({ count: 0 });

effect(
  () => {
    console.log(`[DOM 更新] 当前 count 的值是: ${state.count}`);
  },
  {
    scheduler: queueJob, // 绑定异步调度器
  },
);

console.log('准备连续修改数据...');
state.count = 1;
state.count = 2;
state.count = 3;
console.log('同步代码执行完毕，等待微任务执行...\n');

// 2. 测试 ref + cleanup (动态依赖清理)
const show = ref(true);
const msg = ref('Hello');

effect(() => {
  if (show.value) {
    console.log(`[Cleanup 测试] 消息是: ${msg.value}`);
  } else {
    console.log(`[Cleanup 测试] 隐藏状态，不读取 msg`);
  }
});

console.log('修改 msg (show=true)：');
msg.value = 'Vue 3 真棒！';

console.log('将 show 改为 false，模拟 v-if 销毁：');
show.value = false;

console.log('再次修改 msg (show=false)，不应该触发更新：');
msg.value = '你还能看到我吗？';

/** 
🚀 Mini-Vue 完整测试开始：
[DOM 更新] 当前 count 的值是: 0
准备连续修改数据...
同步代码执行完毕，等待微任务执行...

[Cleanup 测试] 消息是: Hello
修改 msg (show=true)：
[Cleanup 测试] 消息是: Vue 3 真棒！
将 show 改为 false，模拟 v-if 销毁：
[Cleanup 测试] 隐藏状态，不读取 msg
再次修改 msg (show=false)，不应该触发更新：

[DOM 更新] 当前 count 的值是: 3
*/
