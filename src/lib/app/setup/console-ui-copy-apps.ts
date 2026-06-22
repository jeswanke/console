import fs from 'node:fs';
import path from 'node:path';

import { APP_CONSOLE_UI_CHANNEL_COPY } from '@constants/app';
import type { OcCliService } from '@services/OcCliService';

type ConsoleUiCopyKind = keyof typeof APP_CONSOLE_UI_CHANNEL_COPY;

function repoRootFromHere(): string {
  return path.resolve(__dirname, '../../../..');
}

function renderConsoleUiCopyYaml(kind: ConsoleUiCopyKind): string {
  const spec = APP_CONSOLE_UI_CHANNEL_COPY[kind];
  const templatePath = path.join(repoRootFromHere(), spec.templateRelativePath);
  let yaml = fs.readFileSync(templatePath, 'utf8');
  yaml = yaml
    .replaceAll('{APP_NAME}', spec.applicationName)
    .replaceAll('{APP_NAMESPACE}', spec.namespace)
    .replaceAll('{CLUSTER_NAME}', spec.clusterName);

  if (kind === 'git') {
    const git = APP_CONSOLE_UI_CHANNEL_COPY.git;
    yaml = yaml
      .replaceAll('{APP_BRANCH}', git.branch)
      .replaceAll('{APP_PATH}', git.path);
  } else {
    const helm = APP_CONSOLE_UI_CHANNEL_COPY.helm;
    yaml = yaml
      .replaceAll('{APP_URL}', helm.channelRepositoryUrl)
      .replaceAll('{APP_CHART_NAME}', helm.chartName)
      .replaceAll('{APP_PACKAGE_VERSION}', helm.packageVersion);
  }
  return yaml;
}

async function applyRenderedYaml(oc: OcCliService, yaml: string): Promise<void> {
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);
}

async function deleteRenderedYaml(oc: OcCliService, yaml: string): Promise<void> {
  await oc.run(`oc delete -f - <<'EOF'\n${yaml}\nEOF`);
}

/** RHACM4K-32401 — apply git subscription app for channel copy verification. */
export async function applyConsoleUiCopyGitApp(oc: OcCliService): Promise<void> {
  const yaml = renderConsoleUiCopyYaml('git');
  await applyRenderedYaml(oc, yaml);
  await oc.labelNamespaceForAlcTest(APP_CONSOLE_UI_CHANNEL_COPY.git.namespace);
}

export async function deleteConsoleUiCopyGitApp(oc: OcCliService): Promise<void> {
  const yaml = renderConsoleUiCopyYaml('git');
  await deleteRenderedYaml(oc, yaml);
}

export async function applyConsoleUiCopyHelmApp(oc: OcCliService): Promise<void> {
  const yaml = renderConsoleUiCopyYaml('helm');
  await applyRenderedYaml(oc, yaml);
  await oc.labelNamespaceForAlcTest(APP_CONSOLE_UI_CHANNEL_COPY.helm.namespace);
}

export async function deleteConsoleUiCopyHelmApp(oc: OcCliService): Promise<void> {
  const yaml = renderConsoleUiCopyYaml('helm');
  await deleteRenderedYaml(oc, yaml);
}
