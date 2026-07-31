import type { ImportClusterWizardPage } from '@pages/cluster/ImportClusterWizardPage';

export interface ImportClusterOptions {
  clusterName: string;
  kubeconfig: string;
  clusterSet?: string;
  additionalLabels?: Record<string, string>;
}

export async function importClusterViaKubeconfig(
  wizard: ImportClusterWizardPage,
  options: ImportClusterOptions,
): Promise<void> {
  const { clusterName, kubeconfig, clusterSet, additionalLabels } = options;

  await wizard.goto();
  await wizard.fillClusterName(clusterName);

  await wizard.selectImportMode('kubeconfig');
  await wizard.pasteKubeconfig(kubeconfig);

  if (additionalLabels && Object.keys(additionalLabels).length > 0) {
    await wizard.fillAdditionalLabels(additionalLabels);
  }

  // Details → Automation (skip) → Review → Import
  await wizard.clickNext();
  await wizard.clickNext();
  await wizard.clickImport();

  await wizard.expectOnOverviewPage(clusterName);
}
