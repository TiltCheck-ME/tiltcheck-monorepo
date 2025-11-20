import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordNotifier } from '../src/discord-notifier';
import type { RiskAlert } from '../src/state';

// Mock global fetch
global.fetch = vi.fn();

describe('Discord notifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends alert via webhook when enabled', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const notifier = new DiscordNotifier({ url: 'https://discord.com/api/webhooks/test', enabled: true });
    const alert: RiskAlert = {
      kind: 'domain-delta',
      entity: 'evil.example',
      totalDelta: -50,
      firstSeenTs: Date.now()
    };

    await notifier.sendAlert(alert);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://discord.com/api/webhooks/test');
    const payload = JSON.parse(callArgs[1].body);
    expect(payload.embeds).toBeDefined();
    expect(payload.embeds[0].title).toContain('Alert');
    expect(payload.embeds[0].fields.some((f: any) => f.value.includes('evil.example'))).toBe(true);
  });

  it('does not send when disabled', async () => {
    const mockFetch = global.fetch as any;
    const notifier = new DiscordNotifier({ url: undefined, enabled: false });
    const alert: RiskAlert = {
      kind: 'critical-severity',
      entity: 'bad.domain',
      severity: 5,
      firstSeenTs: Date.now()
    };

    await notifier.sendAlert(alert);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('prevents duplicate alerts', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const notifier = new DiscordNotifier({ url: 'https://discord.com/api/webhooks/test', enabled: true });
    const alert: RiskAlert = {
      kind: 'domain-anomaly',
      entity: 'spike.example',
      totalDelta: -80,
      severity: 4,
      firstSeenTs: 123456789
    };

    await notifier.sendAlert(alert);
    await notifier.sendAlert(alert); // Duplicate

    expect(mockFetch).toHaveBeenCalledTimes(1); // Only sent once
  });

  it('formats anomaly alert with critical color', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const notifier = new DiscordNotifier({ url: 'https://discord.com/api/webhooks/test', enabled: true });
    const alert: RiskAlert = {
      kind: 'domain-anomaly',
      entity: 'anomaly.test',
      totalDelta: -100,
      severity: 5,
      firstSeenTs: Date.now()
    };

    await notifier.sendAlert(alert);

    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.embeds[0].color).toBe(0xff3d3d); // Critical red
    expect(payload.embeds[0].title).toContain('🚨');
  });
});
