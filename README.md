# ACM Console E2E Tests

Playwright-based E2E test framework for Red Hat Advanced Cluster Management (ACM).

## Prerequisites

1. **Node.js** 18+
2. **oc CLI** installed and logged into your cluster
3. **Playwright browsers** installed

```bash
npm install
npx playwright install chromium
```

## Environment Variables

**Recommended:** keep **universal** values in a repo-root **`.env`** (copy from **`.env.example`**). It is gitignored. **`./start.sh`** loads `.env` before `oc login`, and Playwright loads it via `src/config/index.ts`. Use **`HUB_PASSWORD`** for both `oc login` and the console UI step in **`auth.setup.ts`** (no separate console password).

**Ansible (AAP):** Prefer **`ANSIBLE_URL`** + **`ANSIBLE_TOWER_PASSWORD`** in repo-root **`.env`** (see **`.env.example`**). On non-unit runs, `globalSetup` runs `scripts/ansible/setup-ansible-template.sh` unless **`E2E_SKIP_ANSIBLE_PREP=1`**. If `ANSIBLE_TOKEN` is not provided, the prep script mints it from URL/password; if URL/password are not provided, it discovers route/password/token from cluster secrets in `AAP_NAMESPACE` (default `aap`). The script ensures `default/alc-ansible-secret` and can bootstrap AWX templates (disable with `E2E_ANSIBLE_AWX_BOOTSTRAP=0`).

**ALC-only (`env/alc.local.env`):** Copy **`env/alc.env.example`** → **`env/alc.local.env`** (gitignored). Used for **private Git auth** (**`GITHUB_USER`**, **`GITHUB_TOKEN`** — base64-encoded; repo URL in **e2e-spec-data**) and **object store** (`OBJECTSTORE_*`). Loaded by **`./start.sh alc`** and **`loadAlcLocalEnvFile()`** in `src/config/index.ts`. Tests use **`@lib/app/auth/private-git`** (`getPrivateGitAuthFromEnv`, `applyPrivateGitAuthToSubscriptionOptions`).

---

**Cluster API + console UI password:** `HUB_URL`, **`HUB_PASSWORD`** (or `HUB_TOKEN` for API login only — token-only flows still need a password in `.env` for `auth.setup` if you run UI login).

**OpenShift web console** (optional overrides for `auth.setup.ts` — same password is always **`HUB_PASSWORD`**):

| Variable           | Required | Default      | Description                                   |
| ------------------ | -------- | ------------ | --------------------------------------------- |
| `HUB_PASSWORD`     | **Yes**  | -            | Used for `oc login` and console UI login      |
| `CONSOLE_USERNAME` | No       | `kubeadmin`  | Username on the console login form            |
| `CONSOLE_IDP`      | No       | `kube:admin` | Identity provider link text on the login page |

> **Typical kubeadmin:** `.env` with `HUB_URL` + `HUB_PASSWORD` only.

### Playwright projects

| Project          | Scope                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **`setup`**      | Auth (`auth.setup.ts`) → **`.auth/admin.json`**                                             |
| **`rbac-setup`** | RBAC user auth (`rbac-auth.setup.ts`) — used by **`fg-rbac`** and **`fleet-virt`**          |
| **`cluster`**    | Cluster lifecycle — `src/tests/cluster/**` (**`./start.sh clc`** → **`--project cluster`**) |
| **`governance`** | Governance — `src/tests/governance/**` (**`./start.sh grc`** → **`--project governance`**)  |
| **`alc`**        | Application lifecycle — `src/tests/app/**` except `app/rbac/` (**`./start.sh alc`** → **`--project alc`**) |
| **`alc-rbac`**   | ALC subscription-admin RBAC — `src/tests/app/rbac/**` (**`--project alc-rbac`**)                            |
| **`fg-rbac`**    | Fine-grained RBAC — `src/tests/fg-rbac/**`                                                  |
| **`fleet-virt`** | Fleet virtualization — `src/tests/fleet-virt/**`                                            |
| **`unit`**       | YAML / loader tests — `src/tests/unit/**` (no hub)                                          |

**GitOps prep** in **`src/global-setup/gitOpsPrep.ts`** runs only when **`E2E_GITOPS_PREP`** is enabled (**`1/true/yes`**, set to `1` by default in **`./start.sh alc`**) **and** **`--project`** includes **`alc`** (and the run is not unit-only). Use **`E2E_GITOPS_PREP=0`** to disable. Non-ALC runs (e.g. **`--project cluster`**, **`--project governance`**) skip GitOps even if the env is set.

### Managed cluster context

By default, **`globalSetup`** runs managed-cluster prep for any non-unit run:

- **`scripts/cluster/generate-managed-cluster-data.py`** writes **`.auth/managedClusters.json`**
- **`scripts/cluster/setup-managed-cluster-kubeconfig.sh`** writes **`.auth/MC_MERGED_kubeconfig`** and renames spoke contexts to match `ManagedCluster` resource names

Managed-cluster prep is **skipped** when you run **only** the **`unit`** project (e.g. **`--project=unit`**) or when **`E2E_SKIP_MANAGED_CLUSTER_PREP=1`**.

You can skip only the kubeconfig merge step with **`E2E_SKIP_MANAGED_KUBECONFIG_MERGE=1`**.

Tests read **`.auth/managedClusters.json`** via **`loadManagedClusterContext()`** or the **`managedClusterContext`** fixture in **`app-test`**. Override the JSON path with **`MANAGED_CLUSTER_CONTEXT_PATH`**.

### Example Setup

```bash
export HUB_URL='https://api...:6443'
export HUB_PASSWORD='your-password-here'

npx playwright test
```

### Non-kubeadmin Users

```bash
export HUB_URL='https://api...:6443'
export HUB_PASSWORD='your-password-here'
export CONSOLE_USERNAME=testuser
export CONSOLE_IDP='my-ldap-provider'
```

### Using a .env file (optional)

See `.env.example`. `playwright.config` loads `.env` via `src/config/index.ts`.

```env
HUB_URL=https://api.example.com:6443
HUB_PASSWORD=your-password-here
CONSOLE_USERNAME=kubeadmin
CONSOLE_IDP=kube:admin
```

## Running Tests (start.sh)

From the repo root, log in to the hub API and run a **component** suite (shared setup, then component-specific Playwright defaults):

```bash
export HUB_URL='https://api.<cluster>:6443'
export HUB_PASSWORD='<kubeadmin-password>'
# or: export HUB_TOKEN='<token>'

./start.sh alc                          # ALC entrypoint: default --grep @alc, --project alc
./start.sh alc --grep @RHACM4K-64219    # single Polarion ticket
./start.sh alc --grep @sample           # exploratory specs only
./start.sh clc                          # CLC: default --grep @clc, --project cluster
./start.sh grc                          # GRC: default --grep @grc, --project governance
```

**Integration mode** (`TEST_MODE=integration` in `.env`): sample specs (`@sample`) are excluded (`PLAYWRIGHT_GREP_INVERT` and ignores in `playwright.config.ts`).

### ALC environment (no `CYPRESS_*` prefix)

**Universal environment** (any component): root **`./start.sh`** exports these **after** hub API login (`scripts/lib/common.sh`):

| Variable                                                 | How it is set                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `CONSOLE_USERNAME` / `CONSOLE_IDP`                       | Optional; set before login (password is always `HUB_PASSWORD`)                   |
| `BASE_URL`                                               | From `oc whoami --show-console` if unset                                         |
| `OC_CLUSTER_URL` / `OC_CLUSTER_USER` / `OC_CLUSTER_PASS` | Default from `HUB_URL`, `kubeadmin`, `HUB_PASSWORD` (override via env if needed) |
| `PLAYWRIGHT_TEST_MODE`                                   | Default `e2e`, or from `TEST_MODE` / explicit `PLAYWRIGHT_TEST_MODE`             |

**ALC-only file:** `./start.sh alc` also loads **`env/alc.local.env`** (gitignored) for **`GITHUB_USER`** / **`GITHUB_TOKEN`** (private Git auth) and **`OBJECTSTORE_*`** (see `env/alc.env.example`). **`ANSIBLE_*`** is read from repo-root **`.env`** with everything else.

Add more components later by extending the `case` in `start.sh` and adding e.g. `src/tests/<area>/start.sh`. Shared logic lives in `scripts/lib/common.sh`.

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test cluster-list.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run headed (see the browser)
npx playwright test --headed

# View test report
npx playwright show-report
```

## Project Structure

See **`docs/architecture-overview.md`** for the full ACM automation model. The subscription **Create application → Subscription** wizard is mapped in **`APP_SUBSCRIPTION_CREATE_WIZARD`** + **`SubscriptionApplicationCreateWizardPage`** (same locator style as **`ApplicationListPage`**). Optional screenshots under **`docs/images/`**.

This repo maps to it as follows:

```
console-e2e/
├── docs/                    # architecture-overview.md; optional images in docs/images/
├── start.sh                 # Dispatcher → e.g. src/tests/app/start.sh (ALC)
├── env/                     # ALC object-store template (alc.env.example); alc.local.env gitignored
├── scripts/
│   ├── lib/                 # Shared shell (common.sh, alc-env.sh)
│   ├── cluster/             # managedClusters.json + merged kubeconfig prep scripts
│   └── gitops/              # argocd integration bootstrap + YAML templates
├── src/
│   ├── config/              # .env loader, getHubAuth() / getTestConfig()
│   ├── constants/           # Selectors, strings
│   ├── components/
│   │   ├── patternfly/      # e.g. AcmTable
│   │   └── app/             # Domain widgets (ApplicationsTable)
│   ├── fixtures/            # app-test, acm-test
│   ├── lib/                 # Shared assertions / factories (expand)
│   ├── pages/
│   │   ├── BasePage.ts
│   │   ├── app/             # ApplicationListPage, SubscriptionApplicationCreateWizardPage
│   │   └── cluster/         # ClusterListPage, ClusterSetsPage
│   ├── services/            # OcCliService
│   ├── global-setup/        # clusterPrep, gitOpsPrep, projectArgv, logPrefix
│   ├── tests/
│   │   ├── auth.setup.ts
│   │   ├── app/             # ALC UI (`--project alc`; `app/rbac/` → `--project alc-rbac`)
│   │   │   ├── subscription/   # Git, Helm, Object, Ansible subscription suites
│   │   │   ├── argo/
│   │   │   │   ├── push/       # Push-model ApplicationSet suites
│   │   │   │   ├── pull/       # Pull-model ApplicationSet suites
│   │   │   │   └── platform/   # Argo CD agent, secrets, tolerations
│   │   │   ├── flux/           # Flux CD applications
│   │   │   ├── openshift/      # Native OCP applications
│   │   │   ├── overview/       # Applications list/table chrome
│   │   │   └── rbac/           # ALC RBAC (subscription-admin)
│   │   ├── cluster/         # CLC UI (`--project cluster`)
│   │   ├── governance/      # GRC UI (`--project governance`)
│   │   └── unit/            # Config / lib unit tests (`--project unit`)
│   └── utils/
├── .auth/                   # Auth state (gitignored)
├── playwright.config.ts
└── tsconfig.json
```

## Authentication Flow

1. **Global setup** cleans `.auth/` directory
2. **auth.setup.ts** logs in via UI and saves cookies to `.auth/user.json`
3. **All tests** automatically use the saved auth state (no login per test)

This runs once per `npx playwright test` execution.

## Writing New Tests

```typescript
import { test, expect } from '@fixtures/acm-test';

test.describe('My Feature', () => {
  test('should do something', async ({ page, oc, uniqueName }) => {
    // page - authenticated Playwright page
    // oc - OcCliService for backend operations
    // uniqueName - random unique name for test resources
  });
});
```
