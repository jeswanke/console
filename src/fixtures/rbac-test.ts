import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';

export interface UserSession {
  readonly page: Page;
}

type RbacFixtures = {
  oc: OcCliService;
  asUser: (role: string) => Promise<UserSession>;
};

export const test = base.extend<RbacFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  asUser: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];

    await use(async (role: string) => {
      const ctx = await browser.newContext({
        storageState: `.auth/${role}.json`,
        ignoreHTTPSErrors: true,
        viewport: { width: 1920, height: 1080 },
      });
      contexts.push(ctx);
      const page = await ctx.newPage();
      return { page };
    });

    for (const ctx of contexts) await ctx.close();
  },
});

export { expect };
