/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TrustEnginesService } from '../src/index.js';
import { eventRouter } from '@tiltcheck/event-router';

describe('TrustEnginesService', () => {
  let service: TrustEnginesService;

  beforeEach(() => {
    eventRouter.clearHistory();
    service = new TrustEnginesService({ autoSubscribe: true });
    service.clearState(); // Clear any previous test state
  });

  describe('Casino Trust Engine', () => {
    it('adjusts casino trust on link.flagged', async () => {
      await eventRouter.publish('link.flagged', 'suslink', {
        url: 'https://example.com/free-money',
        riskLevel: 'critical',
        reason: 'test',
      }, 'user-x');

      await new Promise(r => setTimeout(r, 10));
      const updates = eventRouter.getHistory({ eventType: 'trust.casino.updated' });
      expect(updates.length).toBeGreaterThan(0);
      const last = updates[updates.length - 1];
      expect(last.data.casinoName).toBe('example.com');
      expect(last.data.newScore).toBeLessThan(75);
      expect(last.data.delta).toBeLessThan(0);
    });

    it('adjusts bonus score on bonus nerf', async () => {
      await eventRouter.publish('bonus.nerf.detected', 'collectclock', {
        casinoName: 'stake.com',
        percentDrop: -0.5,
        amount: 100,
        previousAmount: 200,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getCasinoBreakdown('stake.com');
      expect(breakdown.bonusScore).toBeLessThan(75);
      expect(breakdown.history.length).toBeGreaterThan(0);
    });

    it('processes casino rollup events', async () => {
      await eventRouter.publish('trust.casino.rollup', 'trust-rollup', {
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
        casinos: {
          'rollup-casino.com': {
            totalDelta: -20,
            events: 5,
            lastSeverity: 3,
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getCasinoBreakdown('rollup-casino.com');
      expect(breakdown.bonusScore).toBeLessThan(75);
    });

    it('processes domain rollup events', async () => {
      await eventRouter.publish('trust.domain.rollup', 'trust-rollup', {
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
        domains: {
          'bad-domain.xyz': {
            totalDelta: -15,
            events: 3,
            lastSeverity: 4,
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getCasinoBreakdown('bad-domain.xyz');
      expect(breakdown.complianceScore).toBeLessThan(75);
    });

    it('calculates weighted total score correctly', () => {
      const breakdown = service.getCasinoBreakdown('test.com');
      
      const expectedScore = Math.round(
        breakdown.fairnessScore * 0.30 +
        breakdown.payoutScore * 0.20 +
        breakdown.bonusScore * 0.15 +
        breakdown.userReportScore * 0.15 +
        breakdown.freespinScore * 0.10 +
        breakdown.complianceScore * 0.05 +
        breakdown.supportScore * 0.05
      );

      expect(breakdown.score).toBe(expectedScore);
    });

    it('explains casino score with warnings', async () => {
      await eventRouter.publish('bonus.nerf.detected', 'collectclock', {
        casinoName: 'low-trust.com',
        percentDrop: -0.8,
        amount: 10,
        previousAmount: 50,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const explanations = service.explainCasinoScore('low-trust.com');
      expect(explanations.length).toBeGreaterThan(0);
    });
  });

  describe('Degen Trust Engine', () => {
    it('publishes degen trust updates on tip.completed', async () => {
      await eventRouter.publish('tip.completed', 'justthetip', {
        fromUserId: 'alice',
        toUserId: 'bob',
        amount: 150,
      }, 'alice');

      await new Promise(r => setTimeout(r, 10));
      const updates = eventRouter.getHistory({ eventType: 'trust.degen.updated' });
      expect(updates.length).toBeGreaterThanOrEqual(2);
    });

    it('gives generosity bonus for large tips', async () => {
      await eventRouter.publish('tip.completed', 'justthetip', {
        fromUserId: 'generous',
        toUserId: 'recipient',
        amount: 150,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getDegenBreakdown('generous');
      expect(breakdown.accountabilityBonus).toBeGreaterThan(0);
    });

    it('decreases score on tilt detection', async () => {
      await eventRouter.publish('tilt.detected', 'tiltcheck', {
        userId: 'tilted-user',
        severity: 3,
        reason: 'Rapid aggressive messages',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getDegenBreakdown('tilted-user');
      expect(breakdown.tiltIndicators).toBeGreaterThan(0);
      expect(breakdown.score).toBeLessThan(70);
    });

    it('penalizes cooldown violations', async () => {
      await eventRouter.publish('cooldown.violated', 'tiltcheck', {
        userId: 'rule-breaker',
        severity: 2,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const score = service.getDegenScore('rule-breaker');
      expect(score).toBeLessThan(70);
    });

    it('heavily penalizes confirmed scams', async () => {
      await eventRouter.publish('scam.reported', 'discord-bot', {
        reporterId: 'reporter',
        accusedId: 'scammer',
        verified: true,
        reason: 'Confirmed loan scam with evidence',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getDegenBreakdown('scammer');
      expect(breakdown.scamFlags).toBe(1);
      expect(breakdown.score).toBeLessThan(60); // 70 - 15 penalty = 55
    });

    it('penalizes false scam reports', async () => {
      await eventRouter.publish('scam.reported', 'discord-bot', {
        reporterId: 'false-accuser',
        accusedId: 'innocent',
        verified: false,
        falseReport: true,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const accuserScore = service.getDegenScore('false-accuser');
      const innocentScore = service.getDegenScore('innocent');
      
      expect(accuserScore).toBeLessThan(70);
      expect(innocentScore).toBeLessThan(70);
    });

    it('rewards accountability tool usage', async () => {
      await eventRouter.publish('accountability.success', 'tiltcheck', {
        userId: 'responsible',
        action: 'vault-used',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getDegenBreakdown('responsible');
      expect(breakdown.accountabilityBonus).toBeGreaterThan(0);
      expect(breakdown.score).toBeGreaterThan(70);
    });

    it('returns correct trust levels', () => {
      expect(service.getTrustLevel(98)).toBe('very-high');
      expect(service.getTrustLevel(85)).toBe('high');
      expect(service.getTrustLevel(65)).toBe('neutral');
      expect(service.getTrustLevel(45)).toBe('low');
      expect(service.getTrustLevel(30)).toBe('high-risk');
    });

    it('explains degen score with indicators', async () => {
      await eventRouter.publish('tilt.detected', 'tiltcheck', {
        userId: 'explain-me',
        severity: 4,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const explanations = service.explainDegenScore('explain-me');
      expect(explanations.some((e: any) => e.includes('Trust Level'))).toBe(true);
    });
  });

  describe('Score History', () => {
    it('maintains event history', async () => {
      await eventRouter.publish('bonus.nerf.detected', 'collectclock', {
        casinoName: 'history-test.com',
        percentDrop: -0.3,
        amount: 50,
        previousAmount: 75,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const breakdown = service.getCasinoBreakdown('history-test.com');
      expect(breakdown.history.length).toBeGreaterThan(0);
    });
  });
});
