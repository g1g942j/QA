import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "mocha";
import { By, WebDriver } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage, waitVisible } from "../waits.js";
import { ProductsPage } from "../pages/products.page.js";
import { ProductModalPage } from "../pages/product-modal.page.js";
import { DishesPage } from "../pages/dishes.page.js";
import { DishModalPage } from "../pages/dish-modal.page.js";
import { getRecipeBookApiOrigin } from "../test-data/seed-product.js";
import {
  deleteDishesByNameSubstring,
  deleteProductsByNameSubstring,
} from "../test-data/api-cleanup.js";

async function apiCreateProduct(
  body: Record<string, unknown>,
): Promise<{ id: number; name: string }> {
  const res = await fetch(`${getRecipeBookApiOrigin()}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `POST /api/products → ${res.status} ${await res.text().catch(() => "")}`,
    );
  }
  const json = (await res.json()) as { id: number; name: string };
  if (typeof json.id !== "number" || typeof json.name !== "string") {
    throw new Error("POST /api/products: неверный ответ");
  }
  return json;
}

describe("Продукты и блюда — связка", () => {
  let driver!: WebDriver;
  let marker!: string;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
    marker = `UI_PDI_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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

  it("продукт, входящий в блюдо, нельзя удалить из списка", async function () {
    this.timeout(120_000);
    const prodName = `${marker}_only_ingredient`;
    const dishName = `${marker}_one_dish`;
    const { id: productId } = await apiCreateProduct({
      name: prodName,
      photos: [],
      calories: 100,
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
    await dishModal.fillMinimalSavable(dishName, "SOUP", "100", productId);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо создано", 25_000);

    const products = new ProductsPage(driver);
    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);

    const card = await products.productCardByName(prodName);
    await (await products.deleteButtonForCard(card)).click();
    await products.waitProductDeleteModal();
    const title = await products.productDeleteModalTitleText();
    assert.ok(title.includes("нельзя удалить"));
    assert.equal(await products.productDeleteConfirmButtonHidden(), true);
    const listItems = await driver.findElements(By.css("#productDeleteModalList li"));
    assert.ok(listItems.length >= 1);
    const names: string[] = [];
    for (const li of listItems) names.push((await li.getText()).trim());
    assert.ok(names.some((n) => n.includes(dishName)));
    await products.clickProductDeleteModalCancel();
  });

  it("снятие «Веган» с продукта снимает тег с блюда, где он в составе", async function () {
    this.timeout(120_000);
    const beetName = `${marker}_beet`;
    const meatName = `${marker}_meat_errvegan`;
    const dishName = `${marker}_borsch`;
    const beet = await apiCreateProduct({
      name: beetName,
      photos: [],
      calories: 40,
      proteins: 10,
      fats: 5,
      carbs: 10,
      composition: null,
      category: "VEGETABLES",
      degreeReadiness: "READY_TO_EAT",
      flags: ["VEGAN"],
    });
    const meat = await apiCreateProduct({
      name: meatName,
      photos: [],
      calories: 200,
      proteins: 15,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "MEAT",
      degreeReadiness: "READY_TO_EAT",
      flags: ["VEGAN"],
    });

    const dishes = new DishesPage(driver);
    const dishModal = new DishModalPage(driver);
    await dishes.goto();
    await (await dishes.openCreateButton()).click();
    await waitVisible(driver, By.id("dishModalBackdrop"));
    await dishModal.fillMinimalSavable(dishName, "FIRST", "50", beet.id);
    await dishModal.addSecondIngredient(meat.id, "50");
    try {
      await driver.wait(async () => {
        const ps = await dishModal.portionSizeInput();
        const v = await ps.getAttribute("value");
        return Boolean(v && v.trim().length > 0);
      }, 10_000);
    } catch {
      await dishModal.setNumericFieldRaw("portionSize", "100");
    }
    await dishModal.setDishFormFlagVegan(true);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо создано", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s = await dishes.searchInput();
    await s.clear();
    await s.sendKeys(dishName);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const cardBefore = await dishes.dishCardByName(dishName);
    assert.ok((await cardBefore.getText()).includes("Веган"));

    const products = new ProductsPage(driver);
    const productModal = new ProductModalPage(driver);
    await products.goto();
    await products.resetListFilters();
    const ps = await products.searchInput();
    await ps.clear();
    await ps.sendKeys(meatName);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const meatCard = await products.productCardByName(meatName);
    await (await products.editButtonForCard(meatCard)).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
    await productModal.setFormFlagVegan(false);
    await (await productModal.saveButton()).click();
    await waitTextInPage(driver, "Продукт обновлён", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s2 = await dishes.searchInput();
    await s2.clear();
    await s2.sendKeys(dishName);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const cardAfter = await dishes.dishCardByName(dishName);
    assert.equal((await cardAfter.getText()).includes("Веган"), false);
  });

  it("снятие «Без глютена» с продукта снимает тег с блюда", async function () {
    this.timeout(120_000);
    const aName = `${marker}_gfree_a`;
    const bName = `${marker}_gfree_b`;
    const dishName = `${marker}_dish_gfree`;
    const a = await apiCreateProduct({
      name: aName,
      photos: [],
      calories: 50,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "GREENS",
      degreeReadiness: "READY_TO_EAT",
      flags: ["GLUTEN_FREE"],
    });
    const b = await apiCreateProduct({
      name: bName,
      photos: [],
      calories: 60,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "CANNED",
      degreeReadiness: "READY_TO_EAT",
      flags: ["GLUTEN_FREE"],
    });

    const dishes = new DishesPage(driver);
    const dishModal = new DishModalPage(driver);
    await dishes.goto();
    await (await dishes.openCreateButton()).click();
    await waitVisible(driver, By.id("dishModalBackdrop"));
    await dishModal.fillMinimalSavable(dishName, "SOUP", "40", a.id);
    await dishModal.addSecondIngredient(b.id, "40");
    try {
      await driver.wait(async () => {
        const ps = await dishModal.portionSizeInput();
        const v = await ps.getAttribute("value");
        return Boolean(v && v.trim().length > 0);
      }, 10_000);
    } catch {
      await dishModal.setNumericFieldRaw("portionSize", "80");
    }
    await dishModal.setDishFormFlagGlutenFree(true);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо создано", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s0 = await dishes.searchInput();
    await s0.clear();
    await s0.sendKeys(dishName);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    assert.ok((await (await dishes.dishCardByName(dishName)).getText()).includes("Без глютена"));

    const products = new ProductsPage(driver);
    const productModal = new ProductModalPage(driver);
    await products.goto();
    await products.resetListFilters();
    const ps = await products.searchInput();
    await ps.clear();
    await ps.sendKeys(bName);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const bCard = await products.productCardByName(bName);
    await (await products.editButtonForCard(bCard)).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
    await productModal.setFormFlagGlutenFree(false);
    await (await productModal.saveButton()).click();
    await waitTextInPage(driver, "Продукт обновлён", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s1 = await dishes.searchInput();
    await s1.clear();
    await s1.sendKeys(dishName);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    assert.equal(
      (await (await dishes.dishCardByName(dishName)).getText()).includes("Без глютена"),
      false,
    );
  });

  it("снятие «Без сахара» с продукта снимает тег с блюда", async function () {
    this.timeout(120_000);
    const aName = `${marker}_sfree_a`;
    const bName = `${marker}_sfree_b`;
    const dishName = `${marker}_dish_sfree`;
    const a = await apiCreateProduct({
      name: aName,
      photos: [],
      calories: 50,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "SWEETS",
      degreeReadiness: "READY_TO_EAT",
      flags: ["SUGAR_FREE"],
    });
    const b = await apiCreateProduct({
      name: bName,
      photos: [],
      calories: 55,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "LIQUID",
      degreeReadiness: "READY_TO_EAT",
      flags: ["SUGAR_FREE"],
    });

    const dishes = new DishesPage(driver);
    const dishModal = new DishModalPage(driver);
    await dishes.goto();
    await (await dishes.openCreateButton()).click();
    await waitVisible(driver, By.id("dishModalBackdrop"));
    await dishModal.fillMinimalSavable(dishName, "DRINK", "30", a.id);
    await dishModal.addSecondIngredient(b.id, "30");
    try {
      await driver.wait(async () => {
        const ps = await dishModal.portionSizeInput();
        const v = await ps.getAttribute("value");
        return Boolean(v && v.trim().length > 0);
      }, 10_000);
    } catch {
      await dishModal.setNumericFieldRaw("portionSize", "60");
    }
    await dishModal.setDishFormFlagSugarFree(true);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо создано", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s0 = await dishes.searchInput();
    await s0.clear();
    await s0.sendKeys(dishName);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    assert.ok((await (await dishes.dishCardByName(dishName)).getText()).includes("Без сахара"));

    const products = new ProductsPage(driver);
    const productModal = new ProductModalPage(driver);
    await products.goto();
    await products.resetListFilters();
    const ps = await products.searchInput();
    await ps.clear();
    await ps.sendKeys(bName);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const bCard = await products.productCardByName(bName);
    await (await products.editButtonForCard(bCard)).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
    await productModal.setFormFlagSugarFree(false);
    await (await productModal.saveButton()).click();
    await waitTextInPage(driver, "Продукт обновлён", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s1 = await dishes.searchInput();
    await s1.clear();
    await s1.sendKeys(dishName);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    assert.equal(
      (await (await dishes.dishCardByName(dishName)).getText()).includes("Без сахара"),
      false,
    );
  });
});
