// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
import { describe, expect, it } from 'vitest';
import { hasPatchedRelease, isBlockingAdvisory } from '../scripts/audit-deps';

describe('hasPatchedRelease', () => {
  it('treats empty, none, and <0.0.0 as no published patch', () => {
    expect(hasPatchedRelease(undefined)).toBe(false);
    expect(hasPatchedRelease('')).toBe(false);
    expect(hasPatchedRelease('none')).toBe(false);
    expect(hasPatchedRelease('<0.0.0')).toBe(false);
  });

  it('treats a semver range as a published patch', () => {
    expect(hasPatchedRelease('>=1.20.0')).toBe(true);
    expect(hasPatchedRelease('>=5.0.11')).toBe(true);
  });
});

describe('isBlockingAdvisory', () => {
  it('fails the gate only for high/critical findings that have a patch', () => {
    expect(isBlockingAdvisory({ severity: 'high', patched_versions: '>=1.20.0' })).toBe(true);
    expect(isBlockingAdvisory({ severity: 'critical', patched_versions: '>=8.10.2' })).toBe(true);
  });

  it('does not fail on unpatchable high findings or lower severities', () => {
    expect(isBlockingAdvisory({ severity: 'high', patched_versions: '<0.0.0' })).toBe(false);
    expect(isBlockingAdvisory({ severity: 'moderate', patched_versions: '>=1.0.0' })).toBe(false);
    expect(isBlockingAdvisory({ severity: 'low', patched_versions: '>=1.0.0' })).toBe(false);
  });
});
