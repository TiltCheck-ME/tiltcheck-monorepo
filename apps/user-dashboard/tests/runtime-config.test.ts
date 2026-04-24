/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */

import { describe, expect, it } from 'vitest';
import { resolveCanonicalApiBaseUrl, resolveDashboardPort } from '../src/runtime-config.js';

describe('resolveDashboardPort', () => {
  it('ignores the generic root PORT during local development', () => {
    expect(resolveDashboardPort({ NODE_ENV: 'development', PORT: '3001' })).toBe('6001');
  });

  it('respects an explicit dashboard port override', () => {
    expect(resolveDashboardPort({ NODE_ENV: 'development', PORT: '3001', USER_DASHBOARD_PORT: '7001' })).toBe('7001');
  });
});

describe('resolveCanonicalApiBaseUrl', () => {
  it('uses the local API surface during development even when a production API base is present', () => {
    expect(resolveCanonicalApiBaseUrl({ NODE_ENV: 'development', TILT_API_BASE_URL: 'https://api.tiltcheck.me' })).toBe('http://localhost:8080');
  });

  it('uses the configured API base in production', () => {
    expect(resolveCanonicalApiBaseUrl({ NODE_ENV: 'production', TILT_API_BASE_URL: 'https://api.internal.tiltcheck.me' })).toBe('https://api.internal.tiltcheck.me');
  });
});
