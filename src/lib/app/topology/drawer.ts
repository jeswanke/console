/**
 * Topology **drawer** panel readers (PlacementDecision and other node side panels).
 */
import { expect, type Page } from '@playwright/test';


/** Labeled field value from a visible topology drawer panel. */
export async function readTopologyDrawerLabeledField(
  page: Page,
  label: string | RegExp,
  options?: { timeout?: number }
): Promise<string | undefined> {
  const timeout = options?.timeout ?? 5_000;
  const deadline = Date.now() + timeout;
  const labelRe = typeof label === 'string' ? new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : label;

  while (Date.now() < deadline) {
    const panels = page.locator('[class*="drawer__panel"]');
    const n = await panels.count();
    for (let i = 0; i < n; i++) {
      const panel = panels.nth(i);
      if (!(await panel.isVisible().catch(() => false))) continue;
      const text = await panel.innerText().catch(() => '');
      if (!labelRe.test(text)) continue;

      const valueFromDom = await panel
        .locator('span.label')
        .filter({ hasText: labelRe })
        .first()
        .evaluate((labelEl) => {
          const row = labelEl.closest('div');
          const valueEl = row?.querySelector('span:not(.label)');
          return valueEl?.textContent?.trim() ?? '';
        })
        .catch(() => '');

      if (valueFromDom) {
        return valueFromDom;
      }

      const line = text
        .split('\n')
        .map((l) => l.trim())
        .find((l) => labelRe.test(l));
      if (line) {
        const afterColon = line.split(':').slice(1).join(':').trim();
        if (afterColon) return afterColon;
      }
    }
    await page.waitForTimeout(250);
  }
  return undefined;
}

/** Asserts a labeled topology drawer field matches `expected` (substring or regex). */
export async function expectTopologyDrawerLabeledField(
  page: Page,
  label: string | RegExp,
  expected: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30_000;
  await expect
    .poll(
      async () => {
        const value = await readTopologyDrawerLabeledField(page, label, { timeout: 2_000 });
        if (value === undefined) return false;
        return typeof expected === 'string' ? value.includes(expected) : expected.test(value);
      },
      { timeout, message: `Expected topology drawer field ${String(label)} to match ${String(expected)}` }
    )
    .toBe(true);
}

export async function expectVisibleTopologyDrawerContains(
  page: Page,
  pattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30_000;
  await expect
    .poll(
      async () => {
        const panels = page.locator('[class*="drawer__panel"]');
        const n = await panels.count();
        for (let i = 0; i < n; i++) {
          const panel = panels.nth(i);
          if (!(await panel.isVisible().catch(() => false))) continue;
          const text = await panel.innerText().catch(() => '');
          const ok =
            typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
          if (ok) return true;
        }
        return false;
      },
      { timeout, message: 'Expected a visible topology drawer panel with matching text' }
    )
    .toBe(true);
}
