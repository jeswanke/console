import { OcCliService } from '@services/OcCliService';

/** ManagedCluster name labeled `local-cluster=true` (hub). */
export async function getHubClusterName(oc: OcCliService): Promise<string> {
  const result = await oc.execArgv([
    'get',
    'managedclusters',
    '-l',
    'local-cluster=true',
    '-o',
    'jsonpath={.items[0].metadata.name}',
  ]);
  const name = result.trim();
  if (!name) {
    throw new Error('Cannot find a ManagedCluster labeled local-cluster=true');
  }
  return name;
}
