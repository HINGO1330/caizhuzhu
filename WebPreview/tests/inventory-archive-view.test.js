import assert from "node:assert/strict";
import test from "node:test";
import { inventoryView } from "../src/views.js";

test("archived inventory records can be deleted and the archive can remain expanded", () => {
  const state = {
    inventoryEvents: [{
      id: "archived-egg-stock",
      type: "stock",
      ingredientName: "鸡蛋",
      quantity: 6,
      unit: "个",
      archived: true,
      createdAt: "2026-09-20T00:00:00.000Z",
    }],
  };

  const html = inventoryView(state, [], [], true);

  assert.match(html, /<details open>/);
  assert.match(html, /data-action="inventory-delete" data-id="archived-egg-stock"/);
  assert.match(html, /data-action="inventory-unarchive" data-id="archived-egg-stock"/);
});
