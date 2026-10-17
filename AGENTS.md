# Repository Guidelines

## Project Structure & Module Organization

Things4Web is a web client for macOS Things3. It consists of a Rust/Axum backend that communicates with Things3 via JXA (JavaScript for Automation) and a React/TypeScript frontend built with Vite.

- `backend/src/`: Rust Axum service (`main.rs`, `models.rs`, `things.rs`) listening on `127.0.0.1:3001` (override via `PORT`).
- `backend/scripts/`: JXA automation scripts executed via `osascript` (`list_lists.js`, `list_tasks.js`, `create_task.js`, `complete_task.js`, `refresh.js`).
- `frontend/src/`: React 19 + TypeScript SPA (`App.tsx`, `components/`, `api/`, `types/`) with support for real API integration and offline mock mode.
- `run.sh`: Root helper script that starts both backend and frontend concurrently for local development.
- `docs/`: Architecture plan (`development-plan.md`) and task/issue resolution logs (`todo.md`).

Keep browser code isolated from direct Things3 access; all mutations and queries flow through the backend REST API.

## Build, Test, and Development Commands

- `./run.sh` to start both the backend (`cargo run`) and frontend (`npm run dev`) concurrently.
- `cd backend && cargo run` to start the backend locally.
- `cd backend && cargo fmt --check` to verify Rust formatting.
- `cd backend && cargo clippy --all-targets --all-features -- -D warnings` to run lint checks.
- `cd backend && cargo test` to run Rust unit and integration tests.
- `cd frontend && npm run dev` to start the Vite development server.
- `cd frontend && npm run build` to validate the production frontend build.

Run individual JXA helpers directly from the repository root:
```bash
osascript -l JavaScript backend/scripts/list_lists.js
osascript -l JavaScript backend/scripts/list_tasks.js '{"listName": "今天", "status": "open"}'
osascript -l JavaScript backend/scripts/create_task.js '{"name": "任务标题", "targetList": "今天"}'
osascript -l JavaScript backend/scripts/complete_task.js '{"id": "<TASK_ID>", "status": "completed"}'
osascript -l JavaScript backend/scripts/refresh.js '{"relaunch": false}'
```
Note: JXA execution requires macOS, Things3 installed, and granted Automation permissions under System Settings -> Privacy & Security -> Automation.

## Backend API Endpoints

All endpoints default to base URL `http://127.0.0.1:3001`:

- `GET /healthz`: Health check returning `{"status": "ok"}`.
- `GET /api/v1/lists`: Returns builtin lists, areas, and projects. Logbook and Trash are filtered out.
- `GET /api/v1/tasks?listName=...&listId=...&status=...`: Query tasks filtered by container and status (`open`, `completed`, `canceled`).
- `POST /api/v1/tasks`: Create a new task with payload `{ name, notes?, targetList?, dueDate?, tags? }`.
- `POST /api/v1/tasks/:id/complete` & `PATCH /api/v1/tasks/:id`: Toggle or update task status (`status`: `"completed" | "open" | "canceled"`).
- `POST /api/v1/refresh`: Trigger Things3 focus activation (or relaunch if `relaunch: true`) to force Things Cloud incremental sync.

## Coding Style & Naming Conventions

Use `rustfmt` for Rust and Prettier defaults for TypeScript/React. Follow the existing JXA style: two-space indentation, semicolons, `camelCase` variables, and `function run(argv)` entry points. API and JSON fields use `camelCase`; files use `snake_case` for Rust and scripts, and `PascalCase` for React components. Keep JXA stdout JSON-only; write any diagnostics to stderr via Foundation `NSFileHandle.fileHandleWithStandardError`.

## Testing Guidelines

Add focused Rust unit tests in `backend/src/main.rs` (or dedicated test modules) for JSON mapping, payload validation, and date conversions. Frontend tests and mocks (`frontend/src/api/mockData.ts`) cover loading, empty, filtered, task creation, and error states. Name tests after the behavior under test, such as `maps_open_task_json` or `maps_create_task_payload_json`. Real Things3 integration checks are manual smoke tests on macOS; automated tests must use fixtures without invoking live `osascript`.

## Commit & Pull Request Guidelines

Follow Conventional Commits (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Keep commit subjects concise and imperative. Pull requests should explain scope and behavior, document API or script contract changes, call out any required macOS permissions, and include screenshots for UI modifications.

## Data Model

### Task (ToDo)

Things3 待办事项的规范 JSON 表示，由 `backend/scripts/list_tasks.js`、`create_task.js`、`complete_task.js` 产出，Rust 后端原样转发。所有字段使用 `camelCase`。

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

### ListInfo (清单、区域与项目)

由 `backend/scripts/list_lists.js` 产出，统一表示侧边栏导航条目：

```json
[
  { "id": "TMInboxListSource", "name": "收件箱", "kind": "builtin", "areaId": null, "areaName": null },
  { "id": "33qqsaBfTJHDoUYno5uMNb", "name": "工作", "kind": "area", "areaId": null, "areaName": null },
  { "id": "6LZSFCcw7zge5p6mjmuZjM", "name": "ML", "kind": "project", "areaId": "33qqsaBfTJHDoUYno5uMNb", "areaName": "工作" }
]
```

- `kind`: `"builtin" | "area" | "project"`。
- 项目（`project`）包含所归属的 `areaId` 和 `areaName`（若未归属于区域则为 `null`）。
- 内置清单排除“日志簿”（`TMLogbookListSource`）和“废纸篓”（`TMTrashListSource`）。

### Things3 对象模型与继承注意事项

- 在 Things3 的 AppleScript 字典定义中，`project` 继承自 `to do`（`<class name="project" inherits="to do">`）。
- 当遍历 `area.toDos()` 时，Things3 会同时返回该区域下的独立待办以及所属项目本身。脚本层必须通过 `pcls === "project"` 过滤排除项目实体，并调用 `project.toDos()` 展开读取项目内部的真正待办事项，避免将项目误当作待办输出。

### JXA 响应包络 (Envelope)

所有 JXA 脚本标准输出均遵循统一包络结构：

```json
// 成功
{ "ok": true, "data": { ... } }

// 失败
{ "ok": false, "error": { "code": "E_NOT_FOUND", "message": "...", "details": null } }
```

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

Never commit tokens or credentials. Default network binding to `127.0.0.1:3001`. Keep Authorization headers out of application logs. Never concatenate untrusted strings into shell commands; invoke `osascript` with typed argument arrays (`tokio::process::Command::new("osascript").args(...)`).
