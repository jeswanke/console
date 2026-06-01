import { test, expect } from '@playwright/test';
import { normalizeSubscriptionDetailsRepositoryUrl } from '@lib/app/verify/details-tab';

test.describe('subscription Details helpers', () => {
  test('normalizeSubscriptionDetailsRepositoryUrl strips trailing .git', () => {
    expect(
      normalizeSubscriptionDetailsRepositoryUrl(
        'https://github.com/stolostron/application-lifecycle-samples.git'
      )
    ).toBe('https://github.com/stolostron/application-lifecycle-samples');
  });

  test('normalizeSubscriptionDetailsRepositoryUrl leaves URL without .git unchanged', () => {
    const url = 'https://github.com/stolostron/application-lifecycle-samples';
    expect(normalizeSubscriptionDetailsRepositoryUrl(url)).toBe(url);
  });
});
