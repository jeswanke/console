/** True for common env “boolean” strings (1, true, yes). */
export function isTruthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}
