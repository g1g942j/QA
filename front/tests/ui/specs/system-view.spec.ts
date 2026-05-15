import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "mocha";
import { By, WebDriver } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage, waitVisible } from "../waits.js";
import { ProductsPage } from "../pages/products.page.js";
import { ProductModalPage } from "../pages/product-modal.page.js";
import { DishesPage } from "../pages/dishes.page.js";
import { DishModalPage } from "../pages/dish-modal.page.js";
import { apiCreateProduct } from "../test-data/api-create-product.js";
import {
  deleteDishesByNameSubstring,
  deleteProductsByNameSubstring,
} from "../test-data/api-cleanup.js";

describe("Продукты и блюда — просмотр карточек", () => {
  let driver!: WebDriver;
  let marker!: string;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
    marker = `UI_VIEW_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  });

  after(async () => {
    await deleteDishesByNameSubstring(marker);
    await deleteProductsByNameSubstring(marker);
    await driver.quit().catch(() => undefined);
  });

  beforeEach(async () => {
    await deleteDishesByNameSubstring(marker);
    await deleteProductsByNameSubstring(marker);
  });

  it("просмотр карточки продукта: модалка с полями", async function () {
    const name = `${marker}_view_p`;
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    await products.goto();
    await (await products.openCreateButton()).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
    await modal.fillValidBaseline(name);
    await (await modal.saveButton()).click();
    await waitTextInPage(driver, "Продукт создан", 25_000);

    await products.goto();
    await products.resetListFilters();
    await products.searchByName(name);
    const card = await products.productCardByName(name);
    await (await products.viewButtonForCard(card)).click();
    await products.waitProductViewModal();
    const body = await products.productViewBodyText();
    assert.ok(body.includes("Калории"));
    assert.ok(body.includes("Категория"));
    await products.clickProductViewClose();
  });

  it("просмотр карточки блюда: модалка с составом", async function () {
    const ing = `${marker}_ing_view`;
    const dish = `${marker}_view_d`;
    const { id: pid } = await apiCreateProduct({
      name: ing,
      photos: [],
      calories: 90,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "MEAT",
      degreeReadiness: "READY_TO_EAT",
      flags: [],
    });

    const dishes = new DishesPage(driver);
    const dishModal = new DishModalPage(driver);
    await dishes.goto();
    await (await dishes.openCreateButton()).click();
    await waitVisible(driver, By.id("dishModalBackdrop"));
    await dishModal.fillMinimalSavable(dish, "SECOND", "100", pid);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо создано", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    await dishes.searchByName(dish);
    const card = await dishes.dishCardByName(dish);
    await (await dishes.viewButtonForCard(card)).click();
    await dishes.waitDishViewModal();
    const body = await dishes.dishViewBodyText();
    assert.ok(body.includes("Состав"));
    assert.ok(body.includes(ing));
    await dishes.clickDishViewClose();
  });
});
