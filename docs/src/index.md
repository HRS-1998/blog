# 日常前端的问题积累

## 1.keep-alive 组件 以及 http 中的 keep-alive 机制

- vue 中的 keep-alive 组件
  keep-alive 组件可以缓存组件的状态，避免重新渲染，提高组件的渲染效率。有 include 和 exclude 属性，可以指定组件是否缓存。

  max 属性指定最大的缓存数，超过这个数量就会开始删除缓存，默认是 Infinity。

  被 keep-alive 包裹的组件在缓存和激活时会触发以下生命周期钩子： activated（组件被激活时触发）、、deactivated（组件被停用时触发）

- http 中的 keep-alive 机制

  <u>优点</u>
  减少延迟：通过重用 TCP 连接，避免了为每个请求建立和拆除连接的开销，特别是在高延迟的网络环境中，这可以显著减少延迟。

  提高性能：减少了 TCP 握手和慢启动阶段的次数，从而提高了整体性能。

  降低服务器负载：减少了服务器处理连接的负担，因为服务器不需要频繁地打开和关闭连接。

  更好的资源利用：客户端和服务器可以更有效地利用网络带宽和系统资源。
  提高页面的加载速度。

  <u>缺点</u>
  连接管理复杂：需要更复杂的连接管理机制，以确保连接在适当的时候被关闭，避免资源泄漏。

  潜在的安全风险：持久连接可能会增加某些类型的安全风险，例如中间人攻击或会话劫持，因为连接保持打开状态的时间更长。

  服务器资源占用：如果连接长时间保持打开状态，可能会占用服务器资源，特别是在连接数量较多的情况下。

  客户端和服务器配置：需要客户端和服务器都支持并正确配置持久连接，否则可能会导致连接问题

## 2.跨页面通信的方案

[跨页面通信](https://juejin.cn/post/7306040473542213644?searchId=2024072508325224395F92C54610A7C8D1)

- 跨域通信：postMessage、WebSocket、Server-Sent Events（EventSource）
- 同源通信：localStorage,SessionStorage,broadcast Channel
- 共享资源：shareWork

 <h5>3.webSocket和SSE</h5>

[SSE](https://juejin.cn/post/7355666189475954725?searchId=20240725082017F5A0539BF579BBAA3701)

```js
//客户端
const source = new EventSource("url");
source.onmessage = function (event) {};
```

```js
//服务端
app.get('url', (req, res) => {
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");
let startTime = Date.now();
    const sendEvent = () => {
        // 检查是否已经发送了10秒
        if (Date.now() - startTime >= 10000) {
            res.write('event: close\ndata: {}\n\n'); // 发送一个特殊事件通知客户端关闭
            res.end(); // 关闭连接
            return;
        }

        const data = { message: 'Hello World', timestamp: new Date() };
        res.write(`data: ${JSON.stringify(data)}\n\n`);

        // 每隔2秒发送一次消息
        setTimeout(sendEvent, 2000);
    };

    sendEvent();
}

```

## 4.Canvas 和 SVG

## 5.Dom、Bom 文档流、渲染流、事件流
