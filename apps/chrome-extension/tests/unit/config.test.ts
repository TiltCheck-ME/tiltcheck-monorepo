/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
  TELEMETRY_PATH,
  TELEMETRY_REQUEST_HEADERS,
  WIN_SECURE_PATH,
  getDirectDiscordOAuthUrl,
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

  it("builds direct Discord OAuth URL using unified client ID and callback", () => {
    const url = new URL(getDirectDiscordOAuthUrl("test-nonce-123"));
    expect(url.origin).toBe("https://discord.com");
    expect(url.pathname).toBe("/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("1445916179163250860");
    expect(url.searchParams.get("response_type")).toBe("token");
    expect(url.searchParams.get("scope")).toBe("identify");
    expect(url.searchParams.get("redirect_uri")).toBe("https://collectclock-api.j-chapman7.workers.dev/auth/callback");
    expect(url.searchParams.get("state")).toBe("h.test-nonce-123");
  });
});
