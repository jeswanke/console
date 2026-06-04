// Load `.env` via config layer (see src/config/index.ts)
import './src/config/index';
import { defineConfig, devices } from '@playwright/test';

/** Sample / exploratory specs — not run when TEST_MODE=integration. */
const integrationTestMode =
  process.env.TEST_MODE ?? process.env.PLAYWRIGHT_TEST_MODE;
const sampleSpecIgnoreWhenIntegration =
  integrationTestMode === 'integration'
    ? ['**/applications-list.spec.ts', '**/cluster-list.spec.ts']
    : [];

const alcIntegrationTestIgnore = ['unit/**', ...sampleSpecIgnoreWhenIntegration];

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
   * Projects: setup → admin auth; rbac-setup → RBAC users; cluster / governance / alc / fg-rbac / fleet-virt / unit.
   * Component entrypoints: `./start.sh alc` | `clc` | `grc` | `fg-rbac` | `fleet-virt`
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
      testIgnore: sampleSpecIgnoreWhenIntegration,
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

    // Application Lifecycle (ALC) — `src/tests/app/**`; `./start.sh alc` sets E2E_GITOPS_PREP.
    {
      name: 'alc',
      testMatch: 'app/**/*.spec.ts',
      testIgnore: alcIntegrationTestIgnore,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup'],
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

    {
      name: 'fleet-virt',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup', 'rbac-setup'],
      testMatch: /fleet-virt/,
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
