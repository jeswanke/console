import { test, expect } from '@playwright/test';
import {
  buildPlacementDecisionNodeDataId,
  topologyPlacementDecisionDataId,
} from '@lib/app/topology/graph-ids';

test.describe('topology placement drawer helpers', () => {
  test('buildPlacementDecisionNodeDataId uses default placement CR naming', () => {
    const id = buildPlacementDecisionNodeDataId({
      applicationName: 'api-git-local',
      namespace: 'api-git-local-ns',
    });
    expect(id).toBe(
      topologyPlacementDecisionDataId('api-git-local-ns', 'api-git-local-placement-1')
    );
  });

  test('buildPlacementDecisionNodeDataId accepts placementRef override after wizard edit', () => {
    const id = buildPlacementDecisionNodeDataId({
      applicationName: 'api-git-local',
      namespace: 'api-git-local-ns',
      placementCrName: 'api-git-local-placement-3',
    });
    expect(id).toBe(
      topologyPlacementDecisionDataId('api-git-local-ns', 'api-git-local-placement-3')
    );
  });
});
