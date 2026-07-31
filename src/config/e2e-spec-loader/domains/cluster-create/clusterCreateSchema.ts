import { z } from 'zod';

export const clusterCreateCredentialSchema = z
  .object({
    name: z.string().min(1),
    namespace: z.string().min(1),
    provider: z.enum(['aws', 'gcp', 'azure', 'azgov', 'vmware', 'openstack', 'kubevirt']),
  })
  .strict();

export const clusterCreateParamsSchema = z
  .object({
    provider: z.enum(['aws', 'gcp', 'azure', 'azgov', 'vmware', 'openstack', 'kubevirt']),
    namePrefix: z.string().min(1),
    controlPlaneType: z.enum(['standalone', 'hosted']).default('standalone'),
    clusterSet: z.string().optional(),
    region: z.string().optional(),
    masterInstanceType: z.string().optional(),
    workerInstanceType: z.string().optional(),
    workerCount: z.number().int().positive().optional(),
    clusterNetworkCIDR: z.string().optional(),
    serviceNetworkCIDR: z.string().optional(),
    architecture: z.enum(['amd64', 'arm64', 's390x', 'ppc64le']).optional(),
    networkType: z.string().optional(),
    additionalLabels: z.record(z.string(), z.string()).optional(),
    // VMware-specific
    network: z.string().optional(),
    apiVIP: z.string().optional(),
    ingressVIP: z.string().optional(),
    machineCIDR: z.string().optional(),
    // OpenStack-specific
    externalNetwork: z.string().optional(),
    apiFIP: z.string().optional(),
    ingressFIP: z.string().optional(),
    // KubeVirt-specific
    etcdStorageClass: z.string().optional(),
    fixedClusterName: z.string().optional(),
    fips: z.boolean().optional(),
  })
  .strict();

export type ClusterCreateCredentialPayload = z.infer<typeof clusterCreateCredentialSchema>;
export type ClusterCreateParamsPayload = z.infer<typeof clusterCreateParamsSchema>;

export interface ResolvedClusterCreateScenario {
  readonly scenarioId: string;
  readonly enabled: boolean;
  readonly testIds: string[];
  readonly domain: 'clusterCreate';
  readonly credential: ClusterCreateCredentialPayload;
  readonly cluster: ClusterCreateParamsPayload;
}
