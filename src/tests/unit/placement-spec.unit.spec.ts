import { expect, test } from '@playwright/test';

import {
  buildClusterLabelDeployment,
  buildGlobalClusterLabelDeployment,
  buildLocalClusterLabelDeployment,
} from '@lib/app/subscription/placement-spec';

test.describe('placement-spec', () => {
  test('buildLocalClusterLabelDeployment matches placement_label_local shape', () => {
    expect(buildLocalClusterLabelDeployment()).toEqual({
      useExistingPlacementRule: false,
      useClusterLabelSelector: true,
      clusterSet: 'global',
      labelSelectorRows: [{ labelName: 'name', labelValues: ['local-cluster'] }],
    });
  });

  test('buildGlobalClusterLabelDeployment selects local-cluster and managed name', () => {
    expect(buildGlobalClusterLabelDeployment('cluster-1')).toEqual({
      useExistingPlacementRule: false,
      useClusterLabelSelector: true,
      clusterSet: 'global',
      labelSelectorRows: [
        { labelName: 'name', labelValues: ['local-cluster', 'cluster-1'] },
      ],
    });
  });

  test('buildClusterLabelDeployment allows custom cluster set and labels', () => {
    expect(
      buildClusterLabelDeployment({
        clusterSet: 'custom-set',
        labelName: 'env',
        labelValues: ['prod'],
      })
    ).toMatchObject({
      clusterSet: 'custom-set',
      labelSelectorRows: [{ labelName: 'env', labelValues: ['prod'] }],
    });
  });
});
