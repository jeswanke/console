# Cypress → Playwright reference (console-e2e)

## Component → paths

| Component | Start | Spec glob | Fixtures |
|-----------|-------|-----------|----------|
| ALC | `./start.sh alc` | `src/tests/app/**/*.spec.ts` (excludes `app/rbac/`) | `@fixtures/app-test` |
| ALC RBAC | `./start.sh alc --grep @alc-rbac` | `src/tests/app/rbac/**/*.spec.ts` | `@fixtures/subscription-admin-test` |
| CLC | `./start.sh clc` | `src/tests/cluster/**/*.spec.ts` | cluster fixtures |
| GRC | `./start.sh grc` | `src/tests/governance/**/*.spec.ts` | governance fixtures |

## Typical ALC git port file map

| Concern | Location |
|---------|----------|
| Git app suite | `src/tests/app/subscription/git-applications.spec.ts` |
| Argo push suite | `src/tests/app/argo/push/argo-applications.spec.ts` |
| Argo pull suite | `src/tests/app/argo/pull/pull-model-applications.spec.ts` |
| Applications overview | `src/tests/app/overview/` |
| Subscription scenarios | `src/config/e2e-spec-data/applications/subscription.yaml` |
| Shared fragments | `src/config/e2e-spec-data/applications/_shared.yaml` |
| Create flow | `src/lib/app/subscription/create.ts` |
| Topology asserts | `src/lib/app/verify/topology-tab.ts` |
| Graph node ids | `src/lib/app/topology/graph-ids.ts` |
| Details asserts | `src/lib/app/verify/details-tab.ts` |
| oc checks | `src/lib/app/verify/resources-oc.ts` |

## Cypress → Playwright locator cheatsheet

| Cypress | Playwright |
|---------|------------|
| `cy.get('[href="#nodeIcon_pod"]')` | Prefer `g[data-id=…]` from `graph-ids` |
| `.parent().next().find('.success')` | `.pf-topology__node.pf-m-success` descendant |
| `cy.findByRole('tab', { name: 'Topology' })` | `getByRole('tab', { name: 'Topology' })` |
| `cy.waitUntil(() => …)` | `await expect.poll(…)` or `expect(locator).toBeVisible({ timeout })` |
| `cy.exec('oc …')` | `oc` fixture / `OcCliService` argv methods |
| `cy.labelTestResource` | namespace labels via `OcCliService` or test setup helpers |

## Playwriter probe templates

**Session:**

```bash
playwriter skill
playwriter session list
playwriter -s 1 -e 'console.log(context.pages().map(p => p.url()))'
```

**Topology surface (adjust URL):**

```bash
playwriter -s 1 -e '
const page = context.pages().find(p => p.url().includes("/topology")) ?? context.pages()[0];
const surface = page.locator("[data-test-id=topology]");
await surface.waitFor({ state: "visible", timeout: 120000 });
const ids = await surface.locator("g[data-kind=node][data-type=node]").evaluateAll(els =>
  els.map(e => e.getAttribute("data-id"))
);
const success = await surface.locator(".pf-topology__node.pf-m-success").count();
console.log(JSON.stringify({ ids, success }, null, 2));
'
```

**Icon audit (when considering Cypress parity):**

```bash
playwriter -s 1 -e '
const surface = page.locator("[data-test-id=topology]");
const types = ["application","subscription","cluster","placement","placements","placementdecision","pod","deployment","route","service","replicaset"];
const c = {};
for (const t of types) c[t] = await surface.locator(`[href="#nodeIcon_${t}"]`).count();
console.log(JSON.stringify(c));
'
```

## e2e-spec-data pattern

```yaml
# subscription.yaml — add test id to existing scenario when shape matches
auto_git_placement_topology:
  tests:
    - RHACM4K-39232
    - RHACM4K-41356   # same helloworld + local placement
```

Resolve in spec:

```typescript
const { subscription: options, applicationExpectations: expectations } =
  resolveSubscriptionScenarioByTestId('RHACM4K-41356');
```

Unit test:

```typescript
test('auto_git_placement_topology: RHACM4K-41356 resolves by Polarion id', () => {
  const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-41356', E2E_SPEC_DATA_DIR);
  expect(resolved.scenarioId).toBe('auto_git_placement_topology');
});
```

## Spec skeleton (ALC git)

```typescript
test(
  'RHACM4K-XXXX: ALC: <title from Cypress>',
  { tag: ['@e2e-common', '@RHACM4K-XXXX', '@create', '@UI'] },
  async ({ page, oc, applicationListPage, applicationDetailsPage, subscriptionApplicationCreateWizardPage }) => {
    test.setTimeout(300_000);
    const { subscription: options, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-XXXX');

    await oc.deleteNamespace(options.namespace);
    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);
    await oc.ensureManagedClusterSetBinding(options.namespace, 'global');

    await expectSubscriptionAppResourcesViaOc({ oc, ... });

    // UI assertions via lib helpers + page objects only
    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifySubscriptionAppTopologyTab({ page, detailsPage: applicationDetailsPage, ... });

    await applicationListPage.deleteApplicationFromOverviewViaSearch({ ... });
  }
);
```

## Commit message template

```
Add RHACM4K-<id> E2E for <one-line intent>

Port Cypress <suite> coverage to Playwright: <setup summary> and
<assertion helper>; extend e2e-spec-data when applicable.
```
