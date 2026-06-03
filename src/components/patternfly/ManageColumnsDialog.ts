import { Page, Locator, expect } from '@playwright/test';

export type ManageColumnsDefaultsConfig = {
  defaultUnchecked: readonly string[];
  required: readonly string[];
  optional: readonly string[];
};

export type ManageColumnsCustomizeOptions = {
  enable?: readonly string[];
  moveAfter?: { column: string; target: string };
  hide?: readonly string[];
};

export class ManageColumnsDialog {
  private readonly manageColumnsButton: Locator;

  constructor(private readonly page: Page) {
    this.manageColumnsButton = page.getByLabel('columns-management');
  }

  async open(): Promise<void> {
    await this.manageColumnsButton.click();
    await expect(this.getDialog()).toBeVisible();
  }

  async save(): Promise<void> {
    await this.getDialogButton('Save').click();
    await expect(this.getDialog()).toBeHidden();
  }

  async cancel(): Promise<void> {
    await this.getDialogButton('Cancel').click();
    await expect(this.getDialog()).toBeHidden();
  }

  async clickRestoreDefaults(): Promise<void> {
    await this.getDialogButton('Restore defaults').click();
  }

  async restoreDefaultsAndSave(): Promise<void> {
    await this.clickRestoreDefaults();
    await this.save();
  }

  async verifyDefaults(config: ManageColumnsDefaultsConfig): Promise<void> {
    for (const column of config.defaultUnchecked) {
      await this.verifyColumnUnchecked(column);
    }
    for (const column of config.required) {
      await this.verifyColumnDisabled(column);
    }
    for (const column of config.optional) {
      await this.verifyColumnEnabled(column);
    }
  }

  async customizeAndSave(options: ManageColumnsCustomizeOptions): Promise<void> {
    for (const column of options.enable ?? []) {
      await this.checkColumn(column);
    }
    if (options.moveAfter) {
      await this.moveColumnAfter(options.moveAfter.column, options.moveAfter.target);
    }
    for (const column of options.hide ?? []) {
      await this.uncheckColumn(column);
    }
    await this.save();
  }

  async checkColumn(columnName: string): Promise<void> {
    const checkbox = this.getColumnCheckbox(columnName);
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.check();
    }
  }

  async uncheckColumn(columnName: string): Promise<void> {
    const checkbox = this.getColumnCheckbox(columnName);
    const isChecked = await checkbox.isChecked();
    if (isChecked) {
      await checkbox.uncheck();
    }
  }

  async verifyColumnChecked(columnName: string): Promise<void> {
    await expect(this.getColumnCheckbox(columnName)).toBeChecked();
  }

  async verifyColumnUnchecked(columnName: string): Promise<void> {
    await expect(this.getColumnCheckbox(columnName)).not.toBeChecked();
  }

  async verifyColumnDisabled(columnName: string): Promise<void> {
    await expect(this.getColumnCheckbox(columnName)).toBeDisabled();
  }

  async verifyColumnEnabled(columnName: string): Promise<void> {
    await expect(this.getColumnCheckbox(columnName)).toBeEnabled();
  }

  async moveColumnAfter(columnToMove: string, targetColumn: string): Promise<void> {
    const sourceItem = this.getColumnListItem(columnToMove);
    const targetItem = this.getColumnListItem(targetColumn);

    const sourceBox = await sourceItem.boundingBox();
    const targetBox = await targetItem.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error(`Could not get bounding box for ${columnToMove} or ${targetColumn}`);
    }

    await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height + 5,
      { steps: 10 }
    );
    await this.page.mouse.up();
  }

  private getDialog(): Locator {
    return this.page.locator('.pf-v6-c-modal-box');
  }

  private getDialogButton(buttonText: string): Locator {
    return this.getDialog().getByRole('button', { name: buttonText });
  }

  private getColumnCheckbox(columnName: string): Locator {
    return this.getDialog()
      .getByRole('checkbox', { name: columnName, exact: true });
  }

  private getColumnListItem(columnName: string): Locator {
    const itemId = columnName.toLowerCase().replace(/\s+/g, '-');
    return this.getDialog().locator(`#${itemId}`);
  }
}
