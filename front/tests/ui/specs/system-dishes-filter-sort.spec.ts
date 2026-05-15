import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "mocha";
import { WebDriver } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage } from "../waits.js";
import { DishesPage } from "../pages/dishes.page.js";
import { DishModalPage } from "../pages/dish-modal.page.js";
import {
  createSeededProductForDishTests,
  createVeganVegetableProduct,
  deleteProductById,
  type SeededProduct,
} from "../test-data/seed-product.js";
import { deleteDishesByNameSubstring } from "../test-data/api-cleanup.js";

type VeganProd = { id: number; name: string };

async function createDish(
  driver: WebDriver,
  dishes: DishesPage,
  modal: DishModalPage,
  name: string,
  category: string,
  productId: number,
  setVeganFlag = false,
): Promise<void> {
  await dishes.goto();
  await dishes.openCreateModal();
  await modal.fillMinimalSavable(name, category, "100", productId);
  if (setVeganFlag) await modal.setDishFormFlagVegan(true);
  await (await modal.saveButton()).click();
  await waitTextInPage(driver, "Блюдо создано", 25_000);
}

describe("Блюда — фильтры и порядок по названию", () => {
  let driver!: WebDriver;
  let seeded!: SeededProduct;
  let vegan!: VeganProd;
  let marker!: string;

  before(async function () {
    this.timeout(120_000);
    marker = `UI_DFS_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    seeded = await createSeededProductForDishTests();
    vegan = await createVeganVegetableProduct();
    driver = await createDriver();
  });

  after(async function () {
    this.timeout(120_000);
    await deleteDishesByNameSubstring(marker);
    await driver.quit().catch(() => undefined);
    await deleteProductById(vegan.id).catch(() => undefined);
    await deleteProductById(seeded.id).catch(() => undefined);
  });

  beforeEach(async () => {
    await deleteDishesByNameSubstring(marker);
  });

  it("карточки отсортированы по названию", async () => {
    const dishes = new DishesPage(driver);
    const modal = new DishModalPage(driver);
    const nameZ = `${marker}_zzz_sort`;
    const nameA = `${marker}_aaa_sort`;
    await createDish(driver, dishes, modal, nameZ, "FIRST", seeded.id);
    await createDish(driver, dishes, modal, nameA, "FIRST", seeded.id);

    await dishes.goto();
    await dishes.searchByName(marker);

    const titles = await dishes.dishCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 2);
    assert.ok(mine[0]!.includes("aaa"));
    assert.ok(mine[1]!.includes("zzz"));
  });

  it("фильтр по категории блюда", async () => {
    const dishes = new DishesPage(driver);
    const modal = new DishModalPage(driver);
    const nameSoup = `${marker}_soup_cat`;
    const nameFirst = `${marker}_first_cat`;
    await createDish(driver, dishes, modal, nameSoup, "SOUP", seeded.id);
    await createDish(driver, dishes, modal, nameFirst, "FIRST", seeded.id);

    await dishes.goto();
    await dishes.resetListFilters();
    await dishes.searchByName(marker);

    await dishes.setListSelect("dishCategoryFilter", "SOUP");
    let titles = await dishes.dishCardTitles();
    let mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("soup"));

    await dishes.setListSelect("dishCategoryFilter", "FIRST");
    titles = await dishes.dishCardTitles();
    mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("first"));
  });

  it("фильтр «Веган» на списке блюд", async () => {
    const dishes = new DishesPage(driver);
    const modal = new DishModalPage(driver);
    const nameVegan = `${marker}_dish_vegan`;
    const nameOther = `${marker}_dish_meat`;
    await createDish(driver, dishes, modal, nameVegan, "FIRST", vegan.id, true);
    await createDish(driver, dishes, modal, nameOther, "FIRST", seeded.id);

    await dishes.goto();
    await dishes.resetListFilters();
    await dishes.searchByName(marker);

    await dishes.setListFlagCheckbox("dishFlagVegan", true);
    const titles = await dishes.dishCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("vegan"));
  });
});
