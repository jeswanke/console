import path from 'path';

/** Repository root (`console-e2e/`) for modules under `src/global-setup/`. */
export function getRepoRoot(): string {
  return path.join(__dirname, '..', '..');
}
