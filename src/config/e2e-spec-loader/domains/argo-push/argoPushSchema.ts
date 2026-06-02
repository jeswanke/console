import { z } from 'zod';

const argoPushGitRepositorySchema = z
  .object({
    url: z.string().min(1),
    branch: z.string().optional(),
    path: z.string().optional(),
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
    requeueTimeSeconds: z.number().int().positive().optional(),
    collapseYamlPanel: z.boolean().optional(),
    submit: z.boolean().optional(),
    applicationSetExistsError: z.boolean().optional(),
  })
  .passthrough();

export type ArgoPushDomainPayload = z.infer<typeof argoPushDomainPayloadSchema>;
