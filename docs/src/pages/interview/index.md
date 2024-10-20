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
  let args= Array.prototype.slice.call(arguements,                                                                                                                                                         1)
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
  typeof res === "object" || res instanceof Function ? res : obj;
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
      fn.apply(this, args);
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
1.compose 函数：compose(f, g, h) => f(g(h()))
2.currying 函数：currying(f) => f(a)(b)(c) => f(a, b, c)
3.偏函数：偏函数(f, a, b, c) => f(a, b, c)
4.纯函数：纯函数(f) => f(a) === f(b) === f(c)

```

==**07**事件发布订阅==

==**08**迭代器生成器==

==**09**浅拷贝和深拷贝==

==**10**node 事件循环，浏览器事件循环，浏览器渲染原理==

==**11**promise 实现==

==扁平树==

//1.当请求失败后，1 秒后再次请求，重试函数最多重试 5 次 ，成功则结束，5 此都失败则抛出错误

//1.限制次数函数，并发控制函数

。/
