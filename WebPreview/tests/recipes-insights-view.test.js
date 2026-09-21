import assert from "node:assert/strict";
import test from "node:test";
import { inventoryView, recipeBrowser, recipesForCategory, recipesView } from "../src/views.js";

test("recipe home presents stock recommendations and meal periods without inventory alerts", () => {
  const recipe = { id: "egg-custard", name: "鸡蛋羹", summary: "嫩滑快手", servings: 1, ingredients: [{ name: "鸡蛋", quantity: 2, unit: "个" }], steps: [], tags: [] };
  const html = recipesView({ recipes: [recipe], todayMenu: [{ id: "breakfast-1", recipeId: recipe.id, servings: 1, mealPeriod: "breakfast" }] }, {
    recommendations: [{ recipe }],
  });

  assert.doesNotMatch(html, /临期提醒/);
  assert.match(html, /库存可做/);
  assert.match(html, /早餐/);
  assert.match(html, /午餐/);
  assert.match(html, /晚餐/);
  assert.doesNotMatch(html, /1 人份/);
});

test("inventory page presents expiry reminders", () => {
  const html = inventoryView({ inventoryEvents: [] }, [], [], false, [
    { ingredientName: "鸡蛋", quantity: 2, unit: "个", daysRemaining: 1 },
  ]);

  assert.match(html, /临期提醒/);
  assert.match(html, /鸡蛋 · 2 个 · 明天到期/);
  assert.match(html, /class="expiry-badge"/);
});

test("recipe browser identifies the active category instead of implying every recipe is shown", () => {
  const recipes = [
    { id: "vegetable", name: "蒜蓉西兰花", summary: "", tags: ["素菜"], imageKeys: ["./assets/recipes/vegetable.png"] },
    { id: "meat", name: "可乐鸡翅", summary: "", tags: ["荤菜"], imageKeys: [] },
  ];
  const filtered = recipesForCategory(recipes, "素菜");
  const html = recipeBrowser(filtered, "素菜");

  assert.deepEqual(filtered.map((recipe) => recipe.id), ["vegetable"]);
  assert.match(html, /全部素菜菜谱/);
  assert.match(html, /蒜蓉西兰花/);
  assert.match(html, /recipe-browser-list/);
  assert.match(html, /recipe-browser-row/);
  assert.match(html, /recipe-browser-photo/);
  assert.match(html, /data-image-key="\.\/assets\/recipes\/vegetable\.png"/);
  assert.doesNotMatch(html, /可乐鸡翅/);
  assert.doesNotMatch(html, /class="recipe-card"/);
  assert.doesNotMatch(html, /全部菜谱<\/h2>/);
});
