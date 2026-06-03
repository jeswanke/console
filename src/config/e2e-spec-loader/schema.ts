import { z } from 'zod';

const scenarioEntrySchema = z
  .object({
    enabled: z.boolean().optional(),
    /** Polarion ids on this scenario (see also `matrix`). */
    tests: z.array(z.string()).optional(),
    /** Repo lanes; each `use` entry lists keys under `spec.fragments`. */
    blocks: z
      .array(
        z
          .object({
            use: z.array(z.string()).min(1),
          })
          .strict()
      )
      .optional(),
    /** Profile keys merged in order before scenario fields. */
    extends: z.array(z.string()).optional(),
    /** Domain payloads, e.g. `subscription`, `applicationExpectations`. */
    specDomains: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  })
  .strict()
  .transform((data) => ({
    enabled: data.enabled,
    tests: data.tests,
    blocks: data.blocks,
    extends: data.extends,
    specDomains: { ...(data.specDomains ?? {}) },
  }));

export type ScenarioEntry = z.output<typeof scenarioEntrySchema>;

export const e2eSpecDataSchema = z.object({
  version: z.number().int().optional(),
  fragments: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  profiles: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  scenarios: z.record(z.string(), scenarioEntrySchema).default({}),
  /** Polarion testcase id → scenario id. */
  matrix: z.record(z.string(), z.string()).default({}),
});

export type E2eSpecData = z.output<typeof e2eSpecDataSchema>;
