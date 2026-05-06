const API_BASE = window.RecipeBookProductForm.API_BASE;
const API_ORIGIN = API_BASE.replace(/\/api\/products\/?$/, "");
window.RECIPE_BOOK_API_ORIGIN = API_ORIGIN;

const PRODUCT_CATEGORIES = [
  { value: "ALL", label: "Все категории" },
  { value: "FROZEN", label: "Замороженный" },
  { value: "MEAT", label: "Мясной" },
  { value: "VEGETABLES", label: "Овощи" },
  { value: "GREENS", label: "Зелень" },
  { value: "SPICES", label: "Специи" },
  { value: "GRAINS", label: "Крупы" },
  { value: "CANNED", label: "Консервы" },
  { value: "LIQUID", label: "Жидкость" },
  { value: "SWEETS", label: "Сладости" },
];

const READINESS_OPTIONS = [
  { value: "ALL", label: "Все варианты" },
  { value: "READY_TO_EAT", label: "Готовый к употреблению" },
  { value: "SEMI_FINISHED", label: "Полуфабрикат" },
  { value: "REQUIRES_COOKING", label: "Требует приготовления" },
];

const SORT_OPTIONS = [
  { value: "name", label: "По названию" },
  { value: "calories", label: "По калорийности" },
  { value: "proteins", label: "По белкам" },
  { value: "fats", label: "По жирам" },
  { value: "carbs", label: "По углеводам" },
];

const FORM_PRODUCT_CATEGORIES = PRODUCT_CATEGORIES.filter(
  (item) => item.value !== "ALL",
);
const FORM_READINESS_OPTIONS = READINESS_OPTIONS.filter(
  (item) => item.value !== "ALL",
);

const state = {
  products: [],
};

const els = {
  productsGrid: document.getElementById("productsGrid"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  readinessFilter: document.getElementById("readinessFilter"),
  sortBy: document.getElementById("sortBy"),
  flagVegan: document.getElementById("flagVegan"),
  flagGlutenFree: document.getElementById("flagGlutenFree"),
  flagSugarFree: document.getElementById("flagSugarFree"),

  openCreateModalBtn: document.getElementById("openCreateModalBtn"),
  deleteModalBackdrop: document.getElementById("productDeleteModalBackdrop"),
  deleteModalTitle: document.getElementById("productDeleteModalTitle"),
  deleteModalText: document.getElementById("productDeleteModalText"),
  deleteModalList: document.getElementById("productDeleteModalList"),
  deleteCancelBtn: document.getElementById("productDeleteCancelBtn"),
  deleteConfirmBtn: document.getElementById("productDeleteConfirmBtn"),
};

let productDeleteConfirmHandler = null;

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

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function fillSelect(select, options) {
  select.innerHTML = "";
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  });
}

function fillSelectWithPlaceholder(select, options, placeholderLabel) {
  select.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholderLabel;
  select.appendChild(ph);
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  });
}

function getFilterFlags() {
  const flags = [];
  if (els.flagVegan.checked) flags.push("VEGAN");
  if (els.flagGlutenFree.checked) flags.push("GLUTEN_FREE");
  if (els.flagSugarFree.checked) flags.push("SUGAR_FREE");
  return flags;
}

function mapFlags(flags = []) {
  const labels = {
    VEGAN: "Веган",
    GLUTEN_FREE: "Без глютена",
    SUGAR_FREE: "Без сахара",
  };
  return flags.map((flag) => labels[flag] || flag);
}

function mapCategory(value) {
  return (
    (PRODUCT_CATEGORIES.find((item) => item.value === value) || {}).label ||
    value
  );
}

function mapReadiness(value) {
  return (
    (READINESS_OPTIONS.find((item) => item.value === value) || {}).label ||
    value
  );
}

async function fetchProducts() {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    throw new Error("Не удалось загрузить продукты");
  }
  state.products = await response.json();
  renderProducts();
}

function closeDeleteModal() {
  els.deleteModalBackdrop.hidden = true;
  productDeleteConfirmHandler = null;
}

function openDeleteModal({ title, text, items = [], canConfirm, onConfirm }) {
  els.deleteModalTitle.textContent = title;
  els.deleteModalText.textContent = text;
  els.deleteModalList.innerHTML = "";

  if (items.length) {
    items.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      els.deleteModalList.appendChild(li);
    });
    els.deleteModalList.hidden = false;
  } else {
    els.deleteModalList.hidden = true;
  }

  if (canConfirm) {
    els.deleteConfirmBtn.hidden = false;
    productDeleteConfirmHandler = onConfirm || null;
  } else {
    els.deleteConfirmBtn.hidden = true;
    productDeleteConfirmHandler = null;
  }

  els.deleteModalBackdrop.hidden = false;
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

async function getDishNamesUsingProduct(productId) {
  try {
    const response = await fetch(`${API_ORIGIN}/api/dishes`);
    if (!response.ok) return [];
    const dishes = await response.json();

    return dishes
      .filter((dish) =>
        (dish.composition || []).some((item) => item.productId === productId),
      )
      .map((dish) => dish.name)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getFilteredProducts() {
  const query = els.searchInput.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const readiness = els.readinessFilter.value;
  const sortBy = els.sortBy.value;
  const requiredFlags = getFilterFlags();

  let items = [...state.products];

  if (query) {
    items = items.filter((item) => item.name.toLowerCase().includes(query));
  }

  if (category !== "ALL") {
    items = items.filter((item) => item.category === category);
  }

  if (readiness !== "ALL") {
    items = items.filter((item) => item.degreeReadiness === readiness);
  }

  if (requiredFlags.length) {
    items = items.filter((item) =>
      requiredFlags.every((flag) =>
        (item.flags || []).includes(flag),
      ),
    );
  }

  items.sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "ru");
    }
    return Number(b[sortBy] || 0) - Number(a[sortBy] || 0);
  });

  return items;
}

function renderProducts() {
  const items = getFilteredProducts();

  if (!items.length) {
    els.productsGrid.innerHTML = `
      <div class="card projects-grid-empty">
        <p class="muted">Ничего не найдено.</p>
      </div>
    `;
    return;
  }

  els.productsGrid.innerHTML = items
    .map(
      (item) => `
    <article class="project-card">
      <div class="project-card-body">
        <h3 class="project-card-title">${item.name}</h3>

        <div class="meta-list">
          <div><strong>Калории:</strong> ${item.calories}</div>
          <div><strong>Б:</strong> ${item.proteins} / <strong>Ж:</strong> ${item.fats} / <strong>У:</strong> ${item.carbs}</div>
          <div><strong>Категория:</strong> ${mapCategory(item.category)}</div>
          <div><strong>Готовность:</strong> ${mapReadiness(item.degreeReadiness)}</div>
        </div>

        <div class="badges">
          ${
            mapFlags(item.flags)
              .map((flag) => `<span class="badge">${flag}</span>`)
              .join("")
          }
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

function viewProduct(product) {
  window.openProductViewModal(product, {
    mapCategory,
    mapReadiness,
    mapFlags,
  });
}

async function deleteProduct(id, productName) {
  const linkedDishNames = await getDishNamesUsingProduct(id);
  if (linkedDishNames.length) {
    openDeleteModal({
      title: "Продукт нельзя удалить",
      text: `Продукт «${productName}» используется в блюдах:`,
      items: linkedDishNames,
      canConfirm: false,
    });
    return;
  }

  openDeleteModal({
    title: "Удаление продукта",
    text: `Удалить продукт «${productName}»?`,
    canConfirm: true,
    onConfirm: async () => {
      try {
        const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });

        if (!response.ok) {
          const linkedAfterFail = await getDishNamesUsingProduct(id);
          if (linkedAfterFail.length) {
            closeDeleteModal();
            openDeleteModal({
              title: "Продукт нельзя удалить",
              text: `Продукт «${productName}» используется в блюдах:`,
              items: linkedAfterFail,
              canConfirm: false,
            });
            return;
          }

          const message = await parseApiError(response, "Ошибка удаления продукта");
          throw new Error(message);
        }

        closeDeleteModal();
        await fetchProducts();
        showToast("Продукт удалён", "success");
      } catch (error) {
        closeDeleteModal();
        showToast(error.message || "Не удалось удалить продукт", "error");
      }
    },
  });
}

function bindDeleteModal() {
  els.deleteCancelBtn.addEventListener("click", closeDeleteModal);
  els.deleteConfirmBtn.addEventListener("click", async () => {
    if (!productDeleteConfirmHandler) return;
    const currentHandler = productDeleteConfirmHandler;
    productDeleteConfirmHandler = null;
    await currentHandler();
  });
}

function bindEvents() {
  bindDeleteModal();
  els.openCreateModalBtn.addEventListener("click", () =>
    window.openCreateProductModal(),
  );

  [
    els.searchInput,
    els.categoryFilter,
    els.readinessFilter,
    els.sortBy,
    els.flagVegan,
    els.flagGlutenFree,
    els.flagSugarFree,
  ].forEach((el) => el.addEventListener("input", renderProducts));

  els.productsGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const product = state.products.find((item) => item.id === id);
    if (!product) return;

    const action = button.dataset.action;

    if (action === "view") viewProduct(product);
    if (action === "edit") window.openEditProductModal(product);
    if (action === "delete") deleteProduct(id, product.name);
  });
}

function init() {
  window.RecipeBookProductForm.init({
    onSaveSuccess: async ({ isEdit, previousProduct, savedProduct } = {}) => {
      if (
        isEdit &&
        window.RecipeBookProductDishFlagSync &&
        savedProduct &&
        previousProduct
      ) {
        const updatedDishes =
          await window.RecipeBookProductDishFlagSync.syncRemovedFlagsForDishes({
            apiOrigin: API_ORIGIN,
            previousProduct,
            savedProduct,
          });
        if (updatedDishes > 0) {
          showToast(`Обновлены теги у блюд: ${updatedDishes}`, "info");
        }
      }
      await fetchProducts();
      showToast(
        isEdit ? "Продукт обновлён" : "Продукт создан",
        "success",
      );
    },
  });

  fillSelect(els.categoryFilter, PRODUCT_CATEGORIES);
  fillSelect(els.readinessFilter, READINESS_OPTIONS);
  fillSelect(els.sortBy, SORT_OPTIONS);
  fillSelectWithPlaceholder(
    document.getElementById("category"),
    FORM_PRODUCT_CATEGORIES,
    "— выберите категорию —",
  );
  fillSelectWithPlaceholder(
    document.getElementById("degreeReadiness"),
    FORM_READINESS_OPTIONS,
    "— выберите готовность —",
  );

  bindEvents();
  fetchProducts().catch((error) => showToast(error.message, "error"));
}

init();
