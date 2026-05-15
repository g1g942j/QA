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

  it("редактирование продукта: имя и калории сохраняются в карточке", async function () {
    this.timeout(120_000);
    const name1 = `${marker}_pe_one`;
    const name2 = `${marker}_pe_two`;
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    await products.goto();
    await (await products.openCreateButton()).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
    await modal.fillValidBaseline(name1);
    await (await modal.saveButton()).click();
    await waitTextInPage(driver, "Продукт создан", 25_000);

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(name1);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const card = await products.productCardByName(name1);
    await (await products.editButtonForCard(card)).click();
    await waitVisible(driver, By.id("productModalBackdrop"));
    assert.ok((await modal.modalTitleText()).includes("Редактировать"));
    const nameEl = await modal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys(name2);
    const cal = await modal.caloriesInput();
    await cal.clear();
    await cal.sendKeys("222");
    await (await modal.saveButton()).click();
    await waitTextInPage(driver, "Продукт обновлён", 25_000);

    await products.goto();
    await products.resetListFilters();
    const s2 = await products.searchInput();
    await s2.clear();
    await s2.sendKeys(name2);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const updated = await products.productCardByName(name2);
    assert.ok((await updated.getText()).includes("222"));
  });

  it("редактирование блюда: имя в карточке обновляется", async function () {
    this.timeout(120_000);
    const ingName = `${marker}_ing_ed`;
    const d1 = `${marker}_dish_ed1`;
    const d2 = `${marker}_dish_ed2`;
    const { id: pid } = await apiCreateProduct({
      name: ingName,
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
    await dishModal.fillMinimalSavable(d1, "FIRST", "100", pid);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо создано", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s = await dishes.searchInput();
    await s.clear();
    await s.sendKeys(d1);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    const card = await dishes.dishCardByName(d1);
    await (await dishes.editButtonForCard(card)).click();
    await waitVisible(driver, By.id("dishModalBackdrop"));
    assert.ok((await dishModal.modalTitleText()).includes("Редактировать"));
    const nameEl = await dishModal.nameInput();
    await nameEl.clear();
    await nameEl.sendKeys(d2);
    await (await dishModal.saveButton()).click();
    await waitTextInPage(driver, "Блюдо обновлено", 25_000);

    await dishes.goto();
    await dishes.resetListFilters();
    const s2 = await dishes.searchInput();
    await s2.clear();
    await s2.sendKeys(d2);
    await driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    assert.equal(await (await dishes.dishCardByName(d2)).isDisplayed(), true);
  });

  it("успешное удаление продукта из списка", async function () {
    this.timeout(120_000);
    const name = `${marker}_del_p`;
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
    await (await products.deleteButtonForCard(card)).click();
    await products.waitProductDeleteModal();
    assert.equal(await products.productDeleteConfirmButtonHidden(), false);
    await (await products.deleteConfirmButton()).click();
    await driver.wait(async () => {
      const again = await products.productCardsByName(name);
      return again.length === 0;
    }, 20_000);
  });

  it("успешное удаление блюда из списка", async function () {
    this.timeout(120_000);
    const ing = `${marker}_ing_del_d`;
    const dish = `${marker}_del_d`;
    const { id: pid } = await apiCreateProduct({
      name: ing,
      photos: [],
      calories: 80,
      proteins: 10,
      fats: 10,
      carbs: 10,
      composition: null,
      category: "GRAINS",
      degreeReadiness: "READY_TO_EAT",
      flags: [],
    });

    const dishes = new DishesPage(driver);
    const dishModal = new DishModalPage(driver);
    await dishes.goto();
    await (await dishes.openCreateButton()).click();
    await waitVisible(driver, By.id("dishModalBackdrop"));
    await dishModal.fillMinimalSavable(dish, "SNACK", "100", pid);
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
    await (await dishes.deleteButtonForCard(card)).click();
    await waitVisible(driver, By.id("dishDeleteModalBackdrop"));
    await (await dishes.deleteConfirmButton()).click();
    await driver.wait(async () => {
      const again = await dishes.dishCardsByName(dish);
      return again.length === 0;
    }, 20_000);
  });

  it("просмотр карточки продукта: модалка с полями", async function () {
    this.timeout(120_000);
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
    this.timeout(120_000);
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
      await driver.wait(async () => (await modal.productPhotoChipCount()) >= 5, 120_000);
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
      assert.equal(await (await products.productCardByName(name)).isDisplayed(), true);
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
      await driver.wait(async () => (await modal.productPhotoChipCount()) >= 5, 120_000);
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
      await driver.wait(async () => (await dishModal.dishPhotoChipCount()) >= 5, 120_000);
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
      assert.equal(await (await dishes.dishCardByName(dish)).isDisplayed(), true);
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
      await driver.wait(async () => (await dishModal.dishPhotoChipCount()) >= 5, 120_000);
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
