# Esbuild 使用

## 一、 esbuild 和 rollup 在 vite 中的使用

[参考文档](https://juejin.cn/post/7043777969051058183)

1. vite 在 4 版本中 dev 使用的仍是 esbuild,生产打包使用的是 rollup；
2. esbuild 提供原生的 ESM，生产不使用是由于 Vite 目前的插件 API 与使用 esbuild 作为打包器并不兼容
3. vite 在 v4 中将解析器切换到了 swc(rust 编写),同时目前正在基于 rust 开发 名为 rollDown 的构建工具，可以替代 rollup 和 esbuild

```bash
# 入口文件 esbuild index.js
# --outfile 输出文件
# --define:TEST=12 环境变量
# --format=cjs 编译后的模块规范
# --bundle 将第三方库打包到一起
# --platform=[node/browser] 指定编译后的运行环境
# --target=esnext
# --loader:.png=dataurl 将 png 转换成base64的形式，需要与 --bundle 一起使用
```

## 二、esbuild 对 js 调用，提供的 API

> transform API:
> transform/transformSync 对单个字符串进行操作，不需要访问文件系统。非常适合在没有文件系统的环境中使用或作为另一个工具链的一部分

```ts
// 1. 同步transformSync(str: string, options?: Config): Result
// 2. 异步transform(str: string, options?: Config)：Promise<Result>
interface Result {
	warnings: string[] # 警告信息
	code: string # 编译后的代码
	map: string # source map
}

require('esbuild').transformSync('let x: number = 1', {
    loader: 'ts',
  })
//   =>
//   {
//     code: 'let x = 1;\n',
//     map: '',
//     warnings: []
//   }


```

Config 配置[官网](https://esbuild.github.io/api/)

```ts
interface Config {
  define: object; // 关键词替换
  format: string; // js 输出规范（iife/cjs/esm）
  loader: string | object; // transform API 只能使用 string
  minify: boolean; // 压缩代码，包含删除空格、重命名变量、修改语法使语法更简练
  // 通过以下方式单独配置，上述功能
  minifyWhitespace: boolean; // 删除空格
  minifyIdentifiers: boolean; // 重命名变量
  minifySyntax: boolean; // 修改语法使语法更简练
  sourcemap: boolean | string;
  target: string[]; // 设置目标环境，默认是 esnext（使用最新 es 特性）
}
```

> build API
> Build API 调用对文件系统中的一个或多个文件进行操作。这使得文件可以相互引用，并被编译在一起（需要设置 bundle: true）

Config 配置

```ts
interface Config {
  bundle: boolean       // 将所有源码打包到一起
  entryPoints: string[] | object       // 入口文件，通过对象方式可以指定输出后文件名，和 webpack 类似
  outdir: string       // 输出文件夹，不能和 outfile 同时使用；多入口文件使用 outdir
  outfile: string       // 输出的文件名，，不能和 outdir 同时使用；单入口文件使用 outfile
  outbase: string       // 每个入口文件构建到不同目录时使用
  define: object       // define = {K: V}  在解析代码的时候用V替换K
  platform: string # 指定输出环境，默认为 browser 还有一个值是 node，
  format: string       // js 输出规范（iife/cjs/esm），如果 platform 为 browser，默认为 iife；如果 platform 为 node，默认为 cjs
  splitting: boolean       // 代码分割(当前仅限 esm模式)
  loader: string | object // transform API 只能使用 string
  minify: boolean       // 压缩代码，包含删除空格、重命名变量、修改语法使语法更简练
        // 通过以下方式单独配置，上述功能
  minifyWhitespace: boolean       // 删除空格
  minifyIdentifiers: boolean       // 重命名变量
  minifySyntax: boolean       // 修改语法使语法更简练
  sourcemap: boolean | string
  target: string[]       // 设置目标环境，默认是 esnext（使用最新 es 特性）
  jsxFactory: string       // 指定调用每个jsx元素的函数
  jsxFragment: string       // 指定聚合一个子元素列表的函数
  assetNames: string       // 静态资源输出的文件名称（默认是名字加上hash）
  chunkNames: string       // 代码分割后输出的文件名称
  entryNames: string       // 入口文件名称
  treeShaking: string       // 默认开启，如果设置 'ignore-annotations'，则忽略 /* @__PURE__ */ 和 package.json 的 sideEffects 属性
  tsconfig: string       // 指定 tsconfig 文件
  publicPath: string       // 指定静态文件的cdn，比如 https://www.example.com/v1 （对设置loader为file 的静态文件生效）
  write: boolean       // 默认 false，对于cli和js API，默认是写入文件系统中，设置为 true 后，写入内存缓冲区
  inject: string[]       // 将数组中的文件导入到所有输出文件中
  metafile: boolean       // 生成依赖图
}
```

```ts
// buildSync(options: Config):buildResult
// buildSync(options: Config):Promise<buildResult>
interface BuildResult {
  warnings: Message[];
  outputFiles?: OutputFile[]; // 只有在 write 为 false 时，才会输出，它是一个 Uint8Array
}
// 示例
require("esbuild")
  .build({
    entryPoints: ["index.js"],
    bundle: true,
    metafile: true,
    format: "esm",
    outdir: "dist",
    plugins: [],
  })
  .then((res) => {
    console.log(res);
  });
```

#### 常用配置

##### outbase

```ts
outbase: string;
```

多入口文件在不同目录时，那么相对于 outbase 目录，目录结构将被复制到输出目录中

```ts
require("esbuild").buildSync({
  entryPoints: ["src/pages/home/index.ts", "src/pages/about/index.ts"],
  bundle: true,
  outdir: "out",
  outbase: "src",
});
```

上面代码中，有两个入口文件分别是<span style="color:red">src/home/index.ts、src/about/index.ts</span>；并设置 outbase 为 src，即相对于 ==src== 目录打包；打包后文件分别在<span style="color:red"> out/home/index.ts、out/about/index.ts</span>

##### bundle

```ts
bundle: boolean;
```

如果是 true，将依赖项内联到文件本身中。 此过程是递归的，因此依赖项的依赖项也将被合并，默认情况下，ESbuild 不会捆绑输入文件，即为 false。对于动态的模块名不会合并而是和源码保持一致，如下

```ts
// Static imports (will be bundled by esbuild)
import "pkg";
import("pkg");
require("pkg");

// Dynamic imports (will not be bundled by esbuild)
import(`pkg/${foo}`);
require(`pkg/${foo}`);
["pkg"].map(require);
```

如果有多个入口文件，则会创建多个单独的文件，并合并依赖项。

> service

## vite 源码调试

从 npm run dev 开始深入 vite 源码

1. vite/bin/vite.js 入口 // 启动 vite

<!-- 命令行参数 -->

process.argv

<!-- 判断是否是 vite 命令 -->

string.startsWith('vite')

<!-- ts内置 -->

```ts
Omit<T, K extends keyof T> //去掉 T 中的 K 属性

Pick<T, K extends keyof T> //保留 T 中的 K 属性

Record<K extends string, T> //构造一个 K-T 的对象 创建键类型为 Keys，值类型为 Type 的对象类型

Partial<T> //构造一个 T 的部分属性

Required<T> //构造一个 T 的必填属性

```

```js
import module from 'node:module';
function start(){
    try{
        module.enableComplieCache?()
    }catch(e){}
   return import("../dist/node/cli.js")
}

```

2. cli.ts

```js
stopProfilerh(); //性能分析函数 cup profile

filterDuplicateOptions(); //过滤重复选项

/**  a.清理全局选项, 
     b.将字符串sourcemap 转为 boolean(sourcemap: "true"/"false")或 ret.sourcemap;
     c.初始化watch ret.watch = watch ? {}:undefined
 */
cleanGlobalCLIOptions();

cleanBuildOptions(); //清理构建选项
```

引用 cac 库

```js
// 注册选项
cli.option("-f,--filter <filter>", "filter files by pattern");

// 注册命令 []可选参数 <>必选参数
cli
  .command("[root]", "start dev server")
  .alias("dev")
  .option("-o,--open", "open browser on startup")
  .option("-p,--port <port>", "use specified port")
  .action(
    async (root: string, options: { force?: boolean } & GlobalCLIOptions) => {
      //针对选项使用最上面定义的函数进行处理
    }
  );

// cli.option 用于注册全局选项
// cli.command().option() 用于注册特定命令选项
```

<!-- 注册了 dev ,build, optimize,preview 命令 -->

> dev

```js
 const {createServer} = await import('./server')
 function createServer(inlineConfig:InlineConfig=>{}):Promise<ViteDevServer>{
    return _createServer(inlineConfig,{listen:true})
 }
 function _createServer(inlineConfig:InlineConfig,options:ServerOptions):Promise<ViteDevServer>{
      resolveConfig(inlineConfig,"serve") //解析配置
      initPublicFiles() //初始化静态文件
      resolveHttpsConfig() //解析https配置
      getResolvedOutDirs() //解析输出目录
      resolveEmptyOutDir() //解析空输出目录
      resolveChokidarOptions() //解析chokidar配置
      createWebSocketServer() //创建websocket服务
      watcher = watchEnabled? chokidar.watch(dirs, chokidarOptions) : createNoopWatcher() //创建文件监听器

      //关于enviroments ---client ---ssr
      resolveDevEnvironmentOptions() //解析环境变量

      debugger = createDebugger('vite:server')

/**
 * server/* 有关类
 *
 * - PluginContainer - 插件容器
 *   1.根据当前环境（client,ssr）选择对应的插件容器
 *   2.监听watchChange事件，监听模块的创建，更新和删除事件（仅支持客户端）
 *   3.加载指定模块，调用对应环境的load方法 load(id,options?)
 *   4.转换代码 transform(code ,id , options?)
 *
 *
 */
        /**
   * When the dev server is restarted, the methods are called in the following order:
   * - new instance `init`
   * - previous instance `close`
   * - new instance `listen`
   */






 }
```

3. server.ts

## webpack 自定义插件

## vite 自定义插件

## 浏览器自定义插件

## vscode 扩展插件
