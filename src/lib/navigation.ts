import type { Page } from '@playwright/test';

/**
 * Normalizes a URL pathname for comparison (trailing slashes removed; root becomes `/`).
 */
export function normalizeConsolePathname(pathname: string): string {
  const p = pathname.replace(/\/+$/, '');
  return p.length === 0 ? '/' : p;
}

/**
 * Whether the current page URL pathname equals the expected console path (host and query ignored).
 * `expectedPathname` must start with `/` (e.g. {@link APP_ROUTES.list}).
 */
export function pageUrlPathnameEquals(page: Page, expectedPathname: string): boolean {
  const expected = normalizeConsolePathname(
    expectedPathname.startsWith('/') ? expectedPathname : `/${expectedPathname}`
  );
  try {
    const current = normalizeConsolePathname(new URL(page.url()).pathname);
    return current === expected;
  } catch {
    return false;
  }
}
