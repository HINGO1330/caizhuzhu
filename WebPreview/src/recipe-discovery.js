const normalize = value => String(value ?? "").normalize("NFKC").toLocaleLowerCase();

export function filterRecipeCatalog(recipes, category = "全部", query = "") {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return recipes.filter(recipe => {
    if (category !== "全部" && !(recipe.tags ?? []).includes(category)) return false;
    const text = normalize([recipe.name, ...(recipe.tags ?? []), ...(recipe.ingredients ?? []).map(item => item.name)].join(" "));
    return terms.every(term => text.includes(term));
  });
}

export function pickRecipeSuggestion(recipes, { excludedIds = [], previousId, stockedIds = [], random = Math.random } = {}) {
  const available = recipes.filter(recipe => !excludedIds.includes(recipe.id));
  if (!available.length) return null;
  const different = available.filter(recipe => recipe.id !== previousId);
  const candidates = different.length ? different : available;
  const stocked = candidates.filter(recipe => stockedIds.includes(recipe.id));
  const pool = stocked.length ? stocked : candidates;
  return pool[Math.floor(random() * pool.length)];
}
