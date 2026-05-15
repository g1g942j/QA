import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "mocha";
import { createDriver } from "../driver-factory.js";
import { getBaseUrl } from "../base-url.js";
import { HomePage } from "../pages/home.page.js";
import { ProductsPage } from "../pages/products.page.js";
import { DishesPage } from "../pages/dishes.page.js";

describe("Система RecipeBook — главная и навигация", () => {
  let driver: import("selenium-webdriver").WebDriver;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
  });

  after(async () => {
    await driver?.quit();
  });

  beforeEach(async () => {
    const home = new HomePage(driver);
    await home.goto();
  });

  it("отображается заголовок и разделы «Продукты» и «Блюда»", async () => {
    const home = new HomePage(driver);
    assert.equal(await (await home.heading()).isDisplayed(), true);
    assert.equal(await (await home.openProductsLink()).isDisplayed(), true);
    assert.equal(await (await home.openDishesLink()).isDisplayed(), true);
  });

  it("переход на страницу продуктов и обратно на главную", async () => {
    const home = new HomePage(driver);
    const products = new ProductsPage(driver);
    await (await home.openProductsLink()).click();
    assert.equal(await (await products.title()).isDisplayed(), true);
    await products.clickBrand();
    assert.equal(await (await home.heading()).isDisplayed(), true);
  });

  it("переход на страницу блюд", async () => {
    const home = new HomePage(driver);
    const dishes = new DishesPage(driver);
    await (await home.openDishesLink()).click();
    assert.equal(await (await dishes.title()).isDisplayed(), true);
  });
});

describe("Система RecipeBook — переключатель темы", () => {
  let driver: import("selenium-webdriver").WebDriver;

  before(async function () {
    this.timeout(120_000);
    driver = await createDriver();
  });

  after(async () => {
    await driver?.quit();
  });

  beforeEach(async () => {
    await driver.get(`${getBaseUrl()}/index.html`);
    await new HomePage(driver).resetThemePreference();
  });

  it("клик по переключателю меняет класс темы", async () => {
    const home = new HomePage(driver);
    const before = await home.currentTheme();
    await (await home.themeToggle()).click();
    const after = await home.currentTheme();
    assert.notEqual(after, before);
  });
});
