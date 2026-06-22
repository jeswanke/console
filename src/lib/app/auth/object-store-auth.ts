/**
 * ALC object storage: credentials and bucket URL from `env/alc.local.env`.
 *
 * @see env/alc.env.example — `OBJECTSTORE_ACCESS_KEY` / `OBJECTSTORE_SECRET_KEY` (base64).
 */

import type { PlaywrightTestSkip } from '@lib/cluster/managedClusterContext';

import type {
  CreateSubscriptionOptions,
  ObjectStorageSubscriptionRepositoryFields,
} from '../subscription/types';

const ENV_OBJECTSTORE_ACCESS_KEY = 'OBJECTSTORE_ACCESS_KEY';
const ENV_OBJECTSTORE_SECRET_KEY = 'OBJECTSTORE_SECRET_KEY';
const ENV_OBJECTSTORE_PRIVATE_URL = 'OBJECTSTORE_PRIVATE_URL';
const ENV_OBJECTSTORE_REGION = 'OBJECTSTORE_REGION';

const ENV_OBJ_TLS_ROUTE = 'OBJ_TLS_ROUTE';
const ENV_OBJ_TLS_ACCESS_KEY = 'OBJ_TLS_ACCESS_KEY';
const ENV_OBJ_TLS_SECRET_KEY = 'OBJ_TLS_SECRET_KEY';

export type ObjectStoreAuth = {
  accessKey: string;
  secretKey: string;
  privateUrl: string;
  region?: string;
  /** Base64 values for Kubernetes Secret `data` fields (API YAML templates). */
  accessKeyBase64: string;
  secretKeyBase64: string;
};

export type ObjectStoreTlsAuth = {
  route: string;
  accessKeyBase64: string;
  secretKeyBase64: string;
};

export type ObjectStoreEnvMissing = {
  configured: false;
  missing: string[];
};

export type ObjectStoreEnvResult =
  | { configured: true; auth: ObjectStoreAuth }
  | ObjectStoreEnvMissing;

function decodeBase64Credential(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

/** Reads object-store env vars (after `loadAlcLocalEnvFile` in `@config`). */
export function getObjectStoreAuthFromEnv(): ObjectStoreEnvResult {
  const accessKeyEnc = process.env[ENV_OBJECTSTORE_ACCESS_KEY]?.trim() ?? '';
  const secretKeyEnc = process.env[ENV_OBJECTSTORE_SECRET_KEY]?.trim() ?? '';
  const privateUrl = process.env[ENV_OBJECTSTORE_PRIVATE_URL]?.trim() ?? '';
  const region = process.env[ENV_OBJECTSTORE_REGION]?.trim();

  const missing: string[] = [];
  if (!accessKeyEnc) missing.push(ENV_OBJECTSTORE_ACCESS_KEY);
  if (!secretKeyEnc) missing.push(ENV_OBJECTSTORE_SECRET_KEY);
  if (!privateUrl) missing.push(ENV_OBJECTSTORE_PRIVATE_URL);

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    auth: {
      accessKey: decodeBase64Credential(accessKeyEnc),
      secretKey: decodeBase64Credential(secretKeyEnc),
      privateUrl,
      region: region || undefined,
      accessKeyBase64: accessKeyEnc,
      secretKeyBase64: secretKeyEnc,
    },
  };
}

/** @throws when {@link getObjectStoreAuthFromEnv} is not configured */
export function requireObjectStoreAuthFromEnv(): ObjectStoreAuth {
  const env = getObjectStoreAuthFromEnv();
  if (!env.configured) {
    throw new Error(
      'ALC object store auth is not configured. Set OBJECTSTORE_ACCESS_KEY, OBJECTSTORE_SECRET_KEY, ' +
        'and OBJECTSTORE_PRIVATE_URL in env/alc.local.env (copy from env/alc.env.example). ' +
        `Missing: ${env.missing.join(', ')}.`
    );
  }
  return env.auth;
}

function isObjectStorageRepository(
  repo: CreateSubscriptionOptions['repositories'][number]
): repo is ObjectStorageSubscriptionRepositoryFields {
  return repo.kind === 'objectStorage';
}

/** Merge env URL / credentials into every object-storage repository block. */
export function applyObjectStoreAuthToSubscriptionOptions(
  options: CreateSubscriptionOptions,
  auth?: ObjectStoreAuth
): CreateSubscriptionOptions {
  const env = getObjectStoreAuthFromEnv();
  const resolvedAuth = auth ?? (env.configured ? env.auth : undefined);
  if (!resolvedAuth) {
    return options;
  }

  return {
    ...options,
    repositories: options.repositories.map((repo) => {
      if (!isObjectStorageRepository(repo)) {
        return repo;
      }
      return {
        ...repo,
        url: resolvedAuth.privateUrl,
        accessKey: resolvedAuth.accessKey,
        secretKey: resolvedAuth.secretKey,
        region: resolvedAuth.region ?? repo.region,
      };
    }),
  };
}

export function getObjectStoreTlsAuthFromEnv():
  | { configured: true; auth: ObjectStoreTlsAuth }
  | { configured: false; missing: string[] } {
  const route = process.env[ENV_OBJ_TLS_ROUTE]?.trim() ?? '';
  const accessKey = process.env[ENV_OBJ_TLS_ACCESS_KEY]?.trim() ?? '';
  const secretKey = process.env[ENV_OBJ_TLS_SECRET_KEY]?.trim() ?? '';

  const missing: string[] = [];
  if (!route) missing.push(ENV_OBJ_TLS_ROUTE);
  if (!accessKey) missing.push(ENV_OBJ_TLS_ACCESS_KEY);
  if (!secretKey) missing.push(ENV_OBJ_TLS_SECRET_KEY);

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    auth: { route, accessKeyBase64: accessKey, secretKeyBase64: secretKey },
  };
}

/** `test.skip()` when object-store credentials are missing. */
export function skipUnlessObjectStoreAuthConfigured(
  test: PlaywrightTestSkip,
  contextLabel = 'Object storage ALC test'
): ObjectStoreAuth | undefined {
  const env = getObjectStoreAuthFromEnv();
  if (!env.configured) {
    test.skip(
      true,
      `${contextLabel}: set OBJECTSTORE_ACCESS_KEY, OBJECTSTORE_SECRET_KEY, and OBJECTSTORE_PRIVATE_URL in env/alc.local.env (missing: ${env.missing.join(', ')})`
    );
    return undefined;
  }
  return env.auth;
}

/** `test.skip()` when TLS object-store server env is missing (RHACM4K-54900 / 54904 / 54915). */
export function skipUnlessObjectStoreTlsConfigured(
  test: PlaywrightTestSkip,
  contextLabel = 'Object storage TLS ALC test'
): ObjectStoreTlsAuth | undefined {
  const env = getObjectStoreTlsAuthFromEnv();
  if (!env.configured) {
    test.skip(
      true,
      `${contextLabel}: set OBJ_TLS_ROUTE, OBJ_TLS_ACCESS_KEY, and OBJ_TLS_SECRET_KEY in env/alc.local.env (missing: ${env.missing.join(', ')})`
    );
    return undefined;
  }
  return env.auth;
}
