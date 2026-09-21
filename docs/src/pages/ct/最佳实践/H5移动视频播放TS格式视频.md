[TOC]

## 背景

解决微信内置浏览器[安卓端mp4视频动效不自动播放](https://developers.weixin.qq.com/community/develop/doc/000e640d77cfa001132a6cb8456c01)的的异常，确保在不同设备和浏览器环境下都能自动播放动效。

<br/><br/>

## 解决方案

### 1、视频格式转换

使用 FFmpeg 工具转换将`.mp4格式视频`转成`.ts格式视频`。
FFmpeg是一款多媒体视频处理工具，有非常强大的功能包括视频采集功能、 视频格式转换 、视频抓图、视频加水印等。

<br/>
*** 步骤一：安装FFmpeg ***
1、mac版本使用 `Homebrew包管理器` 安装ffmpeg

```
brew install ffmpeg
```

2、Windows 上安装 FFmpeg 可以通过下载预编译的二进制文件进行安装

- 下载 FFmpeg：前往 FFmpeg 官网 下载最新版的 FFmpeg。
- 解压缩：将下载的压缩包解压到您想要安装 FFmpeg 的目录中。
- 配置环境变量：在 Windows 中打开“控制面板”，点击“系统和安全” -> “系统” -> “高级系统设置”，在弹出的窗口中点击“环境变量”，在“系统变量”中找到“Path”，双击它，在弹出的窗口中点击“新建”，输入 FFmpeg 的安装目录，并点击“确定”保存设置。
- 完成安装：打开命令提示符（Windows+R，输入 cmd 回车），执行 `ffmpeg -version` 命令，如果输出 FFmpeg 的版本信息，说明安装成功。

<br/>
*** 步骤二：.mp4视频转.ts格式 视频 ***

```
ffmpeg -i home.mp4 -f mpegts -codec:v mpeg1video -b:v 10000k -vf scale=750:-1 -codec:a mp2 home.ts
```

** 命令说明：**

** 【1】基础命令结构: **

| 参数          | 说明                             |
| ------------- | -------------------------------- |
| `-i home.mp4` | 指定输入文件（home.mp4）         |
| `-f mpegts`   | 强制输出格式为 MPEG-TS（传输流） |
| `home.ts`     | 输出文件名（TS格式）             |

** 【2】视频编码参数：**

| 参数                  | 说明                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `-codec:v mpeg1video` | 视频编码器设为 MPEG-1（较老的编码标准，兼容性好但压缩效率低）。                                            |
| `-b:v 10000k`         | 视频码率设为 10,000 kbps（10 Mbps），控制输出画质和文件大小。一般：3500k ~ 10000k 区间范围，数字越大越清晰 |
| `-vf scale=750:-1`    | 缩放视频宽度为 750像素，高度按比例自动计算（-1表示保持原始宽高比）。                                       |

** 【3】音频编码参数: **

| 参数           | 说明                                                          |
| -------------- | ------------------------------------------------------------- |
| `-codec:a mp2` | 音频编码器设为 MP2（MPEG-1 Layer II，早期数字电视常用格式）。 |

注意：MP2 音质比 MP3 稍差，但兼容性更好（适合广播系统）。若需保留原始音频，可改用 -codec:a copy（直接复制，不重新编码）。

右上角有附件视频：可以测试使用。

<img src="http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=d0d18ce3efa3f17fe1538575b12ad6b6" width="500px" />

<br/>
### 2、引入第三方库（jsmpeg）

JSMpeg 是一个用于解码 MPEG1 视频流的 JavaScript 库。它可以在浏览器中解码视频流，并将其呈现为 Canvas 元素。JSMpeg 可以在支持 Canvas 和 WebSocket 的现代浏览器上运行。

Github地址：https://github.com/phoboslab/jsmpeg?tab=readme-ov-file

关键代码：

```html
<div class="video-container">
  <canvas id="videoContainer" class="video-container__canvas"></canvas>
  <img
    id="fallbackImage"
    class="video-container__img"
    src="assets/video/home.jpg"
  />
</div>

<script src="assets/js/libs/jsmpeg.min.js"></script>
<script>
  function playVideo() {
    const videoSrc = 'assets/video/home.ts'; // 视频文件路径
    const fallbackImage = document.getElementById('fallbackImage');
    const canvas = document.getElementById('videoContainer');

    // 创建JSMpeg播放器
    const player = new JSMpeg.Player(videoSrc, {
      canvas: canvas,
      autoplay: true,
      loop: true,
      audio: false,
      onPlay: function () {
        fallbackImage.style.zIndex = -1;
      },
    });
  }

  // 当页面加载完成后播放视频
  window.addEventListener('load', playVideo);
</script>
```

<br/><br/>

## Demo

示例地址：https://webonline.tcy365.com/h5-demo/ts-video/index.html

![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=9c6356a11cb14648bd2ab727f1ae4755)
