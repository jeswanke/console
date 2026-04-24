/**
 * Application Lifecycle: Applications list page.
 *
 * Minimal sanity: navigate to Applications, verify title and table toolbar.
 * Uses authenticated state from auth.setup.ts (playwright.config projects).
 */

import { test, expect } from '@fixtures/app-test';
import {
  APP_CREATE_MENU,
  APP_COMPARE_POPOVER,
  APP_DOCS_MANAGING_APPLICATIONS_HREF_RE,
  APP_FILTER,
  APP_TABLE_ROW_ACTIONS,
  APP_TABLE_COLUMN_HELP,
  APP_ADVANCED_CONFIG,
  APP_ADVANCED_TABLE_COLUMNS,
  APP_ADVANCED_TABLE_COLUMNS_CHANNELS,
  APP_DOCS_ADVANCED_DEPRECATION_HREF_RE,
} from '@constants/app';
import type { AppTableColumnHelpKey } from '@constants/app';

test.describe('Applications list', { tag: ['@app', '@alc'] }, () => {
  test('displays Applications page with title and Create button', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await expect(applicationListPage.getPageTitle()).toBeVisible();
    await expect(
      applicationListPage.applicationsTable.getCreateApplicationButton()
    ).toBeVisible();
  });

  test('search filters the table or shows no results', async ({
    applicationListPage,
    page,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.waitForLoad();
    const noAppsHeading = page.getByRole('heading', {
      name: /don't have any applications/i,
    });
    if (await noAppsHeading.isVisible().catch(() => false)) {
      await expect(noAppsHeading).toBeVisible();
      return;
    }
    await applicationListPage.applicationsTable.search('__no_such_app_e2e__');
    await applicationListPage.waitForLoad();
    await expect(page.getByText('No results found')).toBeVisible();
  });

  test('Filter dropdown shows Type and Cluster options', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.applicationsTable.openFilter();
    await expect(applicationListPage.applicationsTable.getFilterMenu()).toBeVisible();
    // Listbox is often portaled — anchor by panel content, not getFilterMenu() descendant.
    const filterList = applicationListPage.applicationsTable.getFilterListbox();
    await expect(filterList).toBeVisible();
    await expect(
      filterList.getByText(APP_FILTER.groupTitles.type, { exact: true })
    ).toBeVisible();
    await expect(
      filterList.getByText(APP_FILTER.groupTitles.cluster, { exact: true })
    ).toBeVisible();
    await expect(
      applicationListPage.applicationsTable.getFilterOption(
        APP_FILTER.typeOptions.system
      )
    ).toBeVisible();
    // OpenShift type row only appears when there are OpenShift apps (count > 0).
    const openshiftFilter = applicationListPage.applicationsTable.getFilterOption(
      APP_FILTER.typeOptions.openshift
    );
    if ((await openshiftFilter.count()) > 0) {
      await expect(openshiftFilter).toBeVisible();
    }
    // With Type + Cluster sections, expect at least System plus one cluster checkbox.
    await expect(filterList.getByRole('checkbox').nth(1)).toBeVisible();
  });

  test('Create application dropdown shows Argo CD and Subscription options', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openCreateApplication();

    await expect(
      applicationListPage.applicationsTable.getCreateApplicationMenu()
    ).toBeVisible();

    await expect(
      applicationListPage.applicationsTable.getCreateMenuItem(
        APP_CREATE_MENU.options.argoPullModel
      )
    ).toBeVisible();

    await expect(
      applicationListPage.applicationsTable.getCreateMenuItem(
        APP_CREATE_MENU.options.argoPushModel
      )
    ).toBeVisible();

    await expect(
      applicationListPage.applicationsTable.getCreateMenuItem(
        APP_CREATE_MENU.options.subscription
      )
    ).toBeVisible();
    await expect(
      applicationListPage.applicationsTable.getCreateMenuItemById(
        APP_CREATE_MENU.optionIds.subscription
      )
    ).toContainText(APP_CREATE_MENU.subscriptionDeprecatedLabel);
  });

  test('export and pagination controls are visible when the applications table has data', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.waitForLoad();
    const table = applicationListPage.applicationsTable;
    const rowCount = await table.getTable().locator('tbody tr').count();
    if (rowCount === 0) test.skip();
    await expect(table.getExportButton()).toBeVisible();
    await expect(table.getPaginationTop()).toBeVisible();
    await expect(table.getPaginationBottom()).toBeVisible();
    await expect(table.getNextPageButton().first()).toBeVisible();
    await expect(table.getPreviousPageButton().first()).toBeVisible();
  });

  test('first row name link targets application details route', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.waitForLoad();
    const table = applicationListPage.applicationsTable;
    if ((await table.getTable().locator('tbody tr').count()) === 0) test.skip();
    const row = table.getFirstDataRow();
    const nameLink = table.getNameLink(row);
    await expect(nameLink).toBeVisible();
    const href = await nameLink.getAttribute('href');
    expect(href ?? '').toMatch(/\/multicloud\/applications\/details\//);
  });

  test('row actions menu opens with application actions', async ({
    applicationListPage,
    page,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.waitForLoad();
    const table = applicationListPage.applicationsTable;
    if ((await table.getTable().locator('tbody tr').count()) === 0) test.skip();
    await table.openRowActions(table.getFirstDataRow());
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const hasView = await menu
      .getByRole('menuitem', { name: APP_TABLE_ROW_ACTIONS.menuItemLabels[0] })
      .isVisible()
      .catch(() => false);
    const hasSearch = await menu
      .getByRole('menuitem', { name: APP_TABLE_ROW_ACTIONS.menuItemLabels[1] })
      .isVisible()
      .catch(() => false);
    expect(hasView || hasSearch).toBeTruthy();
    await page.keyboard.press('Escape');
  });

  test('Compare application types opens popover with type descriptions', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.applicationsTable.clickCompareApplicationTypes();

    const popover = applicationListPage.applicationsTable.getCompareApplicationTypesPopover();
    await expect(popover).toBeVisible();
    await expect(
      popover.getByRole('heading', { name: APP_COMPARE_POPOVER.title })
    ).toBeVisible();

    const body = applicationListPage.applicationsTable.getComparePopoverBody();
    await expect(body).toContainText(APP_COMPARE_POPOVER.typeDescriptions.argoPullModel);
    await expect(body).toContainText(APP_COMPARE_POPOVER.typeDescriptions.argoPushModel);
    await expect(body).toContainText(APP_COMPARE_POPOVER.typeDescriptions.subscription);
    await expect(body).toContainText(APP_CREATE_MENU.subscriptionDeprecatedLabel);
  });

  test('Overview table column help popovers show description and correct documentation link', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    const table = applicationListPage.applicationsTable;
    const columns = Object.keys(APP_TABLE_COLUMN_HELP.columns) as AppTableColumnHelpKey[];

    for (const columnLabel of columns) {
      if (!(await table.hasColumnHelp(columnLabel))) {
        continue;
      }
      await table.openColumnHelp(columnLabel);
      const popover = table.getColumnHelpPopover(columnLabel);
      await expect(popover).toBeVisible();
      await expect(popover).toContainText(APP_TABLE_COLUMN_HELP.columns[columnLabel]);
      const viewDocsLink = popover.getByRole('link', {
        name: APP_TABLE_COLUMN_HELP.viewDocsLinkText,
      });
      if (await viewDocsLink.isVisible()) {
        await expect(viewDocsLink).toHaveAttribute('href', APP_DOCS_MANAGING_APPLICATIONS_HREF_RE);
      }
      await expect(
        popover.getByRole('button', { name: APP_TABLE_COLUMN_HELP.closeButtonLabel })
      ).toBeVisible();
      await popover.getByRole('button', { name: APP_TABLE_COLUMN_HELP.closeButtonLabel }).click();
      await expect(popover).toBeHidden();
    }
  });

  test('switching to Advanced configuration shows that panel, back to Overview shows table', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await expect(applicationListPage.getOverviewContent()).toBeVisible();

    await applicationListPage.openAdvancedConfigTab();
    await expect(applicationListPage.getAdvancedConfigTab()).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await applicationListPage.openOverviewTab();
    await expect(applicationListPage.getOverviewContent()).toBeVisible();
  });

  test('Advanced configuration shows deprecation banner and Learn more documentation link', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();

    const banner = applicationListPage.getAdvancedDeprecationAlert();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(APP_ADVANCED_CONFIG.deprecationBanner.bodyPattern);
    const learnMore = applicationListPage.getAdvancedDeprecationLearnMoreLink();
    await expect(learnMore).toBeVisible();
    await expect(learnMore).toHaveAttribute('href', APP_DOCS_ADVANCED_DEPRECATION_HREF_RE);
  });

  test('Advanced configuration shows terminology card with title and View documentation link', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();

    await expect(applicationListPage.getAdvancedConfigContent()).toBeVisible();
    await expect(
      applicationListPage.getAdvancedTerminologyCardTitle()
    ).toBeVisible();
    const advancedViewDocsLink = applicationListPage.getAdvancedViewDocumentationLink();
    await expect(advancedViewDocsLink).toBeVisible();
    await expect(advancedViewDocsLink).toHaveAttribute(
      'href',
      APP_DOCS_MANAGING_APPLICATIONS_HREF_RE
    );
  });

  test('Advanced configuration resource toggle shows two options with Subscriptions selected', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();

    const sub = applicationListPage.getAdvancedResourceToggleButton(
      'subscriptions'
    );
    await expect(sub).toBeVisible();
    // Toggle / segmented control: prefer ARIA selected state (no design-system class checks).
    await expect
      .poll(async () => {
        const pressed = await sub.getAttribute('aria-pressed');
        const checked = await sub.getAttribute('aria-checked');
        const selected = await sub.getAttribute('aria-selected');
        return pressed === 'true' || checked === 'true' || selected === 'true';
      })
      .toBeTruthy();

    await expect(
      applicationListPage.getAdvancedResourceToggleButton('channels')
    ).toBeVisible();
  });

  test('Advanced configuration table has Subscriptions columns (Name, Namespace, Channel)', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();
    await applicationListPage.getAdvancedResourceToggleButton('subscriptions').click();
    await applicationListPage.waitForLoad();

    const hasResources = await applicationListPage.advancedConfigViewHasResources('subscriptions');
    if (!hasResources) {
      const emptyState = applicationListPage.getAdvancedEmptyState('subscriptions');
      await expect(emptyState).toBeVisible();
      // Subscriptions empty state includes body and Create application; other views may be minimal
      const hasBody =
        (await emptyState.getByText(APP_ADVANCED_CONFIG.emptyState.body).isVisible().catch(() => false)) ||
        (await emptyState
          .getByText(APP_ADVANCED_CONFIG.emptyState.bodyAltPattern)
          .isVisible()
          .catch(() => false));
      if (hasBody) {
        await expect(emptyState).toContainText('Create application');
        await expect(
          emptyState.getByRole('link', {
            name: APP_ADVANCED_CONFIG.emptyState.createApplicationLabel,
          })
        ).toBeVisible();
      }
      const viewDocsLink = emptyState.getByRole('link', {
        name: APP_ADVANCED_CONFIG.terminologyCard.viewDocsLinkText,
      });
      await expect(viewDocsLink).toBeVisible();
      await expect(viewDocsLink).toHaveAttribute(
        'href',
        APP_DOCS_MANAGING_APPLICATIONS_HREF_RE
      );
      return;
    }
    const table = applicationListPage.getAdvancedTable();
    await expect(table).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS.name,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS.namespace,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: /^Channel\b/,
      })
    ).toBeVisible();
  });

  test('Advanced configuration table has Channels columns (Name, Namespace, Type, Subscriptions)', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();
    await applicationListPage.getAdvancedResourceToggleButton('channels').click();
    await applicationListPage.waitForLoad();

    const hasResources = await applicationListPage.advancedConfigViewHasResources('channels');
    if (!hasResources) {
      const emptyState = applicationListPage.getAdvancedEmptyState('channels');
      await expect(emptyState).toBeVisible();
      const hasBodyCh =
        (await emptyState.getByText(APP_ADVANCED_CONFIG.emptyState.body).isVisible().catch(() => false)) ||
        (await emptyState
          .getByText(APP_ADVANCED_CONFIG.emptyState.bodyAltPattern)
          .isVisible()
          .catch(() => false));
      if (hasBodyCh) {
        await expect(emptyState).toContainText('Create application');
        await expect(
          emptyState.getByRole('link', {
            name: APP_ADVANCED_CONFIG.emptyState.createApplicationLabel,
          })
        ).toBeVisible();
      }
      const viewDocsLink = emptyState.getByRole('link', {
        name: APP_ADVANCED_CONFIG.terminologyCard.viewDocsLinkText,
      });
      await expect(viewDocsLink).toBeVisible();
      await expect(viewDocsLink).toHaveAttribute(
        'href',
        APP_DOCS_MANAGING_APPLICATIONS_HREF_RE
      );
      return;
    }
    const table = applicationListPage.getAdvancedTable();
    await expect(table).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_CHANNELS.name,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_CHANNELS.namespace,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: /^Type\b/,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: /^Subscriptions\b/,
      })
    ).toBeVisible();
  });

});
