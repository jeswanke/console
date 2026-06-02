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
  /* Reporters: HTML locally; JUnit XML for CI / tooling (`test-results/` is gitignored). */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },

  /*
   * Projects: setup → admin auth; rbac-setup → RBAC users; cluster / alc / fg-rbac / unit by testMatch.
   * ALC: `./start.sh alc` (--project alc).
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

    // Application Lifecycle (ALC) — `src/tests/app/**`; `./start.sh alc` sets E2E_GITOPS_PREP.
    {
      name: 'alc',
      testMatch: 'app/**/*.spec.ts',
      testIgnore: 'unit/**',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'governance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /governance/,
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

    // Config / YAML unit tests (no hub login) — `src/tests/unit/**`
    {
      name: 'unit',
      testMatch: 'unit/**/*.unit.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: [],
    },
  ],
});
