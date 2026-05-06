(function () {
  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU");
  }

  function bindOnce() {
    const backdrop = document.getElementById("dishViewModalBackdrop");
    const closeBtn = document.getElementById("dishViewCloseBtn");
    if (!backdrop || backdrop.dataset.bound === "1") return;
    backdrop.dataset.bound = "1";

    function close() {
      backdrop.hidden = true;
    }

    closeBtn.addEventListener("click", close);
  }

  function resolvedPhotoGalleryUrls(dish) {
    const fromApi = [...(dish.photos || [])].filter(Boolean);
    if (fromApi.length) return fromApi;
    const origin = String(window.RECIPE_BOOK_API_ORIGIN || "")
      .trim()
      .replace(/\/+$/, "");
    const base = origin || "http://localhost:8080";
    const keys = dish.photoKeys || dish.photo_keys || [];
    if (!Array.isArray(keys) || !keys.length) return [];
    return keys.map(
      (k) =>
        `${base}/api/dish-photos/${encodeURIComponent(String(k).trim())}`,
    );
  }

  function openDishViewModal(dish, helpers) {
    bindOnce();
    const backdrop = document.getElementById("dishViewModalBackdrop");
    const titleEl = document.getElementById("dishViewTitle");
    const bodyEl = document.getElementById("dishViewBody");
    if (!backdrop || !titleEl || !bodyEl || !helpers) return;

    const { mapDishCategory, mapFlags } = helpers;

    titleEl.textContent = dish.name || "Блюдо";

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

    addRow("Категория", mapDishCategory(dish.category));
    addRow("Порция", `${dish.portionSize} г`);
    addRow("Калории", String(dish.calories ?? ""));
    addRow(
      "БЖУ на порцию",
      `Белки ${dish.proteins ?? ""} · Жиры ${dish.fats ?? ""} · Углеводы ${dish.carbs ?? ""}`,
    );

    const flagLabels = mapFlags(dish.flags || []);
    addRow(
      "Флаги",
      flagLabels.length ? flagLabels.join(", ") : "нет",
    );
    const createdAt = formatDateTime(dish.createAt || dish.createdAt);
    const updatedAt = formatDateTime(dish.updateAt || dish.updatedAt);
    if (createdAt) addRow("Создано", createdAt);
    if (updatedAt) addRow("Изменено", updatedAt);

    const compSection = document.createElement("div");
    compSection.className = "dish-view-composition-wrap";
    const compTitle = document.createElement("h3");
    compTitle.className = "dish-view-section-title";
    compTitle.textContent = "Состав";
    compSection.appendChild(compTitle);

    const list =
      dish.composition && dish.composition.length
        ? dish.composition
        : [];
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "muted dish-view-empty";
      p.textContent = "Не указан.";
      compSection.appendChild(p);
    } else {
      const ul = document.createElement("ul");
      ul.className = "dish-view-composition";
      list.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.productName ?? "?"} · ${item.amount} г`;
        ul.appendChild(li);
      });
      compSection.appendChild(ul);
    }

    bodyEl.appendChild(compSection);

    const photos = resolvedPhotoGalleryUrls(dish).filter(Boolean);
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

  window.openDishViewModal = openDishViewModal;
})();
