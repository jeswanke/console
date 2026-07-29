/* Copyright Contributors to the Open Cluster Management project */

import * as fs from 'fs';
import * as path from 'path';
import { OcCliService } from '@services/OcCliService';

export type SubstitutionRules = Record<string, string>;

const TEMPLATES_ROOT = path.resolve(__dirname, '../../templates');

function assertSafeTemplatePath(templatePath: string): string {
  const resolved = path.resolve(templatePath);
  if (!resolved.startsWith(TEMPLATES_ROOT + path.sep)) {
    throw new Error(`Template path escapes templates root: ${templatePath}`);
  }
  return resolved;
}

export function applySubstitutions(content: string, rules: SubstitutionRules): string {
  let result = content;
  for (const [key, value] of Object.entries(rules)) {
    const escapedKey = key.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\[${escapedKey}\\]`, 'g');
    result = result.replace(pattern, () => value);
  }
  return result;
}

export async function applyYamlTemplate(
  oc: OcCliService,
  templatePath: string,
  substitutions: SubstitutionRules
): Promise<void> {
  const safePath = assertSafeTemplatePath(templatePath);
  const raw = fs.readFileSync(safePath, 'utf8');
  const yaml = applySubstitutions(raw, substitutions);
  await oc.applyManifestFromStdin(yaml);
}

export async function deleteYamlTemplate(
  oc: OcCliService,
  templatePath: string,
  substitutions: SubstitutionRules
): Promise<void> {
  const safePath = assertSafeTemplatePath(templatePath);
  const raw = fs.readFileSync(safePath, 'utf8');
  const yaml = applySubstitutions(raw, substitutions);
  await oc.deleteManifestFromStdin(yaml);
}
