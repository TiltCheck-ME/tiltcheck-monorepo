import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModNotifier, createModNotifier } from '../src/mod-notifier';

// Mock Discord.js Client and TextChannel
const mockSend = vi.fn().mockResolvedValue({});
const mockChannelsFetch = vi.fn();

const mockClient = {
  channels: {
    fetch: mockChannelsFetch,
  },
} as any;

const mockTextChannel = {
  isTextBased: () => true,
  send: mockSend,
} as any;

describe('ModNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelsFetch.mockResolvedValue(mockTextChannel);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isEnabled', () => {
    it('returns false when no config is provided', () => {
      const notifier = new ModNotifier();
      expect(notifier.isEnabled()).toBe(false);
    });

    it('returns false when modChannelId is not set', () => {
      const notifier = new ModNotifier({ enabled: true });
      expect(notifier.isEnabled()).toBe(false);
    });

    it('returns false when client is not set', () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      expect(notifier.isEnabled()).toBe(false);
    });

    it('returns true when properly configured', () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      notifier.setClient(mockClient);
      expect(notifier.isEnabled()).toBe(true);
    });

    it('returns false when disabled', () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: false });
      notifier.setClient(mockClient);
      expect(notifier.isEnabled()).toBe(false);
    });
  });

  describe('notify', () => {
    it('sends notification to mod channel', async () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      notifier.setClient(mockClient);

      const result = await notifier.notify({
        type: 'link.flagged',
        title: 'Test Alert',
        description: 'Test description',
        userId: '987654321',
        url: 'https://malicious.example.com',
        severity: 4,
      });

      expect(result).toBe(true);
      expect(mockChannelsFetch).toHaveBeenCalledWith('123456789');
      expect(mockSend).toHaveBeenCalledTimes(1);
      
      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.embeds).toBeDefined();
      expect(sendArgs.embeds.length).toBe(1);
    });

    it('mentions mod role when configured', async () => {
      const notifier = new ModNotifier({
        modChannelId: '123456789',
        modRoleId: '111222333',
        enabled: true,
      });
      notifier.setClient(mockClient);

      await notifier.notify({
        type: 'tilt.detected',
        title: 'Tilt Alert',
        description: 'User is tilting',
        userId: '987654321',
      });

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.content).toBe('<@&111222333>');
    });

    it('returns false when disabled', async () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: false });
      notifier.setClient(mockClient);

      const result = await notifier.notify({
        type: 'link.flagged',
        title: 'Test',
        description: 'Test',
      });

      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('returns false when client not set', async () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });

      const result = await notifier.notify({
        type: 'link.flagged',
        title: 'Test',
        description: 'Test',
      });

      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('deduplication', () => {
    it('prevents duplicate notifications within dedupe window', async () => {
      const notifier = new ModNotifier({
        modChannelId: '123456789',
        enabled: true,
        dedupeWindowMs: 60000, // 1 minute
      });
      notifier.setClient(mockClient);

      const notification = {
        type: 'link.flagged' as const,
        title: 'Duplicate Test',
        description: 'Same notification',
        userId: '123',
        url: 'https://same-url.com',
      };

      // First call should succeed
      const result1 = await notifier.notify(notification);
      expect(result1).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Second call with same notification should be deduplicated
      const result2 = await notifier.notify(notification);
      expect(result2).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1); // Still 1
    });

    it('allows different notifications', async () => {
      const notifier = new ModNotifier({
        modChannelId: '123456789',
        enabled: true,
      });
      notifier.setClient(mockClient);

      await notifier.notify({
        type: 'link.flagged',
        title: 'First',
        description: 'First notification',
        url: 'https://first.com',
      });

      await notifier.notify({
        type: 'link.flagged',
        title: 'Second',
        description: 'Second notification',
        url: 'https://second.com',
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('rate limiting', () => {
    it('limits notifications per window', async () => {
      const notifier = new ModNotifier({
        modChannelId: '123456789',
        enabled: true,
        rateLimitWindowMs: 60000,
        maxNotificationsPerWindow: 3,
      });
      notifier.setClient(mockClient);

      // Send 3 notifications (within limit)
      for (let i = 0; i < 3; i++) {
        const result = await notifier.notify({
          type: 'link.flagged',
          title: `Test ${i}`,
          description: 'Rate limit test',
          url: `https://test${i}.com`,
        });
        expect(result).toBe(true);
      }

      // 4th notification should be rate limited
      const result = await notifier.notify({
        type: 'link.flagged',
        title: 'Test 4',
        description: 'Should be rate limited',
        url: 'https://test4.com',
      });
      expect(result).toBe(false);

      expect(mockSend).toHaveBeenCalledTimes(3);
    });
  });

  describe('helper methods', () => {
    it('notifyLinkFlagged sends properly formatted notification', async () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      notifier.setClient(mockClient);

      await notifier.notifyLinkFlagged({
        url: 'https://scam.example.com',
        riskLevel: 'high',
        userId: '123',
        channelId: '456',
        reason: 'Known phishing site',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const embed = mockSend.mock.calls[0][0].embeds[0];
      expect(embed.data.title).toContain('High-Risk Link');
      expect(embed.data.fields?.some((f: any) => f.name === 'Risk Level')).toBe(true);
    });

    it('notifyTiltDetected sends properly formatted notification', async () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      notifier.setClient(mockClient);

      await notifier.notifyTiltDetected({
        userId: '123',
        reason: 'Rapid betting pattern',
        severity: 'high',
        channelId: '456',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const embed = mockSend.mock.calls[0][0].embeds[0];
      expect(embed.data.title).toContain('Tilt');
    });

    it('notifyCooldownViolation sends properly formatted notification', async () => {
      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      notifier.setClient(mockClient);

      await notifier.notifyCooldownViolation({
        userId: '123',
        action: 'tip',
        newDuration: 30,
        channelId: '456',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const embed = mockSend.mock.calls[0][0].embeds[0];
      expect(embed.data.title).toContain('Cooldown');
    });
  });

  describe('getStats', () => {
    it('returns correct stats', () => {
      const notifier = new ModNotifier({
        modChannelId: '123456789',
        modRoleId: '111222333',
        enabled: true,
      });

      const stats = notifier.getStats();
      expect(stats.enabled).toBe(false); // No client yet
      expect(stats.modChannelConfigured).toBe(true);
      expect(stats.modRoleConfigured).toBe(true);
      expect(stats.rateLimitCount).toBe(0);
      expect(stats.dedupeCacheSize).toBe(0);

      notifier.setClient(mockClient);
      const stats2 = notifier.getStats();
      expect(stats2.enabled).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('updates configuration at runtime', () => {
      const notifier = new ModNotifier({ modChannelId: '123', enabled: true });
      notifier.setClient(mockClient);
      
      expect(notifier.isEnabled()).toBe(true);

      notifier.updateConfig({ enabled: false });
      expect(notifier.isEnabled()).toBe(false);

      notifier.updateConfig({ enabled: true, modRoleId: '999' });
      expect(notifier.isEnabled()).toBe(true);
    });
  });

  describe('createModNotifier', () => {
    it('creates notifier with default config', () => {
      const notifier = createModNotifier();
      expect(notifier).toBeInstanceOf(ModNotifier);
    });

    it('creates notifier with custom config', () => {
      const notifier = createModNotifier({
        modChannelId: '123',
        modRoleId: '456',
        enabled: true,
      });
      notifier.setClient(mockClient);
      expect(notifier.isEnabled()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns false and logs error when channel fetch fails', async () => {
      mockChannelsFetch.mockRejectedValue(new Error('Channel not found'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      notifier.setClient(mockClient);

      const result = await notifier.notify({
        type: 'link.flagged',
        title: 'Test',
        description: 'Test',
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('returns false when channel is not text-based', async () => {
      mockChannelsFetch.mockResolvedValue({
        isTextBased: () => false,
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const notifier = new ModNotifier({ modChannelId: '123456789', enabled: true });
      notifier.setClient(mockClient);

      const result = await notifier.notify({
        type: 'link.flagged',
        title: 'Test',
        description: 'Test',
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
