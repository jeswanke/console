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

  /* Configure projects */
  projects: [
    // Setup project - authenticates once and saves state
    { 
      name: 'setup', 
      testMatch: /.*\.setup\.ts/,
    },

    // Non–Application Lifecycle UI (e.g. cluster list); excludes `src/tests/app/**` (see `alc`).
    {
      name: 'chromium',
      testIgnore: [/.*\.unit\.spec\.ts$/, 'app/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Use the authenticated state saved by setup
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Application Lifecycle (ALC) — `src/tests/app/**`; `./start.sh alc` sets E2E_GITOPS_PREP (GitOps prep runs with `--project alc`).
    {
      name: 'alc',
      testMatch: 'app/**/*.spec.ts',
      testIgnore: /.*\.unit\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Config / YAML unit tests (no hub login)
    {
      name: 'unit',
      testMatch: /.*\.unit\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: [],
    },
  ],
});
