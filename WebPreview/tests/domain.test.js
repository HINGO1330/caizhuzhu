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
  inventoryStockPrefills,
  normalizeUnit,
  canApplyInventoryEvent,
  inventoryAdjustmentEvent,
  inventoryConsumeEvents,
  recipePreview,
  inventoryExpiringBatches,
  inventoryRecipeRecommendations,
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

test("zero-balance ingredients are omitted from the inventory summary", () => {
  const events = [
    { ingredientName: "鸡蛋", unit: "个", quantity: 2, type: "stock" },
    { ingredientName: "鸡蛋", unit: "个", quantity: 2, type: "consume" },
    { ingredientName: "番茄", unit: "个", quantity: 1, type: "stock" },
  ];

  assert.deepEqual(inventoryBalances(events), [
    { ingredientName: "番茄", unit: "个", quantity: 1 },
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

test("batch stock-in groups equivalent pending shopping items while retaining every source item", () => {
  assert.deepEqual(inventoryStockPrefills([
    { id: "s1", name: "牛肉丸", quantity: 2, unit: "颗" },
    { id: "s2", name: "牛肉丸", quantity: 3, unit: "个" },
    { id: "s3", name: "青菜", quantity: 1, unit: "把" },
  ]), [
    { ingredientName: "牛肉丸", quantity: 5, unit: "个", shoppingItemIds: ["s1", "s2"] },
    { ingredientName: "青菜", quantity: 1, unit: "把", shoppingItemIds: ["s3"] },
  ]);
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

test("inventory adjustment converts a target balance into the required signed event delta", () => {
  const events = [
    { ingredientName: "鸡蛋", unit: "个", quantity: 10, type: "stock" },
    { ingredientName: "鸡蛋", unit: "个", quantity: 3, type: "consume" },
  ];

  assert.deepEqual(inventoryAdjustmentEvent(events, { ingredientName: "鸡蛋", unit: "个", targetQuantity: 4 }), {
    ingredientName: "鸡蛋", unit: "个", quantity: -3, type: "adjust", targetQuantity: 4,
  });
});

test("bulk consumption creates one consume event per positive requested balance without exceeding stock", () => {
  assert.deepEqual(inventoryConsumeEvents([
    { ingredientName: "鸡蛋", unit: "个", availableQuantity: 3, quantity: 2 },
    { ingredientName: "食用油", unit: "毫升", availableQuantity: 20, quantity: 0 },
  ]), [
    { ingredientName: "鸡蛋", unit: "个", quantity: 2, type: "consume" },
  ]);
  assert.throws(() => inventoryConsumeEvents([
    { ingredientName: "鸡蛋", unit: "个", availableQuantity: 3, quantity: 4 },
  ]), /不能超过现有库存/);
});

test("recipe preview limits the home page and exposes the rest for the dialog", () => {
  const preview = recipePreview([{ id: "r1" }, { id: "r2" }, { id: "r3" }], 2);
  assert.deepEqual(preview.recipes.map((recipe) => recipe.id), ["r1", "r2"]);
  assert.equal(preview.hasMore, true);
});

test("expiring batches exclude what has already been consumed and surface the nearest expiry first", () => {
  const events = [
    { id: "egg-batch", batchId: "egg-batch", type: "stock", ingredientName: "鸡蛋", quantity: 6, unit: "个", expiresAt: "2026-09-22T00:00:00.000Z" },
    { id: "tomato-batch", batchId: "tomato-batch", type: "stock", ingredientName: "番茄", quantity: 2, unit: "个", expiresAt: "2026-09-25T00:00:00.000Z" },
    { id: "eat-egg", batchId: "egg-batch", type: "consume", ingredientName: "鸡蛋", quantity: 4, unit: "个" },
  ];

  assert.deepEqual(inventoryExpiringBatches(events, 3, new Date("2026-09-20T00:00:00.000Z")), [
    { batchId: "egg-batch", ingredientName: "鸡蛋", quantity: 2, unit: "个", expiresAt: "2026-09-22T00:00:00.000Z", daysRemaining: 2 },
  ]);
});

test("inventory recipe recommendations only include recipes whose ingredients are currently sufficient", () => {
  const recipes = [
    { id: "cookable", name: "鸡蛋羹", servings: 1, ingredients: [{ name: "鸡蛋", quantity: 2, unit: "个" }], steps: [] },
    { id: "missing", name: "番茄炒蛋", servings: 1, ingredients: [{ name: "番茄", quantity: 3, unit: "个" }], steps: [] },
  ];
  const events = [{ type: "stock", ingredientName: "鸡蛋", quantity: 2, unit: "个" }, { type: "stock", ingredientName: "番茄", quantity: 2, unit: "个" }];

  assert.deepEqual(inventoryRecipeRecommendations(recipes, events).map((item) => item.recipe.id), ["cookable"]);
});

test("expiry reminders allocate an unbound bulk consumption to the nearest batch", () => {
  const events = [
    { id: "old-eggs", type: "stock", ingredientName: "鸡蛋", quantity: 4, unit: "个", expiresAt: "2026-09-21T00:00:00.000Z" },
    { id: "new-eggs", type: "stock", ingredientName: "鸡蛋", quantity: 4, unit: "个", expiresAt: "2026-09-23T00:00:00.000Z" },
    { id: "bulk-consume", type: "consume", ingredientName: "鸡蛋", quantity: 3, unit: "个" },
  ];

  assert.equal(inventoryExpiringBatches(events, 3, new Date("2026-09-20T00:00:00.000Z"))[0].quantity, 1);
});
