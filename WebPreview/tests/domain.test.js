import test from "node:test";
import assert from "node:assert/strict";

import {
  confirmDraft,
  inventoryBalances,
  shoppingItemsFromRecipe,
  shoppingItemsFromMenus,
  inventoryCountdown,
  inventoryRecentEvents,
  inventoryStockPrefill,
  normalizeUnit,
  canApplyInventoryEvent,
  recipePreview,
  splitRecipeSteps,
  validateRecipe,
} from "../src/domain.js";

test("blank recipe name is rejected", () => {
  assert.throws(() => validateRecipe({ name: "  ", servings: 2, ingredients: [], steps: [] }), /名称/);
});

test("draft cannot become a recipe without explicit confirmation", () => {
  const draft = { status: "pending", recipe: { name: "番茄炒蛋", servings: 2, ingredients: [], steps: [] } };
  assert.throws(() => confirmDraft(draft, false), /确认/);
});

test("shopping generation scales and merges matching ingredients", () => {
  const recipe = {
    name: "番茄炒蛋",
    servings: 2,
    ingredients: [
      { name: "番茄", quantity: 2, unit: "个" },
      { name: " 番茄 ", quantity: 1, unit: "个" },
    ],
    steps: [{ text: "炒熟" }],
  };

  assert.deepEqual(shoppingItemsFromRecipe(recipe, 4), [
    { name: "番茄", quantity: 6, unit: "个", checked: false },
  ]);
});

test("inventory balance is derived from stock consume and signed adjustment events", () => {
  const events = [
    { ingredientName: "鸡蛋", unit: "个", quantity: 10, type: "stock" },
    { ingredientName: "鸡蛋", unit: "个", quantity: 3, type: "consume" },
    { ingredientName: "鸡蛋", unit: "个", quantity: -1, type: "adjust" },
  ];

  assert.deepEqual(inventoryBalances(events), [
    { ingredientName: "鸡蛋", unit: "个", quantity: 6 },
  ]);
});

test("today menu creates grouped shopping items and removing a menu removes only its ingredients", () => {
  const recipes = [
    { id: "r1", name: "番茄炒蛋", servings: 2, ingredients: [{ name: "番茄", quantity: 2, unit: "个" }], steps: [] },
    { id: "r2", name: "番茄汤", servings: 2, ingredients: [{ name: "番茄", quantity: 1, unit: "颗" }], steps: [] },
  ];
  const items = shoppingItemsFromMenus(recipes, [{ id: "m1", recipeId: "r1" }, { id: "m2", recipeId: "r2" }]);
  assert.deepEqual(items.map(({ name, quantity, unit }) => ({ name, quantity, unit })), [
    { name: "番茄", quantity: 3, unit: "个" },
  ]);
  const remaining = shoppingItemsFromMenus(recipes, [{ id: "m2", recipeId: "r2" }]);
  assert.deepEqual(remaining.map(({ name, quantity, unit }) => ({ name, quantity, unit })), [
    { name: "番茄", quantity: 1, unit: "个" },
  ]);
});

test("equivalent units normalize and stock countdown is calculated from purchase date", () => {
  assert.equal(normalizeUnit("颗"), "个");
  assert.equal(normalizeUnit("g"), "克");
  assert.equal(inventoryCountdown("2026-09-20T00:00:00.000Z", new Date("2026-09-16T00:00:00.000Z")), "剩余 4 天");
});

test("fractional menu servings round each merged shopping total up", () => {
  const recipe = { name: "土豆丝", servings: 1, ingredients: [{ name: "土豆", quantity: 1, unit: "个" }, { name: "土豆", quantity: 1, unit: "个" }], steps: [] };
  assert.equal(shoppingItemsFromRecipe(recipe, 1.1)[0].quantity, 3);
});

test("recipe steps can be split from numbered prose without requiring manual line breaks", () => {
  assert.deepEqual(splitRecipeSteps("1. 切菜；2、热锅；3) 出锅"), ["切菜", "热锅", "出锅"]);
});

test("checked shopping items create a bound stock-in prefill", () => {
  assert.deepEqual(inventoryStockPrefill([
    { id: "s1", name: "牛肉丸", quantity: 2, unit: "个" },
    { id: "s2", name: "牛肉丸", quantity: 3, unit: "个" },
  ]), {
    ingredientName: "牛肉丸",
    quantity: 5,
    unit: "个",
    shoppingItemIds: ["s1", "s2"],
  });
});

test("recent inventory events exclude archived records and cap the visible list", () => {
  const events = [
    { id: "new", archived: false }, { id: "old", archived: false },
    { id: "hidden", archived: true },
  ];
  assert.deepEqual(inventoryRecentEvents(events, 1).map((event) => event.id), ["new"]);
});

test("inventory rejects a consume or adjustment that would make a balance negative", () => {
  const events = [{ ingredientName: "鸡蛋", unit: "个", quantity: 2, type: "stock" }];
  assert.equal(canApplyInventoryEvent(events, { ingredientName: "鸡蛋", unit: "个", quantity: 3, type: "consume" }), false);
  assert.equal(canApplyInventoryEvent(events, { ingredientName: "鸡蛋", unit: "个", quantity: -3, type: "adjust" }), false);
  assert.equal(canApplyInventoryEvent(events, { ingredientName: "鸡蛋", unit: "个", quantity: 2, type: "consume" }), true);
});

test("recipe preview limits the home page and exposes the rest for the dialog", () => {
  const preview = recipePreview([{ id: "r1" }, { id: "r2" }, { id: "r3" }], 2);
  assert.deepEqual(preview.recipes.map((recipe) => recipe.id), ["r1", "r2"]);
  assert.equal(preview.hasMore, true);
});
