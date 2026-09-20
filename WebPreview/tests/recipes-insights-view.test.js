import assert from "node:assert/strict";
import test from "node:test";
import { inventoryView, recipesView } from "../src/views.js";

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
});

test("inventory page presents expiry reminders", () => {
  const html = inventoryView({ inventoryEvents: [] }, [], [], false, [
    { ingredientName: "鸡蛋", quantity: 2, unit: "个", daysRemaining: 1 },
  ]);

  assert.match(html, /临期提醒/);
  assert.match(html, /鸡蛋 · 2 个 · 明天到期/);
});
