import { canApplyInventoryEvent, confirmDraft, inventoryBalances, inventoryRecentEvents, inventoryStockPrefill, normalizeUnit, splitRecipeSteps, validateRecipe } from "./domain.js";
import { imageObjectURL, saveImage } from "./images.js";
import { installInstructionsFor } from "./install.js";
import { exportState, importState, loadState, resetState, saveState } from "./storage.js";
import { reduceState } from "./state.js";
import {
  appView,
  cookingView,
  draftEditor,
  importForm,
  inventoryEditor,
  installGuide,
  inventoryView,
  menuServingPicker,
  recipeDetailView,
  recipeBrowser,
  recipeEditor,
  recipesView,
  settingsView,
  shoppingView,
  systemSimulatorView,
} from "./views.js";

const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const toast = document.querySelector("#toast");
let state = loadState();
let ui = { tab: "recipes", recipeId: null, cooking: null, selectedCategory: "全部" };
let pendingShoppingIds = [];

function dispatch(action) {
  state = reduceState(state, action);
  saveState(localStorage, state);
  render();
}

function render() {
  let content;
  if (ui.cooking) {
    const recipe = state.recipes.find((item) => item.id === ui.cooking.recipeId);
    content = recipe ? cookingView(recipe, ui.cooking.index) : recipesView(state);
  } else if (ui.tab === "recipes") {
    const recipe = state.recipes.find((item) => item.id === ui.recipeId);
    content = recipe ? recipeDetailView(recipe) : recipesView(state);
  } else if (ui.tab === "shopping") {
    content = shoppingView(state);
  } else {
    content = inventoryView(state, inventoryBalances(state.inventoryEvents), inventoryRecentEvents(state.inventoryEvents));
  }
  app.innerHTML = appView(state, ui, content);
  hydrateImages();
}

async function hydrateImages() {
  for (const element of document.querySelectorAll("[data-image-key]")) {
    const url = await imageObjectURL(element.dataset.imageKey).catch(() => null);
    if (url) { element.style.backgroundImage = `url("${url}")`; element.classList.remove("skeleton"); }
  }
}

function openModal(content) {
  modal.innerHTML = content;
  modal.showModal();
}

function closeModal() {
  modal.close();
  modal.innerHTML = "";
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id, tab } = button.dataset;
  if (action === "tab") { ui = { ...ui, tab, recipeId: null, cooking: null }; render(); }
  if (action === "recipe-category") { ui.selectedCategory = button.dataset.category; state = { ...state, selectedCategory: ui.selectedCategory }; render(); }
  if (action === "menu-add") {
    const recipe = state.recipes.find((item) => item.id === id);
    if (recipe) openModal(menuServingPicker(recipe));
  }
  if (action === "menu-remove") { dispatch({ type: "menu/remove", id }); notify("已从今日菜单移除，采购清单同步更新"); }
  if (action === "recipe-new") openModal(recipeEditor({}, state.customTags ?? []));
  if (action === "recipe-browse-all") openModal(recipeBrowser(state.recipes));
  if (action === "ingredient-add") {
    const list = document.querySelector("#ingredient-list");
    if (list) { list.insertAdjacentHTML("beforeend", `<div class="ingredient-entry"><input name="ingredientName" required placeholder="名称"><input name="ingredientQuantity" required type="number" min="0.01" step="0.01" placeholder="数量"><input name="ingredientUnit" required placeholder="单位"><button type="button" class="row-delete" data-action="ingredient-remove" aria-label="删除食材">×</button></div>`); }
  }
  if (action === "ingredient-remove") { button.closest(".ingredient-entry")?.remove(); }
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
  if (action === "inventory-new") openModal(inventoryEditor({ type: button.dataset.kind ?? "stock" }));
  if (action === "inventory-delete" && confirm("确定直接删除这条库存事件吗？")) {
    const countBefore = state.inventoryEvents.length;
    dispatch({ type: "inventory/delete", id });
    notify(state.inventoryEvents.length < countBefore ? "库存事件已删除" : "删除会导致库存为负数，已取消");
  }
  if (action === "inventory-archive") { dispatch({ type: "inventory/archive", id }); notify("事件已归档"); }
  if (action === "inventory-unarchive") { dispatch({ type: "inventory/unarchive", id }); notify("事件已恢复到流水"); }
  if (action === "system-simulator") openModal(systemSimulatorView());
  if (action === "simulate-share" || action === "shortcut-import") { closeModal(); notify("导入功能已暂时移除"); }
  if (action === "shortcut-shopping") { closeModal(); ui = { tab: "shopping", recipeId: null, cooking: null }; render(); }
  if (action === "shortcut-cooking") { closeModal(); ui = { tab: "recipes", recipeId: null, cooking: null }; render(); notify("请选择一道菜开始烹饪"); }
  if (action === "data-export") downloadBackup();
  if (action === "data-reset" && confirm("确定清除当前浏览器数据并恢复演示内容吗？")) {
    state = resetState(); ui = { tab: "recipes", recipeId: null, cooking: null, selectedCategory: "全部" }; closeModal(); render(); notify("演示数据已恢复");
  }
});

document.addEventListener("submit", async (event) => {
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
  if (event.target.id === "menu-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const recipe = state.recipes.find((item) => item.id === event.target.dataset.recipeId);
    const servings = Number(form.get("servings"));
    if (!recipe || !Number.isFinite(servings) || servings <= 0) { notify("请输入有效份量"); return; }
    dispatch({ type: "menu/add", menu: { id: crypto.randomUUID(), recipeId: recipe.id, servings } });
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
    const inventoryEvent = { id: crypto.randomUUID(), type, ingredientName: String(form.get("ingredientName")).trim(), quantity: Number(form.get("quantity")), unit: normalizeUnit(String(form.get("unit")).trim()), purchaseDate, shelfLifeDays: shelfLifeDays || null, expiresAt, batchId: type === "stock" ? crypto.randomUUID() : null, createdAt: new Date().toISOString() };
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
