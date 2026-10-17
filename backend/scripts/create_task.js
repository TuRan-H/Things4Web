// 在 Things3 中创建新的待办事项。
//
// 用法:
//   osascript -l JavaScript backend/scripts/create_task.js '{"name": "任务标题", "notes": "备注", "targetList": "今天"}'
//
// 契约:
//   - 入口为 function run(argv)
//   - stdout 只输出合法 JSON
//   - 成功: { "ok": true, "data": { ...task } }
//   - 失败: { "ok": false, "error": { "code": "...", "message": "...", "details": null } }

function logStderr(message) {
  try {
    ObjC.import("Foundation");
    const errHandle = $.NSFileHandle.fileHandleWithStandardError;
    const str = $.NSString.alloc.initWithString(message + "\n");
    errHandle.writeData(str.dataUsingEncoding($.NSUTF8StringEncoding));
  } catch (e) {}
}

function formatDateOnly(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
};

function findTargetContainer(app, identifier) {
  if (!identifier) {
    return null;
  }

  const aliasId =
    BUILTIN_ALIASES[identifier.trim().toLowerCase()] ||
    BUILTIN_ALIASES[identifier.trim()];
  if (aliasId) {
    try {
      const list = app.lists.byId(aliasId);
      if (list && list.name()) {
        return { target: list, kind: "builtin", aliasId: aliasId, name: list.name() };
      }
    } catch (e) {}
  }

  // 1. 按 ID 查找区域
  try {
    const areaById = app.areas.byId(identifier);
    if (areaById && areaById.name()) {
      return { target: areaById, kind: "area", name: areaById.name() };
    }
  } catch (e) {}

  // 2. 按名称查找区域
  try {
    const matchedAreas = app.areas.whose({ name: identifier })();
    if (matchedAreas && matchedAreas.length > 0) {
      return { target: matchedAreas[0], kind: "area", name: matchedAreas[0].name() };
    }
  } catch (e) {}

  // 3. 按 ID 查找项目
  try {
    const projById = app.projects.byId(identifier);
    if (projById && projById.name()) {
      return { target: projById, kind: "project", name: projById.name() };
    }
  } catch (e) {}

  // 4. 按名称查找项目
  try {
    const matchedProjs = app.projects.whose({ name: identifier })();
    if (matchedProjs && matchedProjs.length > 0) {
      return { target: matchedProjs[0], kind: "project", name: matchedProjs[0].name() };
    }
  } catch (e) {}

  // 5. 按 ID 查找内置清单
  try {
    const listById = app.lists.byId(identifier);
    if (listById && listById.name()) {
      return { target: listById, kind: "builtin", aliasId: identifier, name: listById.name() };
    }
  } catch (e) {}

  // 6. 按名称查找内置清单
  try {
    const matchedLists = app.lists.whose({ name: identifier })();
    if (matchedLists && matchedLists.length > 0) {
      return { target: matchedLists[0], kind: "builtin", aliasId: matchedLists[0].id(), name: matchedLists[0].name() };
    }
  } catch (e) {}

  return null;
}

function formatTask(todo) {
  const p = todo.properties();
  const status = p.status ? String(p.status).toLowerCase() : "open";

  let projectId = null;
  let projectName = null;
  if (p.project) {
    try {
      projectId = p.project.id();
      projectName = p.project.name();
    } catch (e) {}
  }

  let areaId = null;
  let areaName = null;
  if (p.area) {
    try {
      areaId = p.area.id();
      areaName = p.area.name();
    } catch (e) {}
  } else if (p.project) {
    try {
      const projArea = p.project.area();
      if (projArea) {
        areaId = projArea.id();
        areaName = projArea.name();
      }
    } catch (e) {}
  }

  const tags = p.tagNames
    ? p.tagNames
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean)
    : [];

  return {
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
  };
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
    return { name: String(parsed) };
  } catch (e) {
    return { name: raw };
  }
}

function run(argv) {
  try {
    const input = parseInput(argv);
    const title = (input.name || input.title || "").trim();
    if (!title) {
      return JSON.stringify({
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Task name (title) cannot be empty",
          details: null,
        },
      });
    }

    const app = Application("Things3");
    let targetProject = null;
    let targetArea = null;
    let scheduleForToday = false;

    const targetList = input.targetList || input.listName || input.listId;
    if (targetList) {
      const container = findTargetContainer(app, targetList);
      if (container) {
        if (container.kind === "project") {
          targetProject = container.target;
        } else if (container.kind === "area") {
          targetArea = container.target;
        } else if (container.kind === "builtin") {
          if (
            container.aliasId === "TMTodayListSource" ||
            container.name === "今天" ||
            container.name === "Today"
          ) {
            scheduleForToday = true;
          }
        }
      }
    }

    const taskProps = {
      name: title,
    };

    if (input.notes && typeof input.notes === "string") {
      taskProps.notes = input.notes;
    }

    if (input.dueDate && typeof input.dueDate === "string") {
      const parts = input.dueDate.split("-");
      if (parts.length === 3) {
        taskProps.dueDate = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
          0,
          0,
          0
        );
      }
    }

    if (input.tags && Array.isArray(input.tags) && input.tags.length > 0) {
      taskProps.tagNames = input.tags.join(", ");
    }

    if (targetProject) {
      taskProps.project = targetProject;
    } else if (targetArea) {
      taskProps.area = targetArea;
    }

    const todo = app.ToDo(taskProps);
    app.toDos.push(todo);

    if (scheduleForToday) {
      try {
        app.schedule(todo, { for: new Date() });
      } catch (e) {
        logStderr("Warning: schedule for today failed: " + e.message);
      }
    }

    return JSON.stringify({
      ok: true,
      data: formatTask(todo),
    });
  } catch (error) {
    logStderr("create_task error: " + error.message);
    return JSON.stringify({
      ok: false,
      error: {
        code: "THINGS_SCRIPT_FAILED",
        message: error.message || "Failed to create task in Things3",
        details: null,
      },
    });
  }
}
