# Things4Web

Things4Web 是为 macOS 原生待办应用 [Things3](https://culturedcode.com/things/) 打造的 Web 客户端。通过在 macOS 宿主后台运行轻量 Rust 后端服务，并利用 JXA (JavaScript for Automation) 与 Things3 官方接口通信，使用户能够在局域网任意设备、移动端或跨平台的现代浏览器中无缝浏览、创建并管理 Things3 任务。

---

## 架构设计

```text
浏览器前端 (React + Vite + TypeScript)
             |
             | HTTP JSON API (CORS)
             v
宿主后端 (Rust + Axum + Tokio)
             |
             | osascript -l JavaScript (JXA)
             v
macOS 本地 Things3 客户端
```

- **安全防注入**：Rust 后端通过 `tokio::process::Command` 采用参数数组直接传递 JSON 载荷执行 JXA 脚本，严禁 Shell 字符串拼接。
- **非侵入式数据读取**：严格依赖 Things3 原生 AppleScript/JXA 字典，不直接读写本地 SQLite 数据库，保护数据一致性与安全性。
- **层级关系解构**：针对 Things3 中项目 (Project) 继承自待办 (ToDo) 的特性，在脚本层进行了多层解构与归属计算，避免项目被误当做普通待办输出，并支持递归继承 Area。

---

## 功能特性

- [x] **视图与侧边栏导航**：收件箱、今天、随时、某天、计划等核心视图，以及区域 (Areas) 与所属项目 (Projects) 的树状导航。
- [x] **任务浏览与过滤**：支持按清单、区域、项目及状态 (open / completed / canceled) 过滤待办。
- [x] **任务创建**：支持快速新建待办，填写备注、截止日期、标签，自动关联所属项目/区域或排期至“今天”。
- [x] **任务状态切换**：支持一键勾选完成或重新打开任务，界面具备乐观更新响应体验。
- [x] **云同步触发**：提供后台同步触发机制，通过置前激活 Things3 触发其与 Things Cloud 的增量同步。
- [x] **离线 Mock 模式**：前端内置离线演示数据开关，无需 macOS 环境也可预览完整界面与交互。

---

## 环境要求

- **macOS**：11.0 及以上版本
- **Things3**：Mac 客户端已安装，并已在“系统设置 -> 隐私与安全性 -> 自动化”中授权
- **Rust**：1.75+ (Cargo)
- **Node.js**：18.0+ (npm / pnpm)

---

## 快速开始

### 1. 克隆代码

```bash
git clone git@github.com:TuRan-H/Things4Web.git
cd Things4Web
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

### 3. 一键启动

项目根目录提供了启动脚本 `run.sh`，可同时拉起后端与前端开发服务：

```bash
./run.sh
```

或者分窗口手动启动：

```bash
# 终端 1：启动 Rust 后端 (监听 127.0.0.1:3001)
cd backend
cargo run

# 终端 2：启动 Vite 前端 (监听 http://localhost:5173)
cd frontend
npm run dev
```

首次在 macOS 终端中运行时，系统会弹出授权提示允许访问 Things3，点击“好”即可。

---

## 接口定义

后端服务默认运行于 `http://127.0.0.1:3001`：

| 方法 | 端点 | 说明 |
| :--- | :--- | :--- |
| `GET` | `/healthz` | 基础健康检查 |
| `GET` | `/api/v1/lists` | 获取所有内置清单、区域及项目元数据 |
| `GET` | `/api/v1/tasks` | 获取待办列表，参数：`listName`, `listId`, `status` |
| `POST` | `/api/v1/tasks` | 创建待办，Body: `{ name, notes, dueDate, tagNames, ... }` |
| `POST` | `/api/v1/tasks/:id/complete` | 快速标记任务为完成 |
| `PATCH` | `/api/v1/tasks/:id` | 修改任务状态，Body: `{ status: "open" \| "completed" }` |
| `POST` | `/api/v1/refresh` | 激活 Things3 并触发后台同步 |

---

## 目录结构

```text
.
├── backend/            # Rust 后端源码
│   ├── Cargo.toml
│   ├── scripts/        # 核心 JXA 自动化脚本
│   └── src/            # Axum 路由、模型定义与进程调用逻辑
├── frontend/           # React + TypeScript 前端源码
│   ├── package.json
│   ├── src/            # 组件库、API 客户端及状态管理
│   └── vite.config.ts
├── docs/               # 开发规范与设计文档
├── run.sh              # 一键启动脚本
└── README.md
```

---

## License

[MIT](LICENSE)
