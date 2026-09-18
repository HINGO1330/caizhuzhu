const STORAGE_KEY = "caizhuzhu.preview.state.v2";

export function demoState() {
  return {
    version: 1,
    recipes: [
      {
        id: "demo-tomato-eggs",
        name: "番茄炒蛋",
        summary: "酸甜鲜香、十分钟就能上桌的家常菜。",
        servings: 2,
        durationMinutes: 12,
        ingredients: [
          { id: "demo-tomato", name: "番茄", quantity: 2, unit: "个" },
          { id: "demo-eggs", name: "鸡蛋", quantity: 3, unit: "个" },
          { id: "demo-oil", name: "食用油", quantity: 15, unit: "毫升" },
        ],
        steps: [
          { id: "demo-step-1", text: "鸡蛋打散，番茄切块。", ingredientIds: ["demo-eggs", "demo-tomato"] },
          { id: "demo-step-2", text: "热锅放油，将鸡蛋炒至刚凝固后盛出。", ingredientIds: ["demo-eggs", "demo-oil"] },
          { id: "demo-step-3", text: "番茄炒软，倒回鸡蛋翻匀后出锅。", ingredientIds: ["demo-tomato", "demo-eggs"] },
        ],
        imageKeys: [],
        tags: ["快手", "家常"],
        source: "家庭菜谱",
        updatedAt: "2026-09-16T00:00:00.000Z",
      },
    ],
    drafts: [],
    customTags: [],
    todayMenu: [],
    shoppingItems: [],
    inventoryEvents: [],
  };
}

export function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

export function loadState(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = demoState();
    saveState(storage, seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) throw new Error("unsupported data");
    return { ...parsed, todayMenu: Array.isArray(parsed.todayMenu) ? parsed.todayMenu : [], customTags: Array.isArray(parsed.customTags) ? parsed.customTags : [] };
  } catch {
    const recovered = demoState();
    saveState(storage, recovered);
    return recovered;
  }
}

export function saveState(storage = localStorage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(storage = localStorage) {
  const state = demoState();
  saveState(storage, state);
  return state;
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(serialized) {
  const parsed = JSON.parse(serialized);
  if (!isValidState(parsed)) throw new Error("不是有效的菜猪猪备份");
  return parsed;
}

function isValidState(value) {
  return value?.version === 1
    && Array.isArray(value.recipes)
    && Array.isArray(value.drafts)
    && Array.isArray(value.customTags ?? [])
    && Array.isArray(value.todayMenu ?? [])
    && Array.isArray(value.shoppingItems)
    && Array.isArray(value.inventoryEvents);
}
