/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const postRoundTelemetryMock = vi.fn();

vi.mock('../../src/telemetry-client.ts', () => ({
  postRoundTelemetry: postRoundTelemetryMock,
}));

describe('HubRelay', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('loads the linked user id from shared extension storage keys', async () => {
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            userData: { id: 'discord-123' },
            tiltguard_user_id: 'fallback-user',
          }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    };

    const { HubRelay } = await import('../../src/v2/telemetry/HubRelay.ts');
    const relay = new HubRelay();
    await Promise.resolve();

    expect(relay.getUserId()).toBe('discord-123');
  });

  it('persists round telemetry with the resolved user id', async () => {
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            tiltguard_user_id: 'tiltguard-123',
          }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    };
    postRoundTelemetryMock.mockResolvedValue({ ok: true, status: 202 });

    const { HubRelay } = await import('../../src/v2/telemetry/HubRelay.ts');
    const relay = new HubRelay();
    await Promise.resolve();
    await relay.pushRound({ bet: 5, win: 12 } as any);

    expect(postRoundTelemetryMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'tiltguard-123',
      bet: 5,
      win: 12,
      casinoId: 'localhost',
    }));
  });
});
