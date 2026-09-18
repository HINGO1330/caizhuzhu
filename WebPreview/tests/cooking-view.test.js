import test from "node:test";
import assert from "node:assert/strict";

import { cookingView } from "../src/views.js";

test("cooking mode labels the ingredient section as required ingredients", () => {
  const view = cookingView({
    id: "recipe-1",
    ingredients: [{ id: "ingredient-1", name: "花螺", quantity: 250, unit: "克" }],
    steps: [{ id: "step-1", text: "下锅翻炒", ingredientIds: ["ingredient-1"] }],
  }, 0);

  assert.match(view, /<h3>所需食材<\/h3>/);
  assert.doesNotMatch(view, /本步食材/);
});
