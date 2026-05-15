import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "mocha";
import { WebDriver } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage } from "../waits.js";
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
    await dishes.openCreateModal();
    await dishModal.fillMinimalSavable(dishName, "SOUP", "100", productId);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо создано", 25_000);

    const products = new ProductsPage(driver);
    await products.goto();

    const card = await products.productCardByName(prodName);
    await (await products.deleteButtonForCard(card)).click();
    await products.waitProductDeleteModal();
    const title = await products.productDeleteModalTitleText();
    assert.ok(title.includes("нельзя удалить"));
    assert.equal(await products.productDeleteConfirmButtonHidden(), true);
    const names = await products.productDeleteModalDishNames();
    assert.ok(names.length >= 1);
    assert.ok(names.some((n) => n.includes(dishName)));
    await products.clickProductDeleteModalCancel();
  });

  it("снятие «Веган» с продукта снимает тег с блюда, где он в составе", async function () {
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
    await dishes.openCreateModal();
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
    const cardBefore = await dishes.dishCardByName(dishName);
    assert.ok((await cardBefore.getText()).includes("Веган"));

    const products = new ProductsPage(driver);
    const productModal = new ProductModalPage(driver);
    await products.goto();
    const meatCard = await products.productCardByName(meatName);
    await (await products.editButtonForCard(meatCard)).click();
    await productModal.waitOpen();
    await productModal.setFormFlagVegan(false);
    await (await productModal.saveButton()).click();
    await waitTextInPage(driver, "Продукт обновлён", 25_000);

    await dishes.goto();
    await dishes.searchByName(dishName);
    const cardAfter = await dishes.dishCardByName(dishName);
    assert.equal((await cardAfter.getText()).includes("Веган"), false);
  });
});
