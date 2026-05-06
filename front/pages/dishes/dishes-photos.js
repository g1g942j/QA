(function () {
  function create({ state, elements, getApiOrigin, showToast }) {
    function revokeAllBlobPreviews() {
      state.previewBlobUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      });
      state.previewBlobUrls.clear();
    }

    function storageKeysFromPhotoUrls(urls = []) {
      return urls
        .map((url) => {
          const m = String(url).match(/\/api\/dish-photos\/([^/?#]+)/i);
          return m ? decodeURIComponent(m[1]) : "";
        })
        .filter(Boolean);
    }

    async function discardSessionUploadedPhotos() {
      const origin = getApiOrigin();
      const keys = [...state.sessionUploaded];
      state.sessionUploaded.clear();
      await Promise.all(
        keys.map((key) =>
          fetch(`${origin}/api/dish-photos/${encodeURIComponent(key)}`, {
            method: "DELETE",
          }).catch(() => {}),
        ),
      );
    }

    function dishPhotoThumbUrl(storageKey) {
      return `${getApiOrigin()}/api/dish-photos/${encodeURIComponent(storageKey)}`;
    }

    function renderDishPhotoChips() {
      if (!elements.dishPhotoList) return;
      elements.dishPhotoList.replaceChildren();
      state.keys.forEach((key) => {
        const chip = document.createElement("div");
        chip.className = "dish-photo-chip";
        const thumb = document.createElement("img");
        thumb.alt = "";
        thumb.loading = "lazy";
        thumb.decoding = "async";
        thumb.draggable = false;
        thumb.src = state.previewBlobUrls.get(key) ?? dishPhotoThumbUrl(key);
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn small danger";
        removeBtn.textContent = "Убрать";
        removeBtn.addEventListener("click", () => void removeDishPhotoKey(key));
        chip.append(thumb, removeBtn);
        elements.dishPhotoList.appendChild(chip);
      });
    }

    async function removeDishPhotoKey(key) {
      const blobUrl = state.previewBlobUrls.get(key);
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (_) {}
        state.previewBlobUrls.delete(key);
      }
      state.keys = state.keys.filter((k) => k !== key);
      if (state.sessionUploaded.delete(key)) {
        const origin = getApiOrigin();
        try {
          await fetch(`${origin}/api/dish-photos/${encodeURIComponent(key)}`, {
            method: "DELETE",
          });
        } catch {}
      }
      renderDishPhotoChips();
    }

    function bindPhotoListGuards() {
      if (!elements.dishPhotoList) return;
      elements.dishPhotoList.addEventListener("dragstart", (e) => {
        if (e.target.closest("img")) e.preventDefault();
      });
      elements.dishPhotoList.addEventListener("auxclick", (e) => {
        if (e.target.closest("img")) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      elements.dishPhotoList.addEventListener(
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

    function bindUploadInput() {
      if (!elements.dishPhotoFileInput) return;
      elements.dishPhotoFileInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      elements.dishPhotoFileInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      elements.dishPhotoFileInput.addEventListener("change", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = e.target;
        const files = [...(input.files || [])];
        input.value = "";
        const origin = getApiOrigin();
        for (const file of files) {
          if (state.keys.length >= 5) {
            showToast("Не больше 5 фотографий", "info");
            break;
          }
          try {
            const fd = new FormData();
            fd.append("file", file);
            const response = await fetch(`${origin}/api/dish-photos`, {
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
            state.keys.push(storageKey);
            state.sessionUploaded.add(storageKey);
            try {
              state.previewBlobUrls.set(storageKey, URL.createObjectURL(file));
            } catch (_) {}
            renderDishPhotoChips();
          } catch (err) {
            showToast(err.message || "Ошибка загрузки фото", "error");
          }
        }
      });
    }

    return {
      revokeAllBlobPreviews,
      storageKeysFromPhotoUrls,
      discardSessionUploadedPhotos,
      renderDishPhotoChips,
      bindPhotoListGuards,
      bindUploadInput,
    };
  }

  window.RecipeBookDishPhotos = { create };
})();
