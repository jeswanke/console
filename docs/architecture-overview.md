# 🏗 ACM Automation Architecture Reference

_(Diagram: add `docs/images/architecture-overview.png` if you have the asset.)_

**Subscription create wizard (UI map):** `APP_SUBSCRIPTION_CREATE_WIZARD` in `src/constants/app.ts` and locators on **`SubscriptionApplicationCreateWizardPage`** (`src/pages/app/SubscriptionApplicationCreateWizardPage.ts`) — same pattern as **ApplicationListPage** / Advanced configuration getters. Entry: Applications → **Create application** → **Subscription** → `/multicloud/applications/create/subscription`. Optional PNG under `docs/images/` if you keep a visual reference.

This project follows a **Domain-Driven, Hybrid Testing Architecture**. We separate **"Test Intent"** (what we want to verify) from **"Implementation Details"** (how we click buttons or run CLI commands).

## 📂 Directory Structure Overview

```text
/src
├── /config            # Configuration & Environment Variables
├── /constants         # Static Strings (URLs, Selectors, Text)
├── /services          # Backend Logic (OC CLI, API Wrappers)
├── /utils             # Pure Functions (Parsing, Math, Formatting)
├── /components        # Reusable UI Widgets (Tables, Modals)
├── /pages             # Page Objects (Views that use Components)
├── /lib               # Complex Test Logic (Factories, Assertions)
├── /fixtures          # Test Runner Extensions (Dependency Injection)
└── /tests             # Executable Test Specs
```

A more comprehensive example:

```text
/acm-e2e-automation
├── .env                    <-- Secrets (API Tokens, Passwords). Gitignored.
├── .env.example            <-- Template for new developers.
├── .gitignore              <-- Ignore node_modules, test-results, .env, temp/.
├── .nvmrc                  <-- Enforces Node version (e.g., "20").
├── Dockerfile              <-- CI Environment (Playwright + oc CLI).
├── compose.yaml            <-- Docker Compose for local isolated runs.
├── package.json            <-- Scripts call ./start.sh.
├── playwright.config.ts    <-- The "Mixer" (Env + Presets + Projects).
├── start.sh                <-- Entrypoint: Auto-login, Version Detect, Test Runner.
├── tsconfig.json           <-- Strict Mode & Path Aliases (@utils, @pages, etc).
│
├── .github
│   └── workflows           <-- CI/CD
│       └── lint-and-test.yml <-- Runs ESLint & Typecheck on PRs.
│
├── .vscode
│   ├── extensions.json     <-- Recommends ESLint, Prettier.
│   └── settings.json       <-- Auto-format on save settings.
│
└── /src                    <-- Source Code
    │
    ├── /config             <-- Configuration Layer
    │   ├── presets.ts      <-- Shared Defaults (Regions, User Roles).
    │   ├── schema.ts       <-- TypeScript Interfaces for Config.
    │   └── index.ts        <-- Loader: Merges .env > Presets > Detected OCP Version.
    │
    ├── /constants          <-- "Source of Truth"
    │   ├── common.ts       <-- Global texts (Save, Cancel, Toast msgs).
    │   ├── cluster.ts      <-- Provider names, Statuses.
    │   ├── selectors.ts    <-- Versioned CSS selectors (v4.12 vs v4.14).
    │   └── routes.ts       <-- Central URL definitions.
    │
    ├── /services           <-- Backend Logic (No UI)
    │   ├── AuthService.ts       <-- Login logic (Token fetching, Cookie hijacking).
    │   ├── OcCliService.ts      <-- Wraps `oc` commands & `applyYaml`.
    │   └── /domains
    │       ├── CredentialService.ts <-- "Ensure Credential Exists".
    │       └── ClusterService.ts    <-- CLI checks for provisioning status.
    │
    ├── /templates          <-- Raw Data (YAMLs with placeholders)
    │   ├── /credentials
    │   ├── /policies
    │   └── install-config.yaml
    │
    ├── /utils              <-- "Dumb" Helpers (Pure Functions)
    │   ├── fs-helper.ts         <-- YAML parsing, Temp file cleanup.
    │   ├── data-helper.ts       <-- Date formatting, String manipulation.
    │   └── kube-helper.ts       <-- Version parsing, Safe Name generation.
    │
    ├── /components         <-- UI Widgets (The "Legos")
    │   ├── /common              <-- Global UI (Used across domains)
    │   │   ├── FeedbackModal.ts
    │   │   ├── ExportButton.ts
    │   │   └── ToastNotification.ts
    │   │
    │   ├── /patternfly          <-- Low-level Wrappers (Resilience Layer)
    │   │   ├── PfSelect.ts      <-- Dropdown logic (v4/v5 compatible).
    │   │   └── PfTable.ts       <-- Pagination/Sort logic.
    │   │
    │   ├── AcmTable.ts          <-- Extends PfTable with ACM logic.
    │   ├── AcmModal.ts
    │   └── WizardStepper.ts
    │
    ├── /pages              <-- Views (Assemble Components)
    │   ├── BasePage.ts     <-- Global Nav, User Menu, "Wait for Load".
    │   ├── /cluster
    │   │   ├── ClusterListPage.ts
    │   │   └── CreateClusterWizard.ts
    │   ├── /policy
    │   │   └── PolicyPage.ts
    │   └── /common
    │       └── Navigation.ts
    │
    ├── /lib                <-- "Smart" Logic (Assertions & Factories)
    │   ├── /assertions          <-- Reusable Verification
    │   │   └── FileAssertions.ts  <-- expectValidCsv().
    │   ├── UserFactory.ts       <-- API User Factory (Dynamic RBAC API).
    │   └── UiUserFactory.ts     <-- UI User Factory (Dynamic Browser Contexts).
    │
    ├── /fixtures           <-- Dependency Injection (The Glue)
    │   ├── acm-test.ts     <-- The Master Fixture. Injects Config, Services, Pages.
    │   └── base.ts
    │
    └── /tests              <-- Execution (Pure Specs - No Logic Here!)
        ├── /cluster
        │   ├── create-aws.spec.ts
        │   └── list-export.spec.ts
        ├── /policy
        │   ├── governance-e2e.spec.ts
        │   └── list-export.spec.ts
        └── /app
            ├── matrix-api.spec.ts
            └── matrix-ui.spec.ts
```

## 📚 Directory Deep Dive

### 1. `/src/config` (The Control Center)

**Purpose:** Manages how the test suite runs in different environments (Local vs. CI, etc.).

- **`presets.ts`**: Defines default values for different teams or regions.
  - Example: `AWS_US_EAST_1` preset might set `workerCount: 5`.
- **`schema.ts`**: TypeScript interfaces defining what our config looks like.
- **`index.ts`**: The "Loader". It merges `.env` files, environment variables, and presets into a single `testConfig` object used by the tests.

**Rule:** Never access `process.env` directly in a test. Always access `testConfig.cluster.url`.

### 2. `/src/services` (The Backend Layer)

**Purpose:** Handles all interactions that do not involve a browser. This is the "Hybrid" part of the framework.

- **`OcCliService.ts`**: A wrapper around the `oc` command-line tool. It handles login, context switching, and raw command execution.
- **`AuthService.ts`**: Handles fetching tokens and "Cookie Hijacking" to bypass the slow UI login screen.
- **`/domains/*.ts`**: Domain-specific logic.
  - Example: `CredentialService.ts` checks if a cloud provider secret exists in a namespace. If not, it uses a YAML template to create it instantly.

**Rule:** If you need to "Setup" data (create a cluster, policy, or secret), use a Service. Do not use the UI wizard for setup unless the test is specifically testing the wizard.

### 3. `/src/components` (The UI Widgets)

**Purpose:** Reusable pieces of the UI. Think of these as "Legos."

- **`/common`**: Components that appear everywhere.
  - Files: `FeedbackModal.ts`, `ToastNotification.ts`, `ExportButton.ts`.
- **`/patternfly`**: Low-level wrappers for the UI library.
  - Why? PatternFly updates frequently break selectors. By isolating logic here (e.g., "How to select an item in a Dropdown"), we protect the rest of the suite from breaking changes.
  - Files: `PfSelect.ts` (Dropdowns), `PfTable.ts` (Grids).
- **`AcmTable.ts`**: Extends `PfTable` but adds ACM-specific logic (e.g., searching for a Cluster Name in the search bar).

**Rule:** A Component never knows "which page" it is on. It only knows how to interact with itself (e.g., "I am a table, I can sort my rows").

### 4. `/src/pages` (The Views)

**Purpose:** Represents a full screen or "View" in the application. A Page Object assembles multiple Components together.

- **`BasePage.ts`**: The parent class. It contains the Navigation Bar, User Menu, and the logic for `waitForLoad()` (waiting for spinners to vanish).
- **`/cluster/ClusterListPage.ts`**:
  - Contains: An `AcmTable` component, a `CreateClusterButton` locator.
  - Logic: "Go to this URL", "Click the Create button".
- **`/policy/PolicyPage.ts`**:
  - Contains: A `WizardStepper` component, Form inputs.

**Rule:** Page Objects should not contain complex assertions. They should expose data or state for the test to assert on.

```typescript
// Bad - assertion in page object
async verifyClusterExists(name: string) {
    await expect(this.getClusterRow(name)).toBeVisible();
}

// Good - Expose data for test to assert
getClusterRow(name: string) {
    return this.page.locator(`tr:has-text("${name}")`);
}
```

### 5. `/src/lib` (Smart Logic)

**Purpose:** Helper classes that contain "Business Logic" for testing, but aren't strictly UI or Backend.

- **`/assertions`**: Reusable assertion logic (e.g. `oc-resource-list.ts`).
- **`/cluster`**: Hub fleet context (`managedClusterContext.ts`).
- **`/app`**:
  - **`subscription/`** — wizard types + create/edit flows + placement spec builders.
  - **`verify/`** — full Details / Topology tab checks and OC resource expectations.
  - **`topology/`** — graph `data-id` builders and drawer DOM helpers (no `oc`).
  - **`placement/`** — placement CR resolution via `OcCliService`.
  - **`auth/`**, **`setup/`** — private Git env, test teardown helpers; **`subscription/sync.ts`** — Details **Sync**.
- **`index.ts`**: Barrel re-exports for convenience; tests may import `@lib/app/<domain>/...` directly.

### 6. `/src/utils` (Pure Functions)

**Purpose:** "Dumb" helpers. Input -> Output. No side effects.

- **`kube-helper.ts`**: Logic to generate safe names (`test-cluster-x9z8`).
- **`fs-helper.ts`**: Logic to read/write/delete temporary YAML files.
- **`data-helper.ts`**: Regex parsing, Date formatting.

**Rule:** Code in utils should never import Playwright or the Config. It should be standard TypeScript/Node.js code.

```typescript
// Bad - Playwright dependency in utils
import { Page } from '@playwright/test';

// Bad - Config dependency in utils
import { testConfig } from '../config';

// Good - Pure function
export function generateClusterName(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### 7. `/src/fixtures` (The Dependency Injection)

**Purpose:** The "Glue" that connects everything. This is where we configure the Playwright Test Runner to automatically initialize our classes.

- **`acm-test.ts`**: The master fixture file.
  - It initializes `OcCliService`.
  - It creates a `uniqueName` for the test.
  - It sets up the `adminPage` (logged in) and `viewerPage` (logged in).
  - Usage: Tests import `test` from here, not from `@playwright/test`.

### 8. `/src/tests` (The Execution Layer)

**Purpose:** The script that actually runs.

**Rule:** Tests must be Simple and Declarative.

- **Bad Test**: Contains CSS selectors, hardcoded waits, or complex loops.
- **Good Test**: Reads like an English sentence.
  - **Setup**: "Admin creates a policy."
  - **Action**: "Viewer logs in and views the policy."
  - **Assert**: "Viewer cannot see the delete button."

### 9. Error Handling & Debugging

**Purpose:** Consistent error handling and debugging strategies.

- **Global Error Handlers**: Capture screenshots and logs on failure
- **Retry Strategies**: Exponential backoff for flaky operations
- **Debug Information**: Collect context for test failures
- **Custom Assertions**: Domain-specific assertion messages

**Rule:** Every page interaction should have proper error context.

### 10. Performance & Scalability

**Purpose:** Optimize test execution speed and reliability.

- **Parallel Execution**: Worker configuration and test isolation
- **Resource Management**: Cleanup and memory optimization
- **Smart Waiting**: Avoid arbitrary timeouts
- **API vs UI**: Use hybrid approach for setup/teardown

**Rule:** Setup data via API, test interactions via UI.

---

## `console-e2e` — layout in _this_ repository

The tree below is what **this** repo implements today (aligned with the layers above). Bash entrypoints live **outside** `/src` (`start.sh`, `scripts/*`). Env templates live in **`env/`** at the repo root.

```text
console-e2e/
├── start.sh                    # Main dispatcher → component scripts
├── .env / .env.example         # Universal vars (HUB_*, optional ANSIBLE_* for AAP, CONSOLE_*, TEST_MODE); start.sh sources .env before oc login
├── playwright.config.ts        # Imports ./src/config/index (loads .env), projects, reporters
├── package.json                # `npm run test`, `npm run test:alc` → ./start.sh alc
├── env/
│   └── alc.env.example         # ALC template (GITHUB_USER/TOKEN, OBJECTSTORE_*) → env/alc.local.env (gitignored)
├── scripts/
│   ├── lib/common.sh           # Login, npm; exports CONSOLE_USERNAME/CONSOLE_IDP before login; after login universal env (BASE_URL, OC_CLUSTER_*, PLAYWRIGHT_TEST_MODE)
│   ├── lib/alc-env.sh          # Sources env/alc.local.env (GITHUB_USER/TOKEN, OBJECTSTORE_*; ANSIBLE_* in .env)
│   ├── cluster/
│   │   ├── generate-managed-cluster-data.py
│   │   └── setup-managed-cluster-kubeconfig.sh
│   └── gitops/
│       ├── argocd-integration.sh
│       └── templates/
│           ├── argocd_yaml/
│           └── operators_yaml/
└── src/
    ├── config/                 # §1 — loader + types
    │   ├── schema.ts
    │   ├── presets.ts
    │   └── index.ts            # dotenv + loadAlcLocalEnvFile() + getHubAuth() / getTestConfig()
    ├── constants/              # §2 — selectors, app copy
    │   ├── selectors.ts
    │   └── app.ts              # APP_ROUTES, APP_CREATE_MENU, APP_SUBSCRIPTION_CREATE_WIZARD, …
    ├── services/               # §2 — OcCliService (AuthService / domains: add as needed)
    │   └── OcCliService.ts
    ├── utils/                  # §6
    │   └── kube-helper.ts
    ├── components/             # §3
    │   ├── patternfly/         # Low-level / shared table widgets
    │   │   └── AcmTable.ts
    │   └── app/                # Domain widget (Applications table)
    │       └── ApplicationsTable.ts
    ├── pages/                  # §4
    │   ├── BasePage.ts
    │   ├── app/
    │   │   ├── ApplicationListPage.ts
    │   │   └── SubscriptionApplicationCreateWizardPage.ts  # Create application → Subscription wizard locators
    │   └── cluster/
    │       ├── ClusterListPage.ts
    │       └── ClusterSetsPage.ts
    ├── lib/                    # §5 — assertions, factories (expand here)
    │   ├── assertions/         # Playwright `expect.poll` + services (e.g. oc list assertions)
    │   │   └── oc-resource-list.ts
    │   ├── app/                # ALC orchestration + verification helpers
    │   └── index.ts
    ├── fixtures/               # §7
    │   ├── acm-test.ts
    │   └── app-test.ts
    ├── global-setup.ts         # Playwright global setup entrypoint
    ├── global-setup/           # Setup modules
    │   ├── clusterPrep.ts
    │   ├── gitOpsPrep.ts
    │   ├── projectArgv.ts
    │   ├── logPrefix.ts
    │   └── repoRoot.ts
    └── tests/                  # §8
        ├── auth.setup.ts       # Uses getHubAuth() from @config (not raw process.env)
        ├── app/
        │   └── applications-list.spec.ts
        └── cluster/
            └── cluster-list.spec.ts
```

**Conventions**

- Prefer **`getHubAuth()` / `getTestConfig()`** from `@config` over **`process.env` in specs and setup** (see `auth.setup.ts`).
- **Cluster** page objects live under **`pages/cluster/`**; **app** pages under **`pages/app/`**.
- **`AcmTable`** lives under **`components/patternfly/`** as the shared PF-oriented table primitive.
- Keep setup orchestration in **`src/global-setup.ts`** and setup implementation details in **`src/global-setup/*`**.
- Optional **`templates/`**, **`services/domains/`**, and **`constants/routes.ts`** can be added when needed without changing the overall model.
