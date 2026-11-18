/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
import { describe, expect, it } from 'vitest';
import { isSafeRelativePath, safeHref } from './safe-url';

describe('safeHref', () => {
  it('keeps same-origin paths and http(s) URLs', () => {
    expect(safeHref('/casinos/stake')).toBe('/casinos/stake');
    expect(safeHref('https://tiltcheck.me/a?b=1')).toBe('https://tiltcheck.me/a?b=1');
    expect(safeHref('http://localhost:3000/x')).toBe('http://localhost:3000/x');
  });

  it('rejects script and protocol-relative URLs', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref(' JaVaScRiPt:alert(1)')).toBe('#');
    expect(safeHref('java\tscript:alert(1)')).toBe('#');
    expect(safeHref('data:text/html,<script>1</script>')).toBe('#');
    expect(safeHref('//evil.example')).toBe('#');
    expect(safeHref('/\\evil.example')).toBe('#');
    expect(safeHref(undefined)).toBe('#');
    expect(safeHref('', '/fallback')).toBe('/fallback');
  });
});

describe('isSafeRelativePath', () => {
  it('only accepts single-slash relative paths', () => {
    expect(isSafeRelativePath('/dashboard?tab=vault')).toBe(true);
    expect(isSafeRelativePath('//evil.example')).toBe(false);
    expect(isSafeRelativePath('/\\evil.example')).toBe(false);
    expect(isSafeRelativePath('https://evil.example')).toBe(false);
  });
});
