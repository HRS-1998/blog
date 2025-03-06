#### vite 源码调试

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

#### webpack 自定义插件

#### vite 自定义插件

#### 浏览器自定义插件

#### vscode 扩展插件
