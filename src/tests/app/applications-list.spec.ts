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
  APP_TABLE_COLUMN_HELP,
  APP_ADVANCED_CONFIG,
  APP_ADVANCED_TABLE_COLUMNS,
  APP_ADVANCED_TABLE_COLUMNS_CHANNELS,
  APP_ADVANCED_TABLE_COLUMNS_PLACEMENTS,
  APP_ADVANCED_TABLE_COLUMNS_PLACEMENT_RULES,
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

  test('search for "aap" shows aap app in table', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.applicationsTable.search('aap');
    await applicationListPage.waitForLoad();
    const row = applicationListPage.applicationsTable.getRowByName('aap');
    await expect(row).toBeVisible();
  });

  test('Filter dropdown shows Type and Cluster options', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.applicationsTable.openFilter();
    const filterMenu = applicationListPage.applicationsTable.getFilterMenu();
    await expect(filterMenu).toBeVisible();
    await expect(
      applicationListPage.applicationsTable.getFilterOption('System')
    ).toBeVisible();
    await expect(
      applicationListPage.applicationsTable.getFilterOption('OpenShift')
    ).toBeVisible();
  });

  test('Create application dropdown shows menu with Argo CD and Subscription options and their descriptions', async ({
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
    const argoPullDesc = applicationListPage.applicationsTable.getCreateMenuItemDescription(
      APP_CREATE_MENU.optionIds.argoPullModel
    );
    await expect(argoPullDesc).toBeVisible();
    await expect(argoPullDesc).toContainText(APP_CREATE_MENU.optionDescriptions.argoPullModel);

    await expect(
      applicationListPage.applicationsTable.getCreateMenuItem(
        APP_CREATE_MENU.options.argoPushModel
      )
    ).toBeVisible();
    const argoPushDesc = applicationListPage.applicationsTable.getCreateMenuItemDescription(
      APP_CREATE_MENU.optionIds.argoPushModel
    );
    await expect(argoPushDesc).toBeVisible();
    await expect(argoPushDesc).toContainText(APP_CREATE_MENU.optionDescriptions.argoPushModel);

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

  test('Compare application types opens popover with type descriptions', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.applicationsTable.clickCompareApplicationTypes();

    const popover = applicationListPage.applicationsTable.getCompareApplicationTypesPopover();
    await expect(popover).toBeVisible();
    await expect(
      popover.getByRole('heading', { name: APP_COMPARE_POPOVER.title, level: 6 })
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
      await table.openColumnHelp(columnLabel);
      const popover = table.getColumnHelpPopover(columnLabel);
      await expect(popover).toBeVisible();
      await expect(popover).toContainText(APP_TABLE_COLUMN_HELP.columns[columnLabel]);
      const viewDocsLink = popover.getByRole('link', {
        name: APP_TABLE_COLUMN_HELP.viewDocsLinkText,
      });
      if (await viewDocsLink.isVisible()) {
        await expect(viewDocsLink).toHaveAttribute('href', APP_TABLE_COLUMN_HELP.viewDocsHref);
      }
      await expect(
        popover.getByRole('button', { name: APP_TABLE_COLUMN_HELP.closeButtonLabel })
      ).toBeVisible();
      await popover.getByRole('button', { name: APP_TABLE_COLUMN_HELP.closeButtonLabel }).click();
      await expect(popover).not.toBeVisible();
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
      APP_ADVANCED_CONFIG.terminologyCard.viewDocsHref
    );
  });

  test('Advanced configuration resource toggle shows all four options with Subscriptions selected', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();

    const sub = applicationListPage.getAdvancedResourceToggleButton(
      'subscriptions'
    );
    await expect(sub).toBeVisible();
    await expect(sub).toHaveAttribute('aria-pressed', 'true');

    await expect(
      applicationListPage.getAdvancedResourceToggleButton('channels')
    ).toBeVisible();
    await expect(
      applicationListPage.getAdvancedResourceToggleButton('placements')
    ).toBeVisible();
    await expect(
      applicationListPage.getAdvancedResourceToggleButton('placementRules')
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
      if (await emptyState.getByText(APP_ADVANCED_CONFIG.emptyState.body).isVisible()) {
        await expect(emptyState).toContainText(APP_ADVANCED_CONFIG.emptyState.body);
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
        APP_ADVANCED_CONFIG.terminologyCard.viewDocsHref
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
      if (await emptyState.getByText(APP_ADVANCED_CONFIG.emptyState.body).isVisible()) {
        await expect(emptyState).toContainText(APP_ADVANCED_CONFIG.emptyState.body);
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
        APP_ADVANCED_CONFIG.terminologyCard.viewDocsHref
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

  test('Advanced configuration table has Placements columns (Name, Namespace, Clusters, Created)', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();
    await applicationListPage.getAdvancedResourceToggleButton('placements').click();
    await applicationListPage.waitForLoad();

    const hasResources = await applicationListPage.advancedConfigViewHasResources('placements');
    if (!hasResources) {
      const emptyState = applicationListPage.getAdvancedEmptyState('placements');
      await expect(emptyState).toBeVisible();
      if (await emptyState.getByText(APP_ADVANCED_CONFIG.emptyState.body).isVisible()) {
        await expect(emptyState).toContainText(APP_ADVANCED_CONFIG.emptyState.body);
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
        APP_ADVANCED_CONFIG.terminologyCard.viewDocsHref
      );
      return;
    }
    const table = applicationListPage.getAdvancedTable();
    await expect(table).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_PLACEMENTS.name,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_PLACEMENTS.namespace,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: /^Clusters\b/,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_PLACEMENTS.created,
        exact: true,
      })
    ).toBeVisible();
  });

  test('Advanced configuration table has Placement rules columns (Name, Namespace, Clusters, Replicas, Created)', async ({
    applicationListPage,
  }) => {
    await applicationListPage.goto();
    await applicationListPage.openAdvancedConfigTab();
    await applicationListPage.getAdvancedResourceToggleButton('placementRules').click();
    await applicationListPage.waitForLoad();

    const hasResources =
      await applicationListPage.advancedConfigViewHasResources('placementRules');
    if (!hasResources) {
      const emptyState = applicationListPage.getAdvancedEmptyState('placementRules');
      await expect(emptyState).toBeVisible();
      if (await emptyState.getByText(APP_ADVANCED_CONFIG.emptyState.body).isVisible()) {
        await expect(emptyState).toContainText(APP_ADVANCED_CONFIG.emptyState.body);
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
        APP_ADVANCED_CONFIG.terminologyCard.viewDocsHref
      );
      return;
    }
    const table = applicationListPage.getAdvancedTable();
    await expect(table).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_PLACEMENT_RULES.name,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_PLACEMENT_RULES.namespace,
        exact: true,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: /^Clusters\b/,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: /^Replicas\b/,
      })
    ).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: APP_ADVANCED_TABLE_COLUMNS_PLACEMENT_RULES.created,
        exact: true,
      })
    ).toBeVisible();
  });
});
