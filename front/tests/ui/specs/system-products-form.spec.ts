import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "mocha";
import { By } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage, waitVisible } from "../waits.js";
import { ProductsPage } from "../pages/products.page.js";
import { ProductModalPage } from "../pages/product-modal.page.js";

type ProductBjuMacros = {
  proteins: string;
  fats: string;
  carbs: string;
};

async function fillProductFormWithBju(
  modal: ProductModalPage,
  name: string,
  bju: ProductBjuMacros,
): Promise<void> {
  await modal.fillValidBaseline(name);
  await modal.setNumericFieldRaw("proteins", bju.proteins);
  await modal.setNumericFieldRaw("fats", bju.fats);
  await modal.setNumericFieldRaw("carbs", bju.carbs);
}

async function deleteProductByName(
  driver: import("selenium-webdriver").WebDriver,
  products: ProductsPage,
  name: string,
): Promise<void> {
  const card = await products.productCardByName(name);
  await (await products.deleteButtonForCard(card)).click();
  await (await products.deleteConfirmButton()).click();
  await driver.wait(async () => {
    const list = await products.productCardsByName(name);
    return list.length === 0;
  }, 20_000);
}

describe("Продукты — поиск", () => {
  let driver: import("selenium-webdriver").WebDriver;
  let marker: string;
  let uniqueName: string;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
  });

  after(async () => {
    await driver?.quit();
  });

  beforeEach(async () => {
    marker = `UI_EQ_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    uniqueName = `${marker}_Product`;
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    await products.goto();
    await (await products.openCreateButton()).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
    await modal.fillValidBaseline(uniqueName);
    await (await modal.saveButton()).click();
    await waitTextInPage(driver, "Продукт создан", 20_000);
    assert.equal(
      await (await products.productCardByName(uniqueName)).isDisplayed(),
      true,
    );
  });

  afterEach(async () => {
    const products = new ProductsPage(driver);
    await products.goto();
    const cards = await products.productCardsByName(uniqueName);
    if (cards.length) {
      await (await products.deleteButtonForCard(cards[0]!)).click();
      await (await products.deleteConfirmButton()).click();
      await driver.wait(async () => {
        const again = await products.productCardsByName(uniqueName);
        return again.length === 0;
      }, 20_000);
    }
  });

  it("поиск по подстроке показывает карточку", async () => {
    const products = new ProductsPage(driver);
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    assert.equal(
      await (await products.productCardByName(uniqueName)).isDisplayed(),
      true,
    );
    const empty = await products.emptyStateBlock();
    assert.equal(empty.length, 0);
  });

  it("поиск без совпадений — пустое состояние", async () => {
    const products = new ProductsPage(driver);
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(`${marker}_no_such_product`);
    const empty = await products.emptyStateBlock();
    assert.ok(empty.length >= 1);
    assert.equal(await empty[0]!.isDisplayed(), true);
  });
});

describe("Продукты — форма создания", () => {
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
    await (await products.openCreateButton()).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
  });

  afterEach(async () => {
    const modal = new ProductModalPage(driver);
    if (await modal.isBackdropDisplayed()) {
      try {
        await (await modal.cancelButton()).click();
      } catch {}
    }
  });

  it("граница minlength: 1 символ в названии", async () => {
    const modal = new ProductModalPage(driver);
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys("А");
    await modal.fillRequiredSelects("VEGETABLES", "SEMI_FINISHED");
    await modal.fillMacros({
      calories: "1",
      proteins: "1",
      fats: "1",
      carbs: "1",
    });
    await (await modal.saveButton()).click();
    const valid = (await driver.executeScript(
      "return arguments[0].validity.valid;",
      nameEl,
    )) as boolean;
    assert.equal(valid, false);
    assert.equal(await modal.isBackdropDisplayed(), true);
  });

  it("граница minlength: 2 символа", async () => {
    const modal = new ProductModalPage(driver);
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys("Аб");
    assert.equal(await modal.fieldValidityValid("name"), true);
  });

  const bjuValidCases = [
    {
      title: "граница 99.9",
      proteins: "33.9",
      fats: "33",
      carbs: "33",
    },
    {
      title: "граница 100",
      proteins: "34",
      fats: "33",
      carbs: "33",
    },
  ] as const;

  for (const row of bjuValidCases) {
    it(`БЖУ: ${row.title}`, async () => {
      const products = new ProductsPage(driver);
      const modal = new ProductModalPage(driver);
      const name = `UI_BJU_${Date.now()}`;
      await fillProductFormWithBju(modal, name, row);
      await (await modal.saveButton()).click();
      await waitTextInPage(driver, "Продукт создан", 20_000);
      const card = await products.productCardByName(name);
      assert.equal(await card.isDisplayed(), true);
      await deleteProductByName(driver, products, name);
    });
  }

  const bjuInvalidCases = [
    {
      title: "граница 100.1",
      proteins: "34.1",
      fats: "33",
      carbs: "33",
    },
  ] as const;

  for (const row of bjuInvalidCases) {
    it(`БЖУ: ${row.title}`, async () => {
      const modal = new ProductModalPage(driver);
      const name = `UI_BJU_${Date.now()}`;
      await fillProductFormWithBju(modal, name, row);
      await (await modal.saveButton()).click();
      const err = await modal.formError();
      assert.equal(
        (await err.getText()).trim(),
        "Сумма БЖУ не может превышать 100.",
      );
      assert.equal(await modal.isBackdropDisplayed(), true);
    });
  }

  const selectCases = [
    {
      title: "«категория не выбрана»",
      readiness: "REQUIRES_COOKING",
      category: "",
      expected: "Выберите категорию.",
    },
    {
      title: "«готовность не выбрана»",
      readiness: "",
      category: "GREENS",
      expected: "Выберите необходимость готовки.",
    },
  ] as const;

  for (const row of selectCases) {
    it(row.title, async () => {
      const modal = new ProductModalPage(driver);
      const nameEl = await modal.nameInput();
      await nameEl.clear();
      await nameEl.sendKeys(`UI_SEL_${Date.now()}`);
      await modal.fillMacros({
        calories: "10",
        proteins: "5",
        fats: "5",
        carbs: "5",
      });
      await modal.setSelectById("category", row.category);
      await modal.setSelectById("degreeReadiness", row.readiness);
      await (await modal.saveButton()).click();
      const err = await modal.formError();
      assert.equal((await err.getText()).trim(), row.expected);
    });
  }
});
