import { Page, Locator } from '@playwright/test';
import { GPU_COLUMN, CLUSTER_SELECTORS } from '@constants/cluster';

/**
 * Shared table helpers for cluster pages (Managed Clusters list, Nodes).
 *
 * Provides column header access via data-label, column value extraction,
 * popover/tooltip locators, and PF6 grid layout workaround.
 * Composed by page objects -- not a page itself.
 */
export class ClusterTable {
  constructor(private readonly page: Page) {}

  getColumnHeader(name: string): Locator {
    return this.page.locator(`th[data-label="${name}"]`);
  }

  getPopoverBody(): Locator {
    return this.page.locator(CLUSTER_SELECTORS.popoverBody);
  }

  getObservabilityMetricsLink(): Locator {
    return this.page.getByRole('link', {
      name: GPU_COLUMN.observabilityMetricsLink,
    });
  }

  async getColumnValues(columnLabel: string): Promise<string[]> {
    return this.page.evaluate((label) => {
      const cells = document.querySelectorAll(
        `td[data-label="${label}"]`,
      );
      return Array.from(cells).map((cell) =>
        (cell.textContent ?? '').trim(),
      );
    }, columnLabel);
  }

  /**
   * PF6 pf-m-grid-2xl uses CSS Grid with a template computed before async
   * columns (like GPU count) are added. This forces native table-cell layout
   * so dynamically-added columns render with proper width.
   */
  async forceNativeTableLayout(): Promise<void> {
    await this.page.evaluate(() => {
      const table = document.querySelector(
        'table[class*="pf-m-grid"]',
      ) as HTMLElement | null;
      if (!table) return;
      table.style.setProperty('display', 'table', 'important');
      table
        .querySelectorAll<HTMLElement>('thead')
        .forEach((el) =>
          el.style.setProperty(
            'display',
            'table-header-group',
            'important',
          ),
        );
      table
        .querySelectorAll<HTMLElement>('tbody')
        .forEach((el) =>
          el.style.setProperty(
            'display',
            'table-row-group',
            'important',
          ),
        );
      table
        .querySelectorAll<HTMLElement>('tr')
        .forEach((el) =>
          el.style.setProperty(
            'display',
            'table-row',
            'important',
          ),
        );
      table
        .querySelectorAll<HTMLElement>('th, td')
        .forEach((el) =>
          el.style.setProperty(
            'display',
            'table-cell',
            'important',
          ),
        );
    });
  }
}
