import { canApplyInventoryEvent, confirmDraft, inventoryAdjustmentEvent, inventoryBalances, inventoryConsumeEvents, inventoryExpiringBatches, inventoryRecentEvents, inventoryRecipeRecommendations, inventoryStockPrefill, inventoryStockPrefills, normalizeUnit, splitRecipeSteps, validateRecipe } from "./domain.js";
import { createStepOrganizerClient } from "./ai.js";
import { aiConfig } from "./ai-config.js";
import { imageObjectURL, saveImage } from "./images.js";
import { createCloudClient, createCloudSessionStore } from "./cloud.js";
import { cloudConfig } from "./cloud-config.js";
import { installInstructionsFor } from "./install.js";
import { exportState, importState, loadState, saveState } from "./storage.js";
import { reduceState } from "./state.js";
import { mergeEverydayRecipes } from "./recipe-pack.js";
import { pickRecipeSuggestion } from "./recipe-discovery.js";
import { buildShoppingShare, copyShoppingText } from "./shopping-share.js";
import {
  appView,
  cookingView,
  cloudLoginView,
  draftEditor,
  importForm,
  inventoryConsumeEditor,
  inventoryBatchStockEditor,
  inventoryEditor,
  installGuide,
  inventoryView,
  menuServingPicker,
  recipeDetailView,
  recipeBrowser,
  recipeSuggestion,
  recipeEditor,
  recipesForCategory,
  recipesView,
  settingsView,
  stepPreview,
  shoppingView,
  shoppingSharePreview,
  systemSimulatorView,
} from "./views.js";

const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const toast = document.querySelector("#toast");
const ARCHIVE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function pruneExpiredArchivedEvents(currentState, now = new Date()) {
  return reduceState(currentState, {
    type: "inventory/prune-archived",
    before: new Date(now.getTime() - ARCHIVE_RETENTION_MS).toISOString(),
  });
}

const savedState = loadState();
const loadedState = mergeEverydayRecipes(savedState);
let state = pruneExpiredArchivedEvents(loadedState);
if (state !== savedState) saveState(localStorage, state);
let ui = { tab: "recipes", recipeId: null, cooking: null, selectedCategory: "全部", recipeQuery: "", suggestedRecipeId: null };
let pendingShoppingIds = [];
let suggestedSteps = [];
const cloud = createCloudClient(cloudConfig);
const cloudSessions = createCloudSessionStore();
let cloudSession = cloudSessions.load();
const aiOrganizer = createStepOrganizerClient(aiConfig);

function dispatch(action) {
  state = reduceState(state, action);
  state = pruneExpiredArchivedEvents(state);
  saveState(localStorage, state);
  void syncCloudState();
  render();
}

async function activeCloudSession() {
  if (!cloudSession?.access_token) return null;
  if (!cloudSession.expires_at || cloudSession.expires_at * 1000 > Date.now() + 60_000) return cloudSession;
  if (!cloudSession.refresh_token) return null;
  cloudSession = await cloud.refreshSession(cloudSession.refresh_token);
  cloudSessions.save(cloudSession);
  return cloudSession;
}

async function syncCloudState() {
  try {
    const session = await activeCloudSession();
    if (session) await cloud.saveState(session.access_token, state);
  } catch {
    // 保留本地数据，下一次操作或刷新会再次尝试同步。
  }
}

function render() {
  let content;
  if (ui.cooking) {
    const recipe = state.recipes.find((item) => item.id === ui.cooking.recipeId);
    content = recipe ? cookingView(recipe, ui.cooking.index) : recipesView(state);
  } else if (ui.tab === "recipes") {
    const recipe = state.recipes.find((item) => item.id === ui.recipeId);
    content = recipe ? recipeDetailView(recipe) : recipesView({ ...state, selectedCategory: ui.selectedCategory, recipeQuery: ui.recipeQuery }, {
      recommendations: inventoryRecipeRecommendations(state.recipes, state.inventoryEvents),
    });
  } else if (ui.tab === "shopping") {
    content = shoppingView(state);
  } else {
    content = inventoryView(state, inventoryBalances(state.inventoryEvents), inventoryRecentEvents(state.inventoryEvents), ui.inventoryArchiveOpen, inventoryExpiringBatches(state.inventoryEvents));
  }
  app.innerHTML = appView(state, ui, content);
  hydrateImages();
}

async function hydrateImages() {
  for (const element of document.querySelectorAll("[data-image-key]")) {
    const key = element.dataset.imageKey;
    const url = key.startsWith("./assets/") ? key : await imageObjectURL(key).catch(() => null);
    if (url) { element.style.backgroundImage = `url("${url}")`; element.classList.remove("skeleton"); }
  }
}

function openModal(content) {
  modal.innerHTML = content;
  modal.showModal();
  void hydrateImages();
}

function closeModal() {
  modal.close();
  modal.innerHTML = "";
  suggestedSteps = [];
}

function stepInput() {
  return modal.querySelector('#recipe-form textarea[name="steps"]');
}

function renderStepPreview(source) {
  const preview = modal.querySelector("#steps-preview");
  if (preview) preview.innerHTML = stepPreview(suggestedSteps, source);
}

async function organizeStepsWithAI() {
  const input = stepInput();
  if (!input) return;
  try {
    const session = await activeCloudSession();
    suggestedSteps = await aiOrganizer.organize(input.value, session?.access_token);
    renderStepPreview("ai");
    notify("智能整理完成，请检查后再采用");
  } catch (error) {
    notify(error.message || "智能整理暂时不可用");
  }
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

async function copyPendingShopping() {
  const field = modal.querySelector("#shopping-share-text");
  const status = modal.querySelector("#shopping-share-status");
  const button = modal.querySelector('[data-action="shopping-share-copy"]');
  if (!field || !status || !button || button.disabled) return;
  button.disabled = true;
  button.textContent = "复制中…";
  const copied = await copyShoppingText(field.value, navigator.clipboard);
  if (!field.isConnected) return;
  button.disabled = false;
  button.textContent = "复制清单";
  if (copied) {
    status.textContent = "已复制，去微信或其他聊天窗口粘贴即可。";
  } else {
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    status.textContent = "自动复制未成功，文字已选中。请长按文字复制，或按 Ctrl+C / ⌘C。";
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id, tab } = button.dataset;
  if (action === "tab") { ui = { ...ui, tab, recipeId: null, cooking: null }; render(); }
  if (action === "recipe-category") { ui.selectedCategory = button.dataset.category; state = { ...state, selectedCategory: ui.selectedCategory }; render(); }
  if (action === "recipe-search-clear") { ui.recipeQuery = ""; render(); document.querySelector("#recipe-query")?.focus(); }
  if (action === "recipe-surprise") {
    const matches = recipesForCategory(state.recipes, ui.selectedCategory, ui.recipeQuery);
    const excludedIds = (state.todayMenu ?? []).map(entry => entry.recipeId);
    const stockedIds = inventoryRecipeRecommendations(matches, state.inventoryEvents).map(item => item.recipe.id);
    const recipe = pickRecipeSuggestion(matches, { excludedIds, stockedIds, previousId: ui.suggestedRecipeId });
    if (recipe) {
      ui.suggestedRecipeId = recipe.id;
      openModal(recipeSuggestion(recipe, { stocked: stockedIds.includes(recipe.id), hasAlternative: matches.filter(item => !excludedIds.includes(item.id)).length > 1 }));
    } else {
      notify(matches.length ? "这些菜都已在今日菜单里，试试其他分类" : "没有符合条件的菜谱，试试清除搜索或切换分类");
    }
  }
  if (action === "menu-add") {
    const recipe = state.recipes.find((item) => item.id === id);
    if (recipe) openModal(menuServingPicker(recipe));
  }
  if (action === "menu-remove") { dispatch({ type: "menu/remove", id }); notify("已从今日菜单移除，采购清单同步更新"); }
  if (action === "recipe-new") openModal(recipeEditor({}, state.customTags ?? []));
  if (action === "recipe-browse-all") {
    const category = ui.selectedCategory ?? "全部";
    openModal(recipeBrowser(recipesForCategory(state.recipes, category, ui.recipeQuery), category, ui.recipeQuery));
  }
  if (action === "ingredient-add") {
    const list = document.querySelector("#ingredient-list");
    if (list) { list.insertAdjacentHTML("beforeend", `<div class="ingredient-entry"><input name="ingredientName" required placeholder="名称"><input name="ingredientQuantity" required type="number" min="0.01" step="0.01" placeholder="数量"><input name="ingredientUnit" required placeholder="单位"><button type="button" class="row-delete" data-action="ingredient-remove" aria-label="删除食材">×</button></div>`); }
  }
  if (action === "ingredient-remove") { button.closest(".ingredient-entry")?.remove(); }
  if (action === "steps-preview-local") {
    const input = stepInput();
    suggestedSteps = splitRecipeSteps(input?.value ?? "");
    renderStepPreview("local");
  }
  if (action === "steps-apply-preview") {
    const input = stepInput();
    if (input && suggestedSteps.length) {
      input.value = suggestedSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");
      notify("步骤草稿已填入，可继续编辑");
    }
  }
  if (action === "steps-ai-organize") void organizeStepsWithAI();
  if (action === "tag-add") {
    const value = prompt("输入一个自定义标签");
    if (value?.trim()) {
      const select = document.querySelector('select[name="tags"]');
      if (select && ![...select.options].some((option) => option.value === value.trim())) select.add(new Option(value.trim(), value.trim(), true, true));
      state.customTags = [...new Set([...(state.customTags ?? []), value.trim()])];
      saveState(localStorage, state);
    }
  }
  if (action === "recipe-open") { if (modal.open) closeModal(); ui.recipeId = id; render(); }
  if (action === "recipe-back") { ui.recipeId = null; render(); }
  if (action === "recipe-edit") openModal(recipeEditor(state.recipes.find((recipe) => recipe.id === id), state.customTags ?? []));
  if (action === "recipe-delete" && confirm("确定删除这道菜谱吗？")) {
    ui.recipeId = null;
    dispatch({ type: "recipe/delete", id });
    notify("菜谱已删除");
  }
  if (action === "modal-close") { pendingShoppingIds = []; closeModal(); }
  if (action === "settings") openModal(settingsView());
  if (action === "cloud-account") openModal(cloudLoginView());
  if (action === "install-guide") openModal(installGuide(installInstructionsFor(navigator.userAgent)));
  if (action === "import-open") openModal(importForm(button.dataset.kind));
  if (action === "draft-open") openModal(draftEditor(state.drafts.find((draft) => draft.id === id)));
  if (action === "draft-discard") { dispatch({ type: "draft/remove", id }); closeModal(); notify("草稿已丢弃"); }
  if (action === "cook-start") { ui.cooking = { recipeId: id, index: 0 }; render(); }
  if (action === "cook-close") { ui.cooking = null; render(); }
  if (action === "cook-prev") { ui.cooking.index = Math.max(0, ui.cooking.index - 1); render(); }
  if (action === "cook-next") {
    const recipe = state.recipes.find((item) => item.id === ui.cooking.recipeId);
    if (ui.cooking.index >= recipe.steps.length - 1) { ui.cooking = null; render(); notify("完成啦，开饭！"); }
    else { ui.cooking.index += 1; render(); }
  }
  if (action === "shopping-toggle") {
    const item = state.shoppingItems.find((entry) => entry.id === id);
    if (item && !item.checked) {
      const prefill = inventoryStockPrefill([item]);
      openModal(inventoryEditor({ ...prefill, type: "stock", shoppingItemId: item.id, purchaseDate: new Date().toISOString().slice(0, 10) }));
    }
    else if (item) dispatch({ type: "shopping/update", item: { ...item, checked: false } });
  }
  if (action === "shopping-toggle-group") {
    const ids = button.dataset.ids.split(",").filter(Boolean);
    const items = ids.map((itemId) => state.shoppingItems.find((entry) => entry.id === itemId)).filter(Boolean);
    if (items.length && items.every((item) => item.checked)) {
      items.forEach((item) => dispatch({ type: "shopping/update", item: { ...item, checked: false } }));
    } else if (items.length) {
      const prefill = inventoryStockPrefill(items);
      pendingShoppingIds = prefill.shoppingItemIds;
      openModal(inventoryEditor({ ...prefill, type: "stock", shoppingItemId: ids[0], purchaseDate: new Date().toISOString().slice(0, 10) }));
    }
  }
  if (action === "shopping-stock-many") {
    openModal(inventoryBatchStockEditor(inventoryStockPrefills(state.shoppingItems.filter((item) => !item.checked))));
  }
  if (action === "shopping-share") {
    const share = buildShoppingShare(state.shoppingItems);
    if (share.count) openModal(shoppingSharePreview(share));
    else notify("没有待采购的食材");
  }
  if (action === "shopping-share-copy") void copyPendingShopping();
  if (action === "shopping-share-select") {
    const field = modal.querySelector("#shopping-share-text");
    if (field) { field.focus(); field.select(); field.setSelectionRange(0, field.value.length); }
  }
  if (action === "shopping-adjust-group") {
    const first = state.shoppingItems.find((item) => item.id === button.dataset.ids.split(",")[0]);
    if (first) dispatch({ type: "shopping/update", item: { ...first, quantity: Math.max(0, Number(first.quantity) + Number(button.dataset.delta)) } });
  }
  if (action === "shopping-delete-group") {
    button.dataset.ids.split(",").filter(Boolean).forEach((itemId) => dispatch({ type: "shopping/delete", id: itemId }));
  }
  if (action === "shopping-adjust") {
    const item = state.shoppingItems.find((entry) => entry.id === id);
    const quantity = Math.max(0, Number(item.quantity) + Number(button.dataset.delta));
    dispatch({ type: "shopping/update", item: { ...item, quantity } });
  }
  if (action === "shopping-delete") dispatch({ type: "shopping/delete", id });
  if (action === "inventory-new") {
    const kind = button.dataset.kind ?? "stock";
    openModal(kind === "consume"
      ? inventoryConsumeEditor(inventoryBalances(state.inventoryEvents))
      : inventoryEditor({ type: kind }));
  }
  if (action === "inventory-delete" && confirm("确定直接删除这条库存事件吗？")) {
    if (button.closest(".archived-events")) ui = { ...ui, inventoryArchiveOpen: true };
    const countBefore = state.inventoryEvents.length;
    dispatch({ type: "inventory/delete", id });
    notify(state.inventoryEvents.length < countBefore ? "库存事件已删除" : "删除会导致库存为负数，已取消");
  }
  if (action === "inventory-archive") { dispatch({ type: "inventory/archive", id }); notify("事件已归档"); }
  if (action === "inventory-unarchive") { ui = { ...ui, inventoryArchiveOpen: true }; dispatch({ type: "inventory/unarchive", id }); notify("事件已恢复到流水"); }
  if (action === "system-simulator") openModal(systemSimulatorView());
  if (action === "simulate-share" || action === "shortcut-import") { closeModal(); notify("导入功能已暂时移除"); }
  if (action === "shortcut-shopping") { closeModal(); ui = { tab: "shopping", recipeId: null, cooking: null }; render(); }
  if (action === "shortcut-cooking") { closeModal(); ui = { tab: "recipes", recipeId: null, cooking: null }; render(); notify("请选择一道菜开始烹饪"); }
  if (action === "data-export") downloadBackup();
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "recipe-search-form") {
    event.preventDefault();
    ui.recipeQuery = String(new FormData(event.target).get("query") ?? "").trim();
    render();
    document.querySelector("#recipe-query")?.focus();
    return;
  }
  if (event.target.id === "cloud-login-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const session = await cloud.signIn(String(form.get("email") ?? "").trim(), String(form.get("password") ?? ""));
      if (!session.access_token) throw new Error("登录失败");
      cloudSession = session;
      cloudSessions.save(session);
      const remoteState = await cloud.fetchState(session.access_token);
      if (remoteState) {
        const restoredState = importState(JSON.stringify(remoteState));
        state = mergeEverydayRecipes(pruneExpiredArchivedEvents(restoredState));
        saveState(localStorage, state);
        if (state !== restoredState) await cloud.saveState(session.access_token, state);
        notify("已恢复共享账号的云端数据");
      } else {
        await cloud.saveState(session.access_token, state);
        notify("共享账号已登录，当前数据已备份");
      }
      closeModal();
      render();
    } catch (error) {
      notify(error.message || "登录或同步失败，请检查账号、密码和云端配置");
    }
    return;
  }
  if (event.target.id === "import-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const kind = event.target.dataset.kind;
    const rawContent = String(form.get("content") ?? "").trim();
    let imageKeys = [];
    if (kind === "images") {
      const files = form.getAll("images").filter((file) => file instanceof File && file.size);
      if (!files.length) { notify("请至少选择一张图片"); return; }
      try { imageKeys = await Promise.all(files.map(saveImage)); }
      catch { notify("图片保存失败，请重试"); return; }
    }
    const firstLine = rawContent.split("\n").find(Boolean) ?? "";
    let name;
    if (kind === "url") {
      try {
        const url = new URL(rawContent);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        name = url.hostname;
      } catch { notify("请输入有效的 http 或 https 链接"); return; }
    } else {
      name = kind === "text" ? firstLine : imageKeys.length > 1 ? "多图导入" : "图片导入";
    }
    const draft = {
      id: crypto.randomUUID(), status: "pending", kind, rawContent,
      recipe: { name, summary: "", servings: 2, durationMinutes: 20, ingredients: [], steps: [], imageKeys, tags: [], source: kind === "url" ? rawContent : "浏览器导入" },
    };
    dispatch({ type: "draft/add", draft }); closeModal(); openModal(draftEditor(draft)); return;
  }
  if (event.target.id === "draft-form") {
    event.preventDefault();
    const draft = state.drafts.find((item) => item.id === event.target.dataset.id);
    const recipe = recipeFromForm(new FormData(event.target), draft.recipe);
    try {
      const confirmed = confirmDraft({ ...draft, recipe }, true);
      dispatch({ type: "recipe/save", recipe: confirmed });
      dispatch({ type: "draft/remove", id: draft.id });
      closeModal(); ui = { tab: "recipes", recipeId: confirmed.id, cooking: null }; render(); notify("导入已确认并保存");
    } catch (error) { notify(error.message); }
    return;
  }
  if (event.target.id === "shopping-form") {
    event.preventDefault(); const form = new FormData(event.target);
    dispatch({ type: "shopping/add", item: { id: crypto.randomUUID(), name: String(form.get("name")).trim(), quantity: Number(form.get("quantity")), unit: normalizeUnit(String(form.get("unit")).trim()), checked: false, source: "manual" } });
    event.target.reset(); return;
  }
  if (event.target.id === "inventory-consume-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const names = form.getAll("consumeName");
      const units = form.getAll("consumeUnit");
      const quantities = form.getAll("consumeQuantity");
      const balances = inventoryBalances(state.inventoryEvents);
      const requested = names.map((ingredientName, index) => {
        const unit = String(units[index] ?? "");
        const balance = balances.find((item) => item.ingredientName === ingredientName && item.unit === unit);
        return { ingredientName, unit, quantity: Number(quantities[index]), availableQuantity: balance?.quantity ?? 0 };
      });
      const events = inventoryConsumeEvents(requested).map((item) => ({
        ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString(), batchId: null,
      }));
      if (!events.length) { notify("请至少填写一项消耗数量"); return; }
      dispatch({ type: "inventory/add-events", events });
      closeModal();
      notify(`已记录 ${events.length} 项消耗`);
    } catch (error) {
      notify(error.message || "消耗数量无效");
    }
    return;
  }
  if (event.target.id === "inventory-batch-stock-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const names = form.getAll("stockIngredientName");
      const units = form.getAll("stockUnit");
      const quantities = form.getAll("stockQuantity");
      const shoppingIds = form.getAll("stockShoppingIds");
      const shelfLives = form.getAll("shelfLifeDays");
      const purchaseDate = new Date().toISOString().slice(0, 10);
      const events = names.map((ingredientName, index) => {
        const shelfLifeDays = Number(shelfLives[index]);
        if (!Number.isInteger(shelfLifeDays) || shelfLifeDays <= 0) throw new Error("请为每项食材填写有效的保质期");
        const expiresAt = new Date(new Date(`${purchaseDate}T00:00:00`).getTime() + shelfLifeDays * 86400000).toISOString();
        return {
          id: crypto.randomUUID(), type: "stock", ingredientName: String(ingredientName), quantity: Number(quantities[index]), unit: normalizeUnit(String(units[index])),
          purchaseDate, shelfLifeDays, expiresAt, batchId: crypto.randomUUID(), createdAt: new Date().toISOString(),
        };
      });
      if (!events.length) { notify("没有可入库的采购项"); return; }
      dispatch({ type: "inventory/add-events", events });
      const completedIds = shoppingIds.flatMap((ids) => String(ids).split(",").filter(Boolean));
      dispatch({ type: "shopping/mark-checked", ids: completedIds });
      closeModal();
      notify(`已批量入库 ${events.length} 项`);
    } catch (error) {
      notify(error.message || "批量入库失败");
    }
    return;
  }
  if (event.target.id === "menu-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const recipe = state.recipes.find((item) => item.id === event.target.dataset.recipeId);
    const servings = Number(form.get("servings"));
    if (!recipe || !Number.isFinite(servings) || servings <= 0) { notify("请输入有效份量"); return; }
    const mealPeriod = String(form.get("mealPeriod") ?? "dinner");
    dispatch({ type: "menu/add", menu: { id: crypto.randomUUID(), recipeId: recipe.id, servings, mealPeriod } });
    closeModal(); notify(`${recipe.name} 已加入今日菜单`); return;
  }
  if (event.target.id === "inventory-form") {
    event.preventDefault(); const form = new FormData(event.target);
    const type = String(form.get("type"));
    const purchaseDate = String(form.get("purchaseDate") || "");
    const shelfLifeDays = Number(form.get("shelfLifeDays"));
    const expiresAt = type === "stock" && purchaseDate && shelfLifeDays > 0
      ? new Date(new Date(`${purchaseDate}T00:00:00`).getTime() + shelfLifeDays * 86400000).toISOString()
      : undefined;
    const baseEvent = { id: crypto.randomUUID(), type, ingredientName: String(form.get("ingredientName")).trim(), quantity: Number(form.get("quantity")), unit: normalizeUnit(String(form.get("unit")).trim()), purchaseDate, shelfLifeDays: shelfLifeDays || null, expiresAt, batchId: type === "stock" ? crypto.randomUUID() : null, createdAt: new Date().toISOString() };
    const inventoryEvent = type === "adjust"
      ? { ...baseEvent, ...inventoryAdjustmentEvent(state.inventoryEvents, { ingredientName: baseEvent.ingredientName, unit: baseEvent.unit, targetQuantity: form.get("targetQuantity") }) }
      : baseEvent;
    if (!canApplyInventoryEvent(state.inventoryEvents, inventoryEvent)) { notify("库存不足，不能使食材数量变为负数"); return; }
    dispatch({ type: "inventory/add-event", event: inventoryEvent });
    const shoppingIds = pendingShoppingIds.length ? pendingShoppingIds : [String(form.get("shoppingItemId") || "")];
    shoppingIds.filter(Boolean).forEach((shoppingItemId) => {
      const item = state.shoppingItems.find((entry) => entry.id === shoppingItemId);
      if (item) dispatch({ type: "shopping/update", item: { ...item, checked: true } });
    });
    pendingShoppingIds = [];
    closeModal(); notify("库存事件已记录"); return;
  }
  if (event.target.id !== "recipe-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const existing = state.recipes.find((item) => item.id === event.target.dataset.id);
  const recipe = recipeFromForm(form, existing ?? {
    id: event.target.dataset.id || crypto.randomUUID(),
    imageKeys: [],
  });
  const imageFiles = form.getAll("images").filter((file) => file instanceof File && file.size);
  if (imageFiles.length) {
    try { recipe.imageKeys = [...recipe.imageKeys, ...await Promise.all(imageFiles.map(saveImage))]; }
    catch { notify("图片保存失败，请重试"); return; }
  }
  try {
    dispatch({ type: "recipe/save", recipe: validateRecipe(recipe) });
    closeModal();
    ui.recipeId = recipe.id;
    render();
    notify("菜谱已保存");
  } catch (error) {
    notify(error.message);
  }
});

function recipeFromForm(form, base) {
  const ingredientNames = form.getAll("ingredientName");
  const ingredientQuantities = form.getAll("ingredientQuantity");
  const ingredientUnits = form.getAll("ingredientUnit");
  const ingredients = ingredientNames.length
    ? ingredientNames.map((name, index) => ({ id: crypto.randomUUID(), name: String(name).trim(), quantity: Number(ingredientQuantities[index]), unit: normalizeUnit(String(ingredientUnits[index] ?? "").trim()) })).filter((item) => item.name)
    : String(form.get("ingredients") ?? "").split("\n").filter((line) => line.trim()).map((line) => { const [name, quantity, unit] = line.split("|").map((part) => part.trim()); return { id: crypto.randomUUID(), name, quantity: Number(quantity), unit: normalizeUnit(unit) }; });
  const stepText = String(form.get("steps") ?? "");
  return {
    ...base,
    name: form.get("name"), summary: form.get("summary"), servings: 1, durationMinutes: null,
    ingredients,
    steps: splitRecipeSteps(stepText).map((text) => ({ id: crypto.randomUUID(), text, ingredientIds: [] })),
    tags: form.getAll("tags").length ? form.getAll("tags").map((tag) => String(tag).trim()).filter(Boolean) : String(form.get("tags") ?? "").split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean), source: null, updatedAt: new Date().toISOString(),
  };
}

function downloadBackup() {
  const blob = new Blob([exportState(state)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `菜猪猪备份-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
}

document.addEventListener("change", async (event) => {
  if (event.target.id !== "backup-file") return;
  try { state = importState(await event.target.files[0].text()); saveState(localStorage, state); closeModal(); render(); notify("备份已恢复"); }
  catch (error) { notify(error.message); }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

render();
