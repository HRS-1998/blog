
import { defineConfig } from 'vitepress'
// .vitepress/config.js
export default defineConfig({
  // 站点级选项
  lang: 'en-US',
  title: 'yemei的博客',
  titleTemplate: 'cy',
  description: '一个前端学习的地方',
  head: [['link', { rel: 'icon', href: '/dw.png' }]],
  base: '/blog/',
  srcDir: './src',
  outDir: './dist',
  assetsDir: 'static',
  appearance: true,
  lastUpdated: true,
  themeConfig: {
    // 主题级选项
    logo: '/dw.png',
    nav: [
      { text: '导航一', link: 'https://github.com/HRS-1998/blog' },
      { text: '导航二', link: 'https://github.com/HRS-1998/blog' },
      { text: '导航三', link: 'https://github.com/HRS-1998/nestjs' },
    ],
    sidebar: [
      {
        text: 'Vue', items: [
          { text: 'Docker', link: '/page1/index.md' },
          { text: 'Css', link: '/page2/index.md' },
        ],
        collapsed: true,
      },
      { text: 'React', },
      { text: 'Css', },
      { text: 'Canvas', },
      { text: 'Svg', },
      { text: '日常问题', link: "/ways/index.md" }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HRS-1998/' }]

  }
})