import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  INFRA_PROVIDER_IDS,
  CONTROL_PLANE_IDS,
  CLUSTER_WIZARD_FIELDS,
  WIZARD_BUTTONS,
} from '@constants/cluster-create';
import type { ClcProvider } from '@config';

type InfraProviderKey = keyof typeof INFRA_PROVIDER_IDS;

/**
 * ACM Create Cluster wizard page object.
 *
 * Covers all wizard steps for Hive-based (standalone) and KubeVirt (hosted) clusters.
 * Provider-specific fill methods are exposed for use by `lib/cluster/create-cluster.ts`.
 */
export class CreateClusterWizardPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  // ---------------------------------------------------------------------------
  // Infrastructure provider step
  // ---------------------------------------------------------------------------

  getProviderCard(provider: InfraProviderKey): Locator {
    return this.page.locator(INFRA_PROVIDER_IDS[provider]);
  }

  getStandaloneCard(): Locator {
    return this.page.locator(CONTROL_PLANE_IDS.standalone);
  }

  getHostedCard(): Locator {
    return this.page.locator(CONTROL_PLANE_IDS.hosted);
  }

  async selectProvider(provider: ClcProvider): Promise<void> {
    const providerKey = this.mapProviderToKey(provider);
    await this.getProviderCard(providerKey).click();

    if (provider === 'kubevirt') {
      await expect(this.page).toHaveURL(/control-plane/, { timeout: 15_000 });
      await this.getHostedCard().click();
      await expect(this.page).not.toHaveURL(/control-plane/, { timeout: 30_000 });
    } else {
      const standaloneCard = this.getStandaloneCard();
      await expect(standaloneCard).toBeVisible({ timeout: 15_000 });
      await standaloneCard.click();
    }

    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Cluster details step
  // ---------------------------------------------------------------------------

  getCredentialDropdown(): Locator {
    return this.page.locator(CLUSTER_WIZARD_FIELDS.credentialDropdown);
  }

  getClusterNameInput(): Locator {
    return this.page.locator(CLUSTER_WIZARD_FIELDS.clusterName);
  }

  getClusterSetDropdown(): Locator {
    return this.page.locator(CLUSTER_WIZARD_FIELDS.clusterSet);
  }

  getReleaseImageInput(): Locator {
    return this.page.locator(CLUSTER_WIZARD_FIELDS.releaseImage);
  }

  getFipsCheckbox(): Locator {
    return this.page.locator(CLUSTER_WIZARD_FIELDS.fips);
  }

  async selectCredential(credentialName: string): Promise<void> {
    const dropdown = this.getCredentialDropdown();
    await dropdown.locator('input').click();
    await this.page.getByRole('option', { name: credentialName }).click();
    await this.waitForLoad();
  }

  async fillClusterName(name: string): Promise<void> {
    const input = this.getClusterNameInput();
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    await input.fill(name);
  }

  async selectClusterSet(clusterSetName: string): Promise<void> {
    await this.selectFromTypeahead(CLUSTER_WIZARD_FIELDS.clusterSet, clusterSetName);
  }

  async selectReleaseImage(imageVersion: string): Promise<void> {
    const input = this.page.locator(CLUSTER_WIZARD_FIELDS.releaseImage);
    await input.waitFor({ state: 'visible', timeout: 30_000 });
    await input.click();
    await input.fill(imageVersion);
    const option = this.page.getByRole('option', { name: new RegExp(imageVersion) }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async fillAdditionalLabels(labels: Record<string, string>): Promise<void> {
    const input = this.page.locator('#additional');
    for (const [key, value] of Object.entries(labels)) {
      await input.fill(`${key}=${value}`);
      await input.press('Tab');
    }
  }

  async enableFips(): Promise<void> {
    await this.getFipsCheckbox().click();
  }

  // ---------------------------------------------------------------------------
  // Node pools step
  // ---------------------------------------------------------------------------

  getRegionDropdown(): Locator {
    return this.page.locator(CLUSTER_WIZARD_FIELDS.region);
  }

  getArchitectureDropdown(): Locator {
    return this.page.locator(CLUSTER_WIZARD_FIELDS.architecture);
  }

  async selectRegion(region: string): Promise<void> {
    await this.selectFromTypeahead(CLUSTER_WIZARD_FIELDS.region, region);
  }

  async selectArchitecture(arch: string): Promise<void> {
    await this.selectFromTypeahead(CLUSTER_WIZARD_FIELDS.architecture, arch);
  }

  async fillMasterInstanceType(instanceType: string): Promise<void> {
    await this.page.locator(CLUSTER_WIZARD_FIELDS.masterPoolSection).click();
    const container = this.page.locator(CLUSTER_WIZARD_FIELDS.masterTypeLabel);
    const clearBtn = container.locator('button[aria-label="Clear input value"]');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }
    const input = this.page.locator(CLUSTER_WIZARD_FIELDS.masterType);
    await input.click();
    await input.fill(instanceType);
    await input.press('Enter');
  }

  async fillWorkerInstanceType(instanceType: string): Promise<void> {
    await this.page.locator(CLUSTER_WIZARD_FIELDS.workerPoolSection).click();
    const input = this.page.locator(CLUSTER_WIZARD_FIELDS.workerType);
    await input.clear();
    await input.fill(instanceType);
    await input.press('Enter');
  }

  // ---------------------------------------------------------------------------
  // Networking step
  // ---------------------------------------------------------------------------

  async fillNetworkingDetails(opts: {
    networkType?: string;
    clusterNetworkCIDR?: string;
    serviceNetworkCIDR?: string;
  }): Promise<void> {
    if (opts.networkType && opts.networkType === 'OpenShiftSDN') {
      await this.selectFromTypeahead(CLUSTER_WIZARD_FIELDS.networkType, opts.networkType);
    }
    if (opts.clusterNetworkCIDR) {
      const field = this.page.locator(CLUSTER_WIZARD_FIELDS.clusterNetwork);
      await field.clear();
      await field.fill(opts.clusterNetworkCIDR);
    }
    if (opts.serviceNetworkCIDR) {
      const field = this.page.locator(CLUSTER_WIZARD_FIELDS.serviceNetwork);
      await field.clear();
      await field.fill(opts.serviceNetworkCIDR);
    }
  }

  async fillVmwareNetworking(opts: {
    network: string;
    apiVIP: string;
    ingressVIP: string;
    machineCIDR?: string;
  }): Promise<void> {
    await this.page.locator(CLUSTER_WIZARD_FIELDS.vmwareNetworkName).fill(opts.network);
    await this.page.locator(CLUSTER_WIZARD_FIELDS.vmwareApiVip).fill(opts.apiVIP);
    await this.page.locator(CLUSTER_WIZARD_FIELDS.vmwareIngressVip).fill(opts.ingressVIP);
    if (opts.machineCIDR) {
      const cidr = this.page.locator(CLUSTER_WIZARD_FIELDS.vmwareMachineCIDR);
      await cidr.clear();
      await cidr.fill(opts.machineCIDR);
    }
  }

  async fillOpenstackNetworking(opts: {
    externalNetwork: string;
    apiFloatingIp: string;
    ingressFloatingIp: string;
    networkType?: string;
    machineCIDR?: string;
  }): Promise<void> {
    await this.page
      .locator(CLUSTER_WIZARD_FIELDS.openstackExternalNetwork)
      .fill(opts.externalNetwork);
    await this.page.locator(CLUSTER_WIZARD_FIELDS.openstackApiFloatingIp).fill(opts.apiFloatingIp);
    await this.page
      .locator(CLUSTER_WIZARD_FIELDS.openstackIngressFloatingIp)
      .fill(opts.ingressFloatingIp);
    if (opts.networkType) {
      await this.selectFromTypeahead(CLUSTER_WIZARD_FIELDS.networkType, opts.networkType);
    }
    if (opts.machineCIDR) {
      const cidr = this.page.locator(CLUSTER_WIZARD_FIELDS.vmwareMachineCIDR);
      await cidr.clear();
      await cidr.fill(opts.machineCIDR);
    }
  }

  // ---------------------------------------------------------------------------
  // KubeVirt-specific
  // ---------------------------------------------------------------------------

  async fillKubevirtClusterName(name: string): Promise<void> {
    await this.page.locator(CLUSTER_WIZARD_FIELDS.kubevirtClusterName).fill(name);
  }

  async selectKubevirtReleaseImage(imageVersion: string): Promise<void> {
    const input = this.page.locator(CLUSTER_WIZARD_FIELDS.kubevirtReleaseImage);
    await input.waitFor({ state: 'visible', timeout: 30_000 });
    await input.click();
    await input.fill(imageVersion);
    const option = this.page.getByRole('option', { name: new RegExp(imageVersion) }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async fillKubevirtAdditionalLabels(labels: Record<string, string>): Promise<void> {
    const input = this.page.locator(CLUSTER_WIZARD_FIELDS.kubevirtAdditionalLabels);
    for (const [key, value] of Object.entries(labels)) {
      await input.fill(`${key}=${value}`);
      await input.press('Tab');
    }
  }

  async fillKubevirtNodePoolName(name: string): Promise<void> {
    const input = this.page.locator(CLUSTER_WIZARD_FIELDS.kubevirtNodePoolName).first();
    await input.clear();
    await input.fill(name);
  }

  // ---------------------------------------------------------------------------
  // Wizard navigation
  // ---------------------------------------------------------------------------

  async clickNext(): Promise<void> {
    await this.page.getByRole('button', { name: WIZARD_BUTTONS.next, exact: true }).click();
    await this.waitForLoad();
  }

  async clickCreate(): Promise<void> {
    await this.page.getByRole('button', { name: WIZARD_BUTTONS.create, exact: true }).click();
  }

  async clickBack(): Promise<void> {
    await this.page.getByRole('button', { name: WIZARD_BUTTONS.back, exact: true }).click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async expectOnOverviewPage(clusterName: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/clusters/details/.*/${clusterName}`), {
      timeout: 30_000,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private mapProviderToKey(provider: ClcProvider): InfraProviderKey {
    const mapping: Record<ClcProvider, InfraProviderKey> = {
      aws: 'aws',
      gcp: 'gcp',
      azure: 'azure',
      azgov: 'azure',
      vmware: 'vmware',
      openstack: 'openstack',
      kubevirt: 'kubevirt',
    };
    return mapping[provider];
  }

  private async selectFromTypeahead(containerSelector: string, value: string): Promise<void> {
    const container = this.page.locator(containerSelector);
    const input = container.locator('input').first();
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    await input.click();
    await input.fill(value);
    const option = this.page.getByRole('option', { name: value }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }
}
