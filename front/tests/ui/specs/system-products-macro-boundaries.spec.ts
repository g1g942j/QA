import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "mocha";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage } from "../waits.js";
import { ProductsPage } from "../pages/products.page.js";
import { ProductModalPage } from "../pages/product-modal.page.js";

describe("Продукты — калории: граница 0", () => {
  let driver: import("selenium-webdriver").WebDriver;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
  });

  after(async () => {
    await driver?.quit();
  });

  beforeEach(async () => {
    const products = new ProductsPage(driver);
    await products.goto();
    await products.openCreateModal();
  });

  afterEach(async () => {
    const modal = new ProductModalPage(driver);
    if (await modal.isBackdropDisplayed()) {
      try {
        await (await modal.cancelButton()).click();
      } catch {}
    }
  });

  const caloriesCases = [
    { value: "-0.1", expectHtmlValid: false },
    { value: "0", expectHtmlValid: true },
    { value: "0.1", expectHtmlValid: true },
  ] as const;

  for (const row of caloriesCases) {
    it(`калории = ${row.value} → validity.valid === ${row.expectHtmlValid}`, async () => {
      const modal = new ProductModalPage(driver);
      const nameEl = await modal.nameInput();
      await nameEl.clear();
      await nameEl.sendKeys(`UI_K_${Date.now()}`);
      await modal.fillRequiredSelects("MEAT", "READY_TO_EAT");
      await modal.fillMacros({
        calories: "1",
        proteins: "10",
        fats: "10",
        carbs: "10",
      });
      await modal.setNumericFieldRaw("calories", row.value);
      assert.equal(
        await modal.fieldValidityValid("calories"),
        row.expectHtmlValid,
      );
    });
  }
});

describe("Продукты — БЖУ: границы по одному полю", () => {
  let driver: import("selenium-webdriver").WebDriver;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
  });

  after(async () => {
    await driver?.quit();
  });

  beforeEach(async () => {
    const products = new ProductsPage(driver);
    await products.goto();
    await products.openCreateModal();
  });

  afterEach(async () => {
    const modal = new ProductModalPage(driver);
    if (await modal.isBackdropDisplayed()) {
      try {
        await (await modal.cancelButton()).click();
      } catch {}
    }
  });

  const proteinOnlyCases = [
    { value: "-0.1", expectHtmlValid: false },
    { value: "0", expectHtmlValid: true },
    { value: "0.1", expectHtmlValid: true },
    { value: "99.9", expectHtmlValid: true },
    { value: "100", expectHtmlValid: true },
    { value: "100.1", expectHtmlValid: false },
  ] as const;

  const singleFieldCases: Array<{
    field: "proteins" | "fats" | "carbs";
    label: string;
  }> = [
    { field: "proteins", label: "белки" },
    { field: "fats", label: "жиры" },
    { field: "carbs", label: "углеводы" },
  ];

  for (const { field, label } of singleFieldCases) {
    for (const row of proteinOnlyCases) {
      it(`${label} = ${row.value} → validity.valid === ${row.expectHtmlValid}`, async () => {
        const modal = new ProductModalPage(driver);
        const nameEl = await modal.nameInput();
        await nameEl.clear();
        await nameEl.sendKeys(`UI_BJU1_${Date.now()}`);
        await modal.fillRequiredSelects("MEAT", "READY_TO_EAT");
        await modal.setNumericFieldRaw("calories", "1");
        const z = { proteins: "0", fats: "0", carbs: "0" };
        z[field] = row.value;
        await modal.setNumericFieldRaw("proteins", z.proteins);
        await modal.setNumericFieldRaw("fats", z.fats);
        await modal.setNumericFieldRaw("carbs", z.carbs);
        assert.equal(
          await modal.fieldValidityValid(field),
          row.expectHtmlValid,
        );
      });
    }
  }
});

describe("Продукты — сумма БЖУ", () => {
  let driver: import("selenium-webdriver").WebDriver;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
  });

  after(async () => {
    await driver?.quit();
  });

  beforeEach(async () => {
    const products = new ProductsPage(driver);
    await products.goto();
    await products.openCreateModal();
  });

  afterEach(async () => {
    const modal = new ProductModalPage(driver);
    if (await modal.isBackdropDisplayed()) {
      try {
        await (await modal.cancelButton()).click();
      } catch {}
    }
  });

  it("сумма 99.9 — валидно", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const name = `UI_SUM_999_${Date.now()}`;
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys(name);
    await modal.fillRequiredSelects("MEAT", "READY_TO_EAT");
    await modal.setNumericFieldRaw("calories", "1");
    await modal.setNumericFieldRaw("proteins", "25");
    await modal.setNumericFieldRaw("fats", "25");
    await modal.setNumericFieldRaw("carbs", "49.9");
    await (await modal.saveButton()).click();
    await waitTextInPage(driver, "Продукт создан", 20_000);
    const card = await products.productCardByName(name);
    assert.equal(await card.isDisplayed(), true);
    await (await products.deleteButtonForCard(card)).click();
    await (await products.deleteConfirmButton()).click();
    await driver.wait(async () => {
      const list = await products.productCardsByName(name);
      return list.length === 0;
    }, 20_000);
  });

  it("сумма 100 — валидно", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const name = `UI_SUM_100_${Date.now()}`;
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys(name);
    await modal.fillRequiredSelects("MEAT", "READY_TO_EAT");
    await modal.setNumericFieldRaw("calories", "1");
    await modal.setNumericFieldRaw("proteins", "33");
    await modal.setNumericFieldRaw("fats", "33");
    await modal.setNumericFieldRaw("carbs", "34");
    await (await modal.saveButton()).click();
    await waitTextInPage(driver, "Продукт создан", 20_000);
    const card = await products.productCardByName(name);
    assert.equal(await card.isDisplayed(), true);
    await (await products.deleteButtonForCard(card)).click();
    await (await products.deleteConfirmButton()).click();
    await driver.wait(async () => {
      const list = await products.productCardsByName(name);
      return list.length === 0;
    }, 20_000);
  });

  it("сумма 100.1 — невалидно", async () => {
    const modal = new ProductModalPage(driver);
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys(`UI_SUM_101_${Date.now()}`);
    await modal.fillRequiredSelects("MEAT", "READY_TO_EAT");
    await modal.setNumericFieldRaw("calories", "1");
    await modal.setNumericFieldRaw("proteins", "33");
    await modal.setNumericFieldRaw("fats", "33");
    await modal.setNumericFieldRaw("carbs", "34.1");
    await (await modal.saveButton()).click();
    const err = await modal.formError();
    assert.equal(
      (await err.getText()).trim(),
      "Сумма БЖУ не может превышать 100.",
    );
  });
});
