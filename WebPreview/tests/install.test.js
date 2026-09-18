import test from "node:test";
import assert from "node:assert/strict";

import { installInstructionsFor } from "../src/install.js";

test("iPhone users receive the Safari add-to-home-screen instructions", () => {
  assert.equal(
    installInstructionsFor("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"),
    "在 Safari 点分享，再选“添加到主屏幕”。",
  );
});

test("Android users receive the browser install instructions", () => {
  assert.equal(
    installInstructionsFor("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36"),
    "在浏览器菜单中选择“安装应用”或“添加到主屏幕”。",
  );
});

test("other platforms receive a generic install instruction", () => {
  assert.equal(
    installInstructionsFor("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
    "在浏览器菜单中选择“安装”或“添加到主屏幕”。",
  );
});
