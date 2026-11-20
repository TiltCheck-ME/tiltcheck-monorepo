/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BACKEND_FEATURES,
  BETA_TELEMETRY_ENDPOINT,
  EXT_CONFIG,
  TELEMETRY_PATH,
  TELEMETRY_REQUEST_HEADERS,
  WIN_SECURE_PATH,
  WORKER_ROUTES,
  getDirectDiscordOAuthUrl,
  getHubEndpoint,
  getWorkerEndpoint,
  isBackendFeatureEnabled,
} from '../../src/config.ts';

const WORKER = 'https://collectclock-api.j-chapman7.workers.dev';

describe('extension backend config', () => {
  it('points every API base at the live collectclock-api worker', () => {
    expect(EXT_CONFIG.API_BASE_URL).toBe(WORKER);
    expect(EXT_CONFIG.HUB_URL).toBe(WORKER);
    expect(EXT_CONFIG.WORKER_API_URL).toBe(WORKER);
    expect(JSON.stringify(EXT_CONFIG)).not.toContain('api.tiltcheck.me');
    expect(JSON.stringify(EXT_CONFIG)).not.toContain('railway');
  });

  it('builds worker endpoints only for the routes the worker serves', () => {
    expect(WORKER_ROUTES).toEqual({ AUTH_TOKEN: '/auth/token', ME: '/me', LOGOUT: '/logout', SUPPORT: '/support', BETA_COUNTS: '/beta/counts' });
    expect(getWorkerEndpoint(WORKER_ROUTES.BETA_COUNTS)).toBe(`${WORKER}/beta/counts`);
    expect(getWorkerEndpoint(WORKER_ROUTES.LOGOUT)).toBe(`${WORKER}/logout`);
    expect(getWorkerEndpoint('me')).toBe(`${WORKER}/me`);
  });

  it('keeps every feature without a backend switched off', () => {
    for (const [name, on] of Object.entries(BACKEND_FEATURES)) {
      if (name === 'betaTelemetry') continue; // has a live worker route; see below
      expect(on, name).toBe(false);
      expect(isBackendFeatureEnabled(name as keyof typeof BACKEND_FEATURES)).toBe(false);
    }
  });

  it('wires opt-in beta counts to the live worker route (sending still needs the user opt-in)', () => {
    expect(BACKEND_FEATURES.betaTelemetry).toBe(true);
    expect(BETA_TELEMETRY_ENDPOINT).toBe('/beta/counts');
    expect(getWorkerEndpoint(BETA_TELEMETRY_ENDPOINT)).toBe(`${WORKER}/beta/counts`);
  });

  it('already has host permission and connect-src for the worker host (no new permissions)', () => {
    for (const file of ['../../src/manifest.json', '../../manifest.json']) {
      const manifest = JSON.parse(readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8'));
      expect(manifest.host_permissions, file).toContain(`${WORKER}/*`);
      expect(manifest.content_security_policy.extension_pages, file).toContain(WORKER);
    }
  });

  it('keeps telemetry paths and headers stable for when a backend exists', () => {
    expect(getHubEndpoint(TELEMETRY_PATH)).toBe(`${WORKER}/v1/telemetry/round`);
    expect(getHubEndpoint(WIN_SECURE_PATH)).toBe(`${WORKER}/v1/telemetry/win-secure`);
    expect(TELEMETRY_REQUEST_HEADERS).toEqual({
      'Content-Type': 'application/json',
      'X-Requested-With': 'TiltCheckExtension',
    });
  });

  it('builds direct Discord OAuth URL using unified client ID and callback', () => {
    const url = new URL(getDirectDiscordOAuthUrl('test-nonce-123'));
    expect(url.origin).toBe('https://discord.com');
    expect(url.pathname).toBe('/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('1445916179163250860');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('scope')).toBe('identify');
    expect(url.searchParams.get('redirect_uri')).toBe(`${WORKER}/auth/callback`);
    expect(url.searchParams.get('state')).toBe('h.test-nonce-123');
  });
});
