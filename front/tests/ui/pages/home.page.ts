import { By, WebDriver } from "selenium-webdriver";
import { getBaseUrl } from "../base-url.js";
import { waitVisible } from "../waits.js";

export class HomePage {
  constructor(private readonly driver: WebDriver) {}

  async goto(): Promise<void> {
    await this.driver.get(`${getBaseUrl()}/index.html`);
  }

  async heading() {
    return waitVisible(
      this.driver,
      By.xpath(`//h1[contains(normalize-space(.), "Управление рецептами")]`),
    );
  }

  async openProductsLink() {
    return waitVisible(
      this.driver,
      By.xpath(`//a[contains(normalize-space(.), "Открыть продукты")]`),
    );
  }

  async openDishesLink() {
    return waitVisible(
      this.driver,
      By.xpath(`//a[contains(normalize-space(.), "Открыть блюда")]`),
    );
  }

  async themeToggle() {
    return waitVisible(
      this.driver,
      By.css("#themeToggle"),
    );
  }

  async currentTheme(): Promise<"light" | "dark"> {
    return (await this.driver.executeScript(
      `return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';`,
    )) as "light" | "dark";
  }

  async resetThemePreference(): Promise<void> {
    await this.driver.executeScript(
      "localStorage.removeItem('recipebook-theme');",
    );
    await this.driver.navigate().refresh();
  }
}
