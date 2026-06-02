/**
 * Private Git lib + RHACM4K-1071 e2e-spec-data (no browser).
 */
import path from 'path';
import { expect, test } from '@playwright/test';
import { clearE2eSpecDataCache, resolveSubscriptionScenarioById, resolveSubscriptionScenarioByTestId } from '@config';
import {
  applyPrivateGitAuthToSubscriptionOptions,
  getPrivateGitAuthFromEnv,
} from '@lib/app/auth/private-git';

const E2E_SPEC_DATA_DIR = path.join(process.cwd(), 'src/config/e2e-spec-data');

test.describe('private-git', () => {
  test.beforeEach(() => {
    clearE2eSpecDataCache();
  });

  test('getPrivateGitAuthFromEnv reports missing GITHUB_USER and GITHUB_TOKEN', () => {
    const prev = {
      user: process.env.GITHUB_USER,
      token: process.env.GITHUB_TOKEN,
    };
    delete process.env.GITHUB_USER;
    delete process.env.GITHUB_TOKEN;

    const result = getPrivateGitAuthFromEnv();
    expect(result.configured).toBe(false);
    if (!result.configured) {
      expect(result.missing).toEqual(expect.arrayContaining(['GITHUB_USER', 'GITHUB_TOKEN']));
    }

    if (prev.user !== undefined) process.env.GITHUB_USER = prev.user;
    if (prev.token !== undefined) process.env.GITHUB_TOKEN = prev.token;
  });

  test('getPrivateGitAuthFromEnv decodes base64 credentials', () => {
    const prev = {
      user: process.env.GITHUB_USER,
      token: process.env.GITHUB_TOKEN,
    };

    process.env.GITHUB_USER = Buffer.from('alc-user', 'utf8').toString('base64');
    process.env.GITHUB_TOKEN = Buffer.from('alc-token-secret', 'utf8').toString('base64');

    const result = getPrivateGitAuthFromEnv();
    expect(result.configured).toBe(true);
    if (result.configured) {
      expect(result.auth.username).toBe('alc-user');
      expect(result.auth.token).toBe('alc-token-secret');
    }

    if (prev.user !== undefined) process.env.GITHUB_USER = prev.user;
    else delete process.env.GITHUB_USER;
    if (prev.token !== undefined) process.env.GITHUB_TOKEN = prev.token;
    else delete process.env.GITHUB_TOKEN;
  });

  test('applyPrivateGitAuthToSubscriptionOptions merges auth onto auto_git_private_local', () => {
    const prev = {
      user: process.env.GITHUB_USER,
      token: process.env.GITHUB_TOKEN,
    };
    delete process.env.GITHUB_USER;
    delete process.env.GITHUB_TOKEN;

    const resolved = resolveSubscriptionScenarioById('auto_git_private_local', E2E_SPEC_DATA_DIR);
    const withoutAuth = applyPrivateGitAuthToSubscriptionOptions(resolved.subscription);
    expect(withoutAuth.repositories[0]).toMatchObject({
      kind: 'git',
      url: 'https://github.com/stolostron/application-lifecycle-samples-private.git',
      path: 'mortgage',
      disableAutoReconcile: true,
    });
    expect(withoutAuth.repositories[0]).not.toHaveProperty('username');

    process.env.GITHUB_USER = Buffer.from('private-user', 'utf8').toString('base64');
    process.env.GITHUB_TOKEN = Buffer.from('private-token', 'utf8').toString('base64');

    const withAuth = applyPrivateGitAuthToSubscriptionOptions(resolved.subscription);
    expect(withAuth.repositories[0]).toMatchObject({
      username: 'private-user',
      token: 'private-token',
      url: 'https://github.com/stolostron/application-lifecycle-samples-private.git',
    });

    if (prev.user !== undefined) process.env.GITHUB_USER = prev.user;
    else delete process.env.GITHUB_USER;
    if (prev.token !== undefined) process.env.GITHUB_TOKEN = prev.token;
    else delete process.env.GITHUB_TOKEN;
  });

  test('auto_git_private_local scenario resolves RHACM4K-1071 from YAML', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-1071', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_private_local');

    const sub = resolved.subscription;
    const appExp = resolved.applicationExpectations;

    expect(sub.applicationName).toBe('auto-git-private');
    expect(sub.namespace).toBe('auto-git-private-ns');
    expect(sub.repositories?.[0]).toMatchObject({
      kind: 'git',
      url: 'https://github.com/stolostron/application-lifecycle-samples-private.git',
      path: 'mortgage',
      disableAutoReconcile: true,
    });
    expect(appExp.advancedConfiguration?.channelDisplaySubstring).toBe(
      'stolostron-application-lifecycle-samples-private'
    );
    expect(appExp.detailsClustersSummary).toEqual({ variant: 'localOnly' });
  });
});
