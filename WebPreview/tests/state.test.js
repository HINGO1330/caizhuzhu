import test from "node:test";
import assert from "node:assert/strict";

import { reduceState } from "../src/state.js";

const emptyState = {
  version: 1,
  recipes: [],
  drafts: [],
  shoppingItems: [],
  inventoryEvents: [],
  todayMenu: [],
};

test("recipe reducer creates updates and deletes by stable id", () => {
  const created = reduceState(emptyState, {
    type: "recipe/save",
    recipe: { id: "r1", name: "蛋炒饭" },
  });
  const updated = reduceState(created, {
    type: "recipe/save",
    recipe: { id: "r1", name: "黄金蛋炒饭" },
  });
  const deleted = reduceState(updated, { type: "recipe/delete", id: "r1" });

  assert.equal(created.recipes[0].name, "蛋炒饭");
  assert.equal(updated.recipes[0].name, "黄金蛋炒饭");
  assert.equal(deleted.recipes.length, 0);
  assert.equal(emptyState.recipes.length, 0);
});

test("menu actions keep shopping linked to the selected recipe", () => {
  const state = {
    ...emptyState,
    recipes: [{ id: "r1", name: "蛋炒饭", servings: 1, ingredients: [{ name: "鸡蛋", quantity: 2, unit: "个" }], steps: [] }],
  };
  const added = reduceState(state, { type: "menu/add", menu: { id: "m1", recipeId: "r1", servings: 1 } });
  assert.equal(added.todayMenu.length, 1);
  assert.equal(added.shoppingItems[0].name, "鸡蛋");
  const removed = reduceState(added, { type: "menu/remove", id: "m1" });
  assert.equal(removed.todayMenu.length, 0);
  assert.equal(removed.shoppingItems.length, 0);
});

test("deleting an inventory event removes it directly without a reversal", () => {
  const stocked = reduceState(emptyState, {
    type: "inventory/add-event",
    event: { id: "e1", type: "stock", ingredientName: "牛肉丸", quantity: 3, unit: "个", createdAt: new Date().toISOString() },
  });
  const deleted = reduceState(stocked, { type: "inventory/delete", id: "e1" });
  assert.equal(deleted.inventoryEvents.length, 0);
});

test("deleting a stock event is rejected when it would make remaining inventory negative", () => {
  const state = {
    ...emptyState,
    inventoryEvents: [
      { id: "consume", type: "consume", ingredientName: "鸡蛋", quantity: 1, unit: "个" },
      { id: "stock", type: "stock", ingredientName: "鸡蛋", quantity: 1, unit: "个" },
    ],
  };
  const next = reduceState(state, { type: "inventory/delete", id: "stock" });
  assert.equal(next.inventoryEvents.length, 2);
});

test("archiving an inventory event preserves it but removes it from the active stream", () => {
  const state = {
    ...emptyState,
    inventoryEvents: [{ id: "e1", ingredientName: "鸡蛋", quantity: 2, unit: "个", type: "stock" }],
  };
  const archived = reduceState(state, { type: "inventory/archive", id: "e1" });
  assert.equal(archived.inventoryEvents[0].archived, true);
  const restored = reduceState(archived, { type: "inventory/unarchive", id: "e1" });
  assert.equal(restored.inventoryEvents[0].archived, false);
});
