import { z } from 'zod';

const argoPushGitRepositorySchema = z
  .object({
    url: z.string().min(1),
    branch: z.string().optional(),
    path: z.string().optional(),
  })
  .passthrough();

const argoPushPlacementLabelExpressionSchema = z
  .object({
    labelName: z.string().min(1),
    labelValues: z.array(z.string().min(1)).min(1),
    operator: z.literal('In').optional(),
  })
  .passthrough();

/** Merged push-model ApplicationSet wizard payload. */
export const argoPushDomainPayloadSchema = z
  .object({
    applicationName: z.string().min(1),
    argoServerLabel: z.string().min(1),
    destinationNamespace: z.string().min(1),
    git: argoPushGitRepositorySchema,
    clusterSet: z.string().min(1),
    placementLabelExpression: argoPushPlacementLabelExpressionSchema.optional(),
    requeueTimeSeconds: z.number().int().positive().optional(),
    collapseYamlPanel: z.boolean().optional(),
    submit: z.boolean().optional(),
    applicationSetExistsError: z.boolean().optional(),
  })
  .passthrough();

export type ArgoPushDomainPayload = z.infer<typeof argoPushDomainPayloadSchema>;
