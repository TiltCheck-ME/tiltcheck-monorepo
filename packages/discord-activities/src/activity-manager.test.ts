// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { DiscordActivityManager } from './activity-manager.js';
import { ActivityType } from './types.js';

describe('DiscordActivityManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects launches when required SKUs were not verified', async () => {
    const manager = new DiscordActivityManager('app-id');
    vi.spyOn(eventRouter, 'publish').mockResolvedValue(undefined);

    await expect(
      manager.launchActivity({
        userId: 'user-1',
        guildId: 'guild-1',
        channelId: 'channel-1',
        activityType: ActivityType.TRIVIA,
        instanceId: 'instance-1',
        sessionToken: 'token-1',
        applicationId: 'app-id',
        requiredSKUs: ['sku-required'],
      })
    ).rejects.toThrow('Required entitlements not verified');
  });

  it('preserves the activity outcome and full result payload on completion', async () => {
    const manager = new DiscordActivityManager('app-id');
    vi.spyOn(eventRouter, 'publish').mockResolvedValue(undefined);

    await manager.launchActivity({
      userId: 'user-1',
      guildId: 'guild-1',
      channelId: 'channel-1',
      activityType: ActivityType.TRIVIA,
      instanceId: 'instance-1',
      sessionToken: 'token-1',
      applicationId: 'app-id',
    });

    const result = await manager.completeActivity('instance-1', {
      status: 'lost',
      score: 7,
      completedAt: Date.now(),
    });

    expect(result).toEqual(
      expect.objectContaining({
        instanceId: 'instance-1',
        userId: 'user-1',
        activityType: ActivityType.TRIVIA,
        status: 'lost',
        score: 7,
      })
    );

    expect(manager.getInstance('instance-1')).toEqual(
      expect.objectContaining({
        status: 'completed',
        outcome: 'lost',
        result: expect.objectContaining({ status: 'lost', score: 7 }),
      })
    );
    expect(manager.getSessionState('instance-1')).toEqual(
      expect.objectContaining({
        status: 'completed',
        outcome: 'lost',
        result: expect.objectContaining({ status: 'lost', score: 7 }),
      })
    );
  });

  it('rejects entitlement consumption claims without verified consumed IDs', async () => {
    const manager = new DiscordActivityManager('app-id');
    vi.spyOn(eventRouter, 'publish').mockResolvedValue(undefined);

    await manager.launchActivity({
      userId: 'user-1',
      guildId: 'guild-1',
      channelId: 'channel-1',
      activityType: ActivityType.TRIVIA,
      instanceId: 'instance-1',
      sessionToken: 'token-1',
      applicationId: 'app-id',
      consumableSKUs: ['sku-consumable'],
    });

    await expect(
      manager.completeActivity('instance-1', {
        status: 'won',
        entitlementConsumed: true,
        completedAt: Date.now(),
      })
    ).rejects.toThrow('cannot report entitlement consumption without consumed entitlement IDs');
  });
});
