# 设计模式文档模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `docs/src/pages/designPattern/` 下新建 14 种前端设计模式文档 + 重写 index.md 导航页，并配置 VitePress 侧边栏菜单。

**Architecture:** 纯文档任务。每篇文档统一五段结构（定义/结构/JS实现/前端应用/优缺点对比），现代 class 语法示例 + 框架场景。菜单在 `config.mjs` "设计模式"分组平铺 15 项。

**Tech Stack:** VitePress (Markdown), 原生 JS/TS 示例, Vue/React 场景举例。

**Spec:** `docs/superpowers/specs/2026-09-22-design-pattern-docs-design.md`

---

## 通用文档结构（每个模式文档必须遵循）

```markdown
# 模式名

> 一句话定义（引用块）

## 解决什么问题
（核心痛点，2-3 段）

## 结构说明
（角色列表：如 Subject/Observer 等各自职责，文字描述）

## 原生 JS 实现
（现代 class/ES6+ 语法，代码带注释，附使用示例和预期输出）

## 前端中的应用
（2-3 个真实场景，每个：场景描述 + 简短代码或源码引用）

## 优缺点与对比
（优点/缺点列表 + 与易混淆模式的对比表格）
```

**风格要求**（参照仓库现有文档）：
- 中文正文，代码块标注 `js`/`ts`/`vue`
- 面试笔记风格：重点用 `==高亮==`（VitePress 支持）、直接、可背诵的结论
- 不写客套话，内容密度优先

**提交规范**：每完成一批文档 commit 一次，消息格式参照 `git log`（如 `docs: 设计模式-单例/策略/代理`）。

---

### Task 1: 单例模式

**Files:**
- Create: `docs/src/pages/designPattern/01-单例模式.md`

- [ ] 按通用结构写文档，实现部分包含：
  1. 闭包/class static 实现（`getInstance`）
  2. 惰性单例通用函数 `getSingle`（**吸收自旧 index.md:52-68**，保留 iframe 例子）
- [ ] 前端应用：全局唯一的 Loading/Modal 弹窗（写一个 `getSingle(createModal)` 例子）；Vuex/Pinia store 单例；ES Module 天然单例（import 缓存）
- [ ] 对比：与"工厂模式"的区别；末尾附**相关模式：工厂模式**小节（简单工厂/工厂方法/抽象工厂，用 `class User extends Person` 或弹窗类型工厂举例，含 React `createElement` 场景）

### Task 2: 策略模式

**Files:**
- Create: `docs/src/pages/designPattern/02-策略模式.md`

- [ ] 实现部分：奖金计算器（S/A/B performance 策略对象 + Context，**改进旧 index.md:73-91 的函数传参版**）；表单校验策略（`strategies.required`/`strategies.minLength` + Validator class）
- [ ] 前端应用：动画缓动函数（easeIn/easeOut 策略表，呼应旧笔记"结合缓存算法实现动画"）；Vue 中动态 class/`<component :is>`；消除大量 if-else
- [ ] 对比：策略 vs 状态模式（关键区别：策略的分支互不感知、由客户端选择；状态分支互相知道并自动流转）

### Task 3: 代理模式

**Files:**
- Create: `docs/src/pages/designPattern/03-代理模式.md`

- [ ] 实现：虚拟代理（图片懒加载 placeholder → onload 换 src）、缓存代理（计算结果 Map 缓存）、保护代理（权限校验拦截）
- [ ] 前端应用：Vue3 `new Proxy` 响应式（get/set track/trigger 示意代码）；防抖节流本质是代理；跨域反向代理概念辨析（nginx 不是本模式）
- [ ] 对比：代理 vs 装饰者（代理控制访问、装饰者增强功能；代理强调"同一接口、调用方无感知"）

### Task 4: 迭代器模式

**Files:**
- Create: `docs/src/pages/designPattern/04-迭代器模式.md`

- [ ] 实现：手写 `Symbol.iterator`（自定义 range 迭代器）；内部迭代器 vs 外部迭代器说明
- [ ] 前端应用：`for...of`/展开运算符原理；Generator 函数（`function*` 实现 range，说明原生迭代器痛点）；DOM NodeList/Array.from
- [ ] 对比：迭代器 vs Generator vs for 循环性能

### Task 5: 发布-订阅模式

**Files:**
- Create: `docs/src/pages/designPattern/05-发布订阅模式.md`

- [ ] 实现：完整 EventBus class（on/off/once/emit，once 用包装函数+off 实现，含使用示例）
- [ ] 前端应用：Node `EventEmitter`；Vue2 `$on/$off`（已废弃原因：难追溯）；跨组件通信 mitt；DOM addEventListener 本质
- [ ] 对比：**发布订阅 vs 观察者**（表格：有无调度中心/耦合度/同步异步）——必写，这是高频面试题

### Task 6: 中介者模式

**Files:**
- Create: `docs/src/pages/designPattern/06-中介者模式.md`

- [ ] 实现：多人聊天室（ChatRoom 中介者 + User，消息经中介者转发）
- [ ] 前端应用：Vuex/Redux 全局 store 即中介者；antd 表单 Form 收集/分发字段状态；小程序页面通信
- [ ] 对比：中介者 vs 发布订阅（都有中心：中介者双向协调、订阅中心单向分发）

### Task 7: 状态模式

**Files:**
- Create: `docs/src/pages/designPattern/07-状态模式.md`

- [ ] 实现：红绿灯（LightState 各自 class，持 context 引用，自动切换）
- [ ] 前端应用：Promise pending/fulfilled/rejected 状态机（不可逆流转说明）；订单/审批状态流转；RPC 生命周期；对比"用一个 state 字段 + switch"的坏味道
- [ ] 对比：状态 vs 策略（呼应 Task 2 的对比表，互相链接 `./02-策略模式.md`）

### Task 8: 命令模式

**Files:**
- Create: `docs/src/pages/designPattern/08-命令模式.md`

- [ ] 实现：命令对象（execute/undo），实现宏命令（命令数组顺序执行）+ 富文本编辑器撤销/重做（命令栈 + undo 栈）
- [ ] 前端应用：编辑器撤销（Ctrl+Z 原理）；菜单/按钮点击统一派发命令；redux action 本质是命令的 JSON 描述
- [ ] 对比：命令 vs 发布订阅（命令有明确执行者与撤销能力）

### Task 9: 组合模式

**Files:**
- Create: `docs/src/pages/designPattern/09-组合模式.md`

- [ ] 实现：文件目录树（Folder/File 统一接口，`scan()` 递归）；强调"部分-整体"、叶子和容器实现同一接口
- [ ] 前端应用：DOM 树（Node 体系）；Vue/React 组件树与 slot/children 递归渲染；`<template>` 递归组件（菜单树举例）

### Task 10: 模板方法模式

**Files:**
- Create: `docs/src/pages/designPattern/10-模板方法模式.md`

- [ ] 实现：抽象基类定义骨架（如 Beverage：boil→brew→pour→addCondiments，子类只实现 brew），钩子方法说明
- [ ] 前端应用：Vue/React 生命周期钩子（框架定骨架、开发者填内容，最典型）；npm scripts/CLI 脚手架模板流程；express/Koa 中间件初始化流程

### Task 11: 享元模式

**Files:**
- Create: `docs/src/pages/designPattern/11-享元模式.md`

- [ ] 实现：内部状态/外部状态划分说明 + 对象池（`ObjectPool`：create/recover/recycle，子弹/弹幕例子）
- [ ] 前端应用：虚拟列表（只渲染可视区域，滚动复用 DOM）；连接池（数据库/http keep-alive）；JS 数字/字符串装箱复用（`===` 的 String 池）

### Task 12: 职责链模式

**Files:**
- Create: `docs/src/pages/designPattern/12-职责链模式.md`

- [ ] 实现：异步职责链（每个节点返回 `next()` 才继续，如订单审批流：主管→经理→总监）；AOP 式 Function.prototype.after 实现
- [ ] 前端应用：axios 拦截器链（request/response interceptors 形成链条，画调用顺序图）；Redux 中间件（`next(action)` 逐层传递，写 logger/thunk 简版）；DOM 事件冒泡本质
- [ ] 对比：职责链 vs 中介者（链是线性传递可中断，中介者是星型全连接）

### Task 13: 装饰者模式

**Files:**
- Create: `docs/src/pages/designPattern/13-装饰者模式.md`

- [ ] 实现：基础函数 + 装饰器层层包裹（`withLog(withTiming(fn))`），AOP `before/after`
- [ ] 前端应用：React HOC（`withRouter(Connect(Form))` 嵌套即装饰）；ES7/TS 装饰器（`@readonly`/类装饰器，Mobx-vue-class 组件）；高阶函数（memo/防抖包装）本质
- [ ] 对比：装饰者 vs 代理（呼应 Task 3，互相链接）；装饰者 vs 继承（组合优于继承）

### Task 14: 适配器模式

**Files:**
- Create: `docs/src/pages/designPattern/14-适配器模式.md`

- [ ] 实现：新旧接口适配（旧接口 `getUserData()` → 新系统需要 `getNewUser()`，写 adapter 转换字段命名 `user_name→userName`）
- [ ] 前端应用：接口数据适配层（后端字段→组件 props，解耦 UI 与后端）；axios 参数适配（`transformRequest`）；旧代码兼容（mock 数据适配成真实接口格式）；vue computed 做视图适配
- [ ] 末尾附**相关模式：外观模式**小节（给复杂子系统一个统一入口，如封装统一的 `upload()` 内部处理压缩/格式校验/分片；区别：适配器转接口、外观简化接口）

### Task 15: 重写 index.md 导航索引

**Files:**
- Modify: `docs/src/pages/designPattern/index.md`（整文件重写）

- [ ] 内容结构：
  1. 模块介绍（1 段）
  2. 14 种模式汇总表格：`| 模式 | 一句话定义 | 典型前端场景 |`（数据来自 spec 的应用场景表）
  3. 保留旧笔记的鼓励语 ==每天写一个，加油!==（改为已完成状态）
  4. 按创建型/结构型/行为型分组列出链接列表
- [ ] 旧内容（单例、策略的旧代码）确认已分别吸收进 Task 1、2 后删除

### Task 16: 配置侧边栏菜单

**Files:**
- Modify: `docs/.vitepress/config.mjs:176-182`

- [ ] 将"设计模式"分组 items 替换为：

```js
{
  text: '设计模式',
  items: [
    { text: '概述', link: '/pages/designPattern/index.md' },
    { text: '单例模式', link: '/pages/designPattern/01-单例模式.md' },
    { text: '策略模式', link: '/pages/designPattern/02-策略模式.md' },
    { text: '代理模式', link: '/pages/designPattern/03-代理模式.md' },
    { text: '迭代器模式', link: '/pages/designPattern/04-迭代器模式.md' },
    { text: '发布订阅模式', link: '/pages/designPattern/05-发布订阅模式.md' },
    { text: '中介者模式', link: '/pages/designPattern/06-中介者模式.md' },
    { text: '状态模式', link: '/pages/designPattern/07-状态模式.md' },
    { text: '命令模式', link: '/pages/designPattern/08-命令模式.md' },
    { text: '组合模式', link: '/pages/designPattern/09-组合模式.md' },
    { text: '模板方法模式', link: '/pages/designPattern/10-模板方法模式.md' },
    { text: '享元模式', link: '/pages/designPattern/11-享元模式.md' },
    { text: '职责链模式', link: '/pages/designPattern/12-职责链模式.md' },
    { text: '装饰者模式', link: '/pages/designPattern/13-装饰者模式.md' },
    { text: '适配器模式', link: '/pages/designPattern/14-适配器模式.md' },
  ],
  collapsed: true,
},
```

### Task 17: 构建验证

- [ ] 运行 `rtk npm run docs:build`（先 `cat package.json` 确认脚本名，若不同则用实际命令）
- [ ] 预期：构建成功，无 dead link 报错
- [ ] 若有链接错误，修正文件名或菜单配置后重跑
- [ ] 最终 commit：`feat: 设计模式模块-14种模式文档与菜单配置`

---

## Self-Review 结论

- **Spec 覆盖**：14 种模式文档（Task 1-14）、index 重写（Task 15）、菜单（Task 16）、构建验证（Task 17）——spec 各节均有对应任务 ✅
- **占位符扫描**：各任务列出了具体实现内容与场景清单，无 TBD ✅
- **一致性**：文件名数字前缀与 config.mjs 链接一致（Task 16 中 15 条链接与 Task 1-15 的文件路径逐一核对无误）✅
