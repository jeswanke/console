import fs from 'fs';
import os from 'os';
import path from 'path';

import type { OcCliService } from '@services/OcCliService';

const REPO_ROOT = path.resolve(__dirname, '../../..');

/** Absolute path for a repo-relative template (e.g. `src/templates/...`). */
export function resolveRepoPath(relativePath: string): string {
  return path.join(REPO_ROOT, relativePath);
}

/** Read a repo YAML file and apply literal string replacements (e.g. `{CLUSTER_NAME}`). */
export function substituteYamlTemplate(
  relativePath: string,
  replacements: Record<string, string>
): string {
  let content = fs.readFileSync(resolveRepoPath(relativePath), { encoding: 'utf8' });
  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.split(placeholder).join(value);
  }
  return content;
}

export type YamlTemplateApplyResult = {
  appliedManifestPath: string;
  tempDir: string;
};

/** Write substituted manifest to a temp file and `oc apply -f`. */
export async function applyYamlTemplate(
  oc: OcCliService,
  relativePath: string,
  replacements: Record<string, string>,
  tempPrefix = 'e2e-yaml-template-'
): Promise<YamlTemplateApplyResult> {
  const manifest = substituteYamlTemplate(relativePath, replacements);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const tmpPath = path.join(tmpDir, 'manifest.yaml');
  fs.writeFileSync(tmpPath, manifest, { encoding: 'utf8', mode: 0o600 });
  try {
    await oc.applyYaml(tmpPath);
    return { appliedManifestPath: tmpPath, tempDir: tmpDir };
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

/** `oc delete -f` for a substituted manifest (rebuilds from template + replacements). */
export async function deleteYamlTemplate(
  oc: OcCliService,
  relativePath: string,
  replacements: Record<string, string>,
  tempPrefix = 'e2e-yaml-template-delete-'
): Promise<void> {
  const manifest = substituteYamlTemplate(relativePath, replacements);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const tmpPath = path.join(tmpDir, 'manifest.yaml');
  try {
    fs.writeFileSync(tmpPath, manifest, { encoding: 'utf8', mode: 0o600 });
    await oc.deleteYaml(tmpPath).catch(() => undefined);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Remove temp dir created by {@link applyYamlTemplate}. */
export function cleanupYamlTemplateTemp(appliedManifestPath: string): void {
  try {
    fs.rmSync(path.dirname(appliedManifestPath), { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}
