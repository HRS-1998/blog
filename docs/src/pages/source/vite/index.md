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

上面代码中，有两个入口文件分别是<font color=red>src/home/index.ts、src/about/index.ts</font>；并设置 outbase 为 src，即相对于 ==src== 目录打包；打包后文件分别在<font color=red > out/home/index.ts、out/about/index.ts</font>

##### bundle

```ts
bundle: boolean;
```

如果是 true，将依赖项内联到文件本身中。 此过程是递归的，因此依赖项的依赖项也将被合并，默认情况下，ESbuild 不会捆绑输入文件，即为 false。对于动态的模块名不会合并而是和源码保持一致，如下

```ts
// Static imports (will be bundled by esbuild)
// Dynamic imports (will not be bundled by esbuild)
import "pkg";
import("pkg");
require("pkg");

import(`pkg/${foo}`);
require(`pkg/${foo}`);
["pkg"].map(require);
```

如果有多个入口文件，则会创建多个单独的文件，并合并依赖项。

##### sourcemap

```ts
sourcemap: boolean | string;
```

|     值     |                                                      含义                                                      |
| :--------: | :------------------------------------------------------------------------------------------------------------: |
|    true    |                   生成.js.map 并且生成的文件添加<font color=red>//# sourceMappingURL=</font>                   |
|   false    |                                                不使用 sourcemap                                                |
| 'external' |                               生成.js.map，生成的文件不添加//# sourceMappingURL=                               |
|  'inline'  |                                   不生成.js.map，source map 信息内联到文件中                                   |
|   'both'   | 'inline' + 'external'模式。生成.js.map，但是生成的文件信息不添加<font color=red>//# sourceMappingURL\= </font> |

##### define

关键词替换

```js
let js = 'DEBUG && require("hooks")';
require("esbuild").transformSync(js, {
  define: { DEBUG: "true" },
});
// {
//   code: 'require("hooks");\n',
//   map: '',
//   warnings: []
// }

require("esbuild").transformSync("id, str", {
  define: { id: "text", str: '"text"' },
});
//   {
//     code: 'text, "text";\n',
//     map: '',
//     warnings: []
//   }
```

##### loader

```bash
loader: string | object
# 可选值有：'js' | 'jsx' | 'ts' | 'tsx' | 'css' | 'json' | 'text' | 'base64' | 'file' | 'dataurl' | 'binary'
```

```ts
// build API 使用文件系统，需要根据后缀名去使用对应loader
require("esbuild").buildSync({
  loader: {
    ".png": "dataurl",
    ".svg": "text",
  },
});
// transform API 不实用文件系统，不需要使用后缀名。只能使用一个 loader，因为 transform API 只操作一个字符串
let ts = "let x: number = 1";
require("esbuild").transformSync(ts, {
  loader: "ts",
});
```

##### jsxFactory&jsxFragment

- jsxFactory：指定调用每个 jsx 元素的函数
- jsxFragment：Fragments 可以让你聚合一个子元素列表，并且不在 DOM 中增加额外节点

```ts
require("esbuild").transformSync("<div/>", {
  jsxFactory: "h", //默认为 React.CreateElement,可自定义, 如果你想使用 Vue 的 jsx 写法, 将该值换成为 Vue.CreateElement
  loader: "jsx", // 将 loader 设置为 jsx 可以编译 jsx 代码
});

// 同上，默认为 React.Fragment , 可换成对应的 Vue.Fragment。
require("esbuild").transformSync("<>x</>", {
  jsxFragment: "Fragment",
  loader: "jsx",
});
```

如果是 tsx 文件，可以通过在 tsconfig 中添加这个来为 TypeScript 配置 JSX。ESbuild 会自动拾取它，而不需要配置

```ts
{
  "compilerOptions": {
    "jsxFragmentFactory": "Fragment",
    "jsxFactory": "h"
  }
}
```

##### assetNames

如果静态资源的 loader 设置的是 file，则可以通过次属性重新定义静态资源的位置和名称

```js
require("esbuild").buildSync({
  entryPoints: ["app.js"],
  assetNames: "assets/[name]-[hash]",
  loader: { ".png": "file" }, // 必须
  bundle: true,
  outdir: "out",
});
```

如果代码引入了 3.png，则打包后图片的位置是 out/assets/3-hash 值.png

提供了 3 个占位符

[name]：文件名
[dir]：从包含静态文件的目录到 outbase 目录的相对路径
[hash]：hash 值，根据内容生成的 hash 值

##### chunkNames

```js
require("esbuild").buildSync({
  entryPoints: ["app.js"],
  chunkNames: "chunks/[name]-[hash]",
  bundle: true,
  outdir: "out",
  splitting: true, // 必须
  format: "esm", // 必须
});
```

有两个占位符

[name]：文件名
[hash]：hash 值，根据内容生成的 hash 值

现在测试发现一个问题，就是如果两个入口文件引用了同一张图片，配置代码分割和 assetNames 的话，会打包出一个 js 文件和一个图片文件，图片文件放在了 assetNames 对应的目录下，而 js 文件放在了 chunkNames 对应的目录下，这个 js 文件内部导出了这个图片文件，如下

```js
// 3.jpg
var __default = "../assets/3-FCRZLGZY.jpg";

export { __default };
```

##### entryPoints&entryNames

entryPoints
作用：指定构建的入口文件（必需配置项）

```js
// 基础用法 (数组形式)
build({
  entryPoints: ["src/a.ts", "src/b.ts"],
});

// 高级用法 (对象形式) key为输出文件名，value为入口文件路径
build({
  entryPoints: {
    "output-a": "src/a.ts", // 输出文件名为 output-a.js
    "nested/output-b": "src/b.ts", // 输出到 nested/output-b.js
  },
});
```

entryNames
作用：控制输出文件的命名规则（可选配置项）

```js
// 添加哈希值
build({
  entryNames: "[name]-[hash]",
  outdir: "dist",
});
// 输出示例：dist/a-7S2GQF5Q.js

// 按目录结构保持路径
build({
  entryNames: "path/[name]",
  outdir: "dist",
});
// 输出示例：dist/path/a.js
```

组合结合使用

```js
build({
  entryPoints: {
    main: "src/index.ts",
    admin: "src/admin/panel.ts",
  },
  entryNames: "[dir]/[name]-[hash]",
  outdir: "dist",
  bundle: true,
});
// dist/main-7S2GQF5Q.js
// dist/admin/panel-9X3KTP2B.js
```

##### metafile

对打包到一起的文件生成依赖图，存放在下述的 res.metafile 中

- 如果配置项 bundle 为 false，生成的依赖图只包含入口文件和入口文件中的引入文件
- 如果配置项 bundle 为 true，打包到一起的文件都会包含在依赖图中，如下

```js
const res = require("esbuild")
  .build({
    entryPoints: ["index.js"],
    bundle: true, // 设置为 true
    metafile: true,
    format: "esm",
    outdir: "dist",
  })
  .then((res) => {
    console.log(res);
  });

/*
metafile: {
    "inputs": {
        "b.js": { "bytes": 18, "imports": [] },
        "a.js": {
            "bytes": 54,
            "imports": [{ "path": "b.js", "kind": "import-statement" }]
        },
        "index2.js": {
            "bytes": 146,
            "imports": [{ "path": "a.js", "kind": "dynamic-import" }] // index.js 中导入的文件
        }
    },
    "outputs": {
        "dist/index2.js": {
            "imports": [],
            "exports": [],
            "entryPoint": "index2.js",
            "inputs": {
                "b.js": { "bytesInOutput": 78 },
                "a.js": { "bytesInOutput": 193 },
                "index2.js": { "bytesInOutput": 184 }
            },
            "bytes": 1017
        }
    }
}
*/
```

如果某个文件引入了第三方库，生成的 res.metafile 也会包含第三方库的地址，Vite 中实现了一个插件，目的是不将第三方库打包到 bundle 中，依然通过引入的方式加载

```js
const externalizeDep = {
  name: "externalize-deps",
  setup(build) {
    // 如果返回值为 undefined，则会调用下一个 onResolve 注册的回调，反之不会继续向下执行
    build.onResolve({ filter: /.*/ }, (args) => {
      const id = args.path;
      // 如果是外部模块
      if (id[0] !== "." && !path.isAbsolute(id)) {
        return {
          external: true, // 将此设置为 true，将该模块标记为第三方模块，这意味着它将不会包含在包中，而是在运行时被导入
        };
      }
    });
  },
};
```

## esbuild 插件

```js
export default {
  name: "env",
  setup(build) {},
};

//  name: 插件名称
//  setup函数： 插件的初始化函数，在构建开始时调用，可以进行一些初始化操作，如注册一些钩子函数，或者进行一些准备工作
//  build: 会包含一些钩子函数
```

- onStart :  
  开始构建时调用

- onResolve：  
  在 ESbuild 构建的每个模块的每个导入路径上运行。onResolve 注册的回调可以定制 ESbuild 如何进行路径解析

  ```ts
  interface OnResolveOptions {
    filter: RegExp;
    namespace?: string;
  }
  interface OnResolveArgs {
    path: string; // 导入文件路径，和代码中导入路径一致
    importer: string; // 绝对路径，该文件在哪个文件里被导入的
    namespace: string; // 导入文件的命名空间 默认值 'file'
    resolveDir: string; // 绝对路径，该文件在哪个目录下被导入
    kind: ResolveKind; // 导入方式
    pluginData: any; // 上一个插件传递的属性
  }
  type ResolveKind =
  | 'entry-point' # 入口文件
  | 'import-statement' # ESM 导入
  | 'require-call'
  | 'dynamic-import' # 动态导入 import ('')
  | 'require-resolve'
  | 'import-rule' # css @import 导入
  | 'url-token'

   interface OnResolveResult {
     errors?: Message[];
     external?: boolean; # 将此设置为 true，将该模块标记为外部模块，这意味着它将不会包含在包中，而是在运行时被导入
     namespace?: string; # 文件命名空间，默认为 'file'，表示 esbuild 会走默认处理
     path?: string; # 插件解析后的文件路径
     pluginData?: any; # 传递给下一个插件的数据
     pluginName?: string;
     warnings?: Message[];
     watchDirs?: string[];
     watchFiles?: string[];
   }

   interface Message {
     text: string;
     location: Location | null;
     detail: any; // The original error from a JavaScript plugin, if applicable
   }

   interface Location {
     file: string;
     namespace: string;
     line: number; // 1-based
     column: number; // 0-based, in bytes
     length: number; // in bytes
     lineText: string;
   }

     type Cb = (args: OnResolveArgs) => OnResolveResult;
     typeonResolve = ({}: OnResolveOptions, cb: Cb) => {};
  ```

  <font color=red>filter</font>: 必须，每个回调都必须提供一个过滤器，是一个正则表达式。当路径与此过滤器不匹配时，将跳过当前回调

  <font color=red>namespace</font>：可选，当路径与过滤器匹配时，同时模块命名空间页相同，则触发回调

  ==Demo==

  ```js
  const externalizeDep = {
    name: "externalize-deps",
    setup(build) {
      // 如果返回值为undefined,则会调用下一个onResolve注册的回调，反之不会继续向下执行
      build.onResolve({ filter: /.*/ }, (args) => {
        console.log(args);
        const id = args.path;
        // 如果是外部模块  path.isAbsolute()是否是绝对路径
        if (id[0] !== "." && !path.isAbsolute(id)) {
          return {
            external: true, // 将此设置为 true，将该模块标记为第三方模块，这意味着它将不会包含在包中，而是在运行时被导入
          };
        }
      });
    },
  };
  ```

- onLoad  
   <font color=red>非外部文件</font>加载完成后会触发 onLoad 注册的回调函数

  ```ts
  type Cb = (args: OnLoadArgs) => OnLoadResult;
  type onLoad = ({}: OnLoadOptions, cb: Cb) => {};
  // 参数， onResolve 相同
  interface OnLoadOptions {
    filter: RegExp;
    namespace?: string;
  }
  // 回调中传入的参数
  interface OnLoadArgs {
    path: string; // 被加载文件的绝对路径
    namespace: string; // 被加载文件的命名空间
    pluginData: any; // 上一个插件返回的数据
  }
  // 回调返回值
  interface OnLoadResult {
    contents?: string | Uint8Array; // 指定模块的内容。 如果设置了此项，则不会为此解析路径运行更多加载回调。 如果未设置，esbuild 将继续运行在当前回调之后注册的加载回调。 然后，如果内容仍未设置，如果解析的路径的命名空间为 'file'，esbuild 将默认从文件系统加载内容
    errors?: Message[];
    loader?: Loader; // 设置该模块的 loader，默认为 'js'
    pluginData?: any;
    pluginName?: string;
    resolveDir?: string; // 将此模块中的导入路径解析为文件系统上的真实路径时要使用的文件系统目录。对于'file'命名空间中的模块，该值默认为模块路径的目录部分。 否则这个值默认为空，除非插件提供一个。 如果插件不提供，esbuild 的默认行为将不会解析此模块中的任何导入。 此目录将传递给在此模块中未解析的导入路径上运行的任何解析回调。
    warnings?: Message[];
    watchDirs?: string[];
    watchFiles?: string[];
  }
  ```

  ==插件举例==

  假设如果通过 cdn 引入 lodash 的 add 方法，打包时将 lodash 中的代码加到 bundle 中

  ```js
  import add from "https://unpkg.com/lodash-es@4.17.15/add.js";
  console.log(add(1, 1));
  ```

  插件实现

```js
const axios = require("axios");
const httpUrl = {
  name: "httpurl",
  setup(build) {
    build.onResolve({ filter: /^https?:\/\// }, (args) => {
      return {
        path: args.path,
        namespace: "http-url",
      };
    });
    build.onoResolve({ filter: /.*/, namespce: "http-url" }, (args) => {
      return {
        path: new URL(args.path, args.importer).toString(),
        namespace: "http-url",
      };
    });
    build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
      const res = await axios.get(args.path);
      return {
        contents: res.data,
      };
    });
  },
};

require("esbuild").build({
  entryPoints: ["./text.ts"],
  outdir: "dist",
  bundle: true,
  format: "esm",
  plugins: [httpUrl],
});
```

- onEnd:
  打包完成后触发

> service
> esbuild 的 Service API 提供编程式调用打包能力的接口，适用于需要精细控制构建流程的场景。

```ts
const esbuild = require("esbuild");

// 启动服务
const service = await esbuild.startService();

try {
  // 执行构建
  const result = await service.build({
    entryPoints: ["src/index.js"],
    bundle: true,
    outfile: "dist/bundle.js",
    minify: true,
  });
} finally {
  // 关闭服务释放资源
  service.stop();
}
```

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
}
```

#### \_creatServer 方法详细解析

1. resolveConfig ------------ 解析配置

```js
// configLoader：'bundle' | 'runner' | 'native' = 'bundle'，控制vite如何加载配置文件
// bundle（默认值）,使用esbuild 打包配置文件
// runner 通过vite运行时模块加载器（runner) 导入，不需要打包配置文件，需要配置文件时ESM格式
// native  Node.js原生ESM导入，需要文件扩展名为.mjs或者type:module的package.json,最接近原生的Node.js行为
const { configFile } = config;
if (configFile !== false) {
   // 关于loadConfigFromFile
   // 先找到配置文件，通过fs.existAsync()
   // 如果找到配置文件，再看当前的configLoader类型，执行对应的方法
   // bundle: bundleAndLoadConfigFile ; runner：runnerImportConfigFile; native: nativeImportConfigFileawait
   // 假设当前为bundle,执行bundleAndLoadConfigFile方法，
   // 1.判断是否ESM格式： isESM =typeof process.versions.deno === 'string' || isFilePathESM(resolvedPath)
   // ---type为module,或文件为mjs,mts,或process.versions.deno存在，即为Deno环境下运行，Deno默认强制使用ESM格式
   // 2. 执行bundleConfigFile方法
   // 2.1 const isModuleSyncConditionEnabled = (await import('#module-sync-enabled')).default 值为false
   //  const dirnameVarName = '__vite_injected_original_dirname'
   //  const filenameVarName = '__vite_injected_original_filename'
   //  const importMetaUrlVarName = '__vite_injected_original_import_meta_url'           ------这几个变量后面被esbuild的define关键词替换了

   // 使用esbuild打包配置文件 ,用了两个插件
   //  插件1： "externalizze-deps", --- 作用是处理外部依赖。在`onResolve`钩子中，检查模块ID是否为绝对路径或Node内置模块，如果是则跳过。如果是非Node内置模块，则尝试使用Vite的解析器来解析路径，如果解析失败，可能抛出错误。特别是处理ESM和CJS的情况，如果尝试用`require`加载ESM模块，会报错提示。

   //插件2： "inject-file-scope-variables"  ---作用是 在加载文件时，注入了一些变量，如`__dirname`、`__filename`和`import.meta.url`的值，确保打包后的代码能正确引用原始文件路径。 最后，函数返回打包后的代码和依赖列表，依赖来自esbuild的metafile中的输入文件
  loadConfigFromFile(onfigEnv: ConfigEnv,configFile?: string,configRoot: string = process.cwd(),
  logLevel?: LogLevel,customLogger?: Logger,configLoader: 'bundle' | 'runner' | 'native' = 'bundle',);
}
```

2. server.ts

```ts
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
```

## webpack 自定义插件

## vite 自定义插件

## 浏览器自定义插件

## vscode 扩展插件

```

```
