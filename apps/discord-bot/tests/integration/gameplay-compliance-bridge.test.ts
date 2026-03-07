import { describe, it, expect, vi } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { initializeGameplayComplianceBridge } from '../../src/services/gameplay-compliance-bridge.js';
import {
  clearUserTiltAgentContext,
  setUserTiltAgentContext,
} from '../../src/services/tilt-agent.js';

describe('Gameplay Compliance Bridge', () => {
  it('posts compliance alert using user-specific state/topic context', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const mockChannel = {
      isTextBased: () => true,
      guild: { id: '1446973117472964620' },
      send,
    };

    const mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue(mockChannel),
      },
    };

    const userId = 'user-ctx-001';
    setUserTiltAgentContext(userId, {
      stateCode: 'NJ',
      regulationTopic: 'igaming',
    });

    initializeGameplayComplianceBridge(mockClient as any);

    await eventRouter.publish(
      'fairness.pump.detected' as any,
      'gameplay-analyzer',
      {
        userId,
        casinoId: 'casino-1',
        anomalyType: 'pump',
        severity: 'warning',
        confidence: 0.82,
        metadata: {},
        reason: 'RTP elevated above baseline',
        timestamp: Date.now(),
      },
      userId,
    );

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0] as string;
    expect(payload).toContain('State/topic: NJ/igaming');
    expect(payload).toContain('[WARN] Gameplay compliance warning');

    clearUserTiltAgentContext(userId);
  });
});
