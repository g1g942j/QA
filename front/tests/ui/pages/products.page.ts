import { By, WebDriver, WebElement } from "selenium-webdriver";
import { getBaseUrl } from "../base-url.js";
import { waitVisible } from "../waits.js";

export class ProductsPage {
  constructor(private readonly driver: WebDriver) {}

  async goto(): Promise<void> {
    await this.driver.get(`${getBaseUrl()}/pages/products/products.html`);
  }

  async title() {
    return waitVisible(
      this.driver,
      By.xpath(`//h1[normalize-space(.)="Продукты"]`),
    );
  }

  async openCreateButton() {
    return waitVisible(
      this.driver,
      By.xpath(`//button[contains(normalize-space(.), "Добавить продукт")]`),
    );
  }

  async searchInput() {
    return waitVisible(this.driver, By.id("searchInput"));
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

  async resetListFilters(): Promise<void> {
    const search = await this.searchInput();
    await search.clear();
    await search.sendKeys("");
    await this.driver.executeScript(`
      const el = document.getElementById("searchInput");
      if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
    `);
    await this.setListSelect("categoryFilter", "ALL");
    await this.setListSelect("readinessFilter", "ALL");
    await this.setListSelect("sortBy", "name");
    for (const id of ["flagVegan", "flagGlutenFree", "flagSugarFree"]) {
      await this.setListFlagCheckbox(id, false);
    }
  }

  async productCardTitles(): Promise<string[]> {
    const raw = (await this.driver.executeScript(
      `return [...document.querySelectorAll('#productsGrid .project-card-title')]
        .map((el) => (el.textContent || '').trim())
        .filter(Boolean);`,
    )) as unknown;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }

  async emptyStateBlock() {
    return this.driver.findElements(By.css(".projects-grid-empty"));
  }

  productCardByNameXPath(name: string): string {
    if (/["']/.test(name)) {
      throw new Error("Имя для XPath не должно содержать кавычки");
    }
    return `//article[contains(@class,"project-card")][contains(normalize-space(.), "${name}")]`;
  }

  async productCardByName(name: string): Promise<WebElement> {
    return waitVisible(this.driver, By.xpath(this.productCardByNameXPath(name)));
  }

  async productCardsByName(name: string): Promise<WebElement[]> {
    return this.driver.findElements(By.xpath(this.productCardByNameXPath(name)));
  }

  async deleteButtonForCard(card: WebElement) {
    return card.findElement(By.xpath(`.//button[contains(normalize-space(.), "Удалить")]`));
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
    return waitVisible(this.driver, By.id("productDeleteConfirmBtn"));
  }

  async waitProductDeleteModal(): Promise<void> {
    await waitVisible(this.driver, By.id("productDeleteModalBackdrop"));
  }

  async productDeleteModalTitleText(): Promise<string> {
    const el = await waitVisible(this.driver, By.id("productDeleteModalTitle"));
    return (await el.getText()).trim();
  }

  async productDeleteConfirmButtonHidden(): Promise<boolean> {
    return (await this.driver.executeScript(
      `
      const b = document.getElementById('productDeleteConfirmBtn');
      return Boolean(b && (b.hidden || b.getAttribute('hidden') !== null));
      `,
    )) as boolean;
  }

  async clickProductDeleteModalCancel(): Promise<void> {
    const btn = await waitVisible(this.driver, By.id("productDeleteCancelBtn"));
    await btn.click();
  }

  async waitProductViewModal(): Promise<void> {
    await waitVisible(this.driver, By.id("productViewModalBackdrop"));
  }

  async productViewBodyText(): Promise<string> {
    const el = await waitVisible(this.driver, By.id("productViewBody"));
    return (await el.getText()).trim();
  }

  async clickProductViewClose(): Promise<void> {
    const btn = await waitVisible(this.driver, By.id("productViewCloseBtn"));
    await btn.click();
  }
}
