// 唤醒 / 重启 Things3 促使其触发同步检查与界面刷新。
//
// 用法:
//   默认前台激活 (相当于 `tell application "Things3" to activate`):
//     osascript -l JavaScript backend/scripts/refresh.js
//     osascript -l JavaScript backend/scripts/refresh.js '{"relaunch": false}'
//
//   强制重启 Things3 (冷启动重新连接 Things Cloud):
//     osascript -l JavaScript backend/scripts/refresh.js '{"relaunch": true}'
//
// 契约:
//   - 入口为 function run(argv)
//   - stdout 只输出合法 JSON
//   - 成功: { "ok": true, "data": { "action": "...", "wasRunning": true, "refreshed": true } }
//   - 失败: { "ok": false, "error": { "code": "...", "message": "...", "details": null } }

function logStderr(message) {
  try {
    ObjC.import("Foundation");
    const errHandle = $.NSFileHandle.fileHandleWithStandardError;
    const str = $.NSString.alloc.initWithString(message + "\n");
    errHandle.writeData(str.dataUsingEncoding($.NSUTF8StringEncoding));
  } catch (e) {}
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
    return {};
  } catch (e) {
    return {};
  }
}

function run(argv) {
  try {
    const input = parseInput(argv);
    const relaunch = Boolean(input.relaunch);
    const launchIfClosed = input.launchIfClosed !== false;

    const app = Application("Things3");
    const wasRunning = Boolean(app.running());

    if (!wasRunning && !launchIfClosed) {
      return JSON.stringify({
        ok: false,
        error: {
          code: "THINGS_NOT_RUNNING",
          message: "Things3 is not currently running",
          details: null,
        },
      });
    }

    if (relaunch && wasRunning) {
      logStderr("Quitting Things3 for relaunch...");
      try {
        app.quit();
      } catch (e) {
        logStderr("Warning: error while quitting Things3: " + e.message);
      }
      delay(1);
      app.activate();

      return JSON.stringify({
        ok: true,
        data: {
          action: "relaunch",
          wasRunning: true,
          refreshed: true,
        },
      });
    }

    // 默认行为：将 Things3 置于前台激活，促使其触发焦点事件与网络检查
    app.activate();

    return JSON.stringify({
      ok: true,
      data: {
        action: "activate",
        wasRunning: wasRunning,
        refreshed: true,
      },
    });
  } catch (error) {
    logStderr("refresh error: " + error.message);
    return JSON.stringify({
      ok: false,
      error: {
        code: "THINGS_SCRIPT_FAILED",
        message: error.message || "Failed to refresh Things3",
        details: null,
      },
    });
  }
}
