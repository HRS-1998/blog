示例文件夹目录 D:\\\：

```shell
├─ flutter
│ ├─ flutterSdk    # 存放 flutter sdk
│ ├─ androidStudio # 存放 androidStudio 编辑器
│ ├─ androidSdk    # 存放 android sdk
```

安装 flutter sdk

1. 安装 [flutter sdk](https://docs.flutter.cn/release/archive?tab=windows)

2. 配置系统环境变量

   - Path 中 添加 flutter/bin 例如： `D:\flutter\flutterSdk\bin`
   - 添加系统变量,用于配置镜像
     | 变量名 | 变量值 |
     | :---: | :---: |
     |`PUB_HOSTED_URL`|`https://pub.flutter-io.cn`|
     |`FLUTTER_STORAGE_BASE_URL`|`https://storage.flutter-io.cn`|

3. cmd 中执行 flutter --version 查看是否安装成功

4. cmd 中执行 flutter doctor 查看运行环境以及支持的平台

<!-- 5. 使用 vscode 编辑器 -->
   <!-- - 安装 flutter 插件 (会自动安装 dart 插件) -->

安装 android 工具链

1. 安装 [android sdk](https://developer.android.google.cn/studio?hl=zh-cn)
2. 配置系统环境变量 `ANDROID_HOME` 为 sdk 路径 例如：`D:\flutter\ansroidSdk`
3. androidStudio 中安装 plugin : `flutter` + `dart` 插件
4. 设置中 Android SDK 安装以下组件
   - Android SDK Platform, API 35.0.2
   - Android SDK Command-line Tools
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android Emulator
   ![AS Android SDK组件](./image/ASSetting_01.png)
   ![AS Android SDK组件](./image/ASSetting_02.png)
   <!-- 5. androidStudio 中配置模拟器 （ide 右侧 Device Manager） -->

vscode 编辑器配置

1. 安装 flutter 插件 (会自动安装 dart 插件)

2. 右下角选择对应虚拟机器，运行 flutter run 命令
   ![vscode 运行 flutter app](./image/VSCode_01.png)

以上完成后，在 cmd 中运行 flutter doctor 查看是否正常
目前有证书 license 问题，需要按提示运行 flutter doctor --android-licenses

解决证书问题后，就只剩 Windows apps 的问题了
![cmd_flutter](./image/flutter_01.png)

运行 flutter run -v 命令

可能会出现 Running Gradle task 'assembleDebug'... 报错问题

解决方法：
先尝试 3 是否成功,如果不成功按照以下顺序解决

1. 安装 java 11 环境 [java11 下载地址](https://www.oracle.com/java/technologies/downloads/#java11-windows)
2. 配置系统环境变量

   - 新建 JAVA_HOME 变量，值为 java 安装路径 例如：`C:\Program Files\Java\jdk-11.0.13`
   - 新建 PATH 变量，值为 `%JAVA_HOME%\bin`
   - 运行 cmd 命令，查看 java -version 是否正常
   - oracle 账号 25\*\*\*qq,密码：123456qq@H

3. 更改 gradle 配置文件 \android\gradle\wrapper\gradle-wrapper.properties

```shell
# distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-all.zip
 distributionUrl=https://mirrors.aliyun.com/macports/distfiles/gradle/gradle-8.9-all.zip
```
