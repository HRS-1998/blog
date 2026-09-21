## 页面判断

```
<!--[if IE 6]>
      <style>
        .container {
          color: blue;
        }
      </style>
    <![endif]-->
    <!--[if IE 7]>
      <style>
        .container {
          color: aqua;
        }
      </style>
    <![endif]-->
    <!--[if IE 8]>
      <style>
        .container {
          color: red;
        }
      </style>
    <![endif]-->
```

# 前端开发 IE 兼容性指南

## 概述

开发兼容 IE7 及以上版本的前端项目需要特别注意各种 JavaScript 和 CSS 的兼容性问题。本指南总结了常见问题及其解决方案。

## JavaScript 兼容性问题

### 1. DOM 操作兼容性

|                           问题                            |  影响版本   |                        解决方案                         |
| :-------------------------------------------------------: | :---------: | :-----------------------------------------------------: |
| `querySelector` 和 `querySelectorAll` 在 IE7 及以下不支持 | IE7 及以下  | 使用其他DOM选择方法,优先使用`document.getElementById()` |
|           IE7 不支持 `getElementsByClassName()`           |     IE7     |  使用 jquery的`addClass`,`hasClass`,`removeClass` 方法  |
|             `textContent`在 IE8 及以下不支持              | IE8 及以下  |                  使用 `innerText` 替代                  |
|           `addEventListener`在 IE8 及以下不支持           | IE8 及以下  |                 使用 `attachEvent` 替代                 |
|           事件对象需要通过 `window.event` 获取            |     IE      |            使用 `window.event` 获取事件对象             |
|       `event.target` 在 IE 中是 `event.srcElement`        |     IE      |      兼容处理 `event.target` 和 `event.srcElement`      |
|       `element.contains()` 方法在 IE8 及以下不支持        | IE8 及以下  |              使用其他方法判断元素包含关系               |
|          `getComputedStyle` 在 IE8 及以下不支持           | IE8 及以下  |                使用 `currentStyle` 替代                 |
|            `classList` API 在 IE9 及以下不支持            | IE9 及以下  |             使用 `classNae 属性手动操作类名             |
|            `dataset` API 在 IE10 及以下不支持             | IE10 及以下 |  使用 `getAttribute` 和 `setAttribute` 操作 data 属性   |
|        `element.children` 在 IE8 及以下行为不一致         | IE8 及以下  |                     进行兼容性处理                      |
|          `element.closest()` 在 IE 中完全不支持           |     IE      |              使用其他方法实现向上查找元素               |

### 2. 数组方法兼容性

| 问题                               | 影响版本   | 解决方案                                     |
| ---------------------------------- | ---------- | -------------------------------------------- |
| `Array.prototype.forEach()` 不支持 | IE8 及以下 | 使用 polyfill 或传统 for 循环                |
| `Array.prototype.map()` 不支持     | IE8 及以下 | 使用 polyfill 或传统 for 循环                |
| `Array.prototype.filter()` 不支持  | IE8 及以下 | 使用 polyfill 或传统 for 循环                |
| `Array.prototype.indexOf()` 不支持 | IE8 及以下 | 使用 polyfill 或手动实现                     |
| `Array.isArray()` 不支持           | IE8 及以下 | 使用 `Object.prototype.toString.call()` 检测 |
| `Array.prototype.reduce()` 不支持  | IE8 及以下 | 使用 polyfill 或手动实现                     |
| `Array.prototype.every()` 不支持   | IE8 及以下 | 使用 polyfill 或传统循环                     |
| `Array.prototype.some()` 不支持    | IE8 及以下 | 使用 polyfill 或传统循环                     |

### 3. 对象和 JSON 兼容性

| 问题                                                         | 影响版本   | 解决方案               |
| ------------------------------------------------------------ | ---------- | ---------------------- |
| `Object.create()` 在 IE8 及以下不支持                        | IE8 及以下 | 使用 polyfill 实现     |
| `Object.keys()` 在 IE8 及以下不支持                          | IE8 及以下 | 使用 polyfill 实现     |
| `Object.defineProperty()` 在 IE8 及以下支持有限              | IE8 及以下 | 避免使用或提供替代方案 |
| IE7 及以下原生不支持 JSON 对象 `JSON.stringify`,`JSON.parse` | IE7 及以下 | 引入 json2.js 库       |

### 4. 其他 API 兼容性

| 问题                                           | 影响版本                 | 解决方案                            |
| ---------------------------------------------- | ------------------------ | ----------------------------------- |
| `console`对象在 IE9 以下只有开启调试工具才存在 | IE9 以下                 | 使用前检查`console`是否存在         |
| 不支持`localStorage`和`sessionStorage`         | IE7 不支持，IE8 部分支持 | 使用 `cookie`或其他存储方案作为备选 |
| `canvas`元素在 IE8 及以下不支持                | IE8 及以下               | 使用 Flash 或其他替代方案           |

#### 字符串方法

| 问题                                          | 影响版本   | 解决方案                   |
| --------------------------------------------- | ---------- | -------------------------- |
| `String.prototype.trim()` 在 IE8 及以下不支持 | IE8 及以下 | 使用 polyfill 或自定义实现 |

#### 函数方法

| 问题                                            | 影响版本   | 解决方案           |
| ----------------------------------------------- | ---------- | ------------------ |
| `Function.prototype.bind()` 在 IE8 及以下不支持 | IE8 及以下 | 使用 polyfill 实现 |

#### 日期方法

| 问题                             | 影响版本   | 解决方案                       |
| -------------------------------- | ---------- | ------------------------------ |
| `Date.now()` 在 IE8 及以下不支持 | IE8 及以下 | 使用 new Date().getTime() 替代 |

#### 其他现代 API

| 问题                                        | 影响版本   | 解决方案                            |
| ------------------------------------------- | ---------- | ----------------------------------- |
| `requestAnimationFrame` 在 IE9 及以下不支持 | IE9 及以下 | 使用 setTimeout 替代或引入 polyfill |

## CSS 兼容性问题

### 1. 选择器兼容性

| 问题                                                       | 影响版本   | 解决方案                  |
| ---------------------------------------------------------- | ---------- | ------------------------- |
| IE8 及以下不支持 CSS3 选择器(如:`nth-child`, 属性选择器等) | IE8 及以下 | 使用 class 替代复杂选择器 |

### 2. 盒模型和布局

| 问题                                     | 影响版本   | 解决方案                          |
| ---------------------------------------- | ---------- | --------------------------------- |
| IE 怪异模式下的盒模型计算方式不同        | 多个IE版本 | 使用标准盒模型或条件注释处理      |
| IE7 中浮动元素会产生双倍 `margin` 的 bug | IE7        | 给浮动元素添加 `display:inline`   |
| IE6 中最小高度问题                       | IE6        | 使用 `font-size`:0 或其他技巧解决 |
| 不支持 `box-sizing` 属性                 | IE7 及以下 | 手动计算盒模型尺寸                |

### 3. 定位和显示

| 问题                                  | 影响版本 | 解决方案                               |
| ------------------------------------- | -------- | -------------------------------------- |
| IE6/7 中 `z-index` 的 bug             | IE6/7    | 合理设置父元素的定位和z-index          |
| IE7 中 inline 元素设置宽高无效        | IE7      | 使用 `display:inline-block` 或其他方式 |
| IE6 中 png 透明背景问题               | IE6      | 使用滤镜或替代图片格式                 |
| `position: fixed` 在 IE6 中完全不支持 | IE6      | 使用 JavaScript 模拟或放弃固定定位     |

### 4. 样式和视觉效果

| 问题                               | 影响版本   | 解决方案                              |
| ---------------------------------- | ---------- | ------------------------------------- |
| 不支持 `opacity` 属性              | 多个IE版本 | 使用 `filter: alpha(opacity=xx)` 替代 |
| 不支持 `rgba` 颜色值               | IE8 及以下 | 使用十六进制颜色值或 png 图片         |
| 不支持圆角 `border-radius`         | IE8 及以下 | 使用图片或 HTC 行为实现               |
| 不支持阴影 `box-shadow`            | IE8 及以下 | 使用图片或 HTC 行为实现               |
| 不支持渐变 `gradient`              | IE9 及以下 | 使用滤镜或图片实现                    |
| 不支持 `transform` 和 `transition` | IE9 及以下 | 使用 HTC 行为或 JavaScript 实现       |

### 5. 其他 CSS 特性

| 问题                                       | 影响版本   | 解决方案                               |
| ------------------------------------------ | ---------- | -------------------------------------- |
| 不支持 `inline-block`                      | IE7 及以下 | 使用 `display:inline` 或触发 hasLayout |
| 不支持 `min-width` 和 `max-widt`h          | IE6        | 使用 JavaScript 或其他方式模拟         |
| 不支持 `overflow: hidden` 与定位元素的交互 | IE6        | 调整结构或使用其他方法                 |
| 不支持 `:hover` 伪类在非链接元素上         | IE6        | 使用 JavaScript 实现                   |

## HTML5 兼容性问题

### 1. 新语义元素

| 问题                          | 影响版本   | 解决方案          |
| ----------------------------- | ---------- | ----------------- |
| IE8 及以下不识别 HTML5 新标签 | IE8 及以下 | 使用 html5shiv 库 |

### 2. 表单元素

| 问题                      | 影响版本   | 解决方案                         |
| ------------------------- | ---------- | -------------------------------- |
| 不支持新的 input 类型     | IE9 及以下 | 使用 JavaScript 库实现或降级处理 |
| 不支持表单验证相关属性    | IE9 及以下 | 使用 JavaScript 实现验证逻辑     |
| 不支持 `placeholder` 属性 | IE9 及以下 | 使用 JavaScript 模拟实现         |

## 解决方案推荐

1. 使用 jQuery 等成熟的库来处理 DOM 操作兼容性问题
2. 引入 polyfill 来补充缺失的 API
3. 避免使用 ES5 以上的新特性
4. 使用条件注释加载特定 IE 版本的样式表
