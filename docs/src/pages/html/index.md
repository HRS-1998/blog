# html

# 浏览器从请求到渲染的完整过程及事件钩子

本文详细描述了浏览器从发起请求到获取 HTML 并最终完成页面渲染的整个过程，涵盖网络请求、HTML 解析、DOM 构建、CSS 应用、JavaScript 执行以及页面绘制等阶段，并列出每个阶段可能涉及的事件钩子。

---

## 1. 发起网络请求

浏览器通过用户输入 URL 或点击链接触发页面加载。

### 步骤

- **URL 解析**：解析协议（如 HTTP/HTTPS）、域名、路径等。
- **DNS 解析**：将域名解析为 IP 地址。
  - **事件钩子**：无直接钩子，可通过开发者工具（如 Network 面板）监控。
- **建立 TCP 连接**：完成三次握手。
- **发送 HTTP 请求**：发送 GET 请求，包含请求头（如 User-Agent、Accept）。

### 事件钩子

- `fetch` 或 `XMLHttpRequest` 的 `onreadystatechange`：监听请求状态变化。

---

## 2. 服务器响应

服务器返回 HTML 文档，浏览器开始处理响应。

### 步骤

- **接收响应头**：读取状态码（如 200 OK）、内容类型（如 `text/html`）。
- **下载 HTML 文件**：接收 HTML 内容。

### 事件钩子

- `window.performance` API（如 `performance.getEntriesByType("navigation")`）：记录请求时间。
- `DOMContentLoaded`：依赖此阶段完成，后续触发。

---

## 3. HTML 解析与 DOM 构建

浏览器解析 HTML 并构建 DOM 树。

### 步骤

- **字节流解码**：根据编码（如 UTF-8）将字节流解码为字符。
- **标记化（Tokenization）**：将 HTML 拆分为标记（如 `<html>`、`<body>`）。
- **DOM 树构建**：生成 DOM 树。
- **预加载扫描**：扫描 `<link>`、`<script>` 等外部资源并提前请求。

### 事件钩子

- `MutationObserver`：监听 DOM 树动态变化（适用于后续修改）。
- `<script>` 或 `<link>` 的 `onload`：监听外部资源加载完成。

---

## 4. CSS 解析与 CSSOM 构建

浏览器处理 CSS 文件并构建 CSSOM。

### 步骤

- **下载 CSS 文件**：通过 `<link>` 或内联 `<style>` 获取。
- **CSS 解析**：生成 CSSOM（CSS Object Model）。
- **阻塞渲染**：CSSOM 未完成前页面不渲染。

### 事件钩子

- `<link>` 的 `onload`：监听 CSS 文件加载完成。

---

## 5. JavaScript 执行

浏览器处理 `<script>` 标签中的 JavaScript。

### 步骤

- **下载外部脚本**：通过 `<script src>` 下载。
- **脚本执行**：执行 JavaScript，可能修改 DOM 或 CSSOM。
- **阻塞解析**：默认阻塞 HTML 解析，可通过 `async` 或 `defer` 避免。

### 事件钩子

- `<script>` 的 `onload` 或 `onerror`：监听脚本加载状态。
- `async`：加载后立即执行，无特定事件。
- `defer`：在 `DOMContentLoaded` 前执行。

---

## 6. 构建渲染树（Render Tree）

DOM 树和 CSSOM 合并生成渲染树。

### 步骤

- **计算样式**：将 CSS 规则应用于 DOM 节点。
- **过滤不可见元素**：如 `display: none` 的节点不进入渲染树。

### 事件钩子

- `requestAnimationFrame`：监控渲染相关时机。

---

## 7. 布局（Layout / Reflow）

浏览器计算元素位置和大小。

### 步骤

- **布局计算**：生成节点的几何信息（如宽度、高度、坐标）。
- **回流（Reflow）**：DOM 或 CSSOM 变化时重新布局。

### 事件钩子

- `resize`：窗口大小变化时触发。

---

## 8. 绘制（Painting）

浏览器将渲染树转换为屏幕像素。

### 步骤

- **分层**：将内容分为多个图层（如背景、前景）。
- **光栅化**：将图层转换为位图。
- **合成（Compositing）**：合并图层为最终画面。

### 事件钩子

- `requestAnimationFrame`：在绘制前执行回调。
- `performance` API：记录绘制时间。

---

## 9. 页面加载完成的事件

浏览器在关键阶段触发以下事件。

### 事件

- **`DOMContentLoaded`**：
  - **触发时机**：HTML 解析完成，DOM 树构建完成。
  - **监听方式**：`document.addEventListener("DOMContentLoaded", callback)`。
- **`load`**：
  - **触发时机**：所有资源（图片、CSS、脚本等）加载完成。
  - **监听方式**：`window.addEventListener("load", callback)`。
- **`beforeunload`**：
  - **触发时机**：页面即将卸载。
  - **监听方式**：`window.addEventListener("beforeunload", callback)`。

---

## 10. 交互与动态更新

页面渲染完成后，用户交互或脚本触发更新。

### 事件

- **用户事件**：如 `click`、`scroll`、`keydown`。
  - **监听方式**：`element.addEventListener("click", callback)`。
- **动画与重绘**：
  - `requestAnimationFrame`：用于平滑动画。
  - `IntersectionObserver`：监听元素进入视口。
- **DOM/CSSOM 修改**：
  - `MutationObserver`：监听 DOM 结构或属性变化。

---

## 总结

浏览器从请求到渲染的主要阶段及事件钩子如下：

| 阶段       | 主要任务               | 事件钩子                           |
| ---------- | ---------------------- | ---------------------------------- |
| 网络请求   | 发送请求、接收响应     | `fetch`、`performance` API         |
| HTML 解析  | 构建 DOM 树            | `DOMContentLoaded`                 |
| CSS 加载   | 构建 CSSOM             | `<link>.onload`                    |
| JS 执行    | 执行脚本               | `<script>.onload`、`defer`/`async` |
| 渲染与绘制 | 生成渲染树、绘制页面   | `requestAnimationFrame`            |
| 加载完成   | 所有资源加载完成       | `load`                             |
| 交互       | 处理用户操作和动态更新 | `click`、`scroll` 等               |

此过程高度并发（如 CSS 和 JS 加载与 HTML 解析并行），开发者可通过上述钩子介入每个阶段。
