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
        text: "Html",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "Css",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "Js ",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "Vue",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "React",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "移动端",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "3D、地图",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "工程化",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "Http",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "Nodejs",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },
      {
        text: "小程序",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },

      {
        text: "手写系列",
        items: [
          { text: "常见手写实现", link: "pages/shouxie/index.md" },

        ],
        collapsed: true,
      },
      {
        text: "部署",
        items: [
          { text: "page1", link: "pages/page1/index.md" },
          { text: "page2", link: "pages/page2/index.md" },
        ],
        collapsed: true,
      },

    ],
    socialLinks: [{ icon: "github", link: "https://github.com/HRS-1998/" }],
  },
});
