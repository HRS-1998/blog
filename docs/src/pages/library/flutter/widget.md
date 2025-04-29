# demo 使用的 widget 具体可以看[组件集录](http://toly1994.com/flutter/#/widget)

1. MaterialApp  
   一个 Material Design 应用的根布局

2. Scaffold
   一个 Material Design 布局结构，包含头部/底部导航栏、浮动按钮，左右侧滑组件和一个主体内容区域。

3. Expanded
   一个 Expanded 组件，用于在 Row 或 Column 中使用，用来填充剩余空间。

4. Stack
   一个层叠布局，可以同时将多个组件重叠显示。

5. Wrap ==详细看==
   一个流式布局，可以自动换行。

6. EdgeInsets
   一个 EdgeInsets 组件，用于设置组件的边距。
   EdgeInsets 的使用方法
   EdgeInsets.all(10.0)：设置所有方向的边距为 10.0 像素。
   EdgeInsets.symmetric(horizontal: 10.0, vertical: 20.0)：设置水平方向对称的边距为 10.0 像素，垂直方向对称的边距为 20.0 像素。
   EdgeInsets.only(top: 10.0, bottom: 20.0,left:10,right:10)：设置各个方向的边距为 10.0 像素，底部方向的边距为 20.0 像素。

7. toList()

   toList() 方法用于将 Iterable 对象转换为 List 对象。

8. ElevatedButton 按钮

   ElevatedButton 是 Flutter 中的一个重要按钮组件，用于创建一个带有阴影效果的按钮。它提供了丰富的自定义选项，可以设置按钮的样式、文本、图标、颜色等
   主要属性

   - onPressed: 按钮点击时触发的回调函数。如果设置为 null，按钮将变为禁用状态。
   - child: 按钮的子组件，通常是 Text 或 Icon。
   - style: 按钮的样式，可以自定义按钮的颜色、边框、阴影等。
   - icon: 按钮左侧的图标。
   - label: 按钮右侧的文本或子组件。

9. ScaleTransition
   缩放变换

10. SlideTransition
    滑动变换， 让 child 从某个位置移动到另一个位置。过度 offset

11. FadeTransition
    子组件进行透明度渐变动画，需要提供动画器 opacity

12. Tween
    Flutter 中的动画库，用于创建动画效果。
    ```dart
    _positon=Tween<Offset>(begin: Offset(0,0),end: Offset(1,1)).animate(_controller);
    ```
