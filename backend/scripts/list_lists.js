// 获取 Things3 的清单列表。
//
// 用法:
//   osascript -l JavaScript backend/scripts/list_lists.js
//
// 输出: JSON 数组,每个元素形如:
//   { "id": "TMInboxListSource", "name": "收件箱", "kind": "builtin" }
//
// Things3 的 `lists` 集合同时包含内置清单(收件箱、今天等)和用户区域(area)。
// 这里用 `areas` 的 id 反查,把两类对象用 `kind` 字段区分开。

function run() {
  const app = Application("Things3");

  // 先收集区域 id,用于区分内置清单与区域。
  const areaIds = {};
  app.areas().forEach(function (area) {
    areaIds[area.id()] = true;
  });

  const lists = app.lists().map(function (list) {
    const id = list.id();
    return {
      id: id,
      name: list.name(),
      kind: areaIds[id] ? "area" : "builtin",
    };
  });

  return JSON.stringify(lists);
}

run();
