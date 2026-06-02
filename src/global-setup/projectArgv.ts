/**
 * Parse Playwright CLI **`--project` / `-p`** values (global setup has no access to the resolved config).
 */
export function collectRequestedProjectNames(): string[] {
  const projects: string[] = [];
  const a = process.argv;
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === '--project' || arg === '-p') {
      const next = a[i + 1];
      if (next) projects.push(next);
    }
    if (arg?.startsWith('--project=')) {
      projects.push(arg.slice('--project='.length));
    }
  }
  return projects;
}

/** True when every requested project is **`unit`**. */
export function requestedProjectsAreAllUnit(): boolean {
  const p = collectRequestedProjectNames();
  if (p.length === 0) {
    return false;
  }
  return p.every((name) => name === 'unit');
}

/**
 * True when **`alc`** is among CLI-selected projects. If no `--project` was passed, returns **false**
 * (full default suite — do not assume ALC-only).
 */
export function requestedProjectsIncludeAlc(): boolean {
  return collectRequestedProjectNames().includes('alc');
}
