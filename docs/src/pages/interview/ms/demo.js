// reactive + ref + clean up + scheduler

let targetMap = new WeakMap();
let activeEffect = null;

// 收集
function track(target, key) {
  if (!activeEffect) return;
  let targetDeps = targetMap.get(target);
  if (!targetDeps) {
    targetDeps = new Map();
    targetMap.set(target, targetDeps);
  }
  let deps = targetDeps.get(key);
  if (!deps) {
    deps = new Set();
    targetDeps.set(key, deps);
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps); // 将当前的 dep 收集到 activeEffect 的 deps 数组中
}

// 触发
function trigger(target, key) {
  let targetDeps = targetMap.get(target);
  if (!targetDeps) return;
  let deps = targetDeps.get(key);
  if (deps) {
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

function cleanup(effect) {
  const { deps } = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect); // 将 effect 从它曾经收集过的所有 dep (Set) 中移除
    }
  }
  deps.length = 0; // 清空 deps 数组，避免内存泄漏
}

// 副作用
function effect(fn, options = {}) {
  const _effect = function () {
    cleanup(_effect); // 每次执行前，先清理旧的依赖
    activeEffect = _effect;
    fn();
    activeEffect = null;
  };
  _effect.deps = []; // 记录当前 effect 收集了哪些 dep (Set)
  _effect();
  return _effect;
}

function reactive(target) {
  if (typeof target !== 'object' || target === null) return target;
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key);
      if (typeof res === 'object' && res !== null) return reactive(res);
      return res;
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return res;
    },
  });
}

// ref 实现

function ref(value) {
  const _refObj = {
    get value() {
      track(_value, 'value');
      return value;
    },
    set value(newValue) {
      value = newValue;
      if (value !== newValue) {
        trigger(_value, 'value');
      }
    },
  };

  return _refObj;
}

// scheduler 实现
let queue = [];
let isFlushing = false;

function flushQueue() {
  if (isFlushing) return;
  isFlushing = true;
  Promise.resolve().then(() => {
    queue.forEach((effect) => effect());
    queue.length = 0;
    isFlushing = false;
  });
}

function scheduler(effect) {
  if (!queue.includes(effect)) {
    queue.push(effect);
    flushQueue();
  }
}

const obj = reactive({ name: '张三', info: { age: 20 } });
effect(() => {
  console.log('effect1', obj.name);
});
obj.name = '李四';
effect(() => {
  console.log('effect2', obj.info.age);
});
obj.info.age = 30;
