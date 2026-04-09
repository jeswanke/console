import { type Locator, type Page } from '@playwright/test';

/** Root id on ACM console `AcmSearchInput` inside `AcmTable` toolbars (stolostron/console). */
export const ACM_TABLE_SEARCH_ROOT = '#custom-advanced-search';

/**
 * Fuzzy search field on ACM list toolbars.
 * Live hub (Playwriter): input uses `aria-label="Search input"` with implicit role `textbox`, not `searchbox`.
 * Fall back to `#custom-advanced-search input` if PF changes wrapper markup.
 */
export function acmToolbarSearchLocator(page: Page): Locator {
  return page
    .getByLabel(/search input/i)
    .or(page.locator(`${ACM_TABLE_SEARCH_ROOT} input`).first());
}
