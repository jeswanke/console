import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  CREDENTIAL_ROUTES,
  CREDENTIAL_PROVIDER_IDS,
  CREDENTIAL_WIZARD_FIELDS,
  CREDENTIAL_WIZARD_BUTTONS,
} from '@constants/credential-wizard';

type CredentialProviderKey = keyof typeof CREDENTIAL_PROVIDER_IDS;

export class CredentialWizardPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${CREDENTIAL_ROUTES.create}`);
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Provider selection step
  // ---------------------------------------------------------------------------

  async selectProvider(provider: CredentialProviderKey): Promise<void> {
    await this.page.locator(CREDENTIAL_PROVIDER_IDS[provider]).click();
    if (provider === 'aws') {
      await this.page.locator(CREDENTIAL_PROVIDER_IDS.awsStandard).click();
    }
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Basic information step
  // ---------------------------------------------------------------------------

  async fillBasicInfo(opts: {
    name: string;
    namespace: string;
    baseDomain?: string;
    azureCloudName?: string;
  }): Promise<void> {
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.credentialsName).fill(opts.name);

    const nsInput = this.page.getByRole('combobox', { name: 'Namespace' });
    await nsInput.click();
    await nsInput.fill(opts.namespace);
    await this.page.getByRole('option', { name: opts.namespace }).first().click();

    if (opts.baseDomain) {
      await this.page.locator(CREDENTIAL_WIZARD_FIELDS.baseDomain).fill(opts.baseDomain);
    }

    if (opts.azureCloudName) {
      const cloudInput = this.page.locator(CREDENTIAL_WIZARD_FIELDS.azureCloudName);
      await cloudInput.click();
      await cloudInput.fill(opts.azureCloudName);
      await this.page.getByRole('option', { name: opts.azureCloudName }).first().click();
    }

    await this.clickNext();
  }

  // ---------------------------------------------------------------------------
  // Provider credential steps
  // ---------------------------------------------------------------------------

  async fillAwsCreds(accessKeyId: string, secretAccessKey: string): Promise<void> {
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.awsAccessKeyId).fill(accessKeyId);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.awsSecretAccessKey).fill(secretAccessKey);
    await this.clickNext();
  }

  async fillGcpCreds(projectId: string, serviceAccountJson: string): Promise<void> {
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.gcpProjectId).fill(projectId);
    await this.page
      .locator(CREDENTIAL_WIZARD_FIELDS.gcpServiceAccountJson)
      .fill(serviceAccountJson);
    await this.clickNext();
  }

  async fillAzureCreds(opts: {
    baseDomainResourceGroup: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
    tenantId: string;
  }): Promise<void> {
    await this.page
      .locator(CREDENTIAL_WIZARD_FIELDS.azureBaseDomainResourceGroup)
      .fill(opts.baseDomainResourceGroup);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.azureClientId).fill(opts.clientId);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.azureClientSecret).fill(opts.clientSecret);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.azureSubscriptionId).fill(opts.subscriptionId);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.azureTenantId).fill(opts.tenantId);
    await this.clickNext();
  }

  async fillVmwareCreds(opts: {
    vCenter: string;
    username: string;
    password: string;
    caCertificate: string;
    cluster: string;
    datacenter: string;
    datastore: string;
  }): Promise<void> {
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.vmwareVcenter).fill(opts.vCenter);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.vmwareUsername).fill(opts.username);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.vmwarePassword).fill(opts.password);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.vmwareCaCertificate).fill(opts.caCertificate);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.vmwareCluster).fill(opts.cluster);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.vmwareDatacenter).fill(opts.datacenter);
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.vmwareDatastore).fill(opts.datastore);
    await this.clickNext();
  }

  async fillOpenstackCreds(opts: {
    cloudsYaml: string;
    cloudName: string;
    caCertificate?: string;
  }): Promise<void> {
    // clouds.yaml is the first textarea on the page
    await this.page.locator('textarea').first().fill(opts.cloudsYaml);
    const cloudNameField = this.page.locator(CREDENTIAL_WIZARD_FIELDS.openstackCloudName);
    await cloudNameField.clear();
    await cloudNameField.fill(opts.cloudName);
    if (opts.caCertificate) {
      await this.page.locator(CREDENTIAL_WIZARD_FIELDS.openstackCaCert).fill(opts.caCertificate);
    }
    await this.clickNext();
  }

  // ---------------------------------------------------------------------------
  // Proxy step (skip — accept defaults)
  // ---------------------------------------------------------------------------

  async skipProxy(): Promise<void> {
    await this.clickNext();
  }

  // ---------------------------------------------------------------------------
  // Disconnected install step (VMware/OpenStack only)
  // ---------------------------------------------------------------------------

  async skipDisconnectedInstall(): Promise<void> {
    await this.clickNext();
  }

  // ---------------------------------------------------------------------------
  // Pull secret & SSH keys step
  // ---------------------------------------------------------------------------

  async fillPullSecretAndSshKeys(opts: {
    pullSecret: string;
    sshPrivateKey?: string;
    sshPublicKey: string;
  }): Promise<void> {
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.pullSecret).fill(opts.pullSecret);
    if (opts.sshPrivateKey) {
      await this.page.locator(CREDENTIAL_WIZARD_FIELDS.sshPrivateKey).fill(opts.sshPrivateKey);
    }
    await this.page.locator(CREDENTIAL_WIZARD_FIELDS.sshPublicKey).fill(opts.sshPublicKey);
    await this.clickNext();
  }

  // ---------------------------------------------------------------------------
  // Wizard navigation
  // ---------------------------------------------------------------------------

  async clickNext(): Promise<void> {
    await this.page
      .getByRole('button', { name: CREDENTIAL_WIZARD_BUTTONS.next, exact: true })
      .click();
    await this.waitForLoad();
  }

  async clickAdd(): Promise<void> {
    await this.page
      .getByRole('button', { name: CREDENTIAL_WIZARD_BUTTONS.add, exact: true })
      .click();
  }

  async clickSave(): Promise<void> {
    await this.page
      .getByRole('button', { name: CREDENTIAL_WIZARD_BUTTONS.save, exact: true })
      .click();
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async expectOnCredentialsList(): Promise<void> {
    await expect(this.page).toHaveURL(/\/credentials$/, { timeout: 30_000 });
  }
}
