import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_VM_CREATION } from '@constants/fleet-virt';

/**
 * VM creation wizard page object — kubevirt-plugin CNV 4.23+ (PF6 Wizard).
 *
 * Covers two creation flows per Polarion RHACM4K-60559:
 *   1. Custom Configuration (InstanceType / Bootable Volumes): multi-step wizard
 *   2. Create from Template: multi-step wizard
 *
 * Selectors verified via:
 *   - kubevirt-ui/kubevirt-plugin source (playwright/src/components/vm-wizard/*)
 *   - Live DOM inspection via browser MCP on ACM 2.16 + CNV cluster
 *
 * Key pattern: navigation button is `.pf-v6-c-wizard button.pf-v6-c-button.pf-m-primary`
 * (resolves to "Next" or "Create VirtualMachine" depending on wizard step).
 * PF6 uses `aria-disabled` for temporary loading states.
 *
 * Step transition detection: `.pf-v6-c-wizard__nav-link[aria-current="step"]` moves
 * to the new step after clicking Next. This is the definitive signal that the PF6
 * wizard completed its internal state transition (verified on live DOM).
 *
 * Creation method selection: PF6 selectable cards have role="radio" in the
 * accessibility tree. Click the card via getByRole('radio', { name }) to trigger
 * React state change (hidden input force-click does NOT fire onChange).
 */
export class VmCreationPage extends BasePage {
  private readonly wizard: Locator;
  private readonly primaryBtn: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.wizard = page.locator(FLEET_VIRT_VM_CREATION.wizardContainer);
    this.primaryBtn = page.locator(FLEET_VIRT_VM_CREATION.primaryButton).first();
  }

  // ---------------------------------------------------------------------------
  // Navigation to wizard
  // ---------------------------------------------------------------------------

  async openCreateWizard(cluster = 'local-cluster'): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${FLEET_VIRT_VM_CREATION.wizardRoute(cluster)}`);
    await expect(this.wizard).toBeVisible({ timeout: 30000 });
    await this.page
      .locator(FLEET_VIRT_VM_CREATION.vmNameInput)
      .or(this.page.getByRole('textbox', { name: 'Name' }))
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
  }

  // ---------------------------------------------------------------------------
  // Creation method selection (PF6 selectable cards with role="radio")
  // ---------------------------------------------------------------------------

  async selectTemplateMethod(): Promise<void> {
    const card = this.page.getByRole('radio', { name: /Create from Template/ });
    await card.click();
    await expect(
      this.page.locator('.pf-v6-c-wizard__nav-link', { hasText: 'Template' })
    ).toBeVisible({ timeout: 10000 });
  }

  // ---------------------------------------------------------------------------
  // VM configuration
  // ---------------------------------------------------------------------------

  async fillVmName(name: string): Promise<void> {
    const input = this.page
      .locator(FLEET_VIRT_VM_CREATION.vmNameInput)
      .or(this.page.getByRole('textbox', { name: 'Name' }))
      .first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(name);
    await input.press('Tab');
    await this.waitForPrimaryButtonEnabled();
  }

  // ---------------------------------------------------------------------------
  // Wizard step navigation (primary button pattern from kubevirt-plugin)
  // ---------------------------------------------------------------------------

  /**
   * Wait for the primary button (Next or Create) to become actionable,
   * handling both `disabled` attribute and PF6 `aria-disabled` pattern.
   */
  private async waitForPrimaryButtonEnabled(timeout = 15000): Promise<void> {
    await expect(async () => {
      await expect(this.primaryBtn).toBeEnabled();
      await expect(this.primaryBtn).not.toHaveAttribute('aria-disabled', 'true');
    }).toPass({ intervals: [500, 1000, 2000], timeout });
  }

  async clickNext(): Promise<void> {
    await this.waitForPrimaryButtonEnabled();
    const activeStepLocator = this.page.locator('.pf-v6-c-wizard__nav-link[aria-current="step"]');
    const currentStepText = await activeStepLocator.textContent();
    await this.primaryBtn.click();
    await expect(activeStepLocator).not.toHaveText(currentStepText || '', { timeout: 15000 });
  }

  async clickCreateVm(): Promise<void> {
    await this.waitForPrimaryButtonEnabled();
    await this.primaryBtn.click();
    await expect(async () => {
      const url = this.page.url();
      expect(url).toMatch(/kubevirt\.io~v1~VirtualMachine\//);
    }).toPass({ intervals: [1000, 2000], timeout: 60000 });
  }

  /**
   * Navigate through wizard steps to Review.
   *
   * Handles intermediate steps that require selection:
   * - Boot source: selects first available volume
   * - Template: should already be selected before calling this
   *
   * Keeps clicking Next until the primary button text becomes "Create VirtualMachine".
   */
  async navigateToReviewStep(): Promise<void> {
    const activeStepLocator = this.page.locator('.pf-v6-c-wizard__nav-link[aria-current="step"]');

    await expect(async () => {
      const btnText = await this.primaryBtn.textContent();
      if (btnText?.trim() === 'Create VirtualMachine') {
        return;
      }

      const isEnabled = await this.primaryBtn.isEnabled();
      const ariaDisabled = await this.primaryBtn.getAttribute('aria-disabled');
      const isActionable = isEnabled && ariaDisabled !== 'true';

      if (isActionable) {
        const stepBefore = await activeStepLocator.textContent();
        await this.primaryBtn.click();
        await expect(activeStepLocator).not.toHaveText(stepBefore || '', { timeout: 10000 });
      } else {
        const bootRow = this.page.locator(FLEET_VIRT_VM_CREATION.bootSource.tableRow).first();
        const bootRowVisible = await bootRow
          .waitFor({ state: 'visible', timeout: 2000 })
          .then(() => true)
          .catch(() => false);
        if (bootRowVisible) {
          const nameCell = bootRow.locator(FLEET_VIRT_VM_CREATION.bootSource.nameCell);
          await nameCell.waitFor({ state: 'visible', timeout: 3000 });
          await nameCell.click();
          await this.waitForPrimaryButtonEnabled();
        }
      }

      await expect(this.primaryBtn).toHaveText('Create VirtualMachine', { timeout: 5000 });
    }).toPass({ intervals: [3000, 4000, 5000], timeout: 90000 });
  }

  // ---------------------------------------------------------------------------
  // YAML & CLI view (InstanceTypes flow)
  // ---------------------------------------------------------------------------

  async clickViewYamlAndCli(): Promise<void> {
    const yamlCliBtn = this.page.locator('button:has-text("View YAML & CLI")');
    await yamlCliBtn.waitFor({ state: 'visible', timeout: 15000 });
    await yamlCliBtn.click();
    await this.page.locator('.pf-v6-c-modal-box').waitFor({ state: 'visible', timeout: 10000 });
  }

  async verifyYamlModalVisible(): Promise<void> {
    const modal = this.page.locator('.pf-v6-c-modal-box');
    await expect(modal).toBeVisible({ timeout: 10000 });
  }

  async clickCliTab(): Promise<void> {
    const cliTab = this.page.locator('.pf-v6-c-modal-box__body button:has-text("CLI")');
    await cliTab.waitFor({ state: 'visible', timeout: 10000 });
    await cliTab.click();
    await expect(
      this.page.locator('.pf-v6-c-modal-box__body').getByText(/virtctl|oc|kubectl/)
    ).toBeVisible({ timeout: 10000 });
  }

  async verifyCliContentVisible(): Promise<void> {
    const modalBody = this.page.locator('.pf-v6-c-modal-box__body');
    await expect(modalBody.getByText(/virtctl|oc|kubectl/)).toBeVisible({ timeout: 10000 });
  }

  async closeYamlCliModal(): Promise<void> {
    const closeBtn = this.page.locator('.pf-v6-c-modal-box button[aria-label="Close"]');
    const isCloseVisible = await closeBtn
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (isCloseVisible) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.locator('.pf-v6-c-modal-box').waitFor({ state: 'hidden', timeout: 5000 });
  }

  // ---------------------------------------------------------------------------
  // Composed wizard step: fill name + advance to boot source + select volume
  // Handles PF6 wizard race conditions with retry logic.
  // ---------------------------------------------------------------------------

  async advanceWithNameFillAndVolumeSelect(name: string): Promise<void> {
    await expect(async () => {
      const activeStep = this.page.locator('.pf-v6-c-wizard__nav-link[aria-current="step"]');
      const currentStep = (await activeStep.textContent())?.trim() ?? '';

      if (currentStep === 'Boot source') {
        const volumeTable = this.page
          .locator(FLEET_VIRT_VM_CREATION.bootSource.tableRow)
          .first()
          .locator(FLEET_VIRT_VM_CREATION.bootSource.nameCell);
        await expect(volumeTable).toBeVisible({ timeout: 10000 });
        const fedoraVol = this.page
          .locator('td[id="name"]')
          .filter({ hasText: /fedora/i })
          .first();
        const fedoraVisible = await fedoraVol
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        if (fedoraVisible) {
          await fedoraVol.click();
        } else {
          await volumeTable.click();
        }
        return;
      }

      if (currentStep === 'Deployment details') {
        const nameInput = this.page.locator(FLEET_VIRT_VM_CREATION.vmNameInput);
        const value = await nameInput.inputValue();
        if (!value) {
          await nameInput.fill(name);
          await nameInput.press('Tab');
        }
      }

      await expect(this.primaryBtn).toBeEnabled({ timeout: 15000 });
      await this.primaryBtn.click();
      throw new Error(`Advancing from: ${currentStep}`);
    }).toPass({ intervals: [3000, 5000], timeout: 90000 });
  }

  // ---------------------------------------------------------------------------
  // YAML & CLI modal content verification
  // ---------------------------------------------------------------------------

  getYamlModalContent(pattern: RegExp): Locator {
    return this.page.locator('.pf-v6-c-modal-box__body').getByText(pattern);
  }


  // ---------------------------------------------------------------------------
  // Template catalog step
  // ---------------------------------------------------------------------------

  async waitForTemplateCatalogVisible(): Promise<void> {
    const filterBtn = this.page.locator('button:has-text("Filter")');
    const catalogGrid = this.page
      .locator('[id="vm-catalog-grid"], .templates-catalog-tile, [data-test-id*="fedora"]')
      .first();
    await expect(filterBtn.or(catalogGrid)).toBeVisible({ timeout: 60000 });
  }

  async selectFedoraTemplateCard(): Promise<void> {
    await expect(async () => {
      const fedoraCard = this.page
        .locator('[data-test-id*="fedora"]')
        .first()
        .or(
          this.page
            .locator('.templates-catalog-tile')
            .filter({ hasText: /fedora/i })
            .first()
        );
      await expect(fedoraCard).toBeVisible({ timeout: 10000 });
      await fedoraCard.click();
    }).toPass({ intervals: [3000, 5000], timeout: 30000 });
  }

  // ---------------------------------------------------------------------------
  // Template catalog filters
  // ---------------------------------------------------------------------------

  async filterByBootSourceAvailable(): Promise<void> {
    const filterBtn = this.page.locator('button:has-text("Filter")');
    const filterVisible = await filterBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (filterVisible) {
      const expanded = await filterBtn.getAttribute('aria-expanded');
      if (expanded !== 'true') await filterBtn.click();
      const checkbox = this.page.locator(
        '[data-test-row-filter="only-available"] input[type="checkbox"]'
      );
      await checkbox.waitFor({ state: 'visible', timeout: 5000 });
      if (!(await checkbox.isChecked())) await checkbox.check({ force: true });
      await filterBtn.click();
    } else {
      const bootSourceFilter = this.page.locator(
        '[data-test="boot-source-available-Boot source available"] input[type="checkbox"]'
      );
      await bootSourceFilter.waitFor({ state: 'visible', timeout: 5000 });
      await bootSourceFilter.check({ force: true });
    }
    await this.waitForTemplateCatalogUpdated();
  }

  async filterByOSName(osName: 'RHEL' | 'Windows' | 'Fedora' | 'CentOS'): Promise<void> {
    const filterKey = osName.toLowerCase();
    const filterBtn = this.page.locator('button:has-text("Filter")');
    const filterVisible = await filterBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (filterVisible) {
      const expanded = await filterBtn.getAttribute('aria-expanded');
      if (expanded !== 'true') await filterBtn.click();
      const checkbox = this.page.locator(
        `[data-test-row-filter="${filterKey}"] input[type="checkbox"]`
      );
      await checkbox.waitFor({ state: 'visible', timeout: 5000 });
      if (!(await checkbox.isChecked())) await checkbox.check({ force: true });
      await filterBtn.click();
    } else {
      const osFilter = this.page
        .locator(`input#filter-osName-${filterKey}`)
        .or(this.page.locator(`[data-test="osName-${osName}"] input[type="checkbox"]`));
      await osFilter.first().check({ force: true });
    }
    await this.waitForTemplateCatalogUpdated();
  }

  /**
   * Wait for template catalog to reflect filter changes by checking
   * that at least one template card is visible or the empty state is shown.
   */
  private async waitForTemplateCatalogUpdated(): Promise<void> {
    const catalogTile = this.page.locator('.templates-catalog-tile');
    const emptyState = this.page.getByText(/No templates found|No results/);
    await expect(catalogTile.first().or(emptyState.first())).toBeVisible({ timeout: 10000 });
  }

  // ---------------------------------------------------------------------------
  // Locator getters
  // ---------------------------------------------------------------------------

  getWizard(): Locator {
    return this.wizard;
  }
}
