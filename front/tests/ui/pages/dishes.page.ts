import { By, WebDriver, WebElement } from "selenium-webdriver";
import { getBaseUrl } from "../base-url.js";
import { waitVisible } from "../waits.js";

export class DishesPage {
  constructor(private readonly driver: WebDriver) {}

  async goto(): Promise<void> {
    await this.driver.get(`${getBaseUrl()}/pages/dishes/dishes.html`);
  }

  async title() {
    return waitVisible(
      this.driver,
      By.xpath(`//h1[normalize-space(.)="Блюда"]`),
    );
  }

  async openCreateButton() {
    return waitVisible(
      this.driver,
      By.xpath(`//button[contains(normalize-space(.), "Добавить блюдо")]`),
    );
  }

  async openCreateModal(): Promise<void> {
    await (await this.openCreateButton()).click();
    await waitVisible(this.driver, By.id("dishModalBackdrop"));
  }

  async searchInput() {
    return waitVisible(this.driver, By.id("dishSearchInput"));
  }

  async setListSelect(selectId: string, value: string): Promise<void> {
    await this.driver.executeScript(
      `
      const s = document.getElementById(arguments[0]);
      if (!s) throw new Error('No select #' + arguments[0]);
      s.value = arguments[1];
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new Event('change', { bubbles: true }));
      `,
      selectId,
      value,
    );
  }

  async setListFlagCheckbox(elementId: string, checked: boolean): Promise<void> {
    await this.driver.executeScript(
      `
      const el = document.getElementById(arguments[0]);
      if (!(el instanceof HTMLInputElement)) throw new Error('no checkbox #' + arguments[0]);
      el.checked = arguments[1];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      `,
      elementId,
      checked,
    );
  }

  async searchByName(name: string): Promise<void> {
    const search = await this.searchInput();
    await search.clear();
    await search.sendKeys(name);
    await this.driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (!el) throw new Error("dishSearchInput missing");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
  }

  async resetListFilters(): Promise<void> {
    const search = await this.searchInput();
    await search.clear();
    await this.driver.executeScript(`
      const el = document.getElementById("dishSearchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    await this.setListSelect("dishCategoryFilter", "ALL");
    for (const id of ["dishFlagVegan", "dishFlagGlutenFree", "dishFlagSugarFree"]) {
      await this.setListFlagCheckbox(id, false);
    }
  }

  async dishCardTitles(): Promise<string[]> {
    const raw = (await this.driver.executeScript(
      `return [...document.querySelectorAll('#dishesGrid .project-card-title')]
        .map((el) => (el.textContent || '').trim())
        .filter(Boolean);`,
    )) as unknown;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }

  async emptyStateBlock() {
    return this.driver.findElements(By.css(".projects-grid-empty"));
  }

  dishCardByNameXPath(name: string): string {
    if (/["']/.test(name)) {
      throw new Error("Имя для XPath не должно содержать кавычки");
    }
    return `//article[contains(@class,"project-card")][contains(normalize-space(.), "${name}")]`;
  }

  async dishCardByName(name: string): Promise<WebElement> {
    return waitVisible(this.driver, By.xpath(this.dishCardByNameXPath(name)));
  }

  async dishCardsByName(name: string): Promise<WebElement[]> {
    return this.driver.findElements(By.xpath(this.dishCardByNameXPath(name)));
  }

  async deleteButtonForCard(card: WebElement) {
    return card.findElement(
      By.xpath(`.//button[contains(normalize-space(.), "Удалить")]`),
    );
  }

  async viewButtonForCard(card: WebElement) {
    return card.findElement(
      By.xpath(`.//button[contains(normalize-space(.), "Подробнее")]`),
    );
  }

  async editButtonForCard(card: WebElement) {
    return card.findElement(
      By.xpath(`.//button[contains(normalize-space(.), "Редактировать")]`),
    );
  }

  async deleteConfirmButton() {
    return waitVisible(this.driver, By.id("dishDeleteConfirmBtn"));
  }

  async waitDishViewModal(): Promise<void> {
    await waitVisible(this.driver, By.id("dishViewModalBackdrop"));
  }

  async dishViewBodyText(): Promise<string> {
    const el = await waitVisible(this.driver, By.id("dishViewBody"));
    return (await el.getText()).trim();
  }

  async clickDishViewClose(): Promise<void> {
    const btn = await waitVisible(this.driver, By.id("dishViewCloseBtn"));
    await btn.click();
  }
}
