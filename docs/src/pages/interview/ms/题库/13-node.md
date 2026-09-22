# 13 Node.js

对标 7 年经验 P6/P7 前端：覆盖事件循环、Stream/Buffer、模块体系、多进程、Koa/Nest 框架原理、BFF/SSR 服务端场景与部署运维。每题给出可直接口述的核心答案、系统化知识点拆解与 P7 视角的源码层原理、方案权衡和生产案例。

## Q：Node 事件循环六阶段：timers/poll/check 各阶段职责？与浏览器事件循环的差异？

**核心答案**：Node 的事件循环由 libuv 的 `uv_run` 驱动，每一轮 tick 按固定顺序经过六个阶段：timers（执行到期的 `setTimeout`/`setInterval` 回调）、pending callbacks（执行上一轮延迟的系统级错误回调，如 TCP 的 ECONNREFUSED）、idle/prepare（libuv 内部使用）、poll（核心阶段，取出 I/O 完成事件执行回调，无任务时阻塞等待）、check（执行 `setImmediate` 回调）、close callbacks（执行 socket 的 'close' 等关闭回调）。每个阶段之间有「微任务检查点」：先清空 `process.nextTick` 队列，再清空 Promise 微任务队列。与浏览器最大的差异是：浏览器只有「宏任务队列 + 微任务队列」的二级模型，Node 按 I/O 类型分阶段调度；Node 11 之前 timers/check 整批回调执行完才切微任务，11 之后改为每个回调执行完就切（对齐浏览器）；且 `process.nextTick`、`setImmediate` 为 Node 独有。

**知识点解析**：

- timers 阶段：只执行「已到期」的 timer 回调；`setTimeout(fn, 0)` 实际被钳制为 1ms，连续嵌套超过 5 层会被钳到 4ms（与浏览器 HTML 规范一致），所以 timer 的语义是「不早于」，精度受系统调度影响。
- pending callbacks 阶段：执行延迟到下一轮的操作系统级回调，例如 TCP 收到拒绝连接后的部分错误上报，纯 JS 层几乎无感知。
- idle/prepare 阶段：仅供 libuv 内部使用，prepare 在进入 poll 前触发，一些 native 扩展和性能钩子挂在这里。
- poll 阶段（核心）：有到期的 I/O 事件就执行其回调；队列空时看有没有 setImmediate——有则不阻塞，直接进 check；没有则以「最近一个 timer 的到期时长」为上限阻塞等待，所以 poll 是事件循环停留最久的阶段。
- check 阶段：执行 `setImmediate`，紧跟在 poll 之后立刻到达，这是「I/O 回调内 setImmediate 永远先于 setTimeout」的原因。
- close callbacks 阶段：执行关闭事件回调，如 `socket.destroy()` 后触发的 'close' 事件。
- 与浏览器差异：浏览器是「宏任务清一个 → 清空微任务 → 渲染」，Node 是「分阶段清回调，阶段间切微任务」；浏览器没有 nextTick 队列；Node 11+ 与浏览器的差异已缩小到「阶段结构」本身。

```text
┌─────────────────────────────────────────────────────────────┐
│              Node 事件循环（libuv uv_run）每轮 tick           │
│                                                             │
│   ① timers          执行 setTimeout / setInterval 到期回调    │
│                          ↓                                  │
│   ② pending callbacks  执行延迟的系统级错误回调                │
│                          ↓                                  │
│   ③ idle, prepare    libuv 内部使用                          │
│                          ↓                                  │
│   ④ poll（核心）     执行 I/O 回调；空闲时按最近 timer 阻塞等待 │
│                          ↓                                  │
│   ⑤ check           执行 setImmediate 回调                   │
│                          ↓                                  │
│   ⑥ close callbacks  执行 'close' 事件回调                    │
│                          ↓                                  │
│      回到 ① 进入下一轮                                       │
│                                                             │
│   每个阶段之间（Node 11+ 为每个回调后）依次清空：               │
│   process.nextTick 队列  →  Promise 微任务队列                │
└─────────────────────────────────────────────────────────────┘
```

验证执行顺序的代码与实际输出：

```js
// 文件：loop-order.js，node loop-order.js
const fs = require('node:fs');

console.log('1 start 同步');

setTimeout(() => console.log('2 setTimeout 外层'), 0);
setImmediate(() => console.log('3 setImmediate 外层'));

fs.readFile(__filename, () => {
  // 该回调运行在 poll 阶段
  console.log('4 readFile 回调（poll）');
  setTimeout(() => console.log('5 内层 setTimeout（下一轮 timers）'), 0);
  setImmediate(() => console.log('6 内层 setImmediate（本轮 check）'));
  process.nextTick(() => console.log('7 内层 nextTick'));
  Promise.resolve().then(() => console.log('8 内层 promise'));
});
```

```text
1 start 同步
2 setTimeout 外层        ← 与 3 顺序不确定，取决于进入 timers 前 1ms 阈值是否已过
3 setImmediate 外层
4 readFile 回调（poll）
7 内层 nextTick          ← 检查点：先 nextTick
8 内层 promise           ← 再微任务
6 内层 setImmediate（本轮 check）  ← poll 之后紧邻 check
5 内层 setTimeout（下一轮 timers） ← timer 要等下一轮
```

**加分项（P7 视角）**：

- libuv 源码层：六阶段对应 `uv_run` 内的 do-while 循环——`uv__run_timers` → `uv__run_pending` → `uv__run_idle`/`uv__prepare` → `uv__io_poll` → `uv__run_check` → close 处理；底层有 epoll（Linux）/kqueue（macOS）/IOCP（Windows）三套 backend，poll 阻塞时长由最近 timer 的到期时间换算成 `uv__io_poll` 的 timeout 参数。
- Node 11 变更动机：让单个宏任务回调后立即清微任务，避免一个 timer 回调里 resolve 大量 Promise 导致后续 timer 全部延迟的饥饿问题，同时与浏览器 WhatWG 的任务模型对齐。
- nextTick 饥饿：nextTick 回调里继续注册 nextTick 会无限插队，饿死微任务和 I/O（历史上 Node 有过 MaxTickDepth=1000 的保护，0.12 后移除，完全交给开发者）；因此框架内部大量用 `queueMicrotask` 替代 nextTick 做收尾，语义更安全。
- 生产案例：心跳服务用 `setTimeout` 精确对表判定超时，高峰期事件循环延迟导致回调晚执行几百 ms，出现大量误报；改为「允许 ±N 秒窗口」的滑动判定并用 `perf_hooks.monitorEventLoopDelay` 做告警后归零。

## Q：微任务与 process.nextTick 优先级？setImmediate vs setTimeout 的执行顺序？

**核心答案**：微任务检查点里有两个独立队列，清空顺序固定：先 `process.nextTick` 队列，再 Promise 微任务队列（`Promise.then`/`queueMicrotask`/`await` 继续），所以 nextTick 优先级最高；nextTick 回调里再注册 nextTick 会继续插队，可能饿死微任务。setImmediate vs setTimeout：在模块顶层执行时顺序不确定，取决于进程启动到进入 timers 阶段时 1ms 阈值是否已过；但在 I/O 回调（poll 阶段）内部，setImmediate 一定先于 setTimeout，因为 poll 之后紧邻 check，而 timer 必须等下一轮循环的 timers 阶段。这也是「同一轮 I/O 处理后收尾」场景推荐 setImmediate 的原因。

**知识点解析**：

- 队列模型：nextTick 队列与微任务队列分离，检查点执行顺序固定为 nextTick → microtask；`queueMicrotask` 与 Promise 同级。
- Node 11 前后差异：11 之前 timers/check 阶段把整批回调跑完才清一次微任务；11+ 每个宏任务回调执行完立即清一次，行为与浏览器一致。
- setTimeout(fn, 0) 的真实语义：被钳制为 1ms，嵌套层级 >= 5 时钳到 4ms（避免 Chrome 时代的 timer 风暴），且事件循环繁忙时只会更晚。
- setImmediate 的确定性：check 阶段是普通 FIFO 队列，没有时钟参与，I/O 场景下顺序 100% 可预期。

```js
console.log('G 同步代码');
process.nextTick(() => console.log('F nextTick（优先级最高）'));
Promise.resolve().then(() => console.log('E promise 微任务'));

setTimeout(() => {
  console.log('A timer1 回调');
  process.nextTick(() => console.log('B timer1 的 nextTick'));
  Promise.resolve().then(() => console.log('C timer1 的微任务'));
  setTimeout(() => console.log('D timer2（下一轮 timers）'), 0);
}, 0);

setTimeout(() => console.log('H 同期到期的另一个 timer 回调'), 0);
```

```text
G 同步代码
F nextTick（优先级最高）
E promise 微任务
A timer1 回调
B timer1 的 nextTick       ← Node 11+：每个 timer 回调后立刻清 nextTick / 微任务
C timer1 的微任务
H 同期到期的另一个 timer 回调
D timer2（下一轮 timers）
```

```js
// 场景一：模块顶层，顺序不确定（两种输出都可能）
setImmediate(() => console.log('immediate'));
setTimeout(() => console.log('timeout'), 0);

// 场景二：I/O 回调内，immediate 必定先于 timeout
const fs = require('node:fs');
fs.readFile(__filename, () => {
  setImmediate(() => console.log('io -> immediate')); // 本轮 check
  setTimeout(() => console.log('io -> timeout'), 0);  // 下一轮 timers
});
```

**加分项（P7 视角）**：

- 源码层：nextTick 队列在 Node 源码里是 `node::InternalTicklet` 持有的 FixedQueue，清空逻辑在 tick_callback（node.cc 的 `RunNextTicks`）：先跑 nextTick 队列，再触发 V8 `PerformMicrotaskCheckpoint`，之后还会调一次 `uv_run(UV_RUN_NOWAIT)` 把已完成的 native I/O 结果尽快跑掉——这是 Node 微任务检查点比浏览器「多一层」的原因。
- setTimeout 实现：libuv 的 `uv_timer_t` 放在二叉最小堆（4-heap），插入 O(log n)，`uv__run_timers` 只看堆顶是否到期；所以同批到期的多个 timer 按「到期时间先后 + 注册顺序」执行。
- setImmediate 实现：基于 `uv_check_t` handle 的普通链表队列，完全绕开时钟，因此 I/O 密集型服务的收尾逻辑放 setImmediate 可以规避时钟漂移带来的顺序抖动。
- 生产案例：压测中出现 setTimeout 回调延迟数百 ms 的毛刺，排查发现不是 V8 慢，而是同步 CPU 任务（JSON.parse 大响应）阻塞了事件循环；用 `monitorEventLoopDelay` 采样确认，把大 JSON 解析改为流式 JSON 解析器后毛刺消失。

## Q：Stream：四种流类型、背压 pipe 处理、大文件处理实践？

**核心答案**：四种类型：Readable（可读，如 `fs.createReadStream`、`process.stdin`、http req）、Writable（可写，如 http res、`process.stdout`）、Duplex（可读可写且两端独立，如 TCP socket）、Transform（可读可写且写入经转换后读出，如 `zlib.createGzip`、crypto 流）。背压（backpressure）：Writable 有 highWaterMark 水位线，`write()` 返回 false 表示内部缓冲超水位、下游消费不及，此时应暂停上游读取，等 'drain' 事件再继续；`pipe()` 内部自动实现了这套暂停/恢复逻辑，`stream.pipeline` 在此基础上补齐了错误传播与自动销毁。大文件实践：永远用流而不是整体读入，`fs.createReadStream → transform → createWriteStream` 组管道，用 promisified 的 `pipeline` 管理生命周期，内存占用恒定在水位线量级。

**知识点解析**：

- 两种读取模式：flowing（'data' 事件自动推送）与 paused（'readable' 事件 + 手动 `read()`）；`pipe` 内部用 `resume`/`pause` 切换，`read(0)` 可在不消费的情况下重新开启流。
- 背压机制链路：`ws.write(chunk)` 返回 false → 上游 `rs.pause()` → ws 排空后触发 'drain' → `rs.resume()`；不处理背压时数据堆积在 Writable 的内部缓冲（`_writableState` 的 writeBuffer），大文件直接 OOM。
- highWaterMark：是「阈值」不是「预分配量」，默认字节流 64KB、对象流 16 个；socket 默认更高。调大可减少 syscall 次数、提升吞吐，代价是内存与首字节延迟。
- pipe 的缺陷：不处理错误传播——一个流出错，管道里其他流不会自动销毁（Node 10+ 才有 autoDestroy），且错误要各自监听；`pipeline` 一次性解决错误、清理与完成回调。
- 大文件场景选型：复制/压缩用 fs 流；HTTP 转发直接把 req（Readable）pipeline 到上游请求体或本地写流；避免 `readFileSync` + 字符串拼接的「全量进内存」方案。

```js
const fs = require('node:fs');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream');
const { promisify } = require('node:util');
const pipe = promisify(pipeline);

// 实践一：大文件 gzip，内存恒定，一行管道
async function gzipFile(src, dest) {
  await pipe(
    fs.createReadStream(src, { highWaterMark: 1024 * 1024 }), // 1MB 水位，减少 syscall
    zlib.createGzip(),
    fs.createWriteStream(dest)
  );
}

// 实践二：手写背压，还原 pipe 内部原理
function manualCopy(src, dest, cb) {
  const rs = fs.createReadStream(src);
  const ws = fs.createWriteStream(dest);
  rs.on('data', (chunk) => {
    if (!ws.write(chunk)) rs.pause(); // 写不下就暂停读
  });
  ws.on('drain', () => rs.resume());  // 排空后恢复
  rs.on('end', () => ws.end());
  rs.on('error', cb);
  ws.on('error', cb);
  ws.on('finish', () => cb(null));
}

// 实践三：Transform 定制（例如逐行解析）
const { Transform } = require('node:stream');
const lineSplitter = new Transform({
  transform(chunk, enc, next) {
    this._tail = (this._tail || '') + chunk.toString();
    const lines = this._tail.split('\n');
    this._tail = lines.pop(); // 最后一段可能不完整，留到下一个 chunk
    for (const line of lines) this.push(line);
    next();
  },
  flush(next) {
    if (this._tail != null) this.push(this._tail);
    next();
  },
});
```

**加分项（P7 视角）**：

- 源码层：Readable 的数据先落入内部 BufferList（Buffer 组成的链表），flowing 模式由 `flow()` 循环 `read()` 触发 'data'；`write()` 的返回值就是 `len < state.highWaterMark` 的布尔计算，缓冲数组在 `_writableState.getBuffer()`。
- Web Streams 互操作：Node 17+ 提供 `stream.Readable.toWeb/fromWeb`，可与 fetch 的 `res.body`（WHATWG ReadableStream）打通——BFF 转发大响应时用 `pipeline(Readable.fromWeb(upstream.body), res)`，实现边收边发的零缓冲转发。
- 水位权衡的量化：总内存 ≈ 并发连接数 × HWM × 管道级数；做导出服务时把 HWM 从 64KB 提到 1MB，吞吐提升约 3 倍，但需要按 QPS 反推内存预算，否则高并发下水位线变成新的 OOM 点。
- 生产案例：导出百万行 CSV，最初 `readFileSync` + 数组 join 全量拼接，峰值内存 300MB 且事件循环阻塞 30 秒（接口整体超时）；改为 `pipeline(rowCursor, csvTransform, res)` 后内存恒定 30MB、TTFB 降到 200ms 内，客户端边下载边生成，还能配合 HTTP chunked 边推边消费。

## Q：Buffer 原理与编码？Blob vs Buffer？如何共享内存？

**核心答案**：Buffer 是「固定长度的原始二进制数据容器」，本质是 Uint8Array 的子类，但内存不是直接从 V8 堆分配，而是由 Node 在 C++ 层申请（小 Buffer 走 8KB 的 Slab 池化分配，大 Buffer 独立 malloc），因此不受 V8 堆大小限制、GC 压力小。编码上 utf8 是默认，base64/hex/latin1/ascii 是最常见的二进制文本互转格式。Blob 是 Web 平台的「不可变原始数据 + MIME 类型」，Node 14.5+ 引入，`slice()` 只创建视图不拷贝，天然适合文件上传（FormData）；Buffer 可变、面向流处理。共享内存的核心 API 是 `Buffer.from(arrayBuffer, byteOffset, length)`——它不拷贝，而是在同一个 ArrayBuffer 上创建视图，多个 Buffer 可指向同一块内存的的不同区间；跨线程共享则用 SharedArrayBuffer。

**知识点解析**：

- 内存模型：Buffer 实例的字节存在 ArrayBuffer 上（`buf.buffer` 可取到底层），`new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)` 与 buf 视角相同；pool 对象（<4KB 的 Buffer 复用 8KB slab）是历史实现（Buffer.poolSize），`Buffer.from` 与 `allocUnsafe` 的差异就在是否走池。
- 分配 API 三兄弟：`Buffer.alloc(n)`（清零，安全默认）、`Buffer.allocUnsafe(n)`（不清零，快但可能泄漏旧数据）、`Buffer.from(...)`（从字符串/数组/ArrayBuffer/另一个 Buffer 构造）；`new Buffer()` 已废弃，因为 from(string) 之外的历史重载会泄漏未清零内存。
- 编码转换：`buf.toString('base64')`、`Buffer.from(str, 'utf8')`；utf8 中一个汉字 3 字节，`str.length` 是 UTF-16 码元数而 `Buffer.byteLength(str)` 才是真实字节数——按字节截断必须用 Buffer，直接 slice 字符串会截出乱码。
- Blob vs Buffer：Blob 不可变、带 type、slice 零拷贝、支持 `stream()` 转 ReadableStream，走 Web 语义（File 继承 Blob）；Buffer 可变、Node 语义、参与流管道。互转：`new Blob([buf])`（拷贝语义不明确，实际按字节收集）、`Buffer.from(await blob.arrayBuffer())`。
- 共享内存：同一进程内多个视图共享一个 ArrayBuffer 零拷贝；`blob.slice()` 同理；跨 worker_threads 用 SharedArrayBuffer + Atomics；跨进程无法共享堆内存，只能靠 IPC 序列化或 SharedArrayBuffer 不适用（cluster 不支持），可退到 mmap 文件方案。

```js
// 零拷贝视图：三个 Buffer 共享同一块 ArrayBuffer
const ab = new ArrayBuffer(1024);
const a = Buffer.from(ab, 0, 512);   // 视图，不拷贝
const b = Buffer.from(ab, 512, 512); // 视图，不拷贝
a.writeUInt32BE(0xdeadbeef);
console.log(new Uint8Array(ab)[0].toString(16)); // de —— 底层内存被共享

// 按字节安全截断（字符串 slice 中文可能截半）
function truncateBytes(str, maxBytes) {
  const buf = Buffer.from(str, 'utf8');
  return buf.subarray(0, maxBytes).toString('utf8'); // subarray 也是零拷贝视图
}

// Blob：slice 零拷贝 + 上传
const blob = new Blob([Buffer.from('{"a":1}')], { type: 'application/json' });
const part = blob.slice(0, 5); // 视图，不复制数据
const form = new FormData();
form.append('file', blob, 'data.json'); // fetch 上传

// Buffer ↔ Blob 互转
const back = Buffer.from(await blob.arrayBuffer());
```

**加分项（P7 视角）**：

- 源码层：Buffer 的分配在 `node_buffer.cc` 的 Buffer::New/AllocUnsafe；`allocUnsafe` 小于 `Buffer.poolSize >> 1`（4KB）时从 8KB slab 池中切一段（allocPool + poolOffset 指针前移），所以连续创建小 Buffer 几乎没有 malloc 调用；`buffer.constants.MAX_LENGTH` 在 64 位机约 4GB（受 ArrayBuffer 上限约束）。
- 性能细节：`Buffer.concat` 是一次性 malloc + 逐个 memcpy，高频小包拼接更好的做法是收集 chunks 数组最后一次性 concat，或直接 `Blob`（收集视图零拷贝，发送时才序列化）；V8 对 TypedArray 有内联 fast path，`buf[i]` 读取接近原生数组。
- Blob 的流式优势：`blob.stream()` 返回 Web ReadableStream，配合 `Readable.fromWeb` 可把一个 Blob 零成本接入 Node 管道，做分片上传的「按需切片再流式读」比 Buffer.slice + copy 更省。
- 生产案例：上传服务把用户文件整个 `arrayBuffer()` 读进内存再转发，1GB 文件峰值即 1GB + base64 膨胀 33%；改为 `pipeline(req, uploadStream)` 直传对象存储分片接口后内存恒定；另外一次日志乱码事故，根因是按 `str.slice(0, 100)` 截断写文件，多字节字符被截半，改为 Buffer 按字节截断后修复。

## Q：Node 模块体系：CJS 加载缓存、ESM 顶层 await、双模块格式如何共存？

**核心答案**：CJS 的 `require` 是运行时同步加载：解析路径（内置模块 → 相对/绝对路径 → node_modules 逐级查找）→ 查 `require.cache`（key 为 resolve 后的绝对文件名）→ 未命中则 new Module、执行包装函数 `(function (exports, require, module, __filename, __dirname))` 并缓存 `module.exports`，所以同一模块只执行一次；循环依赖时返回「已导出的部分」（partial exports）。ESM 是静态结构：import/export 在编译期确定依赖图，加载是异步的，导出是「活绑定」（live binding）；ES2022 顶层 await 允许模块顶层直接 await，代价是该模块及其整棵同步导入它的子树都变成异步图。双格式共存靠 package.json 的 `exports` 条件导出：`import` 指向 .mjs / `require` 指向 .cjs（外加 types 条件），或用构建工具产出双产物 + `.d.ts` 与 `.d.mts`。

**知识点解析**：

- CJS 缓存：`require.cache` 以绝对路径为 key；删除缓存可热重载（测试场景），循环依赖 A→B→A 时 B 拿到的是 A 未填充完成的 exports 引用（值拷贝时序问题）。
- exports vs module.exports：`exports` 是 `module.exports` 的初始引用，重新赋值 `module.exports = {...}` 后 exports 失效；返回给调用方的永远是 module.exports。
- ESM 特性：export 是绑定而非值拷贝（可看到导出方后续修改）；import 会被提升；裸导入在 ESM 中不自动补扩展名（CJS 也不补，但 ESM 要求全名）；`import.meta.url` 替代 `__dirname`。
- 顶层 await：会阻塞依赖它的模块（依赖图串行化），入口模块 TLA 相当于把后续逻辑都变成 async；在 CJS 里 import 一个带 TLA 的 ESM 会直接报 ERR_REQUIRE_ASYNC_MODULE（Node 22 前；22+ 的 require(esm) 也要求图内无 TLA）。
- 双格式打包：现代做法是「一份 TS 源码，构建产出 .mjs + .cjs 双产物」，package.json 同时声明 `main`/`module` 兜底与 `exports` 精确映射；dual package hazard：两种格式各加载一份同一依赖会导致 instanceof 失败，方案是让两份产物共享同一个内部实例（如通过 `exports` 把内部符号收敛到单入口）。

```js
// CJS 循环依赖示例：a.js / b.js
// a.js
exports.loaded = false;
const b = require('./b');
console.log('a 中拿到 b.done =', b.done); // true（b 已执行完）
exports.loaded = true;

// b.js
const a = require('./a'); // 命中缓存，拿到 partial exports
console.log('b 中拿到 a.loaded =', a.loaded); // false —— 尚未执行到最后一行
exports.done = true;
```

```js
// ESM 顶层 await：config 加载后才能被依赖方使用
// config.mjs
export const config = await fetch('http://localhost:3000/config')
  .then((r) => r.json())
  .catch(() => ({ default: true }));

// app.mjs
import { config } from './config.mjs'; // app 整体被推迟到 config resolve 后执行
console.log(config.default);
```

```json
{
  "name": "pkg",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    }
  }
}
```

**加分项（P7 视角）**：

- 源码层：CJS 的核心在 lib/internal/modules/cjs/loader.js——`Module._load` 查缓存（Module._cache）→ `Module._resolveFilename`（含 REALPATH 优化与 node_modules 逐级向上探测）→ new Module 后 `module.compile` 用 `wrapSafe` 包一层函数再执行；缓存 key 经过 realpath，因此 symlink 的两份路径可能各加载一次（pnpm 时代要注意 preserveSymlinks 的坑）。
- ESM 加载器：走 lib/esm（Node 内置 loader），分 resolve → fetch → parse → link（含活绑定接线）→ evaluate 阶段；Node 20.6+ 的 `--experimental-strip-types` 与 register hooks 允许运行时定制 loader（如 tsx 的实现基础）。
- require(esm)：Node 22 起支持在 CJS 里 require ESM（要求无 TLA），双格式的运行边界进一步模糊，但仍建议库作者维持双产物以兼容旧 Node。
- 生产案例：monorepo 里 A 包（CJS）与 B 包（ESM）同时依赖 lodash-es 与 lodash，构建产物体积翻倍且 `dayjs` 两份实例导致 plugin 注册失效（instanceof/全局注册表不共享）；用 why-is-node-running / madge 定位后统一 lint 规则（no-restricted-imports 限制混用）+ 依赖版本收敛解决。

## Q：多进程：child_process vs worker_threads vs cluster？PM2 进程守护原理？

**核心答案**：child_process 面向「进程隔离」：spawn/exec/execFile/fork，各自独立内存与 V8 实例，fork 额外建立 IPC 通道，适合跑外部命令、隔离不稳定任务；worker_threads 面向「线程级 CPU 并行」：同进程内多线程，各自有独立 V8 isolate 但共享进程内存，可通过 SharedArrayBuffer 零拷贝共享、MessagePort 通信，成本远低于进程，适合图像处理/压缩/加密等 CPU 密集任务；cluster 是「多进程 HTTP 服务」的官方封装：master 进程 fork 多个 worker 并把监听 socket 以共享句柄方式分发给它们（Linux 上 round-robin 默认开启），解决单进程单核瓶颈。PM2 的守护原理：一个常驻的 God daemon 进程（`pm2 daemon`）持有进程列表，通过 IPC/AXM 协议管理 fork 或 cluster 模式的业务进程，监听 exit 事件按重启策略拉起，并提供日志管理、内存超限重启、0 秒重启（cluster 模式逐个 reload）。

**知识点解析**：

- child_process 四件套：spawn（流式子进程）、exec（默认 shell + 回调，有 maxBuffer 默认 1MB 上限）、execFile（无 shell，避免注入风险，性能更好）、fork（spawn 的 IPC 特化版，`sub.send`/`process.on('message')`）。
- worker_threads：`new Worker(path, workerData)`；通信用 `postMessage`（结构化克隆拷贝）或 transferList 转移所有权（零拷贝转移），或直接 SharedArrayBuffer + Atomics 做无锁共享；注意 worker 里也能 require、有独立事件循环。
- cluster：`cluster.isPrimary` 分叉 worker，`cluster.on('exit')` 重启；端口监听发生在 master（fd 共享给 worker），Linux 用轮转（RR）分发连接，Windows 与 SO_REUSEPORT 场景可能是共享抢占式；与手写 child_process + nginx 的差别是省掉了端口转发层。
- PM2 关键机制：ecosystem 配置（instances: 'max'、exec_mode: 'cluster'、max_memory_restart）；守护进程与业务进程解耦，业务崩溃由 daemon 兜底拉起；PM2 自身崩溃时进程托管给系统（systemd），生产建议 PM2 只做进程管理、开机自启用 pm2 startup。
- 选型判断：CPU 密集 → worker_threads（省内存）；任务隔离/第三方命令 → child_process；横向利用多核的 HTTP 服务 → cluster / PM2 cluster / K8s 多副本。

```js
// worker_threads：CPU 密集任务（如大 JSON 解析、图片处理）
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename, {
    workerData: { big: 'x'.repeat(1e7) },
  });
  worker.on('message', (result) => console.log('worker 算完：', result));
  worker.on('error', (err) => console.error('worker 出错：', err));
} else {
  // 子线程里做重计算，不阻塞主线程事件循环
  const heavy = workerData.big.length * 2;
  parentPort.postMessage(heavy);
}

// cluster：多核 HTTP 服务
const cluster = require('node:cluster');
const http = require('node:http');
const cpuNum = require('node:os').cpus().length;

if (cluster.isPrimary) {
  for (let i = 0; i < cpuNum; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`worker ${worker.process.pid} 挂了，重启`);
    cluster.fork();
  });
} else {
  http.createServer((req, res) => res.end(`pid ${process.pid}`)).listen(3000);
}
```

**加分项（P7 视角）**：

- 源码层：cluster 的共享句柄靠 master 进程 `net.Server` 的 listen fd 通过 `channel.send` 序列化（handle 对象可被 IPC 传输，lib/internal/child_process serialization 支持 net.Socket/net.Server 句柄）；RR 调度在 master 的 `cluster/lib/round_robin_handle.js`，master accept 后挑一个 `worker.send(handle)` 分发。
- PM2 内部：God daemon 基于 axm/protocol 的 JSON-RPC over IPC；`pm2 reload` 对 cluster 模式是逐 worker 重启（旧的优雅退出、新的就绪后再切下一个），对 fork 模式只能 restart（会断流量）；`max_memory_restart` 依据 daemon 轮询的进程 RSS，而不是 V8 堆，所以内存泄漏到触发线之前可能有明显的 GC 抖动期。
- worker_threads 陷阱：postMessage 结构化克隆大对象成本可能超过计算本身，方案是 transferable ArrayBuffer（转移所有权）或 SharedArrayBuffer 双缓冲；worker 池要复用线程（piscina 库的思路），按任务创建线程会吃满线程数上限。
- 生产案例：报表导出服务单进程跑批把 8 核机器的其它请求全部拖死（事件循环被同步 CPU 任务占满）；先上 cluster 4 进程缓解，再把 CSV 计算下沉到 worker 池（piscina + 任务队列 + 超时杀 worker 重建），最终 P99 从超时恢复到 500ms；K8s 化后用 Deployment 副本 + HPA 替代 cluster，进程内不再 fork。

## Q：中间件原理：手写 Koa 洋葱模型（compose）？Koa vs Express 架构差异？

**核心答案**：洋葱模型的本质是把 N 个中间件递归组合成一个函数：每个中间件收到 `(context, next)`，调用 `await next()` 就进入下一层，next resolve 后回到本层后半段——请求自外向内、响应自内向外。compose 的实现核心是 `dispatch(i)`：取出第 i 个中间件，把 `dispatch(i + 1)` 作为 next 传给它；i 超出数组长度时 next 是 undefined，直接 resolve 收尾；用 index 标记防止 next 被调用两次。Koa 与 Express 的架构差异：Express 中间件是线性队列（next 只是移动指针，回调风格，无法用 await 等待「后续全部中间件完成」，响应对象大、路由内置）；Koa 核心只有 ~2000 行（application/context/request/response 四个文件），把 req/res 封装成单一 ctx，中间件全异步、天然支持 try/catch 统一错误处理，路由等能力全部外置（@koa/router）。

**知识点解析**：

- compose 签名：`(middlewares) => (context, next) => Promise`；每个中间件被 `Promise.resolve` 包裹，所以同步 throw 也能被外层 catch。
- 防重入：`if (i <= index) return Promise.reject(new Error('next() called multiple times'))`，index 记录当前已执行到哪一层。
- Koa 请求流程：`app.listen` 创建 http server → callback 里 `createContext(req, res)` → `fnMiddleware(ctx).then(handleResponse).catch(onerror)`。
- 错误处理：洋葱模型让最外层中间件可以 try/catch 包住整个下游（Express 要靠错误中间件四参回调，且异步错误要 next(err) 手动传递）。
- 架构哲学：Express「自带电池」（路由、静态服务、查询解析一体），Koa「极简内核 + 生态组装」，所以 Koa 的 ctx 是可扩展原型（getter/setter 委托到 request/response），中间件可自由挂属性做依赖注入。

完整可运行的 compose 实现（无任何依赖）：

```js
function compose(middleware) {
  if (!Array.isArray(middleware)) {
    throw new TypeError('Middleware stack must be an array!');
  }
  for (const fn of middleware) {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be composed of functions!');
    }
  }
  return function (context, next) {
    let index = -1;
    function dispatch(i) {
      // next 被调用多次（同一层 await next() 两次）直接拒绝
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      let fn = middleware[i];
      // 全部中间件执行完：把外部传入的 next（app 里的 handleResponse 前置钩子）接上
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        // 关键一行：把「执行下一层」的能力作为 next 传给当前中间件
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return dispatch(0);
  };
}
```

配套的迷你 Koa 内核与执行效果验证：

```js
class MiniKoa {
  constructor() {
    this.middleware = [];
  }
  use(fn) {
    this.middleware.push(fn);
    return this;
  }
  listen(...args) {
    const server = require('node:http').createServer((req, res) => {
      const ctx = { req, res, state: {} };
      const fn = compose(this.middleware);
      fn(ctx)
        .then(() => {
          if (!ctx.body) ctx.res.statusCode = 404;
          ctx.res.end(ctx.body ?? 'Not Found');
        })
        .catch((err) => {
          ctx.res.statusCode = 500;
          ctx.res.end('Internal Server Error');
        });
    });
    return server.listen(...args);
  }
}

const app = new MiniKoa();
app.use(async (ctx, next) => {
  console.log('1 请求进入');
  const start = Date.now();
  await next(); // 进入内层
  console.log('4 响应回程，耗时', Date.now() - start);
  ctx.res.setHeader('X-Cost', '1');
});
app.use(async (ctx) => {
  console.log('2 处理业务');
  await new Promise((r) => setTimeout(r, 100));
  ctx.body = 'hello onion';
  console.log('3 业务完成');
});
app.listen(3000);
// curl localhost:3000 输出：
// 1 请求进入
// 2 处理业务
// 3 业务完成
// 4 响应回程，耗时 10x
```

**加分项（P7 视角）**：

- 源码层：koa-compose 与上述实现几乎逐行一致（koa 源码 lib/application.js 的 `fnMiddleware = compose(this.middleware)`，handleResponse 在 then 中，onerror 在 catch 中）；bind(null, i + 1) 而非闭包 i+1，是为了让 next 是稳定函数引用（可被传递、可被二次持有）且避免闭包保留整个 dispatch 栈帧。
- 执行栈真相：洋葱模型不是「真的栈展开」，而是 Promise 链的 then 串联——await next() 之后的代码在微任务里执行；所以中间件后半段里引用的 ctx.body 等「内层写入的值」都是新值，而 try/catch 能兜住下游所有同步与异步错误。
- Express 差异补充：Express 4 的路由是按注册顺序线性匹配（Router 也是一个中间件），5 才完整支持 async 路由（4.x 里 async 函数 throw 不会进错误中间件，必须 next(err)）；其 res 对象上有 send/json/render 等大量方法，Koa 把这些拆到中间件（koa-bodyparser/koa-view）。
- 生产案例：网关层用「最外层中间件」做全链路 try/catch + trace_id 注入 + 耗时打点（进入时 push，next 后 pop），配合洋葱顺序保证日志在响应头已写完之后仍然可拿到最终 status；曾踩过一个坑——中间件里 next() 被调用两次（if/else 两分支各一次）导致 body 重复写入，上线前用 compose 的 multiple times 报错在测试环境拦截。

## Q：BFF 层设计：聚合/裁剪/鉴权？GraphQL 与 REST 如何选型？

**核心答案**：BFF（Backend for Frontend）是为特定端（Web/App/小程序）定制的聚合层，解决多端差异与「页面需要 N 个接口」的问题。三大职责：聚合（并发请求下游多个服务，用 Promise.all + 超时/降级组合出页面需要的数据结构）；裁剪（只暴露端上需要的字段，隐藏内部模型与敏感字段，减少传输量）；鉴权与协议转换（统一登录态校验、内部服务间的鉴权票据换取、外部 REST/gRPC 到端上协议的转换，端上不感知内部拓扑）。GraphQL 与 REST 的选型：GraphQL 的优势是「按需取字段 + 单次请求聚合多资源 + 强类型 Schema 自文档」，适合字段裁剪诉求强、多端差异大的场景；代价是 N+1（需 DataLoader 解决）、缓存复杂（无 HTTP 语义缓存，要Persisted Query/APQ + 操作级缓存）、学习与治理成本。REST 简单通用、CDN/HTTP 缓存友好、生态成熟。实践中常见混合：公共 Open API 用 REST，自家多端聚合层用 GraphQL 或自研 RPC 聚合接口。

**知识点解析**：

- 聚合模式：`Promise.allSettled` + 每个下游独立超时（AbortController）+ 失败降级（返回兜底结构而非整体 500），页面可用性优先；下游协议可能是 REST、gRPC（@grpc/grpc-js）、内部 RPC。
- 裁剪模式：字段白名单映射（DTO 转换，隐去内部字段如成本价、user 内部 id）；GraphQL 里天然由查询语句决定返回字段，但要注意深度限制与字段级权限（directive 做字段鉴权）。
- 鉴权链路：端上 token（JWT/OAuth）在 BFF 校验并换成内部服务票据（mTLS/内部签名），下游服务只信任内网调用；BFF 同时承担限流（按用户/IP）、防刷与敏感字段脱敏。
- GraphQL 工程要点：DataLoader 批量 + 缓存解决 N+1；Persisted Queries 杜绝任意查询攻击与解析开销；query depth/complexity 限制；Subscription 走 WebSocket 长连接要注意连接管理。
- REST 工程要点：聚合接口按「页面/组件」设计（一个页面一个接口）；HTTP 缓存（ETag/CDN）+ stale-while-revalidate 是 GraphQL 不具备的红利。

```ts
// BFF 聚合 + 超时 + 降级的典型写法
const fetchWithTimeout = (url: string, ms = 800) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  return fetch(url, { signal: ac.signal })
    .then((r) => r.json())
    .finally(() => clearTimeout(timer));
};

export async function getPageData(userId: string) {
  const [user, orders, banner] = await Promise.all([
    fetchWithTimeout(`http://user-svc/${userId}`).catch(() => null),      // 降级
    fetchWithTimeout(`http://order-svc/${userId}`).catch(() => []),       // 降级空数组
    fetchWithTimeout(`http://cms-svc/banner?pos=home`).catch(() => []),   // 降级
  ]);

  // 裁剪：只暴露端上需要的字段，隐藏内部模型
  return {
    profile: user && { nickname: user.nickname, avatar: user.avatar }, // 丢掉 phone/idCard 等
    orderCount: Array.isArray(orders) ? orders.length : 0,
    banners: (banner as Array<{ img: string; link: string }>).slice(0, 3),
  };
}
```

**加分项（P7 视角）**：

- 选型判据表：多端差异大 + 字段频繁变化 + 页面数据来自 >=3 个微服务 → GraphQL；对外公开 API / 强缓存诉求 / 团队 GraphQL 经验不足 → REST；内部高性能调用直接 gRPC（Protobuf 二进制 + HTTP/2 多路复用），BFF 只做端侧协议出口。
- 性能对比的量化：GraphQL 单请求省掉多次 RTT（移动端弱网收益极大），但服务端 resolver 扇出可能放大下游 QPS（一个首页请求扇出几十个 resolver）；必须配 DataLoader（按请求级 batch）+ 每请求的缓存上下文，否则聚合层自己成为压垮下游的放大器。
- 架构权衡：BFF 会带来「多一层」的运维成本与故障面，小团队常见反模式是 BFF 变成第二个后端（业务逻辑沉淀在 BFF）；纪律是「聚合与适配在 BFF，业务规则在领域服务」，BFF 代码要有单测与下游契约测试。
- 生产案例：App 首页聚合 6 个下游，早期串行调用 P99 2.4s；改为并行 + 各自 500ms 超时 + 非关键模块降级后 P99 降到 700ms，配合内存 LRU（30s TTL）扛住首页洪峰 QPS 10 倍增长；后续把「猜你喜欢」单独走 GraphQL 字段按端版本裁剪，旧版本端少取 5 个字段，流量下降约 20%。

## Q：SSR 服务：内存泄漏排查、进程管理、优雅退出、流量洪峰降级？

**核心答案**：SSR 是典型的「有状态长驻 Node 进程」，核心稳定性工程四件事。内存泄漏排查：先用 `process.memoryUsage` 与容器 RSS 曲线确认是「持续增长」还是 GC 抖动，再抓堆快照对比（测试环境压测 + `--heapsnapshot-signal=SIGUSR2` 或 `v8.writeHeapSnapshot()`，比较两份快照的 Retained Size 与新增对象持有链），SSR 特有泄漏源是「请求级数据被模块级缓存持有」。进程管理：PM2/K8s 多副本 + `max_memory_restart` 兜底，渲染进程与 API 网关隔离部署。优雅退出：监听 SIGTERM → 停止接收新连接（server.close）→ 返回 Connection: close 响应头让客户端不复用 → 等存量连接排空 → 超时强制退出；K8s 配 preStop 与 terminationGracePeriodSeconds。流量洪峰降级：SSR 降级为 CSR（预构建的静态壳）+ HTML 微缓存 + 限流排队 + 熔断非关键数据请求，保住核心页可用。

**知识点解析**：

- 泄漏排查链路：RSS 持续涨而 heapUsed 不涨 → C++ 层泄漏（Buffer/stream）；heapUsed 涨 → V8 堆泄漏（闭包/缓存/监听器）；三快照法（Snapshot A → 操作 → B → 操作 → C，两次之间都增长的对象即泄漏嫌疑）。
- SSR 高发泄漏点：模块级 Map 缓存以 userId/URL 为 key 只增不减（无 LRU/TTL）、组件注册到全局事件总线未注销、`global.__renderCache` 存渲染结果持有完整 store、打点闭包持有请求级大对象。
- 进程管理：`pm2 start --instances max`（cluster）；K8s 下改为多副本 + requests/limits + OOMKilled 监控；`--max-old-space-size` 与容器 limit 匹配（预留堆外开销，约 limit 的 75% 给 V8 堆）。
- 优雅退出细节：`server.close(cb)` 只是不再 accept，keep-alive 存量连接要靠响应头 `Connection: close` 或 `server.closeIdleConnections()`（Node 18.2+）催收；`process.exit` 前 flush 日志与链路数据；PM2 reload / K8s 滚动更新依赖这套逻辑实现零掉线。
- 降级体系：渲染层降级（SSR → CSR 静态壳）、数据层降级（非核心请求超时返回兜底）、缓存层微缓存（Nginx proxy_cache / 内存 LRU，TTL 5-30s，洪峰时命中率决定生死）、入口层限流（网关按用户/IP 令牌桶，排队 + 429）。

```js
const http = require('node:http');
const server = http.createServer(async (req, res) => {
  res.setHeader('Connection', 'close'); // 优雅退出期催收 keep-alive
  try {
    const html = await render(req.url);        // SSR 渲染
    res.end(html);
  } catch (err) {
    // 降级：SSR 失败/超时 → 返回 CSR 静态壳，保证页面可用
    res.end(csrShellHtml);
  }
});

// 优雅退出（K8s preStop / SIGTERM / PM2 gracefulReload 都走这里）
async function shutdown() {
  server.close(() => process.exit(0));     // 停止 accept
  server.closeIdleConnections();           // Node 18.2+：直接关掉空闲连接
  setTimeout(() => process.exit(1), 10_000) // 兜底强杀，避免卡死滚动更新
    .unref();
}
process.on('SIGTERM', shutdown);

// 内存泄漏排查：生产环境按信号抓堆快照
// node --heapsnapshot-signal=SIGUSR2 server.js
// kill -USR2 <pid>  → 生成 Heap.<timestamp>.heapsnapshot 供 DevTools 对比
const v8 = require('node:v8');
const stats = v8.getHeapStatistics();
console.log('heap used:', (stats.used_heap_size / 1048576).toFixed(1), 'MB');
```

**加分项（P7 视角）**：

- 快照对比技巧：不要在两份快照间只看「对象数量」，用 DevTools 的 Comparison 模式看 delta 中 Retained Size 最大的链；SSR 场景高频元凶是「按路由缓存渲染结果的对象持有整份序列化 store」，改按「路由 + 数据版本」做 key 且只存字符串，泄漏消失。
- 真实事故复盘：大促前压测 SSR 进程 6 小时 RSS 从 200MB 涨到 1.8GB 直到 OOMKilled；快照对比定位到打点 SDK 的全局数组持有每次请求的完整 HTML 字符串（异步埋点未清理），修复 + 上 `max_memory_restart` 兜底 + Grafana RSS 斜率告警三件套。
- K8s 细节：readiness 探针不通过才摘流量，preStop sleep 几秒等 endpoint 传播，terminationGracePeriodSeconds 必须大于最长渲染请求时间，否则滚动更新时会截断进行中的请求；HPA 按 CPU 扩容对 CPU 密集的 SSR 生效快，冷启动（V8 代码缓存预热 + 首请求 warmup）不可省。
- 降级演练：每周固定做「关掉一个下游」的演练，验证降级开关（配置中心下发）与静态壳是否真的可用；曾经静态壳因懒加载 chunk 版本更新而 404，降级反而白屏，之后静态壳纳入构建产物完整性校验。

## Q：Node 性能：CPU profiling、V8 堆快照、事件循环延迟监控？

**核心答案**：三板斧对应三类瓶颈。CPU profiling：`node --cpu-prof` 生成 .cpuprofile（或 chrome://inspect 连 V8 Inspector 采集），看火焰图找热点函数；`--prof` + `--prof-process` 看汇总（ ticks 归因到 JS/GC/libuv），线上持续用 clinic doctor/0x。V8 堆快照：`--heapsnapshot-signal=SIGUSR2` 或 Inspector 拍快照，用「三快照对比法」找 Retained Size 持续增长的对象链，定位泄漏持有者；配套 `--max-old-space-size` 约束 + OOM 时 `--diagnostic-dir` 自动落盘（`--report-on-fatalerror`）。事件循环延迟：`perf_hooks.monitorEventLoopDelay()`（直方图采样，拿 mean/p99）或 `performance.eventLoopUtilization()`（Node 16.7+，拿活跃占比），用定时器漂移法（setInterval 间隔与实际的偏差）做简化实现；延迟高说明同步任务阻塞（大 JSON、正则回溯、同步 crypto/fs）。

**知识点解析**：

- CPU profiling 采集方式：`node --cpu-prof --cpu-prof-dir=./prof app.js`（退出时落盘）、Inspector 协议的 Profiler.start（可远程无侵入）、生产采样用 clinic/0x（自动生成火焰图 SVG，标注事件循环阻塞区间）。
- 堆快照方法论：快照本身会 Stop-The-World，大堆（>1GB）可能暂停数秒，生产慎用（摘流量副本上拍）；对比时看 Comparison 视图的 #Delta 与 Retained Size Delta；配合 `--trace-gc` 与 GC 频率锯齿判断「真泄漏」还是「GC 配置不当」。
- 事件循环延迟两种官方度量：`monitorEventLoopDelay({ resolution: 20 })` 返回 IntervalHistogram（enable 后每 20ms 检查一次本轮循环耗时）；`performance.eventLoopUtilization([previous])` 返回 idle/active 占比，差值法可算任意时间窗的利用率。
- 定时器漂移监控（无依赖版）：每秒 setInterval 打点，实际间隔 - 1000ms 的差即近似延迟；这是大多数 APM（如 Elastic APM）eventLoop 的实现原理。
- 常见元凶清单：JSON.parse/stringify 大对象（换流式解析）、同步 fs（改 promise API）、正则灾难性回溯、await 串行调用链（改并行）、crypto 同步 API（crypto.sync 变 async + 线程池）。

```js
// 事件循环延迟监控：标准姿势 + 打点上报
const { monitorEventLoopDelay, performance } = require('node:perf_hooks');

const histogram = monitorEventLoopDelay({ resolution: 20 }); // 每 20ms 采样
histogram.enable();

setInterval(() => {
  histogram.disable();
  console.log({
    loopDelayMean: (histogram.mean / 1e6).toFixed(2) + 'ms',   // 平均延迟
    loopDelayP99: (histogram.percentile(99) / 1e6).toFixed(2) + 'ms',
  });
  histogram.reset();
  histogram.enable();
}, 30_000).unref();

// eventLoopUtilization：事件循环「利用率」（活跃时间占比）
const u1 = performance.eventLoopUtilization();
setTimeout(() => {
  const u2 = performance.eventLoopUtilization(u1); // 传入基线得到窗口内差值
  console.log('loop utilization:', (u2.utilization * 100).toFixed(1) + '%');
}, 1000);

// 定时器漂移法：APM 的通用实现
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const drift = now - last - 1000; // 超过 1s 的部分即本轮循环被阻塞的近似值
  if (drift > 100) reportMetric('event_loop_delay', drift);
  last = now;
}, 1000).unref();
```

**加分项（P7 视角）**：

- 采样原理：`monitorEventLoopDelay` 底层是每 resolution 毫秒往 TIDier（libuv 的 timer + check 哨兵）投一个探针，探针之间的实际间隔减去分辨率即本轮 tick 的阻塞时长，存进 HDR 直方图（hn64 的 HDR Histogram），所以 percentile 是 O(1) 读取；`--cpu-prof` 走 V8 的 CpuProfiler（信号采样 + 栈回溯），采样开销约 1-3%。
- CPU 优化案例：接口 P99 800ms，火焰图里 62% 耗在 `JSON.parse`（3MB 配置每次请求都解析）——改为启动解析一次 + 文件 mtime 失效缓存，P99 降到 180ms；另一个案例是 map 循环里每次 `new RegExp`（V8 不缓存运行时构造的正则），预编译后热点消失。
- 内存治理体系：`--max-old-space-size=2048 --max-semi-space-size=64`（新生代调大减少 Scavenge 频率，吞吐换内存）+ OOM 自动 dump（`--report-on-fatalerror --report-signal` + node-report）+ 容器 RSS 斜率告警；一次「每请求复制模块级大 Map」的案例靠堆快照对比 10 分钟定位。
- 观测组合拳：持续 profiling（低频采样进 Pyroscope）+ slow event loop 告警 + GC 频率指标（`perf_hooks.PerformanceObserver` 订阅 'gc'）联动，能把「CPU 高」「延迟高」「内存涨」三类表象快速归因到根因，而不是各自为战地调参。

## Q：Nestjs/分层架构：DI/IoC、AOP、模块化组织大型服务？

**核心答案**：Nest 的核心是 IoC 容器：启动时扫描 `@Module()` 元数据建立依赖图，递归实例化 provider 并注入构造函数，开发者不再手写 `new` 与装配代码，依赖只描述「我需要什么」（`@Inject`），容器负责「给谁、何时、怎么给」。AOP 体现为四种切面组件：middleware（最前、拿到原生 req/res）、guard（鉴权决策，CanActivate）、pipe（参数转换与校验，如 ValidationPipe + class-validator）、interceptor（包裹 controller 前后的逻辑，可实现缓存/日志/映射响应）、exception filter（错误统一出口）——它们的执行顺序是 middleware → guard → interceptor（前半） → pipe → handler → interceptor（后半） → filter。模块化组织大型服务：按业务域拆 Feature Module，跨域复用抽 SharedModule/工具库，配置走 Dynamic Module（`ConfigModule.forRoot`），单体过大时 Nest monorepo 拆 libs 或直接微服务（Microservices 模块 + 传输层 Transport）。

**知识点解析**：

- IoC/DI 语义：IoC 是控制反转（对象创建权交给容器），DI 是其实现手段（构造器/属性/参数注入）；Nest 默认单例（DEFAULT scope），REQUEST scope 每请求新建（带性能开销，请求间实例隔离），TRANSIENT 每次注入都新建。
- 注入方式：constructor 注入 + TS 类型 `private readonly users: UsersService`（编译期靠 emitDecoratorMetadata 的 design:paramtypes 反射出 token）；无类型的值用 `@Inject('TOKEN')`；异步配置用工厂 provider（`useFactory`）。
- AOP 五件套定位：middleware（全局/路由级，最贴近 Express）、guard（返回 bool/异常决定能否进 handler）、pipe（转换/校验参数，抛 BadRequestException）、interceptor（`next.handle()` 返回 RxJS Observable，可 map/catchError/tap，天然适合缓存/日志/超时）、filter（捕获 handler 及下游所有异常并定型响应体）。
- 模块边界：`@Module({ imports, controllers, providers, exports })` 显式声明公开面；imports 建立模块间依赖，exports 控制 provider 可见性——这是大型工程里「限界上下文」的落地形式。
- 大型服务演进：单体 Nest（域模块化 + libs）→ 按域拆微服务（Nest Microservices 抽象 Transport：TCP/gRPC/Kafka/MQTT，业务代码不变只换传输层）；与 Spring 的分层理念一致（Controller-Service-Repository）。

```ts
// provider + 工厂 + 模块化 + AOP 的组合示例
import { Injectable, Module, Inject, CanActivate, ExecutionContext } from '@nestjs/common';

// 1. provider：默认单例，由容器实例化
@Injectable()
export class UsersService {
  private db = new Map<number, { id: number; name: string }>();
  findOne(id: number) {
    return this.db.get(id) ?? null;
  }
}

// 2. guard：鉴权切面
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    return Boolean(req.headers.authorization);
  }
}

// 3. 模块：显式声明依赖与公开面
@Module({
  controllers: [],
  providers: [UsersService, AuthGuard],
  exports: [UsersService], // 只导出服务，不导出 guard
})
export class UsersModule {}
```

**加分项（P7 视角）**：

- 实现原理：Nest 的 DI 依赖 TS 的 `emitDecoratorMetadata`（design:paramtypes 反射构造参数类型作为注入 token），容器本质是 Map<token, instance> + 拓扑排序实例化；循环依赖用 `forwardRef(() => OtherModule)` 打破（延迟解析 token）；这也是纯 JS 项目难以优雅使用 Nest 的原因（没有类型元数据）。
- 源码层：中间件/守卫/管道/拦截器在 core 的 router 装配阶段被拉平成一条「guard-chain → interceptor-chain → pipe → handler」的洋葱链，interceptor 用 RxJS Observable 串联（`next.handle().pipe(...)`），所以响应是「流」语义，可以做 timeout（race 抛 TimeoutError）与缓存（tap 短路）。
- 架构权衡：REQUEST scope 让每请求一份实例，代价是「该实例依赖的整棵子树都要 REQUEST」，Nest 文档明确提示可能拖慢 5 倍，正确做法是单例服务 + 显式传入请求上下文（AsyncLocalStorage 存请求级数据是更现代的替代）。
- 生产案例：交易后台 200+ 控制器，早期按技术分层（controller/service/dao 三个大目录）导致「一个需求改五个目录」；重构为域模块（order/user/risk 各自闭环 + shared 只放纯工具），配合 Nx monorepo 把 shared 拆成带版本的 lib，需求平均改动文件数从 9 降到 4；再配合 ValidationPipe 全局开启 whitelist 自动剥离未声明字段，杜绝了脏字段入库问题。

## Q：文件上传/导出大流量场景：流式处理、临时文件、限流？

**核心答案**：上传链路核心是「不落全量到内存」：multipart 请求体本身是 Readable 流，用 busboy 流式解析 field 与 file part，文件边到边写（`pipeline(file, fs.createWriteStream(tmpPath))`），同时用 md5 流式计算哈希做秒传/校验，内存恒定。大文件再加「分片上传」：前端按 5-10MB 切片并行上传，服务端把分片写临时目录（os.tmpdir + uploadId 子目录），按 manifest 记录已收分片，全部到齐后流式合并（append 用读流到写流）转存对象存储并清理临时区。导出链路同理：数据库用游标/分页流式读取（而非全量 find），经 CSV Transform 流逐行产出，`pipeline` 直推 res，配合 HTTP chunked 边生成边下载。限流三层：网关层（用户/IP 维度令牌桶，防单用户打满带宽）、应用层（并发任务数 + 队列，超了排队或 429/439 提示稍后取）、带宽层（Transform 节流控制下行速率）。

**知识点解析**：

- 上传解析：busboy 的 'file' 事件拿到的是流（带 fileTruncate/filename/mimeType info），`req.pipe(busboy)` 后逐 part 处理；不要用 bodyParser/formidable 的全量缓冲模式；服务器要限制 parts 数量、单文件大小（`limit` 选项）与字段名白名单。
- 临时文件治理：临时目录按 uploadId 隔离；写盘失败/请求中断要清理（finally + on close）；定时任务清理超过 TTL（如 24h）的孤儿目录；磁盘要有单独配额监控，避免打满系统盘。
- 流式哈希：`crypto.createHash('md5')` 本身是 Hash 流（可读可写），推荐 `file.on('data', c => hash.update(c))` 边读边更新，最后 `hash.digest('hex')` 一次性取摘要；全程不额外占用与文件等大的内存。
- 分片协议细节：初始化（申请 uploadId、返回分片约定）→ 并行上传（每片带序号与单片 md5）→ 完成通知（服务端校验分片齐全 + 总 md5）→ 合并转存；断点续传=先查 manifest 告知缺失分片；同对象存储直传场景可改「服务端签名 + 端直传 OSS」完全绕开 BFF 带宽。
- 导出限流实践：DB 侧用 keyset 分页（where id > lastId order by id limit N）避免 offset 深翻页；下游压力用并发池（如同时最多 3 个查询任务）；响应流上用节流 Transform（定时 release）控制下行带宽。

```js
// 上传：busboy 流式解析 + 临时文件 + 流式哈希
const busboy = require('busboy');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream');
const { promisify } = require('node:util');
const pipe = promisify(pipeline);

function handleUpload(req, res) {
  const bb = busboy({ headers: req.headers, limits: { fileSize: 2 * 1024 ** 3, files: 1 } });
  req.pipe(bb);

  bb.on('file', async (name, file, info) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
    const tmpPath = path.join(tmpDir, info.filename.replace(/[^\w.-]/g, '_'));
    const hash = crypto.createHash('md5');
    file.on('data', (c) => hash.update(c)); // 流式哈希：不额外占用内存
    try {
      await pipe(file, fs.createWriteStream(tmpPath)); // 边收边写
      res.json({ ok: true, md5: hash.digest('hex'), size: req.socket.bytesRead });
    } catch (e) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      res.status(500).json({ ok: false });
    }
  });
  bb.on('error', () => res.status(400).end());
}

// 导出：DB 游标流 → CSV Transform → res，全程不积内存
const { Transform } = require('node:stream');
const csv = new Transform({
  objectMode: true, // 上游 push 对象
  transform(row, _enc, next) {
    this.push([row.id, row.name, row.createdAt.toISOString()].join(',') + '\n');
    next();
  },
});
app.get('/export', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
  await pipe(dbCursorStream(req.query.lastId), csv, res); // pipeline 自动处理背压与销毁
});
```

**加分项（P7 视角）**：

- 背压在真实链路的表现：客户端上行慢 → req 流速慢 → writeStream 水位不涨；客户端快、磁盘慢 → write 返回 false → busboy 的 file 流 pause → TCP 接收窗口收缩 → 反压回客户端——整条链路靠 stream 背压自动对齐，这是「流式处理大文件」的本质收益。
- 直传架构：超大文件走「BFF 签发 STS/presigned URL + 端直传对象存储」，上传流量完全不过 Node；BFF 只做授权与回调校验，带宽成本下降一个数量级，代价是端上多实现一个直传 SDK 与跨端一致性问题。
- 限流算法选型：网关用令牌桶（允许突发、平均限速）而非漏桶（绝对平滑）；单机并发用信号量（p-limit），分布式用 Redis + Lua 的令牌桶（incr+expire 原子化），导出场景加「任务队列 + 到期轮询取结果」比让 HTTP 长等更友好。
- 生产案例：导出 500 万行曾把从库 CPU 打满（一次性大查询），改为 keyset 分页 + 每批 sleep 的恒速游标后从库压力平稳；上传服务曾因用户重复点击造成同一文件并发写盘，加「uploadId 幂等锁（Redis SETNX）+ 临时目录原子 rename（同一文件系统内 rename 是原子的）」后消除脏文件。

## Q：部署：Docker + pm2/K8s、健康检查、日志（pino）与链路追踪？

**核心答案**：容器化的要点是多阶段构建（builder 阶段装依赖构建、runtime 阶段只带产物 + production 依赖）、node:alpine/slim 基础镜像、Tini/dumb-init 处理 PID 1 信号转发（或 `docker run --init`），否则 SIGTERM 收不到、优雅退出失效。进程编排二选一：PM2（VM/裸机时代：daemon 守护 + cluster 多核 + logrotate 日志切割，简单直接但状态在单机）；K8s（副本数交给 Deployment，HPA 弹性伸缩，滚动更新靠 readiness 探针 + 优雅退出，进程内不再需要 PM2——一个容器一个进程，崩溃由 kubelet 重启）。健康检查两层：liveness（进程是否卡死，失败就重启容器）与 readiness（能否接流量，失败摘出 Service），Node 侧提供 /healthz（轻量自检）与 /readyz（连 DB/缓存 ping）端点。日志选 pino：结构化 JSON 输出、极低开销（异步、字符串拼接而非对象格式化在主线程完成，transport 走独立 worker），pino-http 自动打请求日志，redaction 脱敏。链路追踪用 OpenTelemetry：SDK 自动埋点 http/db，跨服务透传 W3C traceparent 头，trace_id 注入 pino 的 log context，Jaeger/Tempo 收集，实现「日志 → trace → 慢请求火焰图」联动。

**知识点解析**：

- Docker 细节：`.dockerignore` 排除 node_modules；锁文件与依赖层先 COPY（利用层缓存）；ENV NODE_ENV=production + `npm ci --omit=dev`；镜像内非 root 用户运行；健康检查 HEALTHCHECK 指令与 K8s 探针语义要对齐。
- pm2 vs K8s 的分工：PM2 的 cluster 多核在 K8s 里被「多副本单进程」替代（容器 CPU limit 决定副本内并发能力）；PM2 的 logrotate 对应容器 stdout 收集（EFK/Loki）；PM2 仍适合无 K8s 的中小项目和本地多进程管理（ecosystem.config.js 声明 instances/exec_mode/max_memory_restart）。
- 优雅退出完整链路：K8s 删 Pod → endpoints 摘除（readiness 失败/删除事件）→ SIGTERM → preStop sleep 缓冲 endpoint 传播 → server.close + closeIdleConnections → flush 日志/trace → 超时 SIGKILL；terminationGracePeriodSeconds 必须 > 最长请求耗时。
- pino 架构：主线程只做 `JSON.stringify` 友好的序列化（pino 的 fast-json-stringify/fast-safe-stringify 思路）并写入目标（默认同步 stdout 极速），复杂格式化（如 pretty、发 ES）放到 worker thread transport（pino.transport），绝不阻塞事件循环；child logger 继承上下文字段（trace_id/userId）。
- 链路追踪核心概念：trace（一次请求全链路）→ span（一次调用），采样率控制开销（头部采样 vs 尾部采样），跨进程靠 W3C Trace Context（traceparent header）透传，Node 用 @opentelemetry/sdk-trace-node + auto-instrumentations 一行接入。

```js
// pino 结构化日志 + child 上下文 + 脱敏
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: { paths: ['req.headers.authorization', '*.password'], censor: '[REDACTED]' },
  // 生产直接 JSON 到 stdout，由采集器（Loki/EFK）消费；本地开发开 pretty
  transport: process.env.NODE_ENV === 'local' ? { target: 'pino-pretty' } : undefined,
});

// 请求级 child logger：trace_id 与 user_id 贯穿该请求所有日志
app.use((req, res, next) => {
  req.log = logger.child({ trace_id: req.headers.traceparent ?? genId(), user_id: req.user?.id });
  next();
});

// 健康检查端点：liveness 轻量、readiness 检查下游
app.get('/healthz', (req, res) => res.json({ ok: true })); // liveness：进程活着
app.get('/readyz', async (req, res) => {
  try {
    await Promise.all([db.ping(), redis.ping()]);
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false }); // 503 → K8s 摘除流量但不重启
  }
});
```

```yaml
# K8s 部署关键片段
livenessProbe:
  httpGet: { path: /healthz, port: 3000 }
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /readyz, port: 3000 }
  periodSeconds: 5
lifecycle:
  preStop:
    exec: { command: ['sh', '-c', 'sleep 5'] } # 等 endpoints 传播完再收 SIGTERM
terminationGracePeriodSeconds: 30
```

**加分项（P7 视角）**：

- PID 1 问题：容器里 node 是 1 号进程时，默认忽略 SIGTERM 之外还有僵尸子进程回收问题（PID 1 不响应 SIGCHLD 语义）；`docker run --init` 或 tini 一步解决，否则「容器 stop 卡 10 秒才强杀」就是它的表象；npm start 会多一层 npm 进程转发信号，现代做法是 `node dist/main.js` 直接作为 entrypoint。
- pino 性能口径：官方 benchmark 下 pino 同步模式可达 10 万+ 行/秒，async transport 在 worker 里格式化/发送；对比 winston 的流式转发的坑：winston 每条日志对象经过多个 transport 的拷贝，高吞吐下内存抖动明显——这也是 K8s 时代「日志只写 stdout、无状态进程」哲学的配套选择。
- 观测三支柱打通：trace_id 进日志（pino mixin）+ metrics 打点（prom-client，/metrics 端点）+ trace（OTel），一次告警可以从「慢接口 P99 毛刺」跳到该时间窗的 trace 再跳到那条 error 日志的完整上下文；采样策略上头部采样 10% + 错误全采（tail sampling 在 collector 层做）。
- 生产案例：滚动更新期间 5xx 尖刺，排查是 readiness 摘除后仍有一批 in-flight 请求被 SIGKILL 截断——补 preStop sleep + server.closeIdleConnections + terminationGracePeriodSeconds 调大到 30s 后尖刺归零；另一个案例是 alpine 镜像里 glibc 不兼容导致 sharp 原生模块崩，切 debian-slim 并按目标平台构建（--platform）解决。
