/** Native OpenShift application (oc apply + ACM discovery). */
export type CreateOpenshiftApplicationOptions = {
  applicationName: string;
  /** Mortgage / edit deployable name when adding `app.kubernetes.io/part-of` resources. */
  nameEdit?: string;
  namespace: string;
  clusterName?: string;
  deployment: string;
  service: string;
  route?: string;
  successNumber: number;
  topologyIcons: string[];
  helloworldTemplateRelativePath?: string;
  mortgageTemplateRelativePath?: string;
};

export function withOpenshiftClusterName(
  spec: CreateOpenshiftApplicationOptions,
  clusterName: string
): CreateOpenshiftApplicationOptions {
  return { ...spec, clusterName };
}

export function openshiftDeploymentName(spec: CreateOpenshiftApplicationOptions): string {
  return spec.nameEdit ?? spec.deployment;
}
