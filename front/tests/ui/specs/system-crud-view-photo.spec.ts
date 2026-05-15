import assert from "node:assert/strict";
import path from "node:path";
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
import { createTempPngFiles } from "../test-data/photo-fixtures.js";

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
  if (typeof json.id !== "number") throw new Error("bad id");
  return json;
}

describe("Продукты и блюда — CRUD, просмотр, фото", () => {
  let driver!: WebDriver;
  let marker!: string;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
    marker = `UI_CVP_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(name);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
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
    const s = await dishes.searchInput();
    await s.clear();
    await s.sendKeys(dish);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const card = await dishes.dishCardByName(dish);
    await (await dishes.viewButtonForCard(card)).click();
    await dishes.waitDishViewModal();
    const body = await dishes.dishViewBodyText();
    assert.ok(body.includes("Состав"));
    assert.ok(body.includes(ing));
    await dishes.clickDishViewClose();
  });

  it("продукт: загрузка 5 фото и успешное сохранение", async function () {
    this.timeout(180_000);
    const name = `${marker}_p5img`;
    const tmp = createTempPngFiles(5);
    try {
      const products = new ProductsPage(driver);
      const modal = new ProductModalPage(driver);
      await products.goto();
      await (await products.openCreateButton()).click();
      await waitVisible(driver, By.id("productModalBackdrop"));
      const nameEl = await modal.nameInput();
      await nameEl.clear();
      await nameEl.sendKeys(name);
      await modal.fillRequiredSelects("MEAT", "READY_TO_EAT");
      await modal.fillMacros({
        calories: "50",
        proteins: "10",
        fats: "10",
        carbs: "10",
      });
      const input = await modal.productPhotoFileInput();
      const joined = tmp.paths.map((p) => path.resolve(p)).join("\n");
      await input.sendKeys(joined);
      await driver.wait(
        async () => (await modal.productPhotoChipCount()) >= 5,
        120_000,
      );
      assert.equal(await modal.productPhotoChipCount(), 5);
      await (await modal.saveButton()).click();
      await waitTextInPage(driver, "Продукт создан", 25_000);
      await products.goto();
      await products.resetListFilters();
      const search = await products.searchInput();
      await search.clear();
      await search.sendKeys(name);
      await driver.executeScript(`
        const el = document.getElementById("searchInput");
        if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
      `);
      assert.equal(
        await (await products.productCardByName(name)).isDisplayed(),
        true,
      );
    } finally {
      tmp.dispose();
    }
  });

  it("продукт: шестой файл не добавляется (лимит 5)", async function () {
    this.timeout(180_000);
    const name = `${marker}_p6img`;
    const tmp = createTempPngFiles(6);
    try {
      const products = new ProductsPage(driver);
      const modal = new ProductModalPage(driver);
      await products.goto();
      await (await products.openCreateButton()).click();
      await waitVisible(driver, By.id("productModalBackdrop"));
      const nameEl = await modal.nameInput();
      await nameEl.clear();
      await nameEl.sendKeys(name);
      await modal.fillRequiredSelects("MEAT", "READY_TO_EAT");
      await modal.fillMacros({
        calories: "50",
        proteins: "10",
        fats: "10",
        carbs: "10",
      });
      const input = await modal.productPhotoFileInput();
      await input.sendKeys(
        tmp.paths
          .slice(0, 5)
          .map((p) => path.resolve(p))
          .join("\n"),
      );
      await driver.wait(
        async () => (await modal.productPhotoChipCount()) >= 5,
        120_000,
      );
      assert.equal(await modal.productPhotoChipCount(), 5);
      await input.sendKeys(path.resolve(tmp.paths[5]!));
      await driver.wait(async () => {
        const root = await driver.findElements(By.id("toastRoot"));
        if (!root.length) return false;
        const t = await root[0]!.getText();
        return t.includes("Не больше 5");
      }, 15_000);
      assert.equal(await modal.productPhotoChipCount(), 5);
      await (await modal.cancelButton()).click();
    } finally {
      tmp.dispose();
    }
  });

  it("блюдо: загрузка 5 фото и успешное сохранение", async function () {
    this.timeout(180_000);
    const ing = `${marker}_ing_d5`;
    const dish = `${marker}_d5img`;
    const { id: pid } = await apiCreateProduct({
      name: ing,
      photos: [],
      calories: 70,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "MEAT",
      degreeReadiness: "READY_TO_EAT",
      flags: [],
    });
    const tmp = createTempPngFiles(5);
    try {
      const dishes = new DishesPage(driver);
      const dishModal = new DishModalPage(driver);
      await dishes.goto();
      await (await dishes.openCreateButton()).click();
      await waitVisible(driver, By.id("dishModalBackdrop"));
      await dishModal.fillMinimalSavable(dish, "FIRST", "100", pid);
      const input = await dishModal.dishPhotoFileInput();
      const joined = tmp.paths.map((p) => path.resolve(p)).join("\n");
      await input.sendKeys(joined);
      await driver.wait(
        async () => (await dishModal.dishPhotoChipCount()) >= 5,
        120_000,
      );
      assert.equal(await dishModal.dishPhotoChipCount(), 5);
      await (await dishModal.saveButton()).click();
      await waitTextInPage(driver, "Блюдо создано", 25_000);
      await dishes.goto();
      await dishes.resetListFilters();
      const s = await dishes.searchInput();
      await s.clear();
      await s.sendKeys(dish);
      await driver.executeScript(`
        const el = document.getElementById("dishSearchInput");
        if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
      `);
      assert.equal(
        await (await dishes.dishCardByName(dish)).isDisplayed(),
        true,
      );
    } finally {
      tmp.dispose();
    }
  });

  it("блюдо: шестой файл не добавляется (лимит 5)", async function () {
    this.timeout(180_000);
    const ing = `${marker}_ing_d6`;
    const dish = `${marker}_d6img`;
    const { id: pid } = await apiCreateProduct({
      name: ing,
      photos: [],
      calories: 70,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "MEAT",
      degreeReadiness: "READY_TO_EAT",
      flags: [],
    });
    const tmp = createTempPngFiles(6);
    try {
      const dishes = new DishesPage(driver);
      const dishModal = new DishModalPage(driver);
      await dishes.goto();
      await (await dishes.openCreateButton()).click();
      await waitVisible(driver, By.id("dishModalBackdrop"));
      await dishModal.fillMinimalSavable(dish, "FIRST", "100", pid);
      const input = await dishModal.dishPhotoFileInput();
      await input.sendKeys(
        tmp.paths
          .slice(0, 5)
          .map((p) => path.resolve(p))
          .join("\n"),
      );
      await driver.wait(
        async () => (await dishModal.dishPhotoChipCount()) >= 5,
        120_000,
      );
      assert.equal(await dishModal.dishPhotoChipCount(), 5);
      await input.sendKeys(path.resolve(tmp.paths[5]!));
      await driver.wait(async () => {
        const root = await driver.findElements(By.id("toastRoot"));
        if (!root.length) return false;
        const t = await root[0]!.getText();
        return t.includes("Не больше 5");
      }, 15_000);
      assert.equal(await dishModal.dishPhotoChipCount(), 5);
      await (await dishModal.cancelButton()).click();
    } finally {
      tmp.dispose();
    }
  });
});
