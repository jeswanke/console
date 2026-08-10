import { z } from 'zod';

export const ansibleScaleSyncTimingSchema = z.enum(['beforePatch', 'afterPatch', 'none']);

export const ansibleScaleManagedClusterVerifySchema = z
  .object({
    resource: z.string().min(1),
    expectedSubstring: z.string().min(1),
  })
  .strict();

/** Hub suite prep: fake Tower secret + AnsibleJob CRD (profile `ansible_scale_suite`). */
export const ansibleScaleSuiteSchema = z
  .object({
    fakeSecretYamlRelativePath: z.string().min(1),
    ansibleJobCrdYamlRelativePath: z.string().min(1),
    clusterNamePlaceholder: z.string().min(1),
  })
  .strict();

/** Per-ticket ansible appsub hook flow (CLI template apply + poll/patch/sync). */
export const ansibleScaleScenarioSchema = z
  .object({
    namespace: z.string().min(1),
    applicationName: z.string().min(1),
    channelNamespaces: z.array(z.string().min(1)).optional(),
    setupYamlRelativePath: z.string().min(1),
    firstJobSubstring: z.string().min(1),
    syncTiming: ansibleScaleSyncTimingSchema,
    jobCountBeforePatch: z.number().int().positive(),
    jobCountAfterPatch: z.number().int().positive(),
    pollTimeoutMs: z.number().int().positive().optional(),
    afterPatchPollTimeoutMs: z.number().int().positive().optional(),
    firstJobWaitErrorMessage: z.string().min(1),
    afterPatchJobCountErrorMessage: z.string().min(1),
    managedClusterVerify: ansibleScaleManagedClusterVerifySchema.optional(),
  })
  .strict();

export type AnsibleScaleSuitePayload = z.infer<typeof ansibleScaleSuiteSchema>;
export type AnsibleScaleScenarioPayload = z.infer<typeof ansibleScaleScenarioSchema>;
export type AnsibleScaleSyncTiming = z.infer<typeof ansibleScaleSyncTimingSchema>;

/** Fixture apply/cleanup fields derived from a resolved scenario. */
export type AnsibleScaleFixturePayload = Pick<
  AnsibleScaleScenarioPayload,
  'namespace' | 'applicationName' | 'channelNamespaces' | 'setupYamlRelativePath'
>;
