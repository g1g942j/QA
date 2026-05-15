import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "mocha";
import { By } from "selenium-webdriver";
import { getBaseUrl } from "../base-url.js";
import { createDriver } from "../driver-factory.js";
import { waitVisible } from "../waits.js";
import { HomePage } from "../pages/home.page.js";
import { ProductsPage } from "../pages/products.page.js";

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
    await (await waitVisible(driver, By.css("a.brand"))).click();
    assert.equal(await (await home.heading()).isDisplayed(), true);
  });

  it("переход на страницу блюд", async () => {
    const home = new HomePage(driver);
    await (await home.openDishesLink()).click();
    const h = await waitVisible(
      driver,
      By.xpath(`//h1[normalize-space(.)="Блюда"]`),
    );
    assert.equal(await h.isDisplayed(), true);
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
    await driver.executeScript(
      "localStorage.removeItem('recipebook-theme');",
    );
    await driver.navigate().refresh();
  });

  afterEach(async () => {
    try {
      const url = await driver.getCurrentUrl();
      if (url.startsWith("http")) {
        await driver.executeScript(
          "localStorage.removeItem('recipebook-theme');",
        );
      }
    } catch {}
  });

  it("клик по переключателю меняет класс темы", async () => {
    const home = new HomePage(driver);
    const before = (await driver.executeScript(
      `return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';`,
    )) as string;
    await (await home.themeToggle()).click();
    const after = (await driver.executeScript(
      `return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';`,
    )) as string;
    assert.notEqual(after, before);
  });
});
