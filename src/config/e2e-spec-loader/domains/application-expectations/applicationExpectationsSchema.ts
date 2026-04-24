import { z } from 'zod';

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

/**
 * Resolved `applicationExpectations`: nested `clusterResources` (aligned with `repositories[i]`),
 * `clusterResourcesFlat`, and `clusterResourcesPerRepo` from the resolver.
 */
export const applicationExpectationsDomainSchema = z
  .object({
    clusterResources: z.array(z.array(applicationClusterResourceRowSchema)).min(1),
    clusterResourcesFlat: z.array(applicationClusterResourceRowSchema).min(1),
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
};
