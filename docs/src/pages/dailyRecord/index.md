# 日常记录

## 概述

随机记录日常工作学习的问题，后续收集整理，该部分初始记录见「工具与部署记录」

## 仓库迁移

一、 [仓库迁移](https://www.jianshu.com/p/45efffc8e2c6)

1.  先克隆旧仓库
2.  git fetch 同步提交 commit
3.  到对应分支下添加镜像地址
4.  git push neworigin dev(旧分支):new-dev(新仓库分支)

## nvm 设置

[nvm 设置](https://blog.csdn.net/qq_52775800/article/details/135344549)

## 服务器安装 node,pm2

[pm2 安装](https://blog.csdn.net/qq_36231887/article/details/100703016 pm2)

[node 安装](https://cloud.tencent.com/document/product/213/38237)
其中安装 node 18 服务器会报错 G 2.2.7 错误，安装 16
https://blog.csdn.net/weixin_43654123/article/details/122142197

## nginx 命令

[nginx 命令](https://www.cainiaojc.com/nginx/starting-and-restarting-nginx.html)

## 复制（移动端和 pc 端）

```js
1 vueUse （pc正常）
const { copy } = useClipboard({ legacy: true });
await copy(userInfo.value.code);

2 js （移动端某些浏览器中不行）
  try {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
    } else {
         // 降级方案：使用 execCommand（兼容旧版浏览器和移动端）
         const tempTextArea = document.createElement("textarea");
         tempTextArea.value = text;
         tempTextArea.style.position = "fixed"; // 避免滚动到输入框
         document.body.appendChild(tempTextArea);
         tempTextArea.select();
         tempTextArea.setSelectionRange(0, 99999); // 兼容移动端
         document.execCommand("copy");
         document.body.removeChild(tempTextArea);
       }
    } catch (error) {
        console.error("复制失败:", error);
        showToast(`${t("header.copyFailed")}`);
  }

 3 clipboard.js (移动端正常)
  function Copy=(copytext)=>{
   let clipboard = new Clipboard(".name", {
    text: () => {
      //返回需要复制的字符串
      return copytext ;
    }
  });
  clipboard.on("success", () => {
    console.log('成功')
    clipboard.destroy();
  });
  clipboard.on("error", () => {
    console.log('失败')
    clipboard.destroy();
  });


  }
```

## 滚动 scrollIntoView

注意：有些旧版本不支持 behavior 行为 具体看 caniuse

```js
//对于一般的ui框架其form表单自带滚动api
el.scrollIntoView({
  behavior: "smooth",
  //视口 垂直对齐方式
  block: "start" | "center" | "end" | "nearest",
  // 视口水平对齐方式
  inline: "start" | "center" | "end" | "nearest",
});
```

## node 命令行工具 cac 库

这里看 index.js 文件，可以看到用到了 cac 库，可以用来处理命令行参数。

## vite 调试 vue 项目

[vite 调试 vue 项目](https://juejin.cn/post/7396463744187711497)

## nuxt 项目

[nuxt 项目](https://juejin.cn/post/7236635191379509308)
[nuxt 项目 pinia](https://www.mulingyuer.com/archives/1000/#comments)
[nuxt 项目 i18n](https://juejin.cn/post/7303348013933035559)

## vscode 运行 c

1. [安装 gcc 配置系统变量]](https://blog.csdn.net/qq_38196449/article/details/136125995)

2. 安装 vscode 插件 code runner 和 C/C++ Extension Pack

## 一个 css

通过设置 transform: scaleX(-1)实现水平翻转
文字倒影 -webkit-box-reflect: below;

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <style>
      #name {
        margin-top: 100px;
        margin-left: 500px;
        width: 100px;
        transform: scaleX(-1);
      }
    </style>
  </head>
  <body>
    <div id="name">
      <span>12345</span>
    </div>
  </body>
</html>
```

## keep-alive 组件 以及 http 中的 keep-alive 机制
 <h5>1.keep-alive 组件 以及 http 中的 keep-alive 机制 </h5>

- vue 中的 keep-alive 组件
  keep-alive 组件可以缓存组件的状态，避免重新渲染，提高组件的渲染效率。有 include 和 exclude 属性，可以指定组件是否缓存。

  max 属性指定最大的缓存数，超过这个数量就会开始删除缓存，默认是 Infinity。

  被 keep-alive 包裹的组件在缓存和激活时会触发以下生命周期钩子： activated（组件被激活时触发）、、deactivated（组件被停用时触发）

- http 中的 keep-alive 机制

  ==优点==
  减少延迟：通过重用 TCP 连接，避免了为每个请求建立和拆除连接的开销，特别是在高延迟的网络环境中，这可以显著减少延迟。

  提高性能：减少了 TCP 握手和慢启动阶段的次数，从而提高了整体性能。

  降低服务器负载：减少了服务器处理连接的负担，因为服务器不需要频繁地打开和关闭连接。

  更好的资源利用：客户端和服务器可以更有效地利用网络带宽和系统资源。
  提高页面的加载速度。

  ==缺点==
  连接管理复杂：需要更复杂的连接管理机制，以确保连接在适当的时候被关闭，避免资源泄漏。

  潜在的安全风险：持久连接可能会增加某些类型的安全风险，例如中间人攻击或会话劫持，因为连接保持打开状态的时间更长。

  服务器资源占用：如果连接长时间保持打开状态，可能会占用服务器资源，特别是在连接数量较多的情况下。

  客户端和服务器配置：需要客户端和服务器都支持并正确配置持久连接，否则可能会导致连接问题

 <h5>2.跨页面通信的方案</h5>
 
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

 <h5>4.Canvas和SVG</h5>

 <h5>5.Dom、Bom文档流、渲染流、事件流</h5>
