# 日常记录

## 概述

随机记录日常工作学习的问题，后续收集整理，该部分初始记录会在 ways 文件夹下

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
