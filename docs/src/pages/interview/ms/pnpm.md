# pnpm 深度解析：原理、Workspace 配置与 Monorepo 常见坑

> 📅 整理时间：2026-09-07
> 📦 适用版本：pnpm v9+

---

## 一、pnpm 硬链接 & 内容可寻址存储（CAS）原理

### 1.1 先理解 npm/yarn 的痛点

传统方式（npm / yarn classic）：

```text
projectA/node_modules/lodash/  ← 完整复制一份
projectB/node_modules/lodash/  ← 又完整复制一份
projectC/node_modules/lodash/  ← 再完整复制一份
```

- **磁盘浪费**：同一个包的同一版本，在每个项目里都有一份完整拷贝
- **安装慢**：大量文件 I/O 复制操作
- **幽灵依赖**：npm3+ 为了减少嵌套深度做了 hoist（提升），把子依赖拍平到顶层 node_modules，导致项目可以访问到 package.json 中并未声明的依赖

### 1.2 pnpm 的三层架构

pnpm 用一套完全不同的方案来解决这些问题：

```text
┌──────────────────────────────────────────────────────┐
│  第1层：全局 Content-Addressable Store（内容可寻址存储） │
│  位置：~/.local/share/pnpm/store/v3/                 │
│  特点：所有包的所有文件，按内容哈希值存储，全局只保留一份   │
└──────────────────────┬───────────────────────────────┘
                       │ 硬链接 (hard link)
┌──────────────────────▼───────────────────────────────┐
│  第2层：项目 node_modules/.pnpm/ （虚拟存储）           │
│  特点：扁平结构，所有直接+间接依赖都在这里               │
│  文件 → 硬链接指向全局 Store                           │
│  包与包之间 → 符号链接 (symlink) 建立依赖关系           │
└──────────────────────┬───────────────────────────────┘
                       │ 符号链接 (symlink)
┌──────────────────────▼───────────────────────────────┐
│  第3层：项目 node_modules/ 顶层（用户可见层）            │
│  特点：只有 package.json 中声明的直接依赖               │
│  通过 symlink 指向 .pnpm/ 中对应包的目录                │
└──────────────────────────────────────────────────────┘
```

### 1.3 内容可寻址存储（Content-Addressable Store）详解

核心思想：不用文件名做索引，而是用**文件内容的哈希值**做索引（类似 Git 的对象存储）。

全局 Store 目录结构示意：

```text
~/.local/share/pnpm/store/v3/
├── files/
│   ├── 00/
│   │   ├── 003da3849c1a3...  ← 某个 JS 文件的内容哈希
│   │   ├── 7fb291ab4e2...
│   ├── 01/
│   ├── ...
│   └── ff/
└── server/
    └── ...
```

工作流程：

1. pnpm 从 registry 下载包（例如 lodash@4.17.21）
2. 遍历包中的每个文件，计算内容的 SHA256 哈希
3. 以哈希值为文件名，存入全局 Store
4. 如果 Store 中已经存在相同哈希的文件 → 直接跳过，零开销

💡 举例：

```text
lodash/lodash.js     → hash: 003da384... → 存入 store/files/00/003da384...
lodash/package.json  → hash: 7fb291ab... → 存入 store/files/7f/7fb291ab...
```

关键优势：

- **全局去重**：不同包中相同的文件（比如 LICENSE 文件），哈希相同，只存一份
- **不可变**：文件一旦写入 Store，永远不会被修改（内容变了哈希就变了）
- **跨项目共享**：所有项目共用同一个 Store

### 1.4 硬链接（Hard Link）详解

硬链接是文件系统的特性——多个文件名指向同一个 inode（磁盘上的同一份数据）。

```text
全局 Store                              项目 .pnpm 目录
store/files/00/003da384...  ←──硬链接──→  .pnpm/lodash@4.17.21/node_modules/lodash/lodash.js
store/files/7f/7fb291ab...  ←──硬链接──→  .pnpm/lodash@4.17.21/node_modules/lodash/package.json
```

项目 A 和项目 B 的 `lodash/lodash.js` 都硬链接到 Store 的同一个 inode：

- 磁盘上只有一份数据，但有多个“入口”
- 不额外占用磁盘空间！

硬链接 vs 符号链接 的分工：

| 链接类型 | 用在哪里                        | 为什么                         |
| -------- | ------------------------------- | ------------------------------ |
| 硬链接   | Store →`.pnpm/` 中的文件        | 文件级共享，不可变，零额外空间 |
| 符号链接 | `.pnpm/` 内部包之间的依赖关系   | 需要目录级链接，且可以跨目录   |
| 符号链接 | `node_modules/` 顶层 → `.pnpm/` | 只暴露直接依赖，隔离间接依赖   |

### 1.5 完整的安装过程（以 `pnpm add express` 为例）

```text
pnpm add express
       │
       ▼
① 查询 registry，获取 express 及其所有依赖的版本和 tarball
       │
       ▼
② 下载 tarball 并解压
       │
       ▼
③ 对每个文件计算哈希 → 与全局 Store 对比
   ├─ 哈希已存在   → 跳过（不复制、不下载）
   └─ 哈希不存在 → 写入全局 Store
       │
       ▼
④ 在 node_modules/.pnpm/ 创建扁平目录结构
   .pnpm/
   ├── express@4.18.2/node_modules/express/     ← 文件都是硬链接到 Store
   ├── body-parser@1.20.1/node_modules/body-parser/
   ├── accepts@1.3.8/node_modules/accepts/
   └── ...
       │
       ▼
⑤ 在 .pnpm 内部建立包之间的依赖关系（符号链接）
   .pnpm/express@4.18.2/node_modules/body-parser
     → symlink → ../../body-parser@1.20.1/node_modules/body-parser
       │
       ▼
⑥ 在顶层 node_modules/ 创建符号链接（仅直接依赖）
   node_modules/express → symlink → .pnpm/express@4.18.2/node_modules/express
```

### 1.6 为什么能解决幽灵依赖？

npm 的扁平化结构（有幽灵依赖）：

```text
node_modules/
├── express/          ← 你在 package.json 中声明了
├── body-parser/      ← ❌ 你没声明，但 hoist 到了顶层，你也能 require！
├── accepts/          ← ❌ 同上
└── ...
```

pnpm 的非扁平结构（无幽灵依赖）：

```text
node_modules/
├── express → symlink → .pnpm/express@4.18.2/...   ← ✅ 你声明了，可以访问
node_modules/.pnpm/
├── express@4.18.2/node_modules/
│   ├── express/
│   └── body-parser → symlink  ← body-parser 只对 express 可见
└── body-parser@1.20.1/node_modules/body-parser/
```

在 pnpm 中，body-parser 是 express 的子依赖，只存在于 `.pnpm/express@.../node_modules/` 下，顶层 `node_modules/` 里没有它。所以你的代码 `require('body-parser')` 会报错 → 强制你在 package.json 中显式声明所有使用的依赖。

---

## 二、pnpm-workspace.yaml & Catalog 统一版本管控

### 2.1 pnpm-workspace.yaml 基础

这是 monorepo 的核心配置文件，位于仓库根目录：

```yaml
# pnpm-workspace.yaml

# 定义哪些目录是 workspace 的子包
packages:
  - 'packages/*' # packages/ 下的每个子目录都是一个包
  - 'apps/*' # apps/ 下的每个子目录也是一个包
  - 'tools/*' # 可以有多组
  - '!**/test/**' # 排除某些目录（! 表示排除）
```

项目结构示例：

```text
my-monorepo/
├── package.json              ← 根 package.json（scripts、devDependencies）
├── pnpm-workspace.yaml       ← 声明 workspace 子包
├── pnpm-lock.yaml            ← 全局唯一的 lockfile
├── .npmrc                    ← pnpm 配置
├── packages/
│   ├── ui/                   ← 子包 @my/ui
│   │   └── package.json
│   ├── utils/                ← 子包 @my/utils
│   │   └── package.json
│   └── config/               ← 子包 @my/config
│       └── package.json
└── apps/
    ├── web/                  ← 应用 web
    │   └── package.json
    └── admin/                ← 应用 admin
        └── package.json
```

### 2.2 Catalog 协议——统一版本管控

> ⚠️ Catalog 是 pnpm v9+ 引入的特性，用于在 monorepo 中集中管理第三方依赖的版本号。

#### 问题场景

没有 Catalog 时，每个子包各自声明版本：

```jsonc
// packages/ui/package.json
{ "dependencies": { "react": "^18.2.0", "axios": "^1.6.0" } }

// apps/web/package.json
{ "dependencies": { "react": "^18.3.0", "axios": "^1.5.0" } }  // ← 版本不一致！

// apps/admin/package.json
{ "dependencies": { "react": "^17.0.2", "axios": "^1.6.0" } }  // ← 更大的差异！
```

#### Catalog 解决方案

**第一步：在 pnpm-workspace.yaml 中集中声明版本**

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'

# 默认 catalog（所有子包共享）
catalog:
  react: ^18.3.0
  react-dom: ^18.3.0
  axios: ^1.7.0
  typescript: ^5.5.0
  vite: ^5.4.0

# 命名 catalog（用于需要不同版本的场景）
catalogs:
  react17:
    react: ^17.0.2
    react-dom: ^17.0.2
  legacy:
    axios: ^0.27.0
```

**第二步：子包中使用 `catalog:` 协议引用**

```jsonc
// packages/ui/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "axios": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}

// apps/web/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "axios": "catalog:"
  }
}

// apps/admin/package.json — 使用命名 catalog 引用旧版本
{
  "dependencies": {
    "react": "catalog:react17",
    "react-dom": "catalog:react17",
    "axios": "catalog:legacy"
  }
}
```

**Catalog 解析流程**

```text
子包 package.json 中写 "react": "catalog:"
         │
         ▼
pnpm 解析时看到 "catalog:" 前缀
         │
         ▼
去 pnpm-workspace.yaml 的 catalog 表中查找 "react"
         │
         ▼
找到 react: ^18.3.0 → 展开为 "^18.3.0"
         │
         ▼
后续安装流程与普通依赖完全一致
```

### 2.3 Catalog vs workspace 协议对比

| 特性     | `catalog:`                          | `workspace:`                       |
| -------- | ----------------------------------- | ---------------------------------- |
| 用途     | 统一管理第三方依赖版本              | 引用 monorepo 内部子包             |
| 声明位置 | pnpm-workspace.yaml 的 catalog 字段 | 子包的 package.json 中的 name 字段 |
| 示例     | `"react": "catalog:"`               | `"@my/utils": "workspace:*"`       |
| 发布时   | 自动替换为实际版本号（如 ^18.3.0）  | 自动替换为实际版本号（如 1.2.0）   |

### 2.4 常见完整配置示例

```yaml
# pnpm-workspace.yaml — 生产级配置

packages:
  - 'packages/*'
  - 'apps/*'
  - 'tools/*'

# 默认 catalog：绝大多数子包统一使用
catalog:
  # 框架
  react: ^18.3.0
  react-dom: ^18.3.0
  vue: ^3.4.0

  # 工具库
  axios: ^1.7.0
  lodash-es: ^4.17.21
  dayjs: ^1.11.0

  # 类型
  '@types/react': ^18.3.0
  '@types/react-dom': ^18.3.0
  '@types/lodash-es': ^4.17.12

  # 开发工具
  typescript: ^5.5.0
  vite: ^5.4.0
  vitest: ^2.0.0
  eslint: ^9.0.0
  prettier: ^3.3.0

# 命名 catalog：特殊场景
catalogs:
  react17:
    react: ^17.0.2
    react-dom: ^17.0.2

# pnpm 自身行为配置（v9+ 也放在这里）
onlyBuiltDependencies:
  - esbuild
  - sharp
```

```ini
# .npmrc — 包管理器行为配置
shamefully-hoist=false          # 不做提升（pnpm 默认行为）
strict-rpeer-dependencies=true   # 严格检查 peerDependencies
auto-install-peers=true         # 自动安装缺失的 peerDependencies
prefer-workspace-packages=true  # 优先使用 workspace 内的包
link-workspace-packages=true    # 自动链接 workspace 内的包
```

### 2.5 子包间互相引用

```jsonc
// apps/web/package.json
{
  "name": "@my/web",
  "dependencies": {
    "@my/ui": "workspace:*",
    "@my/utils": "workspace:*",
    "react": "catalog:",
    "axios": "catalog:",
  },
}
```

`workspace:*` 表示引用同仓库中 `@my/ui` 包的任意版本（pnpm 会自动识别并建立本地链接）。

---

## 三、Monorepo 常见坑详解

### 3.1 幽灵依赖（Phantom Dependency）

#### 什么是幽灵依赖？

```text
你的 package.json 只声明了依赖 A：
{ "dependencies": { "express": "^4.18.0" } }

但你的代码里写了：
const lodash = require('lodash');  // ❌ 你没声明 lodash，但它能用！
```

这是因为 npm/yarn 的 **hoist（提升）机制**：express 依赖了 lodash，npm 把 lodash 提升到了顶层 `node_modules/`，你的代码碰巧也能访问到它。

#### 为什么危险？

- **场景1**：某天 express 升级后不再依赖 lodash → 你的代码突然崩溃，但你从未意识到自己用了 lodash
- **场景2**：在不同机器/CI 上安装 → hoist 的结果可能不同，“在我机器上能跑”的经典问题
- **场景3**：打包工具 tree-shaking → 幽灵依赖不在 package.json 中，构建工具可能不会正确处理

#### pnpm 如何解决？

pnpm 默认不做 hoist，`node_modules/` 顶层只有你显式声明的依赖：

```text
node_modules/
├── express → .pnpm/express@4.18.2/...   ← ✅ 你声明了
└── (没有 lodash！)                       ← ✅ 你没声明，就访问不到
```

如果你尝试 `require('lodash')`，Node.js 的模块解析会报错，强制你修复依赖声明。

#### 特殊情况：shamefully-hoist

某些老旧工具/包依赖 hoist 行为才能正常工作，pnpm 提供了逃生舱：

```ini
# .npmrc
shamefully-hoist=true  # 退化为类似 npm 的扁平结构（不推荐）

# 或者只提升特定的包
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*typescript*
```

### 3.2 peerDependency 问题

#### 什么是 peerDependency？

```jsonc
// @mui/material 的 package.json
{
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0",
    "react-dom": "^17.0.0 || ^18.0.0",
  },
}
```

含义：@mui/material 说“我需要 react 作为宿主环境，请你（使用者）来安装它”。

#### 坑1：peerDependency 未安装

```text
apps/web 安装了 @mui/material，但忘了装 react
→ npm 只是给个 warning，安装继续
→ 运行时 react 找不到 → 崩溃
```

pnpm 的处理（v8+ 默认行为变化）：

```ini
# .npmrc

# 推荐：自动安装缺失的 peerDependencies
auto-install-peers=true

# 严格模式：peerDependency 版本不匹配时报错（而非仅 warning）
strict-peer-dependencies=true
```

#### 坑2：peerDependency 版本冲突

```text
packages/ui 依赖 react@^18.0.0
packages/legacy-ui 的 peerDependencies 要求 react@^17.0.0
apps/web 同时引用了这两个包
→ 版本冲突！
```

解决方案：

```yaml
# pnpm-workspace.yaml
catalogs:
  react18:
    react: ^18.3.0
  react17:
    react: ^17.0.2
```

```jsonc
// packages/ui/package.json
{ "peerDependencies": { "react": "catalog:react18" } }

// packages/legacy-ui/package.json
{ "peerDependencies": { "react": "catalog:react17" } }
```

#### 坑3：peerDependency 在 workspace 子包之间的传递

```text
@my/ui peerDepends on react
@my/web depends on @my/ui (workspace:*) and react

→ pnpm 需要正确识别 @my/web 中的 react 满足 @my/ui 的 peerDependency
→ 确保 auto-install-peers=true 且 link-workspace-packages=true
```

### 3.3 循环依赖（Circular Dependency）

#### 类型一：包之间的循环依赖

```text
@my/utils 依赖 @my/config
@my/config 依赖 @my/utils
→ pnpm install 时可能报错或产生不可预期的行为
```

检测方式：

```bash
# 使用 madge 工具检测
npx madge --circular packages/*/src/**/*.{ts,js}

# 或者使用 pnpm 自身的 list
pnpm ls --depth Infinity 2>&1 | grep -i circular
```

解决方案：

- **方案1：抽取公共层** — 重构为：`@my/utils → @my/shared`，`@my/config → @my/shared`（把公共部分抽到 @my/shared）
- **方案2：单向依赖 + 接口注入** — `@my/config` 不再直接依赖 `@my/utils`，而是通过接口/回调让使用者注入

#### 类型二：模块级别的循环依赖（更隐蔽）

```typescript
// packages/ui/src/Button.tsx
import { theme } from './theme'; // ← Button 引用 theme

// packages/ui/src/theme.ts
import { Button } from './Button'; // ← theme 又引用 Button
```

这种在同一包内的模块循环引用，构建工具不一定报错，但运行时行为可能不可预期（模块初始化时拿到的是 undefined）。

解决方案：

- 使用 barrel exports（index.ts）时特别注意导出顺序
- 使用 ESLint 插件检测：eslint-plugin-import 的 `no-cycle` 规则
- 使用 madge 可视化依赖图

```jsonc
// .eslintrc
{
  "rules": {
    "import/no-cycle": "error",
  },
}
```

#### 类型三：devDependencies 引起的循环

```text
@my/web devDepends on @my/eslint-config (workspace:*)
@my/eslint-config devDepends on @my/web 的一些类型 (workspace:*)
→ 循环！
```

解决：打破 devDependencies 的循环，通常把共享类型抽到独立的 `@my/types` 包中。

### 3.4 其他常见坑速查表

| 坑                       | 现象                              | 解决方案                                                               |
| ------------------------ | --------------------------------- | ---------------------------------------------------------------------- |
| CI 安装失败              | pnpm install 在 CI 中报错         | 使用`pnpm install --frozen-lockfile`，确保 lockfile 存在               |
| 子包发布版本错误         | `workspace:*` 在发布时没被替换    | pnpm publish 会自动替换，但确保用`pnpm publish` 而非 `npm publish`     |
| TypeScript 跨包跳转失败  | VSCode 中 import 无法跳转到定义   | 根 tsconfig.json 配置 references，子包开启`composite: true`            |
| 热更新失效               | 修改 packages/ui 代码，app 不刷新 | Vite 需配置`server.watch.followSymlinks` 或使用 `optimizeDeps.include` |
| Postinstall 脚本重复执行 | 多个子包的 postinstall 冲突       | 使用 pnpm 的`onlyBuiltDependencies` 白名单控制                         |
| 磁盘空间异常             | `.pnpm` 目录过大                  | 正常现象，全局 Store 已经去重；可用`pnpm store prune` 清理无用文件     |

---

## 总结速记

```text
pnpm 核心原理：
  全局 CAS Store（内容哈希去重）
    → 硬链接到 .pnpm/（零空间开销）
      → 符号链接到 node_modules/（严格隔离）

Catalog 核心思想：
  pnpm-workspace.yaml 集中声明版本
    → 子包用 "catalog:" 引用
      → 一处升级，全局生效

Monorepo 三大坑：
  幽灵依赖 → pnpm 默认解决，别开 shamefully-hoist
  peerDependency → auto-install-peers + strict-peer-dependencies
  循环依赖 → 抽公共包 + ESLint no-cycle + madge 检测
```
