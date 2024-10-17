<center><h3>前端项目说明</h3></center>

#### 前端相关

- **gitlab 代码仓库**：(https://devops-gitlab.sany.com.cn/sany-hzzbapp-713/wdcl-bigdata/) html-front 分支

  - 湖州装备 C 端数据应用仓库 （==sany-v==）

  - 三一装备程序在线管理系统 (==programManage==)

  - 试验看板 （==待办== <span style="color:red">弃用</span>）

  - 试制追溯 （==shizhi== <span style="color:red">弃用</span>）

  - 设计雷区在线查询 （==thunder== <span style="color:red">弃用</span>）

  - 数据协议解析 （==dataAnalysis_out== <span style="color:red">弃用</span>）

  - 高危自定义短信推送 h5 (==h5==)

  - 涉及变更 （==designchange== <span style="color:red">弃用</span>）

  - 强夯 app (==craneapp_h5== <span style="color:red">弃用</span>)

  - 控制所密码计算（==cranepwd== ）

  - 研发需求管理（==CustomeRequirementCollection==）

  - 强夯数字化施工平台（==SDCM==）

  - node 后端 （==nodeProgram==）【控制所密码计算日志导出、研发需求管理数据导出、c 端仓库拧紧大屏数据导出】
  - 性能表 （==code== 这一块只需关注载荷表相关这个页面，其他的可以忽略）

![gitlab代码仓库wdcl-bigdata/html-front](../../img_1.jpg)

- **部署** -
  **_web 应用 /var/www/appGallery/_**

  - backend （==性能表后端==）

  - ldp （==性能表前端==）

  - nodeProgram （==node 后端对应分支中的 nodeProgram 服务器中使用 pm2 管理== ）

  - program （==程序在线管理系统前端==）

  - sany-v （==湖州装备 C 端数据应用仓库前端==）

  - sdcm （==强夯数字化施工平台前端==）

  ![web应用服务器部署](../../img_2.jpg#pic_center)

  **_飞书小程序 飞书开发者后台_**

  - 只需考虑装备控制计算工具
    ![飞书小程序](../../img_3.jpg)

- **nginx 配置**

  **_服务器 10.130.207.162，主要服务如下_**

  ![服务器部署](../../img3.jpg#pic_center)

  域名解析:cranebd.sany.com.cn -> 两台负载均衡服务器，外网：

  62.234.200.132，内网：10.130.207.158 通过 443 端口解析至应

  用部署服务器 10.130.207.162

  **_前端 nginx 配置：/etc/nginx/nginx.conf_**

  ![nginx配置](../../img_4.jpg#pic_center)

- **数据库** -

  - 控制密码计算日志数据库（==crane_pwd==）

  - 性能表数据库 （==CustomeRequirementCollection 可不用==）
    ![数据库](../../img_5.jpg#pic_center)
