/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TELEMETRY_REQUEST_HEADERS,
  getHubEndpoint,
} from '../../src/config.ts';
import {
  postRoundTelemetry,
  postWinSecureTelemetry,
} from '../../src/telemetry-client.ts';

describe('telemetry client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts round telemetry to the canonical API endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchMock);

    await postRoundTelemetry({
      userId: 'discord-123',
      bet: 5,
      win: 12.5,
      sessionId: 'session-1',
      casinoId: 'stake',
      gameId: 'dice',
      timestamp: 1234567890,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      getHubEndpoint('/v1/telemetry/round'),
      {
        method: 'POST',
        headers: TELEMETRY_REQUEST_HEADERS,
        body: JSON.stringify({
          userId: 'discord-123',
          bet: 5,
          win: 12.5,
          sessionId: 'session-1',
          casinoId: 'stake',
          gameId: 'dice',
          timestamp: 1234567890,
        }),
      },
    );
  });

  it('posts win-secure telemetry to the canonical API endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await postWinSecureTelemetry({
      userId: 'discord-123',
      amount: 42,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      getHubEndpoint('/v1/telemetry/win-secure'),
      {
        method: 'POST',
        headers: TELEMETRY_REQUEST_HEADERS,
        body: JSON.stringify({
          userId: 'discord-123',
          amount: 42,
        }),
      },
    );
  });
});
