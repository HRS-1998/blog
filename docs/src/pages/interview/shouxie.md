01 ==手写 call,apply,bind 方法

```js
//call
Function.prototype.myCall = function (target, ...args) {
  if (typeof this != "function") throw new Error("非函数调用");
  let fn = Symbol("fn");
  target[fn] = this;
  let ans = target[fn](...args);
  delete target[fn];
  return ans;
};

//apply
Function.prototype.myApply = function (target, args) {
  if (typeof this != "function") throw new Error("非函数调用");
  let fn = Symbol("fn");
  target[fn] = this;
  let ans = target[fn](args);
  delete target[fn];
  return ans;
};

//bind
Function.prototype.myBind = function (target) {
  if (typeof this != "function") throw new Error("非函数调用");
};
```

//节流防抖实现

//柯里化 currying 以及 compose 函数

//事件发布订阅

//迭代器生成器

//浅拷贝和深拷贝

//node 事件循环，浏览器事件循环，浏览器渲染原理

//重试函数最多重试 5 次 ，限制次数函数，并发控制函数

//手写 promise
