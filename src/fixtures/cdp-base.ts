/* Copyright Contributors to the Open Cluster Management project */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import fs from 'fs';

/**
 * Base `test` for all domain fixtures (acm-test, app-test, rbac-test, etc)
 * and the auth setup files (auth.setup.ts, rbac-auth.setup.ts).
 *
 * Normally Playwright launches its own browser per worker, and creates a
 * fresh isolated context/page per test. Set `PW_CDP_ENDPOINT` (e.g.
 * `http://localhost:9222`) to instead attach to an already-running Chrome
 * over the Chrome DevTools Protocol — for example the Chrome window opened
 * by the "Launch Chrome E2E" VS Code debug config (configured with
 * `"port": 9222`, i.e. `--remote-debugging-port=9222`) — and drive the
 * window/tab you already have open, rather than opening a new one.
 *
 * Note: a fresh isolated `browser.newContext()` shows up as a *new Chrome
 * window* (not a new instance/process) when connected over CDP, which looks
 * like Playwright launched its own browser even though it didn't. Reusing
 * the existing context/page below avoids that.
 *
 * Leave `PW_CDP_ENDPOINT` unset for normal runs; behavior is unchanged. If
 * it's set but nothing is listening at that endpoint (e.g. you forgot to
 * launch the debug Chrome), falls back to a normally launched browser
 * instead of failing the run.
 */
const CDP_ENDPOINT = process.env.PW_CDP_ENDPOINT;

interface StorageStateFile {
  cookies?: Parameters<BrowserContext['addCookies']>[0];
  origins?: { origin: string; localStorage: { name: string; value: string }[] }[];
}

function loadStorageState(source: string | StorageStateFile | undefined): StorageStateFile | undefined {
  if (!source) return undefined;
  if (typeof source !== 'string') return source;
  if (!fs.existsSync(source)) return undefined;
  return JSON.parse(fs.readFileSync(source, 'utf-8'));
}

/**
 * Re-applies cookies + localStorage from a `storageState` file onto an
 * already-open context, since it wasn't created via `browser.newContext({
 * storageState })`. Applied at most once per context (flagged on the
 * context instance) since the context is reused across every test in the
 * worker instead of being recreated.
 */
async function applyStorageStateOnce(context: BrowserContext, state: StorageStateFile | undefined): Promise<void> {
  const alreadyApplied = (context as unknown as { __cdpStorageStateApplied?: boolean }).__cdpStorageStateApplied;
  if (!state || alreadyApplied) return;
  (context as unknown as { __cdpStorageStateApplied?: boolean }).__cdpStorageStateApplied = true;

  if (state.cookies?.length) {
    await context.addCookies(state.cookies);
  }
  for (const { origin, localStorage } of state.origins ?? []) {
    if (!localStorage.length) continue;
    await context.addInitScript(
      ({ origin, entries }: { origin: string; entries: { name: string; value: string }[] }) => {
        if (window.location.origin !== origin) return;
        for (const { name, value } of entries) window.localStorage.setItem(name, value);
      },
      { origin, entries: localStorage }
    );
  }
}

export const test = CDP_ENDPOINT
  ? base.extend({
      browser: async ({}, use, workerInfo) => {
        let cdpBrowser;
        try {
          cdpBrowser = await chromium.connectOverCDP(CDP_ENDPOINT);
        } catch (error) {
          console.warn(
            `[cdp-base] Could not connect to Chrome at ${CDP_ENDPOINT} (PW_CDP_ENDPOINT): ` +
              `${error instanceof Error ? error.message : String(error)}\n` +
              `[cdp-base] Launch the "Launch Chrome E2E" VS Code debug config first to attach to it. ` +
              `Falling back to a normally launched browser for this run.`
          );
        }

        if (cdpBrowser) {
          await use(cdpBrowser);
          // Deliberately not calling browser.close(): over CDP that sends the
          // `Browser.close` command and kills the real Chrome window instead
          // of just disconnecting Playwright from it.
          return;
        }

        const browser = await chromium.launch(workerInfo.project.use.launchOptions);
        await use(browser);
        await browser.close();
      },

      context: async ({ browser }, use, testInfo) => {
        // Reuse the browser's existing context (the window/tab you already
        // opened) instead of `browser.newContext()`, which would show up as
        // an extra Chrome window.
        const context: BrowserContext = browser.contexts()[0] ?? (await browser.newContext());
        await applyStorageStateOnce(context, loadStorageState(testInfo.project.use.storageState));
        await use(context);
        // Deliberately not closing: it's the real window/tab you opened,
        // not one Playwright created — closing it would close your window.
      },

      page: async ({ context }, use) => {
        const page: Page = context.pages()[0] ?? (await context.newPage());
        await use(page);
      },
    })
  : base;
