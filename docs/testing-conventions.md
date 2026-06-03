# Testing conventions

## Layer rules

| Layer | Purpose |
| ----- | ------- |
| `src/tests/**` | Specs only — `test.step`, fixtures, tags. No complex logic. |
| `src/pages/**` | Page objects (`BasePage`, locators, navigation). |
| `src/components/**` | Reusable widgets (`ApplicationsTable`, PF wrappers). |
| `src/lib/**` | Flows, assertions, factories (e.g. `placement-preview-flow.ts`). |
| `src/services/**` | `oc` / API only — no Playwright locators. |
| `src/config/e2e-spec-data/**` | Scenario YAML + `resolve*ScenarioByTestId`. |
| `src/templates/**` | Fixture YAML applied via `OcCliService`. |

## Tags

| Tag | Use |
| --- | --- |
| `@alc` / `@clc` / `@grc` | Component suite (default grep for `./start.sh`). |
| `@RHACM4K-*` | Polarion-backed regression tests. |
| `@sample` | Exploratory / scaffold — **not** run in integration mode. |
| `@UI` | Console UI (vs unit/oc-only). |

## Integration runs (`TEST_MODE=integration`)

- Sets `PLAYWRIGHT_TEST_MODE=integration`.
- **ALC:** ignores `applications-list.spec.ts`; defaults `PLAYWRIGHT_GREP_INVERT=@sample`.
- **CLC:** ignores `cluster-list.spec.ts`; defaults `PLAYWRIGHT_GREP_INVERT=@sample`.
- Prefer ticket runs: `./start.sh alc --grep @RHACM4K-64219`.

## Component entrypoints

```bash
./start.sh alc   # --project alc,  E2E_GITOPS_PREP=1
./start.sh clc   # --project cluster
./start.sh grc   # --project governance
```

## GitOps prep

Argo / Git push tests need `E2E_GITOPS_PREP` (set by `./start.sh alc`). Subscription-only tests do not.
