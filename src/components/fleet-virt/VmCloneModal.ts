import { Page, Locator } from '@playwright/test';
import { FLEET_VIRT_CLONE_MODAL } from '@constants/fleet-virt';

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
    this.container = page.locator(FLEET_VIRT_CLONE_MODAL.container);
    this.nameInput = page.locator(FLEET_VIRT_CLONE_MODAL.nameInput);
    this.startOnCloneCheckbox = page.locator(FLEET_VIRT_CLONE_MODAL.startOnCloneCheckbox);
    this.saveButton = page.locator(FLEET_VIRT_CLONE_MODAL.saveButton);
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
