# Sass 基础语法

- 注释
- 变量
- 数据类型
- 嵌套语法
- 插值语法
- 运算

## 注释

CSS 里面的注释 /\* \*/ ，Sass 中支持 // 来进行注释，// 类型的注释再编译后是会消失

```scss
/*
  Hello
*/

// World
```

```css
/*
  Hello
*/
```

如果是压缩输出模式，那么注释也会被去掉，这个时候可以在多行注释的第一个字符书写一个 ! ，此时即便是在压缩模式，这条注释也会被保留，通常用于添加版权信息

```scss
/*!
  该 CSS 作者 XXX
  创建于 xxxx年xx月xx日
*/

.test {
  width: 300px;
}
```

```css
/*!
  该 CSS 作者 XXX
  创建于 xxxx年xx月xx日
*/
.test {
  width: 300px;
}
```

## 变量

这是当初 Sass 推出时一个极大的亮点，支持变量的声明，声明方式很简单，通过 $ 开头来进行声明，赋值方法和 CSS 属性的写法是一致的。

```scss
// 声明变量
$width: 1600px;
$pen-size: 3em;

div {
  width: $width;
  font-size: $pen-size;
}
```

```css
div {
  width: 1600px;
  font-size: 3em;
}
```

变量的声明时支持块级作用域的，如果是在一个嵌套规则内部定义的变量，那么就只能在嵌套规则内部使用（局部变量），如果不是在嵌套规则内定义的变量那就是全局变量。

```scss
// 声明变量
$width: 1600px;

div {
  $width: 800px;
  $color: red;

  p.one {
    width: $width; /* 800px */
    color: $color; /* red */
  }
}

p.two {
  width: $width; /* 1600px */
  color: $color; /* 报错，因为 $color 是一个局部变量 */
}
```

可以通过一个 !global 将一个局部变量转换为全局变量

```scss
// 声明变量
$width: 1600px;

div {
  $width: 800px;
  $color: red !global;

  p.one {
    width: $width;
    color: $color;
  }
}

p.two {
  width: $width;
  color: $color;
}
```

```css
div p.one {
  width: 800px;
  color: red;
}

p.two {
  width: 1600px;
  color: red;
}
```

## 数据类型

因为 CSS 预处理器就是针对 CSS 这一块融入编程语言的特性进去，所以自然会有数据类型。

在 Sass 中支持 7 种数据类型：

- 数值类型：1、2、13、10px
- 字符串类型：有引号字符串和无引号字符串 "foo"、'bar'、baz
- 布尔类型：true、false
- 空值：null
- 数组（list）：用空格或者逗号来进行分隔，1px 10px 15px 5px、1px,10px,15px,5px
- 字典（map）：用一个小括号扩起来，里面是一对一对的键值对 (key1:value1, key2:value2)
- 颜色类型：blue、#04a012、rgba(0,0,12,0.5)

### 数值类型

Sass 里面支持两种数值类型：<u>带单位数值</u> 和 <u>不带单位的数值</u>，数字可以是正负数以及浮点数

```scss
$my-age: 19;
$your-age: 19.5;
$height: 120px;
```

### 字符串类型

支持两种：<u>有引号字符串</u> 和 <u>无引号字符串</u>

并且引号可以是单引号也可以是双引号

```scss
$name: "Tom Bob";
$container: "top bottom";
$what: heart;

div {
  background-image: url($what + ".png");
}
```

```css
div {
  background-image: url(heart.png);
}
```

### 布尔类型

该类型就两个值：true 和 false，可以进行逻辑运算，支持 and、or、not 来做逻辑运算

```scss
$a: 1>0 and 0>5; // false
$b: "a" == a; // true
$c: false; // false
$d: not $c; // true
```

### 空值类型

就一个值：null 表示为空的意思

```scss
$value: null;
```

因为是空值，因此不能够使用它和其他类型进行算数运算

### 数组类型

数组有两种表示方式：<u>通过空格来间隔</u> 以及 <u>通过逗号来间隔</u>

例如：

```scss
$list0: 1px 2px 5px 6px;
$list1: 1px 2px, 5px 6px;
$list2: (1px 2px) (5px 6px);
```

关于数组，有如下的注意事项：

1. 数组里面可以包含子数组，例如 1px 2px, 5px 6px 就是包含了两个数组，1px 2px 是一个数组，5px 6px 又是一个数组，如果内外数组的分隔方式相同，例如都是采用空格来分隔，这个时候可以使用一个小括号来分隔 (1px 2px) (5px 6px)
2. 添加了小括号的内容最终被编译为 CSS 的时候，是会被去除掉小括号的，例如 (1px 2px) (5px 6px) ---> 1px 2px 5px 6px

```scss
$list0: 1px 2px 5px 6px;
$list1: 1px 2px, 5px 6px;
$list2: (1px 2px) (5px 6px);

div {
  padding: $list2;
}
```

```css
div {
  padding: 1px 2px 5px 6px;
}
```

3. 小括号如果为空，则表示是一个空数组，空数组是不可以直接编译为 CSS 的

```scss
$list2: ();

div {
  padding: $list2; // 报错
}
```

但是如果是数组里面包含空数组或者 null 空值，编译能够成功，空数组以及空值会被去除掉

```scss
$list2: 1px 2px null 3px;
$list3: 1px 2px () 3px;

div {
  padding: $list2;
}

.div2 {
  padding: $list3;
}
```

4. 可以使用 nth 函数去访问数组里面的值，注意数组的下标是从 1 开始的。

```scss
// 创建一个 List
$font-sizes: 12px 14px 16px 18px 24px;

// 通过索引访问 List 中的值
$base-font-size: nth($font-sizes, 3);

// 使用 List 中的值为元素设置样式
body {
  font-size: $base-font-size;
}
```

```css
body {
  font-size: 16px;
}
```

最后我们来看一个实际开发中用到数组的典型案例：

```scss
$sizes: 40px 50px 60px;

@each $s in $sizes {
  .icon-#{$s} {
    font-size: $s;
    width: $s;
    height: $s;
  }
}
```

```css
.icon-40px {
  font-size: 40px;
  width: 40px;
  height: 40px;
}

.icon-50px {
  font-size: 50px;
  width: 50px;
  height: 50px;
}

.icon-60px {
  font-size: 60px;
  width: 60px;
  height: 60px;
}
```

### 字典类型

字典类型必须要使用小括号扩起来，小括号里面是一对一对的键值对

```scss
$a: (
  $key1: value1,
  $key2: value2,
);
```

可以通过 map-get 方法来获取字典值

```scss
// 创建一个 Map
$colors: (
  "primary": #4caf50,
  "secondary": #ff9800,
  "accent": #2196f3,
);

$primary: map-get($colors, "primary");

button {
  background-color: $primary;
}
```

```css
button {
  background-color: #4caf50;
}
```

接下来还是看一个实际开发中的示例：

```scss
$icons: (
  "eye": "\f112",
  "start": "\f12e",
  "stop": "\f12f",
);

@each $key, $value in $icons {
  .icon-#{$key}:before {
    display: inline-block;
    font-family: "Open Sans";
    content: $value;
  }
}
```

```css
.icon-eye:before {
  display: inline-block;
  font-family: "Open Sans";
  content: "\f112";
}

.icon-start:before {
  display: inline-block;
  font-family: "Open Sans";
  content: "\f12e";
}

.icon-stop:before {
  display: inline-block;
  font-family: "Open Sans";
  content: "\f12f";
}
```

### 颜色类型

支持原生 CSS 中各种颜色的表示方式，十六进制、RGB、RGBA、HSL、HSLA、颜色英语单词。

Sass 还提供了内置的 Colors 相关的各种函数，可以方便我们对颜色进行一个颜色值的调整和操作。

- lighten 和 darken：调整颜色的亮度，lighten 是增加亮度、darken 是减少亮度

```scss
$color: red;

.div1 {
  width: 200px;
  height: 200px;
  background-color: lighten($color, 10%); // 亮度增加10%
}

.div2 {
  width: 200px;
  height: 200px;
  background-color: darken($color, 10%); // 亮度减少10%
}
```

```css
.div1 {
  width: 200px;
  height: 200px;
  background-color: #ff3333;
}

.div2 {
  width: 200px;
  height: 200px;
  background-color: #cc0000;
}
```

- saturate 和 desaturate：调整颜色的饱和度

```scss
$color: #4caf50;

.div1 {
  width: 200px;
  height: 200px;
  background-color: saturate($color, 10%); // 饱和度增加10%
}

.div2 {
  width: 200px;
  height: 200px;
  background-color: desaturate($color, 10%); // 饱和度减少10%
}
```

- _Adjust Hue_：通过调整颜色的色相来创建新颜色。

```scss
$color: #4caf50;
$new-hue: adjust-hue($color, 30); // 色相增加 30 度
```

- _RGBA_：为颜色添加透明度。

```scss
$color: #4caf50;
$transparent: rgba($color, 0.5); // 添加 50% 透明度
```

- _Mix_：混合两种颜色。

```scss
$color1: #4caf50;
$color2: #2196f3;
$mixed: mix($color1, $color2, 50%); // 混合两种颜色，权重 50%
```

- _Complementary_：获取颜色的补充颜色。

```scss
$color: #4caf50;
$complementary: adjust-hue($color, 180); // 色相增加 180 度，获取补充颜色
```

如果想要查阅具体有哪些颜色相关的函数，可以参阅官方文档：https://sass-lang.com/documentation/modules/color

## 嵌套语法

嵌套语法也是 Sass 刚推出来的时候的一大亮点，嵌套语法让我们开发在书写 CSS 的时候节省了很多的代码量。

例如：

```scss
$color: skyblue;

.container {
  width: 500px;
  height: 500px;

  .div1 {
    color: $color;
    width: 200px;
    height: 200px;
  }

  p {
    width: 400px;
    background-color: red;
  }
}
```

```css
.container {
  width: 500px;
  height: 500px;
}
.container .div1 {
  color: skyblue;
  width: 200px;
  height: 200px;
}
.container p {
  width: 400px;
  background-color: red;
}
```

另外还支持一个 & 符号，表示和父选择器结合。如果你不写 &，那么最终编译的时候，会编译为后代选择器，如果书写了 & 符号，则会和父选择器结合到一起

```scss
a {
  color: yellow;
  &:hover {
    color: green;
  }
  &:active {
    color: red;
  }
}

div {
  width: 100px;
  height: 100px;
  &.one {
    background-color: red;
  }
}
```

```css
a {
  color: yellow;
}
a:hover {
  color: green;
}
a:active {
  color: red;
}

div {
  width: 100px;
  height: 100px;
}
div.one {
  background-color: red;
}
```

另外还允许属性的嵌套

```scss
.test {
  font: {
    family: "Helvetica Neue";
    size: 20px;
    weight: bold;
  }
}
```

```css
.test {
  font-family: "Helvetica Neue";
  font-size: 20px;
  font-weight: bold;
}
```

## 插值语法

通过 #{ } 进行插值，也就是在 #{ } 可以放入变量，回头可以解析 #{ } 变量对应的值，类似于 ES6 里面的模板字符串。

```scss
$name: foo;
$attr: border;
$base-font-size: 16px;
$line-height: 1.5;

p.#{$name} {
  color: red;
  #{$attr}-color: blue;
}
```

```css
p.foo {
  color: red;
  border-color: blue;
}
```

插值语法可以避免 Sass 去运行运算表达式（ calc ），直接编译为带有运算表达式的原生 CSS 代码。

```scss
.div1 {
  padding: calc($base-font-size * $line-height * 2);
}

.div2 {
  padding: calc(#{$base-font-size * $line-height} * 2);
}
```

```css
.div1 {
  padding: 48px;
}

.div2 {
  padding: calc(24px * 2);
}
```

插值在注释里面也是可以使用的

```scss
$author: xiejie;
/*!
  Author:#{$author}
*/
```

```css
/*!
  Author:xiejie
*/
```

## 运算

关于运算相关的一些函数：

- calc
- max 和 min
- clamp

### calc

该方法是 CSS3 提供的一个方法，用于做属性值的计算。

```scss
.container {
  width: 80%;
  padding: 0 20px;

  .element {
    width: calc(100% - 40px);
  }

  .element2 {
    width: calc(100px - 40px);
  }
}
```

```css
.container {
  width: 80%;
  padding: 0 20px;
}
.container .element {
  width: calc(100% - 40px);
}
.container .element2 {
  width: 60px;
}
```

注意，在上面的编译当中，如果单位相同，Sass 在做编译的时候会直接运行 calc 运算表达式，得到计算出来的最终值，但是如果单位不相同，会保留 calc 运算表达式。

### min 和 max

min 是在一组数据里面找出最小值，max 就是在一组数据里面找到最大值。

```scss
$width1: 500px;
$width2: 600px;

.element {
  width: min($width1, $width2);
}
```

```css
.element {
  width: 500px;
}
```

### clamp

这个也是 CSS3 提供的函数，语法为：

```css
clamp(min, value, max)
```

min 代表下限，max 代表上限，value 是需要限制的值。clamp 的作用就是将 value 限制在 min 和 max 之间，如果 value 小于了 min 那么就取 min 作为值，如果 vlaue 大于了 max，那么就取 max 作为值。如果 value 在 min 和 max 之间，那么就返回 value 值本身。

```scss
$min-font-size: 16px;
$max-font-size: 24px;

body {
  font-size: clamp($min-font-size, 1.25vw + 1rem, $max-font-size);
}
```

```css
body {
  font-size: clamp(16px, 1.25vw + 1rem, 24px);
}
```

在上面的 CSS 代码中，我们希望通过视口宽度动态的调整 body 的字体大小。value 部分为 1.25vw + 1rem（这个计算会在浏览器环境中进行计算）。当视口宽度较小时，1.25vw + 1rem 计算结果可能是小于 16px，那么此时就取 16px。当视口宽度较大时，1.25vw + 1rem 计算结果可能大于 24px，那么此时就取 24px。如果 1.25vw + 1rem 计算值在 16px - 24px 之间，那么就取计算值结果。

# Sass 控制指令

前面我们说了 CSS 预处理器最大的特点就是将编程语言的特性融入到了 CSS 里面，因此既然 CSS 预处理器里面都有变量、数据类型，自然而然也会有流程控制。

这个小节非常简单，因为关于流程控制，大家在 JS 里面已经非常熟悉了，所以我们快速过一遍。

## 三元运算符

```base
if(expression, value1, value2)
```

示例如下：

```scss
p {
  color: if(1+1==2, green, yellow);
}

div {
  color: if(1+1==3, green, yellow);
}
```

```css
p {
  color: green;
}

div {
  color: yellow;
}
```

## @if 分支

这个表示是分支。分支又分为三种：

- 单分支
- 双分支
- 多分支

### 单分支

```scss
p {
  @if 1+1 == 2 {
    color: red;
  }
  margin: 10px;
}

div {
  @if 1+1 == 3 {
    color: red;
  }
  margin: 10px;
}
```

```css
p {
  color: red;
  margin: 10px;
}

div {
  margin: 10px;
}
```

### 双分支

仍然使用的是 @else

```scss
p {
  @if 1+1 == 2 {
    color: red;
  } @else {
    color: blue;
  }
  margin: 10px;
}

div {
  @if 1+1 == 3 {
    color: red;
  } @else {
    color: blue;
  }
  margin: 10px;
}
```

```css
p {
  color: red;
  margin: 10px;
}

div {
  color: blue;
  margin: 10px;
}
```

### 多分支

使用 @else if 来写多分支

```scss
$type: monster;
p {
  @if $type == ocean {
    color: blue;
  } @else if $type == matador {
    color: red;
  } @else if $type == monster {
    color: green;
  } @else {
    color: black;
  }
}
```

```css
p {
  color: green;
}
```

## @for 循环

语法如下：

```base
@for $var from <start> through <end> # 会包含 end 结束值
// 或者
@for $var from <start> to <end> # to 不会包含 end 结束值
```

```scss
@for $i from 1 to 3 {
  .item-#{$i} {
    width: $i * 2em;
  }
}

@for $i from 1 through 3 {
  .item2-#{$i} {
    width: $i * 2em;
  }
}
```

```css
.item-1 {
  width: 2em;
}

.item-2 {
  width: 4em;
}

.item2-1 {
  width: 2em;
}

.item2-2 {
  width: 4em;
}

.item2-3 {
  width: 6em;
}
```

## @while 循环

语法如下：

```base
@while expression
```

```scss
$i: 6;
@while $i > 0 {
  .item-#{$i} {
    width: 2em * $i;
  }
  $i: $i - 2;
}
```

```css
.item-6 {
  width: 12em;
}

.item-4 {
  width: 8em;
}

.item-2 {
  width: 4em;
}
```

注意，一定要要在 while 里面书写改变变量的表达式，否则就会形成一个死循环。

## @each 循环

这个优有点类似于 JS 里面的 for...of 循环，会把数组或者字典类型的每一项值挨着挨着取出来

```scss
@each $var in $vars ;
```

$var 可以是任意的变量名，但是 $vars 只能是 list 或者 maps

下面是一个遍历列表（数组）

```scss
$arr: puma, sea-slug, egret, salamander;

@each $animal in $arr {
  .#{$animal}-icon {
    background-image: url("/images/#{$animal}.png");
  }
}
```

```css
.puma-icon {
  background-image: url("/images/puma.png");
}

.sea-slug-icon {
  background-image: url("/images/sea-slug.png");
}

.egret-icon {
  background-image: url("/images/egret.png");
}

.salamander-icon {
  background-image: url("/images/salamander.png");
}
```

下面是一个遍历字典类型的示例：

```scss
$dict: (
  h1: 2em,
  h2: 1.5em,
  h3: 1.2em,
  h4: 1em,
);

@each $header, $size in $dict {
  #{$header} {
    font-size: $size;
  }
}
```

```css
h1 {
  font-size: 2em;
}

h2 {
  font-size: 1.5em;
}

h3 {
  font-size: 1.2em;
}

h4 {
  font-size: 1em;
}
```

# Sass 混合指令

在 Sass 里面存在一种叫做混合指令的东西，它最大的特点就是允许我们创建可以重用的代码片段，从而避免了代码的重复，提供代码的可维护性。

## 混合指令基本的使用

首先要使用混合指令，我们需要先定义一个混合指令：

```scss
@mixin name {
  // 样式。。。。
}
```

例如：

```scss
// 创建了一个指令
@mixin large-text {
  font: {
    family: "Open Sans", sans-serif;
    size: 20px;
    weight: bold;
  }
  color: #ff0000;
}
```

接下来是如何使用指令，需要使用到 @include，后面跟上混合指令的名称即可。

```scss
// 创建了一个指令
@mixin large-text {
  font: {
    family: "Open Sans", sans-serif;
    size: 20px;
    weight: bold;
  }
  color: #ff0000;
}

p {
  @include large-text;
  padding: 20px;
}

div {
  width: 200px;
  height: 200px;
  background-color: #fff;
  @include large-text;
}
```

```css
p {
  font-family: "Open Sans", sans-serif;
  font-size: 20px;
  font-weight: bold;
  color: #ff0000;
  padding: 20px;
}

div {
  width: 200px;
  height: 200px;
  background-color: #fff;
  font-family: "Open Sans", sans-serif;
  font-size: 20px;
  font-weight: bold;
  color: #ff0000;
}
```

我们发现，混合指令编译之后，就是将混合指令内部的 CSS 样式放入到了 @include 的地方，因此我们可以很明显的感受到混合指令就是提取公共的样式出来，方便复用和维护。

在混合指令中，我们也可以引用其他的混合指令：

```scss
@mixin background {
  background-color: #fc0;
}

@mixin header-text {
  font-size: 20px;
}

@mixin compound {
  @include background;
  @include header-text;
}

p {
  @include compound;
}
```

```css
p {
  background-color: #fc0;
  font-size: 20px;
}
```

混合指令是可以直接在最外层使用的，但是对混合指令本身有一些要求。要求混合指令的内部要有选择器。

```scss
@mixin background {
  background-color: #fc0;
}

@mixin header-text {
  font-size: 20px;
}

@mixin compound {
  div {
    @include background;
    @include header-text;
  }
}

@include compound;
```

```css
div {
  background-color: #fc0;
  font-size: 20px;
}
```

例如在上面的示例中，compound 混合指令里面不再是单纯的属性声明，而是有选择器在里面，这样的话就可以直接在最外层使用。

一般来讲，我们要在外部直接使用，我们一般会将其作为一个后代选择器。例如：

```scss
.box {
  @include compound;
}
```

```css
.box div {
  background-color: #fc0;
  font-size: 20px;
}
```

## 混合指令的参数

混合指令能够设置参数，只需要在混合指令的后面添加一对圆括号即可，括号里面书写对应的形参。

例如：

```scss
@mixin bg-color($color, $radius) {
  width: 200px;
  height: 200px;
  margin: 10px;
  background-color: $color;
  border-radius: $radius;
}

.box1 {
  @include bg-color(red, 10px);
}

.box2 {
  @include bg-color(blue, 20px);
}
```

```css
.box1 {
  width: 200px;
  height: 200px;
  margin: 10px;
  background-color: red;
  border-radius: 10px;
}

.box2 {
  width: 200px;
  height: 200px;
  margin: 10px;
  background-color: blue;
  border-radius: 20px;
}
```

既然在定义混合指令的时候，指定了参数，那么在使用的时候，传递的参数的个数一定要和形参一致，否则编译会出错。

在定义的时候，支持给形参添加默认值，例如：

```scss
@mixin bg-color($color, $radius: 20px) {
  width: 200px;
  height: 200px;
  margin: 10px;
  background-color: $color;
  border-radius: $radius;
}

.box1 {
  @include bg-color(blue);
}
```

上面的示例是可以通过编译的，因为在定义 bg-color 的时候，我们为 $radius 设置了默认值。所以在使用的时候，即便没有传递第二个参数，也是 OK 的，因为会直接使用默认值。

在传递参数的时候，还支持关键词传参，就是指定哪一个参数是对应的哪一个形参，例如：

```scss
@mixin bg-color($color: blue, $radius) {
  width: 200px;
  height: 200px;
  margin: 10px;
  background-color: $color;
  border-radius: $radius;
}

.box1 {
  @include bg-color($radius: 20px, $color: pink);
}

.box2 {
  @include bg-color($radius: 20px);
}
```

```css
.box1 {
  width: 200px;
  height: 200px;
  margin: 10px;
  background-color: pink;
  border-radius: 20px;
}

.box2 {
  width: 200px;
  height: 200px;
  margin: 10px;
  background-color: blue;
  border-radius: 20px;
}
```

在定义混合指令的时候，如果不确定使用混合指令的地方会传入多少个参数，可以使用 ... 来声明（类似于 js 里面的不定参数），Sass 会把这些值当作一个列表来进行处理。

```scss
@mixin box-shadow($shadow...) {
  // ...
  box-shadow: $shadow;
}

.box1 {
  @include box-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.box2 {
  @include box-shadow(
    0 1px 2px rgba(0, 0, 0, 0.5),
    0 2px 5px rgba(100, 0, 0, 0.5)
  );
}
```

```css
.box1 {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.box2 {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 2px 5px rgba(100, 0, 0, 0.5);
}
```

在 Sass 中，... 有些时候也可以表示为参数展开的含义，例如：

```scss
@mixin colors($text, $background, $border) {
  color: $text;
  background-color: $background;
  border-color: $border;
}

$values: red, blue, pink;

.box {
  @include colors($values...);
}
```

## @content

@content 表示占位的意思，在使用混合指令的时候，会将指令大括号里面的内容放置到 @content 的位置，有点类似于插槽。

```scss
@mixin test {
  html {
    @content;
  }
}

@include test {
  background-color: red;
  .logo {
    width: 600px;
  }
}

@include test {
  color: blue;
  .box {
    width: 200px;
    height: 200px;
  }
}
```

```css
html {
  background-color: red;
}
html .logo {
  width: 600px;
}

html {
  color: blue;
}
html .box {
  width: 200px;
  height: 200px;
}
```

下面是一个实际开发中的例子：

```scss
@mixin button-theme($color) {
  background-color: $color;
  border: 1px solid darken($color, 15%);

  &:hover {
    background-color: lighten($color, 5%);
    border-color: darken($color, 10%);
  }

  @content;
}

.button-primary {
  @include button-theme(#007bff) {
    width: 500px;
    height: 400px;
  }
}

.button-secondary {
  @include button-theme(#6c757d) {
    width: 300px;
    height: 200px;
  }
}
```

```css
.button-primary {
  background-color: #007bff;
  border: 1px solid #0056b3;
  width: 500px;
  height: 400px;
}
.button-primary:hover {
  background-color: #1a88ff;
  border-color: #0062cc;
}

.button-secondary {
  background-color: #6c757d;
  border: 1px solid #494f54;
  width: 300px;
  height: 200px;
}
.button-secondary:hover {
  background-color: #78828a;
  border-color: #545b62;
}
```

最后我们需要说一先关于 @content 的作用域的问题。

在混合指令的局部作用域里面所定义的变量不会影响 @content 代码块中的变量，同样，在 @content 代码块中定义的变量不会影响到混合指令中的其他变量，**两者之间的作用域是隔离的**。

```scss
@mixin scope-test {
  $test-variable: "mixin";

  .mixin {
    content: $test-variable;
  }

  @content;
}

.test {
  $test-variable: "test";
  @include scope-test {
    .content {
      content: $test-variable;
    }
  }
}
```

```css
.test .mixin {
  content: "mixin";
}
.test .content {
  content: "test";
}
```

# Sass 函数指令

上一小节所学习的混合指令虽然有点像函数，但是它并不是函数，因为混合指令所做的事情就是单纯的代码的替换工作，里面并不存在任何的计算。在 Sass 里面是支持函数指令。

## 自定义函数

在 Sass 里面自定义函数的语法如下：

```scss
@function fn-name($params...) {
  @return XXX;
}
```

具体示例如下：

```scss
@function divide($a, $b) {
  @return $a / $b;
}

.container {
  width: divide(100px, 2);
}
```

```css
.container {
  width: 50px;
}
```

函数可以接收多个参数，如果不确定会传递几个参数，那么可以使用前面介绍过的不定参数的形式。

```scss
@function sum($nums...) {
  $sum: 0;
  @each $n in $nums {
    $sum: $sum + $n;
  }
  @return $sum;
}

.box1 {
  width: sum(1, 2, 3) + px;
}

.box2 {
  width: sum(1, 2, 3, 4, 5, 6) + px;
}
```

```css
.box1 {
  width: 6px;
}

.box2 {
  width: 21px;
}
```

最后我们还是来看一个实际开发中的示例：

```scss
// 根据传入的 $background-color 返回适当的文字颜色
@function contrast-color($background-color) {
  // 计算背景颜色的亮度
  $brightness: red($background-color) * 0.299 + green($background-color) *
    0.587 + blue($background-color) * 0.114;

  // 根据亮度来返回黑色或者白色的文字颜色
  @if $brightness > 128 {
    @return #000;
  } @else {
    @return #fff;
  }
}

.button {
  $background-color: #007bff;
  background-color: $background-color;
  color: contrast-color($background-color);
}
```

在上面的代码示例中，我们首先定义了一个名为 contrast-color 的函数，该函数接收一个背景颜色参数，函数内部会根据这个背景颜色来决定文字应该是白色还是黑色。

```css
.button {
  background-color: #007bff;
  color: #fff;
}
```

## 内置函数

除了自定义函数，Sass 里面还提供了非常多的内置函数，你可以在官方文档：

https://sass-lang.com/documentation/modules

### 字符串相关内置函数

| 函数名和参数类型                        |                   函数作用                    |
| :-------------------------------------- | :-------------------------------------------: |
| quote($string)                          |                   添加引号                    |
| unquote($string)                        |                   除去引号                    |
| to-lower-case($string)                  |                   变为小写                    |
| to-upper-case($string)                  |                   变为大写                    |
| str-length($string)                     |        返回$string 的长度(汉字算一个)         |
| str-index($string，$substring)          |        返回$substring在$string 的位置         |
| str-insert($string, $insert, $index)    |        在$string的$index 处插入$insert        |
| str-slice($string, $start-at, $end-at） | 截取$string的$start-at 和$end-at 之间的字符串 |

注意索引是从 1 开始的，如果书写 -1，那么就是倒着来的。两边都是闭区间

```scss
$str: "Hello world!";

.slice1 {
  content: str-slice($str, 1, 5);
}

.slice2 {
  content: str-slice($str, -1);
}
```

```css
.slice1 {
  content: "Hello";
}

.slice2 {
  content: "!";
}
```

### 数字相关内置函数

| 函数名和参数类型        |                                  函数作用                                  |
| ----------------------- | :------------------------------------------------------------------------: |
| percentage($number)     |                              转换为百分比形式                              |
| round($number)          |                               四舍五入为整数                               |
| ceil($number)           |                                数值向上取整                                |
| floor($number)          |                                数值向下取整                                |
| abs($number)            |                                 获取绝对值                                 |
| min($number...)         |                                 获取最小值                                 |
| max($number...)         |                                 获取最大值                                 |
| random($number?:number) | 不传入值：获得 0-1 的随机数；传入正整数 n：获得 0-n 的随机整数（左开右闭） |

```scss
.item {
  width: percentage(2/5);
  height: random(100) + px;
  color: rgb(random(255), random(255), random(255));
}
```

```css
.item {
  width: 40%;
  height: 83px;
  color: rgb(31, 86, 159);
}
```

### 数组相关内置函数

| 函数名和参数类型                 |                                        函数作用                                        |
| -------------------------------- | :------------------------------------------------------------------------------------: |
| length($list)                    |                                      获取数组长度                                      |
| nth($list, n)                    |                                   获取指定下标的元素                                   |
| set-nth($list, $n, $value)       |                                向$list的$n 处插入$value                                |
| join($list1, $list2, $separator) |   拼接$list1和list2；$separator 为新 list 的分隔符，默认为 auto，可选择 comma、space   |
| append($list, $val, $separator)  | 向$list的末尾添加$val；$separator 为新 list 的分隔符，默认为 auto，可选择 comma、space |
| index($list, $value)             |                             返回$value值在$list 中的索引值                             |
| zip($lists…)                     |            将几个列表结合成一个多维的列表；要求每个的列表个数值必须是相同的            |

下面是一个具体的示例：

```scss
// 演示的是 join 方法
$list1: 1px solid, 2px dotted;
$list2: 3px dashed, 4px double;
$combined-list: join($list1, $list2, comma);

// 演示的是 append 方法
$base-colors: red, green, blue;
$extended-colors: append($base-colors, yellow, comma);

// 演示 zip 方法
$fonts: "Arial", "Helvetica", "Verdana";
$weights: "normal", "bold", "italic";
// $font-pair: ("Arial", "normal"),("Helvetica", "bold"),("Verdana","italic")
$font-pair: zip($fonts, $weights);

// 接下来我们来生成一下具体的样式
@each $border-style in $combined-list {
  .border-#{index($combined-list, $border-style)} {
    border: $border-style;
  }
}

@each $color in $extended-colors {
  .bg-#{index($extended-colors, $color)} {
    background-color: $color;
  }
}

@each $pair in $font-pair {
  $font: nth($pair, 1);
  $weight: nth($pair, 2);
  .text-#{index($font-pair, $pair)} {
    font-family: $font;
    font-weight: $weight;
  }
}
```

```css
.border-1 {
  border: 1px solid;
}

.border-2 {
  border: 2px dotted;
}

.border-3 {
  border: 3px dashed;
}

.border-4 {
  border: 4px double;
}

.bg-1 {
  background-color: red;
}

.bg-2 {
  background-color: green;
}

.bg-3 {
  background-color: blue;
}

.bg-4 {
  background-color: yellow;
}

.text-1 {
  font-family: "Arial";
  font-weight: "normal";
}

.text-2 {
  font-family: "Helvetica";
  font-weight: "bold";
}

.text-3 {
  font-family: "Verdana";
  font-weight: "italic";
}
```

### 字典相关内置函数

| 函数名和参数类型        |                 函数作用                 |
| ----------------------- | :--------------------------------------: |
| map-get($map, $key)     |       获取$map中$key 对应的$value        |
| map-merge($map1, $map2) |     合并$map1和$map2，返回一个新$map     |
| map-remove($map, $key)  |     从$map中删除$key，返回一个新$map     |
| map-keys($map)          |            返回$map所有的$key            |
| map-values($map)        |           返回$map所有的$value           |
| map-has-key($map, $key) | 判断$map中是否存在$key，返回对应的布尔值 |
| keywords($args)         |  返回一个函数的参数，并可以动态修改其值  |

下面是一个使用了字典内置方法的相关示例：

```scss
// 创建一个颜色映射表
$colors: (
  "primary": #007bff,
  "secondary": #6c757d,
  "success": #28a745,
  "info": #17a2b8,
  "warning": #ffc107,
  "danger": #dc3545,
);

// 演示通过 map-get 获取对应的值
@function btn-color($color-name) {
  @return map-get($colors, $color-name);
}

// 演示通过 map-keys 获取映射表所有的 keys
$color-keys: map-keys($colors);

// 一个新的颜色映射表
$more-colors: (
  "light": #f8f9fa,
  "dark": #343a40,
);

// 要将新的颜色映射表合并到 $colors 里面

$all-colors: map-merge($colors, $more-colors);

// 接下来我们来根据颜色映射表生成样式
@each $color-key, $color-value in $all-colors {
  .text-#{$color-key} {
    color: $color-value;
  }
}

button {
  color: btn-color("primary");
}
```

```css
.text-primary {
  color: #007bff;
}

.text-secondary {
  color: #6c757d;
}

.text-success {
  color: #28a745;
}

.text-info {
  color: #17a2b8;
}

.text-warning {
  color: #ffc107;
}

.text-danger {
  color: #dc3545;
}

.text-light {
  color: #f8f9fa;
}

.text-dark {
  color: #343a40;
}

button {
  color: #007bff;
}
```

### 颜色相关内置函数

_RGB_ 函数

| 函数名和参数类型               |                                          函数作用                                          |
| ------------------------------ | :----------------------------------------------------------------------------------------: |
| rgb($red, $green, $blue)       |                                   返回一个 16 进制颜色值                                   |
| rgba($red,$green,$blue,$alpha) | 返回一个 rgba；$red,$green 和$blue 可被当作一个整体以颜色单词、hsl、rgb 或 16 进制形式传入 |
| red($color)                    |                                 从$color 中获取其中红色值                                  |
| green($color)                  |                                 从$color 中获取其中绿色值                                  |
| blue($color)                   |                                 从$color 中获取其中蓝色值                                  |
| mix($color1,$color2,$weight?)  |                   按照$weight比例，将$color1 和$color2 混合为一个新颜色                    |

_HSL_ 函数

| 函数名和参数类型                         | 函数作用                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| hsl($hue,$saturation,$lightness)         | 通过色相（hue）、饱和度(saturation)和亮度（lightness）的值创建一个颜色                |
| hsla($hue,$saturation,$lightness,$alpha) | 通过色相（hue）、饱和度(saturation)、亮度（lightness）和透明（alpha）的值创建一个颜色 |
| saturation($color)                       | 从一个颜色中获取饱和度（saturation）值                                                |
| lightness($color)                        | 从一个颜色中获取亮度（lightness）值                                                   |
| adjust-hue($color,$degrees)              | 通过改变一个颜色的色相值，创建一个新的颜色                                            |
| lighten($color,$amount)                  | 通过改变颜色的亮度值，让颜色变亮，创建一个新的颜色                                    |
| darken($color,$amount)                   | 通过改变颜色的亮度值，让颜色变暗，创建一个新的颜色                                    |
| hue($color)                              | 从一个颜色中获取亮度色相（hue）值                                                     |

_Opacity_ 函数

| 函数名和参数类型                                            | 函数作用         |
| ----------------------------------------------------------- | ---------------- |
| alpha($color)/opacity($color)                               | 获取颜色透明度值 |
| rgba($color,$alpha)                                         | 改变颜色的透明度 |
| opacify($color, $amount) / fade-in($color, $amount)         | 使颜色更不透明   |
| transparentize($color, $amount) / fade-out($color, $amount) | 使颜色更加透明   |

### 其他内置函数

| 函数名和参数类型               |                            函数作用                             |
| ------------------------------ | :-------------------------------------------------------------: |
| type-of($value)                |                        返回$value 的类型                        |
| unit($number)                  |                       返回$number 的单位                        |
| unitless($number)              | 判断$number 是否没用带单位，返回对应的布尔值，没有带单位为 true |
| comparable($number1, $number2) | 判断$number1和$number2 是否可以做加、减和合并，返回对应的布尔值 |

示例如下：

```scss
$value: 42;

$value-type: type-of($value); // number

$length: 10px;
$length-unit: unit($length); // "px"

$is-unitless: unitless(42); // true

$can-compare: comparable(1px, 2em); // false
$can-compare2: comparable(1px, 2px); // true

// 根据 type-of 函数的结果生成样式
.box {
  content: "Value type: #{$value-type}";
}

// 根据 unit 函数的结果生成样式
.length-label {
  content: "Length unit: #{$length-unit}";
}

// 根据 unitless 函数的结果生成样式
.unitless-label {
  content: "Is unitless: #{$is-unitless}";
}

// 根据 comparable 函数的结果生成样式
.comparable-label {
  content: "Can compare: #{$can-compare}";
}

.comparable-label2 {
  content: "Can compare: #{$can-compare2}";
}
```

```css
.box {
  content: "Value type: number";
}

.length-label {
  content: "Length unit: px";
}

.unitless-label {
  content: "Is unitless: true";
}

.comparable-label {
  content: "Can compare: false";
}

.comparable-label2 {
  content: "Can compare: true";
}
```

# @规则

在原生 CSS 中，存在一些 @ 开头的规则，例如 @import、@media，Sass 对这些 @ 规则完全支持，不仅支持，还在原有的基础上做了一些扩展。

## @import

在原生的 CSS 里面，@import 是导入其他的 CSS 文件，Sass 再此基础上做了一些增强：

1. 编译时合并：_Sass_ 在编译时将导入的文件内容合并到生成的 _CSS_ 文件中，这意味着只会生成一个 _CSS_ 文件，而不是像原生 _CSS_ 那样需要额外的 _HTTP_ 请求去加载导入的文件。

2. 变量、函数和混合体共享：_Sass_ 允许在导入的文件之间共享变量、函数和混合体，这有助于组织代码并避免重复。

3. 部分文件：_Sass_ 支持将文件名前缀为 \_ 的文件称为部分文件（_partials_）。当使用 @_import_ 指令导入部分文件时，_Sass_ 不会生成一个单独的 _CSS_ 文件，而是将其内容合并到主文件中。这有助于更好地组织项目。

4. 文件扩展名可选：在 _Sass_ 中，使用 @_import_ 指令时可以省略文件扩展名（._scss_ 或 ._sass_），_Sass_ 会自动识别并导入正确的文件。

5. 嵌套导入：_Sass_ 允许在一个文件中嵌套导入其他文件，但请注意，嵌套导入的文件将在父级上下文中编译，这可能会导致输出的 _CSS_ 文件中的选择器层级不符合预期。

接下来，我们来看一个具体的例子：

```
src/
  ├── _variable.scss
  ├── _mixins.scss
  ├── _header.scss
  └── index.scss
```

```scss
// _variable.scss
$primary-color: #007bff;
$secondary-color: #6c757d;
```

```scss
// _mixins.scss
@mixin reset-margin-padding {
  margin: 0;
  padding: 0;
}
```

```scss
// _header.scss
header {
  background-color: $primary-color;
  color: $secondary-color;
  @include reset-margin-padding;
}
```

可以看出，在 \_header.scss 里面使用了另外两个 scss 所定义的变量以及混合体，说明变量、函数和混合体是可以共享的。

之后我们在 index.scss 里面导入了这三个 scss

```scss
@import "variable";
@import "mixins";
@import "header";

body {
  background-color: $primary-color;
  color: $secondary-color;
  @include reset-margin-padding;
}
```

最终生成的 css 如下：

```css
header {
  background-color: #007bff;
  color: #6c757d;
  margin: 0;
  padding: 0;
}

body {
  background-color: #007bff;
  color: #6c757d;
  margin: 0;
  padding: 0;
}
```

最终只会生成一个 css。

通常情况下，我们在通过 @import 导入文件的时候，不给后缀名，会自动的寻找 sass 文件并将其导入。但是有一些情况下，会编译为普通的 CSS 语句，并不会导入任何文件：

- 文件拓展名是 ._css_；
- 文件名以 _http_:// 开头；
- 文件名是 _url_()；
- @_import_ 包含 _media queries_。

例如：

```scss
@import "foo.css" @import "foo" screen;
@import "http://foo.com/bar";
@import url(foo);
```

## @media

这个规则在原生 CSS 里面是做媒体查询，Sass 里面是完全支持的，并且做了一些增强操作。

1. Sass 里面允许你讲 @media 嵌套在选择器内部

```scss
.navigation {
  display: flex;
  justify-content: flex-end;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}
```

```css
.navigation {
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 768px) {
  .navigation {
    flex-direction: column;
  }
}
```

2. 允许使用变量

```scss
$mobile-breakpoint: 768px;

.navigation {
  display: flex;
  justify-content: flex-end;

  @media (max-width: $mobile-breakpoint) {
    flex-direction: column;
  }
}
```

```css
.navigation {
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 768px) {
  .navigation {
    flex-direction: column;
  }
}
```

3. 可以使用混合体

```scss
@mixin respond-to($breakpoint) {
  @if $breakpoint == "mobile" {
    @media (max-width: 768px) {
      @content;
    }
  } @else if $breakpoint == "tablet" {
    @media (min-width: 769px) and (max-width: 1024px) {
      @content;
    }
  } @else if $breakpoint == "desktop" {
    @media (min-width: 1025px) {
      @content;
    }
  }
}

.container {
  width: 80%;
  @include respond-to("mobile") {
    width: 100%;
  }
  @include respond-to("desktop") {
    width: 70%;
  }
}
```

```css
.container {
  width: 80%;
}
@media (max-width: 768px) {
  .container {
    width: 100%;
  }
}
@media (min-width: 1025px) {
  .container {
    width: 70%;
  }
}
```

## @extend

我们在书写 CSS 样式的时候，经常会遇到一种情况：一个元素使用的样式和另外一个元素基本相同，但是又增加了一些额外的样式。这个时候就可以使用继承。Sass 里面提供了@extend 规则来实现继承，让一个选择器能够继承另外一个选择器的样式规则。

```scss
.button {
  display: inline-block;
  padding: 20px;
  background-color: red;
  color: white;
}

.primary-button {
  @extend .button;
  background-color: blue;
}
```

```css
.button,
.primary-button {
  display: inline-block;
  padding: 20px;
  background-color: red;
  color: white;
}

.primary-button {
  background-color: blue;
}
```

如果是刚接触的同学，可能会觉得 @extend 和 @mixin 比较相似，感觉都是把公共的样式提取出来了，但是两者其实是不同的。

- 参数支持：@_mixin_ 支持传递参数，使其更具灵活性；而 @_extend_ 不支持参数传递。
- 生成的 _CSS_：@_extend_ 会将选择器合并，生成更紧凑的 _CSS_，并且所继承的样式在最终生成的 CSS 样式中也是真实存在的；而 @_mixin_ 会在每个 @_include_ 处生成完整的 _CSS_ 代码，做的就是一个简单的 CSS 替换。
- 使用场景：@_extend_ 更适用于继承已有样式的情况，例如 _UI_ 框架中的通用样式；而 @_mixin_ 更适用于需要自定义参数的情况，例如为不同组件生成类似的样式。

接下来我们来看一个复杂的例子：

```scss
.box {
  border: 1px #f00;
  background-color: #fdd;
}

.container {
  @extend .box;
  border-width: 3px;
}

.box.a {
  background-image: url("/image/abc.png");
}
```

```css
.box,
.container {
  border: 1px #f00;
  background-color: #fdd;
}

.container {
  border-width: 3px;
}

.box.a,
.a.container {
  background-image: url("/image/abc.png");
}
```

在上面的代码中，container 是继承了 box 里面的所有样式，假设一个元素需要有 box 和 a 这两个类才能对应一段样式（abc），由于 box 类所对应的样式，如果是挂 container 这个类的话，这些样式也会有，所以一个元素如果挂了 container 和 a 这两个类，同样应该应用对应 abc 样式。

有些时候，我们需要定义一套用于继承的样式，不希望 Sass 单独编译输出，那么这种情况下就可以使用 % 作为占位符。

```scss
%button {
  display: inline-block;
  padding: 20px;
  background-color: red;
  color: white;
}

.primary-button {
  @extend %button;
  background-color: blue;
}

.secondary-button {
  @extend %button;
  background-color: pink;
}
```

```css
.secondary-button,
.primary-button {
  display: inline-block;
  padding: 20px;
  background-color: red;
  color: white;
}

.primary-button {
  background-color: blue;
}

.secondary-button {
  background-color: pink;
}
```

## @at-root

有些时候，我们可能会涉及到将嵌套规则移动到根级别（声明的时候并没有写在根级别）。这个时候就可以使用 @at-root

```scss
.parent {
  color: red;

  @at-root .child {
    color: blue;
  }
}
```

```css
.parent {
  color: red;
}
.child {
  color: blue;
}
```

如果你想要移动的是一组规则，这个时候需要在 @at-root 后面添加一对大括号，将想要移动的这一组样式放入到大括号里面

```scss
.parent {
  color: red;

  @at-root {
    .child {
      color: blue;
    }
    .test {
      color: pink;
    }
    .test2 {
      color: purple;
    }
  }
}
```

```css
.parent {
  color: red;
}
.child {
  color: blue;
}

.test {
  color: pink;
}

.test2 {
  color: purple;
}
```

## @debug、@warn、@error

这三个规则是和调试相关的，可以让我们在编译过程中输出一条信息，有助于调试和诊断代码中的问题。

## 最佳实践

1. 合理的组织你的文件和目录结构：可以将一个大的 Sass 文件拆分成一个一个小的模块，我们可以按照功能、页面、组件来划分我们的文件结构，这样的话更加利于我们的项目维护。

```base
sass/
|
|-- base/
|   |-- _reset.scss  // 重置样式
|   |-- _typography.scss  // 排版相关样式
|   ...
|
|-- components/
|   |-- _buttons.scss  // 按钮相关样式
|   |-- _forms.scss  // 表单相关样式
|   ...
|
|-- layout/
|   |-- _header.scss  // 页眉相关样式
|   |-- _footer.scss  // 页脚相关样式
|   ...
|
|-- pages/
|   |-- _home.scss  // 首页相关样式
|   |-- _about.scss  // 关于页面相关样式
|   ...
|
|-- utils/
|   |-- _variables.scss  // 变量定义
|   |-- _mixins.scss  // 混入定义
|   |-- _functions.scss  // 函数定义
|   ...
|
|-- main.scss // 主入口文件
```

2. 多使用变量：在开发的时候经常会遇到一些会重复使用的值（颜色、字体、尺寸），我们就可以将这些值定义为变量，方便在项目中统一进行管理和修改。

3. 关于嵌套：嵌套非常好用，但是要避免层数过多的嵌套，通常来讲不要超过 3 层

```scss
.a {
  .....
  .b {
    ....
  }
}
```

```css
.a {
  ....;
}
.a .b {
  ....;
}
```

如果嵌套层数过多：

```scss
.a{
  ...
  .b{
    ...
    .c {
      ...
      .d {
        ....
        .e{
          ....
        }
      }
    }
  }
}
```

```css
.a .b .c .d .e {
  .....;
}
```

4. 多使用混合指令：混合指令可以将公共的部分抽离出来，提高了代码的复用性。但是要清楚混合指令和 @extend 之间的区别，具体使用哪一个，取决于你写项目时的具体场景，不是说某一个就比另一个绝对的好。
5. 使用函数：可以编写自定义函数来处理一些复杂的计算和操作。而且 Sass 还提供了很多非常好用的内置函数。
6. 遵循常见的 Sass 编码规范：

- Sass guidelines：https://sass-guidelin.es/
- Airbnb CSS：https://github.com/airbnb/css
