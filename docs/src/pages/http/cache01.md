# 前端缓存体系梳理（强缓存 / 协商缓存 / F5 / Ctrl+F5 / Service Worker）

## 1. 强缓存 & 协商缓存（HTTP 缓存，浏览器原生）

> HTTP 缓存发生在**浏览器 → 服务器**之间，只针对静态资源（js/css/img/html）

### ✅ 强缓存（不发请求，直接读本地磁盘 / 内存缓存）

**响应头控制**：`Cache-Control`（优先）、`Expires`

- `Cache-Control: max-age=3600`：资源有效期 3600 秒，从响应时间开始计时
- `Expires: Wed, 21 Oct 2026 07:28:00 GMT`：绝对过期时间，老标准，优先级低于 Cache-Control

特点：

1. 在有效期内，**浏览器不会向服务器发任何请求**，Network 面板显示 `200 OK (from disk cache / from memory cache)`
2. memory cache：内存缓存，页面关闭就清空；一般小资源（js、图片）
3. disk cache：硬盘缓存，持久化，关闭浏览器还在，大资源

> `Cache-Control: no-cache` ❗注意：**不是不缓存，是不使用强缓存，每次都要走协商缓存校验**
> `Cache-Control: no-store`：完全不缓存，不存任何资源，强缓存协商缓存都不走

### ✅ 协商缓存（发请求，服务器对比标识，304 命中）

强缓存过期后，浏览器带**资源标识**去服务端校验：

- `Last-Modified` / `If-Modified-Since`：文件最后修改时间（秒级，精度差）
- `ETag` / `If-None-Match`：文件哈希指纹，优先级高于 Last-Modified

流程：

1. 浏览器请求带上 `If-None-Match: "xxx"`
2. 服务端对比 Etag：
   - 资源没变 → 返回 `304 Not Modified`，**不返回资源 body**，浏览器复用本地缓存
   - 资源变化 → 返回 `200 OK` + 新资源 + 新 Etag/Cache-Control

> 一句话区分：**强缓存不发请求；协商缓存发请求，304 成功复用缓存**

---

## 2. 用户操作：普通访问、F5 刷新、Ctrl+F5 强制刷新

表格

| 操作                              | 缓存行为                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 地址栏回车 / 页面跳转（普通访问） | **优先强缓存**；过期才走协商缓存                                                                                         |
| F5（刷新页面）                    | **跳过强缓存**，直接发起协商缓存校验（带 If-None-Match/If-Modified-Since）不会读取 memory/disk 强缓存，服务端 304 可复用 |
| Ctrl + F5（强制刷新 / 硬刷新）    | **强缓存、协商缓存全部跳过**请求头附带 `Cache-Control: no-cache`，向服务器拉全新资源，不使用本地任何 http 缓存           |

> 补充：
>
> - Chrome：`Shift+F5` 等价 Ctrl+F5
> - F5：只是不使用强缓存，协商缓存还生效；
> - Ctrl+F5：完全绕过 HTTP 缓存，直接拿新资源

⚠️ 注意：**HTTP 缓存 和 Service Worker 缓存是两套独立缓存**，上面规则只针对 HTTP 缓存。

---

## 3. Service Worker 缓存（Web Worker，独立于 HTTP 缓存）

> Service Worker（SW）是浏览器后台独立线程，**拦截页面所有网络请求**，自己管理缓存，优先级高于 HTTP 缓存。
> 属于应用层缓存，不是 HTTP 标准缓存。

### SW 缓存模式（常用）

1. **Cache First 缓存优先**：先读 SW 缓存，有就直接返回；没有再请求服务端，并且存入缓存。类似强缓存，**不会走 HTTP 缓存**。
2. **Network First 网络优先**：先发请求拿最新资源；网络失败 / 超时，读取 SW 缓存兜底。
3. **Stale-while-revalidate**：立刻返回旧缓存，后台异步更新缓存，下次访问生效。

### SW 特点

1. SW 缓存独立磁盘存储，**不受 Cache-Control / Expires / ETag 控制**（除非代码手动读取 http 头）
2. 优先级：SW 拦截请求 → 自己缓存策略 → 才会走到浏览器 HTTP 缓存
3. 生效：需要 HTTPS（[localhost](https://localhost)开发除外），注册、激活有生命周期，**首次注册不生效，第二次打开页面才生效**
4. 清除：普通 F5/Ctrl+F5**不会自动清空 SW 缓存**；要在开发者工具 Application 面板手动清除 SW 和 Cache Storage，或者代码里做版本更新策略。

### SW 和 HTTP 缓存对比总结

- HTTP 缓存：浏览器原生，由响应头控制；F5/Ctrl+F5 会影响它
- SW 缓存：JS 代码自定义，请求拦截；**F5 硬刷新不会自动清空 SW 缓存**，需要单独处理缓存版本

---

# 快速面试一句话总结

1. **强缓存**：Cache-Control/Expires，不发请求直接读本地；**协商缓存**：Etag/Last-Modified，发请求校验，命中返回 304。
2. 地址栏访问：先走强缓存；F5：跳过强缓存，走协商缓存；Ctrl+F5：全部绕过 HTTP 缓存，拉全新资源。
3. Service Worker：独立后台线程拦截请求，自定义缓存策略，优先级高于 HTTP 缓存，不受 HTTP 缓存头直接控制，F5 硬刷不会清理 SW 缓存。
