# 移动端页面head

```
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>title</title>
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="format-detection" content="email=no" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=0" />
</head>
<body>
  body
</body>
</html>
```

### 注意事项

- 页面中utf-8的编码需要放在头部第一行
- 对于telephone和email视页面中是否需要
- viewport建议使用该配置，如果需要修改，建议[参考文档](https://developer.apple.com/library/ios/documentation/appleapplications/reference/safariwebcontent/usingtheviewport/usingtheviewport.html)
