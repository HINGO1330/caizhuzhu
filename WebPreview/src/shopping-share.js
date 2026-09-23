import { inventoryStockPrefills } from "./domain.js";

const singleLine = value => String(value ?? "").replace(/\s+/g, " ").trim();

export function buildShoppingShare(items = []) {
  const pending = items.filter(item => !item.checked).map(item => ({
    ...item, name: singleLine(item.name), unit: singleLine(item.unit),
  }));
  const groups = inventoryStockPrefills(pending);
  if (!groups.length) return { count: 0, text: "" };
  const lines = groups.map(item => {
    const quantity = Number(item.quantity.toPrecision(12));
    return `□ ${item.ingredientName}：${quantity}${item.unit ? ` ${item.unit}` : ""}`;
  });
  return { count: groups.length, text: `菜猪猪 · 待采购清单（${groups.length} 项）\n\n${lines.join("\n")}` };
}

export async function copyShoppingText(text, clipboard) {
  if (!text || !clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
