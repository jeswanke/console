import { test, expect } from '@playwright/test';

import { buildTopologyNodeDataIdsForAppSetPush } from '@lib/app/topology/appset-graph-ids';

test.describe('ApplicationSet push topology graph ids', () => {
  test('buildTopologyNodeDataIdsForAppSetPush matches known push-model topology ids (RHACM4K-63608)', () => {
    const rows = [
      { kind: 'Service', name: 'helloworld-app-svc' },
      { kind: 'Deployment', name: 'helloworld-app-deploy' },
      { kind: 'ReplicaSet', name: 'helloworld-app-deploy' },
      { kind: 'Pod', name: 'helloworld-app-deploy' },
    ];

    expect(
      buildTopologyNodeDataIdsForAppSetPush({
        applicationSetName: 'auto-git-push-private-63608',
        argoServerNamespace: 'openshift-gitops',
        destinationNamespace: 'auto-git-push-private-63608-ns',
        clusterResourceRows: rows,
      })
    ).toEqual([
      'application--auto-git-push-private-63608',
      'member--repo--openshift-gitops--auto-git-push-private-63608',
      'member--placement--decision--openshift-gitops--auto-git-push-private-63608',
      'member--placement--openshift-gitops--auto-git-push-private-63608',
      'member--clusters--',
      'member--member--deployable--member--clusters--local-cluster--service--auto-git-push-private-63608-ns--helloworld-app-svc',
      'member--member--deployable--member--clusters--local-cluster--deployment--auto-git-push-private-63608-ns--helloworld-app-deploy',
      'member--member--deployable--member--clusters--local-cluster--deployment--auto-git-push-private-63608-ns--helloworld-app-deploy--replicaset--helloworld-app-deploy',
      'member--member--deployable--member--clusters--local-cluster--deployment--auto-git-push-private-63608-ns--helloworld-app-deploy--replicaset--helloworld-app-deploy--pod--helloworld-app-deploy',
    ]);
  });
});
