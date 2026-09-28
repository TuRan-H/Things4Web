# Repository Guidelines

## Project Structure & Module Organization

ThingsWeb is planned as a macOS-only Rust backend that calls Things3 through JXA, paired with a React/TypeScript web frontend. The repository is currently a scaffold: `backend/scripts/` contains JXA helpers such as `list_lists.js`, and `docs/development-plan.md` defines the target architecture. Planned source locations are `backend/src/` for Rust modules and `frontend/src/` for the Vite application. Keep browser code out of Things3 access; all operations must flow through the backend API.

## Build, Test, and Development Commands

Build manifests do not exist yet. When adding `backend/Cargo.toml` and `frontend/package.json`, use:

- `cd backend && cargo run` to start the backend locally.
- `cd backend && cargo fmt --check` to verify Rust formatting.
- `cd backend && cargo clippy --all-targets --all-features -- -D warnings` to run lint checks.
- `cd backend && cargo test` to run Rust unit and integration tests.
- `cd frontend && npm run dev` to start the Vite development server.
- `cd frontend && npm run build` to validate the production frontend build.

Run individual JXA helpers with `osascript -l JavaScript backend/scripts/<name>.js`. These require macOS, Things3, and granted Automation permission.

## Coding Style & Naming Conventions

Use `rustfmt` for Rust and Prettier defaults for TypeScript/React. Follow the existing JXA style: two-space indentation, semicolons, `camelCase` variables, and `function run(argv)` entry points. API and JSON fields use `camelCase`; files use `snake_case` for Rust and scripts. Keep JXA stdout JSON-only; write diagnostics to stderr.

## Testing Guidelines

Add focused Rust tests for JSON mapping, date conversion, errors, caching, and timeouts. Frontend tests should cover loading, empty, filtered, and error states. Name tests after the behavior under test, such as `maps_open_task_json`. Real Things3 checks are manual smoke tests; automated tests must use fixtures or fake `osascript` commands.

## Commit & Pull Request Guidelines

There is no commit history yet, so no convention is established. Use concise imperative subjects, for example `Add read-only task endpoint`. Pull requests should explain scope and behavior, list commands run, link related issues, and call out API, security, or macOS-permission changes. Include screenshots for visible frontend changes.

## Data Model

### Task (ToDo)

Things3 待办事项的规范 JSON 表示，由 `backend/scripts/list_tasks.js` 产出，Rust 后端原样转发。所有字段使用 `camelCase`。

```json
{
  "id":               "AuveBWEBx14WC5Xuurb1yf",
  "name":             "continous batch",
  "status":           "open",
  "notes":            "",
  "projectId":        "6LZSFCcw7zge5p6mjmuZjM",
  "projectName":      "ML",
  "areaId":           null,
  "areaName":         null,
  "tags":             ["重要"],
  "dueDate":          null,
  "activationDate":   "2026-09-10",
  "completionDate":   null,
  "cancellationDate": null,
  "creationDate":     "2026-09-02T01:08:56.000Z",
  "modificationDate": "2026-09-22T13:27:31.000Z"
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | `string` | Things3 内部唯一标识，来自 `toDo.id()`，不可由名称替代 |
| `name` | `string` | 任务标题 |
| `status` | `"open" \| "completed" \| "canceled"` | 任务状态，统一转为小写 |
| `notes` | `string` | 备注正文，可为空字符串 |
| `projectId` | `string \| null` | 所属项目 ID；未归属项目时为 `null` |
| `projectName` | `string \| null` | 所属项目名称；未归属项目时为 `null` |
| `areaId` | `string \| null` | 所属区域 ID；未归属区域时为 `null` |
| `areaName` | `string \| null` | 所属区域名称；未归属区域时为 `null` |
| `tags` | `string[]` | 标签名称数组；由 `tagNames` 字段按逗号分割并去空格；无标签时为 `[]` |
| `dueDate` | `"YYYY-MM-DD" \| null` | 截止日期（日历日期，不带时区） |
| `activationDate` | `"YYYY-MM-DD" \| null` | 计划开始日期（Things3 的 "when" 字段，日历日期，不带时区） |
| `completionDate` | `RFC 3339 \| null` | 完成时间戳 |
| `cancellationDate` | `RFC 3339 \| null` | 取消时间戳 |
| `creationDate` | `RFC 3339` | 创建时间戳 |
| `modificationDate` | `RFC 3339` | 最后修改时间戳 |

#### 日期格式规则

- `dueDate` 和 `activationDate` 是 Things3 的"日历日期"概念，**必须**格式化为 `YYYY-MM-DD`，取本地年月日（`getFullYear/getMonth/getDate`），**禁止**调用 `toISOString()`（会因 UTC 转换导致日期在 UTC+8 等时区前移一天）。
- `completionDate`、`cancellationDate`、`creationDate`、`modificationDate` 是精确时间戳，使用 `toISOString()` 输出 RFC 3339 格式。

#### 容器查询优先级

`list_tasks.js` 的 `findTargetContainer()` 按如下顺序匹配入参 `identifier`：

1. 内置清单别名（如 `"今天"` → `TMTodayListSource`，`"inbox"` → `TMInboxListSource`）
2. `app.lists.byId(identifier)`（内置清单或区域 ID）
3. `app.lists.whose({ name: identifier })`（清单或区域名称）
4. `app.projects.byId(identifier)`（项目 ID）
5. `app.projects.whose({ name: identifier })`（项目名称）

#### JXA 脚本入参契约

Rust 后端通过单个 JSON 字符串参数传递业务参数（argv[0]）：

```json
{ "listName": "今天", "status": "open" }
```

- `listName` / `listId` / `name` / `id`：清单、区域或项目的名称或 ID（四选一）。
- `status`（可选）：过滤特定状态的任务，取值 `"open"`、`"completed"`、`"canceled"`。
- 若 argv[0] 不是合法 JSON，则整个字符串作为名称处理（便于 CLI 手动调试）。

---

## Security & Configuration Notes

Never commit tokens or credentials. Default services to `127.0.0.1`, keep Authorization headers out of logs, and validate untrusted input in Rust before invoking JXA with argument arrays rather than shell strings.
