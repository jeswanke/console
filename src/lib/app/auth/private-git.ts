/**
 * ALC private Git: credentials from `env/alc.local.env`, repository URL from e2e-spec-data.
 *
 * @see env/alc.env.example — `GITHUB_USER` / `GITHUB_TOKEN` (base64).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import type { PlaywrightTestSkip } from '@lib/cluster/managedClusterContext';
import type { OcCliService } from '@services/OcCliService';

import type { CreateSubscriptionOptions, GitSubscriptionRepositoryFields } from '../subscription/types';

const ENV_GITHUB_USER = 'GITHUB_USER';
const ENV_GITHUB_TOKEN = 'GITHUB_TOKEN';

/** Argo CD repository Secret on the hub (RHACM4K-63608 setup). */
export const PRIVATE_GIT_ARGO_REPO_SECRET_NAME = 'private-repo-creds';
export const PRIVATE_GIT_ARGO_NAMESPACE = 'openshift-gitops';

export type PrivateGitAuth = {
  username: string;
  token: string;
};

export type PrivateGitEnvMissing = {
  configured: false;
  missing: Array<typeof ENV_GITHUB_USER | typeof ENV_GITHUB_TOKEN>;
};

export type PrivateGitEnvResult =
  | { configured: true; auth: PrivateGitAuth }
  | PrivateGitEnvMissing;

function decodeBase64Credential(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

/** Reads `GITHUB_USER` / `GITHUB_TOKEN` from the environment (after `loadAlcLocalEnvFile` in `@config`). */
export function getPrivateGitAuthFromEnv(): PrivateGitEnvResult {
  const userEnc = process.env[ENV_GITHUB_USER]?.trim() ?? '';
  const tokenEnc = process.env[ENV_GITHUB_TOKEN]?.trim() ?? '';

  const missing: PrivateGitEnvMissing['missing'] = [];
  if (!userEnc) missing.push(ENV_GITHUB_USER);
  if (!tokenEnc) missing.push(ENV_GITHUB_TOKEN);

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    auth: {
      username: decodeBase64Credential(userEnc),
      token: decodeBase64Credential(tokenEnc),
    },
  };
}

/** @throws when {@link getPrivateGitAuthFromEnv} is not configured */
export function requirePrivateGitAuthFromEnv(): PrivateGitAuth {
  const env = getPrivateGitAuthFromEnv();
  if (!env.configured) {
    throw new Error(
      'ALC private Git auth is not configured. Set GITHUB_USER and GITHUB_TOKEN in env/alc.local.env ' +
        '(copy from env/alc.env.example). Both must be base64-encoded. Repository URL comes from e2e-spec-data. ' +
        `Missing: ${env.missing.join(', ')}.`
    );
  }
  return env.auth;
}

function isGitRepository(
  repo: CreateSubscriptionOptions['repositories'][number]
): repo is GitSubscriptionRepositoryFields {
  return repo.kind === 'git';
}

/** Sets `username` / `token` on every Git block; URL unchanged. No-op when env auth is absent and `auth` is omitted. */
export function applyPrivateGitAuthToSubscriptionOptions(
  options: CreateSubscriptionOptions,
  auth?: PrivateGitAuth
): CreateSubscriptionOptions {
  const env = getPrivateGitAuthFromEnv();
  const resolvedAuth = auth ?? (env.configured ? env.auth : undefined);
  if (!resolvedAuth) {
    return options;
  }

  return {
    ...options,
    repositories: options.repositories.map((repo) => {
      if (!isGitRepository(repo)) {
        return repo;
      }
      return {
        ...repo,
        username: resolvedAuth.username,
        token: resolvedAuth.token,
      };
    }),
  };
}

function buildPrivateGitArgoRepoSecretYaml(
  auth: PrivateGitAuth,
  repoUrl: string,
  secretName = PRIVATE_GIT_ARGO_REPO_SECRET_NAME
): string {
  const yamlEscape = (value: string): string =>
    value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  return `apiVersion: v1
kind: Secret
metadata:
  name: ${secretName}
  namespace: ${PRIVATE_GIT_ARGO_NAMESPACE}
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: "${yamlEscape(repoUrl)}"
  password: "${yamlEscape(auth.token)}"
  username: "${yamlEscape(auth.username)}"
`;
}

/** Applies (or updates) the Argo CD repository Secret used by push-model private Git wizard tests. */
export async function applyPrivateGitRepoSecretToArgo(
  oc: OcCliService,
  auth: PrivateGitAuth,
  repoUrl: string,
  options?: { secretName?: string }
): Promise<void> {
  const secretName = options?.secretName ?? PRIVATE_GIT_ARGO_REPO_SECRET_NAME;
  const manifest = buildPrivateGitArgoRepoSecretYaml(auth, repoUrl, secretName);
  const tmpPath = path.join(
    os.tmpdir(),
    `e2e-${secretName}-${Date.now()}.yaml`
  );
  try {
    fs.writeFileSync(tmpPath, manifest, 'utf8');
    await oc.applyYaml(tmpPath);
  } finally {
    fs.unlinkSync(tmpPath);
  }
}

/** Best-effort delete of the test Argo CD repository Secret. */
export async function deletePrivateGitRepoSecretFromArgo(
  oc: OcCliService,
  secretName = PRIVATE_GIT_ARGO_REPO_SECRET_NAME
): Promise<void> {
  await oc.run(
    `oc delete secret ${secretName} -n ${PRIVATE_GIT_ARGO_NAMESPACE} --ignore-not-found`
  );
}

/** `test.skip()` when credentials are missing; returns auth when configured. */
export function skipUnlessPrivateGitAuthConfigured(
  test: PlaywrightTestSkip,
  contextLabel = 'Private Git ALC test'
): PrivateGitAuth | undefined {
  const env = getPrivateGitAuthFromEnv();
  if (!env.configured) {
    test.skip(
      true,
      `${contextLabel}: set GITHUB_USER and GITHUB_TOKEN in env/alc.local.env (missing: ${env.missing.join(', ')})`
    );
    return undefined;
  }
  return env.auth;
}
