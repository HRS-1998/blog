```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Document</title>
    <style>
      * {
        margin: 0;
        padding: 0;
      }
      body,
      html {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      #container_outer {
        display: table;
        overflow: hidden;
        *position: relative;
        width: 100%;
        height: 100%;
      }

      #container_inner {
        vertical-align: middle;
        display: table-cell;
        text-align: center;
        *position: absolute;
        *top: 50%;
        *left: 50%;
      }

      #content {
        display: inline-block;
        *position: relative;
        *top: -50%;
        *left: -50%;
      }
    </style>
  </head>

  <body>
    <div id="container_outer">
      <div id="container_inner">
        <div id="content">
          <img
            src="https://img.yaodou.com/game/ydtzl/2021091010200.jpg"
            alt=""
          />
        </div>
      </div>
    </div>
  </body>
</html>
```
