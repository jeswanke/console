import { z } from 'zod';

/** Validates merged subscription **domain** payload before `CreateSubscriptionOptions` use. */
export const subscriptionDomainPayloadSchema = z
  .object({
    applicationName: z.string().min(1),
    namespace: z.string().min(1),
    repositories: z.array(z.record(z.string(), z.unknown())).optional(),
    perBlock: z.array(z.record(z.string(), z.unknown()).optional()).optional(),
    fillEntireWizard: z.boolean().optional(),
    ensureFormMode: z.boolean().optional(),
    submit: z.boolean().optional(),
  })
  .passthrough();
