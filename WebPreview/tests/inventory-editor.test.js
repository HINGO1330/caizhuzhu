import test from "node:test";
import assert from "node:assert/strict";

import { inventoryConsumeEditor, inventoryEditor } from "../src/views.js";

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
