一、 [仓库迁移](https://www.jianshu.com/p/45efffc8e2c6)

1.  先克隆旧仓库
2.  git fetch 同步提交 commit
3.  到对应分支下添加镜像地址
4.  git push neworigin dev(旧分支):new-dev(新仓库分支)

二、[nvm 设置](https://blog.csdn.net/qq_52775800/article/details/135344549)

三、服务器安装 node,pm2
[pm2 安装](https://blog.csdn.net/qq_36231887/article/details/100703016 pm2)

[node 安装](https://cloud.tencent.com/document/product/213/38237)
其中安装 node 18 服务器会报错 G 2.2.7 错误，安装 16
https://blog.csdn.net/weixin_43654123/article/details/122142197

四、nginx 命令
[nginx 命令](https://www.cainiaojc.com/nginx/starting-and-restarting-nginx.html)

# 记录 NUXT 实际开发中的问题

## 使用 NuxtImg 和 img 的区别

```vue

```

## i18n

i18n 配置好后，vue 组件中可以直接在 template 中使用$t 无需引入 t

```vue
<template>
  <div @click="closeMobileMenu">
    {{ $t(item.label) }}
  </div>
</template>
```

## store 在组件中使用

stores 文件夹下导出的 defineStore 中的属性和方法，在 vue 组件中使用时其中属性失去了响应式，可以使用 storeToRefs()方法恢复响应式。

```vue
<script setup lang="ts">
const appStore = useAppStore();
const { toggleMenu } = useAppStore();
const { isMenuOpen } = storeToRefs(appStore);
</script>
```
