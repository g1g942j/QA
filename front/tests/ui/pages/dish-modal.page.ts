import { By, WebDriver } from "selenium-webdriver";
import { waitVisible } from "../waits.js";

async function waitUntil(
  driver: WebDriver,
  predicate: () => Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  await driver.wait(predicate, timeoutMs);
}

async function setNativeSelectValue(
  driver: WebDriver,
  elementId: string,
  value: string,
): Promise<void> {
  await driver.executeScript(
    `
    const s = document.getElementById(arguments[0]);
    if (!s) throw new Error('No select #' + arguments[0]);
    s.value = arguments[1];
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
    `,
    elementId,
    value,
  );
}

export class DishModalPage {
  constructor(private readonly driver: WebDriver) {}

  async backdrop() {
    return waitVisible(this.driver, By.id("dishModalBackdrop"));
  }

  async waitOpen(): Promise<void> {
    await this.backdrop();
  }

  async nameInput() {
    return waitVisible(this.driver, By.id("dishName"));
  }

  async portionSizeInput() {
    return waitVisible(this.driver, By.id("portionSize"));
  }

  async saveButton() {
    return waitVisible(this.driver, By.id("saveDishBtn"));
  }

  async cancelButton() {
    return waitVisible(this.driver, By.id("cancelDishModalBtn"));
  }

  async modalTitleText(): Promise<string> {
    const el = await waitVisible(this.driver, By.id("dishModalTitle"));
    return (await el.getText()).trim();
  }

  async dishPhotoFileInput() {
    return waitVisible(this.driver, By.id("dishPhotoFileInput"));
  }

  async dishPhotoChipCount(): Promise<number> {
    return (await this.driver.executeScript(
      `return document.querySelectorAll('#dishPhotoList .dish-photo-chip').length;`,
    )) as number;
  }

  async formError() {
    return waitVisible(this.driver, By.id("dishFormError"));
  }

  async setSelectById(elementId: string, value: string): Promise<void> {
    await setNativeSelectValue(this.driver, elementId, value);
  }

  private async waitIngredientRowHasProductOption(
    rowIndex: number,
    productId: number,
  ): Promise<void> {
    await waitUntil(
      this.driver,
      async () =>
        (await this.driver.executeScript(
          `
          const rows = document.querySelectorAll('#ingredientsList .ingredient-row');
          const row = rows[arguments[0]];
          if (!row) return false;
          const s = row.querySelector('.ingredient-product');
          if (!s) return false;
          const id = String(arguments[1]);
          return [...s.options].some((o) => o.value === id);
          `,
          rowIndex,
          productId,
        )) as boolean,
      20_000,
    );
  }

  private async waitIngredientSelectHasAnyProduct(): Promise<void> {
    await waitUntil(
      this.driver,
      async () =>
        (await this.driver.executeScript(
          `
          const s = document.querySelector('#ingredientsList .ingredient-product');
          if (!s) return false;
          return [...s.options].some((o) => o.value);
          `,
        )) as boolean,
      20_000,
    );
  }

  async fillFirstProductIngredient(amount: string): Promise<void> {
    await this.waitIngredientSelectHasAnyProduct();
    await this.driver.executeScript(
      `
      const s = document.querySelector('#ingredientsList .ingredient-product');
      if (!s) throw new Error('No ingredient select');
      const opt = [...s.options].find((o) => o.value);
      if (!opt) throw new Error('No products in API — нужен хотя бы один продукт');
      s.value = opt.value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
      const a = document.querySelector('#ingredientsList .ingredient-amount');
      if (!a) throw new Error('No ingredient amount');
      a.value = String(arguments[0]);
      a.dispatchEvent(new Event('input', { bubbles: true }));
      `,
      amount,
    );
  }

  async fillIngredientByProductId(
    productId: number,
    amount: string,
  ): Promise<void> {
    await this.waitIngredientRowHasProductOption(0, productId);
    await this.driver.executeScript(
      `
      const s = document.querySelector('#ingredientsList .ingredient-product');
      if (!s) throw new Error('No ingredient select');
      s.value = String(arguments[0]);
      s.dispatchEvent(new Event('change', { bubbles: true }));
      const a = document.querySelector('#ingredientsList .ingredient-amount');
      if (!a) throw new Error('No ingredient amount');
      a.value = String(arguments[1]);
      a.dispatchEvent(new Event('input', { bubbles: true }));
      `,
      productId,
      amount,
    );
  }

  async clickAddIngredient(): Promise<void> {
    await (await waitVisible(this.driver, By.id("addIngredientBtn"))).click();
  }

  async fillIngredientRowByIndex(
    rowIndex: number,
    productId: number,
    amount: string,
  ): Promise<void> {
    await this.waitIngredientRowHasProductOption(rowIndex, productId);
    await this.driver.executeScript(
      `
      const rows = document.querySelectorAll('#ingredientsList .ingredient-row');
      const row = rows[arguments[0]];
      if (!row) throw new Error('no ingredient row');
      const s = row.querySelector('.ingredient-product');
      const a = row.querySelector('.ingredient-amount');
      if (!s || !a) throw new Error('no ingredient controls');
      s.value = String(arguments[1]);
      s.dispatchEvent(new Event('change', { bubbles: true }));
      a.value = String(arguments[2]);
      a.dispatchEvent(new Event('input', { bubbles: true }));
      `,
      rowIndex,
      productId,
      amount,
    );
  }

  async addSecondIngredient(productId: number, amount: string): Promise<void> {
    await this.clickAddIngredient();
    await this.fillIngredientRowByIndex(1, productId, amount);
  }

  async getInputValue(id: string): Promise<string> {
    const el = await waitVisible(this.driver, By.id(id));
    return (await el.getAttribute("value")) ?? "";
  }

  async setNumericFieldRaw(id: string, value: string): Promise<void> {
    await this.driver.executeScript(
      `
      const el = document.getElementById(arguments[0]);
      if (!el) throw new Error('missing #' + arguments[0]);
      el.value = String(arguments[1]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      `,
      id,
      value,
    );
  }

  async fieldValidityValid(id: string): Promise<boolean> {
    return (await this.driver.executeScript(
      `return document.getElementById(arguments[0]).validity.valid;`,
      id,
    )) as boolean;
  }

  async fillMinimalSavable(
    name: string,
    category: string,
    ingredientGrams = "100",
    productId?: number,
  ): Promise<void> {
    const nameEl = await this.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys(name);
    await this.setSelectById("dishCategory", category);
    if (productId != null) {
      await this.fillIngredientByProductId(productId, ingredientGrams);
    } else {
      await this.fillFirstProductIngredient(ingredientGrams);
    }
    try {
      await this.driver.wait(async () => {
        const ps = await this.portionSizeInput();
        const v = await ps.getAttribute("value");
        return Boolean(v && v.trim().length > 0);
      }, 10_000);
    } catch {
      await this.setNumericFieldRaw("portionSize", ingredientGrams);
    }
  }

  async setDishFormFlagCheckbox(
    elementId: string,
    checked: boolean,
  ): Promise<void> {
    if (checked) {
      await this.driver.wait(
        async () =>
          (await this.driver.executeScript(
            `const el = document.getElementById(arguments[0]);
            return el instanceof HTMLInputElement && !el.disabled;`,
            elementId,
          )) as boolean,
        15_000,
      );
    }
    await this.driver.executeScript(
      `
      const el = document.getElementById(arguments[0]);
      if (!(el instanceof HTMLInputElement)) throw new Error('no #' + arguments[0]);
      if (arguments[1] && el.disabled) throw new Error('flag disabled');
      el.checked = arguments[1];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      `,
      elementId,
      checked,
    );
  }

  async setDishFormFlagVegan(checked: boolean): Promise<void> {
    await this.setDishFormFlagCheckbox("dishFormFlagVegan", checked);
  }

  async setDishFormFlagGlutenFree(checked: boolean): Promise<void> {
    await this.setDishFormFlagCheckbox("dishFormFlagGlutenFree", checked);
  }

  async setDishFormFlagSugarFree(checked: boolean): Promise<void> {
    await this.setDishFormFlagCheckbox("dishFormFlagSugarFree", checked);
  }

  async isBackdropDisplayed(): Promise<boolean> {
    const list = await this.driver.findElements(By.id("dishModalBackdrop"));
    if (!list.length) return false;
    const el = list[0]!;
    try {
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }
}
