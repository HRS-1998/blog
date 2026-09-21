[TOC]

## 搜索

#### 越界型错误的默认标准

比如 (int 类型最大值为21亿) 给10位长度会超长的问题 统一解决思路 后台返回因为类型输入不合法的错误 统一当做找不到数据的方式处理 不进行特殊提示

#### 文本输入框

- 默认不限制输入内容和长度；默认开启删除功能；默认空白填充内容为空；根据特殊要求限制及校验

![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=288f2254a15b7acb95d6061793dd2dbd)

#### 下拉选择框

- 默认开启删除，模糊搜索功能（数据量超出20）；默认空白填充内容为请选择；根据特殊要求限制可选内容及校验；
- 下拉数据量过大，默认开启虚拟下拉功能，减少渲染时间；根据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=36b6f031e65df6fa3dc1db77845ccb73)

#### 时间选择框

- 默认当天时间，00:00:00 - 23:59:59；默认开启删除功能；根据特殊要求限制可选日期及校验；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=87895635c89012f916f8f1bade93d08e)

#### 搜索项

- 统一交互清空当项，表示查询全部；

#### 查询按钮

- 默认添加 loading；统一 primary 配色；

#### 搜索背景

- 统一 #f7f7f7 配色；

#### 布局排列

- 统一每个搜索项占据一列，一行最多3列；

##### 搜索项少于等于两个

- 查询按钮默认跟在搜索项后
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=efd7d72f169be427dc9b779f152491ad)

##### 搜索项大于两个

- 查询按钮默认固定在搜索右侧
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=27c0d9ab32536e1c91659056a0b01dc9)

##### 搜索项过多

- 根据要求固定搜索栏高度，开启搜索项折叠功能，点击下方箭头打开全部搜索项
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=22bee55714df6845f55978c08ccdca09)
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=df1ee857a0fba658803db99c9a311ff3)

## 功能栏

- 功能栏位置统一固定在搜索栏及表格中间位置；
- 功能按钮默认固定在功能栏右侧，根据特殊要求放在左侧；
- 功能按钮默认没有二次提醒功能，根据特殊要求添加；
- 功能按钮默认名称，如：新增，导出，导入；默认 icon ；根据特殊要求修改；
- 功能按钮统一朴素按钮样式；

![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=768977112c40d500d5b96cc4fc287d03)

## 表格

#### 默认功能

- 表格默认开启分页，总数，跳转，切换页数功能；根据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=f1aa6f6676e3302081c4715cdd2e7c35)

- 表格确定内容项，固定宽度；不确定内容项，设置最小宽度；
- 表格无数据，默认显示：暂无数据；根据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=83a20638462ce8bb470191962dd6788b)

#### tooltip

- 表格尽可能保证单条数据单行显示，存在部分列内容超长，开启 tooltip 缩略显示功能，默认在该条数据上方显示，默认样式 dark；根据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=ce59832f32b8a04adbaa10927b979d2d)

#### 状态列

- 统一使用 tag 样式，绿色表示启用，红色表示禁用,关闭tag动画效果；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=4eba1b52f95d21ddef9b1dcc33763599)

#### 时间列

- 默认时间格式化：yyyy-MM-DD hh:mm:ss，根据特殊要求修改;

#### 操作栏

- 统一在表格右侧；默认开启固定栏功能；根据特殊要求取消；
- 操作栏按钮：统一使用 link 样式按钮；默认名称，如：查看，编辑，删除，禁启用；默认icon，若操作按钮无具体icon，则纯文本展示；根据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=151de9edba549cb31fdd0ef930b80128)
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=982ca8b7f4bde74ea57e9a5e768d0541)
- 删除/禁启用按钮：统一添加 loading；默认开启二次确认功能，二次确认弹窗内容默认：确认删除/禁启用吗？；根据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=3c2db8e3427995311347c7392d0a3eaf)

## 表单

#### 容器类型

- 表单项数量较多，交互复杂，默认 抽屉 类型；表单项数量少，交互简单，默认 弹窗 类型；根据特殊要求修改；
- 表单标题默认显示在左上；默认名称，如：新增，编辑，查看；根据特殊要求修改；

#### 交互

- 获取详情，默认出现全屏loading；点击确定按钮提交时，默认只在提交按钮上添加loding；按钮默认在表单左侧位置；根据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=eba34f81762d87db07e47cca9db37f5d)
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=489ac06905bcd286edaafa1dce1de674)

#### 表单项

- 表单校验未通过时，统一在当前表单项下方出现红色提示，同时顶部显示内容为：请检查输入项 的toast；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=1eae48fb2bfe692ad5fdbd8be0896937)

- 表单项必填，title 左侧默认添加红色必填样式；根据特殊要求修改；
- 表单项长度默认撑满容器；根据特殊要求修改；

#### 文本输入框

- 默认开启删除功能；统一使用show-word-limit；提示内容只显示重要提示；【必须确认】限制内容及校验；

#### 下拉选择框

- 默认开启删除,模糊搜索功能（数据量超出20）；默认空白填充内容为请选择；根据特殊要求限制内容可选内容及校验；

#### 时间选择框

- 默认当天时间；默认开启删除功能；根据特殊要求限制可选日期及校验；

#### 单选项

- 统一有默认选项；根据特殊要求限制内容及校验；

#### tabs

-默认使用基础类型
![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=fc542ec73672aa984bbdfe80bdae35b9)

#### 图片上传

- 默认上传组件长宽 100 px；默认开启删除功能和图片预览功能；据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=f775796456a9a17eff154efc72e1e02c)

#### 文件上传

- 默认显示内容为文件上传的朴素样式按钮；文案补充默认显示在按钮下方；据特殊要求修改；
- 上传文件默认显示在按钮下方；默认开启点击文件下载功能；据特殊要求修改；
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=8434be30a8bf51f87a14a6ce2a6a9582)

#### 查看

- 默认各表单项为纯文本显示
  ![](http://doc.uc108.org:8002/server/index.php?s=/api/attachment/visitFile&sign=d7ab38d62aaef24c5e2e7443baff4910)
