
## 说明

BEM（块、元素、修饰符）是一种基于组件的 Web 开发方法。
块（ block）、元素（ element）、修饰符（ modifier)

## 块（ block）

可以重用的功能独立的页面组件。
该块名称描述它的目的（“这是什么？” menu或button）（“？这是什么样子” -而不是它的状态red或big）。

```
// A code block
<!-- 正确。`error` 块在语义上是有意义的 -->
<div class="error"></div>

<!-- 不正确。它描述了外观 -->
<div class="red-text"></div>
```

**嵌套**
块可以相互嵌套。
可以有任意数量的嵌套层。

```
// A code block
<!-- `largesse`块 -->
<div class="largesse">
    <!-- `header`块 -->
    <header class="header">
        <!-- 嵌套`logo`块 -->
        <div class="logo"></div>

        <!-- 嵌套`search -form`块-->
        <form class="search-form"></form>
    </header>
    <!-- `largesse-main` 该组件下关联的main块>
    <main class="largesse-main">
        <div class="largesse-logo"></div>
        <form class="largesse-search"></form>
    </main>
</div>
```

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-02-16/620c6f6dd1be0.png)

例如，head块可以包括徽标 ( logo)、搜索表单 ( search) 和授权块 ( auth)。

## 元素（ element）

该元素的名称描述它的目的（“这是什么？” - item，text等），而不是它的状态（“什么类型的，或者是什么样子呢？” - red，big等）。
元素全名的结构是header**title。 元素名称与块名称用双下划线 (**)分隔。
不能单独使用,只能和块组合使用。

```
<!-- `html` -->
<div class="largesse">
    <header class="header">
       <!-- `header` 块中的 `header__title` 元素 -->
         <div class="header__title">标题</div>
         <div class="header__tip">提示</div>
    </header>
</div>

<!-- `sass+bem` -->
//largesse块
.largesse {
   header {
    //标题样式
    display: flex;
    align-items: center;
    width: 700px;
    height: 100px;
    //title元素
    &__title {
      flex-grow: 1;
    }
    //提示语样式
    &__tip {
      width: 400px;
    }
  }
}
```

**嵌套**

元素可以相互嵌套。
你可以有任意数量的嵌套级别。
元素始终是块的一部分，而不是另一个元素。这意味着元素名称不能定义层次结构，例如block**elem1**elem2(错误形式)

```
完整元素名称的结构遵循以下模式
<form class="search-form">
    <div class="search-form__content">
        <input class="search-form__input">
        <button class="search-form__button">Search</button>
    </div>
</form>
错误示范
<form class="search-form">
    <div class="search-form__content">
        <!-- Recommended: `search-form__input` or `search-form__content-input` -->
        <input class="search-form__content__input">
        <!-- Recommended: `search-form__button` or `search-form__content-button` -->
        <button class="search-form__content__button">Search</button>
    </div>
</form>
```

**结构**

这种块结构在 BEM 方法中始终表示为元素的平面列表,允许你更改块的 DOM 结构，而无需更改每个单独元素的代码。

```
<div class="block">
    <div class="block__elem1">
        <div class="block__elem2">
            <div class="block__elem3"></div>
        </div>
    </div>
</div>

//or

<div class="block">
    <div class="block__elem1">
        <div  class="block__elem2"></div>
    </div>
    <div class="block__elem3"></div>
</div>
```

```
<!-- `sass+bem`  -->
.block {
    &__elem1:{
    }
    &__elem2:{
    }
    &__elem3:{
    }
}
```

## 修饰符（ modifier)

一个 BEM 实体定义了一个块或者元素的外观与行为。
用于修饰块或元素，体现出外形行为状态等特征的，可作为一个修饰器
保证各个部分只有一级B**E–M，修饰器需要和对应的块或元素一起使用，避免单独使用。
避免 .block**el1\_\_el2 的格式。
修饰符可以在运行时更改（例如，作为对块的 DOM事件的反应），即双向绑定,可用于做表单的错误提示显隐判断。

比如，菜单块（menu）外观的改变依赖于他使用的修饰语。
![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-02-16/620c725e128ea.png)

```
<!-- `html` -->
  <div class="test">
    <main class="test-main">
      <section class="test-main__content">
        <!-- `修饰符与块-元素一起使用,用于标注一种状态/颜色/` -->
        <div class="test-main__content--blue">blue</div>
        <div class="test-main__content--green">green</div>
        <div class="test-main__content--yellow">yellow</div>
      </section>
    </main>
  </div>
  <!-- `css` 这里采用的是less-->
  .test-main {
      &__content {
        width: 400px;
        height: 400px;
        display: flex;
        margin: 0 auto;
        & > div {
          flex-grow: 1;
          height: 50%;
          text-align: center;
          line-height: 200px;
          color: #fff;
        }
        &--blue {
          background: rgb(60, 79, 224);
        }
        &--green {
          background: rgb(6, 182, 108);
        }
        &--yellow {
          background: rgb(255, 195, 61);
        }
      }
}
```

![](http://doc.uc108.org:8002/server/../Public/Uploads/2022-02-16/620c72b401d12.png)

##统一语义理解和命名

布局

| 语义       | 命名     | 简写     |
| ---------- | -------- | -------- |
| 文档       | doc      | doc      |
| 头部       | head     | hd       |
| 主体       | body     | bd       |
| 尾部       | foot     | ft       |
| 主栏       | main     | mn       |
| 主栏子容器 | mainc    | mnc      |
| 侧栏       | side     | sd       |
| 侧栏子容器 | sidec    | sdc      |
| 盒容器     | wrap/box | wrap/box |

组件

| 语义   | 命名         | 简写  |
| ------ | ------------ | ----- |
| 头图   | focus        | focus |
| 导航   | nav          | nav   |
| 子导航 | subnav       | snav  |
| 面包屑 | crumb        | crm   |
| 菜单   | menu         | menu  |
| 选项卡 | tab          | tab   |
| 标题区 | head/title   | hd/tt |
| 内容区 | body/content | bd/ct |
| 列表   | list         | lst   |
| 表格   | table        | tb    |
| 表单   | form         | fm    |
| 热点   | hot          | hot   |
| 排行   | top          | top   |
| 登录   | login        | log   |
| 标志   | logo         | logo  |
| 广告   | advertise    | ad    |
| 搜索   | search       | sch   |
| 幻灯   | slide        | sld   |
| 提示   | tips         | tips  |
| 帮助   | help         | help  |
| 新闻   | news         | news  |
| 下载   | download     | dld   |
| 注册   | regist       | reg   |
| 投票   | vote         | vote  |
| 版权   | copyright    | cprt  |
| 结果   | result       | rst   |
| 标题   | title        | tt    |
| 按钮   | button       | btn   |
| 输入   | input        | ipt   |

状态

| 语义   | 命名     | 简写  |
| ------ | -------- | ----- |
| 选中   | selected | sel   |
| 当前   | current  | crt   |
| 显示   | show     | show  |
| 隐藏   | hide     | hide  |
| 打开   | open     | open  |
| 关闭   | close    | close |
| 出错   | error    | err   |
| 不可用 | disabled | dis   |
