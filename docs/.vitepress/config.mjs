import { defineConfig } from 'vitepress';
// .vitepress/config.js
export default defineConfig({
  // 站点级选项
  lang: 'en-US',
  title: 'yemei的博客',
  titleTemplate: 'cy',
  description: '一个前端学习的地方',
  head: [
    [
      'link',
      { rel: 'icon', href: 'http://49.235.131.245/blog/images/logo.jpg' },
    ],
  ],
  base: '/blog/',
  srcDir: './src',
  outDir: './dist',
  assetsDir: 'static',
  appearance: true,
  lastUpdated: true,
  ignoreDeadLinks: true, //这里打包时忽略本地链接导致的无效
  themeConfig: {
    // 主题级选项
    logo: 'http://49.235.131.245/blog/images/logo.jpg',
    nav: [
      {
        text: '阮一峰博客',
        link: 'https://www.ruanyifeng.com/blog/index.html',
      },
      { text: '算法', link: 'https://algo.itcharge.cn/' },
      { text: '组件库', link: 'http://49.235.131.245/dart' },
    ],

    sidebar: [
      {
        text: '语言系列',
        items: [
          {
            text: 'HTML',
            items: [
              { text: 'HTML 基础', link: '/pages/language/html/index.md' },
            ],
            collapsed: true,
          },
          {
            text: 'CSS',
            items: [
              { text: 'css', link: '/pages/language/css/css/index.md' },
              {
                text: 'csssecret',
                link: '/pages/language/css/csssecret/index.md',
              },
              { text: 'sass', link: '/pages/language/css/sass/index.md' },
              {
                text: 'tailwindcss',
                link: '/pages/language/css/tailwindcss/index.md',
              },
            ],
            collapsed: true,
          },
          {
            text: 'JS',
            items: [
              { text: '基础', link: '/pages/language/js/index.md' },
              { text: 'DOM事件流', link: '/pages/language/js/DOM事件流.md' },
              { text: 'DOM文档流', link: '/pages/language/js/文档流.md' },
              { text: 'ao和vo', link: '/pages/language/js/ao和vo.md' },
              { text: '函数重载', link: '/pages/language/js/函数重载.md' },
              {
                text: '数据类型转换',
                link: '/pages/language/js/数据类型转换.md',
              },
              { text: 'promise及其应用', link: '/pages/language/js/promise.md' },
              {
                text: 'NodeList与HTMLCollection',
                link: '/pages/language/js/test.md',
              },
              { text: 'node执行shell脚本', link: '/pages/language/js/exec.md' },
              {
                text: '判断数据类型',
                link: '/pages/language/js/判断数据类型.md',
              },
            ],
            collapsed: true,
          },
        ],
        collapsed: true,
      },
      {
        text: '框架库',
        items: [
          { text: 'vue', link: '/pages/library/vue/index.md' },
          { text: 'vue-render', link: '/pages/library/vue/hAndRender.md' },
          { text: 'nuxt', link: '/pages/library/vue/nuxt.md' },
          { text: 'flutter-dart', link: '/pages/library/flutter/dart.md' },
          { text: 'flutter-index', link: '/pages/library/flutter/index.md' },
          { text: 'flutter-widget', link: '/pages/library/flutter/widget.md' },
        ],
        collapsed: true,
      },
      {
        text: '工程化',
        items: [
          { text: 'docker', link: '/pages/enginee/index.md' },
          { text: 'package.json', link: '/pages/enginee/packagejson/index.md' },
          { text: 'postcss', link: '/pages/enginee/postcss/index.md' },
          { text: 'pnpm深度解析', link: '/pages/interview/ms/pnpm.md' },
          { text: 'vite配置', link: '/pages/interview/ms/vite_config.md' },
          { text: 'webpack配置', link: '/pages/interview/ms/webpack_config.md' },
        ],
        collapsed: true,
      },
      {
        text: '网络',
        items: [
          { text: '强缓存、协商缓存', link: '/pages/http/cache.md' },
          { text: '缓存01', link: '/pages/http/cache01.md' },
          { text: '状态码', link: '/pages/http/requestStatus.md' },
        ],
        collapsed: true,
      },
      {
        text: '源码系列',
        items: [{ text: 'vite', link: '/pages/source/vite/index.md' }],
        collapsed: true,
      },
      {
        text: '手写与面试',
        items: [
          { text: '常见手写实现', link: '/pages/interview/index.md' },
          { text: '面试记录', link: '/pages/interview/record/01/01.md' },
          { text: '面试复习大纲', link: '/pages/interview/ms/大纲.md' },
          { text: '面试题库', link: '/pages/interview/ms/项目.md' },
          { text: '项目面试预演', link: '/pages/interview/ms/预测.md' },
          { text: '手写minivue', link: '/pages/interview/ms/手写_minivue.md' },
          { text: '手写xhr', link: '/pages/interview/ms/手写_xhr.md' },
          { text: 'LRU算法', link: '/pages/interview/ms/LRU.md' },
          { text: 'innerHTML区别', link: '/pages/interview/ms/innerhtml.md' },
        ],
        collapsed: true,
      },
      {
        text: '设计模式',
        items: [
          { text: '常见14种设计模式', link: '/pages/designPattern/index.md' },
        ],
        collapsed: true,
      },
      {
        text: '数据结构',
        items: [
          { text: '概述', link: '/pages/dataStructure/index.md' },
          { text: '链表', link: '/pages/dataStructure/链表.md' },
          { text: '堆栈', link: '/pages/dataStructure/堆栈.md' },
          { text: '队列', link: '/pages/dataStructure/队列.md' },
          { text: '树', link: '/pages/dataStructure/树.md' },
          { text: '图', link: '/pages/dataStructure/图.md' },
          { text: '排序', link: '/pages/dataStructure/排序.md' },
        ],
        collapsed: true,
      },
      {
        text: '性能优化',
        items: [{ text: '字体', link: '/pages/performance/字体.md' }],
        collapsed: true,
      },
      {
        text: '工作积累',
        items: [
          { text: '常规工作流程', link: '/pages/ct/常规工作流程.md' },
          { text: '重点工作说明', link: '/pages/ct/重点工作说明.md' },
          { text: '代码评审清单', link: '/pages/ct/代码评审清单.md' },
          { text: '发布', link: '/pages/ct/发布.md' },
          { text: '私用npm', link: '/pages/ct/私用npm.md' },
          {
            text: '代码规范',
            items: [
              { text: '代码规范', link: '/pages/ct/代码规范/代码规范.md' },
              {
                text: '代码命名规范',
                link: '/pages/ct/代码规范/代码命名规范.md',
              },
              { text: 'CSS规范BEM', link: '/pages/ct/代码规范/CSS规范BEM.md' },
            ],
            collapsed: true,
          },
          {
            text: '开发规范',
            items: [
              { text: 'ai配置', link: '/pages/ct/开发规范/ai配置.md' },
              {
                text: 'oss格式图片处理',
                link: '/pages/ct/开发规范/oss格式图片处理.md',
              },
              {
                text: 'vscode保存及格式化',
                link: '/pages/ct/开发规范/vscode保存及格式化.md',
              },
              { text: '测试规范', link: '/pages/ct/开发规范/测试规范.md' },
              { text: '后台ui规范', link: '/pages/ct/开发规范/后台ui规范.md' },
              { text: '技术评审', link: '/pages/ct/开发规范/技术评审.md' },
              { text: '接口规范', link: '/pages/ct/开发规范/接口规范.md' },
              {
                text: '新后台UI规范',
                link: '/pages/ct/开发规范/新后台UI规范.md',
              },
            ],
            collapsed: true,
          },
          {
            text: '发布规范',
            items: [{ text: 'git规范', link: '/pages/ct/发布规范/git规范.md' }],
            collapsed: true,
          },
          {
            text: '微信公众号',
            items: [
              {
                text: '微信公众号及介绍',
                link: '/pages/ct/微信公众号/微信公众号及介绍.md',
              },
              {
                text: '微信开发相关',
                link: '/pages/ct/微信公众号/微信开发相关.md',
              },
              {
                text: '微信h5开发框架',
                link: '/pages/ct/微信公众号/微信h5开发框架.md',
              },
              {
                text: '微信公共页面解决方案',
                link: '/pages/ct/微信公众号/微信公共页面解决方案.md',
              },
              {
                text: '微信转发使用说明',
                link: '/pages/ct/微信公众号/微信转发使用说明.md',
              },
              { text: '常见问题', link: '/pages/ct/微信公众号/常见问题.md' },
              { text: '常用代码', link: '/pages/ct/微信公众号/常用代码.md' },
              { text: '支付文档', link: '/pages/ct/微信公众号/支付文档.md' },
              {
                text: '微信小程序',
                items: [
                  {
                    text: '1基础',
                    link: '/pages/ct/微信公众号/微信小程序/1基础.md',
                  },
                  {
                    text: '2交互与用户体验',
                    link: '/pages/ct/微信公众号/微信小程序/2交互与用户体验.md',
                  },
                  {
                    text: '3性能',
                    link: '/pages/ct/微信公众号/微信小程序/3性能.md',
                  },
                  {
                    text: '4多平台适配',
                    link: '/pages/ct/微信公众号/微信小程序/4多平台适配.md',
                  },
                  {
                    text: '5更新维护与数据分析',
                    link: '/pages/ct/微信公众号/微信小程序/5更新维护与数据分析.md',
                  },
                ],
                collapsed: true,
              },
              {
                text: 'uniapp',
                items: [
                  { text: '大纲', link: '/pages/ct/微信公众号/uniapp/大纲.md' },
                  { text: '课程', link: '/pages/ct/微信公众号/uniapp/课程.md' },
                  {
                    text: '1基础',
                    link: '/pages/ct/微信公众号/uniapp/1基础.md',
                  },
                  {
                    text: '2实践',
                    link: '/pages/ct/微信公众号/uniapp/2实践.md',
                  },
                  {
                    text: '3性能',
                    link: '/pages/ct/微信公众号/uniapp/3性能.md',
                  },
                ],
                collapsed: true,
              },
            ],
            collapsed: true,
          },
          {
            text: '知识库',
            items: [
              { text: 'ecma5兼容', link: '/pages/ct/知识库/ecma5兼容.md' },
              {
                text: 'retina屏幕优化',
                link: '/pages/ct/知识库/retina屏幕优化.md',
              },
              {
                text: '多终端解决方案',
                link: '/pages/ct/知识库/多终端解决方案.md',
              },
              { text: '各浏览器hack', link: '/pages/ct/知识库/各浏览器hack.md' },
              { text: '微信分享', link: '/pages/ct/知识库/微信分享.md' },
              { text: '微信分享自带', link: '/pages/ct/知识库/微信分享自带.md' },
              {
                text: '移动端页面head',
                link: '/pages/ct/知识库/移动端页面head.md',
              },
              { text: '移动端字体', link: '/pages/ct/知识库/移动端字体.md' },
              {
                text: '移动平台问题列表',
                link: '/pages/ct/知识库/移动平台问题列表.md',
              },
              { text: '移动资源公告', link: '/pages/ct/知识库/移动资源公告.md' },
            ],
            collapsed: true,
          },
          {
            text: '最佳实践',
            items: [
              { text: '1网站地址', link: '/pages/ct/最佳实践/1网站地址.md' },
              { text: 'cocos38', link: '/pages/ct/最佳实践/cocos38.md' },
              { text: 'crypto', link: '/pages/ct/最佳实践/crypto.md' },
              {
                text: 'ct-bullect-template',
                link: '/pages/ct/最佳实践/ct-bullect-template.md',
              },
              { text: 'figma_ai', link: '/pages/ct/最佳实践/figma_ai.md' },
              {
                text: 'H5移动视频播放TS格式视频',
                link: '/pages/ct/最佳实践/H5移动视频播放TS格式视频.md',
              },
              {
                text: 'ie6和ie7通用居中',
                link: '/pages/ct/最佳实践/ie6和ie7通用居中.md',
              },
              { text: 'ie写法兼容', link: '/pages/ct/最佳实践/ie写法兼容.md' },
              { text: 'jest', link: '/pages/ct/最佳实践/jest.md' },
              { text: 'rsa', link: '/pages/ct/最佳实践/rsa.md' },
              {
                text: 'toFixed精度问题',
                link: '/pages/ct/最佳实践/toFixed精度问题.md',
              },
              {
                text: 'vue动态生成二维码',
                link: '/pages/ct/最佳实践/vue动态生成二维码.md',
              },
              { text: '高德地图', link: '/pages/ct/最佳实践/高德地图.md' },
              { text: '灰白调整', link: '/pages/ct/最佳实践/灰白调整.md' },
              { text: '居中', link: '/pages/ct/最佳实践/居中.md' },
              {
                text: '浏览器打开唯一',
                link: '/pages/ct/最佳实践/浏览器打开唯一.md',
              },
              { text: '设计模式', link: '/pages/ct/最佳实践/设计模式.md' },
              { text: '通用正则', link: '/pages/ct/最佳实践/通用正则.md' },
              { text: '网络问题', link: '/pages/ct/最佳实践/网络问题.md' },
              {
                text: '文件上传accept',
                link: '/pages/ct/最佳实践/文件上传accept.md',
              },
              {
                text: '详细版adminnew',
                link: '/pages/ct/最佳实践/详细版adminnew.md',
              },
              {
                text: '移动h5支付流程',
                link: '/pages/ct/最佳实践/移动h5支付流程.md',
              },
            ],
            collapsed: true,
          },
          {
            text: '工具技巧',
            items: [
              { text: 'fidder', link: '/pages/ct/工具技巧/fidder.md' },
              { text: 'md流程图', link: '/pages/ct/工具技巧/md流程图.md' },
              {
                text: '常用在线工具',
                link: '/pages/ct/工具技巧/常用在线工具.md',
              },
              { text: '调试工具', link: '/pages/ct/工具技巧/调试工具.md' },
              { text: '网址收藏', link: '/pages/ct/工具技巧/网址收藏.md' },
            ],
            collapsed: true,
          },
          {
            text: '培训',
            items: [
              { text: '在线', link: '/pages/ct/培训/在线.md' },
              { text: '架构设计1', link: '/pages/ct/培训/架构设计1.md' },
              { text: '架构设计2', link: '/pages/ct/培训/架构设计2.md' },
              { text: '架构设计3', link: '/pages/ct/培训/架构设计3.md' },
              { text: '架构设计4', link: '/pages/ct/培训/架构设计4.md' },
            ],
            collapsed: true,
          },
          {
            text: '其他',
            items: [
              { text: '前端自我评价', link: '/pages/ct/日常/前端自我评价.md' },
              {
                text: 'el-plus校验',
                link: '/pages/ct/负责人项目/el-plus校验.md',
              },
              { text: '浏览器判断', link: '/pages/ct/公共js/浏览器判断.md' },
            ],
            collapsed: true,
          },
        ],
        collapsed: true,
      },
      {
        text: '日常记录',
        items: [
          { text: '随机记录', link: '/pages/dailyRecord/index.md' },
          { text: 'c语言笔记', link: '/pages/dailyRecord/c语言笔记.md' },
          { text: '工具与部署记录', link: '/pages/ways.md' },
        ],
        collapsed: true,
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/HRS-1998/' }],
    outlineTitle: '页面目录',
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present yemei',
    },
  },
});
