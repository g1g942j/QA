(function () {
  const host = document.getElementById("productFormModalHost");
  if (!host) return;
  host.outerHTML = `
    <div id="productModalBackdrop" class="modal-backdrop" hidden>
      <div class="modal">
        <h2 id="productModalTitle" class="modal-title">Новый продукт</h2>

        <form id="productForm" class="form" onsubmit="return false">
          <input type="hidden" id="productId" />

          <div class="field">
            <label class="label" for="name">Название</label>
            <input id="name" class="input" type="text" required minlength="2" />
          </div>

          <div class="field">
            <label class="label" for="productPhotoFileInput">Фото</label>
            <input
              id="productPhotoFileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              class="input"
            />
            <p class="muted small" style="margin-top: 0.35rem">
              До 5 файлов: JPEG, PNG, GIF, WebP.
            </p>
            <div id="productPhotoList" class="dish-photo-chips"></div>
          </div>

          <div class="field">
            <label class="label" for="calories">Калории</label>
            <input id="calories" class="input" type="number" min="0" step="0.01" required />
          </div>

          <div class="filter-grid">
            <div class="field">
              <label class="label" for="proteins">Белки</label>
              <input id="proteins" class="input" type="number" min="0" max="100" step="0.01" required />
            </div>
            <div class="field">
              <label class="label" for="fats">Жиры</label>
              <input id="fats" class="input" type="number" min="0" max="100" step="0.01" required />
            </div>
            <div class="field">
              <label class="label" for="carbs">Углеводы</label>
              <input id="carbs" class="input" type="number" min="0" max="100" step="0.01" required />
            </div>
          </div>

          <div class="field">
            <label class="label" for="composition">Состав</label>
            <textarea id="composition" class="input" rows="3"></textarea>
          </div>

          <div class="filter-grid">
            <div class="field">
              <label class="label" for="category">Категория</label>
              <select id="category" class="select"></select>
            </div>
            <div class="field">
              <label class="label" for="degreeReadiness">Необходимость готовки</label>
              <select id="degreeReadiness" class="select"></select>
            </div>
          </div>

          <div class="inline-actions">
            <label class="badge"><input type="checkbox" id="formFlagVegan" /> Веган</label>
            <label class="badge"><input type="checkbox" id="formFlagGlutenFree" /> Без глютена</label>
            <label class="badge"><input type="checkbox" id="formFlagSugarFree" /> Без сахара</label>
          </div>

          <div id="productFormError" class="field-error"></div>

          <div class="modal-actions">
            <button id="cancelProductModalBtn" class="btn" type="button">Отмена</button>
            <button class="btn primary" type="submit">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
})();
