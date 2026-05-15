import { By, WebDriver } from "selenium-webdriver";
import { waitVisible } from "../waits.js";

export type ProductFormMacros = {
  calories: string;
  proteins: string;
  fats: string;
  carbs: string;
};

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

export class ProductModalPage {
  constructor(private readonly driver: WebDriver) {}

  async backdrop() {
    return waitVisible(this.driver, By.id("productModalBackdrop"));
  }

  async waitOpen(): Promise<void> {
    await this.backdrop();
  }

  async nameInput() {
    return waitVisible(this.driver, By.id("name"));
  }

  async caloriesInput() {
    return waitVisible(this.driver, By.id("calories"));
  }

  async proteinsInput() {
    return waitVisible(this.driver, By.id("proteins"));
  }

  async fatsInput() {
    return waitVisible(this.driver, By.id("fats"));
  }

  async carbsInput() {
    return waitVisible(this.driver, By.id("carbs"));
  }

  async categorySelect() {
    return waitVisible(this.driver, By.id("category"));
  }

  async readinessSelect() {
    return waitVisible(this.driver, By.id("degreeReadiness"));
  }

  async formError() {
    return waitVisible(this.driver, By.id("productFormError"));
  }

  async saveButton() {
    return waitVisible(
      this.driver,
      By.xpath(`//form[@id="productForm"]//button[contains(normalize-space(.), "Сохранить")]`),
    );
  }

  async cancelButton() {
    return waitVisible(this.driver, By.id("cancelProductModalBtn"));
  }

  async modalTitleText(): Promise<string> {
    const el = await waitVisible(this.driver, By.id("productModalTitle"));
    return (await el.getText()).trim();
  }

  async productPhotoFileInput() {
    return waitVisible(this.driver, By.id("productPhotoFileInput"));
  }

  async productPhotoChipCount(): Promise<number> {
    return (await this.driver.executeScript(
      `return document.querySelectorAll('#productPhotoList .dish-photo-chip').length;`,
    )) as number;
  }

  async setSelectById(
    elementId: "category" | "degreeReadiness",
    value: string,
  ): Promise<void> {
    await setNativeSelectValue(this.driver, elementId, value);
  }

  async fillRequiredSelects(
    categoryValue: string,
    readinessValue: string,
  ): Promise<void> {
    await setNativeSelectValue(this.driver, "category", categoryValue);
    await setNativeSelectValue(this.driver, "degreeReadiness", readinessValue);
  }

  async fillMacros(m: ProductFormMacros): Promise<void> {
    const clearAndType = async (id: string, text: string) => {
      const el = await waitVisible(this.driver, By.id(id));
      await el.clear();
      await el.sendKeys(text);
    };
    await clearAndType("calories", m.calories);
    await clearAndType("proteins", m.proteins);
    await clearAndType("fats", m.fats);
    await clearAndType("carbs", m.carbs);
  }

  async fillValidBaseline(name: string): Promise<void> {
    const nameEl = await this.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys(name);
    await this.fillRequiredSelects("MEAT", "READY_TO_EAT");
    await this.fillMacros({
      calories: "100",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });
  }

  async setFormFlagCheckbox(elementId: string, checked: boolean): Promise<void> {
    await this.driver.executeScript(
      `
      const el = document.getElementById(arguments[0]);
      if (!(el instanceof HTMLInputElement)) throw new Error('no checkbox #' + arguments[0]);
      el.checked = arguments[1];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      `,
      elementId,
      checked,
    );
  }

  async setFormFlagVegan(checked: boolean): Promise<void> {
    await this.setFormFlagCheckbox("formFlagVegan", checked);
  }

  async setFormFlagGlutenFree(checked: boolean): Promise<void> {
    await this.setFormFlagCheckbox("formFlagGlutenFree", checked);
  }

  async setFormFlagSugarFree(checked: boolean): Promise<void> {
    await this.setFormFlagCheckbox("formFlagSugarFree", checked);
  }

  async setNumericFieldRaw(
    id: "calories" | "proteins" | "fats" | "carbs",
    value: string,
  ): Promise<void> {
    await this.driver.executeScript(
      `
      const el = document.getElementById(arguments[0]);
      if (!el) throw new Error("missing #" + arguments[0]);
      el.value = String(arguments[1]);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      `,
      id,
      value,
    );
  }

  async fieldValidityValid(
    id: "name" | "calories" | "proteins" | "fats" | "carbs",
  ): Promise<boolean> {
    return (await this.driver.executeScript(
      `return document.getElementById(arguments[0]).validity.valid;`,
      id,
    )) as boolean;
  }

  async isBackdropDisplayed(): Promise<boolean> {
    const list = await this.driver.findElements(By.id("productModalBackdrop"));
    if (!list.length) return false;
    const el = list[0]!;
    try {
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }
}
