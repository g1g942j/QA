(function () {
  function validateComposition(composition, resolveProduct) {
    if (!Array.isArray(composition) || composition.length === 0) {
      throw new Error("Состав блюда не может быть пустым.");
    }

    for (const item of composition) {
      const amount = Number(item.amount);
      if (!(amount > 0)) {
        throw new Error("Количество ингредиента должно быть больше 0.");
      }

      const product = resolveProduct(item.productId);
      if (!product) {
        throw new Error(`Ингредиент с id=${item.productId} не найден.`);
      }
    }
  }

  function calculateDishNutritionTotals(composition, resolveProduct) {
    validateComposition(composition, resolveProduct);
    let calories = 0;
    let proteins = 0;
    let fats = 0;
    let carbs = 0;
    for (const item of composition) {
      const amount = Number(item.amount);
      const product = resolveProduct(item.productId);
      calories += (Number(product.calories) * amount) / 100;
      proteins += (Number(product.proteins) * amount) / 100;
      fats += (Number(product.fats) * amount) / 100;
      carbs += (Number(product.carbs) * amount) / 100;
    }
    return { calories, proteins, fats, carbs };
  }

  function formatNutritionField(value) {
    return value.toFixed(2);
  }

  function calculateCompositionTotalAmount(composition) {
    return composition.reduce((total, item) => total + Number(item.amount || 0), 0);
  }

  const nutritionTestApi = {
    calculateDishNutritionTotals,
    formatNutritionField,
  };

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
      if (!composition.length) {
        elements.dishCalories.value = "";
        elements.dishProteins.value = "";
        elements.dishFats.value = "";
        elements.dishCarbs.value = "";
        return;
      }
      const totals = calculateDishNutritionTotals(composition, (productId) =>
        getProducts().find((p) => p.id === productId),
      );
      elements.dishCalories.value = formatNutritionField(totals.calories);
      elements.dishProteins.value = formatNutritionField(totals.proteins);
      elements.dishFats.value = formatNutritionField(totals.fats);
      elements.dishCarbs.value = formatNutritionField(totals.carbs);
    }

    function syncPortionSizeFromComposition() {
      if (!elements.portionSize) return;
      const composition = getCompositionFromForm();
      const totalAmount = calculateCompositionTotalAmount(composition);
      const formattedTotal = totalAmount ? formatNutritionField(totalAmount) : "";
<<<<<<< HEAD
=======
      elements.portionSize.min = totalAmount > 0 ? formattedTotal : "0.01";
>>>>>>> 494dcc6d0d78bb5d1a20a05c35b3edff0526f0c9

      const currentValue = Number(elements.portionSize.value);
      const hasCurrentValue = Number.isFinite(currentValue) && elements.portionSize.value !== "";

<<<<<<< HEAD
      if (!hasCurrentValue) {
=======
      if (!hasCurrentValue || currentValue < totalAmount) {
>>>>>>> 494dcc6d0d78bb5d1a20a05c35b3edff0526f0c9
        elements.portionSize.value = formattedTotal;
      }
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
      syncPortionSizeFromComposition();
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
      syncPortionSizeFromComposition,
      validateDishFlagsAvailability,
      readDishFlagsFromForm,
      syncNutritionFromComposition,
    };
  }

  if (typeof window !== "undefined") {
    window.RecipeBookDishNutrition = { create };
    window.RecipeBookDishNutritionTestApi = nutritionTestApi;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = nutritionTestApi;
  }
})();
