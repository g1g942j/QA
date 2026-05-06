(function () {
  const API_BASE = "http://localhost:8080/api/products";

  let editingId = null;
  let editingOriginalProduct = null;
  let callbacks = { onSaveSuccess: null };

  const formPhotoState = {
    keys: [],
    sessionUploaded: new Set(),
    previewBlobUrls: new Map(),
  };

  function recipeBookOrigin() {
    return API_BASE.replace(/\/api\/products\/?$/, "");
  }

  function revokeAllBlobPreviews() {
    formPhotoState.previewBlobUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    });
    formPhotoState.previewBlobUrls.clear();
  }

  function storageKeysFromPhotoUrls(urls = []) {
    return urls
      .map((url) => {
        const s = String(url);
        const m = s.match(/\/api\/(?:dish|product)-photos\/([^/?#]+)/i);
        return m ? decodeURIComponent(m[1]) : "";
      })
      .filter(Boolean);
  }

  async function discardSessionUploadedPhotos() {
    const origin = recipeBookOrigin();
    const keys = [...formPhotoState.sessionUploaded];
    formPhotoState.sessionUploaded.clear();
    await Promise.all(
      keys.map((key) =>
        fetch(`${origin}/api/product-photos/${encodeURIComponent(key)}`, {
          method: "DELETE",
        }).catch(() => {}),
      ),
    );
  }

  function productPhotoThumbUrl(storageKey) {
    return `${recipeBookOrigin()}/api/product-photos/${encodeURIComponent(storageKey)}`;
  }

  function renderProductPhotoChips() {
    const list = document.getElementById("productPhotoList");
    if (!list) return;
    list.replaceChildren();

    formPhotoState.keys.forEach((key) => {
      const chip = document.createElement("div");
      chip.className = "dish-photo-chip";

      const thumb = document.createElement("img");
      thumb.alt = "";
      thumb.loading = "lazy";
      thumb.decoding = "async";
      thumb.draggable = false;
      thumb.src =
        formPhotoState.previewBlobUrls.get(key) ?? productPhotoThumbUrl(key);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn small danger";
      removeBtn.textContent = "Убрать";
      removeBtn.addEventListener("click", () => void removeProductPhotoKey(key));

      chip.append(thumb, removeBtn);
      list.appendChild(chip);
    });
  }

  async function removeProductPhotoKey(key) {
    const blobUrl = formPhotoState.previewBlobUrls.get(key);
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
      formPhotoState.previewBlobUrls.delete(key);
    }

    formPhotoState.keys = formPhotoState.keys.filter((k) => k !== key);
    if (formPhotoState.sessionUploaded.delete(key)) {
      const origin = recipeBookOrigin();
      try {
        await fetch(`${origin}/api/product-photos/${encodeURIComponent(key)}`, {
          method: "DELETE",
        });
      } catch {}
    }
    renderProductPhotoChips();
  }

  function getEls() {
    return {
      modalBackdrop: document.getElementById("productModalBackdrop"),
      modalTitle: document.getElementById("productModalTitle"),
      cancelProductModalBtn: document.getElementById("cancelProductModalBtn"),
      productForm: document.getElementById("productForm"),
      productFormError: document.getElementById("productFormError"),
      productId: document.getElementById("productId"),
      name: document.getElementById("name"),
      productPhotoFileInput: document.getElementById("productPhotoFileInput"),
      productPhotoList: document.getElementById("productPhotoList"),
      calories: document.getElementById("calories"),
      proteins: document.getElementById("proteins"),
      fats: document.getElementById("fats"),
      carbs: document.getElementById("carbs"),
      composition: document.getElementById("composition"),
      category: document.getElementById("category"),
      degreeReadiness: document.getElementById("degreeReadiness"),
      formFlagVegan: document.getElementById("formFlagVegan"),
      formFlagGlutenFree: document.getElementById("formFlagGlutenFree"),
      formFlagSugarFree: document.getElementById("formFlagSugarFree"),
    };
  }

  function readFlagsFromForm(els) {
    const flags = [];
    if (els.formFlagVegan.checked) flags.push("VEGAN");
    if (els.formFlagGlutenFree.checked) flags.push("GLUTEN_FREE");
    if (els.formFlagSugarFree.checked) flags.push("SUGAR_FREE");
    return flags;
  }

  function validateBju(els) {
    const proteins = Number(els.proteins.value || 0);
    const fats = Number(els.fats.value || 0);
    const carbs = Number(els.carbs.value || 0);
    if (proteins + fats + carbs > 100) {
      els.productFormError.textContent =
        "Сумма БЖУ не может превышать 100.";
      return false;
    }
    els.productFormError.textContent = "";
    return true;
  }

  function validateSelects(els) {
    if (!els.category.value) {
      els.productFormError.textContent =
        "Выберите категорию.";
      return false;
    }
    if (!els.degreeReadiness.value) {
      els.productFormError.textContent =
        "Выберите необходимость готовки.";
      return false;
    }
    els.productFormError.textContent = "";
    return true;
  }

  async function closeModal(options = {}) {
    const discardPending = options.discardPendingUploads !== false;
    if (discardPending) {
      await discardSessionUploadedPhotos();
    } else {
      formPhotoState.sessionUploaded.clear();
    }
    revokeAllBlobPreviews();

    const els = getEls();
    els.modalBackdrop.hidden = true;
    els.productForm.reset();
    els.productFormError.textContent = "";
    editingId = null;
    editingOriginalProduct = null;
    formPhotoState.keys = [];
    if (els.productPhotoFileInput) els.productPhotoFileInput.value = "";
    if (els.productPhotoList) els.productPhotoList.replaceChildren();
  }

  function fillAndShow(product, els) {
    revokeAllBlobPreviews();

    els.modalTitle.textContent = product
      ? "Редактировать продукт"
      : "Новый продукт";
    els.productFormError.textContent = "";

    editingId = product ? product.id : null;
    editingOriginalProduct = product
      ? {
          id: product.id,
          flags: Array.isArray(product.flags) ? [...product.flags] : [],
        }
      : null;
    els.productId.value = product?.id ?? "";
    els.name.value = product?.name ?? "";
    const keysFromUrls = storageKeysFromPhotoUrls(product?.photos || []);
    const pk = product?.photoKeys ?? product?.photo_keys;
    formPhotoState.keys = [...(pk?.length ? pk : keysFromUrls)];
    formPhotoState.sessionUploaded.clear();
    if (els.productPhotoFileInput) els.productPhotoFileInput.value = "";
    renderProductPhotoChips();

    els.calories.value = product?.calories ?? "";
    els.proteins.value = product?.proteins ?? "";
    els.fats.value = product?.fats ?? "";
    els.carbs.value = product?.carbs ?? "";
    els.composition.value = product?.composition ?? "";
    els.category.value = product?.category ?? "";
    els.degreeReadiness.value = product?.degreeReadiness ?? "";

    const flags = product?.flags || [];
    els.formFlagVegan.checked = flags.includes("VEGAN");
    els.formFlagGlutenFree.checked =
      flags.includes("GLUTEN_FREE");
    els.formFlagSugarFree.checked =
      flags.includes("SUGAR_FREE");

    els.modalBackdrop.hidden = false;
  }

  async function submitForm(event) {
    event.preventDefault();
    const els = getEls();
    if (!validateSelects(els)) return;
    if (!validateBju(els)) return;

    const uploadedKeys = [...formPhotoState.keys];
    const payload = {
      name: els.name.value.trim(),
      photos: uploadedKeys,
      calories: Number(els.calories.value),
      proteins: Number(els.proteins.value),
      fats: Number(els.fats.value),
      carbs: Number(els.carbs.value),
      composition: els.composition.value.trim() || null,
      category: els.category.value,
      degreeReadiness: els.degreeReadiness.value,
      flags: readFlagsFromForm(els),
    };

    const isEdit = editingId !== null;
    const url = isEdit ? `${API_BASE}/${editingId}` : API_BASE;
    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Ошибка сохранения продукта");
      }

      const savedProduct = await response.json();
      const previousProduct = isEdit ? editingOriginalProduct : null;

      await closeModal({ discardPendingUploads: false });
      if (typeof callbacks.onSaveSuccess === "function") {
        await callbacks.onSaveSuccess({
          isEdit,
          previousProduct,
          savedProduct,
        });
      }
    } catch (error) {
      els.productFormError.textContent =
        error.message || "Ошибка сохранения";
    }
  }

  function bindPhotoUi(els) {
    if (els.productPhotoList) {
      els.productPhotoList.addEventListener("dragstart", (e) => {
        if (e.target.closest("img")) e.preventDefault();
      });
      els.productPhotoList.addEventListener("auxclick", (e) => {
        if (e.target.closest("img")) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      els.productPhotoList.addEventListener(
        "click",
        (e) => {
          const img = e.target.closest("img");
          if (!img) return;
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
    }

    if (els.productPhotoFileInput) {
      els.productPhotoFileInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
        }
      });

      els.productPhotoFileInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      els.productPhotoFileInput.addEventListener("change", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = e.target;
        const files = [...(input.files || [])];
        input.value = "";
        const origin = recipeBookOrigin();
        for (const file of files) {
          if (formPhotoState.keys.length >= 5) {
            showToast("Не больше 5 фотографий", "info");
            break;
          }
          try {
            const fd = new FormData();
            fd.append("file", file);
            const response = await fetch(`${origin}/api/product-photos`, {
              method: "POST",
              body: fd,
            });
            if (!response.ok) {
              const text = await response.text().catch(() => "");
              throw new Error(text || "Не удалось загрузить фото");
            }
            const body = await response.json();
            const storageKey = body.storageKey || body.storage_key;
            if (!storageKey) throw new Error("Нет storageKey в ответе сервера");
            formPhotoState.keys.push(storageKey);
            formPhotoState.sessionUploaded.add(storageKey);
            try {
              formPhotoState.previewBlobUrls.set(
                storageKey,
                URL.createObjectURL(file),
              );
            } catch (_) {}
            renderProductPhotoChips();
          } catch (err) {
            showToast(err.message || "Ошибка загрузки фото", "error");
          }
        }
      });
    }
  }

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

  function bindListeners() {
    const els = getEls();
    els.cancelProductModalBtn.addEventListener("click", () =>
      closeModal().catch(() => {}),
    );
    els.productForm.addEventListener("submit", submitForm);
    els.proteins.addEventListener("input", () =>
      validateBju(getEls()),
    );
    els.fats.addEventListener("input", () => validateBju(getEls()));
    els.carbs.addEventListener("input", () => validateBju(getEls()));
    bindPhotoUi(els);
  }

  window.RecipeBookProductForm = {
    API_BASE,
    init(cfg) {
      callbacks.onSaveSuccess = cfg && cfg.onSaveSuccess;
      window.RECIPE_BOOK_API_ORIGIN = recipeBookOrigin();
      bindListeners();
    },
    prepareModal(product) {
      fillAndShow(product, getEls());
    },
    closeModal,
    getEditingId: () => editingId,
  };
})();
