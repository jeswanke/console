import { z } from 'zod';

const fluxGitSchema = z.object({
  path: z.string().min(1),
});

const fluxHelmSchema = z.object({
  chartName: z.string().min(1),
  packageVersion: z.string().min(1),
});

const fluxBaseSchema = z.object({
  applicationName: z.string().min(1),
  namespace: z.string().min(1),
  clusterName: z.string().min(1).optional(),
  deployment: z.string().min(1),
  service: z.string().min(1),
  route: z.string().min(1).optional(),
  successNumber: z.number().int().positive(),
  topologyIcons: z.array(z.string().min(1)).min(1),
  gitAppTemplateRelativePath: z.string().min(1).optional(),
  helmAppTemplateRelativePath: z.string().min(1).optional(),
});

export const fluxDomainPayloadSchema = z.discriminatedUnion('kind', [
  fluxBaseSchema.extend({
    kind: z.literal('git'),
    git: fluxGitSchema,
  }),
  fluxBaseSchema.extend({
    kind: z.literal('helm'),
    helm: fluxHelmSchema,
  }),
]);

export type FluxDomainPayload = z.infer<typeof fluxDomainPayloadSchema>;
