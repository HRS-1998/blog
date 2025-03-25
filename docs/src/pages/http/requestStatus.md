# `XMLHttpRequest` 的 `onreadystatechange` 中 `status` 的取值及其含义

在 `XMLHttpRequest`（简称 XHR）中，`onreadystatechange` 事件监听请求状态变化。通过 `readyState` 判断请求阶段，`status` 表示 HTTP 响应状态码。本文详细说明 `status` 的常见值及其含义。

---

## 1. `readyState` 的状态

`onreadystatechange` 在 `readyState` 变化时触发，取值如下：

| `readyState` 值 | 状态             | 描述                                     |
| --------------- | ---------------- | ---------------------------------------- |
| 0               | UNSENT           | 请求未初始化，`open()` 未调用。          |
| 1               | OPENED           | 请求已建立，`open()` 已调用但未发送。    |
| 2               | HEADERS_RECEIVED | 请求已发送，响应头已接收。               |
| 3               | LOADING          | 响应体正在接收中，可访问部分数据。       |
| 4               | DONE             | 请求完成，响应已完全接收（成功或失败）。 |

- **注意**：`status` 只有在 `readyState >= 2` 时才有意义，否则通常为 0。

---

## 2. `status` 的常见值及其含义

`XMLHttpRequest.status` 表示 HTTP 状态码，常见取值如下：

### 2xx - 成功状态

| 状态码 | 含义       | 描述                                |
| ------ | ---------- | ----------------------------------- |
| 200    | OK         | 请求成功，响应包含预期数据。        |
| 201    | Created    | 请求成功并创建了新资源（如 POST）。 |
| 204    | No Content | 请求成功，但无响应体（如 DELETE）。 |

### 3xx - 重定向状态

| 状态码 | 含义              | 描述                                   |
| ------ | ----------------- | -------------------------------------- |
| 301    | Moved Permanently | 资源永久移动，需更新 URL。             |
| 302    | Found             | 资源临时移动，通常用于重定向。         |
| 304    | Not Modified      | 资源未修改，使用缓存（协商缓存生效）。 |

### 4xx - 客户端错误

| 状态码 | 含义               | 描述                              |
| ------ | ------------------ | --------------------------------- |
| 400    | Bad Request        | 请求参数错误，服务器无法处理。    |
| 401    | Unauthorized       | 未授权，需提供认证信息。          |
| 403    | Forbidden          | 服务器拒绝访问，无权限。          |
| 404    | Not Found          | 请求的资源不存在。                |
| 405    | Method Not Allowed | 请求方法（如 GET/POST）不被支持。 |

### 5xx - 服务器错误

| 状态码 | 含义                  | 描述                               |
| ------ | --------------------- | ---------------------------------- |
| 500    | Internal Server Error | 服务器内部错误，无法处理请求。     |
| 502    | Bad Gateway           | 网关或代理服务器出错。             |
| 503    | Service Unavailable   | 服务器暂时不可用（如维护或超载）。 |
| 504    | Gateway Timeout       | 网关或代理服务器超时。             |

### 特殊情况

| 状态码 | 含义         | 描述                                   |
| ------ | ------------ | -------------------------------------- |
| 0      | 未连接或错误 | 未收到响应（如网络中断、跨域失败等）。 |

- **注意**：`status` 为 0 时，通常表示请求未完成（`readyState < 2`）、网络错误或 CORS 限制。

---

## 3. 示例代码

以下是使用 `onreadystatechange` 检查 `status` 的示例：

```javascript
const xhr = new XMLHttpRequest();
xhr.open("GET", "https://example.com/api", true);

xhr.onreadystatechange = function () {
  console.log(`readyState: ${xhr.readyState}, status: ${xhr.status}`);
  if (xhr.readyState === 4) {
    // 请求完成
    if (xhr.status === 200) {
      console.log("请求成功:", xhr.responseText);
    } else if (xhr.status === 404) {
      console.log("资源未找到");
    } else if (xhr.status === 0) {
      console.log("请求失败，可能网络问题或跨域限制");
    }
  }
};

xhr.send();
```
