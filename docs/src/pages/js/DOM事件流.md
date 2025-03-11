# DOM 事件流

## 事件流

DOM 是一个树结构，常见事件有加载事件、鼠标事件、自定义事件等

事件流三个阶段

1. 事件捕获阶段：从 window 节点开始，沿着 DOM 树向下传播，直到目标节点。
2. 事件目标阶段：当事件到达目标节点时，它会触发。
3. 事件冒泡阶段：从目标节点开始，沿着 DOM 树向上传播，直到 window 节点。

![DOM 事件流示意图](./image/DOM事件流.png)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Event Bubbling</title>
  </head>
  <body>
    <button id="clickMe">Click Me</button>
    <script>
      window.onload = function () {
        var button = document.getElementById("clickMe");

        button.onclick = function () {
          console.log("1.Button");
        };
        document.body.onclick = function () {
          console.log("2.body");
        };
        document.onclick = function () {
          console.log("3.document");
        };
        window.onclick = function () {
          console.log("4.window");
        };
      };
    </script>
  </body>
</html>
```

输出结果： 事件在目标阶段触发

```
1.Button
2.body
3.document
4.window
```

## 事件模型

事件模型可以分为三种：

> 一、 原始事件模型 DOM0
>
> 特性：
>
> a. 绑定速度快，DOM0 级事件具有很好的跨浏览器优势，会以最快的速度绑定，但由于绑定速度太快，可能页面未完全加载出来，以至于事件无法正常运行
>
> b. 只支持冒泡，不支持捕获
>
> c. 同一个类型的事件只能绑定一次，后面会覆盖前面的

```html
<input type="button" onclick="fun()" />
```

```js
var btn = document.getElementById(".btn");
btn.onclick = fun;
```

删除 DOM0 级别事件

```js
btn.onclick = null;
```

> 二、 标准事件模型 DOM1
>
>     事件捕获阶段：事件从document一直向下传播到目标元素, 依次检查经过的节点是否绑定了事件监听函数，如果有则执行
>
>     事件处理阶段：事件到达目标元素, 触发目标元素的监听函数
>
>     事件冒泡阶段：事件从目标元素冒泡到document, 依次检查经过的节点是否绑定了事监听函数，如果有则执行
>
>     特性：
>     a. 可以在一个DOM上绑定多个事件监听函数,各自不会冲突
>
>     b. 执行时机： 当第三个参数（useCapture）为true时，事件在捕获阶段执行，为false时，事件在冒泡阶段执行

绑定监听函数以及移除的方式

eventType 指定事件类型

handler 事件处理函数

useCapture 是一个 boolean 用于指定是否在捕获阶段进行处理，一般为 false,就是在捕获阶段执行事件监听函数

```js
addEventListener(eventType, handler, useCapture);
removeEventListener(eventType, handler, useCapture);
```

执行时机，其中使用了 eventPhase，返回一个代表当前执行阶段的整数值。1 为捕获阶段、2 为事件对象触发阶段、3 为冒泡阶段

```html
<div id="div">
  <p id="p">
    <span id="span">Click Me!</span>
  </p>
</div>
```

```js
var div = document.getElementById("div");
var p = document.getElementById("p");

function onClickFn(event) {
  var tagName = event.currentTarget.tagName;
  var phase = event.eventPhase;
  console.log(tagName, phase);
}

div.addEventListener("click", onClickFn, false);
p.addEventListener("click", onClickFn, false);
//       P 3
//      DIV 3

div.addEventListener("click", onClickFn, true);
p.addEventListener("click", onClickFn, true);

DIV 1
P 1
```

> 三、IE 事件模型
>
> 事件处理阶段：事件到达目标元素, 触发目标元素的监听函数。
>
> 事件冒泡阶段：事件从目标元素冒泡到 document, 依次检查经过的节点是否绑定了事件监听函数，如果有则执行

事件绑定及移除方式

```js
var btn = document.getElementById('.btn');
btn.attachEvent(‘onclick’, showMessage);
btn.detachEvent(‘onclick’, showMessage);
```

## 事件委托

将目标节点的事件绑定到其父节点上，冒泡时触发父节点的事件处理函数，可以减少事件处理函数的数量，提高性能。

vue 中的事件委托：

.stopn、.prevent、.self、.capture、.once、.passive

```vue
<!-- 单击事件将停止传递  event.stopPropagation() -->
<a @click.stop="doThis"></a>

<!-- 提交事件将不再重新加载页面   event.preventDefault()-->
<form @submit.prevent="onSubmit"></form>

<!-- 修饰语可以使用链式书写 -->
<a @click.stop.prevent="doThat"></a>

<!-- 也可以只有修饰符 -->
<form @submit.prevent></form>

<!-- 仅当 event.target 是元素本身时才会触发事件处理器 -->
<!-- 例如：事件处理器不来自子元素 -->
<div @click.self="doThat">...</div>
```

.capture、.once 和 .passive 修饰符与原生 addEventListener 事件相对应

```vue
<!-- 添加事件监听器时，使用 `capture` 捕获模式 ,捕获阶段触发 相当于useCapture=true -->
<!-- 例如：指向内部元素的事件，在被内部元素处理前，先被外部处理 -->
<div @click.capture="doThis">...</div>

<!-- 点击事件最多被触发一次 -->
<a @click.once="doThis"></a>

<!-- 滚动事件的默认行为 (scrolling) 将立即发生而非等待 `onScroll` 完成 立即触发默认滚动事件，防止被preventDefault()阻止,常用移动端优化 -->
<!-- 以防其中包含 `event.preventDefault()` -->
<div @scroll.passive="onScroll">...</div>
```
