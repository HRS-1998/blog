# 示例模板页面

http://site.admin.ct108.org:1505/templateadmnew/index.html#/template-page

# 搜索模块

### 边距样式

```css
.mb16 {
  margin-bottom: 16px;
}
```

### 注意事项

- 默认使用 `dart-search2` 组件
- 输入框组件默认使用 `dart-input`，默认配置 `clearable`、`trim` 功能
- 下拉组件默认使用 `dart-select-v2`，默认配置 `clearable`、`filterable` 功能，建议下拉组件单独抽离

# 功能栏模块

### 边距样式

```css
.mb16 {
  margin-bottom: 16px;
}
```

### 注意事项

- 模块必须位于 `.dart-container `内部；
- 功能栏中操作按钮默认设置 `icon`；
- 左侧功能栏默认放置表格选中操作；右侧默认放置导出，新增操作

# 表格模块

### 注意事项

- 模块需位于 `.dart-container` 内部；
- 默认使用 `dart-table` 组件；
- 首页 `dart-table` 默认配置 `column-set` 功能；
- `dart-table` 默认配置 `highlight-current-row`、`show-overflow-tooltip`、`is-dynamic-height` 功能；
- `dart-table-column` 列，除表格选择列、操作列，其余列默认配置 `min-width` 功能；
- 操作栏默认固定在表格右侧；操作栏按钮：统一使用 `link` 样式按钮；默认名称，如：查看，编辑，删除，禁启用
- 删除/禁启用按钮：默认使用 `src components `中 `CommonBtn` 组件；统一添加 `loading`；默认开启二次确认功能，二次确认弹窗内容默认：确认删除/禁启用吗？；弹窗默认在左上方显示

# 新增/编辑模块

### 注意事项

- Dialog 默认使用 `dart-dailog` 组件；Drawer 默认使用 `dart-drawer` 组件
- Dialog、Drawer 默认都使用路由模式；
- 表单子标题，需添加类名样式 `.form-title`、`.flex-align-center`、`.mb16`；非首个子标题，需添加类名样式 `.form-title`、`.flex-align-center`、`.mb16`、`.mt16`
- 存在单行多个表单项场景下，需在当前多行表单容器层添加类名样式 `.multi-form-label`；
- `dart-dialog`、`dart-drawer` 默认配置 `v-model`、`title`、`loading`、`show-confirm-on-close`、`has-permission`
