# CLAUDE.md

## Project Overview

This is a **Playwright-based E2E test framework** for **Red Hat Advanced Cluster Management (ACM)** console. It replaces the legacy Cypress framework at `/Users/dhuynh/projects/clc-ui-e2e`. The framework uses a **Hybrid Testing Architecture** — UI interactions for testing the UI, CLI/API operations for test data setup and teardown.

**Stack:** TypeScript, Playwright, PatternFly 6, OpenShift CLI (`oc`)

## Commands

```bash
npx playwright test                                  # Run all tests (all projects)
npx playwright test --project=cluster                # Run cluster tests (admin auth only)
npx playwright test --project=app                    # Run app tests (admin auth only)
npx playwright test --project=fg-rbac                # Run fg-rbac tests (admin + RBAC auth)
npx playwright test --project=cluster --project=app  # Run multiple projects (admin auth runs once)
npx playwright test -g "cluster list"                # Run tests matching pattern
npx playwright test --project=cluster --list         # List tests without running (verify project matching)
npx playwright show-report                           # Open HTML report

# RBAC domain filtering (CI — only authenticate users for this domain)
RBAC_DOMAIN=fg-rbac npx playwright test --project=fg-rbac
```

## Architecture

### Directory Structure

```text
src/
├── tests/          # Test specs — pure execution, reads like English
├── pages/          # Page Objects — inherit BasePage, assemble Components
├── components/     # Reusable UI widgets (AcmTable, etc.)
│   └── patternfly/ # Low-level PF6 component wrappers (future)
├── services/       # Backend wrappers (OcCliService, domain services)
├── lib/            # Browser utilities (openshiftLogin) — no test() calls, safe to import
├── fixtures/       # Playwright fixture definitions (DI layer)
├── constants/      # Selectors, routes, labels
├── config/         # Env vars, presets, user definitions
└── utils/          # Pure functions only (no Playwright imports)
```

### Key Patterns

- **Page Objects** inherit `BasePage` which provides `waitForLoad()` (checks for PF spinners/skeletons).
- **Fixtures** (`src/fixtures/acm-test.ts`) provide dependency injection — `oc`, `uniqueName`, page objects.
- **OcCliService** wraps `oc` CLI commands for backend operations (create resources, check status, get URLs).
- **AcmTable** is a reusable component for any ACM table with search, row selection, verification.
- **Selectors** are centralized in `src/constants/selectors.ts` with PF version prefix as a constant (`const PF = 'pf-v6-c'`).

### Auth Flow

Authentication uses **storageState** — login happens once during setup, browser cookies are saved to `.auth/*.json`, and tests load them instantly via `browser.newContext({ storageState })`. No runtime OAuth during tests.

**Single login implementation:** `src/lib/openshift-login.ts` contains `openshiftLogin()` — the one function that handles the OAuth flow. Both setup files call it. Never duplicate login logic in setup files or fixtures. Setup files (`.setup.ts`) have top-level `test()` calls that Playwright registers as side effects on import, so reusable functions must live in `src/lib/`, not in setup files.

**Setup projects:**

- `auth.setup.ts` → authenticates admin → saves `.auth/admin.json` (always runs)
- `rbac-auth.setup.ts` → authenticates RBAC users → saves `.auth/{role}.json` per user (only runs when a dependent project has matching tests). One `test()` per user for parallel execution and individual pass/fail. Filters by `RBAC_DOMAIN` env var.

**Playwright projects** — each domain owns its test directory via `testMatch`. No `testIgnore`. Adding a domain never requires editing other projects:

- `cluster` → `dependencies: ['setup']` → `testMatch: /cluster/`
- `app` → `dependencies: ['setup']` → `testMatch: /app/`
- `fg-rbac` → `dependencies: ['setup', 'rbac-setup']` → `testMatch: /fg-rbac/`

**RBAC users are per-domain** (e.g., `clc-e2e-fg-rbac-admin`, not shared `clc-e2e-admin`). Defined in `src/config/presets.ts` with `domains` tags. This prevents parallel CI nodes from conflicting on test data.

**Switching users in tests** — use the `asUser(role)` fixture from `src/fixtures/rbac-test.ts`:

```typescript
import { test, expect } from '@fixtures/rbac-test';
test('admin creates, viewer verifies', async ({ page, asUser }) => {
  // page is admin via storageState
  const viewer = await asUser('fg-rbac-view'); // loads .auth/fg-rbac-view.json, ~50ms
  await viewer.page.goto(url);
});
```

**Adding a new RBAC domain:**

1. Add users to `src/config/presets.ts` with `domains: ['your-domain']`
2. Add a project to `playwright.config.ts` with `dependencies: ['setup', 'rbac-setup']` and `testMatch: /your-domain/`
3. Use `asUser('role')` in tests. Area fixtures can wrap it to attach domain-specific page objects.

## Rules (Enforced)

1. **Hybrid approach:** Use `OcCliService` or YAML for data setup. Only use UI to test UI flows.
2. **No flakiness:** Never use `page.waitForTimeout()`. Use `waitForLoad()`, `expect().toBeVisible()`, or Playwright's auto-waiting.
3. **Strict separation:** Test specs in `src/tests/` must read like English. Complex logic goes in pages/services/components.
4. **Locators:** Prefer `getByRole()`, `getByText()`, or stable `data-testid` attributes. Avoid raw CSS classes unless wrapped in a Component. Use element IDs for menu items (e.g., `#hibernate-cluster`).
5. **No `testIsolation: false` patterns:** Each test should be independent. Use `test.describe.serial()` only for genuinely sequential workflows. Use API setup/teardown instead of relying on previous test state.

## Cypress Reference

The original Cypress tests are at `/Users/dhuynh/projects/clc-ui-e2e`. Reference when migrating:

- `cypress/views/` — Selector patterns and page interaction methods
- `cypress/tests/` — Test logic and workflows to replicate
- `cypress/apis/` — Backend API patterns (translate to OcCliService or k8s API calls)
- `PF6_MIGRATION_GUIDE.md` — PatternFly 6 selector patterns (also copied to this repo)

### Key Selector Mappings (Cypress → Playwright)

| Cypress Pattern                                            | Playwright Equivalent                                    |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `cy.get('#hibernate-cluster').click()`                     | `page.locator('#hibernate-cluster').click()`             |
| `cy.findByRole('menuitem', { name: /Resume/i })`           | `page.getByRole('menuitem', { name: /Resume/i })`        |
| `cy.get('button.pf-v6-c-tabs__link').contains('Overview')` | `page.getByRole('tab', { name: 'Overview' })`            |
| `cy.get('.pf-v6-c-chip__text, .pf-v6-c-label__text')`      | `page.locator('.pf-v6-c-label__text')` (PF6 uses Labels) |
| `cy.waitUntil(() => ...)`                                  | `await expect(locator).toBeVisible({ timeout: 30000 })`  |
| `cy.get('button').contains(text).click()`                  | `page.getByRole('button', { name: text }).click()`       |

### Patterns to Avoid from Cypress

These caused significant issues in the Cypress repo:

- **Broad selectors:** `cy.get('button').contains(text)` matched wrong elements (Lightspeed AI popover). Always scope with IDs or roles.
- **`a[text="..."]` selectors:** Invalid HTML attribute selectors that broke in PF6. Use element IDs or ARIA roles.
- **2400-line monolith files:** `managedCluster.js` mixed selectors, methods, and constants. Keep page objects focused and small.
- **Shared test state:** `testIsolation: false` caused cascade failures (hibernate test fails → resume test starts from wrong state → bulk test fails). Playwright's default isolation prevents this.
- **Custom `buttonShouldClickable` workarounds:** Cypress needed manual wait-until-clickable. Playwright's `click()` auto-waits for actionability.
- **Hardcoded `cy.wait(5000)`:** Replace with proper assertions or Playwright auto-waiting.

## PatternFly 6 Selectors

See `PF6_MIGRATION_GUIDE.md` for the complete reference. Key points:

- **Tabs:** `<button>` elements, use `getByRole('tab', { name: '...' })`
- **Menu items:** Have element IDs (e.g., `#hibernate-cluster`, `#edit-labels`, `#detach-cluster`), use `page.locator('#id')`
- **Dropdowns:** Use `pf-v6-c-menu` component, items are `button.pf-v6-c-menu__item` with `role="menuitem"`
- **Combobox options:** `role="option"` inside `role="listbox"`
- **Labels (chips):** `.pf-v6-c-label` with `.pf-v6-c-label__text` and `.pf-v6-c-label__actions` for close
- **Disabled state:** Check `aria-disabled="true"` or `pf-m-aria-disabled` class

## ACM Domain Knowledge

- **Cluster Lifecycle (CLC):** Create, import, hibernate, resume, detach, destroy managed clusters
- **ClusterSets:** Group clusters for access control. Global clusterset has special permissions (view/bind only, no admin)
- **Cluster Pools:** Pre-provisioned clusters from Hive ClusterDeployments
- **Automation:** Ansible Automation Platform integration for cluster lifecycle hooks
- **RBAC:** Per-domain test users defined in `src/config/presets.ts` (e.g., `clc-e2e-fg-rbac-admin`). Users must be pre-provisioned on the cluster via htpasswd IDP before tests run.
- **HyperShift:** Hosted control planes — CLI-based, separate from standard cluster creation

### Environment

- Hub cluster must be logged in via `oc login` before tests run
- `CYPRESS_SPOKE_CLUSTER` / spoke cluster env vars identify managed clusters for E2E tests
- Clusters take 8+ minutes to hibernate/resume — tests must account for this
- Lightspeed AI plugin adds popover buttons that can interfere with UI selectors
