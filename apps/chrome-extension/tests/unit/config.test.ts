/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
  TELEMETRY_PATH,
  TELEMETRY_REQUEST_HEADERS,
  WIN_SECURE_PATH,
  getDiscordLoginUrl,
  getHubEndpoint,
} from '../../src/config.ts';

describe('extension auth URL builder', () => {
  it('includes trusted extension opener origin for extension login', () => {
    (globalThis as any).chrome = { runtime: { id: 'abc123extid' } };
    const url = new URL(getDiscordLoginUrl('extension'));

    expect(url.searchParams.get('source')).toBe('extension');
    expect(url.searchParams.get('opener_origin')).toBe('chrome-extension://abc123extid');
  });

  it('does not include opener origin for non-extension source', () => {
    (globalThis as any).chrome = { runtime: { id: 'abc123extid' } };
    const url = new URL(getDiscordLoginUrl('web'));

    expect(url.searchParams.get('source')).toBe('web');
    expect(url.searchParams.get('opener_origin')).toBeNull();
    expect(url.searchParams.get('source_detail')).toBe('web');
  });

  it('builds canonical telemetry endpoints on the API host', () => {
    expect(getHubEndpoint(TELEMETRY_PATH)).toBe('https://api.tiltcheck.me/v1/telemetry/round');
    expect(getHubEndpoint(WIN_SECURE_PATH)).toBe('https://api.tiltcheck.me/v1/telemetry/win-secure');
    expect(TELEMETRY_REQUEST_HEADERS).toEqual({
      'Content-Type': 'application/json',
      'X-Requested-With': 'TiltCheckExtension',
    });
  });
});
