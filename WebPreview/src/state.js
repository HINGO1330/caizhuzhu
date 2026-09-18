import { canApplyInventoryEvent, inventoryBalances, shoppingItemsFromRecipe } from "./domain.js";

function rebuildMenuShopping(state, menus) {
  const manual = state.shoppingItems.filter((item) => item.source !== "menu");
  const generated = menus.flatMap((menu) => {
    const recipe = state.recipes.find((item) => item.id === menu.recipeId);
    return recipe
      ? shoppingItemsFromRecipe(recipe, menu.servings ?? recipe.servings).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        source: "menu",
        menuId: menu.id,
      }))
      : [];
  });
  return { ...state, todayMenu: menus, shoppingItems: [...manual, ...generated] };
}

export function reduceState(state, action) {
  switch (action.type) {
    case "recipe/save": {
      const exists = state.recipes.some((recipe) => recipe.id === action.recipe.id);
      const next = {
        ...state,
        recipes: exists
          ? state.recipes.map((recipe) => recipe.id === action.recipe.id ? action.recipe : recipe)
          : [action.recipe, ...state.recipes],
      };
      return (next.todayMenu ?? []).some((item) => item.recipeId === action.recipe.id)
        ? rebuildMenuShopping(next, next.todayMenu ?? [])
        : next;
    }
    case "recipe/delete": {
      const next = { ...state, recipes: state.recipes.filter((recipe) => recipe.id !== action.id) };
      return rebuildMenuShopping(next, (state.todayMenu ?? []).filter((item) => item.recipeId !== action.id));
    }
    case "menu/add": {
      const currentMenus = state.todayMenu ?? [];
      const menus = currentMenus.some((item) => item.recipeId === action.menu.recipeId)
        ? currentMenus
        : [action.menu, ...currentMenus];
      return rebuildMenuShopping(state, menus);
    }
    case "menu/remove":
      return rebuildMenuShopping(state, (state.todayMenu ?? []).filter((item) => item.id !== action.id));
    case "draft/add":
      return { ...state, drafts: [action.draft, ...state.drafts] };
    case "draft/remove":
      return { ...state, drafts: state.drafts.filter((draft) => draft.id !== action.id) };
    case "shopping/add-many":
      return { ...state, shoppingItems: [...state.shoppingItems, ...action.items] };
    case "shopping/add":
      return { ...state, shoppingItems: [...state.shoppingItems, action.item] };
    case "shopping/update":
      return {
        ...state,
        shoppingItems: state.shoppingItems.map((item) => item.id === action.item.id ? action.item : item),
      };
    case "shopping/delete":
      return { ...state, shoppingItems: state.shoppingItems.filter((item) => item.id !== action.id) };
    case "inventory/add-event": {
      let event = action.event;
      if (event.type === "consume" && !event.batchId) {
        const candidate = state.inventoryEvents
          .filter((item) => item.type === "stock" && item.ingredientName === event.ingredientName && !item.voided)
          .sort((a, b) => new Date(a.expiresAt ?? "9999-12-31").getTime() - new Date(b.expiresAt ?? "9999-12-31").getTime())[0];
        if (candidate) event = { ...event, batchId: candidate.batchId ?? candidate.id };
      }
      if (!canApplyInventoryEvent(state.inventoryEvents, event)) return state;
      return { ...state, inventoryEvents: [event, ...state.inventoryEvents] };
    }
    case "inventory/delete": {
      const remaining = state.inventoryEvents.filter((event) => event.id !== action.id);
      return inventoryBalances(remaining).some((item) => item.quantity < 0)
        ? state
        : { ...state, inventoryEvents: remaining };
    }
    case "inventory/archive":
      return { ...state, inventoryEvents: state.inventoryEvents.map((event) => event.id === action.id ? { ...event, archived: true } : event) };
    case "inventory/unarchive":
      return { ...state, inventoryEvents: state.inventoryEvents.map((event) => event.id === action.id ? { ...event, archived: false } : event) };
    default:
      return state;
  }
}
