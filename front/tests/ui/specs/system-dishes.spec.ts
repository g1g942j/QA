import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "mocha";
import { By } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage, waitVisible } from "../waits.js";
import { DishesPage } from "../pages/dishes.page.js";
import { DishModalPage } from "../pages/dish-modal.page.js";
import {
  createSeededProductForDishTests,
  deleteProductById,
  expectedPortionKbjy,
  type SeededProduct,
} from "../test-data/seed-product.js";

describe("Блюда — UI", () => {
  let driver!: import("selenium-webdriver").WebDriver;
  let seeded!: SeededProduct;

  before(async function () {
    this.timeout(120_000);
    seeded = await createSeededProductForDishTests();
    driver = await createDriver();
  });

  after(async () => {
    await driver.quit().catch(() => undefined);
    await deleteProductById(seeded.id).catch(() => undefined);
  });

  describe("Блюда — поиск (эквивалентные классы)", () => {
    let marker: string;
    let uniqueName: string;

    beforeEach(async () => {
      marker = `UI_D_EQ_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      uniqueName = `${marker}_Dish`;
      const dishes = new DishesPage(driver);
      const modal = new DishModalPage(driver);
      await dishes.goto();
      await (await dishes.openCreateButton()).click();
      await waitVisible(driver, By.id("dishModalBackdrop"));
      await modal.fillMinimalSavable(uniqueName, "FIRST", "100", seeded.id);
      await (await modal.saveButton()).click();
      await waitTextInPage(driver, "Блюдо создано", 25_000);
      assert.equal(
        await (await dishes.dishCardByName(uniqueName)).isDisplayed(),
        true,
      );
    });

    afterEach(async () => {
      const dishes = new DishesPage(driver);
      await dishes.goto();
      const cards = await dishes.dishCardsByName(uniqueName);
      if (cards.length) {
        await (await dishes.deleteButtonForCard(cards[0]!)).click();
        await (await dishes.deleteConfirmButton()).click();
        await driver.wait(async () => {
          const again = await dishes.dishCardsByName(uniqueName);
          return again.length === 0;
        }, 20_000);
      }
    });

    it("класс A: поиск по подстроке показывает карточку", async () => {
      const dishes = new DishesPage(driver);
      const search = await dishes.searchInput();
      await search.clear();
      await search.sendKeys(marker);
      assert.equal(
        await (await dishes.dishCardByName(uniqueName)).isDisplayed(),
        true,
      );
      const empty = await dishes.emptyStateBlock();
      assert.equal(empty.length, 0);
    });

    it("класс B: поиск без совпадений — пустое состояние", async () => {
      const dishes = new DishesPage(driver);
      const search = await dishes.searchInput();
      await search.clear();
      await search.sendKeys(`${marker}_no_such_dish`);
      const empty = await dishes.emptyStateBlock();
      assert.ok(empty.length >= 1);
      assert.equal(await empty[0]!.isDisplayed(), true);
    });

    it("класс C: очистка поиска убирает фильтр", async () => {
      const dishes = new DishesPage(driver);
      const search = await dishes.searchInput();
      await search.clear();
      await search.sendKeys(`${marker}_no_such_dish`);
      const empty1 = await dishes.emptyStateBlock();
      assert.ok(empty1.length >= 1);
      await search.clear();
      await search.sendKeys("");
      await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
      assert.equal(
        await (await dishes.dishCardByName(uniqueName)).isDisplayed(),
        true,
      );
    });
  });

  describe("Блюда — форма создания", () => {
    beforeEach(async () => {
      const dishes = new DishesPage(driver);
      await dishes.goto();
      await (await dishes.openCreateButton()).click();
      await waitVisible(driver, By.id("dishModalBackdrop"));
    });

    afterEach(async () => {
      const modal = new DishModalPage(driver);
      if (await modal.isBackdropDisplayed()) {
        try {
          await (await modal.cancelButton()).click();
        } catch {}
      }
    });

    it("граница minlength: 1 символ в названии — невалидность HTML", async () => {
      const modal = new DishModalPage(driver);
      const nameEl = await modal.nameInput();
      await nameEl.clear();
      await nameEl.sendKeys("Б");
      await modal.setSelectById("dishCategory", "SOUP");
      await modal.fillIngredientByProductId(seeded.id, "50");
      await (await modal.saveButton()).click();
      const valid = (await driver.executeScript(
        "return arguments[0].validity.valid;",
        nameEl,
      )) as boolean;
      assert.equal(valid, false);
      assert.equal(await modal.isBackdropDisplayed(), true);
    });

    it("граница minlength: 2 символа — валидно по HTML", async () => {
      const modal = new DishModalPage(driver);
      const nameEl = await modal.nameInput();
      await nameEl.clear();
      await nameEl.sendKeys("Об");
      assert.equal(await modal.fieldValidityValid("dishName"), true);
    });

    it("порция 0: фронт не блокирует, бэк отклоняет (400)", async function () {
      this.timeout(30_000);
      const modal = new DishModalPage(driver);
      const name = `UI_D_P0_${Date.now()}`;
      await modal.fillMinimalSavable(name, "FIRST", "100", seeded.id);
      await modal.setNumericFieldRaw("portionSize", "0");
      assert.equal(await modal.getInputValue("portionSize"), "0");
      await (await modal.saveButton()).click();
      const err = await modal.formError();
      const msg = (await err.getText()).trim();
      assert.ok(msg.length > 0);
      assert.match(msg, /400|Bad Request|portionSize/i);
      assert.equal(await modal.isBackdropDisplayed(), true);
    });

    it("без категории и без макроса в названии — ошибка формы", async () => {
      const modal = new DishModalPage(driver);
      const nameEl = await modal.nameInput();
      await nameEl.clear();
      await nameEl.sendKeys(`UI_D_CAT_${Date.now()}`);
      await modal.setSelectById("dishCategory", "");
      await modal.fillIngredientByProductId(seeded.id, "80");
      await (await modal.saveButton()).click();
      const err = await modal.formError();
      assert.ok(
        (await err.getText()).includes(
          "Выберите категорию или укажите макрос в названии",
        ),
      );
    });

    it("КБЖУ на форме считаются автоматически по составу (50 г продукта)", async function () {
      this.timeout(30_000);
      const modal = new DishModalPage(driver);
      await modal.setSelectById("dishCategory", "FIRST");
      await modal.fillIngredientByProductId(seeded.id, "50");
      const exp = expectedPortionKbjy(seeded.per100g, 50);
      await driver.wait(async () => {
        const c = await modal.getInputValue("dishCalories");
        return c === exp.calories;
      }, 15_000);
      assert.equal(await modal.getInputValue("dishCalories"), exp.calories);
      assert.equal(await modal.getInputValue("dishProteins"), exp.proteins);
      assert.equal(await modal.getInputValue("dishFats"), exp.fats);
      assert.equal(await modal.getInputValue("dishCarbs"), exp.carbs);
    });
  });

  describe("Блюда — страница загружается", () => {
    it("заголовок «Блюда» и кнопка создания", async () => {
      const dishes = new DishesPage(driver);
      await dishes.goto();
      assert.equal(await (await dishes.title()).isDisplayed(), true);
      assert.equal(await (await dishes.openCreateButton()).isDisplayed(), true);
    });
  });
});
