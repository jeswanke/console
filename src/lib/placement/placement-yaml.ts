/**
 * Parse Placement documents from wizard sync YAML editor (single- or multi-doc).
 */
import { parse, parseAllDocuments } from 'yaml';

export type PlacementTolerationDoc = {
  key: string;
  operator?: string;
  value?: string;
  effect?: string;
  tolerationSeconds?: number;
};

export type PlacementDoc = {
  kind?: string;
  apiVersion?: string;
  metadata?: { name?: string; namespace?: string };
  spec?: {
    tolerations?: PlacementTolerationDoc[];
    numberOfClusters?: number;
    clusterSets?: string[];
  };
};

function documentToPlacementDoc(doc: ReturnType<typeof parseAllDocuments>[number]): PlacementDoc {
  return doc.toJSON() as PlacementDoc;
}

export function parsePlacementFromSyncYaml(yamlText: string): PlacementDoc | undefined {
  const trimmed = yamlText.trim();
  if (!trimmed.includes('kind: Placement')) return undefined;

  try {
    for (const doc of parseAllDocuments(trimmed)) {
      const json = documentToPlacementDoc(doc);
      if (json?.kind === 'Placement') return json;
    }
  } catch {
    // Monaco may yield a single partial document while syncing
  }

  try {
    const single = parse(trimmed) as PlacementDoc;
    return single?.kind === 'Placement' ? single : undefined;
  } catch {
    return undefined;
  }
}

export function getPlacementTolerations(yamlText: string): PlacementTolerationDoc[] {
  return parsePlacementFromSyncYaml(yamlText)?.spec?.tolerations ?? [];
}

export function syncYamlContainsKind(yamlText: string, kind: string): boolean {
  return new RegExp(`kind:\\s*${kind}\\b`).test(yamlText);
}

/** Matches `kind: Policy` document only (not PolicySet). */
export function syncYamlContainsPolicyKind(yamlText: string): boolean {
  return /^kind:\s*Policy\s*$/m.test(yamlText);
}
