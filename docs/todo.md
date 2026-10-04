# ThingsWeb 待办事项与问题解决记录

- [x] **学习 backend 中的修改**
  - **架构机制**：采用 Rust + Axum + Tokio 异步运行时，严格按照 `AGENTS.md` 规范管理进程调用与数据模型。
  - **接口定义**：
    - `GET /healthz`：基础健康检查。
    - `GET /api/v1/lists`：调用 `list_lists.js` 获取内置清单（已排除日志簿与废纸篓）、区域（Areas）以及带所属区域关系的项目（Projects）。
    - `GET /api/v1/tasks`：调用 `list_tasks.js` 获取任务列表，支持按清单、区域或项目名称/ID（`listName`, `listId`）与任务状态（`status`）过滤。
    - `POST /api/v1/refresh`：调用 `refresh.js` 唤醒/激活 Things3 触发云同步与界面刷新。
  - **安全与稳定性**：
    - 脚本通过 `include_str!` 嵌入二进制并动态定位/提取，直接通过参数数组执行 `osascript -l JavaScript <script> <json_args>`，彻底杜绝 shell 注入。
    - 统一的 `JxaResponse<T>` 错误包络与 `models::Task` / `models::ListInfo` 强类型映射。
    - Axum 配置统一 CORS 中间件，供 Vite 前端跨域调用。

- [x] **Things 能否通过 osascript 实现刷新?**
  - **官方能力现状**：经查阅 Things3 原生字典文件 `/Applications/Things3.app/Contents/Resources/Things.sdef`，Things3 官方 AppleScript/JXA 字典中**没有**直接提供名为 `sync` 或 `refresh` 的命令。
  - **可行解决方案与落地**：
    1. **置前激活（Activate，推荐标准方案）**：在 JXA 中调用 `Application("Things3").activate()`。Things3 获得焦点时会自动触发网络状态检查并与 Things Cloud 启动增量同步。
    2. **冷启动重启（Relaunch）**：若需强制重新建立连接，通过 `app.quit()` + `delay(1)` + `app.activate()` 实现冷启动同步。
    3. **现已落地**：编写了 `backend/scripts/refresh.js`，后端接入 `POST /api/v1/refresh`，前端“刷新”按钮同步调用该接口，在界面刷新的同时触发 Things3 本地同步。

- [x] **我不需要日志簿 和 废纸篓**
  - **已解决**：
    - 在 `backend/scripts/list_lists.js` 中增加过滤黑名单，剔除 ID 为 `TMLogbookListSource`、`TMTrashListSource` 以及名称为“日志簿”、“废纸篓”、“logbook”、“trash”的内置清单。
    - 在前端 `Sidebar.tsx`、`App.tsx` 和 Mock 数据中移除了日志簿和废纸篓的相关逻辑与图标。

- [x] **对于一个 area 中的一个list, 该 list 可能不是一个 todo, 这个问题需要解决**
  - **根因分析**：
    - 在 Things3 的 AppleScript 对象模型中，`project` 类继承自 `to do`（`<class name="project" inherits="to do">`）。
    - 当调用 `area.toDos()` 时，Things3 会将该区域内的所有项目（Projects）和独立待办一并返回。原代码盲目将其全量当成待办处理，导致项目（如 `ML`、`Python` 等）被错误地当成单个带有勾选框的 todo 输出，且项目内部真正的子任务无法被查出。
    - 同时，原 `list_lists.js` 未遍历 `app.projects()`，导致侧边栏缺失项目导航。
  - **已解决**：
    - **脚本层（`list_lists.js`）**：遍历 `app.projects()` 并提取其所属的 `areaId` 和 `areaName`，输出 `kind: "project"`。
    - **任务查询层（`list_tasks.js`）**：
      - 查询 Area 时，通过属性 `pcls === "project"` 识别出项目对象，展开提取该项目下的所有实际待办（`project.toDos()`），彻底杜绝把项目本身当作 fake todo 输出。
      - 在属性解析中，若任务本身未直接挂载 area 但其属于某个 project，自动从所属 project 递归继承 `areaId` 与 `areaName`。
      - 查询 Project 时直接定位项目并返回其内部所有真实待办。
    - **前端展示层（`Sidebar.tsx`）**：在侧边栏中将项目（Projects）层级化缩进展示在所属区域（Areas）下方，支持点击区域查看该区域全量待办，或点击具体项目仅查看该项目下的待办。