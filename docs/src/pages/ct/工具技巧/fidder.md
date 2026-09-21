
### PC代理（手机通用）

#### 文件代理

- 开启Fiddler的请求自动重定向功能

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6237014f53288.png)

- 代理文件参数问题

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6237011bd0b65.png)

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6237012bb9866.png)

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/623701026bfad.png)

### 截取Https

- 打开Fiddler Tool-> Options->HTTPS 。 （配置完后记得要重启Fiddler）.
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236c1b268e1c.png)

- 如果你要监听的程序访问的 HTTPS 站点使用的是不可信的证书，则请接着把下面的 “Ignore servercertificate errors” 勾选上
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236c1cf41a69.png)

### 手机代理（只抓APP的请求）

#### PC设置

- fiddler>Tools>Fiddler Options>Connections 勾选Allow remote computers to connect。
- fiddler>Tools>Fiddler Options菜单，按照下面截图设置HTTPS，不然没法解密
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-23/623a883148596.png)
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236cf0dd7904.png)

- 2.查看电脑IP

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236cec663ac3.png)

- 设置过滤

1. 打开fiddler>Tools>Fiddler Options>HTTPS>…from remote clients only,勾选这个选项就可以了

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236f2f554671.png)

…from all processes :抓所有的请求

…from browsers only ：只抓浏览器的请求

…from non-browsers only :只抓非浏览器的请求

…from remote clients only:只抓远程客户端请求

2.  选择非浏览器

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236d0f285fa4.png)

#### 苹果设置

- 1.进入iPhone打开设置 - 无线局域网，点你链接的网络后面圈出来的那个按钮
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-23/623a86b01e2ea.png)

- 2.选择手动，服务器输入上面我们查看的电脑IP地址，端口8888
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-23/623a86d3f09b8.png)

- 3.测试完之后记得把这个代理改回到关闭，不然你手机上网就要受影响啦。下一步打开手机浏览器，地址栏输入电脑的ip地址加端口号
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-23/623a8711b6bb7.png)

- 4.打开下面的页面，点击圈出来的链接，安装证书
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-23/623a8732dc522.png)
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-23/623a873c02bdd.png)

- 5.只安装还不行，iPhone默认不会开启信任的，需要手动添加一下证书信任，设置 - 通用 - 关于本机，最下面有个信任证书设置按钮，打开后是下面的页面，将DO_NOT_TRUST_FiddlerRoot这个证书打开，不信任这个证书是抓不到https包的，同样的测试完之后你也可以将他关闭
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-23/623a876fb8207.png)

#### 安卓设置

1. 打开 WiFi 设置页面，选择要连接的 wifi ，并且长按，
2. 在弹出的对话框中，选择“修改网络”。在接下来弹出的对话框中，勾选“显示高级选项”。
3. 在接下来显示的页面中，点击“代理”，选择“手动”。
4. 代理服务器主机名设为 PC 的 IP ，代理服务器端口设为 Fiddler 上配置的端口 8888，点”保存”。

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236f2abac63a.png)

### 篡改接口

- 打开 Rules --> Automatic Breakpoints --> After Requests (或者ALT+F11)

#### 篡改请求参数

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236f909e0a30.png)

#### 篡改服务器响应

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236f91688b21.png)

### 模拟慢网速

- Rules --> Customize Rules ，搜索 “m_SimulateModem” ，将每KB上传、下载时间改大并保存，
- 然后勾选Rules --> Performance --> Simulate Modem Speeds ，然后操作即可变慢

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236fdab136f2.png)

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6236fdc818d80.png)

### 图标含义

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-22/6239b30d36d5f.png)
![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-22/6239b31dcddb9.png)
![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-22/6239b3283ef39.png)
![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-22/6239b331d6e7a.png)
![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-22/6239b33c34945.png)

### 插件

[插件中心](https://www.telerik.com/fiddler/add-ons)

- Traffic Differ 对比接口的不同
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6237030375b99.png)

- Gallery 显示选定会话中找到的所有图像的缩略图
  ![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/623707b794566.png)

- JavaScript Formatter插件是格式化JavaScript的简单工具

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-03-20/6237087fb0a9b.png)

- CertMaker for iOS and Android插件是解决iOS设备和Android设备，可能无法与Fiddler使用的默认HTTPS拦截证书一起使用

使用fillder代理调试手机端的https页面,的时候在系统浏览器中打开https页面会出现一个不安全的证书的提示点继续后才能正常浏览,并且在微信中打开https页面直接就是一个空白的页面,出现这种情况是因为没有安装fiddler的证书(在手机端的证书)
