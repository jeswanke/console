export const IMPORT_ROUTES = {
  import: '/multicloud/infrastructure/clusters/import',
} as const;

// Compound IDs — use `[id="..."]` selectors, not `#id` shorthand
export const IMPORT_WIZARD_FIELDS = {
  clusterName: '[id="ManagedCluster.metadata.name;id=clusterName"]',
  kubeConfigEntry: '[id="Secret.stringData.kubeconfig;id=kubeConfigEntry"]',
  additionalLabels: '#additionalLabels',
  importModeDropdown: '#import-mode-label',
  server: '#server',
  token: '#token',
  templateName: '#templateName',
  yamlSwitch: '#yaml-switch',
} as const;

export const IMPORT_MODES = {
  manual: 'Run import commands manually',
  token: 'Enter your server URL and API token for the existing cluster',
  kubeconfig: 'Kubeconfig',
  discovery: 'Import from Red Hat OpenShift Cluster Manager',
} as const;

export const IMPORT_BUTTONS = {
  import: 'Import',
  generateCommand: 'Generate command',
  next: 'Next',
  back: 'Back',
  cancel: 'Cancel',
} as const;

export interface ImportPlatformType {
  readonly suffix: string;
  readonly key: string;
  readonly vendor: string;
  readonly cloud: string;
  readonly importTestId: string;
  readonly detachTestId: string;
}

export const IMPORT_PLATFORM_TYPES: ImportPlatformType[] = [
  { suffix: '-eks.kubeconfig', key: 'eks', vendor: 'EKS', cloud: 'Amazon', importTestId: 'RHACM4K-4053', detachTestId: 'RHACM4K-1485' },
  { suffix: '-aks.kubeconfig', key: 'aks', vendor: 'AKS', cloud: 'Azure', importTestId: 'RHACM4K-4054', detachTestId: 'RHACM4K-1486' },
  { suffix: '-gke.kubeconfig', key: 'gke', vendor: 'GKE', cloud: 'Google', importTestId: 'RHACM4K-4055', detachTestId: 'RHACM4K-1487' },
  { suffix: '-iks.kubeconfig', key: 'iks', vendor: 'IKS', cloud: 'IBM', importTestId: 'RHACM4K-4052', detachTestId: 'RHACM4K-1488' },
  { suffix: '-roks.kubeconfig', key: 'roks', vendor: 'OpenShift', cloud: 'IBM', importTestId: 'RHACM4K-4056', detachTestId: 'RHACM4K-878' },
  { suffix: '-rosa.kubeconfig', key: 'rosa', vendor: 'OpenShift', cloud: 'Amazon', importTestId: 'RHACM4K-4057', detachTestId: 'RHACM4K-12081' },
  { suffix: '-aro.kubeconfig', key: 'aro', vendor: 'OpenShift', cloud: 'Azure', importTestId: 'RHACM4K-14159', detachTestId: 'RHACM4K-12082' },
  { suffix: '-ocp.kubeconfig', key: 'ocp', vendor: 'OpenShift', cloud: 'Other', importTestId: 'RHACM4K-4059', detachTestId: 'RHACM4K-1500' },
];

export function detectPlatformType(filename: string): ImportPlatformType | undefined {
  return IMPORT_PLATFORM_TYPES.find((p) => filename.endsWith(p.suffix));
}
