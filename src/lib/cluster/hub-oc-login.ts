import type { OcCliService } from '@services/OcCliService';

/** Run `fn` while logged into the hub as another OpenShift user; restores prior context. */
export async function withHubOcLogin<T>(
  oc: OcCliService,
  username: string,
  password: string,
  fn: () => Promise<T>
): Promise<T> {
  const priorContext = (await oc.run('oc config current-context 2>/dev/null || true')).trim();
  const server = (await oc.run('oc whoami --show-server 2>/dev/null || true')).trim();
  if (!server) {
    throw new Error('withHubOcLogin: hub API server is unavailable (oc whoami --show-server)');
  }

  const escapedPass = password.replace(/'/g, `'\\''`);
  await oc.run(
    `oc login '${server}' -u '${username}' -p '${escapedPass}' --insecure-skip-tls-verify`
  );

  try {
    return await fn();
  } finally {
    if (priorContext) {
      await oc.run(`oc config use-context '${priorContext.replace(/'/g, `'\\''`)}'`).catch(() => undefined);
    }
  }
}
