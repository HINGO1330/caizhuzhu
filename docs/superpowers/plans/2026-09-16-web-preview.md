# 菜猪猪浏览器预览版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Windows 浏览器中交付可离线操作的菜猪猪完整 MVP 流程预览。

**Architecture:** `WebPreview/src/domain.js` 提供无 DOM 的领域规则，`app.js` 负责状态、持久化和事件编排，`views.js` 只负责语义化 HTML 渲染。结构化数据存入 localStorage，图片 Blob 存入 IndexedDB，service worker 缓存静态资源。

**Tech Stack:** 原生 HTML、CSS、JavaScript ES modules、IndexedDB、localStorage、PWA、Node 内置 test runner、Python 静态服务器

**Spec:** `docs/superpowers/specs/2026-09-16-web-preview-design.md`

## Global Constraints

- 不安装第三方依赖。
- 核心流程离线工作。
- 所有导入必须人工确认后才能保存。
- 网页只验证产品流程，不声称验证真实 iOS 系统集成。
- 桌面和移动宽度均可操作，键盘焦点清晰。

---

### Task 1: 领域规则与测试入口

**Files:**
- Create: `WebPreview/package.json`
- Create: `WebPreview/tests/domain.test.js`
- Create: `WebPreview/src/domain.js`

**Interfaces:**
- Produces: `validateRecipe(recipe)`, `confirmDraft(draft)`, `shoppingItemsFromRecipe(recipe, servings)`, `inventoryBalances(events)`。

- [ ] **Step 1: 写失败测试**

```js
test('draft cannot become a recipe without explicit confirmation', () => {
  assert.throws(() => confirmDraft({ status: 'pending' }), /confirmation/)
})
```

- [ ] **Step 2: 运行红测**

Run: `node --test WebPreview/tests/domain.test.js`
Expected: FAIL because `src/domain.js` does not exist.

- [ ] **Step 3: 实现最小领域规则**

```js
export function confirmDraft(draft, confirmed) {
  if (!confirmed || draft.status !== 'pending') throw new Error('confirmation required')
  return { ...draft.recipe, id: crypto.randomUUID() }
}
```

- [ ] **Step 4: 运行全量测试**

Run: `node --test WebPreview/tests/*.test.js`
Expected: all domain tests pass.

### Task 2: 本地状态与持久化

**Files:**
- Create: `WebPreview/src/storage.js`
- Create: `WebPreview/tests/storage.test.js`

**Interfaces:**
- Consumes: validated domain entities.
- Produces: `createMemoryStorage()`, `loadState(storage)`, `saveState(storage, state)`, `resetState(storage)`。

- [ ] **Step 1: 写失败测试，证明首次加载种子数据且不覆盖已有数据**
- [ ] **Step 2: 运行红测，确认缺少 storage 模块**
- [ ] **Step 3: 用可注入 Storage 接口实现 JSON 持久化和版本字段**
- [ ] **Step 4: 运行领域与持久化全量测试**

### Task 3: 应用外壳与菜谱 CRUD

**Files:**
- Create: `WebPreview/index.html`
- Create: `WebPreview/src/app.js`
- Create: `WebPreview/src/views.js`
- Create: `WebPreview/styles.css`

**Interfaces:**
- Consumes: domain rules and persisted `AppState`。
- Produces: bottom-tab shell, recipe list/detail/editor, toast and modal presentation.

- [ ] **Step 1: 添加 CRUD reducer 失败测试**
- [ ] **Step 2: 运行红测并确认缺少 reducer**
- [ ] **Step 3: 实现最小 reducer 与事件委托**
- [ ] **Step 4: 渲染菜谱列表、详情和编辑弹窗，并运行全量测试**

### Task 4: 导入确认与图片存储

**Files:**
- Create: `WebPreview/src/images.js`
- Modify: `WebPreview/src/app.js`
- Modify: `WebPreview/src/views.js`
- Test: `WebPreview/tests/domain.test.js`

**Interfaces:**
- Produces: `saveImage(blob) -> imageKey`, `loadImage(imageKey) -> Blob`, pending draft workflow for URL/text/images.

- [ ] **Step 1: 写失败测试，证明 pending 草稿不能绕过确认保存**
- [ ] **Step 2: 运行红测**
- [ ] **Step 3: 实现链接、文案、单图、多图和长截图草稿及确认编辑器**
- [ ] **Step 4: 运行测试并人工验证图片预览与错误提示**

### Task 5: 烹饪、采购与库存

**Files:**
- Modify: `WebPreview/src/app.js`
- Modify: `WebPreview/src/views.js`
- Modify: `WebPreview/styles.css`
- Test: `WebPreview/tests/domain.test.js`

**Interfaces:**
- Consumes: `shoppingItemsFromRecipe`, `inventoryBalances`。
- Produces: step navigator, editable shopping list, append-only inventory event UI.

- [ ] **Step 1: 写采购缩放/合并与库存事件汇总失败测试**
- [ ] **Step 2: 运行红测并核对失败值**
- [ ] **Step 3: 实现采购缩放合并、库存事件求和及三个页面**

```js
const scaled = recipe.ingredients.map(item => ({ ...item, quantity: item.quantity * desiredServings / recipe.servings }))
const delta = event.type === 'consume' ? -Math.abs(event.quantity) : event.type === 'stock' ? Math.abs(event.quantity) : event.quantity
```

- [ ] **Step 4: 运行全量测试并验证首尾步骤、空清单、零库存和负调整**

Run: `node --test WebPreview/tests/*.test.js`
Expected: all tests pass; cooking index stays within `0...(steps.length - 1)` and inventory adjustments retain their sign.

### Task 6: PWA、导入导出与系统入口模拟器

**Files:**
- Create: `WebPreview/manifest.webmanifest`
- Create: `WebPreview/service-worker.js`
- Create: `WebPreview/favicon.svg`
- Modify: `WebPreview/index.html`
- Modify: `WebPreview/src/app.js`

**Interfaces:**
- Produces: offline static cache, JSON export/import, demo reset, simulated share and shortcut entry points.

- [ ] **Step 1: 添加 JSON round-trip 测试**
- [ ] **Step 2: 运行红测**
- [ ] **Step 3: 实现 manifest、service worker、导入导出和系统入口模拟器**
- [ ] **Step 4: 断网刷新并验证主流程仍可访问**

### Task 7: 完整验证与交付

**Files:**
- Create: `WebPreview/README.md`
- Modify: `README.md`

**Interfaces:**
- Produces: one-command Windows launch instructions.

- [ ] **Step 1: 运行 `node --test WebPreview/tests/*.test.js`**
- [ ] **Step 2: 运行静态服务器并检查 HTTP 200、manifest 和 service worker**
- [ ] **Step 3: 在桌面与移动视口验证主要流程和无障碍焦点**
- [ ] **Step 4: 检查 Git 状态并记录网页预览与 iOS 验证边界**
