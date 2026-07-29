---
name: cypress-to-playwright
description: >-
  Port a Cypress ALC/CLC/GRC test from application-ui-test to console-e2e Playwright:
  plan with Playwriter UI investigation, implement using hybrid architecture and
  e2e-spec-data, run via ./start.sh, iterate with Playwriter until green, cleanup,
  then suggest git add/commit. Use when the user asks to convert, port, or migrate
  a Cypress test, RHACM4K ticket, or Git_Application_Test_Suite case to Playwright.
---

# Cypress → Playwright port (console-e2e)

End-to-end workflow for porting one Polarion/Cypress test into this repo. **Execute all phases** unless the user narrows scope.

## Prerequisites (read first)

| Resource | Path |
|----------|------|
| Project conventions | `CLAUDE.md` |
| Layering / hybrid model | `docs/architecture-overview.md` |
| Playwriter (full docs) | Run `playwriter skill` — read **entire** output, no `head`/`tail` |
| Playwriter debug rule | `.cursor/rules/playwriter-e2e-debug.mdc` |
| Cypress source | `application-ui-test` / `clc-ui-e2e` (user may paste path) |

## Phase 1 — Understand the Cypress test

1. Locate the Cypress `it(...)` block: Polarion id, tags, app name, deploy path (`oc apply` vs wizard), assertions, cleanup.
2. Search **console-e2e** for the same `RHACM4K-*` id or similar spec — avoid duplicating work.
3. Note **component**: ALC → `./start.sh alc`, CLC → `clc`, GRC → `grc`.
4. List **dependencies**: managed cluster, GitOps prep, private Git creds, `local-cluster`, etc.

**Output:** Short summary (intent, deploy strategy, assertions, tags to preserve).

## Phase 2 — Write the port plan (before coding)

Produce a markdown plan the user can skim. Include:

### A. Mapping

| Cypress | Playwright target |
|---------|-------------------|
| `cy.visit` / views | `ApplicationDetailsPage`, `*ListPage`, `APP_ROUTES` |
| `cy.exec` / APIs | `OcCliService`, `src/templates/`, YAML apply |
| `cy.get` chains | `getByRole`, `data-test-id`, `graph-ids` `data-id` |
| Hard-coded app data | `src/config/e2e-spec-data/` + `resolve*ScenarioByTestId` |
| Assertions in spec | `src/lib/**/verify/*.ts` |

### B. Deploy strategy (pick one, justify)

- **Wizard + e2e-spec-data** (preferred for ALC git tests — matches `git-applications.spec.ts`).
- **oc apply template** only when Polarion requires CLI-only setup or wizard cannot reproduce the graph.

### C. Playwriter investigation script

Plan concrete probes **before** implementation. Example goals:

- Confirm PF6 locators (roles, `data-test-id`, SVG `data-id` vs legacy `#nodeIcon_*`).
- Record stable selectors and DOM shape (parent/child for status badges).
- Verify app state exists on hub or note setup steps.

Use session workflow:

```bash
playwriter session list          # or: playwriter session new
playwriter -s <id> -e '<probe>'  # single-quoted -e
```

**Do not** assume Cypress selectors work in PF6. **Do not** pipe `playwriter skill` through `head`.

### D. Files to touch (estimate)

- Spec: `src/tests/{app|cluster|governance}/*.spec.ts`
- Lib: `src/lib/**/verify/*.ts` (reusable assertions)
- YAML: `src/config/e2e-spec-data/**` if new scenario
- Constants: `src/constants/*.ts` only for stable UI strings
- Unit: `src/tests/unit/e2e-spec-data.unit.spec.ts` when YAML changes

### E. Reuse checklist

- [ ] Extend existing verify helper vs new function
- [ ] Share scenario YAML with related tickets when app shape matches
- [ ] Use `buildTopologyNodeDataIdsForSubscriptionBlock` / page objects, not spec logic
- [ ] Tags: `@RHACM4K-*`, `@e2e-common`, `@UI`, `@create`/`@edit` as in Cypress

**Stop and present the plan** if the user asked for plan-only; otherwise continue.

## Phase 3 — Implement (architecture rules)

**Layer discipline** (non-negotiable):

| Layer | Allowed |
|-------|---------|
| `src/tests/**` | `test`, `test.step`, fixtures, tags — **no** complex locators |
| `src/pages/**` | Locators, navigation, thin actions |
| `src/lib/**` | Flows, assertions, factories |
| `src/services/**` | `oc` / API only — no Playwright locators |
| `src/constants/**` | Routes, labels, stable ids |

**Quality bar:**

- **Reusability** — parameterize helpers; optional flags on existing flows (e.g. `assertGraphNodesSuccessStatus` on `verifySubscriptionAppTopologyTab`).
- **Maintainability** — accurate names (don’t name helpers after obsolete Cypress mechanics); one source of truth in YAML/`graph-ids`.
- **Minimal diff** — no unrelated refactors; match surrounding spec style (`git-applications.spec.ts`, etc.).
- **No** `page.waitForTimeout()` — use `expect`, `expect.poll`, `waitForLoad`.
- **Prefer** `getByRole` / `data-test-id` / `data-id` over XPath and zoom hacks.

**PF6 lessons (topology / apps):**

- `#nodeIcon_*` and `.success` are **unreliable**; use `g[data-id]` + `.pf-topology__node.pf-m-success` when asserting deploy status.
- Placement Decision uses `#nodeIcon_placementdecision`, not `placements`.

## Phase 4 — Validate statically

```bash
cd /path/to/console-e2e
npx tsc --noEmit
npx playwright test --project=unit
```

Add/update unit tests when e2e-spec-data scenarios change.

## Phase 5 — Run the test (CLI)

Use **component entrypoint**, not raw `npx playwright test` against an unauthenticated context:

```bash
./start.sh alc --workers=1 --grep @RHACM4K-<id>
./start.sh clc --workers=1 --grep @RHACM4K-<id>
./start.sh grc --workers=1 --grep @RHACM4K-<id>
```

Common mistake: missing space before `--grep` (e.g. `--workers=1--grep` → no tests found).

## Phase 6 — Iterate until green (Playwriter + fix loop)

On failure:

1. Read trace / error locator / page snapshot.
2. **Playwriter** on the user’s logged-in Chrome (same session when possible):
   - Navigate to failing URL.
   - Dump counts, `data-id`s, classes, roles — compare to helper assumptions.
3. Fix **helpers or YAML**, not the spec, when the issue is locator or data.
4. Re-run `./start.sh … --grep …`.
5. Repeat until pass.

**Playwriter unavailable?** Ask user to enable the extension on the console tab, or use `playwriter session new`. Do not give up after one CLI failure.

## Phase 7 — Cleanup pass (after first pass)

Re-read the diff with fresh eyes:

- Misleading names → rename while exports are still local.
- Duplicate setup blocks → only extract shared helper if another port is imminent (avoid premature abstraction).
- Dead constants, unused imports, commented Cypress ports.
- Module doc comment if new assertion pattern (see `topology-tab.ts` header).
- Confirm no `.cursor/`, `.env`, or secrets staged.

Run again:

```bash
npx tsc --noEmit
./start.sh <component> --workers=1 --grep @RHACM4K-<id>
```

## Phase 8 — Suggest git add / commit (do not commit unless asked)

```bash
git status
git diff --stat
```

Stage only port-related files. **Never** stage `.env`, `.cursor/`, credentials.

Draft message (HEREDOC style):

```bash
git add <paths…>

git commit -m "$(cat <<'EOF'
Add RHACM4K-<id> E2E for <short intent>

Port Cypress coverage to Playwright using <wizard|template> setup and
<helper> assertions; <e2e-spec-data note if any>.
EOF
)"
```

Per user rules: **only run `git commit` when explicitly requested.**

## Progress checklist (copy in chat)

```
Port RHACM4K-____:
- [ ] Phase 1: Cypress understood
- [ ] Phase 2: Plan + Playwriter probes defined
- [ ] Phase 3: Implemented (layers respected)
- [ ] Phase 4: tsc + unit
- [ ] Phase 5: ./start.sh run
- [ ] Phase 6: Playwriter iterate → pass
- [ ] Phase 7: Cleanup + re-run pass
- [ ] Phase 8: git add/commit suggested
```

## Additional reference

- Command templates, Playwriter probes, file patterns: [reference.md](reference.md)
