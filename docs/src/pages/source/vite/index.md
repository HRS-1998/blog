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

process.argv [参考文档](https://vitejs.cn/vite5-cn/guide/cli.html)

```ts
//   这里解析了 --debug,--filter,--profile
//   --profile	启动内置的 Node.js 调试器（查看 性能瓶颈）
//   -d, --debug [feat]	显示调试日志 (string | boolean)
//   -f, --filter <filter>	过滤调试日志 (string)
//
// check debug mode first before requiring the CLI.
const debugIndex = process.argv.findIndex((arg) =>
  /^(?:-d|--debug)$/.test(arg)
);
const filterIndex = process.argv.findIndex((arg) =>
  /^(?:-f|--filter)$/.test(arg)
);
const profileIndex = process.argv.indexOf("--profile");

if (debugIndex > 0) {
  let value = process.argv[debugIndex + 1];
  if (!value || value.startsWith("-")) {
    value = "vite:*";
  } else {
    // support debugging multiple flags with comma-separated list
    value = value
      .split(",")
      .map((v) => `vite:${v}`)
      .join(",");
  }
  process.env.DEBUG = `${
    process.env.DEBUG ? process.env.DEBUG + "," : ""
  }${value}`;

  if (filterIndex > 0) {
    const filter = process.argv[filterIndex + 1];
    if (filter && !filter.startsWith("-")) {
      process.env.VITE_DEBUG_FILTER = filter;
    }
  }
}
```

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
  // 日志
  logLevel?: LogLevel,customLogger?: Logger,configLoader: 'bundle' | 'runner' | 'native' = 'bundle',);
  // 执行完loadConfigFromFile方法后，会返回一个对象，包含三个属性：{path:normalizePath(resolvedPath),config,dependencies}
}

 //  接下来是对插件plugins的处理
 // 这段代码的作用
 // 1.对用户提供的插件进行过滤，其中p.apply配置执行的环境如development,build,当为falsy值时在所有环境下执行，当为函数时，执行函数并传入当前环境（development,build）和配置环境（configEnv）作为参数，由插件开发者自行判断如果返回值为true，则表示该插件应该被应用，否则应该被忽略。
 //  2. asyncFlatten  拍平plugin,由于支持以下写法
 //  plugins: [
 //    plugin1,
 //    [plugin2, plugin3],
 //    { plugins: [plugin4] }
 //  ]

 // 3. sortUserPlugins  对插件进行分类，p.enforce:'pre'|'post' 将插件分为三个部分：prePlugins, normalPlugins, postPlugins


export interface Plugin {
  name: string;
  apply?: 'build' | 'serve' | ((config: UserConfig, env: ConfigEnv) => boolean);
  // ...其他钩子
}
 export async function asyncFlatten<T extends unknown[]>(
  arr: T,
): Promise<AsyncFlatten<T>> {
  do {
    arr = (await Promise.all(arr)).flat(Infinity) as any
  } while (arr.some((v: any) => v?.then))
  return arr as unknown[] as AsyncFlatten<T>
}
   const filterPlugin = (p: Plugin | FalsyPlugin): p is Plugin => {
    if (!p) {
      return false
    } else if (!p.apply) {
      return true
    } else if (typeof p.apply === 'function') {
      return p.apply({ ...config, mode }, configEnv)
    } else {
      return p.apply === command
    }
  }

  // resolve plugins
  const rawPlugins = (await asyncFlatten(config.plugins || [])).filter(
    filterPlugin,
  )

  const [prePlugins, normalPlugins, postPlugins] = sortUserPlugins(rawPlugins)

// 拿到处理后的plugins，执行runConfigHook方法
// getSortedPluginsByHook 将plugins按照pre,normal,post分别分类，然后根据插件的enforce属性进行排序
// runConfigHook 执行插件的config钩子，并返回处理后的配置,将vite.config.ts文件中的配置与插件中的config进行合并,返回合并后的config
async function runConfigHook(
  config: InlineConfig,
  plugins: Plugin[],
  configEnv: ConfigEnv,
): Promise<InlineConfig> {
  let conf = config

  for (const p of getSortedPluginsByHook('config', plugins)) {
    const hook = p.config
    const handler = getHookHandler(hook)
    const res = await handler(conf, configEnv)
    if (res && res !== conf) {
      conf = mergeConfig(conf, res)
    }
  }

  return conf
}

// 接下来定义一个logger日志对象
  const logger = createLogger(config.logLevel, {
      allowClearScreen: config.clearScreen,
      customLogger: config.customLogger,
    })

//接下来 对环境变量的一些处理，以及ssr环境下变量的处理
// 示例工作流程：
// Vite 解析出基础环境配置
// 遍历所有插件的 configEnvironment 钩子
// 对每个环境(client/ssr)依次调用插件钩子
// 插件可以返回该环境的增量配置
// 最终合并所有插件的修改，形成不同环境下的配置config


// load .env files 获取.env配置文件
//  /** default file */ `.env`,
//  /** local file */ `.env.local`,
//  /** mode file */ `.env.${mode}`,
//  /** mode local file */ `.env.${mode}.local`,
 const envDir = config.envDir
    ? normalizePath(path.resolve(resolvedRoot, config.envDir))
    : resolvedRoot
  const userEnv =
    inlineConfig.envFile !== false &&
    loadEnv(mode, envDir, resolveEnvPrefix(config))

// 对base路径进行处理
 // During dev, we ignore relative base and fallback to '/'
  // For the SSR build, relative base isn't possible by means
  // of import.meta.url.
  const resolvedBase = relativeBaseShortcut
    ? !isBuild || config.build?.ssr
      ? '/'
      : './'
    : resolveBaseUrl(config.base, isBuild, logger)


  // resolve cache directory  .vite 缓存目录
  const pkgDir = findNearestPackageData(resolvedRoot, packageCache)?.dir
  const cacheDir = normalizePath(
    config.cacheDir
      ? path.resolve(resolvedRoot, config.cacheDir)
      : pkgDir
        ? path.join(pkgDir, `node_modules/.vite`)
        : path.join(resolvedRoot, `.vite`),
  )

// 对config.assetsInclude字段进行处理，使用createFilter
// 是否视为静态资源，vite中对 KNOWN_ASSET_TYPES 类型的文件视为静态资源
//使用示例
// vite.config.js
{
  // 匹配 .glsl 文件和 /custom-assets/ 目录
  assetsInclude: ['**/*.glsl', /\/custom-assets\//]
}

/**
 * Constructs a filter function which can be used to determine whether or not
 * certain modules should be operated upon.
 * @param include If `include` is omitted or has zero length, filter will return `true` by default.
 * @param exclude ID must not match any of the `exclude` patterns.
 * @param options Optionally resolves the patterns against a directory other than `process.cwd()`.
 * If a `string` is specified, then the value will be used as the base directory.
 * Relative paths will be resolved against `process.cwd()` first.
 * If `false`, then the patterns will not be resolved against any directory.
 * This can be useful if you want to create a filter for virtual module names.
 */
export function createFilter(
  include?: FilterPattern,
  exclude?: FilterPattern,
  options?: { resolve?: string | false | null }
): (id: string | unknown) => boolean;

    const assetsFilter =
    config.assetsInclude &&
    (!Array.isArray(config.assetsInclude) || config.assetsInclude.length)
      ? createFilter(config.assetsInclude)
      : () => false



// 创建publicDir 公共目录
  const { publicDir } = config
  const resolvedPublicDir =
    publicDir !== false && publicDir !== ''
      ? normalizePath(
          path.resolve(
            resolvedRoot,
            typeof publicDir === 'string'
              ? publicDir
              : configDefaults.publicDir,
          ),
        )
      : ''


// resolveServerOptions是vite中解析服务器配置的方法，将用户配置config.server与默认配置进行合并，并进行路径解析和安全处理
// resolveBuilderOptions合并配置

  const server = resolveServerOptions(resolvedRoot, config.server, logger)

  const builder = resolveBuilderOptions(config.builder)

// createUserWorkerPlugins ,创建一个工作区域worker的插件环境，
//一些不打算在工作者捆绑中工作的插件（例如在构建时进行后处理）。
//而且插件也可能有缓存，这些缓存可能因用于这些额外的汇总调用而被损坏。
//所以我们需要将worker插件与vite需要运行的插件分开。

const createWorkerPlugins = async function (bundleChain: string[]) {
    // Some plugins that aren't intended to work in the bundling of workers (doing post-processing at build time for example).
    // And Plugins may also have cached that could be corrupted by being used in these extra rollup calls.
    // So we need to separate the worker plugin from the plugin that vite needs to run.
    const rawWorkerUserPlugins = (
      await asyncFlatten(createUserWorkerPlugins?.() || [])
    ).filter(filterPlugin)

    // resolve worker
    let workerConfig = mergeConfig({}, config)
    const [workerPrePlugins, workerNormalPlugins, workerPostPlugins] =
      sortUserPlugins(rawWorkerUserPlugins)

    // run config hooks
    const workerUserPlugins = [
      ...workerPrePlugins,
      ...workerNormalPlugins,
      ...workerPostPlugins,
    ]
    workerConfig = await runConfigHook(
      workerConfig,
      workerUserPlugins,
      configEnv,
    )

    const workerResolved: ResolvedConfig = {
      ...workerConfig,
      ...resolved,
      isWorker: true,
      mainConfig: resolved,
      bundleChain,
    }
    const resolvedWorkerPlugins = (await resolvePlugins(
      workerResolved,
      workerPrePlugins,
      workerNormalPlugins,
      workerPostPlugins,
    )) as Plugin[]

    // run configResolved hooks
    await Promise.all(
      createPluginHookUtils(resolvedWorkerPlugins)
        .getSortedPluginHooks('configResolved')
        .map((hook) => hook(workerResolved)),
    )

    return {
      ...workerResolved,
      plugins: resolvedWorkerPlugins,
    }
  }


//结合上述所有解析，定义一个resolved

 resolved = {
    configFile: configFile ? normalizePath(configFile) : undefined,
    configFileDependencies: configFileDependencies.map((name) =>
      normalizePath(path.resolve(name)),
    ),
    inlineConfig,
    root: resolvedRoot,
    base,
    decodedBase: decodeURI(base),
    rawBase: resolvedBase,
    publicDir: resolvedPublicDir,
    cacheDir,
    command,
    mode,
    isWorker: false,
    mainConfig: null,
    bundleChain: [],
    isProduction,
    plugins: userPlugins, // placeholder to be replaced
    css: resolveCSSOptions(config.css),
    json: mergeWithDefaults(configDefaults.json, config.json ?? {}),
    esbuild:
      config.esbuild === false
        ? false
        : {
            jsxDev: !isProduction,
            ...config.esbuild,
          },
    server,
    builder,
    preview,
    envDir,
    env: {
      ...userEnv,
      BASE_URL,
      MODE: mode,
      DEV: !isProduction,
      PROD: isProduction,
    },
    assetsInclude(file: string) {
      return DEFAULT_ASSETS_RE.test(file) || assetsFilter(file)
    },
    logger,
    packageCache,
    worker: resolvedWorkerOptions,
    appType: config.appType ?? 'spa',
    experimental: {
      importGlobRestoreExtension: false,
      hmrPartialAccept: false,
      ...config.experimental,
    },
    future: config.future,

    ssr,

    optimizeDeps: backwardCompatibleOptimizeDeps,
    resolve: resolvedDefaultResolve,
    dev: resolvedDevEnvironmentOptions,
    build: resolvedBuildOptions,

    environments: resolvedEnvironments,

    // random 72 bits (12 base64 chars)
    // at least 64bits is recommended
    // https://owasp.org/www-community/vulnerabilities/Insufficient_Session-ID_Length
    webSocketToken: Buffer.from(
      crypto.getRandomValues(new Uint8Array(9)),
    ).toString('base64url'),

    getSortedPlugins: undefined!,
    getSortedPluginHooks: undefined!,

    /**
     * createResolver is deprecated. It only works for the client and ssr
     * environments. The `aliasOnly` option is also not being used any more
     * Plugins should move to createIdResolver(environment) instead.
     * create an internal resolver to be used in special scenarios, e.g.
     * optimizer & handling css @imports
     */
    createResolver(options) {
      const resolve = createIdResolver(this, options)
      const clientEnvironment = new PartialEnvironment('client', this)
      let ssrEnvironment: PartialEnvironment | undefined
      return async (id, importer, aliasOnly, ssr) => {
        if (ssr) {
          ssrEnvironment ??= new PartialEnvironment('ssr', this)
        }
        return await resolve(
          ssr ? ssrEnvironment! : clientEnvironment,
          id,
          importer,
          aliasOnly,
        )
      }
    },
    // picomatch一个一个高速，精确的路径匹配工具，这里用于检测禁止访问路径
    // 示例： fsDenyGlob('.env.local') ---> 拒绝
    fsDenyGlob: picomatch(
      // matchBase: true does not work as it's documented
      // https://github.com/micromatch/picomatch/issues/89
      // convert patterns without `/` on our side for now
      server.fs.deny.map((pattern) =>
        pattern.includes('/') ? pattern : `**/${pattern}`,
      ),
      {
        matchBase: false,
        nocase: true,
        dot: true,
      },
    ),
    safeModulePaths: new Set<string>(),
    additionalAllowedHosts: getAdditionalAllowedHosts(server, preview),
  }
  resolved = {
    ...config,
    ...resolved,
  }


// 接下来解析plugins   :|  这里后续仔细看一下，先全局走通流程
//resolvePlugins函数  该函数是Vite插件系统的核心调度器，负责根据当前配置(config)、构建阶段(isBuild)和环境类型(isWorker)动态聚合所有Vite内置插件，并整合用户自定义插件，确保在开发或构建时正确的插件被加载，并且顺序正确，以处理不同的资源和功能。
 const resolvedPlugins = await resolvePlugins(
    resolved,
    prePlugins,
    normalPlugins,
    postPlugins,
  )

// 处理output和outDir   outputOption  resolvedBuildOutDir



```

|          配置          | 开发模式  | 生产构建  | SSR 构建  |
| :--------------------: | :-------: | :-------: | :-------: |
|        base: ''        | / (强制)  |    ./     |     /     |
|     base: 'assets'     | /assets/  | ./assets/ | /assets/  |
|   base: '/project/'    | /project/ | /project/ | /project/ |
| base: 'http://cdn.com' | 原样保留  | 原样保留  | 原样保留  |

2. initPublicFiles ------ 初始化公共文件 public

根据 config.publicDir 深度递归读取公共目录下的文件
去除公共前缀，使用 map 存储公共文件

```ts
const publicFiles = await initPublicFilesPromise;

export async function initPublicFiles(
  config: ResolvedConfig
): Promise<Set<string> | undefined> {
  let fileNames: string[];
  try {
    fileNames = await recursiveReaddir(config.publicDir);
  } catch (e) {
    if (e.code === ERR_SYMLINK_IN_RECURSIVE_READDIR) {
      return;
    }
    throw e;
  }
  const publicFiles = new Set(
    fileNames.map((fileName) => fileName.slice(config.publicDir.length))
  );
  publicFilesMap.set(config, publicFiles);
  return publicFiles;
}
```

3. resolveHttpsConfig 解析 httpsOptions

   ```ts
   const httpsOptions = await resolveHttpsConfig(config.server.https);

   export async function resolveHttpsConfig(
     https: HttpsServerOptions | undefined
   ): Promise<HttpsServerOptions | undefined> {
     if (!https) return undefined;
     const [ca, cert, key, pfx] = await Promise.all([
       readFileIfExists(https.ca),
       readFileIfExists(https.cert),
       readFileIfExists(https.key),
       readFileIfExists(https.pfx),
     ]);
     return { ...https, ca, cert, key, pfx };
   }
   ```

4. getResolveOutDirs resolveEmptyOutDir

// getResolveOutDirs 返回一个 Set,存储 config.build.rollupOptions.output 的值
// resolveEmptyOutDir 返回一个布尔值，表示是否需要创建空目录

```ts
const resolvedOutDirs = getResolvedOutDirs(
  config.root,
  config.build.outDir,
  config.build.rollupOptions.output
);
const emptyOutDir = resolveEmptyOutDir(
  config.build.emptyOutDir,
  config.root,
  resolvedOutDirs
);

export function getResolvedOutDirs(
  root: string,
  outDir: string,
  outputOptions: OutputOptions[] | OutputOptions | undefined
): Set<string> {
  const resolvedOutDir = path.resolve(root, outDir);
  if (!outputOptions) return new Set([resolvedOutDir]);

  return new Set(
    arraify(outputOptions).map(({ dir }) =>
      dir ? path.resolve(root, dir) : resolvedOutDir
    )
  );
}
export function resolveEmptyOutDir(
  emptyOutDir: boolean | null,
  root: string,
  outDirs: Set<string>,
  logger?: Logger
): boolean {
  if (emptyOutDir != null) return emptyOutDir;

  for (const outDir of outDirs) {
    if (!normalizePath(outDir).startsWith(withTrailingSlash(root))) {
      // warn if outDir is outside of root
      logger?.warn(
        colors.yellow(
          `\n${colors.bold(`(!)`)} outDir ${colors.white(
            colors.dim(outDir)
          )} is not inside project root and will not be emptied.\n` +
            `Use --emptyOutDir to override.\n`
        )
      );
      return false;
    }
  }
  return true;
}
```

5. resolveChokidarOptions 监听文件 options

```ts
/**
 * 返回 resolvedWatchOptions包含需要监听和忽略的文件路径
 resolvedWatchOptions: WatchOptions = {
    ignored,
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ...otherOptions,
  }
*/
const resolvedWatchOptions = resolveChokidarOptions(
  {
    disableGlobbing: true,
    ...serverConfig.watch,
  },
  resolvedOutDirs,
  emptyOutDir,
  config.cacheDir
);

//
export function resolveChokidarOptions(
  options: WatchOptions | undefined,
  resolvedOutDirs: Set<string>,
  emptyOutDir: boolean,
  cacheDir: string
): WatchOptions {
  const { ignored: ignoredList, ...otherOptions } = options ?? {};
  const ignored: WatchOptions["ignored"] = [
    "**/.git/**",
    "**/node_modules/**",
    "**/test-results/**", // Playwright
    escapePath(cacheDir) + "/**",
    ...arraify(ignoredList || []),
  ];
  if (emptyOutDir) {
    ignored.push(
      ...[...resolvedOutDirs].map((outDir) => escapePath(outDir) + "/**")
    );
  }

  const resolvedWatchOptions: WatchOptions = {
    ignored,
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ...otherOptions,
  };

  return resolvedWatchOptions;
}
```

6. resolveHttpServer

```ts
// createServer 返回一个 http 的实例 server
// createSecureServer  Create a secure HTTP/2 server
resolveHttpServer(serverConfig, middlewares, httpsOptions);

export async function resolveHttpServer(
  { proxy }: CommonServerOptions,
  app: Connect.Server,
  httpsOptions?: HttpsServerOptions
): Promise<HttpServer> {
  if (!httpsOptions) {
    const { createServer } = await import("node:http");
    return createServer(app);
  }

  // #484 fallback to http1 when proxy is needed.
  if (proxy) {
    const { createServer } = await import("node:https");
    return createServer(httpsOptions, app);
  } else {
    const { createSecureServer } = await import("node:http2");
    return createSecureServer(
      {
        // Manually increase the session memory to prevent 502 ENHANCE_YOUR_CALM
        // errors on large numbers of requests
        maxSessionMemory: 1000,
        ...httpsOptions,
        allowHTTP1: true,
      },
      // @ts-expect-error TODO: is this correct?
      app
    );
  }
}
```

7. createWebSocketServer
   源码 path: packages\vite\src\node\server\ws.ts

- 服务器初始化路径
  if (wsServer 存在) {
  复用现有 HTTP 服务器
  注册 upgrade 监听器
  } else {
  创建新 HTTP 服务器
  配置 426 状态响应
  处理端口冲突错误
  }
- 消息处理流程
  wss.on('connection', socket => {
  socket.on('message', raw => {
  解析 JSON → 分发自定义事件 → 触发监听器
  })
  })
- 关闭清理逻辑
  close() {
  移除升级监听器
  终止所有客户端连接
  关闭 WebSocket 服务器
  关闭 HTTP 服务器(如果独立创建)
  }

架构设计亮点
双协议支持

vite-hmr: 正式 HMR 通信
vite-ping: 轻量级连接检查协议
混合部署能力

支持与主 HTTP 服务器共存
支持独立端口部署
安全纵深防御

基于时间的令牌验证
Host 白名单过滤
浏览器请求强制校验
资源管理优化

WeakMap 缓存客户端对象
按需创建 HTTP 服务器
自动清理无效引用
错误恢复机制

缓冲未送达的错误
智能端口冲突处理
连接状态预检查
该实现完整展现了 Vite 在 WebSocket 通信层的设计哲学：在保证开发体验流畅性的同时，严格把控安全边界，通过分层架构实现功能扩展性与运行稳定性的平衡。

```ts
// 1. 判断config.server.ws.server是否为false，如果为false，则创建一个空的配置和空的方法，代表用户可以禁用webScoketServer

// 2. 从config.server.hmr中获取HMR的服务器、端口等信息。判断端口是否兼容，如果HMR服务器存在或端口兼容，则使用现有的HTTP服务器，否则创建新的HTTP/HTTPS服务器。

const ws = createWebSocketServer(httpServer, config, httpsOptions);

export function createWebSocketServer(
  server: HttpServer | null,
  config: ResolvedConfig,
  httpsOptions?: HttpsServerOptions
): WebSocketServer {
  if (config.server.ws === false) {
    return {
      [isWebSocketServer]: true,
      get clients() {
        return new Set<WebSocketClient>();
      },
      async close() {
        // noop
      },
      on: noop as any as WebSocketServer["on"],
      off: noop as any as WebSocketServer["off"],
      setInvokeHandler: noop,
      handleInvoke: async () => ({
        error: {
          name: "TransportError",
          message: "handleInvoke not implemented",
          stack: new Error().stack,
        },
      }),
      listen: noop,
      send: noop,
    };
  }

  let wsHttpServer: Server | undefined = undefined;

  const hmr = isObject(config.server.hmr) && config.server.hmr;
  const hmrServer = hmr && hmr.server;
  const hmrPort = hmr && hmr.port;
  // TODO: the main server port may not have been chosen yet as it may use the next available
  const portsAreCompatible = !hmrPort || hmrPort === config.server.port;
  const wsServer = hmrServer || (portsAreCompatible && server);
  let hmrServerWsListener: (
    req: InstanceType<typeof IncomingMessage>,
    socket: Duplex,
    head: Buffer
  ) => void;
  const customListeners = new Map<string, Set<WebSocketCustomListener<any>>>();
  const clientsMap = new WeakMap<WebSocketRaw, WebSocketClient>();
  const port = hmrPort || 24678;
  const host = (hmr && hmr.host) || undefined;

  //   安全控制体系
  const shouldHandle = (req: IncomingMessage) => {
    const protocol = req.headers["sec-websocket-protocol"]!;
    // vite-ping is allowed to connect from anywhere
    // because it needs to be connected before the client fetches the new `/@vite/client`
    // this is fine because vite-ping does not receive / send any meaningful data
    if (protocol === "vite-ping") return true;

    const hostHeader = req.headers.host;
    if (!hostHeader || !isHostAllowed(config, false, hostHeader)) {
      return false;
    }

    if (config.legacy?.skipWebSocketTokenCheck) {
      return true;
    }

    // If the Origin header is set, this request might be coming from a browser.
    // Browsers always sets the Origin header for WebSocket connections.
    if (req.headers.origin) {
      const parsedUrl = new URL(`http://example.com${req.url!}`);
      return hasValidToken(config, parsedUrl);
    }

    // We allow non-browser requests to connect without a token
    // for backward compat and convenience
    // This is fine because if you can sent a request without the SOP limitation,
    // you can also send a normal HTTP request to the server.
    return true; // 非浏览器请求
  };

  //   协议处理流程
  const handleUpgrade = (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    isPing: boolean
  ) => {
    wss.handleUpgrade(req, socket as Socket, head, (ws) => {
      // vite-ping is allowed to connect from anywhere
      // we close the connection immediately without connection event
      // so that the client does not get included in `wss.clients`
      if (isPing) {
        ws.close(/* Normal Closure */ 1000);
        return;
      }
      wss.emit("connection", ws, req);
    });
  };
  const wss: WebSocketServerRaw_ = new WebSocketServerRaw({ noServer: true });
  wss.shouldHandle = shouldHandle;

  if (wsServer) {
    let hmrBase = config.base;
    const hmrPath = hmr ? hmr.path : undefined;
    if (hmrPath) {
      hmrBase = path.posix.join(hmrBase, hmrPath);
    }
    hmrServerWsListener = (req, socket, head) => {
      const protocol = req.headers["sec-websocket-protocol"]!;
      const parsedUrl = new URL(`http://example.com${req.url!}`);
      if (
        [HMR_HEADER, "vite-ping"].includes(protocol) &&
        parsedUrl.pathname === hmrBase
      ) {
        handleUpgrade(req, socket as Socket, head, protocol === "vite-ping");
      }
    };
    wsServer.on("upgrade", hmrServerWsListener);
  } else {
    // http server request handler keeps the same with
    // https://github.com/websockets/ws/blob/45e17acea791d865df6b255a55182e9c42e5877a/lib/websocket-server.js#L88-L96
    const route = ((_, res) => {
      const statusCode = 426;
      const body = STATUS_CODES[statusCode];
      if (!body)
        throw new Error(`No body text found for the ${statusCode} status code`);

      res.writeHead(statusCode, {
        "Content-Length": body.length,
        "Content-Type": "text/plain",
      });
      res.end(body);
    }) as Parameters<typeof createHttpServer>[1];
    // vite dev server in middleware mode
    // need to call ws listen manually
    if (httpsOptions) {
      wsHttpServer = createHttpsServer(httpsOptions, route);
    } else {
      wsHttpServer = createHttpServer(route);
    }
    wsHttpServer.on("upgrade", (req, socket, head) => {
      const protocol = req.headers["sec-websocket-protocol"]!;
      if (protocol === "vite-ping" && server && !server.listening) {
        // reject connection to tell the vite/client that the server is not ready
        // if the http server is not listening
        // because the ws server listens before the http server listens
        req.destroy();
        return;
      }
      handleUpgrade(req, socket as Socket, head, protocol === "vite-ping");
    });
    wsHttpServer.on("error", (e: Error & { code: string; port: number }) => {
      if (e.code === "EADDRINUSE") {
        config.logger.error(
          colors.red(
            `WebSocket server error: Port ${e.port} is already in use`
          ),
          { error: e }
        );
      } else {
        config.logger.error(
          colors.red(`WebSocket server error:\n${e.stack || e.message}`),
          { error: e }
        );
      }
    });
  }

  wss.on("connection", (socket) => {
    socket.on("message", (raw) => {
      if (!customListeners.size) return;
      let parsed: any;
      try {
        parsed = JSON.parse(String(raw));
      } catch {}
      if (!parsed || parsed.type !== "custom" || !parsed.event) return;
      const listeners = customListeners.get(parsed.event);
      if (!listeners?.size) return;
      const client = getSocketClient(socket);
      listeners.forEach((listener) =>
        listener(parsed.data, client, parsed.invoke)
      );
    });
    socket.on("error", (err) => {
      config.logger.error(`${colors.red(`ws error:`)}\n${err.stack}`, {
        timestamp: true,
        error: err,
      });
    });
    socket.send(JSON.stringify({ type: "connected" }));
    if (bufferedError) {
      socket.send(JSON.stringify(bufferedError));
      bufferedError = null;
    }
  });

  wss.on("error", (e: Error & { code: string; port: number }) => {
    if (e.code === "EADDRINUSE") {
      config.logger.error(
        colors.red(`WebSocket server error: Port ${e.port} is already in use`),
        { error: e }
      );
    } else {
      config.logger.error(
        colors.red(`WebSocket server error:\n${e.stack || e.message}`),
        { error: e }
      );
    }
  });

  // Provide a wrapper to the ws client so we can send messages in JSON format
  // To be consistent with server.ws.send

  //  客户端管理
  function getSocketClient(socket: WebSocketRaw) {
    if (!clientsMap.has(socket)) {
      clientsMap.set(socket, {
        send: (...args: any[]) => {
          let payload: HotPayload;
          if (typeof args[0] === "string") {
            payload = {
              type: "custom",
              event: args[0],
              data: args[1],
            };
          } else {
            payload = args[0];
          }
          socket.send(JSON.stringify(payload));
        },
        socket,
      });
    }
    return clientsMap.get(socket)!;
  }

  // On page reloads, if a file fails to compile and returns 500, the server
  // sends the error payload before the client connection is established.
  // If we have no open clients, buffer the error and send it to the next
  // connected client.
  let bufferedError: ErrorPayload | null = null;

  const normalizedHotChannel = normalizeHotChannel(
    {
      send(payload) {
        if (payload.type === "error" && !wss.clients.size) {
          bufferedError = payload;
          return;
        }

        const stringified = JSON.stringify(payload);
        wss.clients.forEach((client) => {
          // readyState 1 means the connection is open
          if (client.readyState === 1) {
            client.send(stringified);
          }
        });
      },
      on(event: string, fn: any) {
        if (!customListeners.has(event)) {
          customListeners.set(event, new Set());
        }
        customListeners.get(event)!.add(fn);
      },
      off(event: string, fn: any) {
        customListeners.get(event)?.delete(fn);
      },
      listen() {
        wsHttpServer?.listen(port, host);
      },
      close() {
        // should remove listener if hmr.server is set
        // otherwise the old listener swallows all WebSocket connections
        if (hmrServerWsListener && wsServer) {
          wsServer.off("upgrade", hmrServerWsListener);
        }
        return new Promise<void>((resolve, reject) => {
          wss.clients.forEach((client) => {
            client.terminate();
          });
          wss.close((err) => {
            if (err) {
              reject(err);
            } else {
              if (wsHttpServer) {
                wsHttpServer.close((err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              } else {
                resolve();
              }
            }
          });
        });
      },
    },
    config.server.hmr !== false,
    // Don't normalize client as we already handles the send, and to keep `.socket`
    false
  );
  return {
    ...normalizedHotChannel,

    on: ((event: string, fn: any) => {
      if (wsServerEvents.includes(event)) {
        wss.on(event, fn);
        return;
      }
      normalizedHotChannel.on(event, fn);
    }) as WebSocketServer["on"],
    off: ((event: string, fn: any) => {
      if (wsServerEvents.includes(event)) {
        wss.off(event, fn);
        return;
      }
      normalizedHotChannel.off(event, fn);
    }) as WebSocketServer["off"],
    async close() {
      await normalizedHotChannel.close();
    },

    [isWebSocketServer]: true,
    get clients() {
      return new Set(Array.from(wss.clients).map(getSocketClient));
    },
  };
}
```

8. 创建文件监听 chokidar.watch，结合 5 中的 resolveChokidarOptions

```ts
// 文件监听
const watcher = watchEnabled
  ? (chokidar.watch(
      // config file dependencies and env file might be outside of root
      [
        root,
        ...config.configFileDependencies,
        ...getEnvFilesForMode(config.mode, config.envDir),
        // Watch the public directory explicitly because it might be outside
        // of the root directory.
        ...(publicDir && publicFiles ? [publicDir] : []),
      ],

      resolvedWatchOptions
    ) as FSWatcher)
  : createNoopWatcher(resolvedWatchOptions); // 空函数
```

9. 创建双环境下的模块图 moduleGraph

```ts
//   urlToModuleMap: Map<string, ModuleNode>;
//   idToModuleMap: Map<string, ModuleNode>;
//   etagToModuleMap: Map<string, ModuleNode>;
//   fileToModulesMap: Map<string, Set<ModuleNode>>;

let moduleGraph = new ModuleGraph({
  client: () => environments.client.moduleGraph,
  ssr: () => environments.ssr.moduleGraph,
});

export class ModuleGraph {
  /** @internal */
  _moduleGraphs: {
    client: () => EnvironmentModuleGraph;
    ssr: () => EnvironmentModuleGraph;
  };

  /** @internal */
  get _client(): EnvironmentModuleGraph {
    return this._moduleGraphs.client();
  }

  /** @internal */
  get _ssr(): EnvironmentModuleGraph {
    return this._moduleGraphs.ssr();
  }

  urlToModuleMap: Map<string, ModuleNode>;
  idToModuleMap: Map<string, ModuleNode>;
  etagToModuleMap: Map<string, ModuleNode>;

  fileToModulesMap: Map<string, Set<ModuleNode>>;

  private moduleNodeCache = new DualWeakMap<
    EnvironmentModuleNode,
    EnvironmentModuleNode,
    ModuleNode
  >();

  constructor(moduleGraphs: {
    client: () => EnvironmentModuleGraph;
    ssr: () => EnvironmentModuleGraph;
  }) {
    this._moduleGraphs = moduleGraphs;

    const getModuleMapUnion =
      (prop: "urlToModuleMap" | "idToModuleMap") => () => {
        // A good approximation to the previous logic that returned the union of
        // the importedModules and importers from both the browser and server
        if (this._ssr[prop].size === 0) {
          return this._client[prop];
        }
        const map = new Map(this._client[prop]);
        for (const [key, module] of this._ssr[prop]) {
          if (!map.has(key)) {
            map.set(key, module);
          }
        }
        return map;
      };

    this.urlToModuleMap = createBackwardCompatibleModuleMap(
      this,
      "urlToModuleMap",
      getModuleMapUnion("urlToModuleMap")
    );
    this.idToModuleMap = createBackwardCompatibleModuleMap(
      this,
      "idToModuleMap",
      getModuleMapUnion("idToModuleMap")
    );
    this.etagToModuleMap = createBackwardCompatibleModuleMap(
      this,
      "etagToModuleMap",
      () => this._client.etagToModuleMap
    );
    this.fileToModulesMap = createBackwardCompatibleFileToModulesMap(this);
  }

  getModuleById(id: string): ModuleNode | undefined {
    const clientModule = this._client.getModuleById(id);
    const ssrModule = this._ssr.getModuleById(id);
    if (!clientModule && !ssrModule) {
      return;
    }
    return this.getBackwardCompatibleModuleNodeDual(clientModule, ssrModule);
  }

  async getModuleByUrl(
    url: string,
    _ssr?: boolean
  ): Promise<ModuleNode | undefined> {
    // In the mixed graph, the ssr flag was used to resolve the id.
    const [clientModule, ssrModule] = await Promise.all([
      this._client.getModuleByUrl(url),
      this._ssr.getModuleByUrl(url),
    ]);
    if (!clientModule && !ssrModule) {
      return;
    }
    return this.getBackwardCompatibleModuleNodeDual(clientModule, ssrModule);
  }

  getModulesByFile(file: string): Set<ModuleNode> | undefined {
    // Until Vite 5.1.x, the moduleGraph contained modules from both the browser and server
    // We maintain backwards compatibility by returning a Set of module proxies assuming
    // that the modules for a certain file are the same in both the browser and server
    const clientModules = this._client.getModulesByFile(file);
    const ssrModules = this._ssr.getModulesByFile(file);
    if (!clientModules && !ssrModules) {
      return undefined;
    }
    const result = new Set<ModuleNode>();
    if (clientModules) {
      for (const mod of clientModules) {
        result.add(this.getBackwardCompatibleBrowserModuleNode(mod)!);
      }
    }
    if (ssrModules) {
      for (const mod of ssrModules) {
        if (mod.id == null || !this._client.getModuleById(mod.id)) {
          result.add(this.getBackwardCompatibleServerModuleNode(mod)!);
        }
      }
    }
    return result;
  }

  onFileChange(file: string): void {
    this._client.onFileChange(file);
    this._ssr.onFileChange(file);
  }

  onFileDelete(file: string): void {
    this._client.onFileDelete(file);
    this._ssr.onFileDelete(file);
  }

  /** @internal */
  _getModuleGraph(environment: string): EnvironmentModuleGraph {
    switch (environment) {
      case "client":
        return this._client;
      case "ssr":
        return this._ssr;
      default:
        throw new Error(`Invalid module node environment ${environment}`);
    }
  }

  invalidateModule(
    mod: ModuleNode,
    seen = new Set<ModuleNode>(),
    timestamp: number = Date.now(),
    isHmr: boolean = false,
    /** @internal */
    softInvalidate = false
  ): void {
    if (mod._clientModule) {
      this._client.invalidateModule(
        mod._clientModule,
        new Set(
          [...seen].map((mod) => mod._clientModule).filter(Boolean)
        ) as Set<EnvironmentModuleNode>,
        timestamp,
        isHmr,
        softInvalidate
      );
    }
    if (mod._ssrModule) {
      // TODO: Maybe this isn't needed?
      this._ssr.invalidateModule(
        mod._ssrModule,
        new Set(
          [...seen].map((mod) => mod._ssrModule).filter(Boolean)
        ) as Set<EnvironmentModuleNode>,
        timestamp,
        isHmr,
        softInvalidate
      );
    }
  }

  invalidateAll(): void {
    this._client.invalidateAll();
    this._ssr.invalidateAll();
  }

  /* TODO: It seems there isn't usage of this method in the ecosystem
     Waiting to check if we really need this for backwards compatibility
  async updateModuleInfo(
    module: ModuleNode,
    importedModules: Set<string | ModuleNode>,
    importedBindings: Map<string, Set<string>> | null,
    acceptedModules: Set<string | ModuleNode>,
    acceptedExports: Set<string> | null,
    isSelfAccepting: boolean,
    ssr?: boolean,
    staticImportedUrls?: Set<string>, // internal
  ): Promise<Set<ModuleNode> | undefined> {
    // Not implemented
  }
  */

  async ensureEntryFromUrl(
    rawUrl: string,
    ssr?: boolean,
    setIsSelfAccepting = true
  ): Promise<ModuleNode> {
    const module = await (ssr ? this._ssr : this._client).ensureEntryFromUrl(
      rawUrl,
      setIsSelfAccepting
    );
    return this.getBackwardCompatibleModuleNode(module)!;
  }

  createFileOnlyEntry(file: string): ModuleNode {
    const clientModule = this._client.createFileOnlyEntry(file);
    const ssrModule = this._ssr.createFileOnlyEntry(file);
    return this.getBackwardCompatibleModuleNodeDual(clientModule, ssrModule)!;
  }

  async resolveUrl(url: string, ssr?: boolean): Promise<ResolvedUrl> {
    return ssr ? this._ssr.resolveUrl(url) : this._client.resolveUrl(url);
  }

  updateModuleTransformResult(
    mod: ModuleNode,
    result: TransformResult | null,
    ssr?: boolean
  ): void {
    const environment = ssr ? "ssr" : "client";
    this._getModuleGraph(environment).updateModuleTransformResult(
      (environment === "client" ? mod._clientModule : mod._ssrModule)!,
      result
    );
  }

  getModuleByEtag(etag: string): ModuleNode | undefined {
    const mod = this._client.etagToModuleMap.get(etag);
    return mod && this.getBackwardCompatibleBrowserModuleNode(mod);
  }

  getBackwardCompatibleBrowserModuleNode(
    clientModule: EnvironmentModuleNode
  ): ModuleNode {
    return this.getBackwardCompatibleModuleNodeDual(
      clientModule,
      clientModule.id ? this._ssr.getModuleById(clientModule.id) : undefined
    );
  }

  getBackwardCompatibleServerModuleNode(
    ssrModule: EnvironmentModuleNode
  ): ModuleNode {
    return this.getBackwardCompatibleModuleNodeDual(
      ssrModule.id ? this._client.getModuleById(ssrModule.id) : undefined,
      ssrModule
    );
  }

  getBackwardCompatibleModuleNode(mod: EnvironmentModuleNode): ModuleNode {
    return mod.environment === "client"
      ? this.getBackwardCompatibleBrowserModuleNode(mod)
      : this.getBackwardCompatibleServerModuleNode(mod);
  }

  getBackwardCompatibleModuleNodeDual(
    clientModule?: EnvironmentModuleNode,
    ssrModule?: EnvironmentModuleNode
  ): ModuleNode {
    const cached = this.moduleNodeCache.get(clientModule, ssrModule);
    if (cached) {
      return cached;
    }

    const moduleNode = new ModuleNode(this, clientModule, ssrModule);
    this.moduleNodeCache.set(clientModule, ssrModule, moduleNode);
    return moduleNode;
  }
}
```

10. 创建一个插件容器 createPluginContainer

```ts
class PluginContainer {
  constructor(private environments: Record<string, Environment>) {}

  // Backward compatibility
  // Users should call pluginContainer.resolveId (and load/transform) passing the environment they want to work with
  // But there is code that is going to call it without passing an environment, or with the ssr flag to get the ssr environment
  private _getEnvironment(options?: {
    ssr?: boolean;
    environment?: Environment;
  }) {
    return options?.environment
      ? options.environment
      : this.environments[options?.ssr ? "ssr" : "client"];
  }

  private _getPluginContainer(options?: {
    ssr?: boolean;
    environment?: Environment;
  }) {
    return (this._getEnvironment(options) as DevEnvironment).pluginContainer;
  }

  getModuleInfo(id: string): ModuleInfo | null {
    const clientModuleInfo = (
      this.environments.client as DevEnvironment
    ).pluginContainer.getModuleInfo(id);
    const ssrModuleInfo = (
      this.environments.ssr as DevEnvironment
    ).pluginContainer.getModuleInfo(id);

    if (clientModuleInfo == null && ssrModuleInfo == null) return null;

    return new Proxy({} as any, {
      get: (_, key: string) => {
        // `meta` refers to `ModuleInfo.meta` of both environments, so we also
        // need to merge it here
        if (key === "meta") {
          const meta: Record<string, any> = {};
          if (ssrModuleInfo) {
            Object.assign(meta, ssrModuleInfo.meta);
          }
          if (clientModuleInfo) {
            Object.assign(meta, clientModuleInfo.meta);
          }
          return meta;
        }
        if (clientModuleInfo) {
          if (key in clientModuleInfo) {
            return clientModuleInfo[key as keyof ModuleInfo];
          }
        }
        if (ssrModuleInfo) {
          if (key in ssrModuleInfo) {
            return ssrModuleInfo[key as keyof ModuleInfo];
          }
        }
      },
    });
  }

  get options(): InputOptions {
    return (this.environments.client as DevEnvironment).pluginContainer.options;
  }

  // For backward compatibility, buildStart and watchChange are called only for the client environment
  // buildStart is called per environment for a plugin with the perEnvironmentStartEndDuring dev flag

  async buildStart(_options?: InputOptions): Promise<void> {
    (this.environments.client as DevEnvironment).pluginContainer.buildStart(
      _options
    );
  }

  async watchChange(
    id: string,
    change: { event: "create" | "update" | "delete" }
  ): Promise<void> {
    (this.environments.client as DevEnvironment).pluginContainer.watchChange(
      id,
      change
    );
  }

  async resolveId(
    rawId: string,
    importer?: string,
    options?: {
      attributes?: Record<string, string>;
      custom?: CustomPluginOptions;
      /** @deprecated use `skipCalls` instead */
      skip?: Set<Plugin>;
      skipCalls?: readonly SkipInformation[];
      ssr?: boolean;
      /**
       * @internal
       */
      scan?: boolean;
      isEntry?: boolean;
    }
  ): Promise<PartialResolvedId | null> {
    return this._getPluginContainer(options).resolveId(
      rawId,
      importer,
      options
    );
  }

  async load(
    id: string,
    options?: {
      ssr?: boolean;
    }
  ): Promise<LoadResult | null> {
    return this._getPluginContainer(options).load(id);
  }

  async transform(
    code: string,
    id: string,
    options?: {
      ssr?: boolean;
      environment?: Environment;
      inMap?: SourceDescription["map"];
    }
  ): Promise<{ code: string; map: SourceMap | { mappings: "" } | null }> {
    return this._getPluginContainer(options).transform(code, id, options);
  }

  async close(): Promise<void> {
    // noop, close will be called for each environment
  }
}
```

11. createDevHtmlTransformFn

```ts
const devHtmlTransformFn = createDevHtmlTransformFn(config);

export function createDevHtmlTransformFn(
  config: ResolvedConfig
): (
  server: ViteDevServer,
  url: string,
  html: string,
  originalUrl?: string
) => Promise<string> {
  const [preHooks, normalHooks, postHooks] = resolveHtmlTransforms(
    config.plugins,
    config.logger
  );
  const transformHooks = [
    preImportMapHook(config),
    injectCspNonceMetaTagHook(config),
    ...preHooks,
    htmlEnvHook(config),
    devHtmlHook,
    ...normalHooks,
    ...postHooks,
    injectNonceAttributeTagHook(config),
    postImportMapHook(),
  ];
  return (
    server: ViteDevServer,
    url: string,
    html: string,
    originalUrl?: string
  ): Promise<string> => {
    return applyHtmlTransforms(html, transformHooks, {
      path: url,
      filename: getHtmlFilename(url, server),
      server,
      originalUrl,
    });
  };
}

export async function applyHtmlTransforms(
  html: string,
  hooks: IndexHtmlTransformHook[],
  ctx: IndexHtmlTransformContext
): Promise<string> {
  for (const hook of hooks) {
    const res = await hook(html, ctx);
    if (!res) {
      continue;
    }
    if (typeof res === "string") {
      html = res;
    } else {
      let tags: HtmlTagDescriptor[];
      if (Array.isArray(res)) {
        tags = res;
      } else {
        html = res.html || html;
        tags = res.tags;
      }

      let headTags: HtmlTagDescriptor[] | undefined;
      let headPrependTags: HtmlTagDescriptor[] | undefined;
      let bodyTags: HtmlTagDescriptor[] | undefined;
      let bodyPrependTags: HtmlTagDescriptor[] | undefined;

      for (const tag of tags) {
        switch (tag.injectTo) {
          case "body":
            (bodyTags ??= []).push(tag);
            break;
          case "body-prepend":
            (bodyPrependTags ??= []).push(tag);
            break;
          case "head":
            (headTags ??= []).push(tag);
            break;
          default:
            (headPrependTags ??= []).push(tag);
        }
      }
      headTagInsertCheck(
        [...(headTags || []), ...(headPrependTags || [])],
        ctx
      );
      if (headPrependTags) html = injectToHead(html, headPrependTags, true);
      if (headTags) html = injectToHead(html, headTags);
      if (bodyPrependTags) html = injectToBody(html, bodyPrependTags, true);
      if (bodyTags) html = injectToBody(html, bodyTags);
    }
  }

  return html;
}
```

12. closeServer 关闭服务器

```ts
const closeServer = async () => {
  if (!middlewareMode) {
    teardownSIGTERMListener(closeServerAndExit);
  }

  await Promise.allSettled([
    watcher.close(),
    ws.close(),
    Promise.allSettled(
      Object.values(server.environments).map((environment) =>
        environment.close()
      )
    ),
    closeHttpServer(),
    server._ssrCompatModuleRunner?.close(),
  ]);
  server.resolvedUrls = null;
  server._ssrCompatModuleRunner = undefined;
};
```

13. 定义 server: ViteDevServer

```ts
let server: ViteDevServer = {
  config,
  middlewares,
  httpServer,
  watcher,
  ws,
  hot: createDeprecatedHotBroadcaster(ws),

  environments,
  pluginContainer,
  get moduleGraph() {
    warnFutureDeprecation(config, "removeServerModuleGraph");
    return moduleGraph;
  },
  set moduleGraph(graph) {
    moduleGraph = graph;
  },

  resolvedUrls: null, // will be set on listen
  ssrTransform(
    code: string,
    inMap: SourceMap | { mappings: "" } | null,
    url: string,
    originalCode = code
  ) {
    return ssrTransform(code, inMap, url, originalCode, {
      json: {
        stringify:
          config.json.stringify === true && config.json.namedExports !== true,
      },
    });
  },
  // environment.transformRequest and .warmupRequest don't take an options param for now,
  // so the logic and error handling needs to be duplicated here.
  // The only param in options that could be important is `html`, but we may remove it as
  // that is part of the internal control flow for the vite dev server to be able to bail
  // out and do the html fallback
  transformRequest(url, options) {
    warnFutureDeprecation(
      config,
      "removeServerTransformRequest",
      "server.transformRequest() is deprecated. Use environment.transformRequest() instead."
    );
    const environment = server.environments[options?.ssr ? "ssr" : "client"];
    return transformRequest(environment, url, options);
  },
  async warmupRequest(url, options) {
    try {
      const environment = server.environments[options?.ssr ? "ssr" : "client"];
      await transformRequest(environment, url, options);
    } catch (e) {
      if (
        e?.code === ERR_OUTDATED_OPTIMIZED_DEP ||
        e?.code === ERR_CLOSED_SERVER
      ) {
        // these are expected errors
        return;
      }
      // Unexpected error, log the issue but avoid an unhandled exception
      server.config.logger.error(
        buildErrorMessage(e, [`Pre-transform error: ${e.message}`], false),
        {
          error: e,
          timestamp: true,
        }
      );
    }
  },
  transformIndexHtml(url, html, originalUrl) {
    return devHtmlTransformFn(server, url, html, originalUrl);
  },
  async ssrLoadModule(url, opts?: { fixStacktrace?: boolean }) {
    warnFutureDeprecation(config, "removeSsrLoadModule");
    return ssrLoadModule(url, server, opts?.fixStacktrace);
  },
  ssrFixStacktrace(e) {
    ssrFixStacktrace(e, server.environments.ssr.moduleGraph);
  },
  ssrRewriteStacktrace(stack: string) {
    return ssrRewriteStacktrace(stack, server.environments.ssr.moduleGraph);
  },
  async reloadModule(module) {
    if (serverConfig.hmr !== false && module.file) {
      // TODO: Should we also update the node moduleGraph for backward compatibility?
      const environmentModule = (module._clientModule ?? module._ssrModule)!;
      updateModules(
        environments[environmentModule.environment]!,
        module.file,
        [environmentModule],
        Date.now()
      );
    }
  },
  async listen(port?: number, isRestart?: boolean) {
    await startServer(server, port);
    if (httpServer) {
      server.resolvedUrls = await resolveServerUrls(
        httpServer,
        config.server,
        httpsOptions,
        config
      );
      if (!isRestart && config.server.open) server.openBrowser();
    }
    return server;
  },
  openBrowser() {
    const options = server.config.server;
    const url =
      server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0];
    if (url) {
      const path =
        typeof options.open === "string"
          ? new URL(options.open, url).href
          : url;

      // We know the url that the browser would be opened to, so we can
      // start the request while we are awaiting the browser. This will
      // start the crawling of static imports ~500ms before.
      // preTransformRequests needs to be enabled for this optimization.
      if (server.config.server.preTransformRequests) {
        setTimeout(() => {
          const getMethod = path.startsWith("https:") ? httpsGet : httpGet;

          getMethod(
            path,
            {
              headers: {
                // Allow the history middleware to redirect to /index.html
                Accept: "text/html",
              },
            },
            (res) => {
              res.on("end", () => {
                // Ignore response, scripts discovered while processing the entry
                // will be preprocessed (server.config.server.preTransformRequests)
              });
            }
          )
            .on("error", () => {
              // Ignore errors
            })
            .end();
        }, 0);
      }

      _openBrowser(path, true, server.config.logger);
    } else {
      server.config.logger.warn("No URL available to open in browser");
    }
  },
  async close() {
    if (!closeServerPromise) {
      closeServerPromise = closeServer();
    }
    return closeServerPromise;
  },
  printUrls() {
    if (server.resolvedUrls) {
      printServerUrls(
        server.resolvedUrls,
        serverConfig.host,
        config.logger.info
      );
    } else if (middlewareMode) {
      throw new Error("cannot print server URLs in middleware mode.");
    } else {
      throw new Error(
        "cannot print server URLs before server.listen is called."
      );
    }
  },
  bindCLIShortcuts(options) {
    bindCLIShortcuts(server, options);
  },
  async restart(forceOptimize?: boolean) {
    if (!server._restartPromise) {
      server._forceOptimizeOnRestart = !!forceOptimize;
      server._restartPromise = restartServer(server).finally(() => {
        server._restartPromise = null;
        server._forceOptimizeOnRestart = false;
      });
    }
    return server._restartPromise;
  },

  waitForRequestsIdle(ignoredId?: string): Promise<void> {
    return environments.client.waitForRequestsIdle(ignoredId);
  },

  _setInternalServer(_server: ViteDevServer) {
    // Rebind internal the server variable so functions reference the user
    // server instance after a restart
    server = _server;
  },
  _importGlobMap: new Map(),
  _restartPromise: null,
  _forceOptimizeOnRestart: false,
  _shortcutsOptions: undefined,
};
```

这里看 server 对象中的几个方法

##### openBrowser

```ts
export function openBrowser(
  url: string,
  opt: string | true,
  logger: Logger
): void {
  // The browser executable to open.
  // See https://github.com/sindresorhus/open#app for documentation.
  const browser = typeof opt === "string" ? opt : process.env.BROWSER || "";
  if (browser.toLowerCase().endsWith(".js")) {
    executeNodeScript(browser, url, logger);
  } else if (browser.toLowerCase() !== "none") {
    const browserArgs = process.env.BROWSER_ARGS
      ? process.env.BROWSER_ARGS.split(" ")
      : [];
    startBrowserProcess(browser, browserArgs, url, logger);
  }
}
```

13. onHMRUpdate

```ts
const onHMRUpdate = async (
  type: "create" | "delete" | "update",
  file: string
) => {
  if (serverConfig.hmr !== false) {
    await handleHMRUpdate(type, file, server);
  }
};

export async function handleHMRUpdate(
  type: "create" | "delete" | "update",
  file: string,
  server: ViteDevServer
): Promise<void> {
  const { config } = server;
  const mixedModuleGraph = ignoreDeprecationWarnings(() => server.moduleGraph);

  const environments = Object.values(server.environments);
  const shortFile = getShortName(file, config.root);

  const isConfig = file === config.configFile;
  const isConfigDependency = config.configFileDependencies.some(
    (name) => file === name
  );

  const isEnv =
    config.inlineConfig.envFile !== false &&
    getEnvFilesForMode(config.mode, config.envDir).includes(file);
  if (isConfig || isConfigDependency || isEnv) {
    // auto restart server
    debugHmr?.(`[config change] ${colors.dim(shortFile)}`);
    config.logger.info(
      colors.green(
        `${normalizePath(
          path.relative(process.cwd(), file)
        )} changed, restarting server...`
      ),
      { clear: true, timestamp: true }
    );
    try {
      await restartServerWithUrls(server);
    } catch (e) {
      config.logger.error(colors.red(e));
    }
    return;
  }

  debugHmr?.(`[file change] ${colors.dim(shortFile)}`);

  // (dev only) the client itself cannot be hot updated.
  if (file.startsWith(withTrailingSlash(normalizedClientDir))) {
    environments.forEach(({ hot }) =>
      hot.send({
        type: "full-reload",
        path: "*",
        triggeredBy: path.resolve(config.root, file),
      })
    );
    return;
  }

  const timestamp = Date.now();
  const contextMeta = {
    type,
    file,
    timestamp,
    read: () => readModifiedFile(file),
    server,
  };
  const hotMap = new Map<
    Environment,
    { options: HotUpdateOptions; error?: Error }
  >();

  for (const environment of Object.values(server.environments)) {
    const mods = new Set(environment.moduleGraph.getModulesByFile(file));
    if (type === "create") {
      for (const mod of environment.moduleGraph._hasResolveFailedErrorModules) {
        mods.add(mod);
      }
    }
    const options = {
      ...contextMeta,
      modules: [...mods],
      // later on hotUpdate will be called for each runtime with a new HotUpdateOptions
      environment,
    };
    hotMap.set(environment, { options });
  }

  const mixedMods = new Set(mixedModuleGraph.getModulesByFile(file));

  const mixedHmrContext: HmrContext = {
    ...contextMeta,
    modules: [...mixedMods],
  };

  const clientEnvironment = server.environments.client;
  const ssrEnvironment = server.environments.ssr;
  const clientContext = { environment: clientEnvironment };
  const clientHotUpdateOptions = hotMap.get(clientEnvironment)!.options;
  const ssrHotUpdateOptions = hotMap.get(ssrEnvironment)?.options;
  try {
    for (const plugin of getSortedHotUpdatePlugins(
      server.environments.client
    )) {
      if (plugin.hotUpdate) {
        const filteredModules = await getHookHandler(plugin.hotUpdate).call(
          clientContext,
          clientHotUpdateOptions
        );
        if (filteredModules) {
          clientHotUpdateOptions.modules = filteredModules;
          // Invalidate the hmrContext to force compat modules to be updated
          mixedHmrContext.modules = mixedHmrContext.modules.filter(
            (mixedMod) =>
              filteredModules.some((mod) => mixedMod.id === mod.id) ||
              ssrHotUpdateOptions?.modules.some(
                (ssrMod) => ssrMod.id === mixedMod.id
              )
          );
          mixedHmrContext.modules.push(
            ...filteredModules
              .filter(
                (mod) =>
                  !mixedHmrContext.modules.some(
                    (mixedMod) => mixedMod.id === mod.id
                  )
              )
              .map((mod) =>
                mixedModuleGraph.getBackwardCompatibleModuleNode(mod)
              )
          );
        }
      } else if (type === "update") {
        warnFutureDeprecation(
          config,
          "removePluginHookHandleHotUpdate",
          `Used in plugin "${plugin.name}".`,
          false
        );
        // later on, we'll need: if (runtime === 'client')
        // Backward compatibility with mixed client and ssr moduleGraph
        const filteredModules = await getHookHandler(plugin.handleHotUpdate!)(
          mixedHmrContext
        );
        if (filteredModules) {
          mixedHmrContext.modules = filteredModules;
          clientHotUpdateOptions.modules =
            clientHotUpdateOptions.modules.filter((mod) =>
              filteredModules.some((mixedMod) => mod.id === mixedMod.id)
            );
          clientHotUpdateOptions.modules.push(
            ...(filteredModules
              .filter(
                (mixedMod) =>
                  !clientHotUpdateOptions.modules.some(
                    (mod) => mod.id === mixedMod.id
                  )
              )
              .map((mixedMod) => mixedMod._clientModule)
              .filter(Boolean) as EnvironmentModuleNode[])
          );
          if (ssrHotUpdateOptions) {
            ssrHotUpdateOptions.modules = ssrHotUpdateOptions.modules.filter(
              (mod) =>
                filteredModules.some((mixedMod) => mod.id === mixedMod.id)
            );
            ssrHotUpdateOptions.modules.push(
              ...(filteredModules
                .filter(
                  (mixedMod) =>
                    !ssrHotUpdateOptions.modules.some(
                      (mod) => mod.id === mixedMod.id
                    )
                )
                .map((mixedMod) => mixedMod._ssrModule)
                .filter(Boolean) as EnvironmentModuleNode[])
            );
          }
        }
      }
    }
  } catch (error) {
    hotMap.get(server.environments.client)!.error = error;
  }

  for (const environment of Object.values(server.environments)) {
    if (environment.name === "client") continue;
    const hot = hotMap.get(environment)!;
    const environmentThis = { environment };
    try {
      for (const plugin of getSortedHotUpdatePlugins(environment)) {
        if (plugin.hotUpdate) {
          const filteredModules = await getHookHandler(plugin.hotUpdate).call(
            environmentThis,
            hot.options
          );
          if (filteredModules) {
            hot.options.modules = filteredModules;
          }
        }
      }
    } catch (error) {
      hot.error = error;
    }
  }

  async function hmr(environment: DevEnvironment) {
    try {
      const { options, error } = hotMap.get(environment)!;
      if (error) {
        throw error;
      }
      if (!options.modules.length) {
        // html file cannot be hot updated
        if (file.endsWith(".html") && environment.name === "client") {
          environment.logger.info(
            colors.green(`page reload `) + colors.dim(shortFile),
            {
              clear: true,
              timestamp: true,
            }
          );
          environment.hot.send({
            type: "full-reload",
            path: config.server.middlewareMode
              ? "*"
              : "/" + normalizePath(path.relative(config.root, file)),
          });
        } else {
          // loaded but not in the module graph, probably not js
          debugHmr?.(
            `(${environment.name}) [no modules matched] ${colors.dim(
              shortFile
            )}`
          );
        }
        return;
      }

      updateModules(environment, shortFile, options.modules, timestamp);
    } catch (err) {
      environment.hot.send({
        type: "error",
        err: prepareError(err),
      });
    }
  }

  const hotUpdateEnvironments =
    server.config.server.hotUpdateEnvironments ??
    ((server, hmr) => {
      // Run HMR in parallel for all environments by default
      return Promise.all(
        Object.values(server.environments).map((environment) =>
          hmr(environment)
        )
      );
    });

  await hotUpdateEnvironments(server, hmr);
}
```

````

1. server.ts

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
````

## webpack 自定义插件

## vite 自定义插件

## 浏览器自定义插件

## vscode 扩展插件

```

```
