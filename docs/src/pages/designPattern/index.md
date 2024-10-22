### 常见 14 种前端设计模式

==每天写一个，加油！==

1. 单例模式

```js
//定义 保证一个类只有一个实例，并提供一个全局访问点。例如window
//示例一个简单的单例
function Singleton() {
  this.name = "Singleton";
  this.instance = null;
}
Singleton.prototype.getInstance = function () {
  if (!this.instance) {
    this.instance = new Singleton();
  }
  return this.instance;
};
let s1 = Singleton.getInstance();
let s2 = Singleton.getInstance();
console.log(s1 === s2); // true
```

```js
//一个比较好的单例  遵循的单一职责
var CreateDiv = (function () {
  this.innerHtml = html;
  this.init();
})();
CreateDiv.prototype.init = function () {
  var div = document.createElement("div");
  div.innerHTML = this.innerHtml;
  document.body.appendChild(div);
};
var ProxySingletonCreateDiv = (function (html) {
  var instance;
  return function () {
    if (!instance) {
      instance = new CreateDiv(html);
    }
    return instance;
  };
})();
const div1 = ProxySingletonCreateDiv("div1");
const div2 = ProxySingletonCreateDiv("div2");
console.log(div1 === div2); // true
```

```js
//惰性单例：只有在需要时才创建，它是单例模式的一个重要点
//通用惰性单例
var getSingle = function (fn) {
  var result;
  return function () {
    return result || (result = fn.apply(this, arguments));
  };
};
//使用
var createIframe = getSingle(function () {
  var iframe = document.createElement("iframe");
  iframe.src = url;
  document.body.appendChild(iframe);
  return iframe;
});
//调用
createIframe("http://www.baidu.com");
createIframe("http://www.sina.com.cn"); //只创建了一次iframe
```

})

```


```
