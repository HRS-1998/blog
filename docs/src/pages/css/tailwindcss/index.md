# Tailwindcss 基本介绍

_Tailwind CSS_ 是一个<u>高度可定制</u>的、<u>实用类优先</u>的 CSS 框架，用于快速构建现代用户界面。它旨在通过提供一组实用类，使您可以直接在 _HTML_ 标记中应用样式，从而轻松地为 _Web_ 应用程序设置样式。您可以通过**组合**这些实用类来设计样式，而不是编写自定义 _CSS_，这使得编写过程更快速，维护更容易。

本小节我们将会介绍关于 _Tailwind CSS_ 如下的内容：

- 理解 _Tailwind CSS_ 的基本概念
- 开始使用 _Tailwind CSS_

## 理解 _Tailwind CSS_ 的基本概念

_Tailwind CSS_ 是由 _Adam Wathan_ 和 _Jonathan Reinink_ 于 _2017_ 年创立的。它起初是作为一个实验性项目开始的，目的是探讨一种新的、实用类优先的 _CSS_ 方法。这种方法强调使用预先定义的实用类直接在 _HTML_ 中设置样式，而不是编写传统的 _CSS_ 代码。随着时间的推移，这个项目逐渐发展壮大，形成了现在的 _Tailwind CSS_ 框架。

创始人 _Adam Wathan_ 一直对前端开发技术有浓厚兴趣，他在尝试了许多现有的 _CSS_ 框架和方法后，发现它们不能完全满足他的需求。于是，他开始构思一个实用类优先的 _CSS_ 框架，以解决他在前端开发过程中遇到的问题。他将这个框架命名为 _Tailwind CSS_，并将其发布到了 _GitHub_。

在 _Tailwind CSS_ 的早期版本中，它主要关注创建响应式布局，提供了一组实用类用于快速构建响应式网站。随着项目的发展，_Tailwind CSS_ 不断扩展，添加了更多的实用类和功能，例如定制性、插件支持和与现代构建工具的集成。自推出以来，_Tailwind CSS_ 获得了广泛的关注和支持，迅速成为了一种受欢迎的 _CSS_ 框架。开发者社区也逐渐壮大，为框架的发展提供了持续的动力。

_Tailwind CSS_ 目前最新的版本为 _3.x_，官网地址：*https://tailwindcss.com/*

![16876522969428](https://resource.duyiedu.com/xiejie/2023-07-03-012045.jpg)

下面我们来介绍一下 _Tailwind CSS_ 的一些特点：

1. 实用类优先方法

_Tailwind CSS_ 提倡实用类优先的方法，这意味着您将使用预定义的实用类直接在 _HTML_ 标记中应用样式。这种方法鼓励组合性，避免过度定制，这可能导致臃肿且难以维护的 _CSS_。

2. 响应式设计

_Tailwind CSS_ 内置了响应式设计支持，允许您为不同屏幕尺寸定义不同的样式。通过使用响应式变体，如 _sm、md、lg_ 和 _xl_，您可以轻松应用仅在特定断点生效的样式。

3. 定制性

_Tailwind CSS_ 设计为高度可定制化。您可以根据项目需求修改默认配置，例如颜色、字体、间距、断点等。您还可以通过添加自己的实用类或使用插件来扩展框架。

4. 集成 _PurgeCSS_

为了使最终的 _CSS_ 文件保持小巧和优化，_Tailwind CSS_ 集成了 _PurgeCSS_，这是一个从生产构建中删除未使用 _CSS_ 的工具。这样，您只需包含在项目中实际使用的实用类，从而使 _CSS_ 文件更小、加载时间更快。

5. 活跃的社区

_Tailwind CSS_ 拥有一个活跃的开发者社区，这意味着您可以在线找到丰富的资源、教程和支持。社区还为 _Tailwind CSS_ 的插件和工具的开发做出了贡献。

6. 日益增长的采用率

_Tailwind CSS_ 在开发者和公司中越来越受欢迎，许多项目已经开始采用它，取代了旧的 _CSS_ 框架或方法。其实用类优先的方法和易于定制的特性使其成为现代 _Web_ 开发的首选。

最后，我们再来看一看 _Tailwind CSS_ 与其他 _CSS_ 框架（如 _Bootstrap_、_Bulma_ 等）的比较：

1. 设计哲学

_Tailwind CSS_ 一个重要特点是高度可定制。采用实用类优先的方法，鼓励直接在 _HTML_ 中使用预定义的实用类来设置样式，而不是依赖预构建的组件。这种方法提倡组合性和功能的重用，让开发者有更大的自由度来设计和定制用户界面，开发者可以轻松地修改默认配置，包括颜色、字体、间距、断点等。这使得 _Tailwind CSS_ 非常适合创建具有独特设计的项目。

例如下面是一个使用 _Tailwind CSS_ 书写的 _button_：

```html
<button
  class="bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 text-white font-bold py-2 px-4 rounded"
>
  Click Me
</button>
```

相比之下，_Bootstrap_ 和 _Bulma_ 等框架更注重组件化。它们提供了一组预构建的、样式化的组件，如按钮、导航栏、表格等，这使得开发者能够快速构建用户界面，但可能在定制方面受到限制。要实现自定义样式，通常需要编写额外的 _CSS_ 代码来覆盖默认样式。

例如下面是一个使用 _Bootstrap_ 书写的 _button_：

```html
<button class="btn btn-primary">Click</button>
```

2. 学习曲线

由于 _Tailwind CSS_ 使用实用类优先的方法，初次使用时可能需要一定的时间来适应。然而，一旦掌握了其方法和实用类，开发者通常发现它非常直观且易于维护。

与之相反，_Bootstrap_ 和 _Bulma_ 等框架由于其组件化的特性，可能会更容易上手。开发者只需理解如何在 _HTML_ 中使用预定义的组件，而不必学习大量的实用类。

3. 文件大小和性能

_Tailwind CSS_ 集成了 _PurgeCSS_，可以在生产版本中自动删除未使用的 _CSS_，从而使最终文件大小保持较小。这有助于提高页面加载速度和性能。

_Bootstrap_ 和 _Bulma_ 通常会包含许多预构建组件和样式，这可能导致较大的文件大小。虽然可以通过自定义构建来减小文件大小，但这需要额外的配置和工作。

## 快速上手案例

首先我们需要创建一个新的项目 tailwindcss-demo，然后使用 pnpm init 进行初始化。安装 tailwindcss

```bash
pnpm add tailwindcss -D
```

接下来我们需要生成一个 tailwindcss 的配置文件：

```bash
npx tailwindcss init
```

并且修改 content 内容，配置模板文件路径：

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

接下来在 src 下面创建一个 styles.css，然后书写如下的代码：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- base: 这个指定表示导入 tailwindcss 的基本样式，里面会包含一些预设样式，主要目的是重置浏览器的样式，重置了浏览器样式之后，可以保证所有的浏览器中的外观是一致的。
- components：组件样式，默认情况下没有任何的组件样式，后期我们可以在配置文件里面自定义我们的组件样式，以及使用第三方插件添加一些组件样式，这一条指令是为了让自定义组件样式以及其他第三方组件样式能够生效。
- utilities：这个指令就是导入实用的原子类。

接下来在 src 目录下面创建一个 index.html

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <link rel="stylesheet" href="/dist/output.css" />
</head>
<body class="bg-gray-100">
  <div class="flex items-center justify-center min-h-screen">
    <button
      class="bg-yellow-400 hover:bg-yellow-600 focus:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 text-white font-bold py-2 px-4 rounded"
    >
      Click Me
    </button>
  </div>
</body>
```

在上面的代码中，我们大量的使用到了 tailwindcss 所提供的原子类，并且引入了一个 output.css 的文件，该文件是经过 tailwindcss 编译后的文件。

```js
"start": "npx tailwindcss -i ./src/styles.css -o ./dist/output.css --watch"
```

上面的脚本表示实用 tailwindcss 对 src/styles.css 文件进行编译，编译生成 output.css，--watch 表示监听，当原文件发生改变的时候，重新执行编译。

# Tailwindcss 实战案例一

## 变体

在 tailwindcss 中，变体允许你根据元素不同状态来应用原子类，例如：

```html
<button
  class="bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
>
  Click me
</button>
```

变体的表现形式一般为 xx:原子类名，表示当元素处于 xx 状态的时候，应用后面的原子类。

常见的状态有：

- hover
- focus
- active
- visited

变体还有分组变体，父元素处于某一个状态的时候，子元素应用对应的原子类：

```html
<div class="group">
  <p class="text-gray-500 group-hover:text-blue-500">Hello, world!</p>
</div>
```

在上面的代码中，当鼠标悬停在 div 或者 p 上面的时候，p 元素应用 text-blue-500 原子类。

深度选择器变体，同级的元素处于特定状态时，该元素应用对应的原子类样式。

```html
<input type="checkbox" class="peer" />
<label class="text-gray-500 peer-checked:text-blue-500">Check me</label>
```

在上面的代码中，当 input 处于 check 状态的时候，label 元素会应用 text-blue-500 原子类。注意，要使用深度选择器，需要安装 @tailwindcss/forms 插件，还需要在配置文件中的 variants 里面做一定的配置。

## 实战笔记

自定义样式类，在配置文件中的 theme 下面的 extend 可以扩展样式类，例如：

```js
theme: {
    extend: {
      backgroundColors: {
        "custom-gray":"#333"
      }
    },
  },
```

- text-xs : font-size: 12px;
- mx-auto: margin-left: auto; margin-right: auto;
- clear-both: clear: both;
- float-left: float: left;
- leading-10: line-height: 2.5rem; /_ 40px _/
- py-0: padding-top: 0px; padding-bottom: 0px;
- border: border-width: 1px;
- border-solid: border-style: solid;
- border-r: border-right-width: 1px;
- text-white: color: rgb(255 255 255);
- float-right: float: right;
- relative: position: relative;
- w-full: width: 100%
- h-full: height: 100%
- block: display: block
- text-center: text-align: center
- bg-white: background-color: rgb(255 255 255);
- absolute: position: absolute;
- right-0: right: 0px;
- top-10: top: 2.5rem; /_ 40px _/
- border-t-0: border-top-width: 0px;
- z-50: z-index: 50;
- overflow-hidden: overflow: hidden;
- hidden: display: none;

接下来我们要做父元素 hover 的时候，子元素显示出来，这里就需要使用到分组变体，分组变体同样需要在配置文件配置一下

```js
variants: {
    extend: {
      display: ["group-hover"],
      backgroundColor: ["group-hover"],
      textColor: ["group-hover"],
    }
 },
```

# Tailwindcss 实战案例二

## 自定义主题

在开始本小节的实战之前，我们先来介绍一下 _Tailwind CSS_ 中如何自定义主题。

在 _Tailwind CSS_ 中，虽然提供了大量预设样式，但有时您可能需要自定义样式以满足特定需求。_Tailwind_ 提供了多种方法来自定义样式，包括扩展现有配置、添加新配置、编写自定义 _CSS_ 和创建插件。

1. 扩展现有主题

要自定义现有的 _Tailwind_ 主题，您需要在项目根目录下创建一个名为 _tailwind.config.js_ 的文件。通过在这个文件中的 _theme.extend_ 对象中添加配置，您可以扩展或覆盖默认配置。以下是一个示例：

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      backgroundColor: {
        primary: "#1D3557",
        secondary: "#457B9D",
      },
      textColor: {
        primary: "#1D3557",
        secondary: "#457B9D",
      },
    },
  },
  variants: {},
  plugins: [],
};
```

在这个例子中，我们扩展了背景颜色和文本颜色的配置，添加了新的 _primary_ 和 _secondary_ 颜色。现在，您可以在项目中使用这些新的颜色类：

```html
<div class="bg-primary text-primary">
  <!-- Your content goes here -->
</div>
```

2. 添加新主题

除了扩展现有主题，您还可以在 _tailwind.config.js_ 文件中添加全新的配置。例如，假设您想要添加自定义的阴影配置：

```js
// tailwind.config.js
module.exports = {
  theme: {
    boxShadow: {
      custom: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    extend: {
      // Your other configurations go here
    },
  },
  variants: {},
  plugins: [],
};
```

在这个例子中，我们为阴影添加了一个名为 _custom_ 的新配置。现在，您可以在项目中使用这个新的阴影类：

```html
<div class="shadow-custom">
  <!-- Your content goes here -->
</div>
```

但是需要注意的是，**在这种情况下将完全替换默认的阴影预设**，而不仅仅是扩展它们。请谨慎使用此方法，因为它会删除所有其他预定义的阴影预设。

3. 编写自定义 _CSS_

有时，您可能需要编写自定义 _CSS_ 来实现特定的样式。为此，您可以在项目中创建一个单独的 _CSS_ 文件，并在其中编写自定义样式。然后，确保在您的 HTML 文件中引用这个 _CSS_ 文件。

例如，创建一个名为 _custom.css_ 的文件，并添加以下内容：

```css
/* custom.css */
.custom-border {
  border: 2px solid #1d3557;
}
```

在 _HTML_ 文件中，首先引用 _Tailwind CSS_，然后引用您的自定义 _CSS_ 文件：

```html
<head>
  <link href="/path/to/tailwind.css" rel="stylesheet" />
  <link href="/path/to/custom.css" rel="stylesheet" />
</head>
```

现在，您可以在项目中使用这个自定义边框类：

```html
<div class="custom-border">
  <!-- Your content goes here -->
</div>
```

## 实战笔记

在使用原生 CSS 来书写效果的时候，我们使用到了伪元素选择器：

```html
<span class="girl"></span>
```

```css
.girl::before {
  background-color: hotpink;
}
```

但是在 Tailwindcss 里面，并没有支持伪元素的原子类，但是有很多的替代方案，例如可以使用之前书写 CSS 的方式，也可以修改一下结构，例如我们将上面的结构修改为如下：

```html
<div>
  <div></div>
</div>
```

- m-0: margin:0px
- p-0: padding:0px
- w-screen: width:100vw;
- h-screen: height:100vh
- flex: display: flex;
- justify-center: justify-content: center;
- items-center: align-items: center;
- w-32: width: 8rem; /_ 128px _/

首先我们的 container 盒子的宽度需要为 280px，在 tailwindcss 里面，width 对应了大多数 rem 单位的值，我们这里设置字体的大小为 35px，280/35 = 8rem ---> w-32

- justify-between: justify-content: space-between;

最后是关于动画，一般来讲，需要在配置文件中配置动画，配置分为两个方面：keyframes 和 animation

```js
// 这里配置了一个名为 slide 的针对对象
keyframes: {
        slide: {
          "0%": {
            transform: "translateX(0)",
            filter: "brightness(1)",
          },
          "100%": {
            transform: "translateX(236px)",
            filter: "brightness(1.45)",
          },
        },
}
// 定义了一个名为 slide 的动画类
animation: {
        slide:"slide 1.5s ease-in-out infinite alternate",
}
```

之后就可以在 html 里面使用这个动画类，注意使用的时候前缀为 animate-xxx，例如：

```html
<div class="aniamte-slide"></div>
```

# TailwindCSS 插件

TailwindCSS 中是允许我们自定义插件和组件的。需要注意一下两者之间的区别，插件一般指的是实现某一个具体的功能，组件一般是指封装了一段公共的代码。

## 自定义插件

要创建一个自定义插件，非常的简单，只需要在 tailwindcss 的配置文件中配置 plugins 配置项，该配置项对应的是一个数组，因为插件可以配置多个。数组里面的每一项是一个函数，该函数就是一个插件。

```js
// tailwind.config.js
module.exports = {
  // ...other configurations...
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        ".bg-skew-12": {
          transform: "skewY(-12deg)",
        },
        ".bg-skew-6": {
          transform: "skewY(-6deg)",
        },
        ".bg-skew-0": {
          transform: "skewY(0deg)",
        },
        ".bg-skew-6-reverse": {
          transform: "skewY(6deg)",
        },
        ".bg-skew-12-reverse": {
          transform: "skewY(12deg)",
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
```

在上面的代码中，我们创建了一个自定义插件，该插件用于添加了一组倾斜的背景效果。之后使用 addUtilities 方法将这些样式类添加到项目里面。

自定义了插件之后，我们就可以在 HTML 里面使用插件中所定义的样式类

```html
<div class="bg-skew-12"></div>
```

下面是关于插件的另外一个例子：

```js
// tailwind.config.js
module.exports = {
  theme: {
    // Your other configurations go here
  },
  variants: {},
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        "@keyframes spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        ".spin": {
          animation: "spin 1s linear infinite",
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
```

在上面的代码中，我们创建了一个名为 spin 的自定义动画类，之后我们就可以在 HTML 中使用这个动画类：

```html
<div class="spin"></div>
```

## 使用社区的插件

使用社区的插件那就更简单了，只需要安装，之后在配置文件中配置该插件即可。

例如有一个名为 @tailwindcss/typography

```bash
pnpm add @tailwindcss/typography -D
```

然后在配置文件中导入该插件：

```js
module.exports = {
  // ....
  plugins: [require("@tailwindcss/typography")],
};
```

参阅插件文档使用就可以了，例如：

```html
<div class="prose"></div>
```

目前关于 tailwindcss 的插件，有一些，但是官方没有一个完整的列表，你可以参阅下面的资源来寻找 tailwindcss 插件：

- _Tailwind CSS_ 官方插件：_Tailwind_ 团队开发了一些官方插件，您可以在官网左侧的 _Official Plugins_ 看到这些插件：
  - _Typography_：用于排版样式的预设。
  - _Aspect Ratio_：用于控制元素的宽高比。
  - _Forms_：为表单元素提供美观且一致的默认样式。
  - _Line Clamp_：用于限制文本行数和显示省略号。
- _Awesome Tailwind CSS_：_Awesome Tailwind CSS_ 是一个 _GitHub_ 仓库，收集了许多与 _Tailwind CSS_ 相关的资源，包括插件、组件、模板等。仓库地址：https://github.com/aniftyco/awesome-tailwindcss
- _npm_ 搜索：您还可以在 _npm_ 上搜索带有 "_tailwindcss_" 关键字的插件。虽然这种方法可能会返回较多结果，但它可以帮助您找到一些非常具体或新发布的插件。

# Tailwindcss 组件

在前面的学习中，我们发现很多时候一些标签所应用的原子类是一样的。例如：

```html
<div class="float-left text-center flex items-center bg-blue-100 block"></div>
<div class="float-left text-center flex items-center bg-blue-100 block"></div>
<div class="float-left text-center flex items-center bg-blue-100 block"></div>
<div class="float-left text-center flex items-center bg-blue-100 block"></div>
<div class="float-left text-center flex items-center bg-blue-100 block"></div>
```

像上面的情况，很多标签所应用的原子类都是一样的，那么我们就可以将其封装为一个组件。

在 tailwind 里面，要封装一个组件可以使用 @apply 指令，该指令后面就可以跟上一组原子类，然后给这个指令取一个名字即可。

```css
.item {
  @apply float-right text-center flex items-center bg-blue-100 block;
}
```

回头在 html 中只需要挂上 item 这个类即可

```html
<div class="item"></div>
<div class="item"></div>
<div class="item"></div>
<div class="item"></div>
<div class="item"></div>
```

通过组件的方式，可以大大减少我们代码的冗余，提高代码的可维护性。

## 实战案例笔记

在使用深度选择器的时候，我们在 input 上面设置了 peer 这个类，然后在同级的 div 上面设置了 peer:checked

```html
<input type="radio" name="swith" checked class="btn peer" />
<div class="bg-img-2 bg peer-checked:opacity-100"></div>
```

上面的代码中表示，当 input 被 checked 的时候，div 会应用 opacity-100 这个样式类。

还需要在配置文件中配置一下：

```js
variants: {
    extend: {
      opacity: ["peer-checked"]
    },
 },
```

还需要注意 peer-checked 后面要应用的类必须是 tailwind 里面内置的原子类。

# 响应式设计

## 响应式断点

_Tailwind CSS_ 默认提供了一组预设的断点，即屏幕尺寸范围，用于管理响应式样式。默认的断点包括：

- _sm_: _640px_ 及以上
- _md_: _768px_ 及以上
- _lg_: _1024px_ 及以上
- _xl_: _1280px_ 及以上
- _2xl_: _1536px_ 及以上

例如：

```html
<img class="w-16 md:w-32 lg:w-48" src="..." />
```

在这个例子中，\<_img_> 标签的 _class_ 属性包含了一组 _Tailwind CSS_ 类，用于根据不同的屏幕尺寸调整图片的宽度。让我们详细解释这些类的含义：

- _w-16_: 默认情况下，图片的宽度被设置为 _4rem_（_16_ x _0.25rem_）。
- _md:w-32_: 当屏幕尺寸达到 "_medium_" (_md_) 断点（默认为 _768px_ 及以上）时，图片的宽度将被设置为 _8rem_（_32_ x _0.25rem_）。
- _lg:w-48_: 当屏幕尺寸达到 "_large_" (_lg_) 断点（默认为 _1024px_ 及以上）时，图片的宽度将被设置为 _12rem_（_48_ x _0.25rem_）。

其中的 _md_ 等价于 @_media_ (_min-width_: _768px_) { ... }

您还可以根据需要在 _tailwind.config.js_ 文件中自定义断点。例如：

```js
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    // ...其他配置
    // 如果你只是想新增一两个断点，那么还是建议在 extend 里面进行扩展
  },
  variants: {},
  plugins: [],
};
```

在这个例子中，我们添加了一个名为 _xs_ 的新断点，其屏幕尺寸为 _480px_ 及以上。现在，您可以在 _HTML_ 中使用 _xs_ 前缀来应用响应式样式，例如：

```html
<div class="w-full xs:w-1/2">
  <!-- Your content goes here -->
</div>
```

有时，您可能需要根据屏幕尺寸控制元素的显示状态。_Tailwind CSS_ 提供了一系列响应式显示类来实现这一点。例如：

```html
<div class="hidden md:block">
  <!-- This content is hidden on small screens and visible on medium screens and above -->
</div>
```

在这个例子中，我们使用 _hidden_ 类将元素默认设置为隐藏状态，然后使用 _md:block_ 类在中等尺寸屏幕和更大的屏幕上显示元素。

再来看一下弹性盒和网格布局相关的例子。例如：

```html
<div class="flex flex-col lg:flex-row">
  <div class="w-full lg:w-1/3">
    <!-- Column 1 content -->
  </div>
  <div class="w-full lg:w-1/3">
    <!-- Column 2 content -->
  </div>
  <div class="w-full lg:w-1/3">
    <!-- Column 3 content -->
  </div>
</div>
```

在这个例子中，我们使用 _flex flex-col_ 类将 _Flexbox_ 布局默认设置为垂直方向。随后，在大屏幕（_lg_ 断点）上，我们使用 _lg:flex-row_ 类将布局切换为水平方向。

类似地，您可以使用响应式 _Grid_ 类来创建自适应 _Grid_ 布局。例如：

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <div>
    <!-- Column 1 content -->
  </div>
  <div>
    <!-- Column 2 content -->
  </div>
  <div>
    <!-- Column 3 content -->
  </div>
</div>
```

在这个例子中，我们使用 _grid grid-cols-1_ 类将 _Grid_ 布局默认设置为单列。随后，在中等尺寸屏幕上，我们使用 _md:grid-cols-2_ 类将布局切换为双列，而在大屏幕上，我们使用 _lg:grid-cols-3_ 类将布局切换为三列。

# 夜间模式

在 tailwindcss 里面，要开启夜间模式，非常非常简单，只需要使用 dark: 变体即可，dark: 后面跟上原子类，表示夜间模式下面需要应用的原子类。

例如：

```html
<body class="bg-gray-100 dark:bg-gray-900"></body>
```

在上面的代码中，如果是白天模式，body 这个标签会应用 bg-gray-100 这个原子类，如果是夜间模式，那么就会应用 bg-gray-900 这个原子类。

因此要支持夜间模式，其实主要的工作就是针对一个元素编写两套不同的原子类，一套适用于白天模式，另外一套适用于夜间模式。

例如：

```html
<body class="bg-gray-100 dark:bg-gray-900">
  <div class="container mx-auto px-4 py-12">
    <div
      class="bg-white dark:bg-gray-800 shadow-lg rounded-lg max-w-md mx-auto p-8"
    >
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">
        Card Title
      </h2>
      <p class="mt-4 text-gray-600 dark:text-gray-300">
        This is a sample card with a title, paragraph, and a button. The card
        will automatically switch between light and dark modes based on your
        system settings.
      </p>
      <button
        class="mt-6 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm dark:bg-yellow-400 dark:hover:bg-yellow-500 dark:text-gray-900"
      >
        Click me
      </button>
    </div>
  </div>
</body>
```

在上面的代码中，我们就针对了不同的元素都设置了两套原子类样式，主要一般设置夜间模式的时候，只会去修改元素的颜色相关的信息，其他内容一般是不会动的。

接下来我们需要在配置文件里 main 配置夜间模式，tailwindcss 支持两套配置方案：

- 跟随系统

只需要在配置文件中将 darkMode 配置项配置为 media 即可

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  // ...
};
```

- 手动切换

需要将配置文件中的 darkMode 配置为 class

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // ...
};
```

之后通过切换 html 根元素的 dark 样式类来达到切换夜间模式的效果。也就是说，如果 html 根元素挂载了 dark 这个样式类，那么就是夜间模式，如果没有挂载 dark 这个样式类，就不是夜间模式。

# 生产构建优化

在 Tailwindcss 里面包含了大量的原子类，但是在实际开发中，我们并不是说所有的原子类都会用到，因此在最终构建 css 的时候我们应该将没有使用到的原子类进行删除操作，从而优化我们的构建产物。

## tree shaking

这里在 tailwindcss 里面要进行 tree shaking 操作，会用到 purgecss 插件，该插件实际上就是做 css 版本的 tree shaking，会将没有使用到的样式类进行一个删除。tailwindcss 里面是内置了 purgecss 插件的，原因很简单，tailwindcss 是一定需要做 tree shkaing 的，因为 tailwindcss 里面有大量的原子类。

tailwindcss 是从 v1.4 版本开始内置 purgecss 的，最初的时候需要在配置文件里面配置一个名为 purge 的配置项：

```js
// tailwind.config.js
module.exports = {
  purge: {
    content: [
      "./src/**/*.html",
      "./src/**/*.js",
      "./src/**/*.jsx",
      "./src/**/*.ts",
      "./src/**/*.tsx",
      "./src/**/*.vue",
    ],
    options: {
      safelist: ["bg-red-500", /^text-/],
    },
  },
  // ...
};
```

从 tailwindcss v2.0 开始，移除了 purge 配置项，直接在根配置项目下面配置 content 以及 safelist 即可：

```js
module.exports = {
  content: [
    // 项目中需要扫描并移除未使用样式的文件路径
    "./src/**/*.html",
    "./src/**/*.vue",
    "./src/**/*.jsx",
    // ...
  ],
  safelist: ["bg-red-500", "text-3xl", "lg:text-4xl"],
};
```

接下来我们来看一个实际的例子：

```html
<body class="bg-gray-100">
  <div class="flex items-center justify-center min-h-screen">
    <button
      class="bg-blue-400 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
    >
      Click Me
    </button>
  </div>
</body>
```

配置文件如下：

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

之后在生成的 output.css 文件中，我们可以看到生成的文件已经做了 tree shaking 操作，只包含上面 html 文件中使用到了的原子类。

如果要保留某个原子类，直接在 safelist 里面来做配置

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  safelist: ["absolute"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## 限制变体的生成

tailwindcss 为了支持元素能够设置不同状态的原子类，所以推出了变体的功能，常见的变体：hover、focus、checked... 我们可以在这些变体后面添加原子类，表示该元素处于该变体状态时应用其原子类：

```html
<button
  class="bg-blue-400 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
>
  Click Me
</button>
```

但是这里会涉及到一个问题，变体和原子类之间是可以产生数量非常巨大的组合的。例如 hover 变体可以和所有的原子类组合在一起，focus 变体也可以和所有的原子类组合在一起，在早期的时候，我们可以限制变体的生成，只需要在配置文件里面的 variants 配置项中进行一定的配置即可：

```js
module.exports = {
  // ...
  variants: {
    backgroundColor: ["hover", "focus"],
    textColor: ["hover", "focus"],
  },
  // ...
};
```

在上面的配置中，我们就限制了变体的生成，仅仅只会对 backgroundColor 和 textColor 这两个原子类生成对应的 hover 以及 focus 变体，对生成的 CSS 文件进行了一个优化。

从 tailwindcss v2.0 开始，变体默认就是按需生成的，也就是说现在不需要在配置文件中进行变体的配置了，当然这个要不要配置最终取决于你使用的 tailwind 的版本。

## 使用 Postcss 进行后处理

tailwindcss 本身就是基于 postcss 进行构建的，因此可以和其他的 postcss 插件一起使用，进一步的优化生成构建。

下面是一个使用 postcss 插件的具体实例：

假设我们使用 cssnano 来对最终生成的 CSS 做一个压缩的处理，另外我们在生成最终的 CSS 的时候需要使用到 postcss 为我们提供的命令行里面的命令，所以还需要安装 postcss-cli

```bash
pnpm add cssnano postcss-cli -D
```

接下来需要在项目的根目录下面创建一个 postcss 的配置文件，书写如下的配置：

```js
const tailwindcss = require("tailwindcss");
const cssnano = require("cssnano");

module.exports = {
  plugins: [
    tailwindcss,
    cssnano({
      preset: "default",
    }),
  ].filter(Boolean),
};
```

在上面的配置中，filter(Boolean) 表示过滤数组里面的假值，例如：

```js
const isProduction = false;
const plugins = [
  "plugin1",
  "plugin2",
  isProduction && "plugin3",
  isProduction && "plugin4",
];

console.log(plugins);
// 输出：['plugin1', 'plugin2', false, false]

const filteredPlugins = plugins.filter(Boolean);

console.log(filteredPlugins);
// 输出：['plugin1', 'plugin2']
```

这样可以确保数组中使用到的都是真实的插件，false 值被移除掉。

最后一步，就是在 package.json 里面添加新的命令脚本：

```json
"build": "postcss ./src/styles.css -o ./dist/output.css --watch"
```


# Tailwindcss 收官总结



整个这一章我们学习了关于 Tailwind 的大部分知识：

- 各种各样、数量庞大的实用类（原子类）
  - 这个是整个 Tailwindcss 的灵魂
  - 针对这一块的学习，最好的方式还是通过练习，在练习中慢慢熟悉常用的原子类
- 变体
  - 状态变体
    - hover、focus、checked...
  - 分组变体（group）
  - 深度选择器变体（peer）
  - 响应式开发（媒体查询：sm、md、lg）
  - 夜间模式（dark）
- 插件
  - 本质上就是一个函数，不要想那么复杂
  - 一般通过这个函数可以批量的添加自定义类
- 组件
  - 解决多个标签使用重复的类（原子类、自定义类）的问题
  - @apply xxx xxx xxx;
- 和 Postcss 集成
  - Tailwindcss 本身就是基于 Postcss 构建的，因此不需要安装 Postcss
  - 但是使用的时候需要安装具体的 Postcss 相关的插件
  - 在 Postcss 的配置文件中进行配置即可



Tailwindcss 本身也是在不断的进行更新的，所以随着时间的推移，后面会出现课程里面没有讲过的内容，也是非常正常。例如现在在新版本的 Tailwindcss 里面已经开始支持伪元素选择器了。



因此在学习的时候，不要去纠结某一个知识点课程里面有没有介绍，这个课程的目的是为了让你熟悉 Tailwindcss，以及知道Tailwindcss 的核心概念还有绝大多数场景下面的使用。



最后我们来思考一个问题：那就是为什么现在 Tailwindcss 会非常流行？

在我看来，Tailwindcss的大流行和现代前端的开发模式有很大的关系。如果把时间拨回到现代前端框架出现之前，那个时候流行的还是多页应用，书写的也是原生 CSS，如果在那个时候出现 Tailwindcss 或者和 Tailwindcss 类似的技术，意义其实不大，因为大家并不能从 Tailwindcss 里面感受到多大的便利，反而还增加了学习成本，因为里面有大量的新的样式类。

但是如果我们把时间快进到现在，现在的前端开发发生了巨大的变化，现在流行的是组件化开发以及使用状态来驱动视图。

首先来看组件化，相比一个整体的页面，一个组件的 HTML 和 CSS 的量会明显减少很多，前面我们使用 tailwindcss 来改写小米整个网页的时候，其实并没有感受到多大的便利，反而觉得很麻烦，需要去书写很多的原子类。

但是相比一个整体的页面，一个组件的 HTML 和 CSS 的量减少了很多，正因为 HTML 和 CSS 的量减少了很多，因此相比原生的 CSS，Tailwindcss这种开发方式，哪怕不说是多优秀，但是至少是打个平手。



那么为什么会这么火呢？实际上是第二个原因（状态来驱动视图）造就了 tailwindcss 大流行。在现代前端框架里面，都是使用状态来驱动视图，期望使用状态来控制视图里面的一切。

例如，下面是一个 Vue 的组件：

```vue
<template>
    <div id="app">
        <div :class="test">{{content}}</div>
    </div>
</template>
<script>
export default {
 name: "App",
 data(){
    return {
        // 根据 test 对象的属性决定有哪些值
        test: {
            abc: true,
            def: true,
            ghi: false
        },
        content: "this is a test"
    }
 }
}
</script>
```

在上面的 vue 组件中，我们可以直接通过控制 test 的状态值来决定组件挂载什么样式类。

刚好我们的 tailwindcss 就提供了一堆的原子类，那么 vue 里面要控制具体的某一条样式就非常的得心应手了，能够达到一个非常细粒度的控制，精确到某一条样式的声明。



