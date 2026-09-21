# Admin-New B 端 前端开发指南

> 面向需要进行全栈开发的服务端同学。
> 服务端准备好 ** API 和业务规则**，通过 Admin-New 提供的 Command + Skill，快速生成符合团队规范的后台前端页面。

## 1. 先理解两个概念

本仓库将自动化能力分为两层：

| 层级    | 位置                                        | 作用                                       | 谁来调用                   |
| ------- | ------------------------------------------- | ------------------------------------------ | -------------------------- |
| Command | [`.claude/commands/`](../.claude/commands/) | 组织一整段开发流程                         | 服务端同学直接输入 `/fd-*` |
| Skill   | [`.claude/skills/`](../.claude/skills/)     | 定义 API、页面、组件、权限、埋点和校验规范 | Command 内部按需调用       |

日常新页面开发应该从 `/fd-prd` 开始，不要自己依次调用几十个 `ct-*` skill。

## 2. 一条完整的开发链路

```text
准备 doc/api.md（必选）和 doc/img/（可选）
        ↓
/fd-prd       生成 doc/prd.md，标出缺失信息
        ↓
人工审查并补齐 PRD
        ↓
/fd-propose   创建隔离工作区，生成 OpenSpec 设计与任务
        ↓
人工审查 proposal / spec / design / tasks
        ↓
/fd-apply     实现、校验、审查并完成分支收尾
        ↓
/fd-archive   归档已完成的 OpenSpec 变更
```

最小可复制操作：

```text
/fd-prd
/fd-propose
/fd-apply 执行 openspec/changes/ 下最新变更的任务列表
/fd-archive
```

> 这不是一次性无人值守脚本。PRD 缺失、多页面拆分、开始实现、合并和归档等节点会等待人工确认。

> 按当前 [`fd-apply.md`](../.claude/commands/fd-apply.md) 定义，`/fd-apply` 已包含代码审查、`ct-validate` 和分支收尾。只有 `/fd-apply` 在收尾前中断，或者本次是手工/L1 开发时，才需要单独执行 `/fd-finish`。

## 3. 开始前的环境检查

### 3.1 安装项目依赖

```bash
npm install
```

### 3.2 确认 Superpowers 插件已启用

```js
// 在 Claude Code 输入框里执行，不是在 Terminal
/plugin install superpowers@claude-plugins-official
```

```bash
claude plugins list
```

输出中应包含并启用：

```text
superpowers@superpowers-marketplace
```

`fd-prd`、`fd-propose`、`fd-apply` 和 `fd-finish` 都会执行这项检查。如果未安装或未启用，命令应停止，不应跳过检查继续生成代码。

### 3.3 确认 Git 工作区可用

`/fd-propose` 会为 L2/L3 变更创建独立 worktree。执行前请确保：

- 当前项目是 Git 仓库。
- 现有未提交修改已明确用途，不要误带入新页面。

## 4. 服务端需要准备什么

### 4.1 必选：`doc/api.md` （推荐从 yapi 直接导出 api.md ）

API 文档是前端生成的事实来源。接口 path、method、参数名和大小写必须与实际服务端保持一致。

每个接口至少需要：

| 项目     | 要求                                             |
| -------- | ------------------------------------------------ |
| 接口名称 | 说明它是列表、详情、新增、编辑、状态修改还是导出 |
| Path     | 完整路径，大小写不得省略                         |
| Method   | GET / POST 等                                    |
| 请求位置 | Query、Path 或 JSON Body                         |
| 请求字段 | 字段名、类型、必填、默认值、枚举、最大长度和说明 |
| 返回字段 | 完整层级、类型、可空性、枚举以及时间单位         |
| 业务规则 | 字段联动、状态迁移、重复提交和并发冲突规则       |
| 错误码   | 错误码、显示给用户的 message 及触发条件          |
| 权限     | 页面权限和按钮权限的名称与数字 ID                |

推荐的单接口 Markdown 写法：

````markdown
## 分页查询活动

- Path: `/api/activity/page`
- Method: `POST`
- Permission: `activityView (10001)`
- Content-Type: `application/json`

### Body

| 字段         | 类型   | 必填 | 说明                   |
| ------------ | ------ | ---- | ---------------------- |
| ActivityName | string | 否   | 模糊搜索，最长 50 字符 |
| Status       | number | 否   | `0` 禁用，`1` 启用     |
| PageIndex    | number | 是   | 从 1 开始              |
| PageSize     | number | 是   | 10 / 20 / 50 / 100     |

```json
{
  "ActivityName": "新用户",
  "Status": 1,
  "PageIndex": 1,
  "PageSize": 20
}
```

### Response Data

| 字段               | 类型           | 可空 | 说明            |
| ------------------ | -------------- | ---- | --------------- |
| List               | ActivityItem[] | 否   | 当前页数据      |
| Total              | number         | 否   | 总条数          |
| List[].ActivityId  | number         | 否   | 活动 ID         |
| List[].CreatedTime | number         | 否   | Unix 毫秒时间戳 |

```json
{
  "Code": 0,
  "Message": "success",
  "Data": {
    "List": [],
    "Total": 0
  }
}
```

### Error Codes

| Code  | Message  | 触发条件         |
| ----- | -------- | ---------------- |
| 10002 | 参数错误 | 分页或枚举值非法 |
| 50000 | 系统异常 | 未预期服务端错误 |
````

### 4.2 必选：权限枚举

`/fd-prd` 会从 `/api/common/getpower` 相关文档中提取权限。每个页面至少明确：

- `pageId`：菜单或页面 ID。
- 查看权限：决定能否进入页面。
- 编辑权限：新增、编辑、保存等操作。
- 独立动作权限：例如启用、禁用、删除、导出。

不要只写“有权限时显示”，必须给出稳定的权限别名和数字 ID。

### 4.3 必选：页面业务规则

API 只能推导出数据结构，无法可靠推导交互。请明确：

- 列表的搜索条件、默认值、排序和分页。
- 表格列、展示顺序、状态文案和操作按钮。
- 新增/编辑字段、必填项、最大长度和联动逻辑。
- 详情展示字段及分组。
- 成功后关闭方式、列表刷新到当前页还是第一页。
- 删除、启禁用、批量操作的二次确认文案。

### 4.4 可选：`doc/img/`

可将 UI 截图放入 `doc/img/`。截图用于理解布局与展示顺序，不能替代 API 契约和业务规则。

## 5. 如何选择 L1 / L2 / L3

| 级别    | 适用场景                         | 使用流程                                         |
| ------- | -------------------------------- | ------------------------------------------------ |
| L1 微调 | 仅修改已有代码，不新增组件或页面 | 直接修改 → `/ct-validate` → 验证 → 提交          |
| L2 组件 | 新增或重写单个组件、API 层或弹层 | `/fd-propose` → `/fd-apply` 的 L2 流程           |
| L3 页面 | 新增完整页面或多组件联动重构     | `/fd-prd` → `/fd-propose` → `/fd-apply` 完整流程 |

判断原则：新页面是 L3；新组件是 L2；只改已有代码是 L1；不确定时选更高级别。

## 6. Command 使用说明

### 6.1 `/fd-prd`：把 API 转换为可开发的 PRD

详细定义：[`fd-prd.md`](../.claude/commands/fd-prd.md)

**输入**

- `doc/api.md`，必选。
- `doc/img/`，可选。

**内部关键 skill**

1. `brainstorming`：识别页面和需要人工确认的交互问题。
2. [`ct-prd`](../.claude/skills/ct-prd/skill.md)：生成标准 PRD，并逐页标注缺失内容。

**产物**

- `doc/prd.md`。

**必须人工审查**

- 页面类型是否正确。
- 权限别名和数字 ID 是否正确。
- “⚠️ 缺少内容”是否已补齐。
- 状态枚举、字段最大长度、详情回填和状态修改接口是否明确。

### 6.2 `/fd-propose`：产生可审查的 OpenSpec 变更

详细定义：[`fd-propose.md`](../.claude/commands/fd-propose.md)

**输入**

- `doc/prd.md`，必选。
- `doc/api.md`，可选但强烈建议保留，用于核对 API 大小写。

**内部关键 skill / 规则**

1. `using-git-worktrees`：为 L2/L3 变更创建隔离工作区。
2. OpenSpec schema 与 templates：依次生成 proposal → specs → design → review/tasks。
3. `ct-analyzer`：为 L3 设计生成页面结构、组件清单、数据结构和 API 定义。

**产物**

```text
openspec/changes/<change-name>/
├── proposal.md
├── specs/<capability>/spec.md
├── design.md
├── review.md        # L3
└── tasks.md
```

**必须人工审查**

- proposal 的范围是否只包含当前需求。
- design 的页面布局、组件拆分和弹层方式是否符合预期。
- API 字段、大小写、请求方式和时间单位是否与服务端一致。
- tasks 是否包含 API、类型、路由、权限、埋点和校验。

### 6.3 `/fd-apply`：执行设计与任务

详细定义：[`fd-apply.md`](../.claude/commands/fd-apply.md)

**输入**

- `openspec/changes/` 下的最新变更。

**内部关键 skill**

1. [`ct-gatekeeper`](../.claude/skills/ct-gatekeeper/skill.md)：判断 L2/L3 并为任务选择对应 skill。
2. L3 时使用 `subagent-driven-development` 组织任务，任务实现遵循 `test-driven-development`。
3. 项目 skill 生成具体代码：
   - 页面：`ct-main-page`、`ct-child-page`、`ct-sub-component-page`、`ct-flex`。
   - 组件：`ct-search`、`ct-tool`、`ct-table`、`ct-add`、`ct-view`。
   - 基础能力：`ct-api`、`ct-ajax`、`ct-route`、`ct-permission`、`ct-hooks`、`ct-config`、`ct-utils`、`ct-dart3`。
   - 必选横切能力：`ct-datalinke`。
4. [`ct-validate`](../.claude/skills/ct-validate/skill.md)：实现完成后进行项目规范校验。
5. `receiving-code-review` 与 `verification-before-completion`：审查并依据实际命令输出确认结果。

**产物**

- Vue 页面与组件。
- API 请求函数和 TypeScript 类型。
- 路由、权限和必要配置。
- Datalinke 埋点。
- 已更新的 `tasks.md` 完成状态。

**执行前会停下确认**

```text
找到最新变更：xxx-YYYYMMDD-NNN
变更级别：L2 组件 / L3 页面
是否开始执行？
```

### 6.4 `/fd-finish`：单独完成分支收尾

详细定义：[`fd-finish.md`](../.claude/commands/fd-finish.md)

完整 `/fd-apply` 流程已包含分支收尾，无需重复执行。以下情况才使用 `/fd-finish`：

- `/fd-apply` 已完成代码，但在代码审查或分支收尾前中断。
- L1 或手工开发已完成，需要复用标准审查和合并流程。

该命令会检查分支状态、确认 `ct-validate` 已通过、执行代码审查并提交。合并前必须由用户选择：

- 合并到主分支并清理 worktree。
- 仅提交，保留分支。
- 取消，不执行合并。

### 6.5 `/fd-archive`：归档 OpenSpec 变更

详细定义：[`fd-archive.md`](../.claude/commands/fd-archive.md)

仅在任务已完成、代码已验证且分支处理方式已确定后执行。它会：

1. 将变更规格合并到 `openspec/specs/`。
2. 将变更移到 `openspec/changes/archive/`。
3. 清理不再需要的临时文件。

## 7. 关键 Skill 调用图

| 阶段 | 关键 Skill                                                | 负责内容                                 | 是否建议手动调用          |
| ---- | --------------------------------------------------------- | ---------------------------------------- | ------------------------- |
| 需求 | `brainstorming`                                           | 识别页面、澄清交互和范围                 | 否，由 `/fd-prd` 调用     |
| PRD  | `ct-prd`                                                  | 生成 PRD 并检查缺失项                    | 否，由 `/fd-prd` 调用     |
| 隔离 | `using-git-worktrees`                                     | 为 L2/L3 创建 worktree                   | 否，由 `/fd-propose` 调用 |
| 设计 | `ct-analyzer`                                             | 生成 L3 前端结构与 API 设计              | 否，由 `/fd-propose` 调用 |
| 守门 | `ct-gatekeeper`                                           | 判断任务类型并映射项目 skill             | 否，由 `/fd-apply` 调用   |
| API  | `ct-api` + `ct-ajax`                                      | 生成 path、请求函数和类型                | 仅 L1 手工开发时按需调用  |
| 页面 | `ct-main-page` / `ct-child-page` / `ct-flex`              | 生成页面骨架                             | 通常由 `/fd-apply` 调用   |
| 弹层 | `ct-sub-component-page` + `ct-add` / `ct-view`            | 生成子路由弹层和表单/详情                | 通常由 `/fd-apply` 调用   |
| 列表 | `ct-search` + `ct-tool` + `ct-table`                      | 生成标准列表页区块                       | 通常由 `/fd-apply` 调用   |
| 权限 | `ct-route` + `ct-permission`                              | 路由和按钮权限                           | 通常由 `/fd-apply` 调用   |
| 埋点 | [`ct-datalinke`](../.claude/skills/ct-datalinke/SKILL.md) | 搜索、保存、状态变更、批量操作等事件     | 否，所有页面必选          |
| 校验 | `ct-validate`                                             | 目录、大小写、类型、组件、权限和埋点校验 | 是，完成前必须调用        |
| 验证 | `verification-before-completion`                          | 根据实际命令输出确认结果                 | 由开发流程调用            |

完整映射表见 [`.claude/superpowers-skill-mapping.md`](../.claude/superpowers-skill-mapping.md)。

## 8. 关键项目规则

### 8.1 API 字段大小写

项目启用 `lowercasekey: true`：

- 响应第一层使用小写：`res.code`、`res.data`、`res.message`。
- `data` 内部字段保持 API 文档中的原始大小写：`List`、`PageIndex`、`ActivityId`。
- 接口 path 必须与 `doc/api.md` 完全一致。
- 搜索条件类型不包含分页字段，分页由 `useRefreshTable` 注入。

### 8.2 页面类型

| 类型       | 判断方式                                     | 主要 Skill              |
| ---------- | -------------------------------------------- | ----------------------- |
| 一级页面   | 标准的搜索 + 工具栏 + 表格                   | `ct-main-page`          |
| 二级页面   | 子页面中还有 table，table 内可继续打开子页面 | `ct-child-page`         |
| 子页面     | 通过子路由打开的 Drawer / Dialog             | `ct-sub-component-page` |
| 非标准页面 | 不符合标准列表结构                           | `ct-flex`               |

### 8.3 埋点

每个页面都必须遵循 `ct-datalinke`：

- `menuId` 从权限配置中读取，不得硬编码数字。
- 搜索、保存、导出、删除、启禁用和批量操作使用已有封装函数。
- 只在业务接口成功后上报成功事件。

### 8.4 交互与安全性

- 保存按钮必须有 Loading 或同等的防重复提交机制。
- 删除、启禁用和批量操作必须二次确认。
- 权限不能只在前端隐藏按钮，服务端仍必须校验接口权限。
- 列表页返回时是否保留搜索和分页，应在 PRD 中明确。

## 9. 分阶段验收清单

### 9.1 `/fd-prd` 后

- [ ] `doc/prd.md` 已生成。
- [ ] 每个页面都有页面路径、类型和权限。
- [ ] 每个 string 输入字段都有最大长度。
- [ ] 状态枚举和默认值已确认。
- [ ] 新增、编辑、详情、状态修改所需接口已齐全。
- [ ] 每个“⚠️ 缺少内容”都已补齐或明确暂不实现。

### 9.2 `/fd-propose` 后

- [ ] 变更名称和页面范围正确。
- [ ] `proposal.md`、`spec.md`、`design.md` 和 `tasks.md` 已生成。
- [ ] L3 变更包含 `review.md`。
- [ ] design 中的组件清单、数据结构和 API 定义正确。
- [ ] tasks 包含权限、埋点和校验任务。

### 9.3 `/fd-apply` 后

- [ ] `tasks.md` 的所有任务已完成。
- [ ] `/ct-validate` 已通过。
- [ ] `npm run type-check` 已通过。
- [ ] `npm run build` 已通过。
- [ ] 已测试查询、重置、分页、新增、编辑、详情、状态变更和权限控制。
- [ ] 接口失败、空数据、缺少可选字段时页面表现正常。
- [ ] 埋点事件、`menuId` 和上报时机正确。

### 9.4 交付前

- [ ] 代码审查已通过。
- [ ] 分支的提交和合并方式已由用户确认。
- [ ] OpenSpec 变更在代码完成后才归档。

## 10. 常见问题

### Q1：只有列表接口，没有分页接口怎么办？

`/fd-prd` 会询问是否使用前端分页。默认可按一级页面处理，但数据量可能较大时应由服务端提供分页接口。

### Q2：编辑时没有详情接口怎么办？

只有列表行包含编辑所需的全部字段时，才能直接用列表数据回填。否则需要服务端增加详情接口。

### Q3：有启用/禁用按钮，但没有状态修改接口怎么办？

优先增加独立状态接口。如果复用编辑接口，必须明确它是否支持只传 `{ Id, Status }`；如果必须传全字段，还必须保证能获得完整详情。

### Q4：`/fd-propose` 识别到多个页面怎么选？

- 页面相互独立、可分别上线：拆分为多个 worktree 和 OpenSpec 变更。
- 页面共享同一套数据与交互、必须一起上线：合并开发。

### Q5：能不能跳过 `/fd-prd` 直接生成页面？

L1 微调可以跳过。新建完整页面不建议跳过：API 文档不包含的交互、权限和校验规则会被猜测，容易造成返工。

### Q6：`ct-validate` 通过是否等于功能正常？

不等于。`ct-validate` 主要检查项目结构和规范；还需要运行类型检查、构建和关键交互测试。

## 11. Demo 学习与回收

如果想先看一次完整流程，可使用 Demo 命令。

### 生成 Demo

```text
/fd-demo
```

详细定义：[`fd-demo.md`](../.claude/commands/fd-demo.md)

输入为 `doc/demo/prd.md` 和 `doc/demo/api.md`。命令会执行 `fd-propose → fd-apply → ct-validate`，并生成 `doc/demo/manifest.md` 记录全部新增文件和公共文件增量。

### 移除 Demo

```text
/fd-demo-remove demo-activity
```

详细定义：[`fd-demo-remove.md`](../.claude/commands/fd-demo-remove.md)

移除命令只依据 `doc/demo/manifest.md` 删除 Demo 文件和带有 `[demo]` 标记的公共文件增量，然后执行残留扫描和 `ct-validate`。执行前必须审查删除计划。

## 12. 相关文档

- 项目总规范：[`CLAUDE.md`](../CLAUDE.md)
- Skill 映射：[`.claude/superpowers-skill-mapping.md`](../.claude/superpowers-skill-mapping.md)
- PRD 示例：[`doc/demo/prd.md`](../doc/demo/prd.md)
- API 示例：[`doc/demo/api.md`](../doc/demo/api.md)
- OpenSpec 示例：[`openspec/changes/demo-activity-20260826-001/`](../openspec/changes/demo-activity-20260826-001/)
- Demo 生成清单：[`doc/demo/manifest.md`](../doc/demo/manifest.md)
