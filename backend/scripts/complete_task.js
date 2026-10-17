// 更新 Things3 待办事项状态（完成/取消/重新打开）。
//
// 用法:
//   osascript -l JavaScript backend/scripts/complete_task.js '{"id": "AuveBWEBx14WC5Xuurb1yf", "status": "completed"}'
//   或直接传 ID（默认标记为已完成）:
//   osascript -l JavaScript backend/scripts/complete_task.js 'AuveBWEBx14WC5Xuurb1yf'
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

// 格式化 Things3 日历日期 (YYYY-MM-DD)，避免时区偏移
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
    return { id: String(parsed) };
  } catch (e) {
    return { id: raw };
  }
}

function run(argv) {
  try {
    const input = parseInput(argv);
    const taskId = input.id;
    if (!taskId) {
      return JSON.stringify({
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Task ID is required",
          details: null,
        },
      });
    }

    const targetStatus = (input.status || "completed").toLowerCase();
    if (
      targetStatus !== "completed" &&
      targetStatus !== "open" &&
      targetStatus !== "canceled"
    ) {
      return JSON.stringify({
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: `Invalid status: ${targetStatus}. Must be 'open', 'completed', or 'canceled'.`,
          details: null,
        },
      });
    }

    const app = Application("Things3");
    let todo;
    try {
      todo = app.toDos.byId(taskId);
      // 访问属性确认对象存在
      todo.name();
    } catch (e) {
      return JSON.stringify({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: `Task not found with ID: ${taskId}`,
          details: null,
        },
      });
    }

    // 设置状态
    todo.status = targetStatus;

    return JSON.stringify({
      ok: true,
      data: formatTask(todo),
    });
  } catch (error) {
    logStderr("complete_task error: " + error.message);
    return JSON.stringify({
      ok: false,
      error: {
        code: "THINGS_SCRIPT_FAILED",
        message: error.message || "Failed to update task in Things3",
        details: null,
      },
    });
  }
}
