import { defineConfig } from "vitepress";
// .vitepress/config.js
export default defineConfig({
  // 站点级选项
  lang: "en-US",
  title: "yemei的博客",
  titleTemplate: "cy",
  description: "一个前端学习的地方",
  head: [["link", { rel: "icon", href: "/blog/pg.jpg" }]],
  base: "/blog/",
  srcDir: "./src",
  outDir: "./dist",
  assetsDir: "static",
  appearance: true,
  lastUpdated: true,
  ignoreDeadLinks: true,//这里打包时忽略本地链接导致的无效
  themeConfig: {
    // 主题级选项
    logo: "/pg.jpg",
    nav: [
      { text: "导航一", link: "https://github.com/HRS-1998/" },
      { text: "导航二", link: "https://github.com/HRS-1998/" },
      { text: "导航三", link: "https://github.com/HRS-1998/" },
    ],

    sidebar: [
      {
        text: "HTML",
        items: [
          { text: "page1", link: "pages/html/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "CSS",
        items: [
          { text: "css", link: "pages/css/css/index.md" },
          { text: "sass", link: "pages/css/sass/index.md" },
          { text: "tailwindcss", link: "pages/css/tailwindcss/index.md" },

        ],
        collapsed: true,
      },
      {
        text: "语言系列",
        items: [
          {
            text: "js", items: [
              { text: "基础", link: "pages/js/index.md" },
              { text: "ao和vo", link: "pages/js/ao和vo.md" },
              { text: "函数重载", link: "pages/js/函数重载.md" },
              { text: "promise及其应用", link: "pages/js/promise.md" },

            ],
            collapsed: true
          },
          { text: "ts", link: "pages/js/index.md" },
          { text: "node", link: "pages/js/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "框架库",
        items: [
          { text: "vue", link: "pages/vue/index.md" },
          { text: "react", link: "pages/vue/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "工程化",
        items: [
          { text: "postcss", link: "pages/enginee/postcss/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "网络",
        items: [
          { text: "page1", link: "pages/react/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "源码系列",
        items: [
          { text: "promise", link: "pages/minprogram/index.md" },
          { text: "axios", link: "pages/minprogram/index.md" },
          { text: "vue", link: "pages/minprogram/index.md" },
          { text: "react", link: "pages/minprogram/index.md" },
          { text: "webpack", link: "pages/minprogram/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "手写系列",
        items: [
          { text: "常见手写实现", link: "pages/interview/index.md" },

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
          { text: "基础", link: "pages/dataStructure/index.md" },

        ],
        collapsed: true,
      },
      {
        text: "日常记录",
        items: [
          { text: "随机记录", link: "pages/dailyRecord/index.md" },

        ],
        collapsed: true,
      },
      {
        text: "部署",
        items: [
          { text: "page1", link: "pages/deploy/index.md" },
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
