import { Page, Locator } from '@playwright/test';

/**
 * VM Clone modal component.
 *
 * Source: kubevirt-plugin CloneVMModal
 * Per architecture doc: components expose locators, tests assert.
 */
export class VmCloneModal {
  private readonly container: Locator;
  private readonly nameInput: Locator;
  private readonly startOnCloneCheckbox: Locator;
  private readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    this.container = page.getByRole('dialog');
    this.nameInput = this.container.getByRole('textbox', { name: 'Name' });
    this.startOnCloneCheckbox = this.container.getByRole('checkbox', { name: /Start VirtualMachine/ });
    this.saveButton = this.container.getByRole('button', { name: 'Clone' });
  }

  getContainer(): Locator { return this.container; }

  async fillCloneName(name: string): Promise<void> {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  async checkStartOnClone(): Promise<void> {
    await this.startOnCloneCheckbox.check();
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }
}
