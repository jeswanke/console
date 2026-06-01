import { expect, test } from '@playwright/test';

import {
  globalClusterPlacementDrawerExpectation,
  localClusterPlacementDrawerExpectation,
  managedClusterOnlyPlacementDrawerExpectation,
} from '@lib/app/topology/placement-drawer-expectations';

test.describe('placement drawer expectations', () => {
  test('localClusterPlacementDrawerExpectation matches RHACM4K-39232 first pass', () => {
    expect(localClusterPlacementDrawerExpectation()).toEqual({
      matchedClusterCount: 1,
      clusterSet: 'global',
      labelSelector: { key: 'name', values: ['local-cluster'] },
    });
  });

  test('managedClusterOnlyPlacementDrawerExpectation matches Cypress second pass', () => {
    expect(managedClusterOnlyPlacementDrawerExpectation('managed-1')).toEqual({
      matchedClusterCount: 2,
      clusterSet: 'global',
      labelSelector: { key: 'name', values: ['managed-1'] },
    });
  });

  test('globalClusterPlacementDrawerExpectation accepts overrides', () => {
    expect(
      globalClusterPlacementDrawerExpectation({
        matchedClusterCount: 3,
        labelValues: ['a', 'b'],
        clusterSet: 'other',
        labelKey: 'region',
      })
    ).toEqual({
      matchedClusterCount: 3,
      clusterSet: 'other',
      labelSelector: { key: 'region', values: ['a', 'b'] },
    });
  });
});
