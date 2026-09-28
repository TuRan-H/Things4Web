# ThingsWeb 开发计划
## 1. 项目目标

构建一个运行在 macOS 上的 Things3 后端服务（backend），并通过 Web 前端（frontend）在任意具备浏览器和网络访问能力的设备上查看和操作 Things3 内容。

目标结构：

```text
客户端浏览器
    |
    | HTTP(S) + Bearer Token
    v
backend（Rust 后端）
    |
    | osascript -l JavaScript
    v
Things3
```

核心原则：

- AppleScript/JXA 只能在 macOS 上执行，浏览器前端不能直接调用 Things3。
- Web 页面只访问 Rust 后端暴露的 HTTP JSON API。
- 后端通过 Things3 官方 AppleScript 对象模型操作数据，不直接读写 Things3 的 SQLite 数据库。
- 第一版只读，读写接口稳定后再增加修改、完成、取消和删除能力。
- 默认只监听本机；需要从其他设备访问时，再显式开启局域网或 Tailscale。

## 2. 技术选型

| 层 | 选型 | 原因 |
| --- | --- | --- |
| 后端 backend | Rust | 单二进制、强类型、适合长期运行和进程管理，同时满足学习目标 |
| HTTP | axum | 轻量、与 tokio 集成简单、类型清楚 |
| 异步运行时 | tokio | 管理 HTTP、子进程和超时 |
| JSON | serde + serde_json | 序列化 API 数据，隔离 JXA 返回格式 |
| 进程调用 | tokio::process::Command | 异步调用 osascript，不经过 shell |
| 日志 | tracing + tracing-subscriber | 结构化日志和请求追踪 |
| 脚本层 | JXA | 比 AppleScript 字符串更好处理 JSON 和错误 |
| 前端 frontend | TypeScript + React + Vite | 适合构建跨设备浏览器界面，开发体验成熟 |
| 部署 | macOS 原生的单二进制 | JXA 脚本通过 `include_str!` 编译进二进制；路径、权限和 AppleScript 行为最直接 |
| 开发备选 | OrbStack Linux VM | 仅在阶段 0 验证 hcontrol/osascript 桥接可用后作为临时开发路径，不纳入 MVP 的可靠交付条件 |

不采用：

- 不让浏览器端直接访问 Things3 数据库。
- 不把 JXA 当作 SQL 查询语言使用。
- 不在 Rust 中拼接 AppleScript/JXA 源码。
- 不让生产部署依赖未经验证的 OrbStack/hcontrol 桥接。
- 不在第一版引入数据库、消息队列或微服务。

## 3. 推荐目录结构

```text
ThingsWeb/
├── backend/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs
│   │   ├── config.rs
│   │   ├── error.rs
│   │   ├── state.rs
│   │   ├── routes/
│   │   │   ├── mod.rs
│   │   │   ├── health.rs
│   │   │   ├── tasks.rs
│   │   │   ├── projects.rs
│   │   │   ├── areas.rs
│   │   │   └── tags.rs
│   │   └── things/
│   │       ├── mod.rs
│   │       ├── model.rs
│   │       ├── client.rs
│   │       └── error.rs
│   └── scripts/              # JXA 源码，编译期嵌入二进制
│       ├── list_lists.js
│       ├── list_tasks.js
│       ├── list_projects.js
│       ├── list_areas.js
│       ├── list_tags.js
│       ├── create_task.js
│       ├── update_task.js
│       └── delete_task.js
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── types/
│   └── vite.config.ts
├── docs/
│   ├── development-plan.md
│   ├── api.md
│   ├── script-contract.md
│   └── deployment.md
├── .env.example
├── .gitignore
└── README.md
```

## 4. 数据模型

### Task

```json
{
  "id": "359qUEgSetpqxab3vF14oC",
  "name": "学习FSDP",
  "status": "open",
  "notes": "",
  "projectId": "Nv2JNeHMQpbt7nFBj98Xh8",
  "projectName": "ML",
  "areaId": null,
  "areaName": null,
  "tags": ["重要"],
  "dueDate": null,
  "activationDate": null,
  "completionDate": null,
  "cancellationDate": null,
  "creationDate": "2026-02-15T18:21:47Z",
  "modificationDate": "2026-03-02T16:02:59Z"
}
```

状态枚举：

```text
open
completed
canceled
```

约束：

- API 内外统一使用 `camelCase` 字段。
- ID 始终以 Things3 返回值作为唯一标识，不能用任务名称代替。
- 项目、区域、标签允许为空。

### 日期与时间

日期字段必须按语义区分，不能统一当作 UTC 时间戳：

| 字段 | 类型 | 约定 |
| --- | --- | --- |
| `dueDate` | `YYYY-MM-DD \| null` | Things3 中的日历日期，不带时区 |
| `activationDate` | `YYYY-MM-DD \| null` | Things3 中的日历日期，不带时区 |
| `completionDate` | RFC 3339 \| null | 完成时间戳 |
| `cancellationDate` | RFC 3339 \| null | 取消时间戳 |
| `creationDate` | RFC 3339 | 创建时间戳；若 API 无法稳定提供，则从模型移除 |
| `modificationDate` | RFC 3339 | 修改时间戳；若 API 无法稳定提供，则从模型移除 |

禁止把 `dueDate` 转换为 UTC 零点后再交给前端展示，否则在 UTC+8 等时区可能出现日期前移。

## 5. API 设计

### 只读接口

```text
GET /healthz
GET /api/v1/tasks?status=open
GET /api/v1/tasks/:id
GET /api/v1/projects
GET /api/v1/areas
GET /api/v1/tags
```

### 写入接口

```text
POST   /api/v1/tasks
PATCH  /api/v1/tasks/:id
POST   /api/v1/tasks/:id/complete
POST   /api/v1/tasks/:id/cancel
POST   /api/v1/tasks/:id/move
POST   /api/v1/tasks/:id/schedule
DELETE /api/v1/tasks/:id
```

写入接口属于第二阶段，第一版不实现。

### 通用响应约定

成功响应直接返回资源或数组。错误响应统一为：

```json
{
  "error": {
    "code": "THINGS_SCRIPT_FAILED",
    "message": "Things3 returned an error",
    "details": null
  }
}
```

错误码至少包括：

```text
INVALID_REQUEST
UNAUTHORIZED
NOT_FOUND
THINGS_NOT_RUNNING
THINGS_PERMISSION_DENIED
THINGS_SCRIPT_FAILED
TIMEOUT
INTERNAL_ERROR
```

`details` 只放经过脱敏的诊断信息，例如子进程退出码、错误阶段和截断后的 stderr；不得包含 Bearer Token、完整请求头或其他凭据。

`osascript` 的 stderr 文本不是稳定 API。错误分类器必须保留原始诊断信息，并在无法可靠分类时回退到 `THINGS_SCRIPT_FAILED`。

### JXA 脚本契约

所有 JXA 脚本使用同一套输入输出契约：

- 入口函数固定为 `function run(argv)`。
- Rust 只通过一个 JSON 字符串参数传递业务参数，不接受位置参数混用。
- stdout 只能输出一个 JSON 对象，不允许夹杂日志或调试文本。
- 日志、原始错误和诊断信息写入 stderr。
- 成功格式：`{ "ok": true, "data": ... }`。
- 失败格式：`{ "ok": false, "error": { "code": "...", "message": "...", "details": ... } }`。
- 预期业务失败可以返回非零退出码；Rust 必须先检查退出码，再解析 stdout。
- stdout 解析失败、输出为空或出现非 JSON 内容时，统一映射为 `THINGS_SCRIPT_FAILED`。

脚本负责查询 Things3 并转换数据；Rust 负责参数校验、认证、超时、并发、缓存和错误映射。

## 6. Rust 后端开发原则

### 进程调用

使用参数数组调用，禁止 shell 拼接：

```rust
let args_json = serde_json::to_string(&request)?;

Command::new(osascript_path)
    .arg("-l")
    .arg("JavaScript")
    .arg("-e")
    .arg(include_str!("../../scripts/list_tasks.js"))
    .arg(args_json)
    .output()
    .await
```

禁止：

```rust
Command::new("sh").arg("-c").arg(format!("osascript -e '{}'", user_input))
```

### 并发控制

AppleScript/JXA 调用不应无限并发。使用 `Semaphore` 限制同时执行数量：

- 第一阶段固定为 1。
- 确认稳定性后再考虑 2。
- 读请求按“接口 + 查询参数”建立 5 到 15 秒内存缓存。
- 缓存过期时使用 single-flight 合并并发请求，避免同一时刻重复调用 osascript。
- 可选的 stale-if-error 策略最多返回 60 秒内的旧数据，并在响应中标记 `stale: true`。
- 写入完成后主动失效相关缓存。

### 超时与取消

- 每个 osascript 调用设置超时，建议 10 秒。
- 超时后调用 `child.kill()` 并 `wait()` 回收子进程，再返回 `TIMEOUT`。
- 前端不得因为一个长时间请求而无限等待。

### 脚本职责

JXA 脚本只负责：

- 从 Things3 查询对象。
- 将对象转换为稳定 JSON。
- 执行明确的创建、修改或删除操作。
- 返回结构化错误信息。

Rust 负责：

- HTTP 参数校验。
- 权限认证。
- 超时、并发和缓存。
- 将脚本结果反序列化为 Rust 类型。

## 7. 开发阶段

### 阶段 0：环境验证

目标：确认后端最终运行位置和调用路径。

任务：

- 确认优先运行在 macOS 原生环境。
- 将 OrbStack Linux VM 仅作为实验路径；只有确认 `/opt/orbstack-guest/bin/osascript` 和 hcontrol 桥接可用后，才允许用于临时开发。
- 验证 Things3 版本和 AppleScript 权限。
- 验证 Things3 未运行、自动化权限拒绝、脚本语法错误和查询超时时的原始错误输出。
- 记录 macOS 版本、Things3 版本、osascript 路径和可观测到的错误特征。
- 决定客户端浏览器到后端的网络方案：局域网、Tailscale 或 SSH 隧道。

验收：

- 能在目标环境中执行一条只读 Things3 查询。
- 能读取当前未完成任务数量。
- 失败时能区分沙箱权限、macOS 自动化和 Things3 脚本错误。
- 能为每个错误类别保存一条真实错误样本，供后续 fixture 和分类器测试使用。
- OrbStack 路径失败时不影响 macOS 原生方案继续推进。

### 阶段 1：Rust 与 osascript 最小验证

目标：不写 HTTP，先打通 Rust 到 Things3。

任务：

- 创建 `backend` Cargo 项目。
- 编写一个 CLI 子命令，例如 `backend tasks --status open`。
- 编写 `scripts/list_tasks.js`。
- 固化 JXA 脚本契约、参数格式和 Task 日期模型。
- 使用 `tokio::process::Command` 调用 JXA。
- 将结果反序列化为 `Vec<Task>`。
- 为 JSON 解析、日期转换和脚本错误输出增加 fixture 单元测试。
- 输出格式化 JSON 到标准输出。

验收：

- 命令退出码为 0。
- 使用真实 Things3 手工验证能返回当前未完成任务。
- 任务数量不写入验收标准；fixture 测试不依赖用户当前数据。
- 输出对象字段符合 `Task` 模型。
- 单独任务查询能通过 ID 完成。

### 阶段 2：只读 HTTP API

目标：把 CLI 能力封装为 HTTP 服务。

任务：

- 引入 `axum`、`serde`、`tracing`。
- 实现 `/healthz`。
- 实现 `/api/v1/tasks`。
- 实现 `/api/v1/projects`、`areas`、`tags`。
- 增加 Bearer Token 认证。
- 增加请求日志和错误映射。
- 增加读缓存和 osascript 并发限制。
- 增加缓存过期时的 single-flight 请求合并。
- 增加错误分类器测试，覆盖权限拒绝、Things3 未运行、脚本失败和超时。

验收：

- 浏览器或 curl 可通过 HTTP 获取 JSON。
- 无 Token 返回 401。
- Things3 脚本失败返回结构化错误。
- 并发请求在缓存有效或过期时都不会重复调用 osascript。
- 错误响应包含稳定错误码，同时保留脱敏后的原始诊断信息。

### 阶段 3：Web 只读前端

目标：完成第一个可用页面。

任务：

- 用 Vite 创建 React + TypeScript 前端。
- 实现任务列表、项目筛选和状态筛选。
- 实现项目、区域和标签展示。
- 实现加载、空数据、错误和重试状态。
- 支持手动刷新。
- 前端 Token 通过运行时配置或本地设置注入，不写死在源码。

验收：

- 浏览器可查看当前 Things3 内容。
- 页面在常见桌面宽度下无文字溢出或布局重叠。
- 数据刷新过程中不会重复触发大量 AppleScript 调用。
- 后端不可达时页面给出明确错误。

### 阶段 4：最小写操作

目标：逐步实现增删改，但先限制低风险能力。

建议顺序：

1. 创建任务。
2. 修改任务名称、备注、标签和截止日期。
3. 完成和取消任务。
4. 移动任务到项目或区域。
5. 计划任务。
6. 删除任务。

任务：

- 编写对应 JXA 脚本。
- Rust 侧执行严格参数校验。
- 前端增加明确操作反馈。
- 对删除操作增加二次确认。
- 记录写入操作日志。
- 写入后刷新对应缓存。
- 在实现删除前验证 Things3 官方对象模型是否支持可恢复或可预期的删除语义。

验收：

- 每项写操作都有成功和失败结果。
- 能通过任务 ID 精确定位对象。
- 删除操作不会误删同名任务。
- 写入失败不会导致后端崩溃。
- 若官方对象模型不支持明确的删除语义，则移除 `DELETE` 接口或只提供取消任务，不使用 UI 自动化规避。

### 阶段 5：安全与部署加固

目标：从开发环境转为长期可运行服务。

任务：

- 默认绑定 `127.0.0.1`。
- 允许其他设备访问时只开放明确端口。
- 推荐通过 Tailscale 或反向代理提供 TLS。
- 限制 CORS 来源。
- 限制请求体大小和写入频率。
- 增加启动时配置校验。
- 使用用户级 `LaunchAgent` 增加 macOS 开机自动启动方案，不使用 `LaunchDaemon`。

验收：

- 服务重启后能自动恢复。
- 日志中不泄露 Token。
- 非授权来源无法调用写接口。
- Mac 离线或休眠时，前端能清楚提示不可用。
- 默认不自动启动 Things3；仅在后续单独验证 Apple Events 和权限行为后考虑。

### 阶段 6：质量与体验

目标：达到可长期日常使用的质量。

任务：

- 扩展 Rust 单元测试和集成测试覆盖范围。
- 使用 fixture 测试 JXA JSON 解析。
- 使用假的 osascript 命令测试错误和超时路径。
- 增加前端组件测试。
- 使用 Playwright 做桌面视口验证。
- 完善 README、API 文档和部署文档。

验收：

- `cargo fmt --check` 通过。
- `cargo clippy --all-targets --all-features -- -D warnings` 通过。
- `cargo test` 通过。
- 前端 `npm run build` 通过。
- 至少验证一次真实 Things3 只读链路。

## 8. 测试策略

### Rust

- 单元测试：JSON 映射、日期转换、配置解析、错误映射。
- 集成测试：HTTP 路由、鉴权、缓存、超时。
- 并发测试：缓存过期时的 single-flight 请求合并。
- 进程测试：使用 fixture 脚本模拟 osascript 成功、失败和超时。
- 手工冒烟：连接真实 Things3 查询任务和项目。

### 前端

- API 客户端测试：正常、401、500 和超时。
- 组件测试：加载、空列表、错误、筛选。
- 浏览器验证：桌面和窄屏布局、长任务名、无标签、超长项目名。

## 9. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| Things3 进程未运行 | 查询或写入失败 | 明确错误码；默认不自动启动 Things3，先提示用户 |
| macOS 自动化权限未开启 | osascript 被拒绝 | 文档化权限设置，启动时提供诊断命令 |
| OrbStack 沙箱阻断 hcontrol | 开发环境调用失败 | OrbStack 仅作为实验路径；MVP 以 macOS 原生为准 |
| AppleScript/JXA 接口未覆盖某功能 | 功能无法实现 | 降级为只读或移除该能力，不直接改数据库 |
| 写入误操作 | 数据损坏或误删 | ID 定位、二次确认、日志；未验证删除语义前不提供删除 |
| Mac 睡眠或离线 | 页面无法获取实时数据 | 明确状态提示，必要时展示缓存快照 |
| 并发调用过多 | Things3 卡顿或超时 | Semaphore 串行化，读缓存，single-flight 请求合并 |
| Rust 学习成本 | 交付变慢 | 先打通窄链路，不引入泛型和过度抽象 |

## 10. 首个可交付版本

MVP 范围：

- Rust 后端。
- macOS 原生到 Things3 的 JXA 调用。
- 只读 REST API。
- 可通过浏览器访问的 React 页面。
- 未完成任务、项目、区域和标签展示。
- Bearer Token。
- 基础错误处理、缓存和日志。

明确不包含：

- 用户账号系统。
- 多 Mac 实例同步。
- 公网直接暴露。
- 离线写入。
- 直接操作 Things3 SQLite。
- 复杂权限模型。
- 未验证的 OrbStack/hcontrol 生产部署。

## 11. 建议开发顺序

```text
1. 确认 osascript 执行位置
2. Rust CLI 读取 Things3
3. 固化 JXA 契约、日期语义和 Task 数据模型
4. axum 只读 API
5. Web 只读页面
6. 真实数据端到端验证
7. 创建和修改任务
8. 完成、取消、移动、计划和删除
9. 安全、部署、测试和文档
```

第一周只追求一条能工作的链路，不追求完整功能。只要 `浏览器 -> Rust HTTP -> osascript -> Things3 -> JSON -> 页面` 能稳定跑通，后续功能都只是在这个骨架上扩展。
