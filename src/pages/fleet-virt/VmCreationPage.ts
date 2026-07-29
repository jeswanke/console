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
 */
export class VmCreationPage extends BasePage {
  private readonly wizard: Locator;
  private readonly primaryBtn: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService,
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
    await this.page.goto(
      `${consoleUrl}${FLEET_VIRT_VM_CREATION.wizardRoute(cluster)}`,
    );
    await expect(this.wizard).toBeVisible({ timeout: 30000 });
    // Allow wizard form to fully initialize (react-hook-form + async validators)
    await this.page.waitForTimeout(2000);
  }

  // ---------------------------------------------------------------------------
  // Creation method selection (PF6 selectable cards with hidden radios)
  // ---------------------------------------------------------------------------

  async selectCustomConfigMethod(): Promise<void> {
    await this.page.locator(FLEET_VIRT_VM_CREATION.creationMethod.customConfigCard).click();
    await this.page.waitForTimeout(2000);
  }

  async selectTemplateMethod(): Promise<void> {
    await this.page.locator(FLEET_VIRT_VM_CREATION.creationMethod.templateCard).click();
    // PF6 wizard processes method switch asynchronously — wait for aria-disabled to settle
    await this.page.waitForTimeout(2000);
  }

  // ---------------------------------------------------------------------------
  // VM configuration
  // ---------------------------------------------------------------------------

  async fillVmName(name: string): Promise<void> {
    const input = this.page.locator(FLEET_VIRT_VM_CREATION.vmNameInput);
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(name);
    // Tab triggers form validation which enables the Next button
    await input.press('Tab');
    await this.page.waitForTimeout(500);
  }

  async generateVmName(): Promise<void> {
    await this.page.locator(FLEET_VIRT_VM_CREATION.generateNameButton).first().click();
    await this.page.waitForTimeout(500);
  }

  // ---------------------------------------------------------------------------
  // Template step — select template card by data-test-id
  // ---------------------------------------------------------------------------

  async selectTemplate(templateName: string): Promise<void> {
    const card = this.page.locator(FLEET_VIRT_VM_CREATION.templateCatalog.tileByName(templateName));
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.click();
    await expect(card).toHaveClass(new RegExp(FLEET_VIRT_VM_CREATION.templateCatalog.selectedClass), {
      timeout: 5000,
    });
  }

  // ---------------------------------------------------------------------------
  // Boot source step — select first available volume
  // ---------------------------------------------------------------------------

  async selectFirstBootVolume(): Promise<void> {
    const nameCell = this.page
      .locator(FLEET_VIRT_VM_CREATION.bootSource.tableRow)
      .first()
      .locator(FLEET_VIRT_VM_CREATION.bootSource.nameCell);
    await nameCell.waitFor({ state: 'visible', timeout: 15000 });
    await nameCell.click();
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
      const isDisabled = await this.primaryBtn.isDisabled();
      const ariaDisabled = await this.primaryBtn.getAttribute('aria-disabled');
      expect(isDisabled).toBe(false);
      expect(ariaDisabled).not.toBe('true');
    }).toPass({ intervals: [500, 1000, 2000], timeout });
  }

  async clickNext(): Promise<void> {
    await this.waitForPrimaryButtonEnabled();
    await this.primaryBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async clickBack(): Promise<void> {
    await this.page.locator(FLEET_VIRT_VM_CREATION.backButton).first().click();
  }

  async clickCancel(): Promise<void> {
    await this.page.locator(FLEET_VIRT_VM_CREATION.cancelButton).first().click();
  }

  async clickCreateVm(): Promise<void> {
    await this.waitForPrimaryButtonEnabled();
    await this.primaryBtn.click();
    await this.page.waitForTimeout(2000);
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
    await expect(async () => {
      const btnText = await this.primaryBtn.textContent();
      if (btnText?.trim() === 'Create VirtualMachine') {
        return;
      }

      const isDisabled = await this.primaryBtn.isDisabled();
      const ariaDisabled = await this.primaryBtn.getAttribute('aria-disabled');
      const isActionable = !isDisabled && ariaDisabled !== 'true';

      if (isActionable) {
        await this.primaryBtn.click();
        await this.page.waitForTimeout(1500);
      } else {
        // Try selecting boot volume if we're on the boot source step
        const bootRow = this.page.locator(FLEET_VIRT_VM_CREATION.bootSource.tableRow).first();
        if (await bootRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          const nameCell = bootRow.locator(FLEET_VIRT_VM_CREATION.bootSource.nameCell);
          if (await nameCell.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nameCell.click();
            await this.page.waitForTimeout(1000);
          }
        }
      }

      const finalText = await this.primaryBtn.textContent();
      expect(finalText?.trim()).toBe('Create VirtualMachine');
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
    await this.page.waitForTimeout(500);
  }

  async verifyCliContentVisible(): Promise<void> {
    const modalBody = this.page.locator('.pf-v6-c-modal-box__body');
    await expect(modalBody.getByText(/virtctl|oc|kubectl/)).toBeVisible({ timeout: 10000 });
  }

  async closeYamlCliModal(): Promise<void> {
    const closeBtn = this.page.locator('.pf-v6-c-modal-box button[aria-label="Close"]');
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.locator('.pf-v6-c-modal-box').waitFor({ state: 'hidden', timeout: 5000 });
  }

  // ---------------------------------------------------------------------------
  // Bootable volume explicit selection (InstanceTypes flow)
  // ---------------------------------------------------------------------------

  async selectBootableVolumeByName(volumeName: string): Promise<void> {
    const filterInput = this.page.locator('[data-test="item-filter"]')
      .or(this.page.locator('[data-test="name-filter-input"]')).first();
    if (await filterInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filterInput.clear();
      await filterInput.fill(volumeName);
      await this.page.waitForTimeout(1000);
    }
    const volumeCell = this.page.locator(`td[id="name"]`).filter({ hasText: volumeName }).first();
    await volumeCell.waitFor({ state: 'visible', timeout: 15000 });
    await volumeCell.click();
    await this.page.waitForTimeout(500);
  }

  // ---------------------------------------------------------------------------
  // Template catalog filters
  // ---------------------------------------------------------------------------

  async filterByBootSourceAvailable(): Promise<void> {
    const filterBtn = this.page.locator('button:has-text("Filter")');
    if (await filterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const expanded = await filterBtn.getAttribute('aria-expanded');
      if (expanded !== 'true') await filterBtn.click();
      const checkbox = this.page.locator('[data-test-row-filter="only-available"] input[type="checkbox"]');
      await checkbox.waitFor({ state: 'visible', timeout: 5000 });
      if (!(await checkbox.isChecked())) await checkbox.check({ force: true });
      await filterBtn.click();
    } else {
      const bootSourceFilter = this.page.locator('[data-test="boot-source-available-Boot source available"] input[type="checkbox"]');
      if (await bootSourceFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bootSourceFilter.check({ force: true });
      }
    }
    await this.page.waitForTimeout(1000);
  }

  async filterByOSName(osName: 'RHEL' | 'Windows' | 'Fedora' | 'CentOS'): Promise<void> {
    const filterKey = osName.toLowerCase();
    const filterBtn = this.page.locator('button:has-text("Filter")');
    if (await filterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const expanded = await filterBtn.getAttribute('aria-expanded');
      if (expanded !== 'true') await filterBtn.click();
      const checkbox = this.page.locator(`[data-test-row-filter="${filterKey}"] input[type="checkbox"]`);
      await checkbox.waitFor({ state: 'visible', timeout: 5000 });
      if (!(await checkbox.isChecked())) await checkbox.check({ force: true });
      await filterBtn.click();
    } else {
      const osFilter = this.page.locator(`input#filter-osName-${filterKey}`)
        .or(this.page.locator(`[data-test="osName-${osName}"] input[type="checkbox"]`));
      await osFilter.first().check({ force: true });
    }
    await this.page.waitForTimeout(1000);
  }

  // ---------------------------------------------------------------------------
  // Customize VM (opens sidebar wizard for template or instance-type flows)
  // ---------------------------------------------------------------------------

  async clickCustomizeVm(): Promise<void> {
    const customizeBtn = this.page.locator('button:has-text("Customize VirtualMachine")')
      .or(this.page.locator('[data-test="customize-vm-btn"]'));
    await customizeBtn.first().waitFor({ state: 'visible', timeout: 15000 });
    await customizeBtn.first().click();
    await this.page.waitForTimeout(2000);
  }

  // ---------------------------------------------------------------------------
  // Locator getters
  // ---------------------------------------------------------------------------

  getWizard(): Locator {
    return this.wizard;
  }

  getPrimaryButton(): Locator {
    return this.primaryBtn;
  }
}
