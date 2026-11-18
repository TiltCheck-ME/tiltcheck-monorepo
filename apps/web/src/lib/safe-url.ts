/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */

/**
 * Returns `value` only when it is a same-origin relative path ("/foo", not
 * "//host" or "/\host") or an absolute http(s) URL. Anything else
 * (javascript:, data:, vbscript:, protocol-relative, malformed) yields `fallback`.
 */
export function safeHref(value: unknown, fallback = '#'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  // Reject control characters / whitespace that browsers strip before parsing schemes.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F\s]/.test(trimmed)) return fallback;

  if (isSafeRelativePath(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // fall through
  }
  return fallback;
}

/** True for "/path" style same-origin paths; false for "//host", "/\host", and anything else. */
export function isSafeRelativePath(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\') &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001F\u007F\\]/.test(value)
  );
}
