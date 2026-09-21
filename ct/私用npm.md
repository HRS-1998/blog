## 介绍

Verdaccio是一个轻量级的私有NPM的Registry

## 地址

http://192.168.101.116:4873/#/

## 配置使用私有的镜像

npm set registry http://192.168.101.116:4873

## 登录

npm adduser --registry http://192.168.101.116:4873

## 发布

**【发布由相关负责人发布】**
npm publish --registry http://192.168.101.116:4873

## 仓库

/root/.config/verdaccio/storage/

## 命名

| 名称   | 命名        | 备注   |
| :----- | :---------- | :----- |
| common | tc-c-name   | 公共   |
| pc     | tc-pc-name  | pc     |
| admin  | tc-ad-name  | 后台   |
| mobile | tc-mb-name  | 移动   |
| xyy    | tc-xyy-name | 逍遥游 |
