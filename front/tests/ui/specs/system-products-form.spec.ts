import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "mocha";
import { By } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage, waitVisible } from "../waits.js";
import { ProductsPage } from "../pages/products.page.js";
import { ProductModalPage } from "../pages/product-modal.page.js";

describe("Продукты — поиск (эквивалентные классы)", () => {
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
    assert.equal(await (await products.productCardByName(uniqueName)).isDisplayed(), true);
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

  it("класс A: поиск по подстроке показывает карточку", async () => {
    const products = new ProductsPage(driver);
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    assert.equal(await (await products.productCardByName(uniqueName)).isDisplayed(), true);
    const empty = await products.emptyStateBlock();
    assert.equal(empty.length, 0);
  });

  it("класс B: поиск без совпадений — пустое состояние", async () => {
    const products = new ProductsPage(driver);
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(`${marker}_no_such_product`);
    const empty = await products.emptyStateBlock();
    assert.ok(empty.length >= 1);
    assert.equal(await empty[0]!.isDisplayed(), true);
  });

  it("класс C: очистка поиска убирает фильтр", async () => {
    const products = new ProductsPage(driver);
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(`${marker}_no_such_product`);
    const empty1 = await products.emptyStateBlock();
    assert.ok(empty1.length >= 1);
    await search.clear();
    await search.sendKeys("");
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    assert.equal(await (await products.productCardByName(uniqueName)).isDisplayed(), true);
  });
});

describe("Продукты — форма создания (границы и эквиваленты)", () => {
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

  it("граница minlength: 1 символ — невалидность", async () => {
    const modal = new ProductModalPage(driver);
    await modal.fillRequiredSelects("VEGETABLES", "SEMI_FINISHED");
    await modal.fillMacros({
      calories: "1",
      proteins: "1",
      fats: "1",
      carbs: "1",
    });
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys("A");
    await (await modal.saveButton()).click();
    const snap = (await driver.executeScript(`
      const el = document.getElementById("name");
      if (!el) return null;
      return {
        value: el.value,
        valid: el.validity.valid,
        tooShort: el.validity.tooShort,
        willValidate: el.willValidate,
      };
    `)) as {
      value: string;
      valid: boolean;
      tooShort: boolean;
      willValidate: boolean;
    } | null;
    assert.ok(snap, "поле #name есть в DOM");
    assert.equal(
      snap.value,
      "A",
      "ожидалось ровно один символ без автозаполнения; проверьте autocomplete/фокус",
    );
    assert.equal(snap.willValidate, true);
    assert.equal(snap.valid, false);
    assert.equal(snap.tooShort, true);
    assert.equal(await modal.isBackdropDisplayed(), true);
  });

  it("граница minlength: 2 символа — валидно по HTML", async () => {
    const modal = new ProductModalPage(driver);
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys("AB");
    const valid = (await driver.executeScript(
      "return arguments[0].validity.valid;",
      nameEl,
    )) as boolean;
    assert.equal(valid, true);
  });

  const bjuCases = [
    {
      title: "граница 100 — валидный класс",
      proteins: "34",
      fats: "33",
      carbs: "33",
      expectError: false,
    },
    {
      title: "граница 101 — невалидный класс",
      proteins: "34",
      fats: "33",
      carbs: "34",
      expectError: true,
    },
  ] as const;

  for (const row of bjuCases) {
    it(`БЖУ: ${row.title}`, async () => {
      const products = new ProductsPage(driver);
      const modal = new ProductModalPage(driver);
      const name = `UI_BJU_${Date.now()}`;
      await modal.fillValidBaseline(name);
      const p = await modal.proteinsInput();
      await p.clear();
      await p.sendKeys(row.proteins);
      const f = await modal.fatsInput();
      await f.clear();
      await f.sendKeys(row.fats);
      const c = await modal.carbsInput();
      await c.clear();
      await c.sendKeys(row.carbs);
      await (await modal.saveButton()).click();
      if (row.expectError) {
        const err = await modal.formError();
        assert.equal(
          (await err.getText()).trim(),
          "Сумма БЖУ не может превышать 100.",
        );
      } else {
        await waitTextInPage(driver, "Продукт создан", 20_000);
        const card = await products.productCardByName(name);
        assert.equal(await card.isDisplayed(), true);
        await (await products.deleteButtonForCard(card)).click();
        await (await products.deleteConfirmButton()).click();
        await driver.wait(async () => {
          const list = await products.productCardsByName(name);
          return list.length === 0;
        }, 20_000);
      }
    });
  }

  const selectCases = [
    {
      title: "эквивалент «категория не выбрана»",
      readiness: "REQUIRES_COOKING",
      fillCategory: false,
      expected: "Выберите категорию.",
    },
    {
      title: "эквивалент «готовность не выбрана»",
      readiness: "",
      fillCategory: true,
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
      await modal.setSelectById("category", row.fillCategory ? "GREENS" : "");
      await modal.setSelectById("degreeReadiness", row.readiness || "");
      await (await modal.saveButton()).click();
      const err = await modal.formError();
      assert.equal((await err.getText()).trim(), row.expected);
    });
  }
});
