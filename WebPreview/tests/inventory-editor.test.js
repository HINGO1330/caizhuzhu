import test from "node:test";
import assert from "node:assert/strict";

import { inventoryConsumeEditor, inventoryEditor, inventoryView } from "../src/views.js";

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
