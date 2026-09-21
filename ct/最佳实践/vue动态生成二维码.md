1.项目引入 qrcodejs2 包
·npm install qrcodejs2 -S

2.在对应页面中引入
import QRCode from 'qrcodejs2';

3.在代码中使用

```javascript
  //参数自定义
  createQRCode(item: Record<string, any>, index: number) {
    const { typeId, parentId, id } = item;
    const url = 'http://campus.ct108.com/m/index.html#/detail/';
    this.$nextTick(() => {
      const shareCode: any = document.querySelector(`#codeBox${index}`);

      shareCode.innerHTML = ''; //二维码清除
      // 二维码相关配置
      new QRCode(shareCode, {
        text: url + typeId + '/' + parentId + '/' + id, //二维码链接，参数是否添加看需求 url中要加https://
        width: 115, //二维码宽度
        height: 115, //二维码高度
        colorDark: '#333333', //二维码颜色
        colorLight: '#ffffff', //二维码背景色
        correctLevel: QRCode.CorrectLevel.L //容错率，L/M/H
      });
    });
  }
```
