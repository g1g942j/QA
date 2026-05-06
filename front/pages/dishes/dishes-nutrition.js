(function () {
  function calculateDishNutritionTotals(composition, resolveProduct) {
    let calories = 0;
    let proteins = 0;
    let fats = 0;
    let carbs = 0;
    for (const item of composition) {
      const product = resolveProduct(item.productId);
      if (!product) continue;
      calories += (Number(product.calories) * item.amount) / 100;
      proteins += (Number(product.proteins) * item.amount) / 100;
      fats += (Number(product.fats) * item.amount) / 100;
      carbs += (Number(product.carbs) * item.amount) / 100;
    }
    return { calories, proteins, fats, carbs };
  }

  function formatNutritionField(value) {
    return value.toFixed(2);
  }

  function create({ elements, getProducts }) {
    function getCompositionFromForm() {
      const rows = [...elements.ingredientsList.querySelectorAll(".ingredient-row")];
      return rows
        .map((row) => ({
          productId: Number(row.querySelector(".ingredient-product").value),
          amount: Number(row.querySelector(".ingredient-amount").value),
        }))
        .filter((item) => item.productId && item.amount > 0);
    }

    function calculateNutrition() {
      const composition = getCompositionFromForm();
      const totals = calculateDishNutritionTotals(composition, (productId) =>
        getProducts().find((p) => p.id === productId),
      );
      elements.dishCalories.value = formatNutritionField(totals.calories);
      elements.dishProteins.value = formatNutritionField(totals.proteins);
      elements.dishFats.value = formatNutritionField(totals.fats);
      elements.dishCarbs.value = formatNutritionField(totals.carbs);
    }

    function validateDishFlagsAvailability() {
      const composition = getCompositionFromForm();
      const products = composition
        .map((item) => getProducts().find((product) => product.id === item.productId))
        .filter(Boolean);
      const allVegan =
        products.length > 0 &&
        products.every((product) => (product.flags || []).includes("VEGAN"));
      const allGlutenFree =
        products.length > 0 &&
        products.every((product) => (product.flags || []).includes("GLUTEN_FREE"));
      const allSugarFree =
        products.length > 0 &&
        products.every((product) => (product.flags || []).includes("SUGAR_FREE"));
      elements.dishFormFlagVegan.disabled = !allVegan;
      elements.dishFormFlagGlutenFree.disabled = !allGlutenFree;
      elements.dishFormFlagSugarFree.disabled = !allSugarFree;
      if (!allVegan) elements.dishFormFlagVegan.checked = false;
      if (!allGlutenFree) elements.dishFormFlagGlutenFree.checked = false;
      if (!allSugarFree) elements.dishFormFlagSugarFree.checked = false;
    }

    function syncNutritionFromComposition() {
      validateDishFlagsAvailability();
      calculateNutrition();
    }

    function addIngredientRow(data = {}, opts = {}) {
      const silent = opts.silent === true;
      const row = document.createElement("div");
      row.className = "ingredient-row";
      row.innerHTML = `
    <div class="field">
      <label class="label">Продукт</label>
      <select class="select ingredient-product"></select>
    </div>
    <div class="field">
      <label class="label">Количество (г)</label>
      <input class="input ingredient-amount" type="number" min="0.01" step="0.01" value="${data.amount ?? ""}" />
    </div>
    <div class="field">
      <button class="btn small danger remove-ingredient-btn" type="button">Удалить</button>
    </div>
  `;
      const select = row.querySelector(".ingredient-product");
      const optEmpty = document.createElement("option");
      optEmpty.value = "";
      optEmpty.textContent = "— выберите продукт —";
      select.appendChild(optEmpty);
      getProducts().forEach((product) => {
        const option = document.createElement("option");
        option.value = String(product.id);
        option.textContent = product.name;
        select.appendChild(option);
      });
      select.value = data.productId ? String(data.productId) : "";
      row.querySelector(".remove-ingredient-btn").addEventListener("click", () => {
        row.remove();
        syncNutritionFromComposition();
      });
      row
        .querySelector(".ingredient-product")
        .addEventListener("change", syncNutritionFromComposition);
      row
        .querySelector(".ingredient-amount")
        .addEventListener("input", syncNutritionFromComposition);
      elements.ingredientsList.appendChild(row);
      if (!silent) syncNutritionFromComposition();
    }

    function readDishFlagsFromForm() {
      const flags = [];
      if (elements.dishFormFlagVegan.checked && !elements.dishFormFlagVegan.disabled)
        flags.push("VEGAN");
      if (
        elements.dishFormFlagGlutenFree.checked &&
        !elements.dishFormFlagGlutenFree.disabled
      )
        flags.push("GLUTEN_FREE");
      if (
        elements.dishFormFlagSugarFree.checked &&
        !elements.dishFormFlagSugarFree.disabled
      )
        flags.push("SUGAR_FREE");
      return flags;
    }

    return {
      addIngredientRow,
      getCompositionFromForm,
      calculateNutrition,
      validateDishFlagsAvailability,
      readDishFlagsFromForm,
      syncNutritionFromComposition,
    };
  }

  window.RecipeBookDishNutrition = { create };
})();
