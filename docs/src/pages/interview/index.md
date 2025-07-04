==**01** 手写 call,apply,bind 方法==

```js
//call
 Function.prototype.mycall=function(target,...args){
  if(typeof this != 'function') throw new Error('非函数调用')
  target = target||window
  let fn = Symbol('fn')
  target[fn] = this
  cosnt result = target[fn](...args)
  delete target[fn]
  return result
 }
//apply
Function.prototype.myApply=function(target,args){
  if(typeof this != 'function') throw new Error('非函数调用')
  if(!Array.isArray(args))  throw new Error('参数非数组')
  target = target||window
  let fn = Symbol('fn')
  target[fn] = this
  cosnt result = target[fn](...args)
  delete target[fn]
  return result
 }
//bind
Function.prototype.myBind=function(fn){
  if(typeof this != 'function') throw new Error('非函数调用')
  let args= Array.prototype.slice.call(arguements,1)
   let self =this
   return function A(...rest){
      //如果new 调用
      if(Object.getPrototypeOf(this) ===  A.prototype ){
            //  return new A()
            let obj={}
            obj._proto__= A.prototype
           let res= A.apply(obj,args.concat(rest))
            return  typeof res === "object" || res instanceof Function ? res : obj;
         }else{
          return  self.apply(fn,args.concat(rest))
         }
}
}

```

==**02**new 函数==

```js
//1.定义一个空对象
//2.对象原型，指向构造函数原型
//3.执行构造函数，
function myNew(fn, ...args) {
  let obj = {};
  obj.__proto__ = fn.prototype;
  let res = fn.apply(obj, args);
  return typeof res === "object" || res instanceof Function ? res : obj;
}
```

==**03**节流防抖实现==

```js
//1.防抖  当事件触发,n秒后执行，若在此期间再次触发则重新计时，等待n秒后再执行
function debounce(fn, delay, immediate) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);

    if (immediate) {
      var callNow = !timer;
      timer = setTimeout(() => {
        timer = null;
      }, delay);
      if (callNow) fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    }
  };
}

//2.节流  规定相同的时间间隔，每n秒执行一次
function throttle(fn, delay) {
  let timer;
  return function (...args) {
    if (!timer) {
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, delay);
    }
  };
}
```

==**04**继承的方式==

```js
//1.原型链继承   //缺点：共享原型，修改父类属性会影响所有子类
function Parent() {
  this.name = "parent";
}
Parent.prototype.say = function () {
  console.log(this.name);
};
function Child() {
  this.age = 18;
}
Child.prototype = new Parent();
let child = new Child();
child.say(); // 输出：parent

//2.构造函数继承  //缺点：无法继承父类原型上的属性和方法
function Parent() {
  this.name = "parent";
}
Parent.prototype.say = function () {
  console.log(this.name);
};
function Child() {
  Parent.call(this);
  this.age = 18;
}
let child = new Child();
child.say(); //child.say() 未定义

//3.组合继承    //缺点：调用了两次父类构造函数
function Parent() {
  this.name = "parent";
}
Parent.prototype.say = function () {
  console.log(this.name);
};
function Child() {
  Parent.call(this);
  this.age = 18;
}
Child.prototype = new Parent();
Child.prototype.constructor = Child;
let child = new Child();
child.say(); // 输出：parent

//4.寄生继承 //缺点：他是对象字面量的继承，使用Object.create()函数。但是多个实例之间继承到的引用类型是相同的地址，会相互影响。
let parent = {
  name: "parent",
};
function create(proto) {
  let obj = Object.create(proto);
  obj.say = function () {
    console.log(this.name);
  };
  return obj;
}
let child = create(parent);

//5.寄生组合继承
function Parent() {
  this.name = "parent";
}
Parent.prototype.say = function () {
  console.log(this.name);
};
function Child() {
  Parent.call(this);
  this.age = 18;
}
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;
let child = new Child();

//6.es6类继承 class
class Parent {
  constructor() {
    this.name = "parent";
  }
  say() {
    console.log(this.name);
  }
}
class Child extends Parent {
  constructor() {
    super();
    this.age = 18;
  }
}
let child = new Child();
child.say(); // 输出：parent
```

==**05** reduce 手写==

```js
Array.prototype.myReduce = function (fn, initData) {
  if (!Array.isArray(this)) return;
  if (this.length == 0 && !initData) return "";
  let arr = this;
  let pre = initData ? initData : arr[0];
  for (let i = initData ? 0 : 1; i < arr.length; i++) {
    console.log(pre);
    pre = fn(pre, arr[i], i, arr);
  }
  return pre;
};
```

==**06** 组合函数 compose ，柯里化 currying ，偏函数 ，纯函数==

```js

```

```js
1.compose 函数：compose(f, g, h) => f(g(h()))
2.currying 函数：currying(f) => f(a)(b)(c) => f(a, b, c)
3.偏函数：偏函数(f, a, b, c) => f(a, b, c)
4.纯函数：纯函数(f) => f(a) === f(b) === f(c)

```

<!-- 将多个函数组合成一个新函数，从右向左执行，前一个函数的输出作为后一个函数的输入。 -->

```js
function compose(...funcs) {
  // 无函数时返回接收任意参数的函数
  if (funcs.length === 0) return (arg) => arg;

  // 单个函数时直接返回
  if (funcs.length === 1) return funcs[0];

  // 核心逻辑：reduceRight 从右向左执行
  return funcs.reduceRight(
    (prevFn, currentFn) =>
      (...args) =>
        currentFn(prevFn(...args))
  );
}
```

<!-- 将多参数函数转换为可链式调用的单参数函数序列。 -->

```js
function currying(fn) {
  // 保存原始函数的参数长度
  const arity = fn.length;

  return function curried(...args) {
    // 参数足够时直接执行原函数
    if (args.length >= arity) return fn(...args);

    // 参数不足时返回新函数继续收集参数
    return (...nextArgs) => curried(...args, ...nextArgs);
  };
}
```

==**07**事件发布订阅==

```js
class EventEmitter {
  constructor() {
    this.events = new Map(); // 存储事件和回调的映射
  }

  // 订阅事件
  on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function");
    }

    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(callback);
    return this; // 支持链式调用
  }

  // 发布事件
  emit(eventName, ...args) {
    const callbacks = this.events.get(eventName);
    if (!callbacks) return false;

    callbacks.forEach((cb) => {
      try {
        cb.apply(this, args);
      } catch (err) {
        console.error(`Event "${eventName}" handler error:`, err);
      }
    });
    return true;
  }

  // 取消订阅
  off(eventName, callback) {
    const callbacks = this.events.get(eventName);
    if (!callbacks) return this;

    if (!callback) {
      callbacks.clear(); // 移除该事件所有回调
    } else {
      callbacks.delete(callback); // 移除指定回调
    }

    // 清理空事件
    if (callbacks.size === 0) {
      this.events.delete(eventName);
    }
    return this;
  }

  // 一次性订阅
  once(eventName, callback) {
    const onceWrapper = (...args) => {
      callback.apply(this, args);
      this.off(eventName, onceWrapper);
    };
    return this.on(eventName, onceWrapper);
  }
}
```

==**08**迭代器生成器==

==**09**浅拷贝和深拷贝==

```js
function deepCopy(obj,map=new weakMap()){
  if(typeof obj != 'Object') || obj == null) return obj;
  // let target = Array.isArray(obj) ? [] : {};
  // if(map.get(obj)) return map.get(obj);
  // map.set(obj,target);
  // for(let key in obj){
  //   target[key] = deepCopy(obj[key],map);
  // }
  // return target;
  let target
  if(Array.isArray(obj)){
    target = [];
    for(let i = 0; i < obj.length; i++){
      target[i] = deepCopy(obj[i],map);
    }
  }
  if(typeof obj == 'object'){
    target = {};
    for(let key in obj){
      if(obj.hasOwnProperty(key)){
        target[key] = deepCopy(obj[key],map);
      }
    }
  }
  return target;
}
```

==**10**node 事件循环，浏览器事件循环，浏览器渲染原理==

==**11**promise 实现==

==扁平树==

//1.当请求失败后，1 秒后再次请求，重试函数最多重试 5 次 ，成功则结束，5 此都失败则抛出错误

//1.限制次数函数，并发控制函数

。/

运算精确性 [https://b23.tv/AeYkW2f](https://b23.tv/AeYkW2f)

0.3 - 0.2

a. 存储 二进制存储不精确

```js
// 无限循环
console.log((0.3).toString(2));
```

b. 运算 可能丢失精度

c. 显示 不精确

标记语言： label

> 标记语言时任何带有标识符前缀的语句，你可以使用嵌套在标记语句中的 break 和 continue 语句来跳转至标记语句。

```js
let str = "";

loop1: for (let i = 0; i < 5; i++) {
  if (i === 1) {
    continue loop1;
  }
  str = str + i;
}

console.log(str);
// Expected output: "0234"
```

with 语句 (弃用)

> with 语句允许你使用对象属性来引用对象成员。

```js
let obj = { a: 1, b: 2 };
with (obj) {
  console.log(a, b);
  //excepted output: 1, 2
  let a = 3;
  let b = 4;
  console.log(a, b);
  // excepted output: 3, 4
}
```

```js
//手写实现promise

class myPromise {
  constructor(executor) {
    this.promiseStatus = "pendding";
    this.promiseResult = undefined;
    this.fufilledCallbacks = [];
    this.rejectedCallbacks = [];
    executor(this.resolve, this.reject);
  }
  resolve(res) {
    if (this.promiseStatus == "pendding") {
      this.promiseStatus = "fulfilled";
      this.promiseResult = res;
      while (this.fufilledCallbacks.length) {
        this.fufilledCallbacks.shift()();
      }
    }
  }
  reject(reason) {
    if (this.promiseStatus == "pendding") {
      this.promiseStatus = "rejected";
      this.promiseResult = reason;
      while (this.rejectedCallbacks.length) {
        this.fufilledCallbacks.shift()();
      }
    }
  }
  static resolve(res) {
    return new myPromise((resolve) => {
      resolve(res);
    });
  }
  static reject(reason) {
    return new myPromise((resolve, reject) => {
      reject(reason);
    });
  }
  /**
             Promise.all
             接受一个可迭代对象的数组，返回一个promise,其结果：
             要么全部成功状态为成功，返回值为每个promise的结果的集合
             要么返回第一个失败的，返回值为失败的原因
             */
  static all(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) return new Error("类型错误");
      if (promises.length == 0) resolve(promises);
      let count = 0,
        ans = [];
      promises.forEach((item, index) => {
        if (item instanceof myPromise) {
          myPromise.resolve(item).then(
            (res) => {
              count++;
              ans[index] = res;
              count === promises.length && resolve(ans);
            },
            (reason) => reject(reason)
          );
        } else {
          count++;
          ans[index] = item;
          count === promises.length && resolve(ans);
        }
      });
    });
  }
  /**
             Promise.allSettled
             接受一个promise的可迭代对象，返回一个promse,其结果：
             返回每一个promise的执行结果和状态组成的集合
             */
  static allSettled(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) return new Error("type错误");
      if (promises.length == 0) return resolve(promises);
      promises.forEach((item, index) => {
        let count = 0,
          ans = [];
        if (item instanceof myPromise) {
          myPromise.resolve(item).then(
            (res) => {
              count++;
              ans[index] = res;
              count === promises.length && resolve(ans);
            },
            (reason) => {
              count++;
              ans[index] = reason;
              count === promises.length && resolve(ans);
            }
          );
        } else {
          count++;
          ans[index] = item;
          count === promises.length && resolve(ans);
        }
      });
    });
  }

  /**
             Promise.race
             接受一个promise的可迭代对象，返回一个promise,其结果：
             返回的第一个已敲定的promise的结果和状态 （可能成功，可能失败）
             */
  static race(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) return new Error("type错误");
      if (promises.length > 0) {
        promises.forEach((item) => {
          if (item instanceof myPromise) {
            myPromise.resolve(item).then(
              (res) => {
                resolve(res);
              },
              (reason) => {
                reject(reason);
              }
            );
          }
        });
      }
    });
  }
  /**
             Promise.any
             接受一个promise的可迭代对象，返回一个promise,其结果
             返回第一个状态为成功的promise的结果
             当所有promise都被拒绝时，返回一个数组，包含每个promise拒绝的原因
             */
  static any(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) return reject("非iterator对象");
      if (promises.length == 0) return reject("全部拒绝");
      if (promises.length > 0) {
        let ans = [],
          count = 0;
        promises.forEach((item, index) => {
          myPromise.resolve(item).then(
            (res) => {
              count++;
              resolve(res);
            },
            (reason) => {
              count++;
              ans[index] = reason;
              count === promises.length && reject(ans);
            }
          );
        });
      }
    });
  }

  then(onFulfilled, onRejected) {
    typeof onFulfilled === "function" ? onFulfilled : (val) => val;
    typeof onRejected === "function"
      ? onRejected
      : (reason) => {
          throw reason;
        };
  }
  finally(cb) {
    return this.then(
      (res) => {
        Promise.resolve(cb).then(() => res);
      },
      (rej) => {
        Promise.resolve(cb).then(() => {
          throw rej;
        });
      }
    );
  }
  catch(cb) {
    this.then(null, cb);
  }
}
const promise = new myPromise((resolve, reject) => {
  resolve(111);
  reject("111");
});

//迭代器和生成器

//DOM

// const promise = new Promise((resolve, reject) => {
//     resolve(111);
//     reject("111");
// });

// promise.then(result => {
//     console.log(result);
// }).catch(reason => {
//     console.log(reason);
// })
```
