import { z } from 'zod';

import type { TopologyClusterResourceRef } from '@lib/app/topology/graph-ids';

/**
 * Expected hub object for Details/topology. `namespace` may be omitted in YAML; filled before validation.
 */
export const applicationClusterResourceRowSchema = z.object({
  kind: z.string().min(1),
  name: z.string().min(1),
  namespace: z.string().min(1),
  apiVersion: z.string().optional(),
});

export type ApplicationClusterResourceRow = z.infer<typeof applicationClusterResourceRowSchema>;

/** Rows for one repo block plus `repositoryIndex` / path / kind from the resolved subscription. */
export type ClusterResourcesPerRepoEntry = {
  repositoryIndex: number;
  repositoryPath?: string;
  repositoryKind?: string;
  rows: ApplicationClusterResourceRow[];
};

export function flattenClusterResourceBlocks(
  blocks: ApplicationClusterResourceRow[][]
): ApplicationClusterResourceRow[] {
  return blocks.flatMap((rows) => rows);
}

/** Same blocks as {@link ApplicationClusterResourceRow} `clusterResources`; rows narrowed for topology `data-id` builders. */
export function buildTopologyClusterResourceBlocks(
  blocks: ApplicationClusterResourceRow[][]
): TopologyClusterResourceRef[][] {
  return blocks.map((rows) => rows.map(({ kind, name }) => ({ kind, name })));
}

/** Expected **Clusters** line on subscription app **Details** (e2e-spec-data → Details verifier). */
export const applicationExpectationsDetailsClustersSummarySchema = z.discriminatedUnion('variant', [
  z.object({ variant: z.literal('localOnly') }),
  z.object({
    variant: z.literal('remoteOnly'),
    remoteCount: z.number().int().positive(),
  }),
  z.object({
    variant: z.literal('localAndRemote'),
    remoteCount: z.number().int().positive(),
  }),
]);

export type ApplicationExpectationsDetailsClustersSummary = z.infer<
  typeof applicationExpectationsDetailsClustersSummarySchema
>;

/** Advanced configuration tab: **Channel** slug, **Type** popover repo URL, and copy control. */
export const applicationExpectationsAdvancedConfigurationSchema = z.object({
  /** Subscriptions **Channel** link / Channels **Name** toolbar search (Git-URL slug in the console). */
  channelDisplaySubstring: z.string().min(1),
  /** Full URL expected inside the **Type** label popover after click (matches wizard repo). */
  channelRepositoryUrl: z.string().min(1),
  /** **Type** column PF label button text (`Git`, `Helm`, …). Default in tests: Details `repositoryKindLabels.git`. */
  channelRepositoryTypeLabel: z.string().min(1).optional(),
});

export type ApplicationExpectationsAdvancedConfiguration = z.infer<
  typeof applicationExpectationsAdvancedConfigurationSchema
>;

/**
 * Resolved `applicationExpectations`: nested `clusterResources` (aligned with `repositories[i]`),
 * `clusterResourcesFlat`, `clusterResourcesPerRepo`, and **`topologyClusterResourceBlocks`** (kind/name only for topology helpers) from the resolver.
 */
export const applicationExpectationsDomainSchema = z
  .object({
    clusterResources: z.array(z.array(applicationClusterResourceRowSchema)).min(1),
    clusterResourcesFlat: z.array(applicationClusterResourceRowSchema).min(1),
    detailsClustersSummary: applicationExpectationsDetailsClustersSummarySchema.optional(),
    advancedConfiguration: applicationExpectationsAdvancedConfigurationSchema.optional(),
  })
  .superRefine((val, ctx) => {
    const fromBlocks = flattenClusterResourceBlocks(val.clusterResources);
    if (
      fromBlocks.length !== val.clusterResourcesFlat.length ||
      JSON.stringify(val.clusterResourcesFlat) !== JSON.stringify(fromBlocks)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'clusterResourcesFlat must equal clusterResources flattened in block order (resolve normalizes both)',
        path: ['clusterResourcesFlat'],
      });
    }
  });

export type ApplicationExpectationsPayload = z.infer<typeof applicationExpectationsDomainSchema> & {
  clusterResourcesPerRepo: ClusterResourcesPerRepoEntry[];
  topologyClusterResourceBlocks: TopologyClusterResourceRef[][];
};
