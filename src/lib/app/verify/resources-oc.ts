/** Poll `oc get` until e2e-spec clusterResources (+ optional Subscription/Placement) exist. */

import type { ApplicationExpectationsPayload } from '@config/e2e-spec-loader/domains/application-expectations/applicationExpectationsSchema';
import type { OcCliService } from '@services/OcCliService';

import { expectOcGetListContains } from '../../assertions/oc-resource-list';
import { defaultPlacementCrName, defaultSubscriptionCrName } from '../topology/graph-ids';

const CLUSTER_KIND_TO_OC_RESOURCE: Record<string, string> = {
  Route: 'route',
  Service: 'service',
  Deployment: 'deployment',
  ReplicaSet: 'replicaset',
  Pod: 'pod',
  ConfigMap: 'configmap',
  AnsibleJob: 'ansiblejob',
  PersistentVolumeClaim: 'pvc',
};

function clusterResourceKindToOcResource(kind: string): string {
  const mapped = CLUSTER_KIND_TO_OC_RESOURCE[kind];
  if (mapped) {
    return mapped;
  }
  throw new Error(
    `expectSubscriptionAppResourcesViaOc: unsupported clusterResources kind ${JSON.stringify(kind)} (supported: ${Object.keys(CLUSTER_KIND_TO_OC_RESOURCE).join(', ')})`
  );
}

export type ExpectSubscriptionAppResourcesViaOcParams = {
  oc: OcCliService;
  applicationName: string;
  namespace: string;
  applicationExpectations: ApplicationExpectationsPayload;
  /**
   * 1-based indices into `clusterResources` / `topologyClusterResourceBlocks`.
   * Default: every block after create (length of `clusterResources`).
   */
  blockIndices?: number[];
  /** Wait for `applications.app` listing the app name. Default true. */
  includeApplication?: boolean;
  /** Wait for Subscription + Placement CRs per block index. Default true. */
  includeSubscriptionAndPlacement?: boolean;
  /**
   * Poll `oc get` for each **clusterResources** row (Route, Deployment, …). Default true.
   * Set false when resources deploy only to managed clusters (e.g. RHACM4K-10668 CRD on online spokes).
   */
  includeClusterResourceRows?: boolean;
  /** Forwarded to each {@link expectOcGetListContains} poll. */
  timeout?: number;
  intervals?: number[];
};

function defaultBlockIndices(expectations: ApplicationExpectationsPayload): number[] {
  return expectations.clusterResources.map((_, i) => i + 1);
}

/**
 * Polls `oc get` until hub resources implied by the resolved scenario **applicationExpectations** exist:
 * optional **Application** (`applications.app`), per-block **Subscription** / **Placement**, then each
 * **clusterResources** row (Route, Deployment, Service, …) in namespace order.
 */
export async function expectSubscriptionAppResourcesViaOc(
  params: ExpectSubscriptionAppResourcesViaOcParams
): Promise<void> {
  const {
    oc,
    applicationName,
    namespace,
    applicationExpectations,
    blockIndices: blockIndicesParam,
    includeApplication = true,
    includeSubscriptionAndPlacement = true,
    includeClusterResourceRows = true,
    timeout,
    intervals,
  } = params;

  const pollOpts = { timeout, intervals };

  if (includeApplication) {
    await expectOcGetListContains(oc, {
      resource: 'applications.app',
      namespace,
      expectedSubstring: applicationName,
      ...pollOpts,
    });
  }

  const blockIndices = blockIndicesParam?.length
    ? blockIndicesParam
    : defaultBlockIndices(applicationExpectations);

  if (includeSubscriptionAndPlacement) {
    for (const blockIndex of blockIndices) {
      if (blockIndex < 1 || blockIndex > applicationExpectations.clusterResources.length) {
        throw new Error(
          `expectSubscriptionAppResourcesViaOc: blockIndex ${blockIndex} out of range (1..${applicationExpectations.clusterResources.length})`
        );
      }
      await expectOcGetListContains(oc, {
        resource: 'subscription',
        namespace,
        expectedSubstring: defaultSubscriptionCrName(applicationName, blockIndex),
        ...pollOpts,
      });
      await expectOcGetListContains(oc, {
        resource: 'placement',
        namespace,
        expectedSubstring: defaultPlacementCrName(applicationName, blockIndex),
        ...pollOpts,
      });
    }
  }

  if (includeClusterResourceRows) {
    for (const blockIndex of blockIndices) {
      const rows = applicationExpectations.clusterResources[blockIndex - 1];
      if (!rows?.length) {
        continue;
      }
      for (const row of rows) {
        const resource = clusterResourceKindToOcResource(row.kind);
        await expectOcGetListContains(oc, {
          resource,
          namespace: row.namespace || namespace,
          expectedSubstring: row.name,
          ...pollOpts,
        });
      }
    }
  }
}

export type ExpectOrphanedAlcResourcesAfterApplicationDeleteViaOcParams = {
  oc: OcCliService;
  applicationName: string;
  namespace: string;
  /** 1-based subscription blocks that should still exist after Application CR delete. */
  subscriptionBlockIndices: number[];
  /**
   * 1-based blocks that had a Placement CR (omit local-only deployments — no Placement on hub).
   * Placements are no longer listed under Applications → Advanced configuration (deprecated UI).
   */
  placementBlockIndices?: number[];
  timeout?: number;
  intervals?: number[];
};

/**
 * After delete-without-related-resources: Application gone; Subscription/Placement CRs remain.
 */
export async function expectOrphanedAlcResourcesAfterApplicationDeleteViaOc(
  params: ExpectOrphanedAlcResourcesAfterApplicationDeleteViaOcParams
): Promise<void> {
  const {
    oc,
    applicationName,
    namespace,
    subscriptionBlockIndices,
    placementBlockIndices = [],
    timeout,
    intervals,
  } = params;
  const pollOpts = { timeout, intervals };

  if (await oc.applicationsAppK8sIoExists(namespace, applicationName)) {
    throw new Error(
      `expectOrphanedAlcResourcesAfterApplicationDeleteViaOc: Application ${namespace}/${applicationName} should be deleted`
    );
  }

  for (const blockIndex of subscriptionBlockIndices) {
    await expectOcGetListContains(oc, {
      resource: 'subscription',
      namespace,
      expectedSubstring: defaultSubscriptionCrName(applicationName, blockIndex),
      ...pollOpts,
    });
  }

  for (const blockIndex of placementBlockIndices) {
    await expectOcGetListContains(oc, {
      resource: 'placement',
      namespace,
      expectedSubstring: defaultPlacementCrName(applicationName, blockIndex),
      ...pollOpts,
    });
  }
}
