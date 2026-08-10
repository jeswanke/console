import { Page, Locator, expect } from '@playwright/test';
import { PLACEMENT_TOLERATIONS_UI } from '@constants/placement-tolerations';
import { BasePage } from '@pages/BasePage';

/**
 * Placement **Tolerations** form (PlacementSection) — shared DOM under `main` across ACM wizards.
 */
export class PlacementTolerationsActions extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getTolerationsSectionHeading(): Locator {
    return this.page.locator('main').getByText(PLACEMENT_TOLERATIONS_UI.sectionHeading).first();
  }

  getAddTolerationButton(): Locator {
    const { addButtonLabel, addButtonAriaLabel } = PLACEMENT_TOLERATIONS_UI;
    return this.page
      .locator('main')
      .getByRole('button', { name: addButtonLabel })
      .or(
        this.page
          .locator('main')
          .getByRole('button', { name: addButtonAriaLabel })
          .filter({ hasText: addButtonLabel })
      )
      .first();
  }

  getTolerationSummaryChip(key: string): Locator {
    return this.page
      .locator('main')
      .getByText(PLACEMENT_TOLERATIONS_UI.summaryChipPattern(key))
      .first();
  }

  private getTolerationFieldGroups(): Locator {
    return this.page
      .locator('main')
      .locator('.pf-v6-c-form__field-group')
      .filter({ has: this.page.getByLabel(PLACEMENT_TOLERATIONS_UI.labels.key) });
  }

  getTolerationFieldGroupByKey(keySubstring: string): Locator {
    return this.getTolerationFieldGroups().filter({ hasText: keySubstring }).first();
  }

  getLastTolerationFieldGroup(): Locator {
    return this.getTolerationFieldGroups().last();
  }

  async scrollToTolerationsSection(): Promise<void> {
    await this.getTolerationsSectionHeading().scrollIntoViewIfNeeded();
    await this.waitForLoad();
  }

  async expandTolerationFieldGroup(group: Locator): Promise<void> {
    const keyInput = group.getByLabel(PLACEMENT_TOLERATIONS_UI.labels.key);
    if (await keyInput.isVisible()) return;
    const toggle = group.locator('.pf-v6-c-form__field-group-toggle button').first();
    await toggle.click({ force: true });
    await keyInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.waitForLoad();
  }

  async selectTolerationOperator(
    group: Locator,
    operator: keyof typeof PLACEMENT_TOLERATIONS_UI.operators
  ): Promise<void> {
    const pattern = PLACEMENT_TOLERATIONS_UI.operators[operator];
    const toggle = group
      .getByRole('button', { name: PLACEMENT_TOLERATIONS_UI.operators.exists })
      .or(group.getByRole('button', { name: PLACEMENT_TOLERATIONS_UI.operators.equal }))
      .first();
    await toggle.click({ force: true });
    await this.page.getByRole('option', { name: pattern, exact: true }).click({ force: true });
    await this.waitForLoad();
  }

  async fillTolerationValue(group: Locator, value: string): Promise<void> {
    await group.getByLabel(PLACEMENT_TOLERATIONS_UI.labels.value).fill(value);
  }

  async selectTolerationEffect(
    group: Locator,
    effect: keyof typeof PLACEMENT_TOLERATIONS_UI.effects
  ): Promise<void> {
    const pattern = PLACEMENT_TOLERATIONS_UI.effects[effect];
    await group
      .getByRole('combobox', { name: PLACEMENT_TOLERATIONS_UI.effectPlaceholder })
      .click({ force: true });
    await this.page.getByRole('option', { name: pattern, exact: true }).click({ force: true });
    await this.waitForLoad();
  }

  getTolerationSecondsCheckbox(group: Locator): Locator {
    return group.getByRole('checkbox', { name: /Set toleration seconds/i });
  }

  getTolerationSecondsInput(group: Locator): Locator {
    return group.getByRole('spinbutton').or(group.locator('input[type="number"]')).first();
  }

  async fillTolerationSeconds(group: Locator, seconds: string): Promise<void> {
    const checkbox = this.getTolerationSecondsCheckbox(group);
    if (!(await checkbox.isChecked())) {
      await checkbox.check({ force: true });
      await this.getTolerationSecondsInput(group).waitFor({ state: 'visible', timeout: 10_000 });
    }
    await this.getTolerationSecondsInput(group).fill(seconds);
  }

  async removeTolerationFieldGroup(group: Locator): Promise<void> {
    await group.getByLabel(PLACEMENT_TOLERATIONS_UI.removeItemAriaLabel).click({ force: true });
    await this.waitForLoad();
  }

  async clickAddToleration(): Promise<void> {
    await this.scrollToTolerationsSection();
    const groups = this.getTolerationFieldGroups();
    const countBefore = await groups.count();
    const add = this.getAddTolerationButton();
    await add.scrollIntoViewIfNeeded();
    await add.waitFor({ state: 'visible', timeout: 30_000 });
    await add.click({ force: true });
    await expect(groups).toHaveCount(countBefore + 1, { timeout: 30_000 });
    await this.waitForLoad();
  }
}
