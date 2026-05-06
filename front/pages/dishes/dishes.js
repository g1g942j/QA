const API_ORIGIN = (() => {
  const configured = String(window.RECIPE_BOOK_API_ORIGIN || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (window.location.protocol === "file:") return "http://localhost:8080";
  return window.location.origin.replace(/\/+$/, "");
})();

const DISHES_API = `${API_ORIGIN}/api/dishes`;
const PRODUCTS_API = `${API_ORIGIN}/api/products`;
window.RECIPE_BOOK_API_ORIGIN = API_ORIGIN;

const DISH_CATEGORIES = [
  { value: "ALL", label: "Все категории" },
  { value: "DESSERT", label: "Десерт" },
  { value: "FIRST", label: "Первое" },
  { value: "SECOND", label: "Второе" },
  { value: "DRINK", label: "Напиток" },
  { value: "SALAD", label: "Салат" },
  { value: "SOUP", label: "Суп" },
  { value: "SNACK", label: "Перекус" },
];

const FORM_DISH_CATEGORIES = DISH_CATEGORIES.filter(
  (item) => item.value !== "ALL",
);

const dishState = {
  dishes: [],
  products: [],
  editingId: null,
};

const formPhotoState = {
  keys: [],
  sessionUploaded: new Set(),
  previewBlobUrls: new Map(),
};

function recipeBookApiOrigin() {
  return (
    window.RECIPE_BOOK_API_ORIGIN ||
    DISHES_API.replace(/\/api\/dishes\/?$/, "")
  );
}


const dEls = {
  dishesGrid: document.getElementById("dishesGrid"),
  dishSearchInput: document.getElementById("dishSearchInput"),
  dishCategoryFilter: document.getElementById("dishCategoryFilter"),
  dishFlagVegan: document.getElementById("dishFlagVegan"),
  dishFlagGlutenFree: document.getElementById("dishFlagGlutenFree"),
  dishFlagSugarFree: document.getElementById("dishFlagSugarFree"),

  dishModalBackdrop: document.getElementById("dishModalBackdrop"),
  dishModalTitle: document.getElementById("dishModalTitle"),
  openCreateDishModalBtn: document.getElementById("openCreateDishModalBtn"),
  cancelDishModalBtn: document.getElementById("cancelDishModalBtn"),
  saveDishBtn: document.getElementById("saveDishBtn"),
  dishForm: document.getElementById("dishForm"),
  dishFormError: document.getElementById("dishFormError"),

  dishId: document.getElementById("dishId"),
  dishName: document.getElementById("dishName"),
  dishPhotoFileInput: document.getElementById("dishPhotoFileInput"),
  dishPhotoList: document.getElementById("dishPhotoList"),
  ingredientsList: document.getElementById("ingredientsList"),
  addIngredientBtn: document.getElementById("addIngredientBtn"),
  portionSize: document.getElementById("portionSize"),
  dishCalories: document.getElementById("dishCalories"),
  dishProteins: document.getElementById("dishProteins"),
  dishFats: document.getElementById("dishFats"),
  dishCarbs: document.getElementById("dishCarbs"),
  dishCategory: document.getElementById("dishCategory"),
  dishFormFlagVegan: document.getElementById("dishFormFlagVegan"),
  dishFormFlagGlutenFree: document.getElementById("dishFormFlagGlutenFree"),
  dishFormFlagSugarFree: document.getElementById("dishFormFlagSugarFree"),
  deleteModalBackdrop: document.getElementById("dishDeleteModalBackdrop"),
  deleteModalTitle: document.getElementById("dishDeleteModalTitle"),
  deleteModalText: document.getElementById("dishDeleteModalText"),
  deleteCancelBtn: document.getElementById("dishDeleteCancelBtn"),
  deleteConfirmBtn: document.getElementById("dishDeleteConfirmBtn"),
};

const dishPhotos = window.RecipeBookDishPhotos.create({
  state: formPhotoState,
  elements: dEls,
  getApiOrigin: recipeBookApiOrigin,
  showToast,
});

const dishNutrition = window.RecipeBookDishNutrition.create({
  elements: dEls,
  getProducts: () => dishState.products,
});

let dishDeleteConfirmHandler = null;

function showToast(message, type = "info") {
  const root = document.getElementById("toastRoot");
  if (!root) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__text">${message}</div>
    <button class="toast__close" type="button">✕</button>
  `;
  toast
    .querySelector(".toast__close")
    .addEventListener("click", () => toast.remove());
  root.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

function fillSelect(select, options) {
  select.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    select.appendChild(item);
  });
}

function fillSelectWithPlaceholder(select, options, placeholderLabel) {
  select.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholderLabel;
  select.appendChild(ph);
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    select.appendChild(item);
  });
}

function mapDishCategory(value) {
  return (
    (DISH_CATEGORIES.find((item) => item.value === value) || {}).label || value
  );
}

function mapFlags(flags = []) {
  const labels = {
    VEGAN: "Веган",
    GLUTEN_FREE: "Без глютена",
    SUGAR_FREE: "Без сахара",
  };
  return flags.map((flag) => labels[flag] || flag);
}

function getDishFilterFlags() {
  const flags = [];
  if (dEls.dishFlagVegan.checked) flags.push("VEGAN");
  if (dEls.dishFlagGlutenFree.checked) flags.push("GLUTEN_FREE");
  if (dEls.dishFlagSugarFree.checked) flags.push("SUGAR_FREE");
  return flags;
}

function extractCategoryFromMacro(name) {
  const macros = [
    { macro: "!десерт", category: "DESSERT" },
    { macro: "!первое", category: "FIRST" },
    { macro: "!второе", category: "SECOND" },
    { macro: "!напиток", category: "DRINK" },
    { macro: "!салат", category: "SALAD" },
    { macro: "!суп", category: "SOUP" },
    { macro: "!перекус", category: "SNACK" },
  ];

  const lower = name.toLowerCase();
  let bestCategory = null;
  let bestIndex = Infinity;

  for (const item of macros) {
    const idx = lower.indexOf(item.macro);
    if (idx !== -1 && idx < bestIndex) {
      bestIndex = idx;
      bestCategory = item.category;
    }
  }

  return bestCategory;
}

function stripMacrosFromName(name) {
  return name
    .replace(/!десерт/gi, "")
    .replace(/!первое/gi, "")
    .replace(/!второе/gi, "")
    .replace(/!напиток/gi, "")
    .replace(/!салат/gi, "")
    .replace(/!суп/gi, "")
    .replace(/!перекус/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function openDishModal(dish = null) {
  dishPhotos.revokeAllBlobPreviews();
  dishState.editingId = dish ? dish.id : null;
  dEls.dishModalTitle.textContent = dish
    ? "Редактировать блюдо"
    : "Новое блюдо";
  dEls.dishFormError.textContent = "";
  dEls.dishForm.reset();
  dEls.ingredientsList.innerHTML = "";

  dEls.dishId.value = dish?.id ?? "";
  dEls.dishName.value = dish?.name ?? "";
  const keysFromUrls = dishPhotos.storageKeysFromPhotoUrls(dish?.photos || []);
  const pk = dish?.photoKeys ?? dish?.photo_keys;
  formPhotoState.keys = [...(pk?.length ? pk : keysFromUrls)];
  formPhotoState.sessionUploaded.clear();
  if (dEls.dishPhotoFileInput) dEls.dishPhotoFileInput.value = "";
  dishPhotos.renderDishPhotoChips();
  dEls.portionSize.value = dish?.portionSize ?? "";
  dEls.dishCalories.value = dish?.calories ?? "";
  dEls.dishProteins.value = dish?.proteins ?? "";
  dEls.dishFats.value = dish?.fats ?? "";
  dEls.dishCarbs.value = dish?.carbs ?? "";
  dEls.dishCategory.value = dish?.category ?? "";

  if (dish?.composition?.length) {
    dish.composition.forEach((item) => {
      dishNutrition.addIngredientRow(
        {
          productId: item.productId,
          amount: item.amount,
        },
        { silent: true },
      );
    });
  } else {
    dishNutrition.addIngredientRow({}, { silent: true });
  }

  const flags = dish?.flags || [];
  dEls.dishFormFlagVegan.checked = flags.includes("VEGAN");
  dEls.dishFormFlagGlutenFree.checked = flags.includes("GLUTEN_FREE");
  dEls.dishFormFlagSugarFree.checked = flags.includes("SUGAR_FREE");

  dishNutrition.validateDishFlagsAvailability();
  if (!dish) {
    dishNutrition.calculateNutrition();
  }
  dEls.dishModalBackdrop.hidden = false;
}

async function closeDishModal(options = {}) {
  const discardPending = options.discardPendingUploads !== false;
  if (discardPending) {
    await dishPhotos.discardSessionUploadedPhotos();
  } else {
    formPhotoState.sessionUploaded.clear();
  }

  dishPhotos.revokeAllBlobPreviews();

  dEls.dishModalBackdrop.hidden = true;
  dEls.dishForm.reset();
  dEls.ingredientsList.innerHTML = "";
  dishState.editingId = null;
  dEls.dishFormError.textContent = "";
  formPhotoState.keys = [];
  if (dEls.dishPhotoFileInput) dEls.dishPhotoFileInput.value = "";
  if (dEls.dishPhotoList) dEls.dishPhotoList.replaceChildren();
}

async function fetchAll() {
  const [dishesResponse, productsResponse] = await Promise.all([
    fetch(DISHES_API),
    fetch(PRODUCTS_API),
  ]);

  if (!dishesResponse.ok) throw new Error("Не удалось загрузить блюда");
  if (!productsResponse.ok) throw new Error("Не удалось загрузить продукты");

  dishState.dishes = await dishesResponse.json();
  dishState.products = await productsResponse.json();

  renderDishes();
}

function getFilteredDishes() {
  const query = dEls.dishSearchInput.value.trim().toLowerCase();
  const category = dEls.dishCategoryFilter.value;
  const requiredFlags = getDishFilterFlags();

  let items = [...dishState.dishes];

  if (query) {
    items = items.filter((item) => item.name.toLowerCase().includes(query));
  }

  if (category !== "ALL") {
    items = items.filter((item) => item.category === category);
  }

  if (requiredFlags.length) {
    items = items.filter((item) =>
      requiredFlags.every((flag) => (item.flags || []).includes(flag)),
    );
  }

  items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return items;
}

function renderDishes() {
  const items = getFilteredDishes();

  if (!items.length) {
    dEls.dishesGrid.innerHTML = `
      <div class="card projects-grid-empty">
        <p class="muted">Блюда не найдены.</p>
      </div>
    `;
    return;
  }

  dEls.dishesGrid.innerHTML = items
    .map(
      (item) => `
    <article class="project-card">
      <div class="project-card-body">
        <h3 class="project-card-title">${item.name}</h3>

        <div class="meta-list">
          <div><strong>Категория:</strong> ${mapDishCategory(item.category)}</div>
          <div><strong>Порция:</strong> ${item.portionSize} г</div>
          <div><strong>Калории:</strong> ${item.calories}</div>
          <div><strong>Б:</strong> ${item.proteins} / <strong>Ж:</strong> ${item.fats} / <strong>У:</strong> ${item.carbs}</div>
          <div><strong>Ингредиентов:</strong> ${(item.composition || []).length}</div>
        </div>

        <div class="badges">
          ${mapFlags(item.flags)
            .map((flag) => `<span class="badge">${flag}</span>`)
            .join("")}
        </div>

        <div class="project-card-actions">
          <button class="btn small" type="button" data-action="view" data-id="${item.id}">Подробнее</button>
          <button class="btn small" type="button" data-action="edit" data-id="${item.id}">Редактировать</button>
          <button class="btn small danger" type="button" data-action="delete" data-id="${item.id}">Удалить</button>
        </div>
      </div>
    </article>
  `,
    )
    .join("");
}

async function persistDish() {
  dEls.dishFormError.textContent = "";

  const composition = dishNutrition.getCompositionFromForm();
  if (!composition.length) {
    dEls.dishFormError.textContent = "Добавь хотя бы один продукт в состав.";
    return;
  }

  const rawName = dEls.dishName.value.trim();
  const macroCategory = extractCategoryFromMacro(rawName);
  const cleanedName = stripMacrosFromName(rawName);
  const categoryFromSelect = dEls.dishCategory.value;
  const resolvedCategory = categoryFromSelect || macroCategory || null;

  if (!resolvedCategory) {
    dEls.dishFormError.textContent =
      "Выберите категорию или укажите макрос в названии (!десерт, !первое, !второе, !напиток, !салат, !суп, !перекус).";
    return;
  }

  const portionSize = Number(dEls.portionSize.value);
  if (!(portionSize > 0)) {
    dEls.dishFormError.textContent = "Размер порции должен быть больше 0.";
    return;
  }

  const uploadedKeys = [...formPhotoState.keys];
  const payload = {
    name: cleanedName,
    photos: uploadedKeys,
    calories: dEls.dishCalories.value ? Number(dEls.dishCalories.value) : null,
    proteins: dEls.dishProteins.value ? Number(dEls.dishProteins.value) : null,
    fats: dEls.dishFats.value ? Number(dEls.dishFats.value) : null,
    carbs: dEls.dishCarbs.value ? Number(dEls.dishCarbs.value) : null,
    composition,
    portionSize,
    category: resolvedCategory,
    flags: dishNutrition.readDishFlagsFromForm(),
  };

  const isEdit = Boolean(dishState.editingId);
  const url = isEdit ? `${DISHES_API}/${dishState.editingId}` : DISHES_API;
  const method = isEdit ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Ошибка сохранения блюда");
    }

    await closeDishModal({ discardPendingUploads: false });
    await fetchAll();
    showToast(isEdit ? "Блюдо обновлено" : "Блюдо создано", "success");
  } catch (error) {
    dEls.dishFormError.textContent = error.message || "Ошибка сохранения";
  }
}

async function deleteDish(id) {
  const dish = dishState.dishes.find((item) => item.id === id);
  if (!dish) return;

  openDishDeleteModal({
    title: "Удаление блюда",
    text: `Удалить блюдо «${dish.name}»?`,
    onConfirm: async () => {
      try {
        const response = await fetch(`${DISHES_API}/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const message = await parseApiError(
            response,
            "Ошибка удаления блюда",
          );
          throw new Error(message);
        }

        closeDishDeleteModal();
        await fetchAll();
        showToast("Блюдо удалено", "success");
      } catch (error) {
        closeDishDeleteModal();
        showToast(error.message || "Не удалось удалить блюдо", "error");
      }
    },
  });
}

function closeDishDeleteModal() {
  dEls.deleteModalBackdrop.hidden = true;
  dishDeleteConfirmHandler = null;
}

function openDishDeleteModal({ title, text, onConfirm }) {
  dEls.deleteModalTitle.textContent = title;
  dEls.deleteModalText.textContent = text;
  dishDeleteConfirmHandler = onConfirm || null;
  dEls.deleteModalBackdrop.hidden = false;
}

async function parseApiError(response, fallback) {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return fallback;
  }
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {}

  return text;
}

function bindDishEvents() {
  dEls.deleteCancelBtn.addEventListener("click", closeDishDeleteModal);
  dEls.deleteConfirmBtn.addEventListener("click", async () => {
    if (!dishDeleteConfirmHandler) return;
    const currentHandler = dishDeleteConfirmHandler;
    dishDeleteConfirmHandler = null;
    await currentHandler();
  });

  dEls.openCreateDishModalBtn.addEventListener("click", () => openDishModal());
  dEls.cancelDishModalBtn.addEventListener("click", () =>
    closeDishModal().catch(() => {}),
  );

  dishPhotos.bindPhotoListGuards();
  dishPhotos.bindUploadInput();

  dEls.addIngredientBtn.addEventListener("click", () =>
    dishNutrition.addIngredientRow(),
  );

  dEls.dishForm.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  if (dEls.saveDishBtn) {
    dEls.saveDishBtn.addEventListener("click", () => void persistDish());
  }

  [
    dEls.dishSearchInput,
    dEls.dishCategoryFilter,
    dEls.dishFlagVegan,
    dEls.dishFlagGlutenFree,
    dEls.dishFlagSugarFree,
  ].forEach((el) => el.addEventListener("input", renderDishes));

  dEls.dishesGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const dish = dishState.dishes.find((item) => item.id === id);
    if (!dish) return;

    const action = button.dataset.action;

    if (action === "view")
      window.openDishViewModal(dish, {
        mapDishCategory,
        mapFlags,
      });
    if (action === "edit") openDishModal(dish);
    if (action === "delete") deleteDish(id);
  });
}

function initDishes() {
  fillSelect(dEls.dishCategoryFilter, DISH_CATEGORIES);
  fillSelectWithPlaceholder(
    dEls.dishCategory,
    FORM_DISH_CATEGORIES,
    "— выберите категорию —",
  );
  bindDishEvents();
  fetchAll().catch((error) => showToast(error.message, "error"));
}

initDishes();
