// 获取 Things3 的清单列表。
//
// 用法:
//   osascript -l JavaScript backend/scripts/list_lists.js
//
// 输出: JSON 数组,每个元素形如:
//   { "id": "TMInboxListSource", "name": "收件箱", "kind": "builtin", "areaId": null, "areaName": null }
//   { "id": "33qqsaBfTJHDoUYno5uMNb", "name": "工作", "kind": "area", "areaId": null, "areaName": null }
//   { "id": "6LZSFCcw7zge5p6mjmuZjM", "name": "ML", "kind": "project", "areaId": "...", "areaName": "..." }

function run() {
  const app = Application("Things3");

  const ignoredIds = {
    TMLogbookListSource: true,
    TMTrashListSource: true,
  };
  const ignoredNames = {
    "日志簿": true,
    "废纸篓": true,
    "logbook": true,
    "trash": true,
  };

  // 1. 收集区域
  const areaIds = {};
  const areas = [];
  app.areas().forEach(function (area) {
    const id = area.id();
    areaIds[id] = true;
    areas.push({
      id: id,
      name: area.name(),
      kind: "area",
      areaId: null,
      areaName: null,
    });
  });

  // 2. 内置清单（排除区域以及日志簿、废纸篓）
  const builtins = [];
  app.lists().forEach(function (list) {
    const id = list.id();
    const name = list.name();
    if (areaIds[id] || ignoredIds[id] || ignoredNames[name.toLowerCase()]) {
      return;
    }
    builtins.push({
      id: id,
      name: name,
      kind: "builtin",
      areaId: null,
      areaName: null,
    });
  });

  // 3. 项目（包含所属区域信息）
  const projects = [];
  app.projects().forEach(function (p) {
    let areaId = null;
    let areaName = null;
    try {
      const area = p.area();
      if (area) {
        areaId = area.id();
        areaName = area.name();
      }
    } catch (e) {}

    projects.push({
      id: p.id(),
      name: p.name(),
      kind: "project",
      areaId: areaId,
      areaName: areaName,
    });
  });

  const allLists = builtins.concat(areas).concat(projects);
  return JSON.stringify(allLists);
}

run();

