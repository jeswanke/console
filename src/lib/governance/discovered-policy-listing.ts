/* Copyright Contributors to the Open Cluster Management project */

import { Page, expect } from '@playwright/test';
import { SELECTORS } from '@constants/selectors';

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function doTableSearch(page: Page, text: string): Promise<void> {
  const input = page.locator(SELECTORS.common.searchInput);
  await input.clear();
  await input.fill(text);
  await page.locator('table tbody').first().waitFor({ state: 'visible', timeout: 30_000 });
}

async function clearTableSearch(page: Page): Promise<void> {
  const input = page.locator(SELECTORS.common.searchInput);
  await input.clear();
}

export async function verifyDiscoveredPolicyInListing(
  page: Page,
  policyName: string,
  policyConfig: Record<string, string>,
  compliant: boolean | null = null,
  clusterCount: number | null = null
): Promise<void> {
  await doTableSearch(page, policyName);

  const table = page.locator('table').first();
  await expect(table.locator('tbody')).not.toHaveCount(0, { timeout: 30_000 });

  const link = table.getByRole('link', { name: policyName, exact: true });
  await expect(link).toBeVisible({ timeout: 30_000 });
  const row = link.locator('xpath=ancestor::tr').first();

  for (const [key, value] of Object.entries(policyConfig)) {
    await expect(row.locator(`td[data-label="${key}"]`)).toContainText(value);
  }

  if (compliant !== null && clusterCount !== null) {
    const violationCell = row.locator('td[data-label="Cluster violations"]');
    if (compliant) {
      await expect(violationCell.locator('svg').first().locator('xpath=..')).toHaveClass(/success/);
    } else {
      await expect(violationCell.locator('svg').first().locator('xpath=..')).toHaveClass(/danger/);
    }
    await expect(violationCell).toContainText(`${clusterCount}`);
  }

  await clearTableSearch(page);
}

export async function applyDiscoveredFilter(
  page: Page,
  searchText: string,
  filterOptions: string[]
): Promise<void> {
  await doTableSearch(page, searchText);

  const drawerBody = page.locator('.pf-v6-c-drawer__body').first();
  await expect(drawerBody.getByRole('link', { name: searchText })).toBeVisible({ timeout: 10_000 });

  // PF6 drawer buttons may be partially obscured; force bypasses the actionability check
  // eslint-disable-next-line playwright/no-force-option
  await drawerBody.getByRole('button', { name: 'Filter' }).first().click({ force: true });

  for (const option of filterOptions) {
    // PF6 menu items may have pointer-events:none during open transition
    await page
      .getByRole('menuitem', { name: new RegExp(`^${escapeRegExp(option)}`) })
      // eslint-disable-next-line playwright/no-force-option
      .click({ force: true });
  }

  // eslint-disable-next-line playwright/no-force-option
  await drawerBody.getByRole('button', { name: 'Filter' }).first().click({ force: true });
}

export async function clearDiscoveredFilters(page: Page): Promise<void> {
  const clearBtn = page.getByRole('button', { name: 'Clear all filters' });
  if ((await clearBtn.count()) > 0) {
    await clearBtn.click();
  }
  await clearTableSearch(page);
}

export async function applyLabelFilter(
  page: Page,
  labelDescriptors: string[],
  searchText = 'grce2e'
): Promise<void> {
  await doTableSearch(page, searchText);

  const drawerBody = page.locator('.pf-v6-c-drawer__body').first();
  // PF6 drawer buttons may be partially obscured; force bypasses the actionability check
  // eslint-disable-next-line playwright/no-force-option
  await drawerBody.getByRole('button', { name: 'Label' }).first().click({ force: true });

  for (const descriptor of labelDescriptors) {
    const negate = descriptor.includes('!=');
    const [key, value] = negate ? descriptor.split('!=') : descriptor.split('=');

    const menuItem = page.getByRole('menuitem').filter({ hasText: key }).filter({ hasText: value });
    await expect(menuItem).toBeVisible({ timeout: 10_000 });

    if (negate) {
      await menuItem.getByRole('button', { name: '=' }).click();
    } else {
      await menuItem.click();
    }
  }

  // eslint-disable-next-line playwright/no-force-option
  await drawerBody.getByRole('button', { name: 'Label' }).first().click({ force: true });
}

export async function verifyDiscoveredPolicyRowExists(page: Page, ouiaId: string): Promise<void> {
  await expect(page.locator(SELECTORS.common.tableRow(ouiaId))).toBeVisible({ timeout: 30_000 });
}

export async function verifyDiscoveredPolicyRowNotExists(
  page: Page,
  ouiaId: string
): Promise<void> {
  await expect(page.locator(SELECTORS.common.tableRow(ouiaId))).toHaveCount(0, { timeout: 10_000 });
}

export async function verifyTemplateDetailsPage(
  page: Page,
  consoleUrl: string,
  policyName: string,
  policyConfig: { Name: string; namespace?: string },
  expectedTemplate: {
    name: string;
    kind: string;
    engine: string;
    apigroups: string;
    'Validating Admission Policy'?: string;
    resources?: Record<string, Record<string, string>>;
    yamlcontent?: string;
  },
  clusters: string[],
  isDiscoveredPoliciesPage = false
): Promise<void> {
  for (const cluster of clusters) {
    let url: string;
    if (isDiscoveredPoliciesPage) {
      url = `${consoleUrl}/multicloud/governance/discovered/${expectedTemplate.apigroups}/${expectedTemplate.kind}/${expectedTemplate.name}/${cluster}/detail`;
    } else {
      url = `${consoleUrl}/multicloud/governance/policies/details/${policyConfig.namespace}/${policyName}/template/${cluster}/${expectedTemplate.apigroups}/${expectedTemplate.kind}/${expectedTemplate.name}`;
    }
    await page.goto(url);
    await page.waitForLoadState('load');

    const getField = (name: string) =>
      page
        .locator(`dt span:has-text("${name}")`)
        .first()
        .locator('xpath=ancestor::*[contains(@class, "description-list__term")]')
        .first()
        .locator('+ dd');

    await expect(getField('Name')).toHaveText(expectedTemplate.name, { timeout: 60_000 });
    await expect(getField('Cluster')).toHaveText(cluster);
    await expect(getField('Kind')).toHaveText(expectedTemplate.kind);
    await expect(getField('Engine')).toContainText(expectedTemplate.engine);
    await expect(getField('API version')).toHaveText(expectedTemplate.apigroups);

    if (
      expectedTemplate.engine === 'Kubernetes' &&
      expectedTemplate.kind === 'ValidatingAdmissionPolicyBinding'
    ) {
      await expect(getField('Validating Admission Policy')).toHaveText(
        expectedTemplate['Validating Admission Policy']!
      );
    }

    if (expectedTemplate.resources) {
      for (const resourceKind of Object.keys(expectedTemplate.resources)) {
        await doTableSearch(page, resourceKind);
        const row = page.locator('table tbody tr').filter({ hasText: resourceKind }).first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        const resource = expectedTemplate.resources[resourceKind];
        for (const [, value] of Object.entries(resource)) {
          if (value) {
            await expect(row).toContainText(value);
          }
        }
      }
    }

    await page.getByRole('tab', { name: 'YAML' }).click();
    const yamlContent = expectedTemplate.yamlcontent ?? `${policyConfig.namespace}.${policyName}`;
    await expect(page.locator('textarea.inputarea')).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(
      (content) => {
        const win = window as unknown as { getEditorValue?: () => string };
        return win.getEditorValue?.().includes(content) ?? false;
      },
      yamlContent,
      { timeout: 30_000 }
    );
  }
}

export async function clickExportCSV(page: Page): Promise<void> {
  await page.locator('button[aria-label="export-search-result"]').locator('xpath=..').click();
  await page.getByRole('menuitem', { name: 'Export all to CSV' }).click();
}
