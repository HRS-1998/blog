[TOC]

## 一、环境准备（已安装可忽略）

### 1.1 安装 Claude Code

全局安装 Claude Code 命令行工具：

```bash
npm install -g @anthropic-ai/claude-code
```

** 常用管理命令：**

```bash
claude mcp list          # 查看已配置的服务器
claude mcp get <名称>     # 查看特定服务器详情
claude mcp remove <名称>  # 移除服务器
```

<br/>
### 1.2 安装 Figma 桌面应用

** 下载与登录：**
下载地址：https://www.figma.com/downloads/
登录账号：请向团队管理员（勇哥）申请前端专用账号

** 选择连接模式（三种方式对比）：**

| 模式             | 适用场景                               | 关键要求                                                                                                                                  |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 本地模式（推荐） | 日常开发，设计稿在本机打开             | 需安装 Figma 桌面应用，并开启本地 MCP 服务。[查看官方文档](https://developers.figma.com/docs/figma-mcp-server/local-server-installation/) |
| 远程模式         | 快速体验、跨设备协作，无需安装桌面应用 | 需登录 Figma 账号，通过 OAuth 认证。[查看官方文档](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)        |
| 本地 SSE 模式    | 适合自定义 MCP 服务器                  | 需自行搭建 MCP Server。[查看官方文档](https://site.builder.io/blog/claude-code-figma-mcp-server)                                          |

特别说明：`/figma-analyze` 技能进行数据信息提取，本地模式一次只支持一个项目连接。

<br/><br/>

## 二、配置与连接

### 2.1 本地模式（推荐）配置步骤

目前技能仅只支持本地模式。

**【1】开启 Figma 本地 MCP 服务**
打开 Figma 桌面应用，选择你当前开发的页面设计稿，按照截图配置勾选启用。
<img src="http://doc.uc108.org:8002/server/?s=/api/attachment/visitFile&sign=060f9a44aa78af0e084ab4a264b5b536" width="500px" />

**【2】设置资源下载路径**
需要配置项目的`根目录`。
<img src="http://doc.uc108.org:8002/server/?s=/api/attachment/visitFile&sign=6e1a769b9ebd5d248712260c29ea7f3a" width="500px" />

**【3】在Claude Code 中添加 Figma MCP 服务器** （每台笔记本仅需一次配置）

终端执行 或者 发送给AI配置（推荐）：

```bash
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

**【4】验证连接**

```bash
claude mcp list
```

若出现 `figma-desktop` 条目，则表示成功。

![image.png](http://doc.uc108.org:8002/server/?s=/api/attachment/visitFile&sign=b73eb10f9caa7f43fad44e6dd77fbc5d)

<div style="color:red;">
特别提醒：使用本地模式时，Figma 桌面应用必须保持打开，且需确保当前设计页面处于 开发者模式（Developer Mode）。
</div>

<br/>
### 2.2 远程模式配置步骤

**【1】安装官方 Figma 插件**：

```bash
claude plugin install figma@claude-plugins-official
```

**【2】添加远程 MCP 服务器**：

```bash
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
```

执行后会弹出浏览器进行 OAuth 登录授权。**验证**：同样使用 `claude mcp list` 查看。

<br/><br/>

## 三、开发流程

### 3.1 安装项目专用技能（h5Ai）

> 将 **h5Ai 技能包** 拷贝到你的项目开发目录下，该技能包包含预设的提示词模板、任务拆解规则等，用于指导 Claude 生成符合团队规范的代码。

技能包地址：http://192.168.101.244/FrontendDev/FD_M_h5ai 【当前先使用 release-1.0.0 分支 】
(该技能包含有脚手架基础配置，使用的Figma设计稿是：M-同城游授权登录。)

<br/>
### 3.2 启动 Claude Code 对话

在项目根目录下运行 `claude` 或者使用`IDE的插件ClaudeCode`

> 先准备好 `doc/ui.md`、`doc/api.md`、`doc/prd.md` 、`doc/figma/**` 数据：

| 名称              | 指令                                                    | 备注                                                                                                                        |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| doc文档格式化     | -                                                       | 先准备好 `doc/prd.md`（产品提供的原始版本） 、 `doc/ui.md`（从Figma开发者模式拷贝出要实现的设计稿链接），然后再进行格式化。 |
| api格式化         | 方式1：`/api-doc-formatter` <br/>方式2：`格式化api文档` | 先从yapi下载 `api.md` ，然后再进行格式化。                                                                                  |
| figma数据信息提取 | `/figma-analyze`                                        | 先准备好 `doc/prd.md`（格式化后的版本）、`doc/ui.md`（从Figma开发者模式拷贝出要实现的设计稿链接），然后再进行提取。         |

> 让AI执行代码开发页面：

| 名称 | 指令          | 备注                                                     |
| ---- | ------------- | -------------------------------------------------------- |
| 分析 | `/fd-propose` |                                                          |
| 执行 | `/fd-apply`   | 如果最终样式不满意AI对话：和设计稿有出入，请你仔细检查。 |
| 归档 | `/fd-archive` |                                                          |

claude将根据当前 Figma 设计稿和项目结构，自动生成 `design.md`（设计分析）和 `task.md`（任务拆解），并逐步生成代码文件。

<br/>
### 3.3 开发过程中的注意事项

| 问题类型                                        | 建议处理方式                             |
| ----------------------------------------------- | ---------------------------------------- |
| 生成文件有误（如 design.md / task.md 明显错误） | 手动修正后，重新执行 /h5ai 或针对性修复  |
| 代码生成乱码                                    | 删除错误文件，重新生成                   |
| 单个文件生成错误                                | 只删除该文件，让 Claude 重新生成该文件   |
| 代码逻辑错误                                    | 优先通过对话向 Claude 描述问题，让其修复 |

<div style="color:red;">
⚠️ 必须人工检查的项目：
【1】接口路径 src/api/interfaces.ts 中的接口地址可能存在相对路径/绝对路径混用或多域名情况，需人工核对并修正。
【2】build-user/config.js 的接口路径也需要改成真实的地址。
【3】Figma 桌面应用始终开启且页面处于开发者模式，且需要保证资源下载路径配置正确，否则 MCP 服务无法获取设计信息。
</div>

<br/><br/>

## 四、整体流程示意图

<span style="color:red;">（待更新）</span>

下图展示了从环境准备到代码生成的完整工作流：

<img src="http://doc.uc108.org:8002/server/?s=/api/attachment/visitFile&sign=3d2012480045cd801ba90d4297bbaed0" />

<br/><br/>
