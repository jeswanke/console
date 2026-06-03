import { z } from 'zod';

/** OC setup + wizard inputs for placement cluster preview flows (policy, policy set, placement). */
export const placementPreviewSetupSchema = z
  .object({
    setupYamlRelativePath: z.string().min(1),
    namespace: z.string().min(1),
    clusterSet: z.string().min(1),
    namePrefix: z.string().min(1),
    existingPlacementName: z.string().min(1).optional(),
  })
  .strict();

export type PlacementPreviewSetupPayload = z.infer<typeof placementPreviewSetupSchema>;
