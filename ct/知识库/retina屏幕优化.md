# Retina屏幕优化

什么是Retina屏幕

[Retina显示屏](http://zh.wikipedia.org/wiki/Retina显示屏)

前端如何判断

```
/* CSS */
@media only screen and (-webkit-min-device-pixel-ratio: 2),
only screen and (min-device-pixel-ratio: 2) {
 /*your css code*/
}
```

```javascript
// javascript
window.devicePixelRatio;
```

优化技术方案

- [Retina 显示屏下 @2x 图片的模拟](http://www.aoao.org.cn/blog/2012/04/retina-display-image-2x/)
- [Retina.js 智能转换显示高清图片](http://www.mooteam.com/zh/archives/retina-js-智能转换显示高清图片/)

问题

- 是否需要考虑为用户节约流量， 在判断到计费网络的时候不要去做这个优化
- 是否需要考虑为用户节约电量，优化后会增加耗电量吗？
- 什么情况下一定要为retina屏幕优化呢？ 是否可以根据某个产品的定位以及设备访问比率做出决定？

目前可以进行的

- 采用手动的方式为某些主要图片提供大图片，比如一张detail的显示尺寸为320×320 那么可以用js强制去获取640×640的图片替换掉图片
- 对于背景图 可以额外写css的方式解决

参考文章

- [使用css sprites来优化你的网站在Retina屏幕下显示](http://www.w3cplus.com/css/using-css-sprites-to-optimize-your-website-for-retina-displays.html)
