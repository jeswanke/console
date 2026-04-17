import { z } from 'zod';

const scenarioEntrySchema = z
  .object({
    enabled: z.boolean().optional(),
    /** Polarion / testcase ids this scenario belongs to (when not using matrix). */
    tests: z.array(z.string()).optional(),
    /** Merge these fragment keys (in order) before profiles. */
    fragments: z.array(z.string()).optional(),
    /** Merge these profile keys (in order) before scenario fields. */
    extends: z.array(z.string()).optional(),
    /**
     * Per-domain payloads after merge (e.g. `subscription`, future `argo`). Resolver-specific.
     */
    domains: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    /**
     * @deprecated Prefer `domains.subscription`. Merged into `domains.subscription` on load.
     */
    subscription: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .transform((data) => {
    const domains = { ...(data.domains ?? {}) };
    if (data.subscription) {
      domains.subscription = {
        ...(domains.subscription ?? {}),
        ...data.subscription,
      };
    }
    return {
      enabled: data.enabled,
      tests: data.tests,
      fragments: data.fragments,
      extends: data.extends,
      domains,
    };
  });

export type ScenarioEntry = z.output<typeof scenarioEntrySchema>;

/** Raw YAML shape after parse (before resolution). Partial files may omit keys; defaults apply. */
export const e2eSpecDataSchema = z.object({
  version: z.number().int().optional(),
  fragments: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  profiles: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  scenarios: z.record(z.string(), scenarioEntrySchema).default({}),
  /** Polarion id → scenario id */
  matrix: z.record(z.string(), z.string()).default({}),
});

export type E2eSpecData = z.output<typeof e2eSpecDataSchema>;
