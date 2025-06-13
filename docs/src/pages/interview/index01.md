1. vue2,vue3 区别
   [vue2,vue3 区别](https://blog.csdn.net/weixin_43312391/article/details/143057205)

vue2 响应式和 vue3 响应式区别

vue2 响应式：
Vue 2 的响应式系统基于 Object.defineProperty() 实现。在组件初始化时，Vue 会对 data 中的所有属性（包括嵌套对象）进行递归遍历，并通过 Object.defineProperty 将其转换为带有 getter/setter 的响应式属性。同时，computed 和 watch 所依赖的属性也会在这个过程中被追踪。当属性被访问时（getter），会进行依赖收集；当属性被修改时（setter），会触发视图更新。但由于 Object.defineProperty 的限制，Vue 2 无法自动检测对象/数组的新增属性或属性的删除
通过 Vue.set 和 Vue.delete 来添加或删除对象或数组的属性。
通过重写数组的方法 push,pop,shift,unshift,splice,sort,reverse 方法
