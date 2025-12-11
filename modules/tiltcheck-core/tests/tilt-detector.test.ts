import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackMessage,
  trackLoss,
  trackBet,
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
      const tiltEvent = history.find((e: any) => e.type === 'tilt.detected');

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

  describe('trackBet', () => {
    it('should record bets in user activity', () => {
      trackBet('user-bet-1', 10, 'poker', true);
      trackBet('user-bet-1', 15, 'poker', true);

      const activity = getUserActivity('user-bet-1');

      expect(activity?.recentBets.length).toBe(2);
      expect(activity?.recentBets[0].amount).toBe(10);
      expect(activity?.recentBets[1].amount).toBe(15);
    });

    it('should keep only last 10 bets', () => {
      for (let i = 0; i < 12; i++) {
        trackBet('user-bet-2', i * 10, 'poker', i % 2 === 0);
      }

      const activity = getUserActivity('user-bet-2');

      expect(activity?.recentBets.length).toBe(10);
      expect(activity?.recentBets[0].amount).toBe(20); // First two dropped
    });

    it('should reset loss streak on winning bet', () => {
      trackLoss('user-bet-win', 100);
      trackLoss('user-bet-win', 100);

      expect(getUserActivity('user-bet-win')?.lossStreak).toBe(2);

      trackBet('user-bet-win', 50, 'poker', true); // Win

      expect(getUserActivity('user-bet-win')?.lossStreak).toBe(0);
    });

    it('should track loss on losing bet', () => {
      trackBet('user-bet-lose', 50, 'poker', false); // Lose

      const activity = getUserActivity('user-bet-lose');

      expect(activity?.lossStreak).toBe(1);
      expect(activity?.lastLoss).toBeDefined();
    });

    it('should detect bet sizing tilt when bet triples baseline', () => {
      // Establish baseline with small bets
      trackBet('user-bet-tilt', 10, 'poker', true);
      trackBet('user-bet-tilt', 10, 'poker', true);
      trackBet('user-bet-tilt', 10, 'poker', false);
      
      // Triple the bet after a loss - strong tilt indicator (score >= 3)
      trackBet('user-bet-tilt', 35, 'poker', false);

      const history = eventRouter.getHistory();
      const tiltEvent = history.find((e: any) => 
        e.type === 'tilt.detected' && 
        e.data.signals?.some((s: any) => s.type === 'bet-sizing')
      );

      expect(tiltEvent).toBeDefined();
    });

    it('should not trigger bet sizing tilt for gradual increases', () => {
      // Establish baseline
      trackBet('user-bet-gradual', 10, 'poker', true);
      trackBet('user-bet-gradual', 11, 'poker', true);
      trackBet('user-bet-gradual', 12, 'poker', true);
      
      // Small increase - not a tilt signal
      trackBet('user-bet-gradual', 15, 'poker', true);

      const history = eventRouter.getHistory();
      const betSizingTilt = history.find((e: any) => 
        e.type === 'tilt.detected' && 
        e.data.signals?.some((s: any) => s.type === 'bet-sizing')
      );

      expect(betSizingTilt).toBeUndefined();
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

    it('should include bet records in activity', () => {
      trackBet('user-activity-bets', 25, 'blackjack', true);
      trackBet('user-activity-bets', 30, 'blackjack', false);

      const activity = getUserActivity('user-activity-bets');

      expect(activity?.recentBets.length).toBe(2);
      expect(activity?.recentBets[0].gameType).toBe('blackjack');
    });
  });

  describe('game.completed event handling', () => {
    it('should track losses for non-winners when game completes', async () => {
      // Simulate game.completed event
      await eventRouter.publish('game.completed', 'poker-module', {
        gameId: 'game-123',
        channelId: 'channel-1',
        result: {
          winners: [{ userId: 'winner-1', username: 'Winner', winnings: 100 }],
          pot: 200,
        },
        participants: ['winner-1', 'loser-1', 'loser-2'],
        duration: 60000,
      });

      // Losers should have their loss tracked
      const loser1Activity = getUserActivity('loser-1');
      const loser2Activity = getUserActivity('loser-2');

      expect(loser1Activity?.lossStreak).toBeGreaterThanOrEqual(1);
      expect(loser2Activity?.lossStreak).toBeGreaterThanOrEqual(1);
    });

    it('should reset loss streak for winners', async () => {
      // Setup: give winner some losses first
      trackLoss('game-winner', 50);
      trackLoss('game-winner', 50);

      expect(getUserActivity('game-winner')?.lossStreak).toBe(2);

      // Simulate game.completed event where they win
      await eventRouter.publish('game.completed', 'poker-module', {
        gameId: 'game-456',
        channelId: 'channel-1',
        result: {
          winners: [{ userId: 'game-winner', username: 'Winner', winnings: 200 }],
          pot: 200,
        },
        participants: ['game-winner', 'other-player'],
        duration: 30000,
      });

      // Winner's loss streak should be reset
      expect(getUserActivity('game-winner')?.lossStreak).toBe(0);
    });

    it('should emit bad-beat tilt signal for unlikely losses', async () => {
      eventRouter.clearHistory();

      // Simulate game.completed with bad beat
      await eventRouter.publish('game.completed', 'poker-module', {
        gameId: 'game-789',
        channelId: 'channel-1',
        result: {
          winners: [{ userId: 'lucky-winner', username: 'Lucky', winnings: 500 }],
          pot: 500,
          badBeat: {
            loserId: 'unlucky-loser',
            probability: 0.02, // 2% chance - bad beat
          },
        },
        participants: ['lucky-winner', 'unlucky-loser'],
        duration: 45000,
      });

      const history = eventRouter.getHistory();
      const tiltEvent = history.find((e: any) => 
        e.type === 'tilt.detected' && 
        e.data.reason === 'bad-beat'
      );

      expect(tiltEvent).toBeDefined();
      expect(tiltEvent?.data.userId).toBe('unlucky-loser');
      expect(tiltEvent?.data.severity).toBeGreaterThanOrEqual(4); // High severity for < 5% probability
    });
  });
});
