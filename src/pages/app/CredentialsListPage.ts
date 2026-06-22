import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { APP_ROUTES, CREDENTIALS_LIST } from '@constants/app';
import { pageUrlPathnameEquals } from '@lib/navigation';

/**
 * Fleet Management → **Credentials** list (`/multicloud/credentials`).
 */
export class CredentialsListPage extends BasePage {
  constructor(protected readonly page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(APP_ROUTES.credentials);
    await pageUrlPathnameEquals(this.page, APP_ROUTES.credentials);
    await this.waitForLoad();
  }

  getAddButton(): Locator {
    return this.page.locator(`#${CREDENTIALS_LIST.addButtonId}`);
  }

  getAnsibleCredentialTypeCard(): Locator {
    return this.page.locator(`#${CREDENTIALS_LIST.ansibleCredentialTypeTitleId}`);
  }

  getSearchInput(): Locator {
    return this.page.getByRole('textbox', { name: CREDENTIALS_LIST.searchInputAccessibleName });
  }

  getTable(): Locator {
    return this.page.getByRole('table', { name: CREDENTIALS_LIST.tableAccessibleName });
  }

  getCredentialRow(credentialName: string): Locator {
    return this.getTable().getByTestId(credentialName);
  }

  getCredentialActionsButton(credentialName: string): Locator {
    return this.page.locator(`#${credentialName}-actions`);
  }

  /** Opens the **Add credential** flow and selects Ansible Automation Platform. */
  async openAddAnsibleCredentialWizard(): Promise<void> {
    await this.getAddButton().click();
    await this.getAnsibleCredentialTypeCard().click();
  }

  async clickDeleteCredentialMenuItem(): Promise<void> {
    await this.page
      .getByRole('menuitem', { name: CREDENTIALS_LIST.deleteCredentialMenuItemAccessibleName })
      .click();
  }

  async clickDeleteCredentialConfirmButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: CREDENTIALS_LIST.deleteConfirmButtonAccessibleName })
      .click();
  }
}
