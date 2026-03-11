/**
 * Helper utilities for Kubernetes resource management.
 * Pure functions only - no Playwright or external dependencies.
 */

/**
 * Generate a safe Kubernetes resource name with random suffix.
 * @param prefix - Name prefix (e.g., 'ci', 'test')
 * @returns Name like 'ci-abc12'
 */
export function generateSafeName(prefix: string): string {
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${suffix}`;
}
