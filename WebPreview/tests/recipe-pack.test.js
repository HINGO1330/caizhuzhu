import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { everydayRecipes, mergeEverydayRecipes } from '../src/recipe-pack.js';
import { validateRecipe } from '../src/domain.js';

test('pack contains 20 meat, 20 vegetable and 5 soup recipes with complete single-serving content', () => {
  assert.equal(everydayRecipes.length, 45);
  assert.equal(new Set(everydayRecipes.map(r => r.id)).size, 45);
  for (const [tag, count] of [['荤菜',20],['素菜',20],['汤类',5]]) assert.equal(everydayRecipes.filter(r => r.tags.includes(tag)).length,count);
  for (const recipe of everydayRecipes) {
    validateRecipe(recipe);
    assert.equal(recipe.servings, 1);
    assert.ok(recipe.summary && recipe.source);
    assert.ok(recipe.ingredients.length >= 3 && recipe.steps.length >= 3);
    assert.ok(recipe.ingredients.every(i => i.unit && i.quantity > 0));
    assert.ok(recipe.steps.every(s => s.id && s.text));
    assert.ok(recipe.imageKeys.length === 1 && existsSync(new URL(`../${recipe.imageKeys[0].replace('./', '')}`, import.meta.url)));
  }
});

test('merge preserves all personal data, skips same-name recipes and is idempotent even after deletion', () => {
  const existing = {id:'mine', name:everydayRecipes[0].name, summary:'我的做法'};
  const state = {recipes:[existing], inventoryEvents:[{id:'stock'}], todayMenu:[{id:'menu'}], shoppingItems:[{id:'shopping'}]};
  const next = mergeEverydayRecipes(state);
  assert.equal(next.recipes.length,45);
  assert.equal(next.recipes[0],existing);
  assert.equal(next.inventoryEvents,state.inventoryEvents);
  assert.equal(next.todayMenu,state.todayMenu);
  assert.equal(next.shoppingItems,state.shoppingItems);
  assert.equal(mergeEverydayRecipes(next),next);
  const deleted = {...next, recipes:[existing]};
  assert.equal(mergeEverydayRecipes(deleted),deleted);
});
