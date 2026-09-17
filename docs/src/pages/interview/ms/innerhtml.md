# innerHTML /textContent/innerText /outerHTML/outerText 区别

表格

| 属性 | 读取内容 | 写入内容 | 会解析 HTML 标签 | 性能 | 注意点 |
| --- | --- | --- | --- | --- | --- |
| `innerHTML` | 读取元素内部**全部 HTML 源码** | 设置内部 HTML | ✅解析标签 | 一般 | 容易 XSS 安全风险 |
| `textContent` | 读取**所有纯文本**（包含隐藏元素） | 设置纯文本 | ❌原样输出标签，不会解析 | 最快 | 不关心 css 显示隐藏 |
| `innerText` | 读取**可见文本**（CSS 生效后的显示内容） | 设置文本 | ❌ | 慢 | 会触发重排 reflow |
| `outerHTML` | 读取**自身 + 内部**完整 HTML | 替换整个元素 | ✅解析标签 | 一般 | 赋值会直接替换 DOM 节点 |
| `outerText` | 读取自身可见文本 | 替换整个元素为文本 | ❌ | 慢 | 不常用 |

## 1. innerHTML

### 读：拿到内部的 HTML

```
<div id="box">hello <b>world</b></div>
```

```
box.innerHTML // "hello <b>world</b>"
```

### 写：会解析 HTML

```
box.innerHTML = '<span style="color:red">红色</span>'
// DOM会渲染出红色span标签
```

⚠️ **安全风险 XSS**

> 
> 如果内容来自用户输入，千万不要用 innerHTML，恶意脚本会执行。

```
// 危险！用户输入 <script>alert(1)</script> 会执行
el.innerHTML = userInput
```

## 2. textContent（**推荐优先用**）

只处理文本，**完全忽略标签**，不会解析 html。

```
box.textContent // "hello world"
```

赋值的时候，所有标签当成普通文本显示：

```
box.textContent = '<b>test</b>'
// 页面原样显示字符串：<b>test</b>，不会加粗
```

特点：

1. 获取**所有节点文本**，包括 `display:none` 隐藏元素的文本
2. **不会触发重排，性能很高**
3. **防止 XSS 注入**，用户输入直接赋值非常安全 ✅

## 3. innerText

获取页面上**肉眼看得见的文本**。

- 会忽略 `display:none` 的元素文本
- 会受 CSS 样式影响，读取时浏览器会计算样式 → **触发重排 reflow，性能差**

示例对比：

```
<div id="box">
  hello
  <span style="display:none">隐藏文字</span>
</div>
```

```
box.textContent  // "hello 隐藏文字"
box.innerText    // "hello"
```

> 
> 日常开发：**优先 textContent，不要 innerText**。

## 4. outerHTML

`innerHTML` 只拿内部；`outerHTML` **包含自己整个元素**。

```
box.outerHTML // `<div id="box">hello <b>world</b></div>`
```

赋值会直接替换整个 DOM 节点本身：

```
box.outerHTML = '<p>新内容</p>' 
// 原来div直接从DOM树消失，替换成p标签
```

## 5. outerText

把整个元素替换成纯文本，几乎不用。

---

# 高频面试题总结

### 1. textContent vs innerText

- `textContent`：拿原始文本，无视 CSS 隐藏，性能好，标准；
- `innerText`：拿渲染后可见文本，计算样式，触发重排，慢。

### 2. textContent vs innerHTML

- 需要渲染 html 片段 → `innerHTML`；**警惕 XSS**
- 只设置 / 获取纯文本，用户输入内容 → **用 textContent，安全**

### 简单记忆口诀

1. 要解析标签 → innerHTML
2. 只要纯文本、防 XSS → textContent
3. 需要自身标签一起 → outerHTML
4. innerText 尽量避免使用

## 实操示例完整 demo

```
<div id="demo">
  <span>你好</span>
  <span style="display:none;">我被隐藏</span>
</div>

<script>
const el = document.querySelector('#demo')
console.log('innerHTML:', el.innerHTML)
console.log('textContent:', el.textContent)
console.log('innerText:', el.innerText)
console.log('outerHTML:', el.outerHTML)
</script>
```

## Vue / React 相关延伸

- Vue `{{ }}` 插值，底层等价于 `textContent`，自动转义，防止 XSS；
- Vue `v‑html` 等价于 `innerHTML`，会解析 html，存在 XSS 风险。