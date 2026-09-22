# 10 CI/CD 与工程化

工程化高频面试题库：覆盖 CI/CD 流水线设计、分支策略、静态部署与灰度回滚、Docker 多阶段构建、版本与锁文件治理、代码质量卡点、单测/E2E 选型与稳定性、微前端原理与落地难题、DORA 效能度量、多环境管理、npm 发布流程、前端监控平台架构，按 P6 基础 + P7 深度双层组织。

## Q：CI/CD 完整链路：lint→test→build→deploy？分支策略 trunk-based vs git flow 如何选？

**核心答案**：一条完整的前端流水线分为六个卡点：install（锁文件 + 依赖缓存）→ lint（ESLint/Stylelint）→ typecheck（tsc/vue-tsc）→ test（单测 + 覆盖率阈值）→ build（产物构建 + 体积分析）→ deploy（按环境推进，prod 需审批），其中 lint/typecheck/test 应并行跑以压缩流水线时长。分支策略上，trunk-based 主干开发适合"持续部署、按需发布"的 SaaS 业务（短分支 + 特性开关 + merge queue），git flow 适合"多环境并行维护多个版本"的 ToB/客户端业务（develop/release/hotfix 分支显式管理发布）。选择的本质不是优劣，而是发布节奏与版本维护成本：发布越频繁、越希望小步快跑，越应靠近主干开发。

**知识点解析**：

- 流水线分层的两个原则：越快的检查越早跑（lint 秒级 → 单测分钟级 → 构建分钟级），失败要"快速失败"；每个阶段产出物要归档（构建产物、覆盖率报告、source map），后续阶段复用而不是重复构建。
- 依赖安装是 CI 的最大耗时点之一：使用 `--frozen-lockfile`（pnpm）或 `npm ci` 保证可复现；按 lockfile hash 做缓存（GitHub Actions 的 `actions/cache`、GitLab 的 `cache:`），pnpm 再配 `pnpm store` 缓存可把安装从 3 分钟压到 20 秒。

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck   # 并行 job 更佳
      - run: pnpm test -- --coverage
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy-staging:
    needs: quality
    if: github.ref == 'refs/heads/main'
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: npx vercel deploy dist --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
```

- trunk-based 的三件配套：分支存活时间 < 1 天（大了就拆）；未完成功能用特性开关（feature flag）隐藏而不是长分支隔离；PR 排队合入（GitHub merge queue / GitLab merge trains）避免"合并即冲突、合完主线挂了"。
- git flow 的适用面：develop 承接日常开发，release 分支冻结提测、只进 bugfix，hotfix 从 master 拉出修完双向合并——分支越多，合并成本和"忘了同步"的心智负担越大，一般超过 5 个长期分支就该反思。
- 部署阶段的环境推进：staging 自动部署、prod 手动审批（GitHub 的 environment protection rules）；每一次 prod 部署必须可追溯到 commit SHA + 构建产物哈希 + 发布单。

**加分项（P7 视角）**：

- merge queue 的价值：PR 各自过 CI 不代表合并后还能过（语义冲突、依赖别的 PR 的改动）。merge queue 会把队列中所有 PR 组合成临时分支跑完整 CI，通过才真正合入，把"主线永远绿"从事后修复变成事前保证。
- 混合模式是大厂主流：主干开发 + 按需拉 release 分支（从 main 上某个 commit 拉出、cherry-pick hotfix），既保留小步合入的节奏，又能同时维护多个线上版本；判断标准是"你们需要同时维护几个生产版本"。
- DORA 视角：Google Cloud 的《Accelerate》研究数据显示，精英团队与 trunk-based、按需部署强相关（部署频率按需/每天多次，变更前置时间 < 1 天）；反过来讲，分支策略是效能结果的一面镜子——如果团队被迫走长分支，通常暴露的是测试不兜底、发布不可回滚这两个更深层的问题。

## Q：前端部署方案：静态资源 CDN + index.html 分离、灰度发布、回滚机制？

**核心答案**：前端部署的核心是"内容寻址资源与入口文档分离"：构建产物中带 hash 的 js/css/图片上传 CDN 并设置超长缓存（`Cache-Control: public, max-age=31536000, immutable`），而 index.html 作为唯一不带 hash 的入口必须禁止缓存（`no-cache`），每次发布只替换 index.html 里引用的资源 URL，就能做到"改哪个文件失效哪个文件"。灰度发布在入口层切流量：按用户标识/百分比/地域决定返回新或旧的 index.html。回滚的本质是"把入口指向旧版本的资源清单"，因为旧资源在 CDN 上从未删除，回滚只是换 HTML，秒级完成且无构建。

**知识点解析**：

- 部署原子性：上传顺序必须"先资源后入口"——先把全部 js/css 传到 CDN 并等待生效，再发布新 index.html；反过来的窗口期内，新 HTML 引用的 hash 资源 404，用户直接白屏。同理，旧资源必须保留（至少最近 5-10 个版本），且已加载旧 HTML 的用户在 SPA 生命周期内还可能按需加载旧 chunk（路由懒加载），提前删旧资源是经典线上事故。
- 缓存策略矩阵：hash 资源 `immutable + 1y`；index.html `no-cache`（协商缓存，304 也比强缓存安全）；API 响应不走浏览器缓存走内存/网关缓存；HTML 中的资源引用建议加 crossorigin（为 SRI 和错误监控的跨域脚本统计）。

```nginx
# 入口与资源分离的缓存策略（网关/CDN 回源层）
location ~* \.(js|css|woff2|png|jpg|svg)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
location = /index.html {
  add_header Cache-Control "no-cache";    # 入口每次校验，发布即时生效
}
```

- 灰度发布的四层实现：CDN/边缘层（边缘函数按 cookie/uid 哈希分流，成本低、粒度粗）；Nginx 层 `split_clients` 按百分比分流；应用层（SSR/网关读取用户上下文决定渲染版本，可按白名单、地域、会员等级）；前端层（运行时特性开关拉取配置，粒度可到功能级）。前端灰度要特别注意"同一个用户始终看到同一版本"，用 uid 取模而不是随机数，否则刷新即跳版本。
- 回滚机制：版本化目录 + 软链切换是标准做法——每个版本发布为独立目录 `releases/v20260922-1200/`，`current` 软链指向当前版本，回滚只是把软链切回上一个目录，一条 `ln -sfn` 命令完成；CDN 侧需要刷新（purge）入口 HTML。回滚预案必须在发布前验证：能一键回、敢一键回，才敢高频发。
- 变更留痕：每次发布记录"版本号 → commit SHA → 构建人/流水线 → 发布时间 → 变更内容"，回滚和事后审计都依赖这份发布台账，配合上一题的部署审批形成变更管理闭环。

**加分项（P7 视角）**：

- HTML 缓存的隐蔽事故：部分 CDN 厂商默认对 HTML 也做强缓存，导致"发版不生效"，排查时先 `curl -I` 看入口响应头的 `X-Cache` 与 `Cache-Control`；同理回滚后必须主动 purge 入口，且要理解 CDN 分层（边缘节点 → 区域节点）的刷新传播延迟，紧急回滚走"源头切流"（如切回旧版本目录）比等全量刷新更快。
- 灰度与懒加载的组合坑：灰度期间新旧版本共存，如果旧版本页面在用户停留期间按需加载了一个"新版本刚改名的 chunk"，会 404 导致路由报错——解法是构建时保证 chunk 命名稳定（路由 name 不变）、公共 chunk 合理拆分，以及运行时 chunk 加载失败的兜底（捕获错误并提示刷新，即"发版检测"能力）。
- 线上案例视角：大厂发布普遍做"发布单据化"——发布单关联需求、变更风险等级、灰度批次（1% → 10% → 100%）、观察指标（错误率、性能分）与自动卡点（灰度期错误率超阈值自动暂停/回滚），把灰度从"人肉盯盘"升级为"系统防守"，这套叙事在面试里远比单个工具名值钱。

## Q：Docker 化前端：多阶段构建、nginx 配置（gzip/缓存/history 回退）？

**核心答案**：前端 Docker 镜像的标准做法是多阶段构建——第一阶段用 node 镜像执行 `pnpm install + build` 产出 dist，第二阶段仅把 dist 拷进 nginx（或 distroless 静态服务）镜像，node_modules、源码、构建工具全部留在第一阶段不进入最终镜像，体积从 1GB+ 降到 20MB 左右，攻击面也最小化。nginx 配置承担四件事：gzip 压缩文本资源、hash 资源长缓存 + index.html 禁缓存、SPA history 路由 404 回退到 index.html（`try_files`）、API 同源反代规避 CORS。

**知识点解析**：

- 层缓存优化：Docker 每条指令是一层，把"拷贝 lockfile + install"放在"拷贝源码"之前，源码变动时 install 层直接命中缓存不重装；再配合 BuildKit 的 `--mount=type=cache` 挂载 pnpm store，冷热构建差距可达 10 倍。
- 基础镜像选择：`node:20-alpine`（musl，体积小但原生模块偶有兼容坑）；`nginx:1.27-alpine` 稳定轻量；追求极致安全可用 distroless/scratch + 静态文件服务（如 caddy）。容器内 nginx 必须前台运行（`daemon off;`），否则 PID 1 退出、容器直接停止。
- 完整 Dockerfile：

```dockerfile
# syntax=docker/dockerfile:1.7

# ---------- 构建阶段：产出 dist ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
# 先拷依赖清单，最大化利用层缓存
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---------- 运行阶段：只有静态产物 + nginx ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
# 非 root 运行更安全（如需写日志目录可调整权限）
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

- 完整 nginx.conf（四件事一次配齐）：

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # ---- gzip：压缩文本类资源 ----
  gzip on;
  gzip_comp_level 5;
  gzip_min_length 1024;
  gzip_vary on;                       # 响应 Vary: Accept-Encoding，配合 CDN
  gzip_types text/css application/javascript application/json
             image/svg+xml font/woff2;

  # ---- 健康检查：供 Docker/k8s 探针 ----
  location = /healthz {
    access_log off;
    return 200 "ok";
  }

  # ---- 带 hash 的静态资源：一年长缓存 ----
  location ~* \.(js|css|png|jpg|jpeg|webp|woff2|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
  }

  # ---- 入口 HTML：禁止缓存，发布即时生效 ----
  location = /index.html {
    add_header Cache-Control "no-cache";
  }

  # ---- SPA history 路由回退：资源不存在则回 index.html ----
  location / {
    try_files $uri $uri/ /index.html;
  }

  # ---- API 同源反代：规避 CORS，转发 Cookie ----
  location /api/ {
    proxy_pass http://gateway:8080/;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # ---- 基础安全头 ----
  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options SAMEORIGIN always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
}
```

- SPA 回退的原理：history 模式下 `/user/123` 刷新时服务器收到的是真实路径请求，静态目录里没有该文件，`try_files $uri $uri/ /index.html` 表示"按路径找文件 → 找目录默认页 → 都没有就返回 index.html"，由前端路由接管渲染；注意该回退只应作用于页面路由，API 路径必须被 `location /api/` 优先匹配，否则会把 JSON 请求回退成 HTML。

**加分项（P7 视角）**：

- 预压缩更进一步：构建期用 `vite-plugin-compression` 产出 `.gz/.br` 文件，nginx 开 `gzip_static on;`（brotli 需 ngx_brotli 模块），线上不再实时压缩、CPU 接近零开销，brotli 对 JS/CSS 比 gzip 再省 15-20% 体积；配 `gzip_vary on` 防止 CDN 把压缩响应发给不支持的客户端。
- k8s 上的优雅停机：Pod 销毁时 SIGTERM 到 nginx，但 endpoint 摘除与进程退出有竞态，标准做法是 `preStop` sleep 几秒 + readinessProbe 保证摘流后再停，避免滚动更新期间的 502；DNS/长连接（WebSocket）还需要主动 drain。
- 镜像即制品的完整叙事：镜像 digest 不可变（区别于可变 tag），发布系统应以 digest 记录"线上跑的是什么"，回滚 = 重新部署历史 digest；CI 侧加镜像扫描（trivy）与 SBOM 清单，形成供应链安全闭环。

## Q：版本策略：semver、changesets、锁文件治理？

**核心答案**：semver 用 `MAJOR.MINOR.PATCH` 三段表达兼容性承诺——不兼容 API 变更升 MAJOR，向后兼容的功能新增升 MINOR，向后兼容的修复升 PATCH，预发布版本（`-alpha.1/-beta.2/rc.0`）与构建元数据（`+build.5`）有独立的优先级规则。monorepo 场景用 changesets：开发者在变更 PR 里附带一个 `.md` 变更文件声明"哪个包、什么级别、写了什么"，合入主干后 CI 的 version 流程统一升版本、生成 CHANGELOG 并发版，把"人肉记版本"变成流程化产物。锁文件治理的铁律：lockfile 必须提交、CI 必须 frozen 安装、依赖升级必须走独立可回滚的小 PR（Renovate/Dependabot 自动化）。

**知识点解析**：

- semver 细节：`^1.2.3` 允许 `>=1.2.3 <2.0.0`（锁定主版本），`~1.2.3` 只允许 patch 级（`>=1.2.3 <1.3.0`）；0.x 阶段"一切皆可破坏"（`^0.2.3` 只允许到 `0.2.x`），所以依赖 0.x 包要格外警惕；预发布优先级：`1.0.0-alpha < 1.0.0-beta < 1.0.0-rc.1 < 1.0.0`（正式版恒大于预发布）。
- changesets 工作流：`pnpm changeset` 交互式生成变更文件 → PR 里带着它评审"这次变更的影响面" → 合并到 main 后机器人开 Version PR（汇总所有 changeset：升版本 + 写 CHANGELOG + 清空变更文件）→ 合并 Version PR 触发 publish 发包。相比 lerna 的"自动探测提交算版本"，changesets 把版本决策前置到评审环节，更可控。

```md
<!-- .changeset/wise-pandas-smile.md -->
---
'@scope/ui': minor
'@scope/utils': patch
---

ui: 新增 Tree 组件虚拟滚动；utils: 修复 debounce 取消后仍执行的问题
```

- 锁文件治理三板斧：其一，CI 用 `pnpm install --frozen-lockfile` / `npm ci`，lockfile 与 package.json 不一致直接失败，杜绝"本地能装 CI 装出另一个版本树"；其二，lockfile 变更独立评审——一个 lockfile diff 里混进无关依赖升级是供应链事故的常见起点；其三，Renovate 按"每 PR 只升一个依赖、分组规则（如只升 patch）、锁定更新频率（每周）"配置，把依赖升级变成小步、可观察、可回滚的常态。
- 供应链安全：npm 包的 install 脚本是任意代码执行点，`.npmrc` 里 `ignore-scripts=true` + 白名单放行少数可信包；`npm audit` / `pnpm audit` 进 CI 但按严重级别卡点（high 以上阻断）；发布侧启用 2FA 与 npm provenance（基于 OIDC 的来源证明，npm 会显示仓库与流水线指纹）。
- 前端应用的"版本"是另一套：业务应用不发包，但仍需版本标识——构建号/build id + commit SHA 注入运行时（`__BUILD_INFO__`），配合归档的 source map 才能在监控平台还原线上错误栈；回滚时也能立即确认"线上到底是哪个 build"。

**加分项（P7 视角）**：

- monorepo 的两种版本模式：fixed（所有包同版本号，Lerna/Lerna-like 风格，适合强耦合组件库）vs independent（各包独立，changesets 默认，适合松散工具集）；选 fixed 的隐性代价是"改一个图标也要发全家桶"，导致消费者频繁无意义升级。
- 发版流水线的完整形态：main 合并 → CI（lint/test/build）→ changesets version PR → 人工确认 → tag → OIDC 身份直接 publish（不再落盘 npm token，token 泄露面归零）→ GitHub Release 关联 tag 与 CHANGELOG。能把"为什么用 OIDC 替代长期 token"讲清楚（token 是静态凭证、OIDC 是短时效签名信任链）是明显的加分点。
- 真实教训类案例：2024 年起的 npm 供应链攻击（xz-utils、polyfill.io 事件同理）共同指向一个结论——锁定依赖版本、校验完整性（`--frozen-lockfile` 保证 integrity hash）、最小化 install 脚本是三道必设防线；面试中主动提"我们审计过依赖里的 install 脚本并做了白名单"这类落地细节，比背诵 semver 规则有说服力得多。

## Q：代码质量体系：ESLint/Prettier/Stylelint/husky+lint-staged/CI 卡点如何搭建？

**核心答案**：质量体系的关键是"职责分离 + 双层防线"：ESLint 管 JS/TS 代码质量与潜在缺陷，Prettier 只管格式（用 `eslint-config-prettier` 关掉两者冲突的风格类规则），Stylelint 管 CSS/SCSS/Vue 样式块，三者规则收敛成一个团队共享的 preset 包统一分发。防线分两层：本地 husky + lint-staged 在 pre-commit 只对暂存区文件做增量检查（保证速度、不打断心流）；CI 做全量 lint + typecheck + test 作为 required check 硬卡点——本地方案可被 `--no-verify` 绕过，所以"真正卡住质量"的永远是 CI，本地只是提前反馈。

**知识点解析**：

- 工具职责切分：ESLint 的规则分"正确性"（no-undef、no-unused-vars）与"风格"（缩进/引号），后者全部让给 Prettier；Stylelint 单独处理 CSS 的书写顺序（stylelint-order 对齐属性顺序）、选择器复杂度、`::v-deep` 等 Vue 深度选择器的正确写法。
- husky + lint-staged 的配置（注意 husky v9 用 `.husky/` 目录脚本而非 package.json 配置）：

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "lint:style": "stylelint \"src/**/*.{css,scss,vue}\"",
    "typecheck": "vue-tsc --noEmit",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{css,scss,vue}": ["stylelint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
pnpm exec lint-staged
```

- CI 卡点分层：快速层（lint + typecheck，PR 一开就跑，分钟级必须给结果）、完整层（单测 + 构建 + 覆盖率阈值）、合并层（required status checks + 分支保护 + CODEOWNERS 强制审查，改动公共包必须有 owner 批准）。typecheck 单列而不是塞进 lint：`vue-tsc --noEmit` 是类型维度最真实的卡点，比任何 lint 规则都硬。
- 规则渐进落地：老项目一次性全量开 error 必然推不动，成熟做法是"存量豁免、增量严卡"——先把全部规则设为 warn 并跑出基线，CI 只对 diff 中新增的违规报 error（配合 eslint 的 `--no-warn-ignored` 与 git diff 过滤文件列表），存量按看板逐月清零。
- 共享配置包化：把 eslint-config/prettier-config/stylelint-config 发成内部 npm 包（或 monorepo workspace 包），各项目只 extends 一行，规则升级一个版本全员受益；避免"十个项目十套规则"的治理失控。

**加分项（P7 视角）**：

- 质量数据的度量闭环：lint 输出接 `--format json` 落库，看"违规总数/千行的月度趋势、TOP 违规规则、违规热点文件"，把代码质量从"感觉"变成指标；更进一步做 ratchet（只允许减少不允许新增）机制，技术债治理就有了可视化靶子。
- 卡点的"成本收益"权衡：pre-commit 全量 lint 是反模式（大仓库 30 秒以上的 pre-commit 必被绕过），push 阶段再补一道全量轻检查，CI 兜底全量——把"反馈速度"与"覆盖完备"分配到三个时点，这是工程判断力而非工具堆砌。
- 纵向扩展的安全卡点：pre-push/CI 上叠加 gitleaks（密钥扫描）、semgrep（自定义安全规则）、锁定依赖的 license 校验；这类"把安全左移到编码时"的组合拳，是 P7 面试里区分"会用工具"与"能设计体系"的关键素材。

## Q：单元测试：Vitest/Jest 选型、组件测试、覆盖率指标的合理性？

**核心答案**：选型的第一判据是项目底座：Vite 项目直接选 Vitest——它复用 Vite 的配置与转换管线（esbuild/Rollin 生态），原生 ESM、开箱即用的 TypeScript/JSX、watch 模式毫秒级 HMR，速度比 Jest（Babel 转换、默认 CJS 思维）快一个量级；Jest 的优势是生态成熟度（快照、mock 库、IDE 集成、大量存量教程）与 CRA/老 webpack 项目的兼容。组件测试遵循 Testing Library 的理念：通过用户视角（role、label、text）查询和触发，而不是测内部实现（state、实例方法）。覆盖率必须辩证看：它是防劣化的底线指标而非质量指标——行覆盖 80% 不代表测对了，只代表执行到了；比总覆盖率更有意义的是"变更覆盖率"（diff coverage）与核心模块的分支覆盖。

**知识点解析**：

- 选型维度对比：模块体系（Vitest 原生 ESM vs Jest 需配置 ESM 仍是补丁状态）；转换器（esbuild 快但部分语法不支持 vs Babel 慢而全）；配置复用（Vitest 直接读 vite.config 的 alias/插件 vs Jest 全套 transform/moduleNameMapper 重写）；特性差异（Vitest 原生提供 `vi.fn/in-source testing/browser mode`，Jest 有更成熟的 snapshot 生态与并行 worker 调度）。存量 Jest 迁移成本低：Vitest 提供了 jest 兼容 API 与 `globals: true`、`@vitest/coverage-v8` 平替。
- 组件测试的正确姿势（以用户行为为准绳）：

```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Cart from '@/components/Cart.vue';

describe('Cart', () => {
  it('删除商品后总价同步更新', async () => {
    const user = userEvent.setup();
    render(Cart, { props: { items: [
      { id: 'a', name: '键盘', price: 299 },
      { id: 'b', name: '鼠标', price: 99 },
    ]}});

    expect(screen.getByRole('status')).toHaveTextContent('398');

    await user.click(screen.getByRole('button', { name: '删除 键盘' }));
    expect(screen.getByRole('status')).toHaveTextContent('99');
  });
});
```

- 查询优先级：`getByRole`（可访问性语义，顺带验证 a11y）> `getByLabelText` > `getByText` > `getByTestId`（最后手段）；坚持"arrange-act-assert"三段式，一个用例只验证一个行为；避免对整个渲染输出做 snapshot——DOM 快照脆而不准，快照更适合纯数据结构。
- mock 分层：模块 mock 用 `vi.mock` 隔离网络/时间/随机；API 请求层推荐 MSW（Mock Service Worker）在 Service Worker 层拦截，测试代码仍走真实 fetch 逻辑，比顶层 mock axios 更接近真实路径，同一套 handler 还能本地联调复用。
- 覆盖率的三层认识：指标本身分 line/branch/function（分支覆盖最难达标也最有价值）；工具上 `@vitest/coverage-v8`（快）vs istanbul（准，支持忽略注释）；目标分层——纯逻辑（utils/hooks/store）应 85%+，组件 50-70% 看投入产出，整体指标用"变更覆盖率卡点"（新代码不低于阈值）替代全仓库一刀切。

**加分项（P7 视角）**：

- 前端的"测试奖杯"（Kent C. Dodds 的 Testing Trophy）：单元之上、E2E 之下，前端收益最高的其实是集成测试（组件 + 子组件 + 真实 store/router 一起测），大量细碎的组件单测维护成本高、防回归能力弱——能讲出"该测什么、不该测什么"的取舍框架比堆覆盖率数字重要。
- 覆盖率作假的鉴别与制度防御：只有执行没有断言的测试也能刷高覆盖，review 时重点看断言质量；CI 上同时卡"覆盖率不降"（ratchet）与"变更覆盖率阈值"，并把覆盖率报告作为 PR 评论展示，让指标暴露在评审中。
- 稳定性工程细节：时间相关逻辑全部走 fake timers（`vi.useFakeTimers`）而非真实等待；避免用例间共享状态（每个测试重建 store/路由）；`screen.debug()` 与 Vitest UI 快速定位；把这些习惯讲成"测试可信度"问题，是高级候选人的常见亮点。

## Q：E2E 测试：Playwright vs Cypress、CI 中的稳定性治理（重试/flaky）？

**核心答案**：两者最根本的差异在架构：Playwright 是进程外控制——测试代码跑在 Node，通过 CDP/WebSocket 驱动浏览器，天然支持 Chromium/Firefox/WebKit 三内核、多进程多上下文并行；Cypress 的测试代码运行在与被测应用同源同事件循环的环境里，因此跑得直观（time travel、debugger 体验好），但被绑定在自家 Runner、多 tab/跨域/多浏览器长期是短板，且免费版只能本机跑、CI 并行要订阅。CI 中的稳定性治理核心是"隔离 + 自动等待 + 受控重试 + 可观测"四件套：每个用例独立数据与状态、禁止固定 sleep、失败自动重试但重试只认已知 flaky 用例、每次失败留存 trace/截图/视频用于归因。

**知识点解析**：

- 自动等待（auto-waiting）是稳定的基石：Playwright 的每个 action 前自动等待元素"可见、可稳定、可接收事件、未被遮挡"，`expect` 内置轮询断言（web-first assertions）；因此严禁 `page.waitForTimeout(3000)` 这类定时等待——它既浪费时间又不能保证稳定，应替换为等待具体状态（`await expect(locator).toBeVisible()` 或等待特定响应）。
- CI 侧配置：重试只在 CI 开（本地不重试以便暴露问题）、worker 数与分片（shard）配合、失败保留诊断材料：

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,        // 只在 CI 重试
  workers: process.env.CI ? 2 : 4,       // CI 受 CPU 限制，防止互相拖慢
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',          // 失败留 trace：DOM 快照+网络+日志
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {                            // 自动拉起被测应用
    command: 'pnpm preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

- flaky 治理闭环：统计层面给每个用例记录"重试后才通过"的比例，超过阈值（如 5%）的用例进隔离区（quarantine 标记）；归因层面把 flaky 分三类——测试自身问题（等待不足、数据共享）、环境问题（CI 资源争抢、第三方接口）、真实产品竞态 bug；前两类修测试，第三类反而要感谢 E2E 抓到了 bug。只无脑加 retries 是掩盖问题。
- 数据与环境隔离：每个用例通过 API seed 造数（`request.post('/api/test/seed')`）而不是 UI 登录走流程（登录可做 storageState 复用，省 30% 时长）；用例间零依赖（不假设执行顺序），随机顺序跑（`--shuffle`）能提前暴露隐藏耦合。
- 分层执行策略：PR 阶段只跑冒烟集（关键路径 5 分钟内，如登录、下单、支付）；全量回归跑 nightly；生产环境做冒烟探测（synthetic monitoring，定时跑核心链路并告警），把 E2E 的价值从"发布前拦截"延伸到"线上持续巡检"。

**加分项（P7 视角）**：

- 失败诊断的效率决定 E2E 的存活率：Playwright 的 trace.zip 包含每步操作前后的 DOM 快照、网络请求、console 日志，可逐步回放；配合 `npx playwright show-trace trace.zip`，把"CI 挂了无法本地复现"的破局时间从小时级降到分钟级——团队对失败的可解释性，决定 E2E 体系是被维护还是被绕过。
- 视觉回归（screenshot diff）的工程化阈值：全像素比对必然 flaky（抗锯齿、字体渲染差异），需要 maxDiffPixels 容差、掩码动态区域（时间、头像、地图）、按视口分基线；把"视觉基线的更新"纳入 PR 评审流程，视觉变更显式可见。
- 能给出量化收益叙事：如"冒烟集 12 条覆盖 80% 营收路径，PR 阶段 6 分钟，上线后 P1 回归从季度 3 起降到 0"，以及"E2E 数量克制在 50 条内、其余下沉集成测试"的投入产出判断，比工具使用细节更能体现架构视角。

## Q：微前端：qiankun/Wujie/无界原理对比、沙箱实现（Proxy 快照）、通信方案？

**核心答案**：先澄清命名：无界就是 wujie（腾讯开源，"无界"是它的中文名），所以主流对比对象实际是 qiankun（蚂蚁，基于 single-spa）、无界 wujie、Micro-app（京东）。三者的隔离思路完全不同：qiankun 用 HTML Entry 加载子应用并在 JS 执行期套 Proxy 沙箱（伪造 window 拦截读写）、样式靠作用域前缀或 Shadow DOM；无界 wujie 用 iframe + Web Component 的组合——JS 在 iframe 里执行（window/history/location 天然隔离），DOM 渲染到主应用的 Shadow DOM 容器里（样式天然隔离）；Micro-app 类组件化接入（类似 Web Component 的自定义标签），原理接近 qiankun 但配置更简、不依赖路由劫持。沙箱实现是核心考点：qiankun 的 ProxySandbox 为每个子应用创建 fakeWindow，用 Proxy 拦截 get/set/has/deleteProperty，属性兜底回真实 window；降级方案是 SnapshotSandbox——激活时浅拷贝 window 全量属性，卸载时 diff 恢复。

**知识点解析**：

- qiankun 原理三步：HTML Entry（fetch 子应用 HTML → 解析出 script/style 并按序执行，比 JS Entry 的 bundle 依赖更解耦）；`execScripts` 把子应用代码放进沙箱上下文执行，配合子应用暴露的 `bootstrap/mount/unmount` 生命周期由 single-spa 调度（基于路由激活）；样式隔离提供 scoped（运行时给选择器加 `div[data-qiankun]` 前缀）与 experimentalStyleIsolation 两种，Shadow DOM 模式有弹窗等portal 处理坑。
- ProxySandbox 简化实现（面试可手写）：

```js
class ProxySandbox {
  active = false;
  fakeWindow = {};
  proxy = null;

  constructor() {
    const fakeWindow = this.fakeWindow;
    this.proxy = new Proxy(fakeWindow, {
      get(target, key) {
        // 子应用读属性：先查沙箱内，再兜底原生 window
        return key in target ? target[key] : window[key];
      },
      set(target, key, value) {
        // 写操作全部落在 fakeWindow，不污染全局
        target[key] = value;
        return true;
      },
      has(target, key) {
        // 关键：返回 true 使 with(window) 的作用域查找命中沙箱
        return true;
      },
      deleteProperty(target, key) {
        return delete target[key];
      },
    });
  }

  activate() { this.active = true; return this.proxy; }
  deactivate() { this.active = false; }
}

// 子应用代码以 with(proxyWindow){...} 包裹执行，
// 配合 has 劫持，变量查找全部命中沙箱代理层。
```

- has 拦截与 with 的配合是精髓：子应用代码通常被包装成 `with(proxyWindow) { code }` 执行，作用域链查找变量时会先问 `proxyWindow` 的 has 槽——返回 true 意味着"我这里有这个变量"，从而把对 window 的裸引用也导入代理逻辑。SnapshotSandbox 的不足：只支持单实例（两个子应用同时挂载会互相恢复彼此的属性）、遍历 window 有性能开销，所以它只是不支持 Proxy 的 IE 时代降级方案。
- 无界 wujie 的组合架构：JS 运行在 iframe——window、location、history 都是真隔离的（qiankun 靠 Proxy 模拟，wujie 直接是真的）；DOM 通过 iframe 与主应用之间的"桥"渲染到主应用里挂载的 Shadow DOM 容器（`<wujie-app>` 自定义元素），样式隔离交给 Shadow DOM 天然完成；iframe 常驻不销毁即实现"保活模式"（路由切走再回来状态不丢），这是它相对 qiankun 的体验优势，代价是每个子应用一个 iframe 的资源开销与 DOM 归属两层的调试成本。
- 通信方案对比：props 注入（主应用向子应用传参，qiankun 的 `props` / wujie 的 `props` 通道，适合"启动配置"）；事件总线（qiankun 的 `initGlobalState` 基于 observable 的 on/emit，wujie 用 `EventBus`，跨 iframe 通信底层靠 postMessage）；共享状态（主子共引同一个微前端 SDK/store，或约定都从基座拿）；URL/路由即通信（最松耦合）。通信铁律：子应用之间不直接互调，统一经主应用中转，保持"星型拓扑"。

**加分项（P7 视角）**：

- 技术选型的判断力比背特性更值钱：qiankun 生态最成熟、适合复杂存量系统渐进式拆分，但 Proxy 沙箱对原型链逃逸（`window.constructor`）、`document` 共享导致的副作用事件绑定无法隔离；wujie 隔离最彻底、接入成本低，但 iframe 常驻的内存成本与复杂交互（拖拽跨容器、z-index 层级）要提前评估；Micro-app 适合"只求低成本接入、不强求硬隔离"的场景。真实的选型汇报会先列"业务要接几个子应用、团队是否有对 iframe 的历史包袱、存量子应用改造成本"。
- 沙箱逃逸与安全性：Proxy 沙箱只隔离属性访问，document、localStorage、原型链是共享面，恶意/异常子应用仍能 `document.body.appendChild` 或改写原生原型——微前端的隔离等级远低于浏览器沙箱，安全上要配合 CSP、域名级拆分（重要子应用独立域名 + 外壳 iframe）这类架构手段。
- 通信的规模化治理：子应用多了以后事件总线退化成"全局事件面条"，成熟做法是引入"应用注册表 + 服务化通信"（子应用声明自己提供/消费的能力，基座做注册与路由转发），本质是把微服务的 RPC/注册中心思路搬进前端。

## Q：微前端落地难题：样式隔离、公共依赖、路由同步、部署独立化？

**核心答案**：微前端的四大落地难题本质都是"复用与隔离的平衡"。样式隔离要解决基座与子应用、子应用之间的样式互污：Shadow DOM 隔离最彻底但样式穿透（弹窗、全局组件挂 body）需特殊处理，作用域前缀（scoped/bem/构建期加前缀）兼容性最好。公共依赖要避免 React/Vue 迄今版本被每个子应用重复打包导致体积翻倍——用构建层 externals + 运行时共享（Module Federation/ESM import map/sharing-scope）去重，同时把"版本对齐"制度化为共享依赖白名单。路由同步要在"主应用统一感知"与"子应用自治"之间设计：主应用拦截路由变更、下发 activeRule 命中子应用、子应用内部路由事件同步回主 URL，保证刷新与后退一致。部署独立化是微前端的初心：各子应用独立仓库/流水线/发布节奏，基座只依赖"子应用入口 manifest"（注册表返回最新的 entry 地址），从而做到"主应用不重启、子应用随时发"。

**知识点解析**：

- 样式隔离四级方案：基座 reset 样式与子应用隔离（基座样式收敛、只作用于容器）；子应用间隔离（Shadow DOM 或构建期 `postcss-prefix-selector` 加前缀，qiankun 的 experimentalStyleIsolation 属于运行时前缀）；子应用内部天然 scoped（Vue SFC/ CSS Modules）；全局污染源治理——element/antd 这类组件库按需引入并把主题变量锁定在容器命名空间内。弹窗挂 body 逃逸 Shadow DOM 的解法：组件库配置挂载到 shadow 容器（popup container/getPopupContainer）或放弃 Shadow DOM。
- 公共依赖三层去重：构建层 externals 把 react/vue/lodash 从子应用 bundle 排除；运行时共享——Webpack 5 Module Federation 的 shared/单一版本协商（版本不匹配时回退到自带副本），或原生 ESM 的 import map 指向统一 CDN；制度层"共享白名单"——哪些包必须共享、哪些必须自带（业务 UI 库必须自带，react 之类的 runtime 必须共享），没有制度光有机制会在升级时全线崩。
- 路由同步模型：主应用路由表形如 `{ '/sub-app-a': { entry, activeRule } }`；URL 变化 → 基座匹配 activeRule → 挂载对应子应用并下发当前路由子路径；子应用内部路由跳转 → 通过 `singleSpa` 的 navigate/pushState（沙箱劫持路由 API）上报主应用 → 主应用统一改写地址栏。必须处理三个坑：路由钩子重复触发、子应用保活时路由状态保持、多实例（同屏多子应用）时 activeRule 不能重叠。
- 部署独立化的核心是"注册表解耦"：主应用不写死子应用地址，运行时从注册中心（如配置服务/聚合接口）拉取 `{ apps: [{ name, entry, activeRule, version }] }`；子应用发布 = 上传产物 + 更新注册表指向新版本，主应用无需变更。子应用按上题"hash 资源 + index.html 不缓存"部署，基座二次加载子应用 entry 也必须禁缓存，否则子应用发版不生效。
- 独立部署下的版本矩阵问题：子应用 A 依赖的公共库升了 v2，基座还提供 v1——需要共享依赖版本协商（Module Federation 的 singleton + strictVersion）与集成冒烟（注册表更新前自动跑基座+全部子应用的 E2E 冒烟），把"独立发布"与"集成正确"这对矛盾用验证链路兜住。

**加分项（P7 视角）**：

- 微前端的"该不该拆"判断框架：微前端解决的是组织问题（多团队并行、存量巨石渐进拆分）不是技术问题，代价是体积冗余（公共依赖不共享时 bundle 普遍大 20-40%）、复杂度上移（注册表/联调环境成倍复杂）；如果团队小于 15 人、发布没有互相阻塞的痛点，monorepo + 模块化比微前端更优——能讲出"我们不微前端"的理由往往比"我们用了微前端"更显架构成熟度。
- 联调环境是最大的隐性成本：本地起基座 + 多个子应用需要远程代理（本地子应用覆盖线上 entry 的代理注入）、子应用独立分支的集成环境池，这套"微前端研发基础设施"的建设成本要纳入选型汇报，多数失败的微前端改造都低估了这一项。
- 监控与排障：微前端下错误要带上"应用标识 + 版本"维度归因，sourcemap 按子应用分别归档；性能指标（LCP/INP）也要拆到子应用维度，否则无法回答"整页变慢是谁的问题"——配套的观测体系是微前端能长期运行的前提。

## Q：研发效能度量：构建时长/MR 周期/部署频率？DORA 指标如何在前端落地？

**核心答案**：研发效能度量分两层：北极星层用 DORA 四指标——部署频率（Deployment Frequency）、变更前置时间（Lead Time，从提交到上线）、变更失败率（Change Failure Rate）、服务恢复时间（MTTR，现称 Failed Deployment Recovery Time），衡量"交付做得快不快、稳不稳"；过程层抓前端特有关键路径——CI 时长（install/lint/build 分段）、MR 周期（从 PR 开到合并，含评审等待时长）、构建产物体积、发布耗时与回滚率。前端落地 DORA 的关键在于"埋点归因"：所有指标必须从流水线事件（commit/PR/部署工单）自动采集而非人报，且要能下钻到"哪个阶段慢"（依赖安装占 40% 还是构建占 30%），否则指标只是仪表盘装饰。

**知识点解析**：

- DORA 四指标的定义与采集点：部署频率从 CD 事件取（每天部署次数）；Lead Time 从"commit 时间到对应版本部署完成"取（关联发布单与 commit SHA）；变更失败率从"部署后触发回滚/热修的发布占比"取；MTTR 从"故障发生到恢复部署完成"取。前端与后端口径一致，才能横向比较团队。
- 前端过程指标体系：CI 总时长及其分解（install → lint/typecheck → test → build 各段耗时，缓存命中率）；MR 周期分解（编码时长、评审等待时长——最常被忽略的瓶颈、评审轮次）；构建体积与 gzip 后体积趋势（劣化超阈值 PR 评论预警）；页面性能（Core Web Vitals）按版本回归对比，把"质量效能"纳入度量。
- 典型优化路径（指标驱动）：install 慢 → lockfile 缓存 + pnpm（30-50% 收益）；build 慢 → 构建缓存（Vite 持久缓存/webpack filesystem cache + CI 级缓存）、代码拆分；test 慢 → 并行分片 + 增量测试（只跑受影响测试）；评审慢 → 卡点指标"PR 停留 > 24h 进看板" + 评审 SLA 约定 + CODEOWNERS 精确到目录。
- 度量的反模式：把指标变成 KPI 直接考核个人（必然导致刷数据——拆小 PR 刷前置时间、删测试刷时长）；只测不改进（指标必须有 owner 与改善回路）；孤立看单点（部署频率高但失败率也高是劣化不是进步，DORA 要求成对解读：快而稳）。

```yaml
# 从流水线事件自动上报效能数据（示意）
after_deploy:
  script:
    - |
      curl -X POST https://metrics.internal/api/deploy \
        -H 'Content-Type: application/json' \
        -d '{
          "project": "web-app",
          "commit": "'"$CI_COMMIT_SHA"'",
          "env": "prod",
          "duration_s": '"$DEPLOY_DURATION"',
          "ci_total_s": '"$CI_TOTAL"',
          "result": "'"$DEPLOY_RESULT"'"
        }'
```

**加分项（P7 视角）**：

- SPACE 框架的补充视角（GitHub/微软提出）：满意度与幸福感（Satisfaction）、表现（Performance）、活跃（Activity）、沟通协作（Communication）、效率与流畅（Efficiency/Flow）——DORA 只覆盖"产出速度"，SPACE 提醒度量体系要平衡"人"的维度（评审负荷、中断次数），避免效能工程变成压榨工具；能对比这两套框架的适用边界是高级信号。
- 指标要有"治理故事"：光报数字没有意义，要讲闭环——"发现评审等待占 MR 周期 70% → 推动 24h SLA + 缩小 PR 粒度约定 → 周期从 3.2 天降到 1.1 天"；效能工程的本质是持续假设-验证-复盘，仪表盘只是输入。
- 前端特有陷阱：构建产物体积与"用户感知速度"非线性相关（缓存命中率、首屏 chunk 拆分比总量更重要），度量要落到 Core Web Vitals 的版本级趋势；CI 时长优化要警惕"缓存陷阱"——命中率 100% 的流水线在冷缓存/依赖变更时会突然超时，监控要同时看冷热两组数据。

## Q：环境体系：dev/test/staging/prod 的配置管理与特性开关？

**核心答案**：四环境各司其职：dev（本地，热更新 + 全量 mock，服务开发者效率）、test（持续集成的联调环境，数据可随意造、跑 E2E）、staging（预发，与 prod 同配置同规格、真实脱敏数据，最后验收关）、prod（生产）。配置管理的核心原则是"一份代码 + 多份配置"——代码中配置按环境变量注入（`import.meta.env.VITE_*`），敏感配置（密钥、第三方 key）绝不进仓库，由各环境的 CI secret 或配置中心下发；staging 必须无限接近 prod（同版本依赖、同网关策略、同域名结构），否则"预发通过、线上爆炸"。特性开关（feature flag）与配置管理配合，实现"部署（deploy）与发布（release）解耦"——代码随时上，功能随时开，未完成的功能用开关隐藏。

**知识点解析**：

- 配置注入的层次：构建期变量（`VITE_API_BASE` 这类随产物固化的，适合非敏感项，注意前端环境变量本身就是公开信息）；运行期注入（入口 HTML/接口下发 config.js 或 `/config` 接口，改配置不发版——适合可动态调整的开关）；CI/CD secret（部署凭证、监控上报 key，只存在于流水线环境）。

```js
// src/config.js —— 集中收敛环境差异，禁止业务代码到处写 env 判断
const config = {
  apiBase: import.meta.env.VITE_API_BASE,
  enablePay: import.meta.env.VITE_ENABLE_PAY === 'true',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
};

// 运行时配置：挂 window 的 config.js 允许不发版调整
if (window.__RUNTIME_CONFIG__) Object.assign(config, window.__RUNTIME_CONFIG__);
export default config;
```

- 四环境的数据与依赖策略：dev 用 mock（MSW 拦截）+ 少量真实下游；test 用独立测试库 + 造数脚本（E2E 可重复执行）；staging 连生产同构的影子库 + 脱敏数据（真实流量回放要脱敏合规审查）；prod 不允许手工改数据。环境隔离要彻底到"环境间的代码只能向前流"（dev → test → staging → prod），禁止在 staging 直接改代码编译。
- 特性开关的设计：粒度分"发布开关"（隐藏未完成功能，短生命周期，上线验证后删除）、"实验开关"（A/B 分流，接实验平台）、"运维开关"（降级/熔断，如一键关闭非核心模块）；实现上自研简易开关（配置接口 + 缓存 + 变更事件）或接商用平台（LaunchDarkly/Unleash/自建）；必须带"开关台账"记录创建时间与负责人，过期开关自动提醒清理——僵尸开关是技术债重灾区。
- 开关带来的测试复杂度：核心路径的组合爆炸，策略是"新开关默认关闭 + CI 对开启态跑关键用例 + 上线后按真实开关状态补验"；能讲清楚"开关替代分支的代价是测试矩阵扩大"，体现工程权衡意识。

**加分项（P7 视角）**：

- deploy ≠ release 的架构价值：合并到 main 即部署到生产（带开关、关闭状态），把"发布风险"从"一次性大爆炸上线"变成"随时可控的开关动作"，这是高频部署团队（DORA 精英梯队）的核心实践；但要求每个开关的默认关闭态必须被测试覆盖，否则关闭态线上挂掉就是事故。
- 环境一致性的深度保障：staging 与 prod 的偏差要"度量"而不是"相信"——配置 diff 工具（比对两边网关/环境变量/依赖版本）、依赖审计（锁文件与运行版本对齐）、基础设施同构（同样的 k8s 资源限额，避免"预发 2 核生产 1 核"的 OOM 惊喜）。
- 真实故障模式举例：环境变量命名不一致（staging 的 `VITE_API_BASE` 少写导致请求打到生产 API）——解法是配置 schema 校验（zod 定义配置结构，CI 校验各环境变量齐全且无越权值），把环境治理从"文档约定"升级为"程序校验"。

## Q：npm 包发布流程：scope、.npmrc、2FA、私有 registry（Verdaccio）？

**核心答案**：npm 发布的标准流程：在 package.json 声明 scope（`@company/ui`）区分公有/私有命名空间，scope 绑定组织与 registry 路由——私有包发到内部 registry、公有包发 npmjs；`.npmrc` 承载所有 registry 与凭证配置（registry 地址、scope 映射、token、发布镜像源）；账号开启 2FA（TOTP 认证器或 npm 新版 granular token + OIDC），发布要求 OTP 验证；私有 registry 用 Verdaccio 自建：它作为代理缓存上游 npm（装公共包快且不怕源挂）+ 本地私有包存储 + 上游权限控制。发布动作本身被 CI 流水线接管（上上题的 changesets 发版流程），本地零凭证。

**知识点解析**：

- scope 的作用：命名隔离（`@scope/pkg` 防抢注）；权限隔离（包归属于组织，成员由组织管理而非个人账户）；registry 路由（`.npmrc` 里 `@scope:registry=...` 可让某个 scope 走私有源，其他走公网——企业最常用模式）；可见性（unscoped 包只能公有，scope 包可选 public/private）。

```ini
# .npmrc（项目级，随仓库提交——不含 token）
registry=https://registry.npmjs.org/
@company:registry=https://npm.company.internal/

# .npmrc（用户级 ~/.npmrc——只放凭证，绝不进仓库）
//npm.company.internal/:_authToken=xxx_secret_xxx
//registry.npmjs.org/:_authToken=yyy_secret_yyy
```

- 发布配置防呆：`private: true` 防止误发业务仓库；`files` 字段白名单只发布 dist 与 README/types；`publishConfig` 覆盖发布时的 registry/访问级别；`prepublishOnly` 钩子跑 lint+test+build；CI 上 `npm publish --access public` 显式声明可见性，避免私有 scope 包默认发成受限包。
- 2FA 与凭证安全的演进：旧的"账号密码 + 长期 token"模式正被取代——npm 经典 token 泄露即全域沦陷；新实践是 granular access token（限定包、限定权限、限定有效期）+ 发布工作流的 OIDC（CI 用 GitHub OIDC 身份直接换 npm 发布凭证，npm 会在包页显示 provenance 来源徽标，证明"这个包确实来自这个仓库这条流水线"）。
- Verdaccio 私有 registry：核心价值三合一——其一是私有包宿主（企业内部组件库不发公网）；其二是代理缓存（`uplinks` 配置 npmjs 淘宝源，公共依赖装一次即缓存，国内安装提速且不受公网源抖动影响）；其三是权限管理（`packages` 配置项按 scope 控制谁可发布 `publish` 谁可安装 `access`）。部署为 docker 容器 + 持久化存储即可，中大型企业再演进到 Artifactory/Nexus（多语言制品库统一）。

```yaml
# Verdaccio config.yaml 关键片段
packages:
  '@company/*':
    access: $authenticated    # 登录才可装
    publish: $authenticated   # 登录才可发
  '@*/*':
    access: $all
    publish: $authenticated
  '**':
    access: $all              # 公共包：匿名可装（走 uplink 缓存）
    proxy: npmjs

uplinks:
  npmjs:
    url: https://registry.npmjs.org/
```

**加分项（P7 视角）**：

- 发布安全的事件驱动认知：近年多起 npm 供应链攻击（包被劫持、恶意版本发布、provenance 伪造未然但有仿冒）之后，企业普遍加固三板斧——2FA 强制 + granular token 最小授权、provenance/签名验证（`npm audit signatures`）、发布走 CI 独占（本地无发布权、人无发布权，只有流水线身份能发），这套"零本地凭证"的架构是 P7 面试的高频加分叙述。
- Verdaccio 的规模化瓶颈与演进：单机存储与缓存失效策略（`--storage` 挂对象存储要谨慎处理一致性）撑不住多机房后，演到 Artifactory/Nexus 的多副本 + 复制；再往后是"内网 registry + 公网镜像分层"（装机镜像预置缓存），把安装可用性做成基础设施 SLA。
- 版本不可变性的纪律：npm registry 上已发布的版本不可覆盖（同版本号重发被拒），所以"发错了就 deprecate + 发新修复版本"而不是强推；结合 changesets 的"Version PR 合并即 tag 即发布"流水线，能讲清"从变更文件到生产包"的完整不可变链条是体系化能力的体现。

## Q：设计一套前端监控平台的架构（采集→传输→计算→告警）？

**核心答案**：整条数据流是"SDK 采集 → 上报传输 → 接入清洗 → 实时计算 → 存储 → 查询告警"六段。采集端用统一 SDK 覆盖四类数据（JS 错误、接口异常、性能指标、用户行为/PV），采集要兼顾"全量错误 + 采样性能"以控量；传输端的核心设计是"批量、断网不丢、退出前冲刷"（sendBeacon + 队列持久化）；接入层做校验、清洗、富化（补版本/环境/用户维度）后写消息队列；计算层分实时与离线——实时做错误聚合与指标窗口计算支撑分钟级告警，离线跑全量分析与报表；存储按数据形态分库（错误明细 + 聚合指标 + 日志/行为流）；告警层以"指标 + 阈值 + 聚合窗口 + 分级路由"为规则核心，目标做到分钟级发现、降噪不狼来了、能定位到版本与用户面。

**知识点解析**：

- 整体数据流（架构图）：

```text
[浏览器 SDK]           上报：批量 + 采样 + 压缩 + sendBeacon 兜底
     │
     ▼
[接入网关 Nginx/Node]  校验/防刷(appKey 合法性)/清洗/富化(版本/环境/地域)
     │
     ▼
[消息队列 Kafka]        削峰解耦，多消费者订阅
     │
     ├────────────────► [实时计算 Flink]        分钟级窗口聚合：错误率/耗时分位数
     │                        │
     │                        ▼
     │                  [告警引擎]                指标超阈值 → 判定 → 分级 → 通知
     │
     └────────────────► [消费入库]                写 ClickHouse(明细) / MySQL(配置)
                            │
                            ▼
                     [查询与分析 Web]             看板/下钻/ sourcemap 还原栈/回放
```

- 采集 SDK 四类数据与关键点：JS 错误（`window.onerror`、`unhandledrejection`、`error` 事件捕获，记录 stack/message/行列号、去重计数）；接口异常（拦截 fetch/XHR，记录状态码、耗时、出参摘要，注意脱敏）；性能（Navigation Timing API 的 LCP/FCP/CLS、资源加载瀑布、接口耗时分布，PerformanceObserver 上报 web-vitals）；行为（PV/点击/路由变化，作为错误回溯的上下文）。SDK 原则：自身绝不抛错影响业务（try-catch 全包）、可配置开关与采样、懒加载与空闲上报（requestIdleCallback）。
- 传输层设计：批量聚合（队列满 N 条或定时 T 秒冲刷，减少请求数）；`navigator.sendBeacon` 保证页面卸载时上报不丢（POST 无响应式，适合兜底）；本地 IndexedDB/SessionStorage 缓存失败数据、下次启动补发（限制重试天数防陈旧数据污染）；上报 payload 用 gzip 压缩（网关解压）；get 展示型指标可走 1px gif 防跨域缓存（现代场景已不必须）。
- 采样策略分层：错误类数据"全量采集 + 前端聚合去重"（同一 stack 一次会话只报若干次），因为错误是低频高危信号，漏报代价大；性能类数据采样（如 10%，大流量站点 1%），因为分位数统计只需足够样本量即可收敛（P95 的相对误差与样本量平方根成反比，日采样数万条已充分稳定）；行为类按需采集（只在排障开启 session replay 采样 1%）；灰度/新版本发布期自动提高采样率，是"动态采样"的高级形态。
- 存储选型：明细类（错误事件、接口日志，写多读少、按维度聚合查询）选 ClickHouse（列存压缩比高、聚合快，TB 级秒查）；指标类（分钟级错误率、P95 耗时曲线）可用 Prometheus/时序库或直接 ClickHouse 物化视图；配置类（项目、告警规则、用户）用 MySQL；sourcemap 是独立资产管理（构建流水线上传，按版本归档，查明细时在线还原栈，绝不放浏览器端防源码泄漏）；埋点事件流大批量场景走 Kafka→数仓/ClickHouse 分层。
- 告警规则设计示例（可落地的规则四要素：指标、窗口、条件、级别）：

```yaml
rules:
  - name: 版本级错误率激增          # 发布守夜：定位到具体版本
    metric: error_rate
    group_by: [project, version]   # 关键：维度带版本，才能回答"哪个版本坏了"
    window: 5m
    condition: "error_rate > 3 * baseline AND sample >= 50"
    severity: P1
    notify: [oncall_im, phone]      # P1 电话/群 + @值班

  - name: 接口成功率下降
    metric: api_success_rate
    group_by: [project, api]
    window: 10m
    condition: "success_rate < 0.95"
    severity: P2
    notify: [project_im]

  - name: LCP 劣化                 # 性能预算
    metric: lcp_p75
    group_by: [project, page]
    window: 1h
    condition: "lcp_p75 > 2500"
    severity: P3
    notify: [perf_group]
```

- 告警降噪三机制：基线化（与上周同时段/历史均值比，而非绝对阈值，规避流量波动误报）；聚合收敛（同项目 5 分钟内多条告警合并为一条，附带影响面）；分级路由（P1 电话、P2 群、P3 邮件，恢复通知自动发送）。核心 KPI 是"告警可命中率"（收到告警后确实需要处理的比例），低于 50% 的告警体系会被人忽略。

**加分项（P7 视角）**：

- 规模化成本视角：日千万级 PV 的站点若性能数据全量上报，年存储与带宽成本可观——能主动算这笔账（全量 5KB/条 × 千万 = 每天 50GB 级）并据此设计"分级采样 + 前端预聚合 + 冷热分层存储（热数据 30 天、冷数据降采样归档）"，是平台 owner 视角的标志。
- 从"监控"到"可解释性"的演进：错误要能一键回答"什么版本、哪个用户群、什么路径、什么依赖接口"，因此采集时就要带上 release version + environment + traceparent（接全链路 Trace，前端错误与后端服务日志通过 traceId 串联）——把前端监控从孤岛指标升级为分布式观测的一环，能与后端聊 APM/OpenTelemetry 统一采集协议是明显的跨端加分项。
- 灰度与发布的自动防守闭环：告警不止通知人，还可回调发布系统——"新版本错误率超阈值 → 自动暂停灰度/回滚"，把监控从被动观测升级为变更自保护；配合 session replay 采样按"错误用户优先补采"的定向策略，让排障材料自动齐备，这套叙事是 P7 面试里"监控平台"题的顶级答案形态。









