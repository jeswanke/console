import { z } from 'zod';

/** Merged subscription wizard payload. */
export const subscriptionDomainPayloadSchema = z
  .object({
    applicationName: z.string().min(1),
    namespace: z.string().min(1),
    repositories: z.array(z.record(z.string(), z.unknown())).min(1),
    perBlock: z.array(z.record(z.string(), z.unknown()).optional()).optional(),
    fillEntireWizard: z.boolean().optional(),
    ensureFormMode: z.boolean().optional(),
    submit: z.boolean().optional(),
    /** When true, `createSubscription` throws if the Application CR already exists; default false skips the wizard and opens Details. */
    applicationExistsError: z.boolean().optional(),
  })
  .passthrough();
