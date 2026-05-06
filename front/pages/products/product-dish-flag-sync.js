(function () {
  const TRACKED_FLAGS = ["VEGAN", "GLUTEN_FREE", "SUGAR_FREE"];

  function toFlagSet(flags) {
    return new Set((Array.isArray(flags) ? flags : []).map((x) => String(x).trim()));
  }

  function getRemovedFlags(previousFlags, nextFlags) {
    const before = toFlagSet(previousFlags);
    const after = toFlagSet(nextFlags);
    return TRACKED_FLAGS.filter((flag) => before.has(flag) && !after.has(flag));
  }

  function normalizeDishPayload(dish, nextFlags) {
    const composition = Array.isArray(dish.composition)
      ? dish.composition
          .map((item) => ({
            productId: Number(item.productId),
            amount: Number(item.amount),
          }))
          .filter((item) => Number.isFinite(item.productId) && Number.isFinite(item.amount) && item.amount > 0)
      : [];

    return {
      name: String(dish.name ?? "").trim(),
      photos: Array.isArray(dish.photoKeys) ? dish.photoKeys : [],
      calories: dish.calories == null ? null : Number(dish.calories),
      proteins: dish.proteins == null ? null : Number(dish.proteins),
      fats: dish.fats == null ? null : Number(dish.fats),
      carbs: dish.carbs == null ? null : Number(dish.carbs),
      composition,
      portionSize: Number(dish.portionSize),
      category: dish.category,
      flags: nextFlags,
    };
  }

  async function syncRemovedFlagsForDishes({ apiOrigin, previousProduct, savedProduct }) {
    const productId = Number(savedProduct?.id);
    if (!Number.isFinite(productId)) return 0;

    const removedFlags = getRemovedFlags(previousProduct?.flags || [], savedProduct?.flags || []);
    if (!removedFlags.length) return 0;

    const dishesResp = await fetch(`${apiOrigin}/api/dishes`);
    if (!dishesResp.ok) {
      throw new Error("Не удалось загрузить блюда для синхронизации тегов");
    }
    const dishes = await dishesResp.json();
    if (!Array.isArray(dishes) || !dishes.length) return 0;

    let updatedCount = 0;
    for (const dish of dishes) {
      const composition = Array.isArray(dish.composition) ? dish.composition : [];
      const usesProduct = composition.some((item) => Number(item.productId) === productId);
      if (!usesProduct) continue;

      const dishFlags = toFlagSet(dish.flags || []);
      const shouldRemove = removedFlags.some((flag) => dishFlags.has(flag));
      if (!shouldRemove) continue;

      const nextFlags = [...dishFlags].filter((flag) => !removedFlags.includes(flag));
      const payload = normalizeDishPayload(dish, nextFlags);

      const updateResp = await fetch(`${apiOrigin}/api/dishes/${dish.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!updateResp.ok) {
        const text = await updateResp.text().catch(() => "");
        throw new Error(text || "Не удалось обновить теги в связанных блюдах");
      }
      updatedCount += 1;
    }

    return updatedCount;
  }

  window.RecipeBookProductDishFlagSync = { syncRemovedFlagsForDishes };
})();
