# Vite 配置详解（vite.config.ts）

> 每个配置项都标注了：作用、默认值、典型场景、易踩的坑。
> 配置文件的执行时机：**在 dev server / build 启动前先被 Vite 自己打包成 ESM 再执行**
> （所以里面可以 import TS、可以 import npm 包，但不能 import 项目源码里的业务代码）。

```ts
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// defineConfig 只是提供类型提示，不包一层也行，但 IDE 补全很重要
export default defineConfig(({ command, mode }) => {
  // command: 'serve'（dev）| 'build' —— 同一份配置区分环境的关键
  // mode: 'development' | 'production' | 自定义（--mode staging 等）

  // ─────────────────────────────────────────────
  // loadEnv：读取 .env 文件（第三个参数是前缀过滤）
  // .env                → 所有模式都加载
  // .env.local          → 所有模式，git 忽略（放私密配置）
  // .env.[mode]         → 对应模式
  // .env.[mode].local   → 对应模式 + git 忽略
  // 加载优先级：local > [mode] > 默认，后者被前者覆盖
  // ─────────────────────────────────────────────
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // ══════════════════════════════════════════
    // 一、共享配置（dev + build 都生效）
    // ══════════════════════════════════════════

    // 项目根目录（index.html 所在处）。
    // 默认：process.cwd()。monorepo 中从子包启动时经常需要显式指定
    root: path.resolve(__dirname, '.'),

    // 开发/构建时的基础公共路径。
    // - '/'（默认）：部署在域名根
    // - './'：相对路径，产物可放任意子目录（但 history 路由的 SPA 不友好）
    // - '/my-app/'：部署在子路径，所有资源 URL 前缀会拼上它
    // - 也可为 CDN：'https://cdn.example.com/my-app/'
    base: '/',

    // 模式：决定 .env.[mode] 文件名 和 import.meta.env.MODE 的值
    // 注意：mode ≠ NODE_ENV！mode 是"构建场景"，NODE_ENV 是"库行为开关"（react 警告等）
    mode: 'development',

    // 静态资源目录。这里的文件 dev 时直接在 / 访问，build 时原样拷贝到 outDir。
    // 【坑】public 里的资源必须用绝对路径引用（/logo.png），
    //      且 public 下不参与打包优化（不会 hash、不做 import 分析）
    publicDir: 'public',

    // 缓存目录（预构建产物 + 中间转换缓存在这里）
    cacheDir: 'node_modules/.vite',

    // 解析配置
    resolve: {
      // import 导入省略后缀。注意：自定义后缀要放在数组前面，否则冲突
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],

      // 路径别名，等价于 tsconfig.json 的 paths + baseUrl
      // 【坑】必须同步配置 tsconfig 的 paths，否则 TS 类型检查会红
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@comps': path.resolve(__dirname, 'src/components'),
      },

      // 只保留 type: 'module' 的包的 ESM 版本（默认 true，特殊场景关闭）
      dedupe: [],
    },

    // CSS 处理
    css: {
      // postcss.config.js 之外的行内配置（两者二选一，文件优先）
      postcss: {},

      // 预处理器共享配置（scss/less/styl）
      preprocessorOptions: {
        scss: {
          // 【高频】自动注入全局变量/mixin，省掉每个文件 @import
          // additionalData: `@use "@/styles/vars.scss" as *;`
          // 【工程化】modern-compiler API + silenceDeprecations 消除 sass 新版警告
          api: 'modern-compiler',
        },
      },

      // CSS Modules（*.module.css）配置
      modules: {
        // 生成的类名格式：name__local___hash —— 方便调试
        generateScopedName: '[name]__[local]___[hash:base64:5]',
        // 【坑】这里只对 .module.css 生效；普通 .css 想加 scope 用 Vue scoped / CSS 变体框架
      },

      // dev 时是否开启 sourcemap（build 的在 build.sourcemap）
      devSourcemap: false,
    },

    // JSON 文件处理：named 则 import { field } from './x.json'
    json: {
      namedExports: true,
      stringifyIfExports: null,
    },

    // ══════════════════════════════════════════
    // 二、服务配置（dev 专属）
    // ══════════════════════════════════════════
    server: {
      // 端口。设为 true 表示端口被占时自动 +1（默认 false，占用直接报错退出）
      port: 5173,
      strictPort: false,

      // dev 服务器监听地址：
      // - 'localhost'（默认）只本机访问
      // - true / '0.0.0.0' 局域网可访问（手机真机联调必开）
      host: 'localhost',

      // 启动时自动打开浏览器。还可以传 { app: { name: 'chrome' } } 指定浏览器
      open: false,

      // 代理：解决 dev 跨域。/change 环境变量化是最常见的工程实践
      // 【原理】浏览器 → vite dev server → 转发到 target
      //        浏览器看到的都是 localhost:5173 同源，没有跨域
      proxy: {
        // 简写：路径匹配 /api 时替换 target 并转发
        '/api': {
          target: 'http://backend.local:3000',
          changeOrigin: true, // 关键：把请求头 Host 改成 target 的（绕过服务端域名校验）
          // 重写路径：/api/users → /users（去掉前缀）
          rewrite: (p) => p.replace(/^\/api/, ''),
          // 只代理 http，ws: true 才代理 WebSocket
          ws: false,
        },
      },

      // HMR 配置
      hmr: {
        // overlay: false,   // 关掉报错时的全屏遮罩
        // port: 24678,      // WS 单独端口（穿透代理/容器网络时有用）
      },

      // 【大屏/多显示器】HTTPS：mkcert 生成证书后开启
      // https: { key: './certs/key.pem', cert: './certs/cert.pem' },

      // 监听文件变化的方式。true 用 chokidar 的轮询（VM/网络盘/WSL 下保存不触发 HMR 时开）
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**'],
      },

      // 预热：启动后立刻转换这些文件（打开首页更快，冷启动优化的常见手段）
      warmup: {
        clientFiles: ['./src/main.ts', './src/App.vue'],
      },
    },

    // ══════════════════════════════════════════
    // 三、构建配置（build 专属）
    // ══════════════════════════════════════════
    build: {
      // 产物目录。Git 提交前记得清理
      outDir: 'dist',

      // outDir 非空时的清理策略：true 删掉 | 'ignore' 保留（CI 缓存场景）
      emptyOutDir: true,

      // sourcemap：
      // - false（默认）
      // - true：构建（无转换）
      // - 'hidden'：生成但不在产物里引用（发给 Sentry 又不暴露给用户）
      // - 'inline'：内联进 JS（体积大，仅小项目）
      sourcemap: false,

      // 目标运行环境：产物语法降级下限
      // 'modules'（默认）≈ 支持 ESM 的现代浏览器；'es2015' 兼容更老
      target: 'modules',

      // 资源内联阈值（字节）。小于它的资源转 base64 内联，减少请求数
      // 设 0 禁用（要 SVG 雪碧图等场景）
      assetsInlineLimit: 4096,

      // CSS 代码分割：
      // true（默认）异步 chunk 的 CSS 单独成文件，按需加载
      // false 合并成一个文件 —— 引入库（不希望使用方按需加载样式）时设 false
      cssCodeSplit: true,

      // 是否把警告当错误（CI 超大 chunk 提示会直接 fail）
      reportCompressedSize: true, // 构建日志显示 gzip 后体积（大项目关掉提速）

      // chunk 大小告警线（KB）。只是告警不影响产物；配合 manualChunks 拆包
      chunkSizeWarningLimit: 500,

      // Rollup 透传配置（Vite build 底层就是 Rollup）
      rollupOptions: {
        // 多页应用：每个 html 是一个入口（SPA 单页可以不配）
        input: {
          main: path.resolve(__dirname, 'index.html'),
          // admin: path.resolve(__dirname, 'admin/index.html'),
        },

        // 产物输出定制
        output: {
          // 文件名带 hash：长效缓存的关键（内容变 → 文件名变 → 缓存失效）
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },

        // 【高频】手动分包：把稳定的第三方依赖拆出去，业务代码改动不影响它们的缓存
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts') || id.includes('zrender'))
              return 'echarts';
            if (id.includes('vue') || id.includes('pinia')) return 'vue-vendor';
            return 'vendor';
          }
        },
        // 【坑】manualChunks 拆不好的副作用：
        //   1. 被拆模块如果只被异步路由用，会提前加载（首屏变慢）
        //   2. 把相互依赖的模块拆开可能引起循环初始化
        //   优先用 动态 import() 自动分包，手动分包是最后手段
      },

      // 压缩：
      // - true（默认）：esbuild 压缩（快）
      // - false：不压缩（调试产物）
      // - 'terser'：换 terser（压缩率略高但慢，需要 sideEffects 配置配合更好）
      minify: true,

      // terser 专用配置（minify: 'terser' 时生效）
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true }, // 去掉 console
      },
    },

    // ══════════════════════════════════════════
    // 四、依赖预构建
    // ══════════════════════════════════════════
    optimizeDeps: {
      // 【高频坑】强制预构建。解决：
      //   1. 深层导入没被扫描到（如 import xx from 'lib/dist/esm/xxx'）
      //   2. CJS 包在运行时才报 "does not provide an export named ..."
      include: ['lodash-es', 'dayjs', 'echarts/core'],

      // 排除预构建（保持源码形态）。库开发/monorepo 本地依赖常配
      exclude: ['@my/local-lib'],

      // 强制全量重新预构建（调试用）。每次修改这个值都会触发重构建
      force: false,

      // 持久依赖排除（不写入缓存，每次请求都处理）
      // holdUntilCrawlEnd: true,
    },

    // ══════════════════════════════════════════
    // 五、插件
    // ══════════════════════════════════════════
    plugins: [
      // 单文件组件支持。enforce: 'pre' —— 必须在 Vite 核心转换前处理 .vue
      vue(),

      // 虚拟模块（import virtual:config 拿到构建期生成的数据）：
      // {
      //   name: 'virtual-config',
      //   enforce: 'pre',
      //   resolveId(id) { if (id === 'virtual:config') return '\0virtual:config'; },
      //   load(id) { if (id === '\0virtual:config') return `export default ${JSON.stringify(env)}`; },
      // },

      // 【面试点】插件钩子执行顺序：
      //   Alias → enforce:'pre' → Vite 核心 → normal 插件 → enforce:'post' → build
      // Vite 独有钩子（Rollup 没有）：
      //   configureServer  —— 拿到 dev server 实例（加自定义中间件/WS）
      //   transformIndexHtml —— 转换 index.html（注入 script/meta）
      //   handleHotUpdate —— 拦截 HMR（自定义热更新行为）
    ],

    // ══════════════════════════════════════════
    // 六、define —— 全局常量替换（面试高频）
    // ══════════════════════════════════════════
    // 【原理】编译期纯文本替换（类似 C 的 #define），不是运行时变量。
    // 这就是 import.meta.env.MODE 零成本的原理，也是 react 生产包能被
    // tree-shake 掉 dev 警告的原因（process.env.NODE_ENV 变 'production' 后死分支消除）
    define: {
      __APP_VERSION__: JSON.stringify('1.0.0'),
      // 【坑】值必须是 JSON 序列化后的字符串或合法 JS 表达式：
      //   '1.0.0'   ❌ 会被当成标识符 1.0.0（语法错误）
      //   '"1.0.0"' ✅（JSON.stringify 的结果）
      //   'true' / '(() => {})' 这类表达式也合法
    },

    // ══════════════════════════════════════════
    // 七、SSR / 环境
    // ══════════════════════════════════════════
    // SSR 构建时哪些依赖不走打包（保持 ESM 原样 require）
    ssr: {
      noExternal: ['element-plus'],
    },

    // 环境变量暴露控制：默认只有 VITE_ 前缀才暴露给 import.meta.env
    // 【安全边界】envPrefix 之外的变量（如 DATABASE_PASSWORD）绝不进前端代码
    envPrefix: 'VITE_',

    // 覆盖 Worker 的打包格式（'iife' | 'es'）
    worker: {
      format: 'es',
    },

    // 日志级别：'info' | 'warn' | 'error' | 'silent'
    logLevel: 'info',

    // 清屏：dev 热更时终端是否清空（贴日志排查时设 false）
    clearScreen: true,
  };
});
```

## 高频问题速查

| 场景                             | 配置                                               |
| -------------------------------- | -------------------------------------------------- |
| dev 跨域调后端                   | `server.proxy`                                     |
| 手机真机联调                     | `server.host: true`                                |
| `@` 别名报红                     | `resolve.alias` + tsconfig `paths` 双配            |
| 首屏大 chunk 告警                | `build.rollupOptions.manualChunks` 或改动态 import |
| 深层导入报 export 错             | `optimizeDeps.include`                             |
| 想在配置里用环境变量             | `loadEnv(mode, cwd, '')`                           |
| 产物部署在子路径                 | `base: '/my-app/'`                                 |
| 全局常量被当变量                 | `define` 值要 `JSON.stringify`                     |
| WSL/网络盘 HMR 失灵              | `server.watch: { usePolling: true }`               |
| Sentry 需要 sourcemap 又不想暴露 | `build.sourcemap: 'hidden'`                        |
