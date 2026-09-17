// xhr

function createXHR(options) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', url, headers, timeout, progress, data } = options;
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    //xhr.setRequestHeader('Content-Type', 'application/json; UTF-8');
    if (timeout && timeout > 0) xhr.timeout = timeout;
    if (progress && typeof progress === 'function') {
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          progress({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
    }
    xhr.ontimeout = function () {
      reject(new Error('Request timed out'));
    };
    xhr.onerror = function () {
      reject(new Error('Request error'));
    };
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`HTTP Error: ${xhr.status}${xhr.statusText}`));
      }
    };
    const isGetMethod = method.toUpperCase() === 'GET';
    xhr.send(isGetMethod ? null : JSON.stringify(data));
  });
}

// axios
const instance = axios.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((config) => {
  return config;
});

instance.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      return response.data;
    }
    return Promise.reject(
      new Error(`HTTP Error: ${response.status}${response.statusText}`),
    );
  },
  (error) => {
    return Promise.reject(error);
  },
);

// minivue   reactive + ref + scheduler  + cleanup
let targetMap = new WeakMap();
let activeEffect = null;
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
  const deps = effect.deps;
  if (deps.length) {
    deps.forEach((dep) => {
      dep.delete(effect); // 将 effect 从它曾经收集过的所有 dep (Set) 中移除
    });
  }
  deps.length = 0; // 清空 deps 数组，避免内存泄漏
}

function effect(fn, options = {}) {
  const _effect = function () {
    cleanup(_effect); // 每次执行前，先清理旧的依赖
    activeEffect = _effect;
    fn();
    activeEffect = null;
  };
  _effect.deps = []; // 记录当前 effect 收集了哪些 dep (Set)
  _effect.scheduler = options.scheduler; // 将调度器挂载到 effect 上
  _effect();
  return _effect;
}
function reactive(target) {
  if (typeof target !== 'object' || target === null) return target;
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      // 依赖收集
      track(target, key);
      if (typeof res === 'object' && res !== null) return reactive(res);
      return res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const res = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        // 触发更新
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
    set value(newValue) {
      if (newValue !== value) {
        value = newValue;
        trigger(refObj, 'value');
      }
    },
  };
  return refObj;
}

let queue = [];
let isFlushing = false;
function flushQueue(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  if (isFlushing) return;
  isFlushing = true;
  Promise.resolve().then(() => {
    const jobs = queue.slice(0);
    // 清空队列，避免在执行过程中新增的任务被重复执行,一定要在执行jobs前面
    queue.length = 0;
    isFlushing = false;
    jobs.forEach((effect) => effect());
  });
}
