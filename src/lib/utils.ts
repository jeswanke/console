/** Escape a URL path segment for use inside a `RegExp` source. */
export function escapePathSegment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
