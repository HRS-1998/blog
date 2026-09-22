# 4 CSS

CSS 高频面试题库：覆盖 BFC、层叠上下文、盒模型、Flex/Grid、定位居中、响应式、移动端适配、动画性能、CSS 变量与主题、样式隔离、预处理器、关键渲染路径、选择器性能、Houdini 与大规模 CSS 架构，按 P6 基础 + P7 深度双层组织。

## Q：什么是 BFC？它的原理、触发条件和应用场景是什么？

**核心答案**：BFC（Block Formatting Context，块级格式化上下文）是 CSS 视觉格式化模型中一块独立的渲染区域，内部元素的布局与外部相互隔离：内部盒子垂直排列、margin 不与外部折叠、浮动子元素参与高度计算、区域不与外部浮动重叠。触发条件包括根元素、float 非 none、absolute/fixed 定位、display 为 inline-block/flex/grid 的容器、overflow 非 visible 等。三大核心应用：清浮动、防 margin 合并、自适应两栏布局。

**知识点解析**：

- 布局规则：内部盒子沿垂直方向依次排列；同一个 BFC 内相邻块级盒 margin 会折叠；BFC 区域不与浮动盒重叠；计算 BFC 高度时浮动子元素也参与计算。
- 触发条件（按工程常用排序）：`display: flow-root`（无副作用，现代首选）、`overflow: hidden/auto/scroll`、`float: left/right`、`position: absolute/fixed`、`display: inline-block/flex/inline-flex/grid/table-cell`。
- 应用一：清浮动——父元素触发 BFC 后高度包含浮动子元素。

```css
/* 现代清浮动方案，无副作用 */
.parent {
  display: flow-root;
}

/* 兼容老项目的写法 */
.legacy-parent {
  overflow: hidden; /* 触发 BFC，但会裁剪溢出内容，有副作用 */
}
```

- 应用二：防 margin 合并——让两个相邻元素处于不同的 BFC，margin 不再折叠。

```css
.p {
  margin: 20px;
}

/* 包一层触发 BFC 的元素，隔断 margin 传播 */
.wrapper {
  display: flow-root;
}
```

- 应用三：自适应两栏布局——BFC 不与浮动重叠，右侧自动占满剩余宽度。

```css
.left {
  float: left;
  width: 200px;
}

.right {
  display: flow-root; /* 形成 BFC，不与左侧浮动重叠 */
}
```

**加分项（P7 视角）**：

- 规范层面：BFC 定义于 CSS2.1 第 9.4.1 节，是“格式化上下文”家族的一员，同类还有 IFC、FFC（flex 格式化上下文）、GFC（grid）、TFC（table）；`display: flow-root` 是 CSS Display Module L3 专门为“无副作用创建 BFC”引入的值。
- 渲染层面：触发 BFC 意味着独立的布局计算单元，这也是 `overflow: hidden` 清浮动生效的原因；但要理解它同时带来内容裁剪和滚动语义，大型项目应优先 `flow-root`。
- 面试陷阱：margin 折叠只发生在块轴（block-flow 方向）且仅限“边界相邻”的情况；`writing-mode: vertical-lr` 时折叠方向变为水平——能提到这一点说明读过规范。

## Q：层叠上下文的完整规则是什么？z-index 什么时候生效？

**核心答案**：层叠上下文（stacking context）描述元素在 z 轴上的分层与绘制顺序。z-index 只对 position 非 static 的定位元素、以及 flex/grid 容器的直接子项生效，且比较只发生在同一个层叠上下文内部。同一层叠上下文内从低到高的绘制顺序是：背景边框 → 负 z-index → 常规流块级盒 → 浮动盒 → 行内盒 → z-index 为 auto/0 的定位元素 → 正 z-index。最常见的坑：父元素一旦创建层叠上下文，子元素的 z-index 再大也被“囚禁”在父级范围内比较。

**知识点解析**：

- z-index 生效的两大前提：元素是定位元素（relative/absolute/fixed/sticky）且 z-index 非 auto；或元素是 flex/grid 容器的直接子项且 z-index 非 auto。
- 同一层叠上下文内的 7 层绘制顺序（stacking level 比较链）：
  1. 根元素的背景与边框
  2. z-index 为负的后代层叠上下文（数值大者在上）
  3. 常规流内的块级盒（非定位、非浮动）
  4. 非定位的浮动盒
  5. 常规流内的行内盒
  6. z-index 为 auto 或 0 的定位元素
  7. z-index 为正的定位元素（数值大者在上）
- 隐式创建层叠上下文的常见属性：`opacity` 小于 1、`transform` 非 none、`filter` 非 none、`isolation: isolate`、`mix-blend-mode` 非 normal、`will-change` 指定了上述属性。
- 经典案例：子元素 z-index: 9999 依然被盖住，因为父元素已创建层叠上下文，子元素只在父级内部参与比较。

```html
<div class="a">
  <div class="a-child">z-index: 9999，仍被 .b 盖住</div>
</div>
<div class="b">我在上面</div>
```

```css
.a {
  position: relative;
  z-index: 1; /* .a 创建了层叠上下文 */
}
.a-child {
  position: absolute;
  z-index: 9999; /* 只在 .a 内部比较，救不了 */
}
.b {
  position: relative;
  z-index: 2; /* .b 整体压在 .a 之上 */
}
```

- 工程实践：弹窗、Toast 等浮层组件通过 Teleport 挂到 body 下，除了规避 overflow 裁剪，更关键的是脱离父级层叠上下文的囚禁。

**加分项（P7 视角）**：

- 规范层面：完整层叠顺序定义在 CSS2 附录 E（Elaborate description of stacking contexts），CSS Positioned Layout Module L3 延续该模型；能画出 7 层金字塔并解释“负 z-index 为什么压在块级盒之下但在背景之上”。
- 渲染引擎层面：Chrome 在 Paint 阶段依据层叠上下文树递归生成绘制操作，部分层叠上下文（如 3D transform）会提升为合成层，独立于主线程光栅化——可延伸到“为什么 transform 元素能被 GPU 加速”。
- 架构层面：成熟组件库会对 z-index 做分层令牌管理（如 dropdown 1000 / popup 2000 / message 3000），Element Plus 与 Ant Design 均是集中注册、按序分配，避免业务代码 z-index 军备竞赛；能主动聊到这套治理思路是亮点。

## Q：盒模型是什么？box-sizing、margin 合并规则和负 margin 的行为分别是什么？

**核心答案**：CSS 盒模型描述元素由 content、padding、border、margin 四个盒子嵌套而成，分为标准盒模型（width 只含 content）和替代盒模型（width 含 content + padding + border），通过 box-sizing 切换，工程中普遍全局设置 border-box。margin 合并指块轴方向相邻块级盒的 margin 折叠取较大值。负 margin 则让元素反向偏移并参与流内计算，是实现紧贴布局、等宽栅格的经典手法。

**知识点解析**：

- 两种盒模型：content-box（默认，width = content 宽度）与 border-box（width = content + padding + border），后者让百分比宽度加 padding 不再溢出容器。

```css
/* 工程标配 */
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

- margin 合并的三个前提：块级盒、块轴方向、边界相邻（兄弟相邻，或父与首个/末个子元素边界接触）；中间被 BFC、边框、内边距、行内内容隔断则不合并。
- 合并计算规则：正正取大值；正负相加取和；负负取绝对值较大者。
- 负 margin 分类行为：margin-top/left 负值使自身向对应方向移动；margin-bottom/right 负值自身不动、让后续元素靠近；浮动元素负 margin 会发生重叠叠加；负 margin 还参与宽高计算。

```css
/* 经典：等间距栅格，容器负 margin 抵消首尾多余间距 */
.row {
  margin: 0 -10px;
}
.col {
  float: left;
  width: 33.33%;
  padding: 0 10px;
}
```

**加分项（P7 视角）**：

- 规范层面：margin 折叠定义在 CSS2.1 8.3.1；现代答案应补上逻辑属性（margin-block/margin-inline 与 writing-mode 的关系）和 CSS Box Sizing L4 的 margin-trim，说明“折叠只发生在块轴”的本质。
- 深度辨析：负 margin 与 relative 偏移的本质区别——负 margin 改变元素在流中的占位，参与后续兄弟元素的布局计算；relative 偏移只影响绘制位置不影响布局；能区分“参与布局的偏移”与“纯视觉偏移”是加分点。
- 工程层面：全局 border-box 重置对第三方组件的兼容风险（组件库可能依赖 content-box），可结合 `:where()` 做零优先级重置，或用 CSS Cascade Layers（@layer reset）控制权重。

## Q：flex: 1 的完整展开式是什么？flex 容器和子项有哪些属性？常见塌陷问题有哪些？

**核心答案**：`flex: 1` 是 `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` 的简写，表示均分剩余空间且可压缩、基准为 0，因此多个 `flex: 1` 的子项是“完全等分”而非按内容分配。flex 布局围绕主轴/交叉轴展开：容器属性控制方向、换行、对齐与空间分配，子项属性控制伸缩、基准与排序。常见塌陷问题包括 min-width 默认值导致的压缩失效、行内元素高度塌陷、嵌套 flex 的文本溢出等。

**知识点解析**：

- `flex: 1` 展开式：`flex-grow: 1; flex-shrink: 1; flex-basis: 0%`；注意 `flex: auto` 是 `1 1 auto`（基准为内容宽度，分配剩余空间后仍保留内容差异），两者行为差异是高频考点。

```css
/* 等分三列 */
.col {
  flex: 1; /* 完全等分，忽略内容宽度 */
}
/* 按内容比例扩展，内容多的更宽 */
.col-auto {
  flex: auto; /* grow=1 shrink=1 basis=auto */
}
```

- 容器属性：`flex-direction`（主轴方向）、`flex-wrap`（换行）、`flex-flow`（前两者简写）、`justify-content`（主轴对齐：flex-start/end/center/space-between/space-around/space-evenly）、`align-items`（交叉轴单行对齐：stretch/flex-start/flex-end/center/baseline）、`align-content`（多行整体对齐）、`gap`（子项间距，替代 margin 方案）。
- 子项属性：`flex-grow`（分配剩余空间的比例）、`flex-shrink`（压缩比例）、`flex-basis`（分配前的基准尺寸，优先级高于 width）、`order`（视觉排序）、`align-self`（个体覆盖对齐）。
- 塌陷问题一：flex 子项默认 `min-width: auto`，内容（长单词、表格、图片）会把子项撑开导致压缩失效。

```css
/* 长文本溢出容器的修复 */
.item {
  flex: 1;
  min-width: 0; /* 覆盖默认 auto，允许收缩 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- 塌陷问题二：容器不设高度时 `align-items: stretch` 使子项拉伸，但子项内容高度不一致时交叉轴基线错乱，需要 `align-items: baseline` 对齐文本。
- 塌陷问题三：`flex-basis` 与 `width` 的优先级——设置了 basis 后 width 在主轴方向失效；`flex: 1 1 100%` 与 `flex: 1` 初始尺寸完全不同。

**加分项（P7 视角）**：

- 规范层面：flex 分配算法在 CSS Flexbox Module L1 第 9 章，流程是“先冻结不可伸缩项 → 计算假设主尺寸 → 按 grow/shrink 分配剩余/溢出空间”；能描述 frozen item 与 hypothetical main size 概念说明理解了算法而非背属性。
- 深度：`flex-shrink` 的压缩是按“溢出量 x flex-shrink x flex-basis”加权的，不是简单等比压缩；shrink 为 0 是防止压缩的钥匙，配合 overflow 是表格布局的最佳实践。
- 架构层面：能用 flex + min-width: 0 + grid 替代百分比栅格；聊到 gap 取代 margin 栅格（无首尾负 margin 问题）、`flex-wrap` 与响应式的关系，以及为什么 flex 不适合做二维布局（grid 的定位能力更强）。

## Q：Grid 布局的显式/隐式网格是什么？fr、minmax、auto-fill 如何配合？子网格是什么？

**核心答案**：显式网格是由 `grid-template-columns/rows` 明确定义的轨道，超出部分进入隐式网格，其尺寸由 `grid-auto-rows/columns` 控制，隐式行高度塌陷是最常见问题。fr 是可用空间的等分单位，配合 `minmax()` 与 `auto-fill` 可实现无媒体查询的响应式栅格。subgrid 让子网格继承父网格轨道，解决嵌套卡片对齐难题。

**知识点解析**：

- 显式与隐式网格：`grid-template-columns` 定义显式列；子项放置到显式区域外时产生隐式轨道，用 `grid-auto-rows` 兜底高度。

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 显式 3 列 */
  grid-auto-rows: minmax(100px, auto);   /* 隐式行兜底，防塌陷 */
}
```

- minmax：定义轨道的上下限，`minmax(0, 1fr)` 防止内容撑破轨道（等价于 flex 的 min-width: 0 场景），`minmax(200px, 1fr)` 保证最小可用宽度。
- auto-fill 与 auto-fit：自动重复轨道数量；auto-fill 倾向填满并保留空轨道，auto-fit 会折叠空轨道让现有项拉伸——响应式卡片栅格核心方案。

```css
/* 无媒体查询的响应式卡片：最小 240px，自动换行 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
```

- 常用能力：`grid-area` 与命名区域模板实现可视化布局、`gap` 间距、`place-items`（align-items + justify-items 简写）、`grid-template-areas` 语义化布局。
- 子网格（subgrid）：子级网格继承父级轨道尺寸，实现嵌套卡片内容对齐。

```css
.card {
  display: grid;
  grid-template-rows: subgrid; /* 沿用父级行轨道，标题行高度对齐 */
  grid-row: span 3;
}
```

**加分项（P7 视角）**：

- 规范层面：轨道尺寸算法在 CSS Grid Module L1 第 12 章（intrinsic sizing），能提到 `fit-content()` 与 `auto` 轨道的内在尺寸贡献差异。
- 深度对比：grid 的 masonry 布局（grid-template-rows: masonry）尚未全面落地，瀑布流仍需 column/JS 方案；`grid` 是布局优先（二维先放后调），flex 是内容优先（一维按需伸缩），选型依据是“布局结构是否已知”。
- 架构层面：页面骨架用 grid、局部内容用 flex 的分层策略；subgrid 在设计系统中的价值——多卡片场景中标签行、描述行跨卡片对齐，此前只能用固定高度或 JS 测量。

## Q：absolute 相对于谁定位？sticky 为什么会失效？水平垂直居中有哪些方案？

**核心答案**：absolute 相对于最近的“定位祖先”（position 非 static 的祖先，transform/filter/perspective/filter 非 none 的祖先也算）定位，找不到则为初始包含块（视口大小的画布）。sticky 失效的主因是父容器 overflow 非 visible、祖先高度不足、或父元素设置了 height 限制脱离了滚动上下文。居中方案至少掌握 flex、grid、absolute + transform 三种现代方案，并能说出各自对“未知宽高”的适应性。

**知识点解析**：

- absolute 的定位基准：最近的 position 为 relative/absolute/fixed/sticky 的祖先；css-transforms 规定 transform/filter/perspective/will-change 非 none 的元素会成为 containing block，这是“设置了 transform 的父级会劫持 fixed 子元素”的原因。

```css
.outer {
  position: relative; /* absolute 子项的定位基准 */
}
.inner {
  position: absolute;
  top: 0;
  right: 0; /* 相对 outer 的 padding box 定位 */
}
```

- sticky 失效三大原因：任一祖先 `overflow: hidden/auto/scroll`（粘滞元素脱离了目标滚动容器的滚动上下文）；sticky 祖先链上的父元素高度等于或小于 sticky 元素自身（无粘滞空间）；未同时设置 top/bottom 等阈值。
- 居中方案合集：

```css
/* 1. flex 主流方案，未知宽高可用 */
.center-flex {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 2. grid 最简方案，未知宽高可用 */
.center-grid {
  display: grid;
  place-items: center;
}

/* 3. absolute + transform，未知宽高可用，不触发重排（动画友好） */
.center-transform {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 4. absolute + margin auto，未知宽高可用 */
.center-auto {
  position: absolute;
  inset: 0;
  margin: auto;
}

/* 5. absolute + 负 margin，需已知宽高 */
.center-negative {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 100px;
  margin: -50px 0 0 -100px;
}

/* 6. flex + margin auto，子项自动居中 */
.center-child-margin {
  display: flex;
}
.center-child-margin > .child {
  margin: auto;
}
```

```html
<!-- 7. table-cell 老方案，未知宽高可用 -->
<div class="outer" style="display: table-cell; vertical-align: middle; text-align: center;">
  <span class="inline-child">内容</span>
</div>

<!-- 8. 行内文本方案：line-height 等于 height（仅单行文本） -->
<div style="height: 40px; line-height: 40px; text-align: center;">单行文本</div>
```

**加分项（P7 视角）**：

- 规范层面：定位基准的准确定义是“包含块（containing block）”，absolute 的包含块是定位祖先的 padding box；能讲清 initial containing block 与 fixed 定位的关系、以及 transform 改变 fixed 包含块这一规范行为。
- 渲染层面：居中动画为什么选 transform 方案——不参与 layout，只在合成阶段处理，主线程阻塞时依然流畅；负 margin 方案每次动画触发 layout + paint，性能分级清晰。
- 实战层面：sticky 的正确结构实践——sticky 元素应直接挂在滚动容器的直接子级，且父容器不限制高度；能说出 Chrome/Safari 对 overflow 剪裁 sticky 行为的历史差异更佳。

## Q：响应式布局有哪些方案？媒体查询、容器查询、clamp/min/vw 分别解决什么问题？

**核心答案**：响应式经历了三个阶段：媒体查询按视口断点切换布局，容器查询按父容器尺寸响应组件，流式排版函数（clamp/min/max）配合 vw 单位实现无断点的平滑缩放。三者定位不同：媒体查询解决“页面级布局切换”，容器查询解决“组件级自适应”（同一组件在侧栏和主区呈现不同形态），clamp 则解决“文本/间距随视口连续缩放”。

**知识点解析**：

- 媒体查询：断点设计（移动优先 min-width / 桌面优先 max-width）、媒体特性（width/height/aspect-ratio/prefers-color-scheme/prefers-reduced-motion/hover）。

```css
/* 移动优先：默认单列，视口变宽后升级 */
.layout {
  display: grid;
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .layout {
    grid-template-columns: 240px 1fr;
  }
}
/* 用户偏好查询 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none;
    transition: none;
  }
}
```

- 容器查询：父容器声明 container-type，子组件用 @container 响应容器宽度，组件与视口解耦，是设计系统的关键能力。

```css
.card-wrapper {
  container-type: inline-size; /* 允许按行内尺寸查询 */
}
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr; /* 容器够宽时横排 */
  }
}
```

- 流式函数：clamp(最小值, 首选值, 最大值) 连续缩放并夹取上下限，min/max 取极值。

```css
/* 标题在 24px 到 40px 之间随视口平滑缩放 */
h1 {
  font-size: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
}
/* 间距有上限，避免超宽屏间距失控 */
.section {
  padding-inline: max(1rem, 50% - 32rem); /* 内容区最大 64rem 居中 */
}
```

- vw/vh 注意点：移动端地址栏导致 100vh 超出可视区，应使用 dvh/svh/lvh 动态视口单位。

**加分项（P7 视角）**：

- 演进视角：容器查询（含 cqw/cqi 容器单位）补齐了“组件响应式”的最后拼图，配合 cqmin/cqmax 可以让组件内部排版完全由容器驱动，实现真正的“组件可移植性”。
- 工程视角：断点应来自设计系统的 layout token 而非设备宽度；能聊到 VitePress/UnoCSS/Tailwind 的断点约定（sm/md/lg）与设计侧 Figma 断点对齐的协作流程。
- 无障碍视角：prefers-reduced-motion 与 prefers-contrast 是响应式的重要组成部分，动画降级不是可选项而是无障碍合规要求。

## Q：移动端适配方案有哪些？rem/em/vw 如何选型？1px 问题和安全区怎么处理？

**核心答案**：主流适配是“设计稿 px 自动换算视口相对单位”：rem 方案（根字号随视口缩放，借助 postcss-pxtorem）、vw 方案（直接按 1px = nvw 换算，postcss-px-to-viewport）、以及 vw + rem 混合方案（rem 兜底极限场景）。1px 问题是高 DPR 屏上 CSS 像素被多倍物理像素渲染导致细边框变粗，用 transform 缩放或 SVG 边框解决。安全区用 env(safe-area-inset-*) 配合 viewport-fit=cover 处理刘海屏与底部横条。

**知识点解析**：

- 单位对比：em 相对当前元素字号（继承链易失控，适合组件内间距与字号联动）；rem 相对根字号（全局可控，换算简单）；vw/vh 相对视口（无 JS 依赖、无逐级计算）。

```css
/* rem 方案：根字号随视口宽度缩放（以 375 设计稿为例） */
html {
  font-size: 4vw; /* 375px 视口下 1rem = 15px，配合 pxtorem 换算 */
}
/* vw 方案：1px = 100 / 375 vw，直接写换算结果 */
.box {
  width: 26.67vw; /* 设计稿 100px */
}
```

- 1px 问题：window.devicePixelRatio 为 2/3 时，1 CSS px 由 2/3 物理像素填充，边框视觉变粗；方案对比——伪元素 + transform scaleY 缩放、border-image/SVG、box-shadow 模拟、viewport 缩放（整体缩放有副作用，已淘汰）。

```css
/* 主流方案：伪元素画 1 物理像素边框 */
.hairline {
  position: relative;
}
.hairline::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: #e5e5e5;
  transform: scaleY(0.5); /* DPR=2 屏幕；DPR=3 用 0.33 */
  transform-origin: 0 0;
}
```

- 安全区：meta viewport 声明 viewport-fit=cover 后，用 env() 读取非矩形屏幕的安全边距。

```css
.footer {
  padding-bottom: calc(env(safe-area-inset-bottom) + 12px);
}
/* 兼容不支持 env 的旧设备兜底 */
@supports (padding: max(0px)) {
  .footer {
    padding-bottom: max(env(safe-area-inset-bottom), 12px);
  }
}
```

**加分项（P7 视角）**：

- 选型权衡：rem 方案需要在 HTML 头部内联脚本设置根字号（否则有闪烁），vw 方案无需 JS 但极限视口（超宽屏、无障碍放大）失控——大厂常用“vw 为主 + clamp 夹取上下限”的组合拳。
- 深度：物理像素、CSS 像素、DPR 三者关系；image-set 和 srcset 的 1x/2x/3x 与 DPR 配套；UI 设计稿 2x/3x 的导出约定与前端还原链路。
- 实战：safe-area 需要区分 constant()（iOS 11.0-11.2 旧语法）与 env() 的兼容写法；聊到 App 内嵌 H5 的 WebView viewport 差异（缩放禁用、视口 meta 被容器改写）是真实经验加分。

## Q：为什么 transform 和 opacity 不触发重排？will-change 如何使用？什么是合成层爆炸？

**核心答案**：渲染流程是 Style → Layout → Paint → Composite，transform 和 opacity 只影响合成阶段——GPU 直接对已光栅化的纹理做矩阵变换与透明度混合，不改变布局几何，因此跳过 Layout 和 Paint。will-change 用于提前告知浏览器某个属性将要变化，让其提升独立合成层预光栅化；但滥用会导致“合成层爆炸”——过多层占用显存、增大合成开销与内存，反而降低性能。

**知识点解析**：

- 属性性能分级：触发重排（width/height/margin/top/left）、只触发重绘（background/color/visibility）、只触发合成（transform/opacity/filter）；动画应尽量锁定在合成友好的属性上。
- 合成层工作原理：层内容光栅化为纹理存入 GPU 显存，动画只是更新合成器（compositor）中的变换矩阵，即使主线程阻塞动画依然流畅。
- will-change 使用规范：提前声明、动画结束后移除、不要对大面积/大量元素使用。

```css
/* 正确：提前一帧提示，用完移除 */
.card {
  transition: transform 0.3s;
  will-change: transform;
}
.card.dragging {
  transform: translate3d(0, 0, 0); /* 强制开启硬件加速 */
}

/* 错误：全局滥用，层爆炸 */
* {
  will-change: transform; /* 每个元素一层，显存与合成成本剧增 */
}
```

- 层爆炸（layer explosion）：大量元素各自提升为合成层，或will-change/translateZ(0) 打满，导致显存占用高、层树管理与绘制排序开销大，低端机反而掉帧。

**加分项（P7 视角）**：

- 渲染引擎层面：Chrome 的 Property Trees（transform/clip/effect）将合成属性与 DOM 解耦，cc（compositing）阶段决定分层策略；能用 DevTools 的 Layers 面板与 Rendering/Paint flashing 定位“隐式分层”——3D transform 元素会诱导相邻元素分层。
- 度量方法：Performance 面板看 Layout/Paint 耗时分布，理想动画是纯 Composite 条带；能现场演示把 top 动画改成 transform 后帧率提升的对比。
- 架构层面：动画性能清单化——桌面端 60fps 帧预算 16.7ms、滚动容器用 content-visibility 预算渲染、长列表虚拟滚动与 transform 动画配合；说明“不是所有动画都该上 will-change”的成本意识。

## Q：CSS 变量如何实现主题切换？@property 是什么？dark mode 有哪些策略？

**核心答案**：CSS 自定义属性（--var / var()）具有继承性和运行时可写性，JS 可通过 setProperty 动态修改根节点变量，实现零重编译的主题切换。主题方案是“设计令牌定义变量集 + data-theme 属性切换作用域”。@property 为自定义属性注册类型、初始值和继承性，使其可参与过渡动画和类型校验。dark mode 策略有：prefers-color-scheme 媒体查询自动跟随系统、手动 class 切换、以及兼顾两者的“系统默认 + 手动覆盖”组合。

**知识点解析**：

- 变量基础：定义在 :root 的变量全局继承；var() 支持回退值链 `var(--color, red)`；变量区分大小写、遵循 DOM 继承链。

```css
:root {
  --color-primary: #1677ff;
  --color-bg: #fff;
}
[data-theme='dark'] {
  --color-primary: #3c89e8;
  --color-bg: #141414;
}
.button {
  background: var(--color-primary);
  color: var(--color-bg);
}
```

```js
// 运行时切换主题：修改变量即可全站生效
document.documentElement.setAttribute('data-theme', 'dark');
// 或单点覆盖变量
document.documentElement.style.setProperty('--color-primary', '#f5222d');
```

- @property：注册类型化自定义属性，可设定 syntax（类型）、inherits（是否继承）、initial-value；未注册的变量在过渡时被视为不连续的字符串，不能参与 transition。

```css
@property --angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
.rotate {
  --angle: 0deg;
  transition: --angle 0.5s; /* 注册后变量可平滑过渡 */
}
.rotate:hover {
  --angle: 360deg;
  transform: rotate(var(--angle));
}
```

- dark mode 三种策略对比：纯媒体查询（无记忆、无法手动控制）、纯 class 切换（需 JS 管理状态与持久化）、混合策略（系统值为默认、用户选择写 localStorage 覆盖）。

```css
/* 混合策略：默认跟随系统，html.dark 时强制暗色 */
:root {
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --color-bg: #141414;
  }
}
:root.dark {
  --color-bg: #141414;
}
```

- 关键细节：color-scheme 属性让浏览器原生控件（滚动条、表单）同步主题；切换瞬间闪烁需要在 head 内联脚本提前读取偏好设置 class。

**加分项（P7 视角）**：

- 规范层面：CSS 自定义属性并非真正的“变量”而是级联变量，参与级联且继承；@property 属于 CSS Houdini 的 Properties and Values API，是 JS 与 CSS 引擎交互的最成熟落地。
- 深度：未注册变量是 token stream，注册后才是有类型的 computed value，因此只有注册后才能动画化——能讲清这个本质区别是 P7 信号；渐变动画（旧方案 @keyframes hack vs @property 直达）是经典案例。
- 架构层面：主题系统的分层——primitive token（色板）→ semantic token（背景/文字语义）→ component token（按钮主色），dark mode 只映射 semantic 层；Ant Design 5 的 CSS-in-JS token 体系和 VitePress 的 data-theme 方案可作对比。

## Q：样式隔离有哪些方案？scoped、BEM、CSS Modules、Tailwind、Shadow DOM 各自的原理与取舍是什么？

**核心答案**：样式隔离解决“同名类冲突与样式泄漏”问题，方案分五类：BEM 用命名约定人工隔离（零运行时但依赖团队纪律）；Vue scoped 用 data-v 属性选择器编译期加 hash（组件级隔离，但穿透性弱）；CSS Modules 构建期把类名转成 hash（JS 引用强约束，死代码可分析）；Tailwind 用原子类 + 预设约束，从源头消除自定义命名；Shadow DOM 用浏览器级的样式边界（隔离最强但工程链路最重）。选型取决于项目形态：组件库选 CSS Modules/Shadow DOM，业务系统常是 scoped + 原子类混合。

**知识点解析**：

- BEM：Block__Element--Modifier 命名规范，通过命名唯一性避免冲突；缺点是冗长、靠约定而非机制保证。

```html
<div class="card card--featured">
  <div class="card__title">标题</div>
  <div class="card__body">内容</div>
</div>
```

- Vue scoped：编译期给组件内元素加 data-v-hash 属性，选择器编译为 `.title[data-v-123]`；子组件根元素会带父组件 hash；deep 穿透选择器可影响子组件内部。

```css
/* scoped 中的深度选择器 */
.parent :deep(.child-input) {
  border-color: red;
}
/* slot 内容与全局样式 */
:global(.markdown-body) {
  line-height: 1.8;
}
```

- CSS Modules：类名编译为 hash（如 `.title_a1b2c`），JS 中以对象引用，拼错即 undefined，天然支持 Tree-shaking 与死样式分析。

```js
import styles from './Button.module.css';
// styles.title -> 'Button_title_a1b2c'
```

- Tailwind/原子化：类名即样式，无自定义命名空间；构建期扫描源码生成用到的原子类，产物体积可控；争议点是可读性与语义性的取舍。

```html
<button class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
  提交
</button>
```

- Shadow DOM：浏览器原生样式边界，外部选择器进不来（可继承属性除外），CSS 自定义属性可穿透；Web Components 与微前端卡片嵌入常用。

**加分项（P7 视角）**：

- 机制对比：scoped 与 CSS Modules 都是构建期隔离，Shadow DOM 是运行时浏览器隔离；能说明 Shadow DOM 的 ::part 主题化机制与可继承属性的“泄漏”边界（font/color 会穿透 shadow root）。
- 工程权衡：Tailwind 的 JIT 引擎扫描生成产物，与 CSS Modules 的按需提取本质都是“用到的才打包”；聊到 UnoCSS 的按需原子化与 Tailwind 的预设差异、原子类与设计令牌（theme 配置）的结合是亮点。
- 微前端场景：Wujie/iframe 的样式隔离层次——iframe 天然 OS 级隔离、Shadow DOM 强隔离但弹层挂 body 失效、scoped 多实例 hash 隔离；能结合简历中微前端项目谈选型是高分项。

## Q：Sass 的原理是什么？PostCSS 插件链如何工作？为什么出现 Lightning CSS？

**核心答案**：Sass 是预处理器，在构建期把超集语法（嵌套、变量、mixin、循环、模块）编译成标准 CSS；其核心能力是“用编程抽象换可维护性”，代价是额外编译与运行时不可变。PostCSS 是用 JS 插件转换 CSS AST 的后处理平台，本身不提供语法，autoprefixer、postcss-preset-env、cssnano 等插件构成处理链。Lightning CSS 用 Rust 编写的并行解析/转换/压缩一体工具，比 JS 工具链快 100 倍量级，Vite 已可选接入，代表了 CSS 工具的 Rust 化趋势。

**知识点解析**：

- Sass 编译原理：Dart Sass 解析 SCSS 为 AST，展开嵌套为后代选择器、解析变量/mixin/继承为普通声明，输出标准 CSS；@use/@forward 模块化替代旧 @import（避免全局命名空间污染）。

```scss
// SCSS：编译期展开
$radius: 8px;
@mixin card {
  border-radius: $radius;
  padding: 16px;
}
.featured {
  @include card;
  .title {
    font-weight: 600;
  }
}
```

```css
/* 编译产物 */
.featured {
  border-radius: 8px;
  padding: 16px;
}
.featured .title {
  font-weight: 600;
}
```

- PostCSS 工作方式：CSS 解析为 AST → 插件链按序访问/改写节点 → 序列化输出；常见插件：autoprefixer（按 browserslist 补前缀）、postcss-preset-env（未来语法降级）、postcss-px-to-viewport（单位换算）、cssnano（压缩）。
- 插件顺序的意义：语法转换在前、优化压缩在后；browserslist 统一控制目标浏览器，是整个前端工具链（Babel/autoprefixer/eslint-plugin-compat）共享的契约。

```js
// postcss.config.js 插件链示例
module.exports = {
  plugins: [
    require('postcss-preset-env')({ stage: 3 }),
    require('autoprefixer'),
    require('postcss-px-to-viewport')({ viewportWidth: 375 }),
    require('cssnano')({ preset: 'default' }),
  ],
};
```

- Lightning CSS：解析、转换（嵌套/降级/前缀）、压缩一体化，Rust 多核并行，单文件级 API 供 Vite/Rollup/Turbopack 调用；vitest 与 Next.js 已在迁移路径上。
- 原生 CSS 追赶：嵌套、变量、:has、cascade layers 逐渐原生化，预处理器的必要性在下降，PostCSS 的角色从“补语法”转向“工程定制”。

**加分项（P7 视角）**：

- 原理层面：Sass 嵌套展开容易产出过长的选择器链（性能与体积双重成本），`@at-root` 与 BEM 结合可控制产物；能聊编译期无法 Tree-shaking CSS（需靠 PurgeCSS/UnCSS 静态扫描）。
- 工具链层面：Vite 中 Sass 按需编译与 additionalData 注入全局变量；postcss 与 vite 的 css.postcss 配置；能解释 browserslist 数据来源（caniuse）与 CI 中过期提示的治理。
- 趋势判断：原生嵌套 + CSS 变量 + cascade layers 落地后，新项目的合理形态是“原生 CSS 为主 + Lightning CSS 压缩 + 少量 PostCSS 定制插件”； Sass 仅在主题 mixin 复杂度确实需要时保留——给出这种演进判断是 P7 加分。

## Q：CSS 如何影响关键渲染路径？FOUC/FOUT 如何治理？字体加载策略有哪些？

**核心答案**：CSS 是渲染阻塞资源（render-blocking）——HTML 解析到 stylesheet 会暂停渲染直到 CSSOM 构建完成，因此 CSS 体积与加载位置直接影响 FCP/LCP。FOUC（无样式内容闪烁）由样式晚于内容到达导致，FOUT（字体闪烁）由回退字体先渲染、自定义字体后到达导致。治理手段：关键 CSS 内联首屏 + 异步加载非关键样式、font-display 控制字体交换策略、preload 提前拉取字体文件、font-family 回退链兜底。

**知识点解析**：

- 渲染阻塞链：DOM + CSSOM → Render Tree → Layout → Paint；`<link>` 放 head 避免重复渲染和 FOUC，但 CSS 体积大时反而拖慢首屏——权衡点是“首屏关键 CSS 最小化”。

```html
<!-- 关键 CSS 内联，非关键样式异步加载 -->
<style>
  /* 首屏关键样式：导航、首屏布局 */
</style>
<link rel="preload" href="/non-critical.css" as="style" onload="this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="/non-critical.css" /></noscript>
```

- FOUC 成因与治理：样式表放在 body 尾部或网络慢时，浏览器先渲染无样式内容；治理是 head 内联关键 CSS + media 切分（print/宽屏样式不阻塞）+ preload 提示。

```html
<!-- 非首屏样式不阻塞渲染 -->
<link rel="stylesheet" href="/print.css" media="print" />
<link rel="stylesheet" href="/wide.css" media="(min-width: 1200px)" />
```

- font-display 五种策略：auto、block（阻塞 3s 内先用不可见文字）、swap（立即回退、字体到了就换，FOUT 来源）、fallback（100ms 阻塞后换、到货后短暂交换窗口）、optional（极短窗口，晚到本轮不换，下次导航生效——零布局抖动首选）。

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/main.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0000-00FF; /* 分包子集，只加载用到的字符块 */
}
```

```html
<!-- 字体提前拉取：preload + crossorigin（字体必须 CORS 匿名模式） -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
```

- 字体度量抖动：回退字体与自定义字体度量差异导致布局偏移（CLS），用 size-adjust / ascent-override 微调回退字体度量可显著降低 CLS。

**加分项（P7 视角）**：

- 深度：preload 字体必须加 crossorigin 的原因——字体以匿名 CORS 模式获取，缺失会导致 preload 与实际请求命中不了同一缓存而双重下载；能讲清这个细节说明真踩过坑。
- 度量体系：FCP 与 CSS 阻塞的关系、LCP 元素若依赖 webfont 则 font-display 直接影响 LCP；用 Lighthouse/CrUX 观测 font 相关的布局偏移。
- 工程体系：关键 CSS 提取的自动化（critters/beasties、critical 工具在构建期抽取首屏样式内联）；SSR 场景下样式注入与 hydration 的样式闪烁问题及 Vue SSR 的 style hoisting 处理。

## Q：CSS 选择器如何匹配？样式计算的性能成本在哪里？contain 属性有什么用？

**核心答案**：浏览器从右到左（right-to-left）匹配选择器——先找最右侧的关键选择器，再向左验证祖先关系，这比从左到右能更早淘汰不匹配的节点。样式计算成本与选择器复杂度、DOM 规模、样式表规模相关，单个元素要匹配所有样式规则并按级联排序得出最终值。contain 属性向浏览器声明元素的渲染边界（layout/paint/size/style），让内部变化的影响范围被限制，从而缩小重排/重绘的作用域，是低成本高性能优化手段。

**知识点解析**：

- 从右到左匹配：`.nav li a` 先匹配所有 a，再向上找 li 与 .nav；关键选择器（最右侧）越具体，淘汰越早——所以“后代选择器开头”性能最好，“通配与标签做关键选择器”最差。

```css
/* 差：关键选择器是通配符，全 DOM 扫描 */
.nav * {
  color: red;
}

/* 好：关键选择器具体，快速收敛 */
.nav-link {
  color: red;
}
```

- 样式计算（Recalculate Style）成本：选择器匹配 + 级联/继承解析 + computed value 计算；深 DOM、超长类名拼接（如原子类堆叠）、频繁 className 整体切换都会放大成本。
- 共享样式：浏览器有 style sharing 优化，相同 class 的同构元素可复用 computed style，但 `:has`、兄弟选择器、属性选择器会破坏共享。
- contain 属性四个取值：size（尺寸独立，内部不影响外部布局）、layout（内部布局与外部隔离）、paint（子元素绘制被裁剪在边界内）、style（计数器等影响隔离）；`contain: content` 是 layout + paint 组合，`contain: strict` 是全部组合。

```css
/* 长列表卡片：限制渲染影响范围 */
.card {
  contain: layout paint; /* 内部变化不引起外部重排/重绘扩散 */
}

/* 屏幕外内容跳过渲染 */
.below-fold {
  content-visibility: auto;
  contain-intrinsic-size: 200px; /* 占位尺寸，防滚动条跳动 */
}
```

- content-visibility: auto 是 contain 的实战延伸：屏幕外子树跳过 Layout/Paint，渲染成本从“全量”降到“视口内”，配合 contain-intrinsic-size 保持滚动高度稳定。

**加分项（P7 视角）**：

- 引擎层面：Chrome 用 Rule Sets + Bloom Filter 加速候选规则筛选，style sharing cache 有明确的失效条件；能提“选择器性能在现代引擎已被高度优化，架构收益大于微优化”的判断更体现高度。
- 度量驱动：Performance 面板的 Recalculate Style 耗时、Coverage 面板找未使用样式、DevTools Rendering 的 Paint flashing；先度量再优化而非教条式“选择器不超过三层”。
- 架构层面：:has() 父选择器的性能语义（无法共享样式）与场景化使用；contain 在虚拟列表/仪表盘密集卡片（BI 可视化大屏）场景的实测收益——结合项目讲数据是 P7 的差异点。

## Q：什么是 CSS Houdini？@property 类型化自定义属性解决了什么问题？

**核心答案**：Houdini 是浏览器开放 CSS 引擎底层能力的 API 集合，让开发者用 JS 参与/扩展渲染流程，绕过标准化的漫长周期。落地程度最高的是 Properties and Values API（@property），它为自定义属性注册类型、初始值与继承性，使变量从“不透明字符串”变成“可动画、可校验的类型化值”。其余 API 如 Paint API（自定义绘制）、Layout API（自定义布局）、Animation Worklet（合成线程动画）、Typed OM 各浏览器支持不一，需按渐进增强使用。

**知识点解析**：

- Houdini API 家族与支持度：Properties and Values API（广泛可用）、Paint API（Chrome 支持、Safari 部分跟进）、Typed OM（CSSStyleValue 结构化读写）、Animation Worklet（Chrome 旗标级）、Layout API（实验性）。
- @property 三要素：syntax（值类型，如 `<color>`、`<length>`、`<angle>`、`<number>`）、inherits（是否继承）、initial-value（缺省值）。

```css
/* 未注册：变量是字符串，过渡无效 */
.progress {
  --p: 0.5;
  transition: --p 0.3s; /* 无效！ */
}

/* 注册后：类型化变量，可参与插值动画 */
@property --p {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}
.progress {
  --p: 0.5;
  transition: --p 0.3s ease;
  background: linear-gradient(90deg, skyblue calc(var(--p) * 100%), #eee 0);
}
.progress:hover {
  --p: 0.9;
}
```

- 渐变动画的经典解放：background-position / background-size hack（旧方案）到 @property 直接动画渐变端点，代码量与可读性双提升。
- Paint API：registerPaint 注册绘制逻辑，CSS 中通过 paint() 函数引用，可生成网络纹理、噪点、复杂边框等，绘制在合成阶段执行。

```css
.ripple-bg {
  background-image: paint(my-noise); /* JS registerPaint('my-noise', ...) */
}
```

**加分项（P7 视角）**：

- 本质理解：Houdini 的意义是“渲染流程的扩展点开放”——Paint/Layout Worklet 运行在渲染管线内，脚本性能直接影响渲染帧；能区分“标准 CSS 能力”与“引擎扩展能力”的边界与风险。
- 工程判断：@property 需要考虑降级（不支持的浏览器中变量退化为不可动画，需 feature query 或 JS 兜底注册）；生产可用性排序是 @property > Typed OM > Paint API。
- 前瞻视角：部分 Houdini 能力正被原生 CSS 吸收（自定义函数的 @function 提案、CSS Values 5 的 mixed units 计算），能聊“Houdini 是能力试验田，成熟后转正为标准 CSS”的演进规律。

## Q：大规模 CSS 如何架构？设计令牌如何组织？原子化与样式体积如何权衡治理？

**核心答案**：大规模 CSS 架构的核心矛盾是“一致性 vs 灵活性 vs 体积”。主流方案是分层治理：底层设计令牌（Design Token，颜色/间距/字号/圆角的语义化变量）保证视觉一致性；中层是组件样式或原子类系统承载复用；顶层是页面级微调。原子化的本质收益是“样式的自然去重”（同一条规则全站只存在一份），配合 JIT 扫描只打包用到的类，产物随页面复杂度呈亚线性增长。样式体积治理靠度量驱动：Coverage 分析、死样式清理、按路由分包与压缩策略。

**知识点解析**：

- 设计令牌三层模型：primitive（原子色板、间距刻度）→ semantic（背景/文字/主色等语义映射）→ component（组件级覆盖）；主题系统只替换 semantic 层，dark mode 与多品牌共用 primitive。

```css
:root {
  /* primitive：原子值 */
  --blue-600: #1677ff;
  --gray-1: #ffffff;
  --space-2: 8px;
  /* semantic：语义引用 */
  --color-primary: var(--blue-600);
  --color-bg: var(--gray-1);
  --padding-card: var(--space-2);
}
[data-theme='dark'] {
  /* 只换语义层 */
  --color-bg: #141414;
}
```

- 架构方案谱系：ITCSS（倒三角分层：settings → tools → generic → elements → objects → components → utilities）、/utility-first（Tailwind/UnoCSS）、CSS-in-JS（运行时 token 计算）。
- 原子化权衡：优点是零命名心智、产物去重、样式与组件同置；缺点是 HTML 可读性下降、业务语义丢失、复杂状态样式（如大量子元素选择器）反而更冗长——用 @apply/组件封装收敛。
- 体积治理手段：JIT 按需生成（构建期扫描源码只产出用到的类）、PurgeCSS 静态清理、CSS 按路由代码分割、Lightning CSS 压缩（合并等价规则、简写化）、关键 CSS 内联。

```js
// Tailwind JIT 按需扫描示例
module.exports = {
  content: ['./src/**/*.vue', './src/**/*.ts'],
  theme: {
    extend: {
      spacing: {
        card: 'var(--padding-card)', // 原子类绑定设计令牌
      },
    },
  },
};
```

- 治理度量：stylelint 规则强制（禁止硬编码色值、强制令牌引用）、CI 中监控 CSS 产物体积阈值、Coverage 面板验证删除收益。

**加分项（P7 视角）**：

- 架构权衡：原子化适合“设计系统收敛、组件库自研”的场景；组件库对外输出时应提供令牌层（CSS 变量）+ 组件层（BEM 或 scoped），让业务既能用令牌换肤又能组件级覆盖——Ant Design 5 的双层 token 即此思路。
- 体积经济学：原子类产物曲线是“类目数 x 使用次数”先平后缓（重复类不增体积），组件样式是“组件数 x 样式量”线性增长；能定量讲出两者在大规模站点的差异是亮点。
- 治理体系：建立 CSS 体积看板（按路由/按包拆解）、死样式检测（Jest 快照 + DOM class 采样）、stylelint + 令牌 lint 作为卡点；结合 monorepo 场景谈跨包样式依赖（包级 @layer 与令牌包独立发包）是真实架构经验。
