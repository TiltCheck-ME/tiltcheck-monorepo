import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trackMessage,
  trackLoss,
  resetLossStreak,
  triggerCooldown,
  shouldWarnUser,
  getUserTiltStatus,
  getUserActivity,
} from '../src/tilt-detector';
import { eventRouter } from '@tiltcheck/event-router';

describe('Tilt Detector', () => {
  beforeEach(() => {
    eventRouter.clearHistory();
  });

  describe('trackMessage', () => {
    it('should create activity record for new user', () => {
      trackMessage('new-user-1', 'Hello world', 'channel-1');

      const activity = getUserActivity('new-user-1');

      expect(activity).toBeDefined();
      expect(activity?.userId).toBe('new-user-1');
      expect(activity?.messages.length).toBe(1);
      expect(activity?.messages[0].content).toBe('Hello world');
    });

    it('should append messages to existing user activity', () => {
      trackMessage('user-track-1', 'First message', 'channel-1');
      trackMessage('user-track-1', 'Second message', 'channel-1');

      const activity = getUserActivity('user-track-1');

      expect(activity?.messages.length).toBe(2);
    });

    it('should keep only last 20 messages', () => {
      for (let i = 0; i < 25; i++) {
        trackMessage('user-track-2', `Message ${i}`, 'channel-1');
      }

      const activity = getUserActivity('user-track-2');

      expect(activity?.messages.length).toBe(20);
      expect(activity?.messages[0].content).toBe('Message 5');
    });
  });

  describe('trackLoss', () => {
    it('should increment loss streak', () => {
      trackLoss('user-loss-1', 100);
      trackLoss('user-loss-1', 200);

      const activity = getUserActivity('user-loss-1');

      expect(activity?.lossStreak).toBe(2);
    });

    it('should emit tilt.detected event on loss streak >= 3', () => {
      trackLoss('user-loss-2', 100);
      trackLoss('user-loss-2', 200);
      trackLoss('user-loss-2', 300);

      const history = eventRouter.getHistory();
      const tiltEvent = history.find(e => e.type === 'tilt.detected');

      expect(tiltEvent).toBeDefined();
      expect(tiltEvent?.data.reason).toBe('loss-streak');
    });

    it('should create activity for new user', () => {
      trackLoss('user-loss-new', 50);

      const activity = getUserActivity('user-loss-new');

      expect(activity).toBeDefined();
      expect(activity?.lossStreak).toBe(1);
      expect(activity?.lastLoss).toBeDefined();
    });
  });

  describe('resetLossStreak', () => {
    it('should reset loss streak to 0', () => {
      trackLoss('user-reset-1', 100);
      trackLoss('user-reset-1', 200);

      expect(getUserActivity('user-reset-1')?.lossStreak).toBe(2);

      resetLossStreak('user-reset-1');

      expect(getUserActivity('user-reset-1')?.lossStreak).toBe(0);
    });

    it('should handle non-existent user gracefully', () => {
      expect(() => resetLossStreak('user-nonexistent')).not.toThrow();
    });
  });

  describe('triggerCooldown', () => {
    it('should start cooldown for user', () => {
      triggerCooldown('user-cooldown-1', 'Testing', 10);

      const status = getUserTiltStatus('user-cooldown-1');

      expect(status.onCooldown).toBe(true);
      expect(status.cooldownInfo?.reason).toBe('Testing');
    });

    it('should use default reason and duration', () => {
      triggerCooldown('user-cooldown-2');

      const status = getUserTiltStatus('user-cooldown-2');

      expect(status.onCooldown).toBe(true);
      expect(status.cooldownInfo?.reason).toBe('User requested');
    });
  });

  describe('shouldWarnUser', () => {
    it('should return false for user with no activity', () => {
      expect(shouldWarnUser('user-unknown')).toBe(false);
    });

    it('should return true for user with loss streak >= 2', () => {
      trackLoss('user-warn-1', 100);
      trackLoss('user-warn-1', 200);

      expect(shouldWarnUser('user-warn-1')).toBe(true);
    });
  });

  describe('getUserTiltStatus', () => {
    it('should return default status for unknown user', () => {
      const status = getUserTiltStatus('unknown-user');

      expect(status.lossStreak).toBe(0);
      expect(status.onCooldown).toBe(false);
      expect(status.recentSignals).toEqual([]);
    });

    it('should return current status for tracked user', () => {
      trackLoss('user-status-1', 100);
      trackLoss('user-status-1', 200);
      trackLoss('user-status-1', 300);

      const status = getUserTiltStatus('user-status-1');

      expect(status.lossStreak).toBe(3);
    });
  });

  describe('getUserActivity', () => {
    it('should return undefined for unknown user', () => {
      expect(getUserActivity('unknown')).toBeUndefined();
    });

    it('should return full activity for tracked user', () => {
      trackMessage('user-activity-1', 'Hello', 'channel-1');
      trackLoss('user-activity-1', 100);

      const activity = getUserActivity('user-activity-1');

      expect(activity?.userId).toBe('user-activity-1');
      expect(activity?.messages.length).toBe(1);
      expect(activity?.lossStreak).toBe(1);
    });
  });
});
