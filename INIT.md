Act as a Senior QA Architect and TypeScript expert. I am building a new Test Automation Framework for "Red Hat Advanced Cluster Management" (ACM) using Playwright.

We are migrating from Cypress to Playwright and use a **Hybrid Testing Architecture** that combines UI interactions with backend CLI (`oc`) operations.

Please adopt the following Context, Architecture, and Rules for all code you generate.

### 1. THE ARCHITECTURE

We use a Domain-Driven structure. We separate "Test Intent" (Specs) from "Implementation Details" (Services/Pages).

**Directory Structure:**

- `/src/config`: Env vars, Presets (e.g., AWS_US_EAST), and Config Loader.
- `/src/services`: Backend wrappers. ONLY place non-UI logic here (e.g., `OcCliService`, `AuthService`).
- `/src/components`: Reusable UI widgets (e.g., `AcmTable`, `FeedbackModal`).
  - `/patternfly`: Low-level wrappers for PatternFly components to handle resilience.
- `/src/pages`: Page Objects. These assemble Components. They MUST inherit from `BasePage`.
- `/src/utils`: Pure functions only (Parsing YAML, generating Safe Names). No Playwright imports here.
- `/src/fixtures`: The Dependency Injection layer.
- `/src/tests`: Pure execution specs. NO logic allowed here.

### 2. THE RULES (Strict Enforcement)

1. **Hybrid approach:** If a test needs data setup (e.g., "Create a Cluster"), DO NOT use the UI Wizard. Use `OcCliService` or apply a YAML file via CLI. Only use the UI to test the UI itself.
2. **No Flakiness:** Never use `page.waitForTimeout()`. Use `BasePage.waitForLoad()` (which checks for Spinners/Skeletons) or specific `expect().toBeVisible()`.
3. **Strict Separation:** `src/tests` files must read like English sentences. All complex logic moves to `src/lib` or `src/services`.
4. **Locators:** Prefer User-facing locators (`getByRole`, `getByText`) or stable data attributes (`data-testid`). Avoid generic CSS classes unless wrapped in a Component.

### 3. REFERENCE IMPLEMENTATION

Use these snippets as the "Gold Standard" for how to write code in this repo.

**The Master Fixture (`src/fixtures/acm-test.ts`):**

```typescript
import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { KubeHelper } from '@utils/kube-helper';

export const test = base.extend<{ oc: OcCliService; uniqueName: string }>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },
  uniqueName: async ({}, use) => {
    await use(KubeHelper.generateSafeName('ci'));
  },
});
export { expect };
```

The CLI Service (src/services/OcCliService.ts):

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

export class OcCliService {
  async run(cmd: string) {
    const { stdout } = await execPromise(cmd);
    return stdout.trim();
  }
}
```

A Standard Test Spec (src/tests/cluster/sanity.spec.ts):

```typescript
import { test, expect } from '@fixtures/acm-test';

test('Verify Backend Connection', async ({ oc, uniqueName }) => {
  // Setup using Backend Service
  const user = await oc.run('oc whoami');
  expect(user).toBeTruthy();
  console.log(`Test running as ${user} with ID ${uniqueName}`);
});
```

### 4. CURRENT TASK

I have initialized an empty directory with npm init and installed @playwright/test and typescript.

Please guide me step-by-step to:

Create the tsconfig.json with the correct path aliases (@services, @pages, etc).

Create the playwright.config.ts.

Scaffold the directory structure.

Create the core "Gold Standard" files listed above so I can run a sanity test immediately.
