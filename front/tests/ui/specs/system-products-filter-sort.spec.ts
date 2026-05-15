import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "mocha";
import { By, WebDriver } from "selenium-webdriver";
import { createDriver } from "../driver-factory.js";
import { waitTextInPage, waitVisible } from "../waits.js";
import { ProductsPage } from "../pages/products.page.js";
import { ProductModalPage } from "../pages/product-modal.page.js";
import { deleteProductsByNameSubstring } from "../test-data/api-cleanup.js";

async function createProduct(
  driver: WebDriver,
  products: ProductsPage,
  modal: ProductModalPage,
  name: string,
  category: string,
  readiness: string,
  macros: { calories: string; proteins: string; fats: string; carbs: string },
  vegan = false,
): Promise<void> {
  await products.goto();
  await (await products.openCreateButton()).click();
  await waitVisible(driver, By.id("productModalBackdrop"));
  const nameEl = await modal.nameInput();
  await nameEl.clear();
  await nameEl.sendKeys(name);
  await modal.fillRequiredSelects(category, readiness);
  await modal.fillMacros(macros);
  if (vegan) await modal.setFormFlagVegan(true);
  await (await modal.saveButton()).click();
  await waitTextInPage(driver, "Продукт создан", 25_000);
}

describe("Продукты — фильтры и сортировка", () => {
  let driver!: WebDriver;
  let marker!: string;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
    marker = `UI_PFS_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  });

  after(async () => {
    await deleteProductsByNameSubstring(marker);
    await driver.quit().catch(() => undefined);
  });

  beforeEach(async () => {
    await deleteProductsByNameSubstring(marker);
  });

  it("фильтр по категории: только выбранная категория", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameMeat = `${marker}_meat_row`;
    const nameSweets = `${marker}_sweets_row`;
    await createProduct(driver, products, modal, nameMeat, "MEAT", "READY_TO_EAT", {
      calories: "80",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });
    await createProduct(driver, products, modal, nameSweets, "SWEETS", "READY_TO_EAT", {
      calories: "90",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);

    await products.setListSelect("categoryFilter", "SWEETS");
    let titles = await products.productCardTitles();
    let mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("sweets"));

    await products.setListSelect("categoryFilter", "MEAT");
    titles = await products.productCardTitles();
    mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("meat"));
  });

  it("фильтр по готовности", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameReady = `${marker}_ready_row`;
    const nameCook = `${marker}_cook_row`;
    await createProduct(driver, products, modal, nameReady, "GRAINS", "READY_TO_EAT", {
      calories: "70",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });
    await createProduct(driver, products, modal, nameCook, "GRAINS", "REQUIRES_COOKING", {
      calories: "71",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);

    await products.setListSelect("readinessFilter", "REQUIRES_COOKING");
    let titles = await products.productCardTitles();
    let mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("cook"));

    await products.setListSelect("readinessFilter", "READY_TO_EAT");
    titles = await products.productCardTitles();
    mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("ready"));
  });

  it("фильтр «Веган» на списке", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameNorm = `${marker}_norm_veg`;
    const nameVeg = `${marker}_veg_veg`;
    await createProduct(driver, products, modal, nameNorm, "MEAT", "READY_TO_EAT", {
      calories: "60",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });
    await createProduct(
      driver,
      products,
      modal,
      nameVeg,
      "VEGETABLES",
      "READY_TO_EAT",
      {
        calories: "61",
        proteins: "10",
        fats: "10",
        carbs: "10",
      },
      true,
    );

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);

    await products.setListFlagCheckbox("flagVegan", true);
    const titles = await products.productCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 1);
    assert.ok(mine[0]!.includes("veg_veg"));
  });

  it("сортировка по названию (locale ru)", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameZ = `${marker}_zzz_sort`;
    const nameA = `${marker}_aaa_sort`;
    await createProduct(driver, products, modal, nameZ, "MEAT", "READY_TO_EAT", {
      calories: "50",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });
    await createProduct(driver, products, modal, nameA, "MEAT", "READY_TO_EAT", {
      calories: "51",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    await products.setListSelect("sortBy", "name");

    const titles = await products.productCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 2);
    assert.ok(mine[0]!.includes("aaa"));
    assert.ok(mine[1]!.includes("zzz"));
  });

  it("сортировка по калорийности: по убыванию", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameLow = `${marker}_cal_low`;
    const nameHigh = `${marker}_cal_high`;
    await createProduct(driver, products, modal, nameLow, "MEAT", "READY_TO_EAT", {
      calories: "10",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });
    await createProduct(driver, products, modal, nameHigh, "MEAT", "READY_TO_EAT", {
      calories: "500",
      proteins: "10",
      fats: "10",
      carbs: "10",
    });

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    await products.setListSelect("sortBy", "calories");

    const titles = await products.productCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 2);
    assert.ok(mine[0]!.includes("high"));
    assert.ok(mine[1]!.includes("low"));
  });

  it("сортировка по белкам: по убыванию", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameLow = `${marker}_prot_low`;
    const nameHigh = `${marker}_prot_high`;
    await createProduct(driver, products, modal, nameLow, "MEAT", "READY_TO_EAT", {
      calories: "100",
      proteins: "5",
      fats: "10",
      carbs: "10",
    });
    await createProduct(driver, products, modal, nameHigh, "MEAT", "READY_TO_EAT", {
      calories: "100",
      proteins: "90",
      fats: "5",
      carbs: "5",
    });

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    await products.setListSelect("sortBy", "proteins");

    const titles = await products.productCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 2);
    assert.ok(mine[0]!.includes("high"));
    assert.ok(mine[1]!.includes("low"));
  });

  it("сортировка по жирам: по убыванию", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameLow = `${marker}_fat_low`;
    const nameHigh = `${marker}_fat_high`;
    await createProduct(driver, products, modal, nameLow, "MEAT", "READY_TO_EAT", {
      calories: "100",
      proteins: "10",
      fats: "5",
      carbs: "10",
    });
    await createProduct(driver, products, modal, nameHigh, "MEAT", "READY_TO_EAT", {
      calories: "100",
      proteins: "5",
      fats: "90",
      carbs: "5",
    });

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    await products.setListSelect("sortBy", "fats");

    const titles = await products.productCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 2);
    assert.ok(mine[0]!.includes("high"));
    assert.ok(mine[1]!.includes("low"));
  });

  it("сортировка по углеводам: по убыванию", async () => {
    const products = new ProductsPage(driver);
    const modal = new ProductModalPage(driver);
    const nameLow = `${marker}_carb_low`;
    const nameHigh = `${marker}_carb_high`;
    await createProduct(driver, products, modal, nameLow, "MEAT", "READY_TO_EAT", {
      calories: "100",
      proteins: "10",
      fats: "10",
      carbs: "5",
    });
    await createProduct(driver, products, modal, nameHigh, "MEAT", "READY_TO_EAT", {
      calories: "100",
      proteins: "5",
      fats: "5",
      carbs: "90",
    });

    await products.goto();
    await products.resetListFilters();
    const search = await products.searchInput();
    await search.clear();
    await search.sendKeys(marker);
    await driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    await products.setListSelect("sortBy", "carbs");

    const titles = await products.productCardTitles();
    const mine = titles.filter((t) => t.includes(marker));
    assert.equal(mine.length, 2);
    assert.ok(mine[0]!.includes("high"));
    assert.ok(mine[1]!.includes("low"));
  });
});
