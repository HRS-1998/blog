import { defineConfig } from "vitepress";
// .vitepress/config.js
export default defineConfig({
  // 站点级选项
  lang: "en-US",
  title: "yemei的博客",
  titleTemplate: "cy",
  description: "一个前端学习的地方",
  head: [["link", { rel: "icon", href: "http://49.235.131.245/blog/images/logo.jpg" }]],
  base: "/blog/",
  srcDir: "./src",
  outDir: "./dist",
  assetsDir: "static",
  appearance: true,
  lastUpdated: true,
  ignoreDeadLinks: true,//这里打包时忽略本地链接导致的无效
  themeConfig: {
    // 主题级选项
    logo: "http://49.235.131.245/blog/images/logo.jpg",
    nav: [
      { text: "导航一", link: "https://github.com/HRS-1998/" },
      { text: "导航二", link: "https://github.com/HRS-1998/" },
      { text: "导航三", link: "https://github.com/HRS-1998/" },
    ],

    sidebar: [
      {
        text: "语言系列",
        items: [
          {
            text: "HTML",
            items: [
              { text: "HTML 基础", link: "pages/language/html/index.md" },
            ],
            collapsed: true,
          },
          {
            text: "CSS",
            items: [
              { text: "css", link: "pages/language/css/css/index.md" },
              { text: "csssecret", link: "pages/language/css/csssecret/index.md" },
              { text: "sass", link: "pages/language/css/sass/index.md" },
              { text: "tailwindcss", link: "pages/language/css/tailwindcss/index.md" },
            ],
            collapsed: true,
          },
          {
            text: "JS", items: [
              { text: "基础", link: "pages/language/js/index.md" },
              { text: "DOM事件流", link: "pages/language/js/DOM事件流.md" },
              { text: "DOM文档流", link: "pages/language/js/文档流.md" },
              { text: "ao和vo", link: "pages/language/js/ao和vo.md" },
              { text: "函数重载", link: "pages/language/js/函数重载.md" },
              { text: "数据类型转换", link: "pages/language/js/数据类型转换.md" },
              { text: "promise及其应用", link: "pages/language/js/promise.md" },
              { text: "NodeList与HTMLCollection", link: "pages/language/js/test.md" },
              { text: "node执行shell脚本", link: "pages/language/js/exec.md" },
            ],
            collapsed: true
          },
        ],
        collapsed: true,
      },
      {
        text: "框架库",
        items: [
          { text: "vue", link: "pages/library/vue/index.md" },
          { text: "vue-render", link: "pages/library/vue/hAndRender.md" },
          { text: "nuxt", link: "pages/library/vue/nuxt.md" },
          { text: "flutter-dart", link: "pages/library/flutter/dart.md" },
          { text: "flutter-widget", link: "pages/library/flutter/widget.md" },
        ],
        collapsed: true,
      },
      {
        text: "工程化",
        items: [
          { text: "docker", link: "pages/enginee/index.md" },
          { text: "package.json", link: "pages/enginee/packagejson/index.md" },
          { text: "postcss", link: "pages/enginee/postcss/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "网络",
        items: [
          { text: "强缓存、协商缓存", link: "pages/http/cache.md" },
          { text: "状态码", link: "pages/http/requestStatus.md" },
        ],
        collapsed: true,
      },
      {
        text: "源码系列",
        items: [
          { text: "vite", link: "pages/source/vite/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "手写与面试",
        items: [
          { text: "常见手写实现", link: "pages/interview/index.md" },
          { text: "面试记录", link: "pages/interview/record/01/01.md" },
        ],
        collapsed: true,
      },
      {
        text: "设计模式",
        items: [
          { text: "常见14种设计模式", link: "pages/designPattern/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "数据结构",
        items: [
          { text: "概述", link: "pages/dataStructure/index.md" },
          { text: "链表", link: "pages/dataStructure/链表.md" },
          { text: "堆栈", link: "pages/dataStructure/堆栈.md" },
          { text: "队列", link: "pages/dataStructure/队列.md" },
          { text: "树", link: "pages/dataStructure/树.md" },
          { text: "图", link: "pages/dataStructure/图.md" },
          { text: "排序", link: "pages/dataStructure/排序.md" },
        ],
        collapsed: true,
      },
      {
        text: "性能优化",
        items: [
          { text: "字体", link: "pages/performance/字体.md" },
        ],
        collapsed: true,
      },
      {
        text: "日常记录",
        items: [
          { text: "随机记录", link: "pages/dailyRecord/index.md" },
          { text: "c语言笔记", link: "pages/dailyRecord/c语言笔记.md" },
          { text: "工具与部署记录", link: "pages/ways.md" },
        ],
        collapsed: true,
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/HRS-1998/" }],
    outlineTitle: "页面目录",
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2023-present yemei",
    },
  },
});
