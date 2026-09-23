import assert from "node:assert/strict";
import test from "node:test";
import { buildShoppingShare, copyShoppingText } from "../src/shopping-share.js";

test("shared list includes only pending quantities and merges equivalent units", () => {
  const items = [
    { id: "a", name: " 牛肉丸 ", quantity: 2, unit: "颗", checked: false },
    { id: "b", name: "牛肉丸", quantity: 1, unit: "个", checked: false },
    { id: "c", name: "牛肉丸", quantity: 10, unit: "个", checked: true },
    { id: "d", name: "青菜", quantity: 1, unit: "把", checked: true },
  ];
  const original = JSON.stringify(items);
  const result = buildShoppingShare(items);
  assert.equal(result.count, 1);
  assert.equal(result.text, "菜猪猪 · 待采购清单（1 项）\n\n□ 牛肉丸：3 个");
  assert.equal(JSON.stringify(items), original);
});

test("share does not invent conversions for bags and boxes", () => {
  const result = buildShoppingShare([
    { id: "a", name: "牛肉丸", quantity: 2, unit: "袋" },
    { id: "b", name: "牛肉丸", quantity: 3, unit: "个" },
  ]);
  assert.equal(result.count, 2);
  assert.match(result.text, /2 袋/);
  assert.match(result.text, /3 个/);
});

test("invalid or zero quantities and completed items are excluded", () => {
  const result = buildShoppingShare([
    { name: "盐", quantity: 0 }, { name: "油", quantity: -1 },
    { name: "糖", quantity: Infinity }, { name: " ", quantity: 1 },
    { name: "鸡蛋", quantity: 2, checked: true },
  ]);
  assert.deepEqual(result, { count: 0, text: "" });
  assert.deepEqual(buildShoppingShare(), result);
});

test("decimal totals remain readable and multiline labels become a single line", () => {
  const result = buildShoppingShare([
    { name: "小米", quantity: 0.1, unit: "kg" },
    { name: "小米", quantity: 0.2, unit: "千克" },
    { name: "青\n菜", quantity: 1, unit: "把" },
  ]);
  assert.match(result.text, /小米：0\.3 千克/);
  assert.match(result.text, /青 菜：1 把/);
  assert.equal(result.text.split("\n").length, 4);
});

test("clipboard reports success only after the write resolves", async () => {
  let written;
  assert.equal(await copyShoppingText("采购清单", { writeText: async text => { written = text; } }), true);
  assert.equal(written, "采购清单");
  assert.equal(await copyShoppingText("采购清单", undefined), false);
  assert.equal(await copyShoppingText("采购清单", { writeText: async () => { throw new Error("denied"); } }), false);
});
