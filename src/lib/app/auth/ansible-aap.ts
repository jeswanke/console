/**
 * Ansible Automation Platform credentials for ALC ansible tests.
 *
 * Resolution order:
 * 1. Non-empty `ANSIBLE_URL` + `ANSIBLE_TOKEN` in process env (repo-root `.env` via `@config`).
 * 2. `.auth/ansible-aap.json` written by globalSetup `setup-ansible-template.sh` after cluster discovery / token mint.
 *
 * @see .env.example — explicit `ANSIBLE_URL`, `ANSIBLE_TOWER_PASSWORD`, optional `ANSIBLE_TOKEN`
 */

import fs from 'fs';
import path from 'path';

import type { PlaywrightTestSkip } from '@lib/cluster/managedClusterContext';

import type { CreateSubscriptionOptions } from '../subscription/types';

const ENV_ANSIBLE_URL = 'ANSIBLE_URL';
const ENV_ANSIBLE_TOKEN = 'ANSIBLE_TOKEN';
const DEFAULT_ANSIBLE_AAP_RELATIVE = path.join('.auth', 'ansible-aap.json');

export type AnsibleAapAuth = {
  url: string;
  token: string;
};

export type AnsibleAapEnvMissing = {
  configured: false;
  missing: Array<typeof ENV_ANSIBLE_URL | typeof ENV_ANSIBLE_TOKEN>;
  /** Hint when globalSetup did not produce `.auth/ansible-aap.json`. */
  contextFileMissing?: boolean;
};

export type AnsibleAapEnvResult =
  | { configured: true; auth: AnsibleAapAuth; source: 'env' | 'contextFile' }
  | AnsibleAapEnvMissing;

/** Override path to ansible-aap.json (absolute or cwd-relative). */
export function getAnsibleAapContextPath(): string {
  const override = process.env.ANSIBLE_AAP_CONTEXT_PATH?.trim();
  if (override) {
    return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  }
  return path.join(process.cwd(), DEFAULT_ANSIBLE_AAP_RELATIVE);
}

/** Loads `{ url, token }` from globalSetup artifact when present. */
export function loadAnsibleAapContextFromFile(
  filePath: string = getAnsibleAapContextPath()
): AnsibleAapAuth | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as { url?: unknown; token?: unknown };
    const url = typeof parsed.url === 'string' ? parsed.url.trim() : '';
    const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
    if (!url || !token) {
      return undefined;
    }
    return { url, token };
  } catch {
    return undefined;
  }
}

function authFromProcessEnv(): AnsibleAapAuth | undefined {
  const url = process.env[ENV_ANSIBLE_URL]?.trim() ?? '';
  const token = process.env[ENV_ANSIBLE_TOKEN]?.trim() ?? '';
  if (!url || !token) {
    return undefined;
  }
  return { url, token };
}

/**
 * Resolves AAP credentials from env or `.auth/ansible-aap.json` (globalSetup).
 */
export function getAnsibleAapAuthFromEnv(): AnsibleAapEnvResult {
  const fromEnv = authFromProcessEnv();
  if (fromEnv) {
    return { configured: true, auth: fromEnv, source: 'env' };
  }

  const fromFile = loadAnsibleAapContextFromFile();
  if (fromFile) {
    return { configured: true, auth: fromFile, source: 'contextFile' };
  }

  const missing: AnsibleAapEnvMissing['missing'] = [];
  if (!process.env[ENV_ANSIBLE_URL]?.trim()) missing.push(ENV_ANSIBLE_URL);
  if (!process.env[ENV_ANSIBLE_TOKEN]?.trim()) missing.push(ENV_ANSIBLE_TOKEN);

  return {
    configured: false,
    missing,
    contextFileMissing: !fs.existsSync(getAnsibleAapContextPath()),
  };
}

/** Merges AAP host/token into every `perBlock[].automation.addCredentialWizard` entry. */
export function applyAnsibleAapAuthToSubscriptionOptions(
  options: CreateSubscriptionOptions,
  auth?: AnsibleAapAuth
): CreateSubscriptionOptions {
  const env = getAnsibleAapAuthFromEnv();
  const resolvedAuth = auth ?? (env.configured ? env.auth : undefined);
  if (!resolvedAuth) {
    return options;
  }

  const perBlock = options.perBlock?.map((block) => {
    if (!block?.automation?.addCredentialWizard) {
      return block;
    }
    return {
      ...block,
      automation: {
        ...block.automation,
        addCredentialWizard: {
          ...block.automation.addCredentialWizard,
          ansibleHost: resolvedAuth.url,
          ansibleToken: resolvedAuth.token,
        },
      },
    };
  });

  return perBlock ? { ...options, perBlock } : options;
}

function formatAnsibleAapSkipReason(env: AnsibleAapEnvMissing, contextLabel: string): string {
  const parts = [
    `${contextLabel}: Ansible AAP credentials not available.`,
    `Set non-empty ${env.missing.join(' and ')} in repo-root .env`,
  ];
  if (env.contextFileMissing) {
    parts.push(
      'or run via ./start.sh alc (without E2E_SKIP_ANSIBLE_PREP) so globalSetup writes .auth/ansible-aap.json'
    );
  } else {
    parts.push('or fix .auth/ansible-aap.json from globalSetup');
  }
  return parts.join('; ') + '.';
}

/** `test.skip()` when credentials are missing; returns auth when configured. */
export function skipUnlessAnsibleAapAuthConfigured(
  test: PlaywrightTestSkip,
  contextLabel = 'Ansible ALC test'
): AnsibleAapAuth | undefined {
  const env = getAnsibleAapAuthFromEnv();
  if (!env.configured) {
    test.skip(true, formatAnsibleAapSkipReason(env, contextLabel));
    return undefined;
  }
  return env.auth;
}
