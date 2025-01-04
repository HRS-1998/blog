# 后处理器介绍

## 后处理器的概念

前面我们学习了 CSS 预处理器，CSS 预处理器（Sass、Less、Stylus）为我们提供了一套特殊的语法，让我们可以以编程的方式（变量、嵌套、内置函数、自定义函数、流程控制）来书写 CSS 样式。因此我们在学习 CSS 预处理器的时候，主要就是学习它们的语法。

CSS 后处理器不会提供专门的语法，它是在原生的 CSS 代码的基础上面做处理，常见的处理工作如下：

1. 兼容性处理：自动添加浏览器前缀（如 -_webkit_-、-_moz_- 和 -_ms_-）以确保跨浏览器兼容性。这种后处理器的一个典型例子是 _autoprefixer_。

2. 代码优化与压缩：移除多余的空格、注释和未使用的规则，以减小 _CSS_ 文件的大小。例如，_cssnano_ 是一个流行的 _CSS_ 压缩工具。

3. 功能增强：添加新的 _CSS_ 特性，使开发者能够使用尚未在所有浏览器中实现的 _CSS_ 功能。例如，_PostCSS_ 是一个强大的 _CSS_ 后处理器，提供了很多插件来扩展 _CSS_ 的功能。

4. 代码检查与规范：检查 _CSS_ 代码的质量，以确保代码符合特定的编码规范和最佳实践。例如，_stylelint_ 是一个强大的 _CSS_ 检查工具，可以帮助你发现和修复潜在的问题。

后处理器实际上是有非常非常多的，autoprefixer、cssnano、stylelint 像这些工具都算是在对原生 CSS 做后处理工作。

这里就会涉及到一个问题，能够对 CSS 做后处理的工具（后处理器）非常非常多，此时就会存在我要将原生的 CSS 先放入到 A 工具进行处理，处理完成后放入到 B 工具进行处理，之后在 C、D、E、F.... 这种手动操作显然是比较费时费力的，我们期望有一种工具，能够自动化的完成这些后处理工作，这个工具就是 PostCSS。

PostCSS 是一个使用 JavaScript 编写的 CSS 后处理器，它更像是一个平台，类似于 Babel，它本身是不做什么具体的事情，它只负责一件事情，将原生 CSS 转换为 CSS 的抽象语法树（CSS AST），之后的事情就完全交给其他的插件。目前整个 PostCSS 插件生态有 200+ 的插件，每个插件可以帮助我们处理一种 CSS 后处理场景。

你可以在官网：https://www.postcss.parts/ 看到 PostCSS 里面所有的插件。

学习 PostCSS 其实主要就是学习里面常用的插件：

- _autoprefixer_：自动为 _CSS_ 中的属性添加浏览器前缀，以确保跨浏览器兼容性。
- _cssnext_：使开发者能够使用尚未在所有浏览器中实现的 _CSS_ 特性，如自定义属性（变量）、颜色函数等。
- _cssnano_：优化并压缩 _CSS_ 代码，以减小文件大小。
- _postcss-import_：在一个 _CSS_ 文件中导入其他 _CSS_ 文件，实现 _CSS_ 代码的模块化。
- _postcss-nested_：支持 _CSS_ 规则的嵌套，使 _CSS_ 代码更加组织化和易于维护。
- _postcss-custom-properties_：支持使用原生 _CSS_ 变量（自定义属性）。
- _stylelint_：_CSS_ 代码检查工具，旨在帮助开发者发现和修复潜在的 _CSS_ 代码问题。

## PostCSS 快速上手

首先创建一个项目目录 postcss-demo，使用 pnpm init 进行初始化，之后安装 postcss 依赖：

```bash
pnpm add postcss autoprefixer -D
```

接下来在 src 创建一个 index.css，书写测试的 CSS 代码：

```css
body {
  background-color: beige;
  font-size: 16px;
}

.box1 {
  transform: translate(100px);
}
```

接下来我们要对上面的代码进行后处理，创建一个 index.js，代码如下：

```js
// 读取 CSS 文件
// 使用 PostCSS 来对读取的 CSS 文件做后处理

const fs = require("fs"); // 负责处理和文件读取相关的事情
const postcss = require("postcss");
// 引入插件，该插件负责为 CSS 代码添加浏览器前缀
const autoprefixer = require("autoprefixer");

const style = fs.readFileSync("src/index.css", "utf8");

postcss([
  autoprefixer({
    overrideBrowserslist: "last 10 versions",
  }),
])
  .process(style, { from: undefined })
  .then((res) => {
    console.log(res.css);
  });
```

在上面的 JS 代码中，我们首先读取了 index.css 里面的 CSS 代码，然后通过 postcss 来做后处理器，注意 postcss 本身不做任何事情，它只负责将原生的 CSS 代码转为 CSS AST，具体的事情需要插件来完成。

上面的代码我们配置了 autoprefixer 这个插件，负责为 CSS 添加浏览器前缀。

# postcss-cli 和配置文件

- postcss-cli
- 配置文件

## postcss-cli

cli 是一组单词的缩写（command line interface），为你提供了一组在命令行中可以操作的命令来进行处理。

postcss-cli 通过给我们提供一些命令行的命令来简化 postcss 的使用。

首先第一步还是安装：

```bash
pnpm add postcss-cli -D
```

安装完成后，我们就可以通过 postcss-cli 所提供的命令来进行文件的编译操作，在 package.json 里面添加如下的脚本：

```json
"scripts": {
  	...
    "build": "postcss src/index.css -o ./build.css"
},
```

- -o：表示编译后的输出文件，编译后的文件默认是带有源码映射。
- --no-map：不需要源码映射
- --watch：用于做文件变化的监听工作，当文件有变化的时候，会自动重新执行命令。注意如果使用了 --watch 来做源码文件变化的监听工作，那么一般建议把编辑器的自动保存功能关闭掉

关于 postcss-cli 这个命令行工具还提供了哪些命令以及哪些配置项目，可以参阅：https://www.npmjs.com/package/postcss-cli

## 配置文件

一般我们会把插件的配置书写到配置文件里面，在配置文件里面，我们就可以指定使用哪些插件，以及插件具体的配置选项。

要使用配置文件功能，可以在项目的根目录下面创建一个名为 postcss.config.js 的文件，当你使用 postcss-cli 或者构建工具（webpack、vite）来进行集成的时候，postcss 会自动加载配置文件。

在 postcss.config.js 文件中书写如下的配置：

```js
module.exports = {
  plugins: [
    require("autoprefixer")({
      overrideBrowserslist: "last 10 versions",
    }),
  ],
};
```

postcss 配置文件最主要的其实就是做插件的配置。postcss 官网没有提供配置文件相关的文档，但是我们可以在：https://github.com/postcss/postcss-load-config 这个地方看到 postcss 配置文件所支持的配置项目。

接下来我们来看一个 postcss 配置文件具体支持的配置项目：

1. plugins：一个数组，里面包含要使用到的 postcss 的插件以及相关的插件配置。

```js
module.exports = {
  plugins: [require("autoprefixer"), require("cssnano")({ preset: "default" })],
};
```

2. map：是否生成源码映射，对应的值为一个对象

```js
module.exports = {
  map: { inline: false },
  plugins: [
    /* Your plugins here */
  ],
};
```

默认值为 false，因为源码映射一般是会单独存放在一个文件里面。

3. syntax：用于指定 postcss 应该使用的 CSS 语法，默认情况下 postcss 处理的是标准的 CSS，但是有可能你的 CSS 是使用预处理器来写的，这个时候 postcss 是不认识的，所以这个时候需要安装对应的插件并且在配置中指明 syntax

```js
module.exports = {
  syntax: "postcss-scss",
  plugins: [
    /* Your plugins here */
  ],
};
```

安装 postcss-scss 这个插件，并且在配置文件中指定 syntax 为 postcss-scss，之后 PostCSS 就能够认识你的 sass 语法。

4. parser：配置自定义解析器。Postcss 默认的解析器为 postcss-safe-parser，负责将 CSS 字符串解析为 CSS AST，如果你要用其他的解析器，那么可以配置一下

```js
const customParser = require("my-custom-parser");

module.exports = {
  parser: customParser,
  plugins: [
    /* Your plugins here */
  ],
};
```

5. stringifier：自定义字符串化器。用于将 CSS AST 转回 CSS 字符串。如果你要使用其他的字符串化器，那么也是可以在配置文件中国呢进行指定的。

```js
const customStringifier = require("my-custom-stringifier");

module.exports = {
  stringifier: customStringifier,
  plugins: [
    /* Your plugins here */
  ],
};
```

最后还剩下两个配置项：from、to，这两个选项官方是不建议你配置的，而且你配置的大概率还会报错，报错信息如下：

> Config Error: Can not set from or to options in config file, use CLI arguments instead

这个提示的意思是让我们不要在配置文件里面进行配置，而是通过命令行参数的形式来指定。

至于为什么，官方其实解释得很清楚了：

> _In most cases options.from && options.to are set by the third-party which integrates this package (CLI, gulp, webpack). It's unlikely one needs to set/use options.from && options.to within a config file._

因为在实际开发中，我们更多的是会使用构建工具（webpack、vite），这些工具会去指定入口文件和出口文件。

# postcss 主流插件 part1

- autoprefixer
- cssnano
- stylelint

## autoprefixer

这里我们再来复习一下：

```css
/* 编译前 */
::placeholder {
  color: gray;
}

.image {
  background-image: url(image@1x.png);
}

@media (min-resolution: 2dppx) {
  .image {
    background-image: url(image@2x.png);
  }
}
```

```css
/* 编译后 */
::-webkit-input-placeholder {
  color: gray;
}

::-moz-placeholder {
  color: gray;
}

:-ms-input-placeholder {
  color: gray;
}

::-ms-input-placeholder {
  color: gray;
}

::placeholder {
  color: gray;
}

.image {
  background-image: url(image@1x.png);
}

@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
  .image {
    background-image: url(image@2x.png);
  }
}
```

关于 autoprefixer 这个插件，本身没有什么好讲的，主要是要介绍 browerslist 这个知识点，这个 browerslist 主要是用来配置兼容的浏览器的范围。从第一款浏览器诞生到现在，浏览的种类以及版本是非常非常多的，因此我们在做兼容的时候，不可能把所有的浏览器都做兼容，并且也没有意义，一般是需要指定范围的。

browserslist 就包含了一些配置规则，我们可以通过这些配置规则来指定要兼容的浏览器的范围：

- last n versions：支持最近的 n 个浏览器版本。last 2 versions 表示支持最近的两个浏览器版本
- n% ：支持全球使用率超过 n% 的浏览器。 > 1% 表示要支持全球使用率超过 1% 的浏览器
- cover n%：覆盖 n% 的主流浏览器
- not dead：支持所有“非死亡”的浏览器，已死亡的浏览器指的是那些已经停止更新的浏览器
- not ie<11：排除 ie 11 以下的浏览器
- chrome>=n ：支持 chrome 浏览器大于等于 n 的版本

你可以在 https://github.com/browserslist/browserslist#full-list 看到 browserslist 可以配置的所有的值。

另外你可以在 https://browserslist.dev/?q=PiAxJQ%3D%3D 看到 browserslist 配置的值所对应的浏览器具体范围。

还有一点就是关于 browserslist 配置的值是可以有多个，如果有多条规则，可以使用关键词 or、and、not 来指定多条规则之间的关系。关于这些关键词如何组合不同的规则，可以参阅：https://github.com/browserslist/browserslist#query-composition

接下来我们来看一下如何配置 browserslist，常见的有三种方式：

1. 在项目的根目录下面创建一个 .browerslistrc 的文件，在里面书写范围列表（这种方式是最推荐的）

```js
>1%
last 2 versions of
not dead
```

2. 在 package.json 里面添加一个 browserslist 字段，然后进行配置：

```json
{
  "name": "xxx",
  "version": : "xxx",
  ...
  "browserslist": [
    "> 1%",
    "last 2 versions",
    "not dead"
  ]
}
```

3. 可以在 postcss.config.js 配置文件中进行配置

```js
module.exports = {
  plugins: [
    require("autoprefixer")({
      overrideBrowserslist: "last 10 versions",
    }),
  ],
};
```

## cssnano

这是一个使用率非常高的插件，因为该插件做的事情是对 CSS 进行一个压缩

cssnano 对应的官网地址：https://cssnano.co/

使用之前第一步还是安装：

```bash
pnpm add cssnano -D
```

之后就是在配置文件中配置这个插件：

```js
module.exports = {
  plugins: [require("autoprefixer"), require("cssnano")],
};
```

简单的使用方式演示完了之后，接下来延伸出来了两个问题：

- 现在我们插件的数量从之前的一个变成多个，插件之间是否有顺序关系？
  - 在 postcss.config.js 文件里面配置插件的时候，一定要注意插件的顺序，这一点是非常重要的，因为有一些插件依赖于其他的插件的输出，你可以将 plugins 对应的数组看作是一个流水线的操作。先交给数组的第一项插件进行处理，之后将处理结果交给数组配置的第二项插件进行处理，以此类推...
- cssnano 是否需要传入配置
  - 理论上来讲，是不需要的，因为 cssnano 默认的预设就已经非常好了，一般我们不需要做其他的配置
  - cssnano 本身又是由一些其他的插件组成的
    - _postcss-discard-comments_：删除 _CSS_ 中的注释。
    - _postcss-discard-duplicates_：删除 _CSS_ 中的重复规则。
    - _postcss-discard-empty_：删除空的规则、媒体查询和声明。
    - _postcss-discard-overridden_：删除被后来的相同规则覆盖的无效规则。
    - _postcss-normalize-url_：优化和缩短 URL。
    - _postcss-minify-font-values_：最小化字体属性值。
    - _postcss-minify-gradients_：最小化渐变表示。
    - _postcss-minify-params_：最小化@规则的参数。
    - _postcss-minify-selectors_：最小化选择器。
    - _postcss-normalize-charset_：确保只有一个有效的字符集 @规则。
    - _postcss-normalize-display-values_：规范化 display 属性值。
    - _postcss-normalize-positions_：规范化背景位置属性。
    - _postcss-normalize-repeat-style_：规范化背景重复样式。
    - _postcss-normalize-string_：规范化引号。
    - _postcss-normalize-timing-functions_：规范化时间函数。
    - _postcss-normalize-unicode_：规范化 _unicode-range_ 描述符。
    - _postcss-normalize-whitespace_：规范化空白字符。
    - _postcss-ordered-values_：规范化属性值的顺序。
    - _postcss-reduce-initial_：将初始值替换为更短的等效值。
    - _postcss-reduce-transforms_：减少变换属性中的冗余值。
    - _postcss-svgo_：优化和压缩内联 SVG。
    - _postcss-unique-selectors_：删除重复的选择器。
    - _postcss-zindex_：重新计算 _z-index_ 值，以减小文件大小。

因此我们可以定制具体某一个插件的行为，例如：

```js
// postcss 配置主要其实就是做插件的配置

module.exports = {
  plugins: [
    require("autoprefixer"),
    require("cssnano")({
      preset: [
        "default",
        {
          discardComments: false,
          discardEmpty: false,
        },
      ],
    }),
  ],
};
```

配置项目的名字可以在 https://cssnano.co/docs/what-are-optimisations/ 这里找到。

## stylelint

stylelint 是规范我们 CSS 代码的，能够将 CSS 代码统一风格。

```bash
pnpm add stylelint stylelint-config-standard -D
```

这里我们安装了两个依赖：

- stylelint：做 CSS 代码风格校验，但是具体的校验规则它是不知道了，需要我们提供具体的校验规则
- stylelint-config-standard：这是 stylelint 的一套校验规则，并且是一套标准规则

接下来我们就需要在项目的根目录下面创建一个 .stylelintrc ，这个文件就使用用来指定你的具体校验规则

```js
{
    "extends": "stylelint-config-standard"
}
```

在上面的代码中，我们指定了校验规则继承 stylelint-config-standard 这一套校验规则

之后在 postcss.config.js 里面进行插件的配置，配置的时候注意顺序

```js
// postcss 配置主要其实就是做插件的配置

module.exports = {
  plugins: [require("stylelint"), require("autoprefixer"), require("cssnano")],
};
```

- 能否在继承了 stylelint-config-standard 这一套校验规则的基础上自定义校验规则

  - 肯定是可以的。因为不同的公司编码规范会有不同，一套标准校验规则是没有办法覆盖所有的公司编码规范

  ```js
  {
      "extends": "stylelint-config-standard",
      "rules": {
          "comment-empty-line-before": null
      }
  }
  ```

  通过上面的方式，我们就可以自定义校验规则。

  至于有哪些校验规则，可以在 stylelint 官网查询到的：https://stylelint.io/user-guide/rules/

- 检查出来的问题能否自动修复

  - 当然也是可以修复的，但是要注意没有办法修复所有类型的问题，只有部分问题能够被修复
  - 要自动修复非常简单，只需要将 stylelint 插件的 fix 配置项配置为 true 即可

  ```js
  // postcss 配置主要其实就是做插件的配置

  module.exports = {
    plugins: [
      require("stylelint")({
        fix: true,
      }),
      require("autoprefixer"),
      // require("cssnano")
    ],
  };
  ```

# postcss 主流插件 part2

这一小节继续介绍 postcss 里面的主流插件：

- _postcss-preset-env_
- _postcss-import_
- _purgecss_

## _postcss-preset-env_

postcss-preset-env 主要就是让开发者可以使用最新的的 CSS 语法，同时为了兼容会自动的将这些最新的 CSS 语法转换为旧版本浏览器能够支持的代码。

_postcss-preset-env_ 的主要作用是：

1. 让你能够使用最新的 _CSS_ 语法，如：_CSS Grid_（网格布局）、_CSS Variables_（变量）等。
2. 自动为你的 _CSS_ 代码添加浏览器厂商前缀，如：-_webkit_-、-_moz_- 等。
3. 根据你的浏览器兼容性需求，将 _CSS_ 代码转换为旧版浏览器兼容的语法。
4. 优化 _CSS_ 代码，如：合并规则、删除重复的代码等。

在正式演示 postcss-preset-env 之前，首先我们需要了解一个知识点，叫做 CSSDB，这是一个跟踪 CSS 新功能和特性的数据库。我们的 CSS 规范一共可以分为 5 个阶段：从 stage0（草案） 到 stage4（已经纳入 W3C 标准）。CSSDB 就可以非常方便的查询某一个特性目前处于哪一个阶段，具体的实现情况目前是什么样的。

下面是关于 stage0 到 stage4 各个阶段的介绍：

- _Stage 0_：草案 - 此阶段的规范还在非正式的讨论和探讨阶段，可能会有很多变化。通常不建议在生产环境中使用这些特性。
- _Stage 1_：提案 - 此阶段的规范已经有了一个正式的文件，描述了新特性的初步设计。这些特性可能在未来变成标准，但仍然可能发生较大的改变。
- _Stage 2_：草稿 - 在这个阶段，规范已经相对稳定，描述了功能的详细设计。一般来说，浏览器厂商会开始实现并测试这些特性。开发者可以在实验性的项目中尝试使用这些功能，但要注意跟踪规范的变化。
- _Stage 3_：候选推荐 - 此阶段的规范已经基本稳定，主要进行浏览器兼容性测试和微调。开发者可以考虑在生产环境中使用这些特性，但需要确保兼容目标浏览器。
- _Stage 4_：已纳入 W3C 标准 - 这些特性已经成为 W3C CSS 标准的一部分，已经得到了广泛支持。开发者可以放心在生产环境中使用这些特性。

你可以在 https://cssdb.org/ 这里看到各种新特性目前处于哪一个阶段。

假设现在我们书写如下的 CSS 代码：

```css
.a {
  color: red;

  &.b {
    color: green;
    transform: translate(100px);
  }

  & > .b {
    color: blue;
  }

  &:hover {
    color: #000;
  }
}
```

这个 CSS 代码使用到了嵌套，这是原本只能在 CSS 预处理器里面才能使用的语法，目前官方已经在考虑原生支持了。

但是现在会涉及到一个问题，如果我们目前直接书写嵌套的语法，那么很多浏览器是不支持的，但是我又想使用最新的语法，我们就可以使用 postcss-preset-env 这个插件对最新的 CSS 语法进行降级处理。

首先第一步需要安装：

```bash
pnpm add postcss-preset-env -D
```

该插件提供了一个配置选项：

- _stage_：设置要使用的 _CSS_ 特性的阶段，默认值为 _2_（_0-4_）。数字越小，包含的 _CSS_ 草案特性越多，但稳定性可能较低。
- _browsers_：设置目标浏览器范围，如：'_last 2 versions_' 或 '> _1_%'。
- _autoprefixer_：设置自动添加浏览器厂商前缀的配置，如：{ _grid_: _true_ }。
- _preserve_：是否保留原始 _CSS_ 代码，默认为 _false_。如果设置为 _true_，则会在转换后的代码后面保留原始代码，以便新浏览器优先使用新语法。

在 postcss.config.js 配置文件中，配置该插件：

```js
// postcss 配置主要其实就是做插件的配置

module.exports = {
  plugins: [
    require("postcss-preset-env")({
      stage: 2,
    }),
  ],
};
```

之后编译生成的 CSS 代码如下：

```css
.a {
  color: red;
}
.a.b {
  color: green;
  -webkit-transform: translate(100px);
  -ms-transform: translate(100px);
  transform: translate(100px);
}
.a > .b {
  color: blue;
}
.a:hover {
  color: #000;
}
```

通过这个插件，我们就可以使用 CSS 规范中最时髦的语法，而不用担心浏览器的兼容问题。

## _postcss-import_

该插件主要用于处理 CSS 文件中 @import 规则。在原生的 CSS 中，存在 @import，可以引入其他的 CSS 文件，但是在引入的时候会存在一个问题，就是客户端在解析 CSS 文件时，发现有 @import 就会发送 HTTP 请求去获取对应的 CSS 文件。

使用 postcss-import：

- 将多个 CSS 文件合并为一个文件
- 避免了浏览器对 @import 规则的额外请求，因为减少了 HTTP 请求，所以提高了性能

```bash
pnpm add postcss-import -D
```

安装完成后，在配置文件中进行一个简单的配置：

```js
// postcss 配置主要其实就是做插件的配置

module.exports = {
  plugins: [
    require("postcss-import"),
    require("postcss-preset-env")({
      stage: 2,
    }),
  ],
};
```

最终编译后的 CSS 结果如下：

```css
.box1 {
  background-color: red;
}
.box2 {
  background-color: blue;
}
.a {
  color: red;
}
.a.b {
  color: green;
  -webkit-transform: translate(100px);
  -ms-transform: translate(100px);
  transform: translate(100px);
}
.a > .b {
  color: blue;
}
.a:hover {
  color: #000;
}
```

另外该插件也提供了一些配置项：

- _path_：设置查找 _CSS_ 文件的路径，默认为当前文件夹。
- _plugins_：允许你指定在处理被 @_import_ 引入的 _CSS_ 文件时使用的其他 _PostCSS_ 插件。这些插件将在 _postcss-import_ 合并文件之前对被引入的文件进行处理，之后再进行文件的合并

例如：

```js
module.exports = {
  plugins: [
    require("postcss-import")({
      path: ["src/css"],
      plugins: [postcssNested()],
    }),
    // 其他插件...
  ],
};
```

在上面的配置中，插件会在 src/css 目录下面去查找被引入的文件，另外文件在被合并到 index.css 之前，会被 postcssNested 这个插件先处理一遍，然后才会被合并到 index.css 里面。

你可以在 https://github.com/postcss/postcss-import 这里看到 postcss-import 所支持的所有配置项。

## _purgecss_

该插件专门用于移除没有使用到的 CSS 样式的工具，相当于是 CSS 版本的 tree shaking（树摇），它会找到你文件中实际使用的 CSS 类名，并且移除没有使用到的样式，这样可以有效的减少 CSS 文件的大小，提升传输速度。

官网地址：https://purgecss.com/

首先我们还是安装该插件：

```bash
pnpm add @fullhuman/postcss-purgecss -D
```

接下来我们在 src 下面创建一个 index.html，书写如下的代码：

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <link rel="stylesheet" href="./index.css" />
</head>
<body>
  <div class="container">
    <div class="box1"></div>
  </div>
</body>
```

该 html 只用到了少量的 CSS 样式类。

目前我们的 index.css 代码如下：

```css
@import "a.css";
@import "b.css";

.a {
  color: red;

  &.b {
    color: green;
    transform: translate(100px);
  }

  & > .b {
    color: blue;
  }

  &:hover {
    color: #000;
  }
}

.container {
  font-size: 20px;
}

p {
  color: red;
}
```

接下来我在 postcss.config.js 配置文件中引入 @fullhuman/postcss-purgecss 这个插件，具体的配置如下：

```js
// postcss 配置主要其实就是做插件的配置

module.exports = {
  plugins: [
    require("postcss-import")({
      path: ["src/css"],
    }),
    require("postcss-preset-env")({
      stage: 2,
    }),
    require("@fullhuman/postcss-purgecss")({
      content: ["./src/**/*.html"],
    }),
  ],
};
```

我们引入 @fullhuman/postcss-purgecss 这个插件后，还做了 content 这个配置项目的相关配置，该配置项表示我具体的参照文件。也就是说，CSS 样式类有没有用上需要有一个具体的参照文件。

最终编译出来的结果如下：

```css
.box1 {
  background-color: red;
}
.container {
  font-size: 20px;
}
```

@fullhuman/postcss-purgecss 这个插件除了 content 这个配置项，还有一个配置项也非常的常用：

- safelist：可以指定一个字符串的值，或者指定一个正则表达式，该配置项目所对应的值（CSS 样式规则）始终保留，即便在参照文件中没有使用到也需要保留

```js
const purgecss = require("@fullhuman/postcss-purgecss");

module.exports = {
  plugins: [
    // 其他插件...
    purgecss({
      content: ["./src/**/*.html", "./src/**/*.js"],
      safelist: [/^active-/],
    }),
  ],
};
```

safelist 所对应的值的含义为：匹配 active- 开头的类名，这些类名即便在项目文件中没有使用到，但是也不要删除。

# Postcss 的工作流程如下图所示：

![工作流程图](https://resource.duyiedu.com/xiejie/2023-06-26-113847.png)

# 自定义插件

在 PostCSS 官网，实际上已经介绍了如何去编写一个自定义插件：https://postcss.org/docs/writing-a-postcss-plugin

1. 需要有一个模板

```js
module.exports = (opts = {}) => {
  // Plugin creator to check options or prepare caches
  return {
    postcssPlugin: "PLUGIN NAME",
    // Plugin listeners
  };
};
module.exports.postcss = true;
```

接下来就可以在插件里面添加一组监听器，对应的能够设置的监听器如下：

- [`Root`](https://postcss.org/api/#root): node of the top of the tree, which represent CSS file.
- [`AtRule`](https://postcss.org/api/#atrule): statements begin with `@` like `@charset "UTF-8"` or `@media (screen) {}`.
- [`Rule`](https://postcss.org/api/#rule): selector with declaration inside. For instance `input, button {}`.
- [`Declaration`](https://postcss.org/api/#declaration): key-value pair like `color: black`;
- [`Comment`](https://postcss.org/api/#comment): stand-alone comment. Comments inside selectors, at-rule parameters and values are stored in node’s `raws` property.

2. 具体示例

现在在我们的 src 中新建一个 my-plugin.js 的文件，代码如下：

```js
module.exports = (opts = {}) => {
  // Plugin creator to check options or prepare caches
  return {
    postcssPlugin: "PLUGIN NAME",
    Declaration(decl) {
      console.log(decl.prop, decl.value);
    },
  };
};
module.exports.postcss = true;
```

在上面的代码中，我们添加了 Declaration 的监听器，通过该监听器能够拿到 CSS 文件中所有的声明。

接下来我们就可以对其进行相应的操作。

现在我们来做一个具体的示例：编写一个插件，该插件能够将 CSS 代码中所有的颜色统一转为十六进制。

这里我们需要使用到一个依赖包：color 该依赖就是专门做颜色处理的

```bash
pnpm add color -D
```

之后通过该依赖所提供的 hex 方法来进行颜色值的修改，具体代码如下：

```js
const Color = require("color");

module.exports = (opts = {}) => {
  // Plugin creator to check options or prepare caches
  return {
    postcssPlugin: "convertColorsToHex",
    Declaration(decl) {
      // 先创建一个正则表达式，提取出如下的声明
      // 因为如下的声明对应的值一般都是颜色值
      const colorRegex = /(^color)|(^background(-color)?)/;
      if (colorRegex.test(decl.prop)) {
        try {
          // 将颜色值转为 Color 对象，因为这个 Color 对象对应了一系列的方法
          // 方便我们进行转换
          const color = Color(decl.value);
          // 将颜色值转换为十六进制
          const hex = color.hex();
          // 更新属性值
          decl.value = hex;
        } catch (err) {
          console.error(
            `[convertColorsToHex] Error processing ${decl.prop}: ${error.message}`
          );
        }
      }
    },
  };
};
module.exports.postcss = true;
```
