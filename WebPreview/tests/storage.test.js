import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryStorage, exportState, importState, loadState, saveState } from "../src/storage.js";

test("first load creates demo state", () => {
  const storage = createMemoryStorage();
  const state = loadState(storage);

  assert.equal(state.version, 1);
  assert.equal(state.recipes.length, 1);
  assert.equal(state.recipes[0].name, "番茄炒蛋");
});

test("existing state is loaded without replacing user data", () => {
  const storage = createMemoryStorage();
  const saved = {
    version: 1,
    recipes: [{ id: "mine", name: "我的菜谱" }],
    drafts: [],
    customTags: [],
    todayMenu: [],
    shoppingItems: [],
    inventoryEvents: [],
  };
  saveState(storage, saved);

  assert.deepEqual(loadState(storage), saved);
});

test("backup round trip preserves all collections", () => {
  const state = loadState(createMemoryStorage());
  assert.deepEqual(importState(exportState(state)), state);
});

test("incomplete backup is rejected instead of silently losing collections", () => {
  assert.throws(
    () => importState(JSON.stringify({ version: 1, recipes: [] })),
    /有效的菜猪猪备份/,
  );
});
