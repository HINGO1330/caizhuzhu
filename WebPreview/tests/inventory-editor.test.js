import test from "node:test";
import assert from "node:assert/strict";

import { inventoryBatchStockEditor, inventoryConsumeEditor, inventoryEditor, inventoryView, shoppingView } from "../src/views.js";

test("adjustment editor asks for the target inventory balance", () => {
  const view = inventoryEditor({ type: "adjust" });

  assert.match(view, /调整后库存/);
  assert.match(view, /name="targetQuantity"/);
  assert.doesNotMatch(view, /name="quantity"/);
});

test("bulk consumption editor lists every balance and defaults each consumption to the full balance", () => {
  const view = inventoryConsumeEditor([
    { ingredientName: "鸡蛋", quantity: 3, unit: "个" },
    { ingredientName: "食用油", quantity: 20, unit: "毫升" },
  ]);

  assert.match(view, /id="inventory-consume-form"/);
  assert.match(view, /鸡蛋/);
  assert.match(view, /食用油/);
  assert.match(view, /name="consumeQuantity"[^>]*value="3"[^>]*max="3"/);
  assert.match(view, /name="consumeQuantity"[^>]*value="20"[^>]*max="20"/);
});

test("adjustment history displays the resulting target balance instead of only its signed delta", () => {
  const view = inventoryView({ inventoryEvents: [] }, [], [{
    id: "adjust-1", type: "adjust", ingredientName: "鸡蛋", unit: "个", quantity: -3, targetQuantity: 4, createdAt: "2026-09-18T00:00:00.000Z",
  }]);

  assert.match(view, /调整至 4 个/);
});

test("batch stock-in editor shows every pending ingredient and only asks for shelf life", () => {
  const view = inventoryBatchStockEditor([
    { ingredientName: "牛肉丸", quantity: 5, unit: "个", shoppingItemIds: ["s1", "s2"] },
    { ingredientName: "青菜", quantity: 1, unit: "把", shoppingItemIds: ["s3"] },
  ]);

  assert.match(view, /id="inventory-batch-stock-form"/);
  assert.match(view, /牛肉丸/);
  assert.match(view, /青菜/);
  assert.equal((view.match(/name="shelfLifeDays"/g) ?? []).length, 2);
  assert.doesNotMatch(view, /name="purchaseDate"/);
});

test("shopping view exposes batch stock-in when it has pending items", () => {
  const view = shoppingView({ shoppingItems: [{ id: "s1", name: "鸡蛋", quantity: 3, unit: "个", checked: false }] });

  assert.match(view, /data-action="shopping-stock-many"/);
  assert.match(view, /批量入库/);
});
