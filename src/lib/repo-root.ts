import path from 'node:path';

/** console-e2e repository root (`package.json` directory). */
export const CONSOLE_E2E_REPO_ROOT = path.resolve(__dirname, '../..');

/** @alias CONSOLE_E2E_REPO_ROOT */
export function getRepoRoot(): string {
  return CONSOLE_E2E_REPO_ROOT;
}
