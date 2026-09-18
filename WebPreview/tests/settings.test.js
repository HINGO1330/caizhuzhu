import test from "node:test";
import assert from "node:assert/strict";

import { settingsView } from "../src/views.js";

test("settings keeps backup actions but never offers an action that clears all local data", () => {
  const view = settingsView();

  assert.match(view, /data-action="data-export"/);
  assert.match(view, /id="backup-file"/);
  assert.doesNotMatch(view, /data-action="data-reset"/);
});

test("settings offers a shared account cloud backup entry", () => {
  const view = settingsView();

  assert.match(view, /data-action="cloud-account"/);
  assert.match(view, /共享账号云备份/);
});
