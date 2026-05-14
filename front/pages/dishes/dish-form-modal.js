(function () {
  const host = document.getElementById("dishFormModalHost");
  if (!host) return;
  host.outerHTML = `
    <div id="dishModalBackdrop" class="modal-backdrop" hidden>
      <div class="modal">
        <h2 id="dishModalTitle" class="modal-title">Новое блюдо</h2>

        <form id="dishForm" class="form" onsubmit="return false;">
          <input type="hidden" id="dishId" />

          <div class="field">
            <label class="label" for="dishName">Название</label>
            <input id="dishName" class="input" type="text" required minlength="2" />
          </div>

          <div class="field dish-photo-upload-block">
            <label class="label" for="dishPhotoFileInput">Фото</label>
            <input
              id="dishPhotoFileInput"
              class="input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
            />
            <p class="dish-photo-hint muted">
              До 5 файлов: JPEG, PNG, GIF, WebP.
            </p>
            <div id="dishPhotoList" class="dish-photo-list"></div>
          </div>

          <div class="field">
            <label class="label">Состав блюда</label>
            <div id="ingredientsList" class="ingredients-list"></div>
            <button id="addIngredientBtn" class="btn" type="button">
              + Добавить продукт
            </button>
          </div>

          <div class="field">
            <label class="label" for="portionSize">Размер порции (г)</label>
            <input id="portionSize" class="input" type="number" step="0.01" required />
          </div>

          <div class="dish-macros-block">
            <div class="dish-macros-grid">
              <div class="field dish-macros-grid__calories">
                <label class="label" for="dishCalories">Калории</label>
                <input id="dishCalories" class="input" type="number" min="0" step="0.01" />
              </div>
              <div class="field">
                <label class="label" for="dishProteins">Белки</label>
                <input id="dishProteins" class="input" type="number" min="0" step="0.01" />
              </div>
              <div class="field">
                <label class="label" for="dishFats">Жиры</label>
                <input id="dishFats" class="input" type="number" min="0" step="0.01" />
              </div>
              <div class="field">
                <label class="label" for="dishCarbs">Углеводы</label>
                <input id="dishCarbs" class="input" type="number" min="0" step="0.01" />
              </div>
            </div>
            <p class="dish-macros-footnote muted">
              КБЖУ на порцию считаются автоматически
            </p>
          </div>

          <div class="field">
            <label class="label" for="dishCategory">Категория</label>
            <select id="dishCategory" class="select"></select>
          </div>

          <div class="inline-actions">
            <label class="badge"><input type="checkbox" id="dishFormFlagVegan" /> Веган</label>
            <label class="badge"><input type="checkbox" id="dishFormFlagGlutenFree" /> Без глютена</label>
            <label class="badge"><input type="checkbox" id="dishFormFlagSugarFree" /> Без сахара</label>
          </div>

          <div id="dishFormError" class="field-error"></div>

          <div class="modal-actions modal-actions--dish-extra">
            <button id="cancelDishModalBtn" class="btn" type="button">Отмена</button>
            <button id="saveDishBtn" class="btn primary" type="button">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;
})();
