// 获取指定清单中的 Things3 待办事项。
//
// 用法:
//   osascript -l JavaScript backend/scripts/list_tasks.js '{"listName": "今天"}'
//   或直接传名称:
//   osascript -l JavaScript backend/scripts/list_tasks.js '今天'
//
// 契约:
//   - 入口为 function run(argv)
//   - stdout 只输出合法 JSON
//   - 成功: { "ok": true, "data": [ ...tasks ] }
//   - 失败: { "ok": false, "error": { "code": "...", "message": "...", "details": null } }

function logStderr(message) {
  try {
    ObjC.import("Foundation");
    const errHandle = $.NSFileHandle.fileHandleWithStandardError;
    const str = $.NSString.alloc.initWithString(message + "\n");
    errHandle.writeData(str.dataUsingEncoding($.NSUTF8StringEncoding));
  } catch (e) { }
}

// 格式化 Things 3 日历日期 (YYYY-MM-DD)，避免时区偏移
function formatDateOnly(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 格式化时间戳 (RFC 3339 / ISO 8601)
function formatTimestamp(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

const BUILTIN_ALIASES = {
  inbox: "TMInboxListSource",
  收件箱: "TMInboxListSource",
  today: "TMTodayListSource",
  今天: "TMTodayListSource",
  anytime: "TMNextListSource",
  随时: "TMNextListSource",
  upcoming: "TMCalendarListSource",
  计划: "TMCalendarListSource",
  someday: "TMSomedayListSource",
  某天: "TMSomedayListSource",
  logbook: "TMLogbookListSource",
  日志簿: "TMLogbookListSource",
  trash: "TMTrashListSource",
  废纸篓: "TMTrashListSource",
};

function findTargetContainer(app, identifier) {
  if (!identifier) {
    return null;
  }

  // 1. 检查内置清单别名 (如 "今天" -> "TMTodayListSource")
  const aliasId = BUILTIN_ALIASES[identifier.trim().toLowerCase()] || BUILTIN_ALIASES[identifier.trim()];
  if (aliasId) {
    try {
      const list = app.lists.byId(aliasId);
      if (list && list.name()) {
        return { target: list, kind: "builtin", name: list.name() };
      }
    } catch (e) { }
  }

  // 2. 按 ID 查找内置清单或区域
  try {
    const listById = app.lists.byId(identifier);
    if (listById && listById.name()) {
      return { target: listById, kind: "list", name: listById.name() };
    }
  } catch (e) { }

  // 3. 按名称查找内置清单或区域 (Things3 的 lists 集合包含内置清单和 areas)
  try {
    const matchedLists = app.lists.whose({ name: identifier })();
    if (matchedLists && matchedLists.length > 0) {
      return { target: matchedLists[0], kind: "list", name: matchedLists[0].name() };
    }
  } catch (e) { }

  // 4. 按 ID 查找项目
  try {
    const projById = app.projects.byId(identifier);
    if (projById && projById.name()) {
      return { target: projById, kind: "project", name: projById.name() };
    }
  } catch (e) { }

  // 5. 按名称查找项目
  try {
    const matchedProjs = app.projects.whose({ name: identifier })();
    if (matchedProjs && matchedProjs.length > 0) {
      return { target: matchedProjs[0], kind: "project", name: matchedProjs[0].name() };
    }
  } catch (e) { }

  return null;
}

function parseInput(argv) {
  if (!argv || argv.length === 0) {
    return {};
  }
  const raw = argv[0];
  if (!raw || typeof raw !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return { listName: String(parsed) };
  } catch (e) {
    // 无法解析为 JSON，则作为纯字符串名称处理
    return { listName: raw };
  }
}

function run(argv) {
  try {
    const input = parseInput(argv);
    const identifier = input.listName || input.listId || input.name || input.id;
    const statusFilter = input.status ? String(input.status).toLowerCase() : null;

    const app = Application("Things3");

    let todos = [];
    if (identifier) {
      const container = findTargetContainer(app, identifier);
      if (!container) {
        return JSON.stringify({
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `List or project not found: ${identifier}`,
            details: null,
          },
        });
      }
      todos = container.target.toDos();
    } else {
      // 未指定清单时，返回所有待办
      todos = app.toDos();
    }

    const tasks = [];
    for (let i = 0; i < todos.length; i++) {
      const todo = todos[i];
      let p;
      try {
        p = todo.properties();
      } catch (err) {
        continue;
      }

      const status = p.status ? String(p.status).toLowerCase() : "open";
      if (statusFilter && status !== statusFilter) {
        continue;
      }

      let projectId = null;
      let projectName = null;
      if (p.project) {
        try {
          projectId = p.project.id();
          projectName = p.project.name();
        } catch (e) { }
      }

      let areaId = null;
      let areaName = null;
      if (p.area) {
        try {
          areaId = p.area.id();
          areaName = p.area.name();
        } catch (e) { }
      }

      const tags = p.tagNames
        ? p.tagNames
          .split(",")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
        : [];

      tasks.push({
        id: p.id,
        name: p.name || "",
        status: status,
        notes: p.notes || "",
        projectId: projectId,
        projectName: projectName,
        areaId: areaId,
        areaName: areaName,
        tags: tags,
        dueDate: formatDateOnly(p.dueDate),
        activationDate: formatDateOnly(p.activationDate),
        completionDate: formatTimestamp(p.completionDate),
        cancellationDate: formatTimestamp(p.cancellationDate),
        creationDate: formatTimestamp(p.creationDate),
        modificationDate: formatTimestamp(p.modificationDate),
      });
    }

    return JSON.stringify({
      ok: true,
      data: tasks,
    });
  } catch (error) {
    logStderr("list_tasks error: " + error.message);
    return JSON.stringify({
      ok: false,
      error: {
        code: "THINGS_SCRIPT_FAILED",
        message: error.message || "Failed to query Things3 tasks",
        details: null,
      },
    });
  }
}
