import { Page, Locator, expect } from '@playwright/test';
import { FLEET_VIRT_SAVED_SEARCH } from '@constants/fleet-virt';

/**
 * Fleet Virtualization Saved Searches component.
 *
 * Per architecture doc: components expose locators, tests assert.
 * Internal expect() usage is limited to wait guards (modal open/close,
 * button enabled state) needed for reliable interaction.
 */
export class SavedSearches {
  constructor(private readonly page: Page) {}

  async saveSearch(name: string, description: string): Promise<void> {
    await this.page.getByRole('button', { name: FLEET_VIRT_SAVED_SEARCH.saveButton }).click();

    await expect(
      this.page.getByRole('heading', { name: 'Save search' })
    ).toBeVisible({ timeout: 5000 });

    const nameInput = this.page.locator(FLEET_VIRT_SAVED_SEARCH.modal.nameInput);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(name);

    const descInput = this.page.locator(FLEET_VIRT_SAVED_SEARCH.modal.descriptionInput);
    await descInput.fill(description);

    const saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeEnabled({ timeout: 3000 });
    await saveButton.click();

    await expect(
      this.page.getByRole('heading', { name: 'Save search' })
    ).toBeHidden({ timeout: 5000 });

    await expect(
      this.page.getByRole('button', { name: FLEET_VIRT_SAVED_SEARCH.saveButton })
    ).toBeVisible({ timeout: 5000 });
  }

  async openSavedSearches(): Promise<void> {
    const toggle = this.page.getByRole('button', { name: FLEET_VIRT_SAVED_SEARCH.dropdown.toggle });
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    }
  }

  private async closeSavedSearches(): Promise<void> {
    const toggle = this.page.getByRole('button', { name: FLEET_VIRT_SAVED_SEARCH.dropdown.toggle });
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded === 'true') {
      await toggle.click();
      await expect(toggle).not.toHaveAttribute('aria-expanded', 'true', { timeout: 3000 });
    }
  }

  async removeSavedSearch(name: string): Promise<void> {
    await this.closeSavedSearches();
    await this.openSavedSearches();
    const item = this.page.locator(FLEET_VIRT_SAVED_SEARCH.dropdown.item(name));
    await expect(item).toBeVisible({ timeout: 5000 });
    const deleteButton = this.page.locator(FLEET_VIRT_SAVED_SEARCH.dropdown.deleteItem(name));
    await deleteButton.click();
    await expect(item).toBeHidden({ timeout: 5000 });
  }

  getSavedSearchItem(name: string): Locator {
    return this.page.locator(FLEET_VIRT_SAVED_SEARCH.dropdown.item(name));
  }

  getSavedSearchesToggle(): Locator {
    return this.page.getByRole('button', { name: FLEET_VIRT_SAVED_SEARCH.dropdown.toggle });
  }
}
