// Load `.env` via config layer (see src/config/index.ts)
import './src/config/index';
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src/tests',
  /* Clean up .auth/ before running tests */
  globalSetup: require.resolve('./src/global-setup'),
  /* Timeouts for slow-loading ACM console */
  timeout: 60000,        // Per-test timeout
  expect: {
    timeout: 15000,      // Per-assertion timeout (ACM pages load slowly)
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },

  /*
   * Projects — each test project uses testMatch to own its directories.
   *
   * Auth setup:
   *   setup       — admin login (always runs)
   *   rbac-setup  — RBAC user login (only runs when a dependent project has matching tests)
   *
   * Test projects (admin only):
   *   cluster     — src/tests/cluster/
   *   app         — src/tests/app/
   *
   * Test projects (admin + RBAC users):
   *   fg-rbac     — src/tests/fg-rbac/
   *
   * Adding a new domain:
   *   1. Add a project with testMatch: /your-domain/
   *   2. If it needs RBAC users: add dependencies: ['setup', 'rbac-setup']
   *      and add users to src/config/presets.ts with domains: ['your-domain']
   *   3. If admin-only: add dependencies: ['setup']
   *
   * CLI examples:
   *   npx playwright test --project=cluster           → setup → cluster tests
   *   npx playwright test --project=fg-rbac           → setup + rbac-setup → fg-rbac tests
   *   npx playwright test --project=cluster --project=app  → setup → cluster + app tests
   *   RBAC_DOMAIN=fg-rbac npx playwright test         → rbac-setup only authenticates fg-rbac users
   */
  projects: [
    {
      name: 'setup',
      testMatch: /\/auth\.setup\.ts/,
      timeout: 120_000,
    },

    {
      name: 'rbac-setup',
      testMatch: /rbac-auth\.setup\.ts/,
      timeout: 120_000,
    },

    // -- Admin-only test projects --

    {
      name: 'cluster',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /cluster/,
    },

    {
      name: 'app',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /app/,
    },

    // -- RBAC test projects --

    {
      name: 'fg-rbac',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup', 'rbac-setup'],
      testMatch: /fg-rbac/,
    },
  ],
});
