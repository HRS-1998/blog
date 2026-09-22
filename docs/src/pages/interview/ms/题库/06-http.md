# 6 HTTP / 网络

HTTP/网络高频面试题库：覆盖 HTTP/1.1-2-3 演进与队头阻塞、HTTPS/TLS 握手、状态码决策链、TCP 拥塞控制、WebSocket、DNS/CDN、Cookie/JWT 鉴权、请求调度、大文件分片传输与弱网优化，按 P6 基础 + P7 深度双层组织。

## Q：HTTP/1.1 vs HTTP/2 vs HTTP/3 的核心差异？队头阻塞、多路复用、QUIC 原理？

**核心答案**：三代的演进主线是"消除队头阻塞、降低建连成本"。HTTP/1.1 是文本协议，请求-响应在同一连接上必须按序完成，存在请求级队头阻塞，浏览器只能靠"每域名 6 条 TCP 连接 + keep-alive + 域名分片"缓解；HTTP/2 引入二进制分帧层，在一条 TCP 连接上以"流（Stream）+ 帧（Frame）"并发交错传输多个请求，配合 HPACK 头压缩与服务器推送，解决了 HTTP 层的队头阻塞，但 TCP 层队头阻塞仍在——丢一个 TCP 段会阻塞该连接上的所有流；HTTP/3 把传输层换成基于 UDP 的 QUIC，流是传输层一等公民（各流独立交付、独立丢包重传）、握手内嵌 TLS 1.3（CRYPTO 帧）把安全连接降到 1-RTT/0-RTT，并用 Connection ID 实现连接迁移，彻底消除传输层队头阻塞。

**知识点解析**：

- HTTP/1.1 的三大痛点：请求按序排队（队头阻塞）；头部明文重复（Cookie 动辄数 KB，且 gzip 压缩被规范禁止，见 RFC 7230）；文本解析易受慢速攻击（Slowloris）。管线化（pipelining）因响应必须按序返回、代理兼容性差而被浏览器默认禁用，最终废弃。
- HTTP/2 二进制分帧层：所有消息切分为帧，帧头固定 9 字节——Length（3 字节，DATA 帧默认上限 2 的 14 次方即 16KB）、Type（1 字节）、Flags（1 字节）、R 保留位 + Stream ID（31 位，奇数客户端发起、偶数服务端发起）。

```http
+-----------------------------------------------+
|                 Length (24)                   |
+---------------+---------------+---------------+
|   Type (8)    |   Flags (8)   |
+---------------+-------------------------------+
|                 Stream ID (31)                |
+===============================================+
|                 Frame Payload ...
```

- 关键帧类型：HEADERS（含 HPACK 压缩块 + PRIORITY）、DATA（受流控约束）、SETTINGS（协商初始窗口/最大帧长）、WINDOW_UPDATE（连接级与流级两层流量控制）、RST_STREAM（流级取消，不炸整条连接）、PING（保活/测 RTT）、GOAWAY（优雅关停，告知最后一个流 ID，支持连接级平滑下线）、PUSH_PROMISE（服务端推送，Chrome 106 已移除支持）。
- 多路复用的本质：帧可交错发送，按 Stream ID 重组；流有状态机（idle → open → half-closed → closed），优先级以"依赖树 + 权重（1-256）"表达，Chrome 现已改为 HTTP/2 Extensible Priorities 的 urgency/incr 模型。HPACK 由 61 项静态表 + 动态表 + 哈夫曼编码组成，典型头部可从数百字节压到个位数。
- HTTP/2 的队头阻塞（TCP 层）：TCP 保证字节流按序交付，接收端必须等丢失的段重传到位才能把后续字节交给上层——即使这些字节属于完全不相关的流，TCP 也不认识"流"。丢包率 2% 时 HTTP/2 实测可能比 6 连接的 HTTP/1.1 更慢。
- QUIC 核心设计：传输层直接感知流。包结构上，长头包（带版本，用于握手）含 DCID/SCID（连接 ID，最长 20 字节）；载荷由 QUIC 帧组成，STREAM 帧携带"Stream ID + Offset + Length + Data"，每个流独立按 Offset 重组，丢包只阻塞所在流。ACK 帧支持更大的 SACK 范围，且包号单调递增（重传用新包号），消除了 TCP 重传二义性导致 RTT 估计偏大的问题。
- QUIC 把 TLS 1.3 的 ClientHello/ServerHello 装进 CRYPTO 帧随 QUIC 包传输，首次连接 1-RTT 即可发数据；携带 PSK 恢复时 early data 实现 0-RTT。Connection ID 不含 IP，WiFi 切 4G 时连接不中断（连接迁移）。QUIC 是用户态协议，迭代不依赖内核——拥塞控制算法可随 Chrome/服务端快速升级（默认 CUBIC 类，可换 BBR）。

**加分项（P7 视角）**：

- 协议协商链路：HTTP/2 走 TLS ALPN（h2）或明文 h2c 升级（浏览器不用）；HTTP/3 靠 Alt-Svc 头（如 `alt-svc: h3=":443"; ma=86400`）宣告 QUIC 端点，客户端先走 H2 再并行试 H3，失败自动回退 TCP——所以升级 H3 从不增加首次访问成本。
- 安全层差异：TCP+TLS 中 TCP 头明文（序列号可被中间盒注入/劫持），QUIC 的大部分包头（含包号）本身被头部保护加密，抗插入与重放、抗中间盒僵化（ossification）能力更强。
- 生产故障案例：HTTP/2 Rapid Reset 攻击（CVE-2023-44487）——攻击者海量开流后立刻 RST_STREAM，因流取消成本不对称导致服务端 CPU 打满，说明"多路复用放宽了资源申请速率"带来的新攻击面；修复依赖各实现限制并发流与 RST 频率。
- 工程权衡：H2 单连接在高丢包链路上吞吐反而劣于 H1 多连接（单拥塞窗口、流控相互制约），部分大厂在弱网地区探测后回退 H1 或开启多条 H2 连接；谈优化时能把"丢包率 × RTT 对 cwnd 的影响"讲清楚是明显加分点。

## Q：HTTPS 完整握手流程？TLS 1.2 与 1.3 差异、证书链校验、会话复用？

**核心答案**：HTTPS = HTTP over TLS。TLS 1.2 经典 ECDHE 握手需要 2-RTT：ClientHello（随机数 + 密码套件 + SNI + 扩展）→ ServerHello（随机数 + 选定套件）+ Certificate + ServerKeyExchange（ECDHE 参数）→ ClientKeyExchange + ChangeCipherSpec + Finished → 服务端 Finished，随后对称加密传输。TLS 1.3 砍到 1-RTT：ClientHello 直接携带 key_share（ECDHE 公钥），ServerHello 即可算出密钥，后续证书都在加密通道里发；基于 PSK 的会话恢复可做到 0-RTT。证书链校验是从叶子证书逐级验签到系统内置根证书，并检查有效期、域名（SAN）、吊销状态与密钥用途。

**知识点解析**：

- TLS 1.2 ECDHE 握手报文序列（2-RTT 才能发应用数据）：

```http
Client                                          Server
------                                          ------
ClientHello ------------------------>
    (client_random, cipher_suites, SNI)
                                                 ServerHello
                                                 (server_random, chosen_suite)
                                                 Certificate        [证书链]
                                                 ServerKeyExchange  [ECDHE 公钥]
                                                 ServerHelloDone
ClientKeyExchange ------------------->           [客户端 ECDHE 公钥]
ChangeCipherSpec, Finished ----------->
                                                 ChangeCipherSpec, Finished
<------------------------------------------------ 应用数据（对称加密）
```

- 密钥推导：双方用 ECDHE 私钥 + 对端公钥算出相同的 pre-master secret，再结合两个随机数经 PRF 导出主密钥与六个密钥块（读/写方向的加密密钥、MAC 密钥、IV）。RSA 密钥交换（预主密钥用服务器公钥加密）不具备前向保密——服务器私钥泄露可解密历史流量，TLS 1.3 已彻底删除。
- TLS 1.3 的关键改动：仅保留 (EC)DHE 与 PSK 两种密钥建立方式；套件瘦身为 AEAD only（如 TLS_AES_128_GCM_SHA256、TLS_CHACHA20_POLY1305_SHA256，MAC-then-encrypt 的 CBC 套件全部移除）；握手消息在 ServerHello 之后即加密（EncryptedExtensions/Certificate/CertificateVerify/Finished），证书不再明文裸奔，同时消除跨协议降级攻击面；握手从 2-RTT 降到 1-RTT，会话恢复支持 0-RTT。
- 证书链校验五步：构建链路（叶子 → 中间证书 → 根证书，根证书预置在 OS/浏览器信任库）并逐级验签；有效期（notBefore/notAfter）；域名匹配（SAN 字段，CN 已废弃）；吊销检查（CRL 黑名单 / OCSP 在线查询 / OCSP Stapling——服务端预先取好 OCSP 响应随握手下发，避免客户端查询慢与隐私泄露）；扩展约束（BasicConstraints 的 CA:TRUE、KeyUsage/ExtKeyUsage、路径长度）。中间证书缺失是部署最常见故障，服务端必须下发完整链（nginx 的 `ssl_certificate` 应包含叶 + 中间）。
- 会话复用三条路：TLS 1.2 的 Session ID（服务端缓存会话状态，水平扩展需共享存储）与 Session Ticket（加密的状态票据交客户端保存，密钥泄露即可解密历史会话）；TLS 1.3 的 PSK 恢复——上次握手后服务端发 NewSessionTicket，客户端下次握手在 ClientHello 带 pre_shared_key + early_data，首个请求体随 0-RTT 数据直接发出。另有 TLS False Start（1.2 时代客户端不等 Finished 就发数据，等效 1-RTT）。

**加分项（P7 视角）**：

- 0-RTT 的重放风险：early data 不具备防重放性（攻击者可原样重发），必须只承载幂等请求（GET），或服务端用 ClientHello 中的 random 做单次去重；网关层（如 Cloudflare）会默认剔除非幂等 0-RTT 请求。
- 性能账本：完整成本 = TCP 1-RTT + TLS1.2 2-RTT（或 1.3 1-RTT）+ 首请求 1-RTT，高延迟链路上 TLS 1.3 对首字节时间提升约 1 个 RTT；配合会话票据 + False Start，二次访问可逼近 0-RTT。能现场算这笔账是加分点。
- 运维视角：证书透明度（CT Log，SCT 嵌入证书/X.509 扩展或 TLS 扩展）用于发现错误签发；私钥不落 CDN 的 Keyless SSL（CDN 只做握手代理，签名回源）；双向认证 mTLS 用于服务间零信任。
- 故障案例：跨机房部署多套证书但 LB 未同步中间证书，导致部分节点安卓旧机型（不自动补链）报"证书链不完整"；OCSP 查询被墙导致握手卡 10 秒——切 OCSP Stapling 后恢复，这类真实案例非常加分。

## Q：GET/POST 的语义差异？什么是幂等性？幂等 API 如何设计？

**核心答案**：语义层面 GET 是"安全"方法（不改变服务器状态，幂等），POST 是"提交数据处理"（不安全、不幂等）——这是 RFC 7231/9110 的规范定义，与"GET 不能有 body、POST 参数放 body"的实现习惯是两回事（GET 规范上允许 body 但语义未定义，浏览器/代理普遍忽略）。幂等性指同一请求执行一次与执行多次的效果相同：PUT（整体替换）、DELETE、GET 幂等，POST 与 PATCH（默认）不幂等。幂等 API 设计的核心是防重：客户端生成唯一幂等键（Idempotency-Key），服务端首次执行后持久化"键 → 结果"，重复请求直接返回缓存结果或 409。

**知识点解析**：

- 语义四象限：GET/HEAD/OPTIONS 安全且幂等；PUT/DELETE 不安全但幂等；POST 不安全不幂等；PATCH 语义上不保证幂等（PATCH/JSON Merge Patch 幂等，JSON Patch 的 add/remove 操作不幂等）。
- 幂等性的判别标准是"服务端最终状态"，不是"响应相同"：DELETE 第一次返回 204、第二次返回 404，但资源都处于"已删除"状态，所以 DELETE 是幂等的。
- 浏览器行为差异：GET 会被缓存、可被收藏/分享、URL 进历史记录（敏感信息泄漏风险）；POST 不缓存、不保留 body 于历史。表单提交后刷新时 POST 会触发"重新提交"确认，根因就是 POST 不幂等。
- 防重设计（防重放≠防重）：网络重试、用户双击、消息队列 at-least-once 投递都会造成重复 POST。标准方案：

```http
POST /api/orders
Idempotency-Key: 7f3e9a2c-1b8d-4f5e-9c2a-6d8e0f1a2b3c
Content-Type: application/json

{ "skuId": "A103", "quantity": 2 }
```

```js
// 服务端幂等处理伪代码（Redis SETNX + MySQL 唯一键双保险）
async function handleOrder(req) {
  const key = req.headers['idempotency-key'];
  // 1. 快路径：已完成的请求直接回放结果
  const cached = await redis.get('idem:' + key);
  if (cached) return JSON.parse(cached);

  // 2. 抢锁：处理中的并发请求返回 409/425
  const locked = await redis.set('idem:lock:' + key, '1', 'NX', 'EX', 30);
  if (!locked) return { status: 409, body: { msg: '请求处理中，请勿重复提交' } };

  try {
    // 3. 业务唯一键兜底（唯一索引），防 Redis 故障窗口漏防
    const order = await createOrder({ idemKey: key, ...req.body });
    await redis.set('idem:' + key, JSON.stringify(order), 'EX', 86400);
    return { status: 201, body: order };
  } catch (e) {
    await redis.del('idem:lock:' + key); // 失败允许重试
    throw e;
  }
}
```

- 前端配合：提交按钮置灰 + loading；拦截 5xx 自动重试时只对幂等请求（GET/PUT/DELETE 或带幂等键的 POST）重试；弱网下把"用户操作"与"网络重试"解耦（本地队列去重）。

**加分项（P7 视角）**：

- 幂等键生命周期管理：Stripe 规定键在 24h 内去重、之后可复用，且要求请求参数与首次一致否则 422——键要绑定"操作语义指纹"（路径 + 参数哈希）而不仅是用户输入。
- 分布式陷阱：Redis 主从切换丢锁的窗口，必须靠数据库唯一索引（idem_key 列 UNIQUE）做最终防线；锁的 TTL 要覆盖最长处理时间，否则长事务期间锁过期导致双写。
- 更高阶：把"提交"建模为状态机（草稿 → 待支付 → 已支付），用乐观锁（If-Match: ETag / version 字段）或状态前置条件（`UPDATE orders SET status='paid' WHERE id=? AND status='unpaid'`）实现条件更新，影响行数为 0 即重复请求，天然幂等且不依赖外部存储。

## Q：状态码全解：301/302/307/308 的区别？304 的完整决策链？429/451 是什么？

**核心答案**：301/302 是历史包袱——规范允许浏览器把 302 的 POST 重定向降级为 GET（实践中浏览器对 301/302 都这么干）；307/308 是为修复这个歧义引入的：307 临时重定向、308 永久重定向，都严格保持原方法与 body 不变。304 Not Modified 是条件请求的产物：缓存过期后客户端带 If-None-Match（ETag）或 If-Modified-Since 发起再验证，资源未变则服务端只回 304 空体，省掉 body 传输。429 Too Many Requests 表示限流触发（配合 Retry-After 告知等待秒数）；451 Unavailable For Legal Reasons 表示因法律原因拒绝访问（政府审查、版权下架）。

**知识点解析**：

- 重定向矩阵（核心考点）：

| 状态码 | 永久性 | 保持方法 | 典型场景 |
| --- | --- | --- | --- |
| 301 | 永久 | 否（POST 可能降级 GET，未规范强制） | 域名迁移、http 转 https |
| 302 | 临时 | 否（同上） | 未登录跳登录页、活动页跳转 |
| 303 | 临时 | 强制转 GET | POST 后跳转到结果页（PRG 模式） |
| 307 | 临时 | 严格保持 | POST 表单临时换地址、HSTS 内部跳转 |
| 308 | 永久 | 严格保持 | API 网关迁移（POST 语义无损） |

- 301 的缓存陷阱：301 会被浏览器长期缓存（无显式 Cache-Control 时 Chrome 默认近似永久），配错后即使用户访问原 URL 也直接进新地址，"改回来"必须用 Cache-Control: no-cache 或新 URL 通知——线上事故高发点。
- 304 完整决策链（缓存协商）：
  1. 命中缓存且未过期（fresh：age < max-age 或未过 Expires）→ 直接用缓存，不发请求（200 from disk/memory cache）。
  2. 缓存过期（stale）但存在强校验器 → 发条件请求，`If-None-Match: "abc123"`（多个 ETag 用逗号分隔）。
  3. ETag 匹配则回 `304 Not Modified`（可携带更新的 Cache-Control），不匹配回 200 + 全量 body。
  4. 无 ETag 时退化用 `If-Modified-Since: Wed, 21 Oct 2026 07:28:00 GMT`，与 Last-Modified 精确比较；两者同发时 ETag 优先（秒级精度不够 + 内容不变时间变的场景）。
  5. 携带 `Cache-Control: no-cache` 的资源每次都要走 2-4 步再验证；`must-revalidate` 禁止过期后直接使用陈旧缓存。

```http
GET /app.js HTTP/1.1
If-None-Match: "a17f-3c2b91f0"
If-Modified-Since: Wed, 16 Sep 2026 03:12:00 GMT

HTTP/1.1 304 Not Modified
Cache-Control: public, max-age=3600
ETag: "a17f-3c2b91f0"
```

- 强校验器与弱校验器：`ETag: "abc"` 强（字节级一致才匹配），`W/"abc"` 弱（语义一致即可），集群部署时各节点 ETag 生成算法不一致会导致命中率雪崩——要么统一算法，要么用弱 ETag/Last-Modified。
- 429 语义：触发限流；`Retry-After: 5`（秒数或 HTTP 日期）是标准回退依据，前端应读取它做退避而非盲目重试；常配套 `X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset` 三件套。
- 451 语义：因法律原因不可提供（RFC 7725），响应可带 `Link: <https://example.com/legal>; rel="blocked-uri"` 说明封禁依据；与 403 的区别在于 403 是服务方意愿，451 是外部法律强制。常被滥用，DevTools 里看到它先想"是不是整个地区被监管下架"。

**加分项（P7 视角）**：

- Vary 对缓存键的影响：`Vary: Accept-Encoding, Cookie` 表示缓存以 URL + 这些请求头的取值为键；Vary: * 等价于 no-store。CDN 场景下 Vary 配置错误（对 CDN 不识别的头 Vary）会直接把命中率打到零。
- 304 也有成本：每次仍需一次完整 RTT，对高频刷新的静态资源，正确姿势是文件名哈希 + `Cache-Control: max-age=31536000, immutable` 彻底免请求，304 方案只用于 HTML 入口这类不能改名的资源。
- 429 的限流维度设计：按 API Key / 用户 / IP / 接口权重多维限流，返回头里暴露剩余配额让客户端主动降速（自适应限速），比"打爆后全家 429"体验好一个量级。

## Q：TCP：三次握手/四次挥手、滑动窗口、拥塞控制对前端的影响（慢启动）？

**核心答案**：三次握手（SYN → SYN+ACK → ACK）本质是双方各自确认"我能发你能收"的四个状态确认，第二次合并发送故为三次，握手期间不能传数据，固定成本 1 个 RTT（TCP Fast Open 可在 SYN 携带数据）。四次挥手因为 TCP 全双工，两端各自关闭发送方向（FIN/ACK 分开发）。滑动窗口是接收方驱动的流量控制（rwnd，防接收缓冲区溢出），拥塞控制是发送方对网络的试探（cwnd，防网络过载），实际发送上限 = min(rwnd, cwnd)。对前端最直接的影响是慢启动：新连接 cwnd 从约 10 个 MSS（Linux 初始拥塞窗口 10，内核默认）开始指数增长，RTT 200ms 的链路上前几个 RTT 只能发几十 KB——大文件首包慢、新连接频繁建立反而更慢，这正是 HTTP/2 多路复用与 keep-alive 的价值所在。

**知识点解析**：

- 三次握手序列与状态机：客户端 SYN_SENT → 服务端 SYN_RCVD → ESTABLISHED ×2；SYN 包带 ISN（初始序列号，随机化防历史重复段与序号预测攻击）。SYN Flood 攻击打的就是"半连接队列"，服务端用 SYN Cookie 无状态防御。
- 四次挥手：主动方 FIN → 被动方 ACK（此时被动方可能还有数据要发）→ 被动方 FIN → 主动方 ACK + TIME_WAIT（2MSL，约 1-4 分钟）。TIME_WAIT 存在的意义：保证最后的 ACK 丢失可重传、让旧连接的重复报文在网络中自然死亡；高并发短连接下 TIME_WAIT 堆积耗尽端口——所以长连接复用（keep-alive/连接池）是标配。
- 滑动窗口（流量控制）：接收方在每个 ACK 里通告 rwnd（接收缓冲剩余），窗口缩到 0 时发送方暂停并周期性发 Zero Window Probe。窗口更新被丢会导致"糊涂窗口综合症"。对前端：浏览器为每域名维护连接池（HTTP/1.1 默认 6 条），单条连接上响应必须排队——这不是 TCP 限制而是 HTTP/1.1 语义限制。
- 拥塞控制四阶段（以 Reno 为例）：
  - 慢启动：每 RTT cwnd 翻倍（每收到一个 ACK 加 1 个 MSS，指数增长），直到 ssthresh。
  - 拥塞避免：cwnd 每个 RTT 线性 +1 MSS。
  - 快重传：连续 3 个重复 ACK 立即重传丢失段，不等超时。
  - 快恢复：快重触发的拥塞按"减半 ssthresh，cwnd = ssthresh"处理而非回到 1；只有 RTO 超时才回到慢启动。
- 慢启动对前端的量化影响：cwnd=10 MSS（约 14KB）起步，RTT=100ms 时，首 RTT 传 14KB、次 RTT 28KB……加载 1MB 首屏 JS 需要约 7 个 RTT 仅用于爬坡，叠加 TLS 握手与 TTFB，总延迟可能超过 1.5s。所以：减少连接数（域名收敛）、减少 RTT（HTTP/3、CDN 边缘节点把 RTT 从 200ms 压到 20ms）、减少请求数（打包/内联/预连接）。
- BBR 拥塞控制：基于带宽与 RTT 建模而非丢包信号，不排空缓冲区，在长肥管道（高带宽高延迟）上吞吐显著优于 Reno/CUBIC，Google 全站与 QUIC 均在用；代价是需要内核 4.9+ 且对缓冲区有要求。

**加分项（P7 视角）**：

- TCP 调优与前端的关系：增大初始拥塞窗口（initcwnd）可明显改善小资源首屏——CDN 厂商普遍调大 initcwnd；服务器开启 TCP Fast Open + TLS False Start 可把"新建连接发首请求"的延迟从 3-RTT 压到 1-RTT。
- 慢启动 × HTTP/2 的隐性耦合：H2 单连接意味着整个站点共享一个 cwnd 爬坡过程，冷启动页面在 H2 下首个 RTT 内可传数据量反而小于 6 连接的 H1（6 × 10 MSS）；这是"HTTP/2 不一定更快"的根因之一，解法是服务端 warm-up（预建连接）与 resource hint 的 preconnect。
- 线上案例思路：弱网地区（丢包 5%+）下载速度被 cwnd 反复减半打崩，定位方法是对比"客户端实测吞吐"与"带宽 × RTT 理论窗口（BDP）"，若实测远小于 BDP 则是拥塞控制受限，可换 QUIC/BBR 或增加并发连接绕过单连接窗口限制。

## Q：WebSocket：握手升级协议、心跳、粘包处理？对比 SSE/长轮询？

**核心答案**：WebSocket 通过一次 HTTP Upgrade 握手劫持 TCP 连接：客户端发 `Upgrade: websocket` + `Sec-WebSocket-Key`（16 字节随机值的 base64），服务端返回 101 + `Sec-WebSocket-Accept`（Key 拼 GUID 后 SHA-1 再 base64，证明服务端理解协议而非普通 HTTP 代理），之后通道变成双向二进制帧协议，帧头含 FIN/opcode/MASK/长度（7 位、16 位、64 位三种长度编码）。心跳用 Ping/Pong 控制帧（opcode 0x9/0xA），客户端预期时间内收不到 Pong 判定假死并重连。粘包是 TCP 字节流本质——WebSocket 帧没有"消息边界"问题的前提是帧本身有长度字段，但业务消息可能被拆成 continuation 帧或多个消息到达同一数据块，需按 opcode 与 FIN 位重组。方案选型：服务端单向推送选 SSE（纯 HTTP、自动重连、HTTP/2 下多路复用），双向低延迟选 WebSocket，兼容性/穿透优先选长轮询。

**知识点解析**：

- 握手报文：

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://example.com

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

- 帧结构（关键位）：FIN=1 表示消息最后一帧；opcode：0x0 延续帧、0x1 文本、0x2 二进制、0x8 连接关闭（可携带状态码如 1000 正常/1001 离开/1006 异常断开/1011 服务端错误）、0x9 Ping、0xA Pong；MASK=1 时载荷被 32 位掩码 XOR（客户端到服务端强制掩码，防缓存投毒攻击），掩码密钥在帧头中明文传输，它防的是中间代理而非窃听。
- 心跳设计：客户端每 30s 发 Ping；超 10s 未收 Pong 判假死，主动 close + 指数退避重连（1s/2s/4s…上限 30s，加随机抖动防"重连风暴"）。浏览器原生 WebSocket 不暴露 sendPing，需自查 bufferrdAmount 或用 Ping/Pong 由服务端发起、客户端自动回 Pong 的模式。

```js
class WsClient {
  constructor(url) {
    this.url = url;
    this.retry = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => { this.retry = 0; this.startHeartbeat(); };
    this.ws.onmessage = (e) => this.handleMessage(e.data);
    this.ws.onclose = (e) => {
      this.stopHeartbeat();
      if (e.code !== 1000) this.scheduleReconnect(); // 非正常关闭才重连
    };
  }

  startHeartbeat() {
    this.lastPong = Date.now();
    // 浏览器端用业务级心跳：定时发 {"type":"ping"}，服务端回 pong
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPong > 10000) {
        this.ws.close(4000, 'heartbeat timeout'); // 触发 onclose 重连
        return;
      }
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
  }

  scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.retry++, 30000);
    setTimeout(() => this.connect(), delay + Math.random() * 1000);
  }
}
```

- 粘包/半包处理：TCP 是字节流，一次 message 事件可能含半条或多条业务消息。文本协议用分隔符（`\n`）切分，二进制协议用"长度前缀"（头 4 字节大端长度 + payload）：

```js
// 二进制协议：[4 字节长度][payload]，累积缓冲后按长度切包
class Unpacker {
  constructor() { this.buf = Buffer.alloc(0); }

  push(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    const messages = [];
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32BE(0);
      if (this.buf.length < 4 + len) break; // 半包，等下一次数据
      messages.push(this.buf.subarray(4, 4 + len));
      this.buf = this.buf.subarray(4 + len); // 可能粘着下一条
    }
    return messages;
  }
}
```

- 三方案对比：长轮询——服务端 hold 住请求直到有数据或超时，实现简单但每条消息一个完整 HTTP 开销、有消息乱序与并发连接上限问题；SSE——`Content-Type: text/event-stream`，单向（服务端→客户端），EventSource 自带重连（Last-Event-ID 续传），HTTP/2 下多个流共存一条连接，穿透所有代理/CDN；WebSocket——全双工、二进制、低开销（帧头 2-14 字节），但需独立网关/负载均衡配置（如 nginx proxy_read_timeout、sticky session 或分布式 pub/sub），断线重连与消息补偿要自己做。

**加分项（P7 视角）**：

- 分布式 WebSocket 架构：连接与业务解耦——网关层只管连接，消息经 Redis Pub/Sub / Kafka 广播到目标用户所在节点；百万连接需独立 TCP 负载均衡（L4 + Connection ID 路由或一致性哈希），握手鉴权用 URL query 短期 token 或首条消息鉴权（避开自定义 Header 不能用于浏览器 WebSocket 的限制）。
- 消息可靠性：WebSocket 自身只有帧级无确认语义，重要消息需应用层 ACK + 服务端离线队列 + 客户端 reconnect 后按序号拉取（seq + gap 检测），本质是把 TCP 可靠传输在业务层重做一遍，能讲清这层"为什么不信任底层"的取舍是亮点。
- 选型反模式：纯通知类场景（站内信、行情推送）用 WebSocket 是过度设计——SSE + HTTP/2 复用 + CDN 兼容性天然更优；需要双向高频交互（协作编辑、游戏、语音信令）才值得付 WebSocket 的运维成本。

## Q：DNS 解析链路与缓存层级？HTTPDNS 解决什么问题？

**核心答案**：完整解析链路是：浏览器 DNS 缓存 → OS 缓存（hosts / 系统解析器）→ 本地递归解析器（运营商 LDNS）→ 迭代查询根（.）→ 顶级域（.com）→ 权威 DNS（域名所属），逐层缓存且各层独立 TTL。递归解析器拿到记录后按 TTL 缓存，权威侧改解析但 TTL 未过期时全网仍可能返回旧值。HTTPDNS 把"域名解析"从 UDP 53 的 DNS 协议搬到普通 HTTPS API：客户端直接向 HTTPDNS 服务请求目标域名的 IP，绕开运营商 LDNS。它解决两大问题：一、防劫持——传统 DNS 明文 UDP，运营商可插入应答（广告、错误页）；二、调度精度——传统 CDN 调度基于 LDNS 出口 IP 定位，LDNS 与用户真实位置/网络不符（省网出口、教育网跨省）会导致调度错误，HTTPDNS 直接拿到客户端真实 IP，精准按地理位置与运营商调度。

**知识点解析**：

- 缓存层级（由近及远）：Chrome 内置 DNS 缓存（chrome://net-internals/#dns，约 60s 起按 TTL）、OS（Windows DNS Client 服务 / systemd-resolved / hosts 文件优先级最高）、路由器、运营商递归、根/顶级域的 TTL 通常只有 48h 级别。任意一层命中即短路返回。
- 递归 vs 迭代：客户端到 LDNS 是递归（"你必须给我答案"），LDNS 到根/TLD/权威是迭代（"你再去问谁"）。A 记录查询典型耗时：缓存命中 0ms，全链路未命中 50-200ms+（跨多次 RTT），首屏性能不可忽视。
- 记录类型：A/AAAA（IP）、CNAME（别名，CDN 接入标准做法：`www.example.com CNAME cdn.provider.com`，CDN 的权威 DNS 再按来源返回边缘节点 IP）、MX（邮件）、NS（权威服务器）、TXT（SPF/验证）、SRV。CNAME 不能与其他记录共存于同一节点（根域要指 IP 又要配 MX 的经典冲突，解法是 CNAME Flattening）。
- 传统 DNS 的三个痛点：明文可劫持/污染（UDP 53 应答可伪造，最早连源端口都固定）；LDNS 缓存导致调度失真（CDN 视角"用户"其实是 LDNS 出口）；跨网探测不准（某省电信用户走了联通 LDNS，被调到联通节点，跨网访问质量差）。
- HTTPDNS 工作机制：客户端（App 内 SDK）向 `https://dns.example.com/d?domain=img.example.com` 请求，返回带签名的 IP 列表 + TTL；客户端直接用 IP 建连，但 SNI/Host 仍写域名（否则证书校验失败、虚拟主机路由错）。SDK 需处理：请求失败回退系统 DNS、IP 测速选优、TTL 过期前异步刷新、HTTPS 证书校验（IP 直连时要用域名 SNI 或预置证书）。
- 加密 DNS 的浏览器方案：DoH（RFC 8484，DNS over HTTPS，走 443）、DoT（RFC 7858，853 端口）、DoQ（QUIC）。浏览器可指定 DoH 服务器（如阿里/Google 1.1.1.1），同时带来运营商 LocalDNS 失效的调度问题与合规争议；ECH（Encrypted Client Hello）进一步加密 TLS SNI，与 DoH 组合才能防域名窥探。

**加分项（P7 视角）**：

- 前端可用的 DNS 优化：`<link rel="dns-prefetch" href="//cdn.example.com">` 提前解析第三方域名；`<link rel="preconnect" href="//cdn.example.com" crossorigin>` 直接完成 DNS+TCP+TLS（含匿名证书匹配的 crossorigin 陷阱：字体跨域必须加 crossorigin 才能复用连接）。
- TTL 的运维权衡：切换 IP 的生效时间 = TTL + 各层缓存的实际遵守程度（有些 ISP 强制最小 TTL）；容灾切换要"提前把 TTL 降到 60s"，切完再调回。做灰度发布时把 DNS 当流量开关是大忌（不可控缓存），应该用业务层网关路由。
- 秒级生效方案：客户端 SDK 做"解析结果版本化 + 推送失效"（长连接下发新解析），把 DNS 生效时间从 TTL 级压到秒级——CDN 容灾与封禁拦截的真实需求，能讲到这一层说明有生产经验。

## Q：CDN 原理：回源、边缘缓存、动态加速？命中率如何优化？

**核心答案**：CDN 是"把内容放到离用户最近的边缘节点"的分布式缓存网络。接入方式是 CNAME：业务域名 CNAME 到 CDN 厂商域名，厂商的权威 DNS 按请求来源（LDNS IP 或 HTTPDNS 上报的真实 IP）返回最优边缘节点 IP。边缘节点缓存未命中时回源（源站/中间层/二级 CDN）拉取并按缓存策略缓存；命中则直接返回。静态加速解决"可缓存内容"的就近分发；动态加速解决不可缓存内容（API）的传输层优化——通过私有骨干网/专线 + TCP 参数调优 + 协议优化（内部 QUIC）降低回源 RTT。命中率优化的核心公式：命中率 = 命中请求 / 总请求，手段是规范化缓存键（Vary/查询参数治理）、设置合理的边缘缓存 TTL 与源站缓存头、预热、避免缓存穿透。

**知识点解析**：

- 回源决策链：边缘节点收到请求 → 查本地缓存（键 = URL + Vary 指定的头）→ 未命中查父节点/中间层 → 仍未命中回源。回源比例与延迟是核心指标；回源风暴（热点资源同时过期）可用请求合并（request coalescing，同一资源并发回源只放一个请求）防御。
- 边缘缓存命中标准头：源站响应的 Cache-Control / Expires 决定边缘缓存时长；`Cache-Control: no-store/private` 不缓存；CDN 通常忽略 Set-Cookie 响应或直接不缓存带 Cookie 的响应。CDN 层常提供"状态码缓存"（404 也能缓存 10s 防穿透）与"忽略源站头强制覆盖 TTL"的配置。
- 动态加速（DCDN/全站加速）：API 不可缓存，加速靠"路径优化"——用户与边缘节点建立连接（短 RTT），边缘与源站走厂商优化骨干网（BGP 选路/专线），配合 TCP 代理、连接复用、动态压缩、ROCE/QUIC 内部协议，把公网多跳不稳定路径换成可控路径；对 POST 请求还可用 Edge 侧做请求聚合与协议转换。
- 命中率优化清单（可直接落地的优先级）：
  1. 缓存键治理：URL 规范化——去掉统计参数（utm_*、分享 id），避免同内容不同 query 造成键分裂；Vary 只保留必要头。
  2. 分层 TTL：HTML 短 TTL（60s，s-maxage）+ 静态资源文件名哈希 + `max-age=31536000, immutable`；API 用 s-maxage + stale-while-revalidate。
  3. 预热：大促前主动 push 热点 URL 到边缘节点，避免冷启动集中回源。
  4. 穿透防御：对不存在的资源短缓存 404/421；用 BloomFilter/网关拦截非法路径。
  5. 观测：边缘日志聚合出命中率、回源率、回源带宽——按域名/路径维度定位键分裂。
- stale-while-revalidate 语义：`Cache-Control: max-age=60, stale-while-revalidate=600`——过期后 600s 内可直接返回陈旧内容同时异步再验证，既保命中率又保新鲜度，是 API/HTML 类资源的黄金配置（需 CDN 支持，Vercel/Cloudflare 均支持）。

**加分项（P7 视角）**：

- 多级缓存架构：浏览器 → Service Worker → CDN 边缘 → CDN 中间层 → 源站网关 → 应用本地缓存（LRU）→ Redis → DB。优化收益从外向内指数递减，架构优化顺序永远先打外层——能讲出这个分层框架和每层失效策略的联动（如发版后 SW 版本失效触发边缘 key 变化）是亮点。
- 命中率的经济学：CDN 按边缘带宽计费、回源流量常单独计费（更贵），命中率从 90% 提升到 98% 不仅省延迟，直接省真金白银；算一笔账（假设 10Gbps 边缘流量，回源单价比边缘高 30%，命中率每降 1% 的成本增量）会非常加分。
- 一致性难题：CDN 缓存导致内容更新不及时，标准解法是"版本化 URL 主动失效"——发布时调 CDN 刷新 API（purge）+ 文件名哈希让旧 URL 永久 immutable；HTML 入口用短 TTL + stale-while-revalidate；灰度场景用 cookie/头分流绕开边缘缓存（但会掉命中率，需权衡）。

## Q：Cookie 与 Token 鉴权：JWT 结构/续期/注销难题、双 token 方案？

**核心答案**：Cookie 是浏览器提供的自动携带机制（同源请求自动附上、支持 HttpOnly 防 JS 读取、SameSite 防 CSRF），Token 是应用层协议（Authorization: Bearer，无状态可验证，不依赖浏览器机制，天然适合跨域/小程序/App，但存 localStorage 有 XSS 风险、需手动管理续期）。JWT 是 Token 的一种自包含格式：`header.payload.signature` 三段 base64url，签名（HS256/RS256/ES256）保证不可篡改，payload 携带 uid、过期时间等 claims；最大优点是网关/服务本地验签免查库，最大缺点是无法主动失效——纯无状态 JWT 无法注销。生产标准解法是双 token：短效 access token（5-30 分钟）+ 长效 refresh token（天级，HttpOnly Cookie 存储、只走刷新接口），配合"刷新时轮换 refresh token + 重用检测"实现"近似可注销"。

**知识点解析**：

- JWT 结构与验证：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjEsImV4cCI6MTc1ODUxMjM0NX0.Kx2fS...
```

```js
// 三段：header（算法）. payload（claims）. signature
// signature = HMAC_SHA256(base64(header) + "." + base64(payload), secret)

// 服务端验签（无需查库，网关本地即可）
function verify(token, secret) {
  const [h, p, s] = token.split('.');
  const expect = hmacSha256(h + '.' + p, secret);
  if (!timingSafeEqual(expect, s)) throw new Error('签名不符');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (payload.exp < Date.now() / 1000) throw new Error('已过期');
  return payload; // 信任 uid 等 claims
}
```

- HS256 vs RS256/ES256：HS256 共享密钥，签发与验证同一密钥（泄露即全线失守，且验证方也能签发）；RS256/ES256 非对称——私钥签发（认证中心独占），公钥验证（各微服务/网关持有公钥，无法伪造），配合 JWKS 端点（`/.well-known/jwks.json`）动态下发公钥，是多服务/多团队的标准选择。
- JWT 注销难题的四种解法与代价：短 TTL 硬扛（用户被登出要等最长 TTL）；黑名单（Redis 存 jti，验签后再查黑名单——又变回有状态，但状态量小、只在"注销"场景引入）；版本号（用户表存 token_version，payload 带 version，改库踢全端——常用于改密码/封号）；网关统一吊销（access token 短 + refresh 拒绝刷新，最多 TTL 内残余风险）。
- 双 token 完整流程：登录签发 access（内存即可）+ refresh（HttpOnly Cookie + Secure + SameSite=Strict，前端 JS 拿不到，天然防 XSS 窃取）；access 过期后前端静默刷新（401 拦截 → 刷新接口（只带 refresh）→ 新 access + 新 refresh 轮换 → 重放失败请求）；刷新接口并发去重（多 tab 同时刷新，全局单一 in-flight promise）；refresh 也失效则跳登录页。
- 刷新轮换 + 重用检测（rotation + reuse detection）：每次刷新签发新 refresh 并将旧的计入"已用但未过期"名单；若旧 refresh 再次被使用，说明 token 被盗（正常客户端永远用最新值），立即吊销该用户全系 refresh token 强制重新登录——这是 OAuth 2.1 推荐的安全水位。

**加分项（P7 视角）**：

- 存储矩阵：HttpOnly Cookie（防 XSS 读取，但同源自动携带、有 CSRF 面）vs localStorage（防 CSRF，但 XSS 即失守）；安全本质是"XSS 与 CSRF 的责任转移"，正确答案永远是纵深防御：HttpOnly 存 refresh + 内存存 access + CSP 收敛 XSS 面 + SameSite 收敛 CSRF 面。
- JWT 膨胀问题：payload 明文（base64 可解，不能放敏感数据）且每个请求都全量携带，十几条业务 claim 时单 header 2-4KB，H2 连接上反复 HPACK 增量压缩可缓解但仍占流控窗口——实践是 JWT 只放 uid + exp + jti + version，业务信息查缓存。
- 能讲清"为什么 logout 按钮点了但接口还能用 10 分钟"是设计权衡而非 bug（access 短 TTL 残余风险 + 服务端关键操作二次校验兜底），并能说出金融场景用"每请求在线校验"换安全性的取舍，是 P7 的判断力体现。

## Q：跨域认证：SameSite 演进、第三方 Cookie 治理与替代方案？

**核心答案**：SameSite 是 Cookie 的跨站发送策略属性：Strict 完全禁止跨站携带（连外站跳转进来的首请求都不带，体验最安全）；Lax 允许顶级导航的 GET 携带（默认值，挡住跨站 POST 的 CSRF）；None 允许跨站携带但强制 Secure。演进时间线：2020 年 Chrome 80 将默认值从 None 改为 Lax（干掉了大部分 CSRF），2024 起推进第三方 Cookie 逐步淘汰（Privacy Sandbox）。第三方 Cookie 指在 a.com 页面里通过 iframe/img/script 向 b.com 发请求时携带的 b.com Cookie（站点由 eTLD+1 判定），它是跨站登录（IdP 单点登录）、广告归因、埋点识别的技术基座。替代方案按场景：嵌入方鉴权用 CHIPS（Partitioned Cookie，按顶级站点隔离）、Storage Access API（按需申请跨站存储）；单点登录用一级域名共享 Cookie（Domain=.example.com）或 FedCM（浏览器代理的联邦登录 API）；广告场景用 Privacy Sandbox 的 Topics/Attribution Reporting 等隐私保护 API。

**知识点解析**：

- SameSite 三档语义与判例：Strict——从微信点开链接进站不带 Cookie（用户已登录却显示未登录，体验差），适合 session 类高敏感；Lax——`<a>` 跳转、地址栏输入的 GET 带 Cookie，`<img>`、fetch、iframe、POST 表单全不带（Chrome 曾有 2 分钟 Lax+POST 例外已移除）；None——iframe 嵌套、跨站 fetch 必须显式声明，未带 Secure 的 None 直接被拒。
- 同站（same-site）≠ 同源（same-origin）：站点 = 注册域 eTLD+1（按 Public Suffix List 计算），`a.example.com` 与 `b.example.com` 同站不同源；`example.com` 与 `example.co.jp` 需 PSL 才能判定。端口与协议不参与站点计算，但 scheme 一致性（https→https）在 cookie 判定中逐渐生效。
- 第三方 Cookie 的三大依赖场景与技术替代：
  - 跨站 SSO（IdP iframe 里读 b.com 登录态）：替代是 FedCM（浏览器原生 UI 代理登录，不向嵌入方暴露 IdP Cookie）、顶级跳转式 OAuth（redirect 全页跳转，Cookie 属第一方）。
  - 第三方组件（客服、评论、播放器）需要登录态：CHIPS——`Set-Cookie: id=1; SameSite=None; Secure; Partitioned`，Cookie 按（b.com, 顶级站点）分区存储，b.com 无法再跨顶级站点串用户；Storage Access API——iframe 主动向用户申请跨站存储授权。
  - 广告/归因：Attribution Reporting API（注册 source/trigger 由浏览器归因上报，不暴露用户身份）、Topics API（兴趣粗粒度桶）、第一方数据 + 服务端归因（电商主流做法）。
- 各浏览器现状差异：Safari ITP 2018 年起全量拦截第三方 Cookie（并通过 7 天脚本可写 Cookie 失效进一步收紧）；Firefox ETP 默认严格；Chrome 多次推迟但方向不变（测试期 1% 灰度曾引发大量事故后回滚）。前端检测第三方 Cookie 可用 `document.requestStorageAccess()` 探测或Feature Policy。
- CSRF 与 SameSite 的关系：SameSite=Lax 挡掉了传统表单 CSRF，但同站子域（攻击者控制 `evil.example.com`）与历史 Lax 逃逸面依然存在——CSRF Token/Double Submit Cookie 仍是纵深防御的必要层，不能只依赖 SameSite。

**加分项（P7 视角）**：

- 迁移策略分层：能自主控制的域（集团产品）收敛到 Related Website Sets（同组织域名组声明，如 example.com 与 example-pay.com 跨 eTLD+1 视为同站）或统一一级域名 + Domain Cookie；无法控制的第三方组件逐个评估 CHIPS/Storage Access API 改造成本；广告归因整体迁向服务端第一方采集（埋点走自家域名的 `/collect` 反代）。
- 鉴权架构级替代：iframe 内静默续期（hidden iframe + postMessage 通知令牌）被逐步淘汰后，SPA 的跨域会话应走"顶级跳转授权换 code + PKCE"或 BFF（Backend for Frontend）——同源 BFF 转发 + HttpOnly Cookie 会话，前端完全不接触跨域 Cookie，是当下最稳的架构答案。
- 面试高频追问："Cookie 的 domain 属性能否解决跨域？"——不能跨 eTLD+1；"SameSite=None 在 localhost 调试为什么失效？"——非安全上下文，需 `chrome://flags` 放行或用 https 测试域。能主动覆盖这些边界说明有实操。

## Q：请求调度：并发限制、重试策略（指数退避/抖动）、超时如何设计？

**核心答案**：并发限制用"请求池"模式：任务入队，池内维持固定数量的在飞请求，一个完成立刻取下一个（本质是权重为 1 的信号量）。重试必须满足三个前提：请求可重试（幂等或带幂等键）、错误可重试（网络错误/超时/429/502/503/504，不重试 4xx 业务错）、重试有上限（默认 3 次）。指数退避（1s → 2s → 4s）叠加随机抖动（jitter），防止"雪崩后的同步重试风暴"（如网关重启瞬间，百万客户端同时在第 2 秒重试）。超时设计要区分连接超时/首字节超时/整体读超时，取值基于 P99 分位数加缓冲而非拍脑袋；对有明确 SLA 的接口设硬超时，超时即取消（AbortController），避免僵尸请求占满连接池。

**知识点解析**：

- 并发限制（手写高频，可直接背）：

```js
async function limitConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const [index, task] of tasks.entries()) {
    // 超出上限时等任意一个在飞任务结束（快路径：池未满不 await）
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
    const p = Promise.resolve()
      .then(task)
      .then((res) => { results[index] = res; })
      .finally(() => executing.delete(p));
    executing.add(p);
  }
  await Promise.all(executing);
  return results; // 保持结果有序
}
```

- 可重试判定矩阵：网络层错误（TypeError: Failed to fetch，连接被重置/DNS 失败）——幂等方法可重试；HTTP 429——读 Retry-After 头优先，否则退避；502/503/504——网关与超时类，可重试；401——先走一次刷新令牌再重放一次；400/403/404/422——业务错，重试无意义；POST——仅带幂等键才重试。
- 指数退避 + 全抖动（full jitter，AWS 推荐公式）：

```js
function backoff(attempt, baseMs = 1000, capMs = 30000) {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.random() * exp; // full jitter：[0, exp) 均匀分布
}

async function retry(fn, { retries = 3, retryOn } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (i === retries || !retryOn(err)) throw err;
      await new Promise((r) => setTimeout(r, backoff(i)));
    }
  }
  throw lastErr;
}
```

- 抖动的三种流派：无抖动（退避值固定，全部客户端同步）< 等抖动（退避值的一半加随机，分布集中在区间后半）< 全抖动（0 到退避值均匀分布，打散最彻底）。目标都是把"重试到达率"从尖峰抹平为均匀流量。
- 超时三层语义：fetch 的 AbortController 是整体超时；连接/首字节超时在浏览器侧不可直接控制（依赖底层栈），Node 侧可分别设；业务上应区分"慢但会成功"（分页列表 3s 可接受）与"必须快"（支付风控 800ms 超时走降级），用 SLA 反推。超时值参考监控 P99 + 适当余量（P99=1.2s 的接口设 3s，而不是一刀切 10s）。
- 竞态治理（调度的孪生问题）：搜索联想/切换 tab 场景，旧请求晚到覆盖新结果——用请求版本号或 AbortController 取消旧请求；fetch 原生不支持真取消底层连接（只是忽略结果），但能释放上层逻辑与连接池占位。

**加分项（P7 视角）**：

- 系统视角的重试预算（retry budget）：全局限速器 + 按服务设重试比例（如重试流量不超过总流量 10%-20%），否则"上游重试放大下游故障"——1 次用户请求被链路三层各重试 3 次 = 最多 64 次后端请求，是级联雪崩的经典成因；服务端可下发"不重试"信号（gRPC 的 retry_policy 头）。
- 熔断与重试的配合：连续失败达到阈值后熔断器打开，直接快速失败（不再重试打向故障节点），半开态探测恢复——重试解决瞬时抖动，熔断解决持续故障，二者边界要讲清。
- 前端可观测：把重试次数、超时率、队列等待时长打进埋点，按接口聚合出"客户端视角 SLA"，与后端 APM 对账能发现"后端 200 但前端超时"的诡异问题（多为代理层缓冲或 DNS/连接慢），有这个实践闭环是显著加分。

## Q：大文件上传下载：分片上传、断点续传（Range/If-Match）、秒传（哈希）？

**核心答案**：分片上传的核心是把文件 `Blob.slice` 切成固定大小块，逐块（或并发池）上传，全部成功后通知服务端合并，失败只重传单块。断点续传的上行方案是"初始化时询问服务端已有哪些块"（或本地持久化上传进度），只补传缺失块；下行方案是 HTTP Range 请求——`Range: bytes=1000-` 让服务端从偏移继续发（206 Partial Content），配合 `If-Range: "<ETag>"` 保证资源未变更才续传、变更则整文件重发。秒传基于内容寻址：上传前先算全文件哈希（SparkMD5 增量计算，放 Web Worker 避免卡主线程），服务端已有相同哈希的文件（物理存储唯一，数据库多记一条映射）则直接返回成功，一个字节都不传。

**知识点解析**：

- Range 语义族：`Accept-Ranges: bytes` 表示支持范围请求；请求 `Range: bytes=0-1023` 回 `206 Partial Content` + `Content-Range: bytes 0-1023/5289`；`bytes=500-` 开区间到末尾；`bytes=-500` 最后 500 字节；范围非法回 `416 Range Not Satisfiable`。`If-Match: "etag"` 是严格前置条件（不匹配回 412，适合"续传前确认文件没变过"）；`If-Range` 更贴合续传语义——匹配则 206 续传、不匹配则 200 全量，一次请求自动兜底。
- 哈希计算（增量 MD5，Worker 内跑，进度可上报）：

```js
// hashWorker.js：增量计算，避免整文件读入内存
importScripts('https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js');

self.onmessage = async (e) => {
  const { file, chunkSize } = e.data;
  const spark = new SparkMD5.ArrayBuffer();
  const total = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < total; i++) {
    const buf = await file.slice(i * chunkSize, (i + 1) * chunkSize).arrayBuffer();
    spark.append(buf);
    self.postMessage({ type: 'progress', percent: Math.round((i / total) * 100) });
  }
  self.postMessage({ type: 'done', hash: spark.end() });
};
```

- 完整上传器（秒传 + 分片 + 断点续传 + 并发池 + 单块重试）：

```js
class ChunkUploader {
  constructor({ chunkSize = 5 << 20, concurrency = 3, retries = 3 } = {}) {
    this.chunkSize = chunkSize;
    this.concurrency = concurrency;
    this.retries = retries;
    this.loaded = 0; // 已上传字节（进度用）
  }

  onProgress(cb) { this._cb = cb; }
  emit() { this._cb && this._cb(this.loaded, this.total); }

  calcHash(file) {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/hashWorker.js');
      worker.onmessage = ({ data }) => {
        if (data.type === 'done') { worker.terminate(); resolve(data.hash); }
      };
      worker.onerror = reject;
      worker.postMessage({ file, chunkSize: this.chunkSize });
    });
  }

  async upload(file, biz = {}) {
    this.total = file.size;
    const hash = await this.calcHash(file);           // 1. 内容指纹
    const init = await this.request('/api/upload/init', 'POST', {
      hash, filename: file.name, size: file.size, ...biz,
    });
    if (init.exists) { this.loaded = file.size; this.emit(); return init; } // 2. 秒传

    const { fileId, uploaded = [] } = init;           // 3. 断点续传：跳过已传块
    const done = new Set(uploaded);
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    const tasks = [];
    for (let i = 0; i < totalChunks; i++) {
      if (done.has(i)) { this.loaded += this.chunkSize; continue; }
      tasks.push(i);
    }
    this.emit();

    await this.pool(tasks.map((i) => () => this.uploadChunk(fileId, file, i))); // 4. 并发上传
    const merged = await this.request('/api/upload/complete', 'POST', { fileId, hash });
    return merged;                                     // 5. 通知合并
  }

  async uploadChunk(fileId, file, index) {
    const start = index * this.chunkSize;
    const blob = file.slice(start, Math.min(start + this.chunkSize, file.size));
    let lastErr;
    for (let i = 0; i <= this.retries; i++) {          // 单块重试，不影响其他块
      try {
        await this.request(`/api/upload/chunk?fileId=${fileId}&index=${index}`, 'PUT', blob, 'application/octet-stream');
        this.loaded += blob.size;
        this.emit();
        return;
      } catch (err) {
        lastErr = err;
        if (i < this.retries) await new Promise((r) => setTimeout(r, 500 * 2 ** i));
      }
    }
    throw lastErr;
  }

  async pool(fns) {                                    // 并发池
    const queue = [...fns];
    const runners = Array.from({ length: Math.min(this.concurrency, queue.length) }, async () => {
      while (queue.length) await queue.shift()();
    });
    await Promise.all(runners);
  }

  async request(url, method, body, contentType = 'application/json') {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': contentType },
      body: contentType === 'application/json' ? JSON.stringify(body) : body,
    });
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`);
    return res.json();
  }
}

// 使用
const uploader = new ChunkUploader({ chunkSize: 5 << 20, concurrency: 3 });
uploader.onProgress((loaded, total) => console.log(`${Math.round((loaded / total) * 100)}%`));
const result = await uploader.upload(fileInput.files[0], { folderId: 'root' });
```

- 断点续传下载（Range + If-Range，可中断恢复）：

```js
async function resumableDownload(url, onChunk) {
  const head = await fetch(url, { method: 'HEAD' });
  const etag = head.headers.get('ETag');
  const size = +head.headers.get('Content-Length');
  const state = JSON.parse(localStorage.getItem(url) || '{}'); // { offset, etag }
  let offset = state.etag === etag ? state.offset : 0;         // ETag 变了从头下

  while (offset < size) {
    const res = await fetch(url, {
      headers: { Range: `bytes=${offset}-`, 'If-Range': etag },
    });
    if (res.status === 200) offset = 0;                        // 资源已变，重下
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(value, offset);                                  // 写文件/拼 Blob
      offset += value.byteLength;
      localStorage.setItem(url, JSON.stringify({ offset, etag })); // 持久化进度
    }
  }
  localStorage.removeItem(url);
}
```

**加分项（P7 视角）**：

- 服务端视角的完整性保障：合并前校验全文件哈希（分块都成功也可能乱序/损坏）；存储层用"哈希即地址"（内容寻址存储，同哈希物理只存一份，天然去重——秒传的存储基础）；合并用 append + 原子 rename，避免半成品文件被访问。
- 大文件哈希的性能优化：10GB 文件全量 MD5 在低端机要分钟级，生产用"抽样哈希"（首块 + 尾块 + 每隔 N 块取 2MB）先探测秒传，命中免全量；未命中再全量兜底，配合 Web Worker + requestIdleCallback 分片让出主线程。
- 协议层面的坑：分块上传不要走 multipart 表单（boundary 拼接开销大），直接 PUT 二进制流；Nginx 默认 `client_max_body_size 1m` 会把 5MB 分块打成 413；网关/CDN 对 PUT 的缓冲（request buffering）会吃满磁盘，务必流式透传；能讲出这些部署细节是真实做过大文件系统的信号。

## Q：网络层故障排查：DevTools/抓包/HAR 分析方法论？

**核心答案**：排查方法论是"分层定位 + 二分收窄"：先确认是前端/网络/后端哪一层（用 DevTools Network 瀑布流的阶段拆分看时间花在哪），再确认是否可稳定复现（是否与地区/运营商/浏览器/登录态相关），最后取证归因（HAR/抓包/服务端日志三方对账）。DevTools 的 Timing 面板把每个请求拆为 Queueing → Stalled（DNS/连接排队）→ Initial Connection（TCP）→ SSL（TLS）→ Request Sent → Waiting TTFB → Content Download，每段对应不同的责任方；HAR 是标准化的 JSON 取证格式，能离线分享与脚本分析；抓包工具（Charles/Whistle/mitmproxy）解决"看不了 HTTPS 内容、要改请求重放、要模拟弱网"的场景。

**知识点解析**：

- Timing 各阶段的归因表（核心考点）：

| 阶段 | 含义 | 异常时的第一怀疑对象 |
| --- | --- | --- |
| Queueing | 浏览器排队（连接数满、低优先级被推迟） | HTTP/1.1 域名连接数超 6、preload 泛滥 |
| Stalled | 排队后等可用连接（含 DNS） | 连接池耗尽、keep-alive 被关闭 |
| Initial connection | TCP 三次握手 | RTT 高、跨运营商 |
| SSL | TLS 握手 | 证书链不全、OCSP 慢、未复用会话 |
| Request sent | 发请求体 | 上行带宽/超大 payload |
| Waiting (TTFB) | 等服务端首字节 | 后端慢（DB/下游）、网关排队 |
| Content Download | 下载响应体 | 带宽、CDN 回源、无压缩 |

- 快速分诊口诀：TTFB 高是"服务端/链路"问题（看后端 APM 与 CDN 日志）；Download 长是"体积/压缩"问题（看 Brotli/Gzip、图片格式）；Queueing/Stalled 高是"前端并发设计"问题（连接复用、域名收敛）；SSL+Connection 高是"握手成本"问题（会话复用、HTTP/3、preconnect）。
- HAR 分析要点：`_resource_type` 分类资源；`timings` 字段有 dns/connect/send/wait/receive/blocked（-1 表示不适用，如缓存命中无 connect）；`response.status` 与 `_transferSize`（网络传输量）vs `content.size`（解压后大小）的比值即压缩率；`serverIPAddress` 能定位实际命中的 CDN 节点。脚本化分析：把 HAR 拖进控制台跑 `entries.sort(by wait).slice(0, 10)` 找最慢请求。
- 抓包工具链分工：Charles/Whistle——HTTPS 解密（装根证书）+ Map Local（本地文件替换调试）+ Rewrite（改响应头/体）+ Throttle（弱网模拟）；mitmproxy——可编程代理（Python 脚本批量改写、自动化测试）；Wireshark——TCP/TLS 字节级分析（看重传、RST、窗口零）。移动端抓包：手机配代理 + 证书（iOS 需在设置里手动信任），App 用 SSL Pinning 时需越狱或开发版才可解。
- 命令行三件套（脱离浏览器的对照组，用于判断"是不是浏览器问题"）：

```bash
# DNS：确认解析是否被劫持/调度错误
nslookup img.example.com 8.8.8.8

# 全过程计时：DNS/连接/TLS/TTFB 各段耗时
curl -o /dev/null -s -w "dns:%{time_namelookup} connect:%{time_connect} tls:%{time_appconnect} ttfb:%{time_starttransfer} total:%{time_total}\n" https://example.com

# 证书链细节
openssl s_client -connect example.com:443 -servername example.com
```

**加分项（P7 视角）**：

- "仅用户复现"问题的排查路径：DevTools 无法远程看，用 Real User Monitoring（前端埋点上报 PerformanceResourceTiming 的全链路字段 + 省份/运营商/浏览器维度聚合）还原线上瀑布流；能讲出如何用 `PerformanceObserver` 采集并聚合出"分地区 TTFB P95"的方案，是从"会看面板"到"能建体系"的分水岭。
- 经典故障判例：页面白屏但接口全 200——最后定位是 CDN 返回了 JS 的 404 页面（MIME 不符被 CSP 拦截）；iOS 独享慢——HTTP/1.1 下 6 连接被埋点域名挤占（Queueing 尖刺）；弱网才失败——请求超时 < TCP 重传恢复时间，RTO 内未完成被 AbortController 砍掉。判例的"归因链"比结论更值钱。
- 能主动提"证据链闭环"：客户端 HAR + 网关访问日志（按 trace id 串联）+ 后端 APM 三方对时间戳，定位"延迟产生在哪一跳"，这是 P7 处理跨团队网络工单的标准动作。

## Q：实时性与弱网优化：RTT 优化、HTTP/3 0-RTT、离线队列？

**核心答案**：RTT 优化的思路是"减少往返次数 × 缩短单次距离"：连接层用会话复用/keep-alive 避免重复握手，TLS 1.3 降握手到 1-RTT，QUIC 0-RTT 让恢复连接的第一个请求随握手包直接发出；路径层用 CDN/边缘节点把物理 RTT 从跨洲 300ms 压到同城 20ms；请求层用 preconnect 提前建连、合并请求（batch）、HTTP/2 多路复用消除排队、Brotli 压缩减少传输量。弱网优化的关键词是"假设会失败"：请求失败进指数退避重试；不可达时操作进离线队列（IndexedDB 持久化，Service Worker Background Sync 在恢复网络后重放）；UI 层用乐观更新掩盖延迟；数据层做增量同步与超时降级。

**知识点解析**：

- RTT 三层优化清单：
  - 连接层：`Connection: keep-alive`（H1）默认长连接；TLS 会话票据复用把 2-RTT 降为 1-RTT；TLS 1.3 + QUIC 的 0-RTT（early data 随 ClientHello 发出，前提是服务端支持 PSK 恢复且客户端有缓存票据）。
  - 预热层：`<link rel="preconnect">` 在 HTML 解析期就完成 DNS+TCP+TLS（省 2-3 RTT，但要控制数量——每个 preconnect 占 10-50ms 开销且可能白建）；`dns-prefetch` 是其子集兜底（兼容 Safari 旧版）。
  - 数据层：合并碎片接口（BFF 聚合）、HTTP/2 Server Push（已废弃，改用 103 Early Hints 提前推关键子资源 URL）、Brotli（比 gzip 小 15-20%，`Content-Encoding: br`）、响应体按需裁剪（GraphQL 字段裁剪/字段级缓存）。
- HTTP/3 0-RTT 的边界：仅对"同一目标 + 已有 PSK"的重复连接生效；early data 有重放风险（只放幂等 GET）；中间盒子可能不支持 UDP 443，QUIC 建连失败自动回退 TCP（对用户透明，但优化收益归零）。因此 0-RTT 是"锦上添花"，连接复用才是基本盘。
- 离线队列的核心是"操作日志而非最终状态"：把用户操作序列化落盘，网络恢复后按序重放，天然支持冲突检测（版本号/时间戳）；关键是全局有序 + 幂等执行 + 失败可回退。

```js
class OfflineQueue {
  constructor(dbName = 'outbox') {
    this.db = null;
    this.syncing = false;
  }

  async open() { // IndexedDB 持久化，刷新/崩溃不丢
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('outbox', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('ops', { keyPath: 'id', autoIncrement: true });
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
  }

  async enqueue(op) { // op: { url, method, body, idempotencyKey, createdAt }
    await this.tx('readwrite', (store) => store.add(op));
    this.scheduleSync(); // 有网时立即尝试
  }

  async scheduleSync() {
    if (!navigator.onLine || this.syncing) return;
    this.syncing = true;
    const ops = await this.tx('readonly', (s) => s.getAll());
    for (const op of ops) {
      try {
        const res = await fetch(op.url, {
          method: op.method,
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': op.idempotencyKey },
          body: JSON.stringify(op.body),
        });
        if (res.ok || res.status === 409) {           // 409 视为已处理（幂等回放）
          await this.tx('readwrite', (s) => s.delete(op.id));
        }
      } catch (e) { break; }                           // 网络失败，等下次触发
    }
    this.syncing = false;
  }

  tx(mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('ops', mode);
      const req = fn(tx.objectStore('ops'));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = reject;
    });
  }
}

const queue = new OfflineQueue();
await queue.open();
addEventListener('online', () => queue.scheduleSync()); // 网络恢复触发重放
```

- Service Worker 的弱网三件套：Cache API 缓存静态资源与只读 API（stale-while-revalidate 策略）；Background Sync API 在浏览器后台（即使页面关闭）重放离线操作；请求拦截层统一注入超时/重试策略，把网络治理从业务代码中剥离。
- 乐观更新与回滚：提交即更新本地状态，失败时回滚 + 提示重试（离线进队列）；与离线队列配合时注意"乐观态 → 队列确认 → 服务端确认"三态的一致性，避免多端同步时闪烁。

**加分项（P7 视角）**：

- 实时性预算视角：把"用户操作到看见结果"拆成 RTT 链（输入 → 请求 → 网络 ×N RTT → 渲染），定预算再逐项砍——IM 已读回执可用 500ms 缓冲聚合批量上报，把 QPS 与 RTT 乘积同时降下来；能谈"哪些实时性是产品错觉"（输入框回显本地即时、状态条假进度）是高级视角。
- 弱网的本质矛盾：TCP 吞吐 ≈ min(rwnd, cwnd) × RTT 分之一，高延迟链路即使带宽大也快不起来，丢包还会触发拥塞退避——所以弱网优化首要目标是"减少往返次数"（合并请求/长连接/0-RTT）而非"压缩体积"；把 BDP（带宽时延积）概念引入讨论是显著加分。
- 离线优先架构（Offline-First）：本地 IndexedDB 为 Source of Truth，远端同步走操作日志 + 向量时钟/LWW 冲突消解（笔记类应用 Notion/Linear 的模型）；前端拿回"编辑权"（离线可写）后，架构复杂度数量级上升，能讲清"什么业务值得付这个成本"的判断框架，比背方案更重要。
