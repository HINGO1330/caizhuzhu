import test from "node:test";
import assert from "node:assert/strict";
import { filterRecipeCatalog, pickRecipeSuggestion } from "../src/recipe-discovery.js";

const recipes = [
  { id: "beef", name: "土豆炖牛肉", tags: ["荤菜"], ingredients: [{ name: "土豆" }, { name: "牛肉" }] },
  { id: "potato", name: "酸辣土豆丝", tags: ["素菜"], ingredients: [{ name: "土豆" }, { name: "辣椒" }] },
  { id: "egg", name: "蒸蛋", tags: ["素菜"], ingredients: [{ name: "鸡蛋" }] },
];

test("search combines category and all ingredient keywords without modifying recipes", () => {
  assert.deepEqual(filterRecipeCatalog(recipes, "全部", " 土豆  牛肉 ").map(r => r.id), ["beef"]);
  assert.deepEqual(filterRecipeCatalog(recipes, "素菜", "土豆").map(r => r.id), ["potato"]);
  assert.equal(recipes.length, 3);
  assert.deepEqual(filterRecipeCatalog(recipes, "汤类", ""), []);
});

test("search handles empty terms, custom tags, case and missing optional fields", () => {
  assert.deepEqual(filterRecipeCatalog(recipes, "全部", "  "), recipes);
  assert.equal(filterRecipeCatalog([{ name: "BBQ 烤肉", tags: ["快手"] }], "快手", "bbq").length, 1);
  assert.deepEqual(filterRecipeCatalog([{ name: "蒸蛋" }], "全部", "鸡蛋"), []);
});

test("suggestions prefer stocked recipes and exclude the current menu", () => {
  assert.equal(pickRecipeSuggestion(recipes, { stockedIds: ["egg"], random: () => 0 }).id, "egg");
  assert.equal(pickRecipeSuggestion(recipes, { stockedIds: ["egg"], excludedIds: ["egg"], random: () => 0 }).id, "beef");
});

test("another suggestion avoids an immediate repeat when alternatives exist", () => {
  assert.equal(pickRecipeSuggestion(recipes, { previousId: "egg", stockedIds: ["egg"], random: () => 0 }).id, "beef");
  assert.equal(pickRecipeSuggestion([recipes[0]], { previousId: "beef" }).id, "beef");
});

test("no eligible recipes returns null and never selects an excluded dish", () => {
  assert.equal(pickRecipeSuggestion([], {}), null);
  assert.equal(pickRecipeSuggestion(recipes, { excludedIds: recipes.map(r => r.id) }), null);
});
