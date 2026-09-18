import { recipePreview } from "./domain.js";

const escapeHTML = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const navItems = [
  ["recipes", "🍳", "菜谱"],
  ["shopping", "🧺", "采购"],
  ["inventory", "▣", "库存"],
];

function nav(active) {
  return `<nav class="bottom-nav" aria-label="主要功能">${navItems.map(([id, icon, label]) => `
    <button class="nav-item ${active === id ? "active" : ""}" data-action="tab" data-tab="${id}" aria-current="${active === id ? "page" : "false"}">
      <span aria-hidden="true">${icon}</span><span>${label}</span>
    </button>`).join("")}</nav>`;
}

function header() {
  return `<header class="app-header">
    <div class="brand"><div class="brand-mark" aria-hidden="true">🐷</div><div><h1>菜猪猪</h1><p>今天也好好吃饭</p></div></div>
    <button class="icon-button" data-action="settings" aria-label="打开数据工具">•••</button>
  </header>`;
}

export function appView(state, ui, content) {
  return `<div class="preview-layout">
    <aside class="desktop-note"><span class="eyebrow">离线家庭厨房</span><h2>把一日三餐，<br>安排得明明白白。</h2><p>菜谱、今日菜单、采购和库存都能在当前设备离线使用。</p><div class="notice">数据只保存在当前设备。请通过右上角“•••”定期导出 JSON 备份。</div></aside>
    <div class="app-frame">${header()}${content}${nav(ui.tab)}</div>
  </div>`;
}

export function recipesView(state) {
  const categories = ["全部", ...new Set(state.recipes.flatMap((recipe) => recipe.tags ?? []))];
  const selectedCategory = state.selectedCategory ?? "全部";
  const visibleRecipes = selectedCategory === "全部"
    ? state.recipes
    : state.recipes.filter((recipe) => (recipe.tags ?? []).includes(selectedCategory));
  const preview = recipePreview(visibleRecipes);
  const menuRecipes = (state.todayMenu ?? []).map((entry) => state.recipes.find((recipe) => recipe.id === entry.recipeId)).filter(Boolean);
  return `<main class="screen">
    <span class="eyebrow">家庭厨房</span><h2 class="screen-title">今天吃什么？</h2><p class="screen-lede">收藏家里的拿手菜，从灵感一直管到上桌。</p>
    <section class="hero"><div class="hero-copy"><span class="eyebrow" style="color:#f7c8ad">快速开始</span><h2>记下你的下一道家常菜</h2><p>食材、步骤、份量和图片都放在一起。</p><button class="primary" data-action="recipe-new">新建菜谱</button></div></section>
    <div class="section-heading"><h2>我的菜谱</h2><span>${visibleRecipes.length} / ${state.recipes.length} 道</span></div>
    <div class="category-list">${categories.map((category) => `<button class="category-chip ${selectedCategory === category ? "active" : ""}" data-action="recipe-category" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}</div>
    <section class="recipe-grid">${preview.recipes.length ? preview.recipes.map((recipe) => recipeCard(recipe, (state.todayMenu ?? []).some((entry) => entry.recipeId === recipe.id))).join("") : `<div class="empty">这个分类还没有菜谱。</div>`}</section>
    ${preview.hasMore ? `<button class="secondary browse-recipes" data-action="recipe-browse-all">查看全部 ${visibleRecipes.length} 道菜谱</button>` : ""}
    <section class="today-menu-panel"><div class="section-heading"><h2>今日菜单</h2><span>${menuRecipes.length} 道</span></div>
      ${menuRecipes.length ? `<div class="menu-chip-list">${menuRecipes.map((recipe) => `<div class="menu-chip"><span>${escapeHTML(recipe.name)}</span><button data-action="menu-remove" data-id="${state.todayMenu.find((entry) => entry.recipeId === recipe.id)?.id}" aria-label="从今日菜单移除">×</button></div>`).join("")}</div>` : `<p class="screen-lede">从菜谱添加今天想做的菜，采购清单会自动同步。</p>`}
    </section>
  </main>`;
}

function recipeCard(recipe, inMenu = false) {
  return `<article class="recipe-card"><div><h3>${escapeHTML(recipe.name)}</h3><p>${escapeHTML(recipe.summary || "还没有简介")}</p><div class="meta-row">${(recipe.tags ?? []).slice(0, 3).map((tag) => `<span class="pill">${escapeHTML(tag)}</span>`).join("")}</div></div><div class="card-actions"><button class="quiet" data-action="menu-add" data-id="${recipe.id}" ${inMenu ? "disabled" : ""}>${inMenu ? "已加入" : "加到今日"}</button><button class="card-action" data-action="recipe-open" data-id="${recipe.id}" aria-label="查看${escapeHTML(recipe.name)}">→</button></div></article>`;
}

export function recipeBrowser(recipes) {
  return `<div class="modal-head"><h2 id="modal-title">全部菜谱</h2><button type="button" class="icon-button" data-action="modal-close">×</button></div><div class="modal-body"><section class="recipe-grid">${recipes.map((recipe) => recipeCard(recipe)).join("") || `<div class="empty">还没有菜谱</div>`}</section></div>`;
}

export function recipeDetailView(recipe) {
  return `<main class="screen"><div class="detail-header"><button class="back-button" data-action="recipe-back">← 返回菜谱</button><div class="detail-actions"><button class="quiet" data-action="recipe-edit" data-id="${recipe.id}">编辑</button><button class="danger" data-action="recipe-delete" data-id="${recipe.id}">删除</button></div></div>
    ${(recipe.imageKeys ?? []).length ? `<div class="photo-strip">${recipe.imageKeys.map((key) => `<div class="recipe-photo skeleton" data-image-key="${key}" aria-label="菜谱图片"></div>`).join("")}</div>` : ""}
    <span class="eyebrow">${escapeHTML((recipe.tags ?? []).join(" · ") || "我的菜谱")}</span><h2 class="screen-title">${escapeHTML(recipe.name)}</h2><p class="screen-lede">${escapeHTML(recipe.summary || "还没有简介")}</p>
    <div class="meta-row" style="margin-top:16px"><span class="pill">♨ 默认 1 人份</span>${(recipe.tags ?? []).map((tag) => `<span class="pill">${escapeHTML(tag)}</span>`).join("")}</div>
    <section class="content-card"><h3>食材</h3>${recipe.ingredients.length ? recipe.ingredients.map((item) => `<div class="ingredient-row"><span>${escapeHTML(item.name)}</span><strong>${item.quantity} ${escapeHTML(item.unit)}</strong></div>`).join("") : `<p class="screen-lede">暂未添加食材</p>`}</section>
    <section class="content-card"><h3>步骤</h3>${recipe.steps.length ? recipe.steps.map((step, index) => `<div class="step-row"><span class="step-number">${index + 1}</span><span>${escapeHTML(step.text)}</span></div>`).join("") : `<p class="screen-lede">暂未添加步骤</p>`}</section>
    <button class="secondary" style="width:100%;margin-top:16px" data-action="menu-add" data-id="${recipe.id}">加入今日菜单</button>
    ${recipe.steps.length ? `<button class="primary" style="width:100%;margin-top:10px" data-action="cook-start" data-id="${recipe.id}">开始烹饪</button>` : ""}
  </main>`;
}

export function placeholderView(title, copy) {
  return `<main class="screen"><span class="eyebrow">即将完成</span><h2 class="screen-title">${title}</h2><p class="screen-lede">${copy}</p><div class="empty" style="margin-top:28px">这一页正在接入完整交互。</div></main>`;
}

export function importsView(state) {
  const pending = state.drafts.filter((draft) => draft.status === "pending");
  return `<main class="screen"><span class="eyebrow">人工确认工作流</span><h2 class="screen-title">把灵感带回来</h2><p class="screen-lede">无论来自链接、文案还是截图，都先检查和修改，再进入菜谱库。</p>
    <div class="action-grid"><button class="action-tile" data-action="import-open" data-kind="url"><span>🔗</span><strong>链接</strong><small>粘贴菜谱网址</small></button><button class="action-tile" data-action="import-open" data-kind="text"><span>✎</span><strong>纯文案</strong><small>粘贴已有内容</small></button><button class="action-tile" data-action="import-open" data-kind="images"><span>▧</span><strong>图片</strong><small>单图、多图或长截图</small></button><button class="action-tile" data-action="system-simulator"><span>↗</span><strong>系统入口</strong><small>模拟分享与快捷指令</small></button></div>
    <div class="section-heading"><h2>待确认草稿</h2><span>${pending.length} 项</span></div>
    <section class="recipe-grid">${pending.length ? pending.map((draft) => `<article class="recipe-card"><div><h3>${escapeHTML(draft.recipe.name || "待命名导入")}</h3><p>${draft.kind === "images" ? `${draft.recipe.imageKeys?.length ?? 0} 张图片` : escapeHTML(draft.rawContent || "等待补充")}</p><span class="pill">必须人工确认</span></div><button class="card-action" data-action="draft-open" data-id="${draft.id}" aria-label="确认草稿">→</button></article>`).join("") : `<div class="empty">暂无待确认内容。试试粘贴一段菜谱或选择几张截图。</div>`}</section>
  </main>`;
}

export function importForm(kind) {
  const title = kind === "url" ? "导入链接" : kind === "text" ? "导入文案" : "导入图片";
  const content = kind === "images"
    ? `<label class="field">选择图片或长截图<input name="images" type="file" accept="image/*" multiple required></label><p class="form-note">支持单张和多张图片；长截图按普通图片保存。本地预览不进行 OCR。</p>`
    : `<label class="field">${kind === "url" ? "菜谱链接" : "菜谱文案"}<textarea name="content" required placeholder="${kind === "url" ? "https://example.com/recipe" : "第一行作为菜名，后续内容可在确认页修改"}"></textarea></label>`;
  return `<form id="import-form" data-kind="${kind}"><div class="modal-head"><h2 id="modal-title">${title}</h2><button type="button" class="icon-button" data-action="modal-close" aria-label="关闭">×</button></div><div class="modal-body">${content}<div class="modal-actions"><button type="button" class="quiet" data-action="modal-close">取消</button><button class="primary">生成待确认草稿</button></div></div></form>`;
}

export function draftEditor(draft) {
  const recipe = draft.recipe;
  const ingredients = (recipe.ingredients ?? []).map((item) => `${item.name} | ${item.quantity} | ${item.unit}`).join("\n");
  const steps = (recipe.steps ?? []).map((step) => step.text).join("\n");
  return `<form id="draft-form" data-id="${draft.id}"><div class="modal-head"><div><span class="eyebrow">保存前必须确认</span><h2 id="modal-title">检查导入结果</h2></div><button type="button" class="icon-button" data-action="modal-close" aria-label="关闭">×</button></div><div class="modal-body"><div class="confirmation-banner">网页预览不会自动识别图片文字。请补充名称、食材和步骤，确认无误后再保存。</div><div class="form-grid">
    <label class="field">名称<input name="name" required value="${escapeHTML(recipe.name ?? "")}"></label><label class="field">简介<textarea name="summary">${escapeHTML(recipe.summary ?? "")}</textarea></label>
    <div class="two-col"><label class="field">份量<input name="servings" type="number" min="1" value="${recipe.servings ?? 2}"></label><label class="field">耗时（分钟）<input name="durationMinutes" type="number" min="1" value="${recipe.durationMinutes ?? 20}"></label></div>
    <label class="field">食材（名称 | 数量 | 单位）<textarea name="ingredients">${escapeHTML(ingredients)}</textarea></label><label class="field">步骤（每行一步）<textarea name="steps">${escapeHTML(steps)}</textarea></label>
    <label class="field">标签<input name="tags" value="${escapeHTML((recipe.tags ?? []).join("、"))}"></label><label class="field">来源<input name="source" value="${escapeHTML(recipe.source ?? "")}"></label>
  </div><div class="modal-actions"><button type="button" class="danger" data-action="draft-discard" data-id="${draft.id}">丢弃</button><button class="primary" name="confirmed" value="yes">我已检查，保存菜谱</button></div></div></form>`;
}

export function cookingView(recipe, index) {
  const step = recipe.steps[index];
  const relevant = step.ingredientIds?.length
    ? recipe.ingredients.filter((item) => step.ingredientIds.includes(item.id))
    : recipe.ingredients;
  return `<main class="screen cooking-screen"><button class="back-button" data-action="cook-close">× 退出烹饪</button><div class="cook-progress"><span style="width:${(index + 1) / recipe.steps.length * 100}%"></span></div><p class="eyebrow">第 ${index + 1} 步，共 ${recipe.steps.length} 步</p><h2 class="cook-instruction">${escapeHTML(step.text)}</h2><section class="content-card"><h3>本步食材</h3>${relevant.map((item) => `<div class="ingredient-row"><span>${escapeHTML(item.name)}</span><strong>${item.quantity} ${escapeHTML(item.unit)}</strong></div>`).join("") || `<p class="screen-lede">本步没有指定食材</p>`}</section><div class="cook-actions"><button class="quiet" data-action="cook-prev" ${index === 0 ? "disabled" : ""}>上一项</button><button class="primary" data-action="cook-next">${index === recipe.steps.length - 1 ? "完成" : "下一项"}</button></div></main>`;
}

export function shoppingView(state) {
  const groups = new Map();
  for (const item of state.shoppingItems) {
    const key = `${item.name.trim().toLocaleLowerCase("zh-CN")}\u0000${item.unit}`;
    const current = groups.get(key) ?? { ...item, quantity: 0, ids: [], checked: true };
    current.quantity += Number(item.quantity) || 0;
    current.ids.push(item.id);
    current.checked = current.checked && Boolean(item.checked);
    groups.set(key, current);
  }
  const displayItems = [...groups.values()];
  return `<main class="screen"><span class="eyebrow">买齐再开火</span><h2 class="screen-title">采购清单</h2><p class="screen-lede">今日菜单会自动生成采购项，也可以随手补上一项。</p>
    <form id="shopping-form" class="inline-form"><input name="name" required placeholder="添加采购项"><input name="quantity" type="number" step="0.1" min="0.1" value="1" aria-label="数量"><input name="unit" placeholder="单位" aria-label="单位"><button class="primary">添加</button></form>
    <div class="section-heading"><h2>待采购</h2><span>${displayItems.filter((item) => !item.checked).length} 项</span></div>
    <section class="check-list">${displayItems.length ? displayItems.map((item) => `<div class="check-row ${item.checked ? "done" : ""}"><button class="check-button" data-action="shopping-toggle-group" data-ids="${item.ids.join(",")}" aria-label="${item.checked ? "取消勾选" : "勾选"}">${item.checked ? "✓" : ""}</button><span>${escapeHTML(item.name)}</span><div class="quantity-controls"><button data-action="shopping-adjust-group" data-ids="${item.ids.join(",")}" data-delta="-1">−</button><strong>${item.quantity} ${escapeHTML(item.unit)}</strong><button data-action="shopping-adjust-group" data-ids="${item.ids.join(",")}" data-delta="1">＋</button></div><button class="row-delete" data-action="shopping-delete-group" data-ids="${item.ids.join(",")}" aria-label="删除">×</button></div>`).join("") : `<div class="empty">清单还是空的。请先从菜谱加入今日菜单，或手动添加采购项。</div>`}</section>
  </main>`;
}

export function recipePicker(recipes) {
  return `<div class="modal-head"><h2 id="modal-title">从菜谱生成</h2><button class="icon-button" data-action="modal-close">×</button></div><div class="modal-body"><div class="recipe-grid">${recipes.map((recipe) => `<button class="recipe-card picker-card" data-action="shopping-pick-recipe" data-id="${recipe.id}"><div><h3>${escapeHTML(recipe.name)}</h3><p>${recipe.ingredients.length} 种食材 · ${recipe.servings} 人份</p></div><span>＋</span></button>`).join("") || `<div class="empty">请先创建菜谱</div>`}</div></div>`;
}

export function inventoryView(state, balances, recentEvents) {
  const archivedEvents = state.inventoryEvents.filter((event) => event.archived);
  return `<main class="screen"><span class="eyebrow">事件驱动库存</span><h2 class="screen-title">厨房里还有什么？</h2><p class="screen-lede">余额由每次入库、消耗和调整实时汇总，不维护另一份数字。</p>
    <div class="balance-grid">${balances.length ? balances.map((item) => `<article class="balance-card"><span>${escapeHTML(item.ingredientName)}</span><strong>${item.quantity}</strong><small>${escapeHTML(item.unit)}</small></article>`).join("") : `<div class="empty">还没有库存事件</div>`}</div>
    <div class="inventory-actions"><button class="primary" data-action="inventory-new" data-kind="stock">入库</button><button class="secondary" data-action="inventory-new" data-kind="consume">消耗</button><button class="quiet" data-action="inventory-new" data-kind="adjust">调整</button></div><div class="section-heading"><h2>事件流水</h2><span>最近 ${recentEvents.length} 条</span></div>
    <section class="event-list">${recentEvents.map(eventRow).join("") || `<div class="empty">每次变化都会显示在这里。</div>`}</section>
    ${(state.inventoryEvents.filter((event) => !event.archived).length > recentEvents.length) ? `<p class="form-note">仅显示最近 5 条事件，请归档已处理记录。</p>` : ""}
    <section class="archived-events"><details><summary>已归档（${archivedEvents.length} 条）</summary><div class="event-list">${archivedEvents.map((event) => `${eventRow(event)}<button class="quiet archive-restore" data-action="inventory-unarchive" data-id="${event.id}">恢复到流水</button>`).join("") || `<p class="form-note">暂无归档记录</p>`}</div></details></section>
  </main>`;
}

function eventRow(event) {
  return `<div class="event-row"><span class="event-icon ${event.type}">${event.type === "stock" ? "+" : event.type === "consume" ? "−" : "±"}</span><div><strong>${escapeHTML(event.ingredientName)}</strong><small>${event.type === "stock" ? "入库" : event.type === "consume" ? "消耗" : "调整"} · ${new Date(event.createdAt).toLocaleString("zh-CN")}${event.expiresAt ? ` · <span class="expiry">${escapeHTML(countdownLabel(event.expiresAt))}</span>` : ""}</small></div><b>${event.quantity} ${escapeHTML(event.unit)}</b><div class="event-actions">${!event.archived ? `<button class="row-delete" data-action="inventory-delete" data-id="${event.id}" aria-label="删除记录">删除</button><button class="row-delete" data-action="inventory-archive" data-id="${event.id}" aria-label="归档记录">归档</button>` : ""}</div></div>`;
}

function countdownLabel(expiresAt) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  return days < 0 ? "已过期" : `剩余 ${days} 天`;
}

export function inventoryEditor(prefill = {}) {
  const type = prefill.type ?? "stock";
  const isStock = type === "stock";
  return `<form id="inventory-form"><input type="hidden" name="shoppingItemId" value="${escapeHTML(prefill.shoppingItemId ?? "")}"><input type="hidden" name="type" value="${type}"><div class="modal-head"><h2 id="modal-title">${isStock ? "记录入库" : type === "consume" ? "记录消耗" : "记录调整"}</h2><button type="button" class="icon-button" data-action="modal-close">×</button></div><div class="modal-body"><div class="form-grid"><label class="field">食材<input name="ingredientName" required value="${escapeHTML(prefill.ingredientName ?? "")}" ${prefill.shoppingItemId ? "readonly" : ""}></label><div class="two-col"><label class="field">数量<input name="quantity" type="number" step="0.1" required value="${prefill.quantity ?? 1}"></label><label class="field">单位<input name="unit" required value="${escapeHTML(prefill.unit ?? "")}" ${prefill.shoppingItemId ? "readonly" : ""}></label></div>${isStock ? `<div class="two-col"><label class="field">采购日期<input name="purchaseDate" type="date" value="${prefill.purchaseDate ?? new Date().toISOString().slice(0, 10)}"></label><label class="field">保质期（天）<input name="shelfLifeDays" type="number" min="1" required value="${prefill.shelfLifeDays ?? ""}" placeholder="入库时填写"></label></div>` : ""}</div><p class="form-note">${isStock ? "入库事件会按采购日期计算到期倒计时。" : type === "consume" ? "消耗默认从距离到期最近的库存批次扣减。" : "调整会保留在事件流水中。"}</p><div class="modal-actions"><button class="primary">保存事件</button></div></div></form>`;
}

export function systemSimulatorView() {
  return `<div class="modal-head"><h2 id="modal-title">系统入口模拟器</h2><button class="icon-button" data-action="modal-close">×</button></div><div class="modal-body"><div class="confirmation-banner">这是产品流程演示，不代表真实 App Intent 已在 iOS 验证。</div><div class="action-grid"><button class="action-tile" data-action="shortcut-shopping"><span>🧺</span><strong>查看采购</strong><small>快捷指令</small></button><button class="action-tile" data-action="shortcut-cooking"><span>🍳</span><strong>开始烹饪</strong><small>快捷指令</small></button></div></div>`;
}

export function recipeEditor(recipe = {}, customTags = []) {
  const ingredientRows = (recipe.ingredients?.length ? recipe.ingredients : [{ name: "", quantity: "", unit: "" }]).map((item) => ingredientRow(item)).join("");
  const selectedTags = new Set(recipe.tags ?? []);
  const tagOptions = ["素菜", "荤菜", "汤类", ...customTags, ...(recipe.tags ?? [])].filter((tag, index, all) => all.indexOf(tag) === index);
  return `<form id="recipe-form" data-id="${recipe.id ?? ""}"><div class="modal-head"><h2 id="modal-title">${recipe.id ? "编辑菜谱" : "新建菜谱"}</h2><button type="button" class="icon-button" data-action="modal-close" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid">
    <label class="field">名称<input name="name" required maxlength="60" value="${escapeHTML(recipe.name ?? "")}" placeholder="例如：番茄炒蛋"></label>
    <label class="field">简介<textarea name="summary" placeholder="这道菜有什么特别？">${escapeHTML(recipe.summary ?? "")}</textarea></label>
    <div class="ingredient-editor"><div class="field-label-row"><span>食材</span><button type="button" class="quiet" data-action="ingredient-add">＋ 添加食材</button></div><div id="ingredient-list">${ingredientRows}</div></div>
    <label class="field">步骤 <span class="form-note">可直接粘贴一整段文字，保存时自动拆分</span><textarea name="steps" rows="6" placeholder="例如：1. 鸡蛋打散；2. 番茄切块；3. 入锅翻炒">${escapeHTML((recipe.steps ?? []).map((step) => step.text).join("；"))}</textarea></label>
    <label class="field">图片或长截图<input name="images" type="file" accept="image/*" multiple><span class="form-note">${recipe.imageKeys?.length ? `已保存 ${recipe.imageKeys.length} 张，可继续添加` : "可选单张或多张图片"}</span></label>
    <label class="field">标签<select name="tags" multiple size="3">${tagOptions.map((tag) => `<option value="${escapeHTML(tag)}" ${selectedTags.has(tag) ? "selected" : ""}>${escapeHTML(tag)}</option>`).join("")}</select><button type="button" class="quiet" data-action="tag-add">＋ 添加自定义标签</button></label>
  </div><div class="modal-actions"><button type="button" class="quiet" data-action="modal-close">取消</button><button class="primary" type="submit">保存菜谱</button></div></div></form>`;
}

function ingredientRow(item = {}) {
  return `<div class="ingredient-entry"><input name="ingredientName" required placeholder="名称" value="${escapeHTML(item.name ?? "")}"><input name="ingredientQuantity" required type="number" min="0.01" step="0.01" placeholder="数量" value="${item.quantity ?? ""}"><input name="ingredientUnit" required placeholder="单位" value="${escapeHTML(item.unit ?? "")}"><button type="button" class="row-delete" data-action="ingredient-remove" aria-label="删除食材">×</button></div>`;
}

export function menuServingPicker(recipe) {
  return `<form id="menu-form" data-recipe-id="${recipe.id}"><div class="modal-head"><h2 id="modal-title">加入今日菜单</h2><button type="button" class="icon-button" data-action="modal-close">×</button></div><div class="modal-body"><p class="screen-lede">${escapeHTML(recipe.name)} 的采购数量会按份量自动计算并向上取整。</p><label class="field">今日份量<input name="servings" type="number" min="0.1" step="0.1" value="1" required></label><div class="modal-actions"><button type="button" class="quiet" data-action="modal-close">取消</button><button class="primary">加入今日菜单</button></div></div></form>`;
}

export function settingsView() {
  return `<div class="modal-head"><h2 id="modal-title">数据与演示</h2><button class="icon-button" data-action="modal-close" aria-label="关闭">×</button></div><div class="modal-body"><p class="screen-lede">所有数据只保存在这个浏览器。可以导出备份、恢复或重置演示内容。</p><div class="settings-actions"><button class="secondary" data-action="install-guide">安装到手机</button><button class="secondary" data-action="data-export">导出 JSON</button><label class="quiet file-label">导入 JSON<input id="backup-file" type="file" accept="application/json"></label><button class="danger" data-action="data-reset">重置演示数据</button></div><div class="modal-actions"><button class="quiet" data-action="modal-close">完成</button></div></div>`;
}

export function installGuide(instruction) {
  return `<div class="modal-head"><h2 id="modal-title">安装菜猪猪</h2><button class="icon-button" data-action="modal-close" aria-label="关闭">×</button></div><div class="modal-body"><div class="confirmation-banner"><strong>像 App 一样使用</strong><br>${escapeHTML(instruction)}</div><p class="screen-lede">安装后，菜猪猪会出现在手机桌面；首次联网打开后，已访问过的页面可离线使用。数据仅保存在当前设备，请定期导出备份。</p><div class="modal-actions"><button class="primary" data-action="modal-close">知道了</button></div></div>`;
}
