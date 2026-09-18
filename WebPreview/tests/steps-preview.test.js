import test from "node:test";
import assert from "node:assert/strict";

import { stepPreview } from "../src/views.js";

test("step preview shows a local draft and keeps applying it as an explicit user choice", () => {
  const view = stepPreview(["鸡蛋打散", "热锅下油"], "local");

  assert.match(view, /本地拆分预览/);
  assert.match(view, /鸡蛋打散/);
  assert.match(view, /热锅下油/);
  assert.match(view, /data-action="steps-apply-preview"/);
  assert.match(view, /data-action="steps-ai-organize"/);
});
