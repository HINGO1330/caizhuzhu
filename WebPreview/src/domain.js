function text(value) {
  return String(value ?? "").trim();
}

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function keyFor(name, unit) {
  return `${text(name).toLocaleLowerCase("zh-CN")}\u0000${normalizeUnit(unit)}`;
}

export function normalizeUnit(unit) {
  const value = text(unit).toLocaleLowerCase("zh-CN");
  return ({ 颗: "个", 枚: "个", 只: "个", 粒: "个", g: "克", kg: "千克", ml: "毫升", l: "升" })[value] ?? value;
}

export function validateRecipe(recipe) {
  const name = text(recipe?.name);
  if (!name) throw new Error("菜谱名称不能为空");
  const servings = positiveNumber(recipe?.servings);
  if (!servings) throw new Error("份量必须大于零");
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];
  for (const ingredient of ingredients) {
    if (!text(ingredient.name) || !positiveNumber(ingredient.quantity)) {
      throw new Error("食材名称和数量必须有效");
    }
  }
  if (steps.some((step) => !text(step.text))) throw new Error("步骤内容不能为空");
  return {
    ...recipe,
    name,
    summary: text(recipe.summary),
    servings,
    durationMinutes: positiveNumber(recipe.durationMinutes, null),
    ingredients: ingredients.map((item) => ({
      ...item,
      name: text(item.name),
      quantity: Number(item.quantity),
      unit: text(item.unit),
    })),
    steps: steps.map((step) => ({ ...step, text: text(step.text) })),
    tags: Array.isArray(recipe.tags) ? recipe.tags.map(text).filter(Boolean) : [],
    imageKeys: Array.isArray(recipe.imageKeys) ? recipe.imageKeys : [],
  };
}

export function confirmDraft(draft, confirmed) {
  if (!confirmed || draft?.status !== "pending") throw new Error("必须人工确认后才能保存");
  return {
    ...validateRecipe(draft.recipe),
    id: draft.recipe.id || crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
}

export function shoppingItemsFromRecipe(recipe, desiredServings = recipe.servings) {
  const valid = validateRecipe(recipe);
  const target = positiveNumber(desiredServings);
  if (!target) throw new Error("目标份量必须大于零");
  const totals = new Map();
  for (const ingredient of valid.ingredients) {
    const key = keyFor(ingredient.name, ingredient.unit);
    const current = totals.get(key) ?? {
      name: ingredient.name,
      quantity: 0,
      unit: normalizeUnit(ingredient.unit),
      checked: false,
    };
    current.quantity += ingredient.quantity * target / valid.servings;
    totals.set(key, current);
  }
  return [...totals.values()].map((item) => ({ ...item, quantity: Math.ceil(item.quantity) }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function splitRecipeSteps(value) {
  return text(value)
    .replace(/\s*(?:\d+\s*[.)、]|步骤\s*\d+\s*[:：])\s*/g, "\n")
    .split(/[\n；;。]+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export function shoppingItemsFromMenus(recipes, menus) {
  const totals = new Map();
  for (const menu of menus ?? []) {
    const recipe = (recipes ?? []).find((item) => item.id === menu.recipeId);
    if (!recipe) continue;
    for (const item of shoppingItemsFromRecipe(recipe, menu.servings ?? recipe.servings)) {
      const key = keyFor(item.name, item.unit);
      const current = totals.get(key) ?? { name: item.name, quantity: 0, unit: normalizeUnit(item.unit), checked: false };
      current.quantity += item.quantity;
      totals.set(key, current);
    }
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function inventoryBalances(events) {
  const totals = new Map();
  for (const event of events ?? []) {
    if (event.voided) continue;
    const name = text(event.ingredientName);
    const unit = text(event.unit);
    if (!name || !Number.isFinite(Number(event.quantity))) continue;
    const key = keyFor(name, unit);
    const current = totals.get(key) ?? { ingredientName: name, unit, quantity: 0 };
    const quantity = Number(event.quantity);
    const delta = event.type === "consume"
      ? -Math.abs(quantity)
      : event.type === "stock"
        ? Math.abs(quantity)
        : quantity;
    current.quantity += delta;
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, "zh-CN"));
}

export function inventoryEventDelta(event) {
  const quantity = Number(event.quantity);
  if (!Number.isFinite(quantity)) return 0;
  return event.type === "consume" ? -Math.abs(quantity) : event.type === "stock" ? Math.abs(quantity) : quantity;
}

export function inventoryCountdown(expiresAt, now = new Date()) {
  if (!expiresAt) return null;
  const remaining = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86400000);
  return remaining < 0 ? "已过期" : `剩余 ${remaining} 天`;
}

export function inventoryStockPrefill(items) {
  const validItems = (items ?? []).filter((item) => text(item.name));
  if (!validItems.length) return null;
  return {
    ingredientName: validItems[0].name,
    quantity: validItems.reduce((total, item) => total + Number(item.quantity || 0), 0),
    unit: normalizeUnit(validItems[0].unit),
    shoppingItemIds: validItems.map((item) => item.id),
  };
}

export function inventoryRecentEvents(events, limit = 5) {
  return (events ?? []).filter((event) => !event.archived).slice(0, limit);
}

export function canApplyInventoryEvent(events, event) {
  const delta = inventoryEventDelta(event);
  if (delta >= 0) return true;
  const balance = inventoryBalances(events).find((item) => keyFor(item.ingredientName, item.unit) === keyFor(event.ingredientName, event.unit));
  return (balance?.quantity ?? 0) + delta >= 0;
}

export function recipePreview(recipes, limit = 4) {
  const visible = (recipes ?? []).slice(0, limit);
  return { recipes: visible, hasMore: (recipes?.length ?? 0) > visible.length };
}
