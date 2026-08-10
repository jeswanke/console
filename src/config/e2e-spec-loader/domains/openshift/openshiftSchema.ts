import { z } from 'zod';

export const openshiftDomainPayloadSchema = z.object({
  applicationName: z.string().min(1),
  nameEdit: z.string().min(1).optional(),
  namespace: z.string().min(1),
  clusterName: z.string().min(1).optional(),
  deployment: z.string().min(1),
  service: z.string().min(1),
  route: z.string().min(1).optional(),
  successNumber: z.number().int().positive(),
  topologyIcons: z.array(z.string().min(1)).min(1),
  helloworldTemplateRelativePath: z.string().min(1).optional(),
  mortgageTemplateRelativePath: z.string().min(1).optional(),
});

export type OpenshiftDomainPayload = z.infer<typeof openshiftDomainPayloadSchema>;
