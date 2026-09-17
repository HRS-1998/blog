# Webpack 配置详解（webpack.config.js）

> 每个配置项都标注了：作用、默认值、典型场景、易踩的坑。
> 配置文件执行时机：**在 webpack 启动时被 Node 直接 require**（CommonJS），
> 所以可以写任意 Node 逻辑，但不能用 ESM 语法（除非改 .mjs）。

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  // env：--env production / --env mode=staging 传入的变量
  // argv：{ mode, watch, ... } 命令行参数（mode 来自 --mode）
  const isProd = argv.mode === 'production';

  return {
    // ══════════════════════════════════════════
    // 一、入口与模式
    // ══════════════════════════════════════════

    // 打包入口。三种形态：
    // - 字符串（单页）
    // - 数组（多文件合并成一个 chunk，如 polyfill + 入口）
    // - 对象（多页应用，每个 key 一个 chunk）
    entry: {
      main: './src/main.js',
      // admin: './src/admin.js',
    },

    // 模式：'development' | 'production' | 'none'
    // 决定默认优化行为 + process.env.NODE_ENV 的 define 替换值
    // - development：eval sourceMap（快）、不压缩、模块名可读
    // - production：压缩、TreeShaking、splitChunks 默认配置
    // - none：什么都不开（手写优化时用）
    mode: isProd ? 'production' : 'development',

    // sourceMap 策略。常见值：
    // - 'eval-cheap-module-source-map'：dev 首选（快、能定位到源码行）
    // - 'source-map'：prod 经典（外挂 .map，最完整）
    // - 'hidden-source-map'：生成但不在产物引用（发 Sentry 不暴露）
    // - false：不出 map
    // 【坑】eval 包裹的代码无法压缩/TreeShake，dev/prod 差异大，
    //      所以 dev 正常不代表 prod 正常
    devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',

    // ══════════════════════════════════════════
    // 二、输出
    // ══════════════════════════════════════════

    output: {
      // 产物目录（绝对路径）
      path: path.resolve(__dirname, 'dist'),

      // 产物文件名模板。[name]=chunk名 [hash]=编译期hash [contenthash]=内容hash
      // 【缓存关键】长效缓存用 [contenthash]（内容不变文件名不变）；
      // [hash] 是整次编译一个值——改任何文件全部失效，只适合 dev
      filename: isProd ? 'assets/[name]-[contenthash].js' : '[name].js',

      // 非入口 chunk（动态 import 拆出的）的文件名
      chunkFilename: 'assets/[name]-[contenthash].js',

      // 资源文件（字体/图片）名
      assetModuleFilename: 'assets/[name]-[hash][ext][query]',

      // 按需加载 chunk 时的请求路径前缀（CDN 场景）
      publicPath: isProd ? 'https://cdn.example.com/app/' : '/',

      // 打包前是否清空 output.path。等价于 clean-webpack-plugin
      clean: true,

      // 【库开发】导出为 npm 包时的形态
      // library: { name: 'MyLib', type: 'umd' },
    },

    // ══════════════════════════════════════════
    // 三、模块解析（resolve）
    // ══════════════════════════════════════════

    resolve: {
      // import 省略后缀时的尝试顺序。自定义后缀要放前面
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],

      // 路径别名（等价 vite 的 resolve.alias）
      // 【坑】必须同步 tsconfig paths，否则 TS 报红
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },

      // bare import 的查找目录。monorepo 常加 '../../node_modules'
      modules: ['node_modules'],

      // 【去重】强制所有 import 都指向同一个版本的 React/Vue
      // 解决多实例问题（hooks 报 "Invalid hook call" 的常见原因）
      // alias: { react: path.resolve('./node_modules/react') },
    },

    // ══════════════════════════════════════════
    // 四、loader（module.rules）
    // ══════════════════════════════════════════

    module: {
      rules: [
        // ── JS/TS：babel（或用 esbuild/swc loader 提速数倍）──
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/, // 【性能】不排除的话全量过 babel，慢 10 倍
          use: {
            loader: 'babel-loader',
            options: {
              // 【坑】presets 在这里 vs .babelrc 的优先级问题：
              // 这里配置会覆盖项目 .babelrc，团队项目建议用配置文件
              presets: [
                ['@babel/preset-env', { useBuiltIns: 'usage', corejs: 3 }],
              ],
            },
          },
        },

        // ── CSS：链式 loader 从右到左执行 ──
        // 执行顺序：sass-loader → css-loader → MiniCssExtractPlugin.loader
        {
          test: /\.scss$/,
          use: [
            // prod：抽成独立 .css 文件；dev：style-loader 注 <style>（HMR 快）
            isProd ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader', // autoprefixer 等
              options: { postcssOptions: { plugins: ['autoprefixer'] } },
            },
            'sass-loader',
          ],
        },

        // ── CSS Modules ──
        {
          test: /\.module\.css$/,
          use: ['style-loader', {
            loader: 'css-loader',
            options: { modules: true }, // 类名 hash 化
          }],
        },

        // ── 静态资源（webpack 5 内置，替代 file-loader/url-loader）──
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              // 小于 8KB 内联 base64（等价 url-loader limit）
              maxSize: 8 * 1024,
            },
          },
        },

        // 【高频坑】loader 的 enforce：
        // 'pre'（最先）/ normal / 'inline'（内联）/ 'post'（最后）
        // eslint-loader 常配 enforce: 'pre'——lint 要在 babel 前看到原始代码
      ],
    },

    // ══════════════════════════════════════════
    // 五、插件（plugins）
    // ══════════════════════════════════════════
    // 【原理】plugin 基于 tapable 事件流：构造时注册 hooks 回调，
    // 编译到对应生命周期（make/seal/emit...）时被逐个调用。
    // loader = 文件转换器；plugin = 流程干预器

    plugins: [
      // 自动生成 index.html 并注入带 hash 的 <script>（多页就 new 多个）
      new HtmlWebpackPlugin({
        template: './public/index.html',
        // 注入的 script 加 preload（关键资源提前拉）
        inject: 'body',
      }),

      // CSS 抽离成独立文件（必须配上面的 MiniCssExtractPlugin.loader）
      new MiniCssExtractPlugin({
        filename: 'assets/[name]-[contenthash].css',
      }),

      // 无痕定义环境变量（编译期纯文本替换，同 vite 的 define）
      // 【坑】process.env.NODE_ENV 会被 mode 自动 define，不要重复定义
      new webpack.DefinePlugin({
        __APP_VERSION__: JSON.stringify('1.0.0'),
      }),

      // 可视化体积分析（定位大包第一步）
      // npx webpack --analyze 或此处直接 new
      // new BundleAnalyzerPlugin(),
    ],

    // ══════════════════════════════════════════
    // 六、优化（optimization）
    // ══════════════════════════════════════════

    optimization: {
      // 压缩。默认 production=true。false 用于调试产物
      minimize: isProd,

      minimizer: [
        // 压缩器可换：TerserPlugin（默认，慢但稳）/ EsbuildPlugin（快）
        // terser 的 drop_console 去 console（同 vite terserOptions）
      ],

      // 【TreeShaking 开关】标记未使用导出，配合压缩删除死代码
      // production 默认 true。前提：ESM（import/export），CJS 摇不掉
      usedExports: true,

      // 【分包】webpack 5 的 splitChunks 默认就不错（vendor 自动拆）
      // 自定义按需覆盖。动态 import() 也会自动拆 chunk（无需配置）
      splitChunks: {
        chunks: 'all', // 'async'默认只拆异步；'all' 连同步也拆
        // 【坑】chunks: 'all' 会把 node_modules 提前打进首屏
        minSize: 20000, // 小于 20KB 不值得单独成 chunk
        cacheGroups: {
          // 稳定的第三方拆出去，业务改动不影响它的缓存
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
          },
          // 被两个以上 chunk 共享的模块拆公共包
          common: { minChunks: 2, name: 'common', priority: -20 },
        },
      },

      // 模块 id 确定性：deterministic = 内容 hash（webpack 5 默认）
      // 【缓存关键】id 稳定 → 加一个模块不会导致所有 chunk hash 变
      moduleIds: 'deterministic',

      // 运行时代码抽成单独 chunk（多入口共享）
      runtimeChunk: 'single',
    },

    // ══════════════════════════════════════════
    // 七、持久缓存（webpack 5 提速神器）
    // ══════════════════════════════════════════
    // 【原理】把模块解析/转换结果缓存到 node_modules/.cache，
    // 二次构建只重构建变化的模块。提速 80%+ 的原因

    cache: {
      type: 'filesystem',
      buildDependencies: {
        // 配置文件本身变了 → 缓存全部失效（防旧缓存污染）
        config: [__filename],
      },
    },

    // ══════════════════════════════════════════
    // 八、devServer（webpack-dev-server）
    // ══════════════════════════════════════════

    devServer: {
      // 【原理】dev 不写盘：产物放内存，内存文件系统直接喂给 HTTP
      port: 8080,
      open: false, // 启动时自动开浏览器

      // dev 跨域代理（同 vite server.proxy）
      proxy: {
        '/api': {
          target: 'http://backend.local:3000',
          changeOrigin: true,
          pathRewrite: { '^/api': '' },
        },
      },

      // 【对比】热更新：
      // true + HMR runtime → 模块级热替换
      // webpack 5 内置（webpack-dev-server + HotModuleReplacementPlugin）
      hot: true,

      // HMR 失败时是否整页刷新兜底
      liveReload: true,

      // 编译出错全屏遮罩
      client: { overlay: true },

      // 打包产物本地预览（npm run build 后验证产物，不启 dev）
      // static: { directory: path.join(__dirname, 'dist') },

      // history 路由 404 兜底 → index.html
      historyApiFallback: true,
    },

    // ══════════════════════════════════════════
    // 九、其他
    // ══════════════════════════════════════════

    // 排除不打包、运行时从外部取（微前端/CDN 场景）
    // externals: { react: 'React', 'react-dom': 'ReactDOM' },

    // 监听模式（一般用 CLI --watch / dev-server，不在这里配）
    watch: false,

    // 性能预算线（超了告警，不影响产物）
    performance: {
      hints: isProd ? 'warning' : false,
      maxAssetSize: 500 * 1024,
    },
  };
};
```

## 高频问题速查

| 场景                             | 配置                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| 产物部署后白屏（路径 404）        | `output.publicPath`                                          |
| 改一行代码全部缓存失效           | `filename` 用 `[contenthash]`（不是 `[hash]`）+ `moduleIds: 'deterministic'` |
| 二次构建慢                       | `cache: { type: 'filesystem' }`                              |
| hooks 报 Invalid hook call      | `resolve.alias` 强制 react 单实例                            |
| babel 转译 node_modules 报错      | loader `exclude: /node_modules/`（需要转的用 include 单独配） |
| 图片想小图内联大图外链           | `type: 'asset'` + `dataUrlCondition.maxSize`                 |
| CSS 想独立文件而不是 `<style>`  | `MiniCssExtractPlugin.loader`（dev 用 style-loader 保留 HMR）|
| 多页应用                         | `entry` 对象 + 多个 `HtmlWebpackPlugin`                      |
| 第三方库走 CDN 不打包            | `externals`                                                  |
| 发 Sentry 又不想暴露 sourcemap   | `devtool: 'hidden-source-map'`                               |
| 打包体积分析                    | `BundleAnalyzerPlugin`                                       |

## 与 Vite 配置的对应关系（面试迁移用）

| 语义              | Webpack                          | Vite                        |
| ----------------- | -------------------------------- | --------------------------- |
| 路径别名          | `resolve.alias`                  | `resolve.alias`             |
| 省略后缀          | `resolve.extensions`             | `resolve.extensions`        |
| 环境变量注入      | `DefinePlugin`                   | `define`                    |
| 代理跨域          | `devServer.proxy`                | `server.proxy`              |
| 小图内联          | `asset` + `dataUrlCondition`     | `assetsInlineLimit`         |
| 抽 CSS           | `MiniCssExtractPlugin`           | 默认行为（`cssCodeSplit`）  |
| 手动分包          | `splitChunks.cacheGroups`        | `rollupOptions.manualChunks`|
| 长效缓存 hash     | `[contenthash]`                  | `[hash]`（内容 hash）       |
| dev 跨域          | `devServer.proxy`                | `server.proxy`              |
| 构建缓存          | `cache: filesystem`              | `cacheDir`（预构建缓存）    |

> 核心差异：webpack 用 loader 处理一切文件，Vite dev 用原生 ESM + 按需转换
> （不需要 loader 链），build 才走 Rollup 插件体系。所以 Vite dev 快不是
> 优化好，是根本不打包。
