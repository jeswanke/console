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

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPTIONS_HUB_USER` | No | `kubeadmin` | Username for console login |
| `OPTIONS_HUB_PASSWORD` | **Yes** | - | Password for console login |
| `OPTIONS_HUB_IDP` | No | `kube:admin` | Identity provider name (as shown on login page) |

> **For kubeadmin clusters**: You only need to set `OPTIONS_HUB_PASSWORD`. The defaults handle the rest.

### Example Setup

```bash
# Login to your cluster first
oc login https://api.your-cluster.example.com:6443 -u kubeadmin -p <password>

# Minimal setup (kubeadmin with defaults)
export OPTIONS_HUB_PASSWORD='your-password-here'

# Run tests
npx playwright test
```

### Non-kubeadmin Users

If using a different user/IDP:

```bash
export OPTIONS_HUB_USER=testuser
export OPTIONS_HUB_PASSWORD='your-password-here'
export OPTIONS_HUB_IDP='my-ldap-provider'
```

### Using a .env file (optional)

Create a `.env` file in the project root:

```env
OPTIONS_HUB_USER=kubeadmin
OPTIONS_HUB_PASSWORD=your-password-here
OPTIONS_HUB_IDP=kube:admin
```

Then install dotenv and load it:

```bash
npm install dotenv
```

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

```
console-e2e/
├── src/
│   ├── components/      # Reusable UI components
│   ├── fixtures/        # Playwright fixtures (dependency injection)
│   ├── pages/           # Page Objects
│   ├── services/        # Backend services (OcCliService, AuthService)
│   ├── tests/           # Test specs organized by domain
│   │   ├── auth.setup.ts    # Authentication setup (runs first)
│   │   └── cluster/         # Cluster-related tests
│   └── utils/           # Helpers (KubeHelper, etc.)
├── .auth/               # Auth state (auto-generated, gitignored)
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
