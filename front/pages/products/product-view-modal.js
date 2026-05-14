(function () {
  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU");
  }

  function bindOnce() {
    const backdrop = document.getElementById("productViewModalBackdrop");
    const closeBtn = document.getElementById("productViewCloseBtn");
    if (!backdrop || backdrop.dataset.bound === "1") return;
    backdrop.dataset.bound = "1";
    closeBtn.addEventListener("click", () => {
      backdrop.hidden = true;
    });
  }

  function openProductViewModal(product, helpers) {
    bindOnce();
    const backdrop = document.getElementById("productViewModalBackdrop");
    const titleEl = document.getElementById("productViewTitle");
    const bodyEl = document.getElementById("productViewBody");
    if (!backdrop || !titleEl || !bodyEl || !helpers) return;

    const { mapCategory, mapReadiness, mapFlags } = helpers;
    titleEl.textContent = product.name || "Продукт";
    bodyEl.replaceChildren();

    function addRow(label, value) {
      const row = document.createElement("div");
      row.className = "dish-view-row";
      const k = document.createElement("span");
      k.className = "dish-view-label";
      k.textContent = label;
      const v = document.createElement("span");
      v.className = "dish-view-value";
      v.textContent = value;
      row.append(k, v);
      bodyEl.appendChild(row);
    }

    addRow("Калории", String(product.calories ?? ""));
    addRow(
      "БЖУ на 100 г",
      `Белки ${product.proteins ?? ""} · Жиры ${product.fats ?? ""} · Углеводы ${product.carbs ?? ""}`,
    );
    addRow("Категория", mapCategory(product.category));
    addRow("Готовность", mapReadiness(product.degreeReadiness));

    const flags = mapFlags(product.flags || []);
    addRow("Флаги", flags.length ? flags.join(", ") : "не указаны");
    addRow("Состав", product.composition || "не указан");
    const createdAt = formatDateTime(product.createAt || product.createdAt);
    const updatedAt = formatDateTime(product.updateAt || product.updatedAt);
    if (createdAt) addRow("Создано", createdAt);
    if (updatedAt) addRow("Изменено", updatedAt);

    const photos = (product.photos || []).filter(Boolean);
    if (photos.length && window.RecipeBookPhotoTiles) {
      const section = document.createElement("div");
      section.className = "dish-view-composition-wrap";
      const title = document.createElement("h3");
      title.className = "dish-view-section-title";
      title.textContent = "Изображения";
      section.appendChild(title);

      const gallery = document.createElement("div");
      window.RecipeBookPhotoTiles.mount(gallery, photos);
      section.appendChild(gallery);
      bodyEl.appendChild(section);
    }

    backdrop.hidden = false;
  }

  window.openProductViewModal = openProductViewModal;
})();
