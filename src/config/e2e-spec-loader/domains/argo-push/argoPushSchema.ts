import { z } from 'zod';

const argoPushGitRepositorySchema = z
  .object({
    url: z.string().min(1),
    branch: z.string().optional(),
    path: z.string().optional(),
  })
  .passthrough();

const argoPushHelmRepositorySchema = z
  .object({
    url: z.string().min(1),
    chartName: z.string().min(1),
    packageVersion: z.string().min(1),
  })
  .passthrough();

const argoPushPlacementLabelExpressionSchema = z
  .object({
    labelName: z.string().min(1),
    labelValues: z.array(z.string().min(1)).min(1),
    operator: z.literal('In').optional(),
  })
  .passthrough();

const topologyClusterResourceRefSchema = z.object({
  kind: z.string().min(1),
  name: z.string().min(1),
});

/** Merged push-model ApplicationSet wizard payload. */
export const argoPushDomainPayloadSchema = z
  .object({
    applicationName: z.string().min(1),
    argoServerLabel: z.string().min(1),
    applicationSetNamespace: z.string().min(1).optional(),
    destinationNamespace: z.string().min(1),
    git: argoPushGitRepositorySchema,
    helm: argoPushHelmRepositorySchema.optional(),
    /** When true, wizard adds Git (first) + Helm (second) on **Template**. */
    multiSource: z.boolean().optional(),
    /** Extra wait after create (ms) before list assertions (RHACM4K-4043). */
    postCreateWaitMs: z.number().int().nonnegative().optional(),
    clusterSet: z.string().min(1),
    placementLabelExpression: argoPushPlacementLabelExpressionSchema.optional(),
    requeueTimeSeconds: z.number().int().positive().optional(),
    collapseYamlPanel: z.boolean().optional(),
    submit: z.boolean().optional(),
    disableAutomatedSync: z.boolean().optional(),
    applicationSetExistsError: z.boolean().optional(),
    clusterResources: z.array(topologyClusterResourceRefSchema).optional(),
    pullApplicationName: z.string().min(1).optional(),
    existingPlacementName: z.string().min(1).optional(),
    setupYamlRelativePath: z.string().min(1).optional(),
  })
  .passthrough();

export type ArgoPushDomainPayload = z.infer<typeof argoPushDomainPayloadSchema>;
