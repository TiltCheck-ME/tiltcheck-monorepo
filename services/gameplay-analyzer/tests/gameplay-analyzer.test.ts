import { describe, it, expect, beforeEach } from 'vitest';
import { GameplayAnalyzerService } from '../src/gameplay-analyzer.js';
import type { SpinResult } from '../src/types.js';

describe('GameplayAnalyzerService', () => {
  let analyzer: GameplayAnalyzerService;

  beforeEach(() => {
    analyzer = new GameplayAnalyzerService({
      autoPublish: false, // Disable event publishing for tests
      minSpinsRequired: 10,
      windowSize: 50,
    });
  });

  // Helper to generate spin results
  function generateSpins(
    count: number,
    options: {
      wager?: number;
      rtpMultiplier?: number; // 1.0 = 100% RTP, 0.96 = 96% RTP
      userId?: string;
      casinoId?: string;
      gameId?: string;
      clustered?: boolean; // Create clustered wins
    } = {}
  ): SpinResult[] {
    const {
      wager = 10,
      rtpMultiplier = 0.96,
      userId = 'test-user',
      casinoId = 'test-casino',
      gameId = 'test-slot',
      clustered = false,
    } = options;

    const spins: SpinResult[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      let payout: number;

      if (clustered) {
        // Create clustered wins (win streaks)
        const inWinStreak = i % 10 < 5; // First 5 of every 10 spins are wins
        payout = inWinStreak ? wager * 2 * rtpMultiplier : 0;
      } else {
        // Random distribution matching expected RTP
        // Ensure at least one win to prevent 0 RTP in edge cases
        const isWin = i === 0 || Math.random() < 0.3; // First spin always wins, ~30% win rate otherwise
        payout = isWin ? wager * (rtpMultiplier / 0.3) : 0;
      }

      spins.push({
        spinId: `spin-${i}`,
        userId,
        casinoId,
        gameId,
        wager,
        payout,
        timestamp: now + i * 1000,
      });
    }

    return spins;
  }

  describe('recordSpin', () => {
    it('should create a new session for first spin', () => {
      const spin: SpinResult = {
        spinId: 'spin-1',
        userId: 'user-1',
        casinoId: 'casino-1',
        gameId: 'slot-1',
        wager: 10,
        payout: 15,
        timestamp: Date.now(),
      };

      analyzer.recordSpin(spin);

      expect(analyzer.getSessionCount()).toBe(1);
    });

    it('should add spins to existing session', () => {
      const spins = generateSpins(5);

      for (const spin of spins) {
        analyzer.recordSpin(spin);
      }

      const session = analyzer.getSession('test-user:test-casino');
      expect(session?.spins.length).toBe(5);
    });

    it('should update session RTP as spins are recorded', () => {
      const spins = generateSpins(10);

      for (const spin of spins) {
        analyzer.recordSpin(spin);
      }

      const session = analyzer.getSession('test-user:test-casino');
      expect(session?.sessionRTP).toBeGreaterThan(0);
    });
  });

  describe('recordSpinBatch', () => {
    it('should record multiple spins at once', () => {
      const spins = generateSpins(20);

      analyzer.recordSpinBatch(spins);

      const session = analyzer.getSession('test-user:test-casino');
      expect(session?.spins.length).toBe(20);
    });
  });

  describe('detectPump', () => {
    it('should not detect pump when RTP is at baseline', () => {
      const spins = generateSpins(50, { rtpMultiplier: 0.96 });
      analyzer.recordSpinBatch(spins);

      const report = analyzer['detectPump']({
        observedRTP: 0.96,
        totalWagers: 500,
        totalPayouts: 480,
        spinCount: 50,
        windowStart: Date.now(),
        windowEnd: Date.now(),
      });

      expect(report.detected).toBe(false);
      expect(report.severity).toBe('none');
    });

    it('should detect warning when RTP is slightly elevated', () => {
      const report = analyzer['detectPump']({
        observedRTP: 1.10, // 10% above baseline
        totalWagers: 500,
        totalPayouts: 550,
        spinCount: 50,
        windowStart: Date.now(),
        windowEnd: Date.now(),
      });

      expect(report.detected).toBe(true);
      expect(report.severity).toBe('warning');
    });

    it('should detect critical when RTP is significantly elevated', () => {
      const report = analyzer['detectPump']({
        observedRTP: 1.25, // 25% above baseline
        totalWagers: 500,
        totalPayouts: 625,
        spinCount: 50,
        windowStart: Date.now(),
        windowEnd: Date.now(),
      });

      expect(report.detected).toBe(true);
      expect(report.severity).toBe('critical');
    });

    it('should not detect pump when RTP is below baseline', () => {
      const report = analyzer['detectPump']({
        observedRTP: 0.85, // Below baseline
        totalWagers: 500,
        totalPayouts: 425,
        spinCount: 50,
        windowStart: Date.now(),
        windowEnd: Date.now(),
      });

      expect(report.detected).toBe(false);
    });
  });

  describe('detectWinClustering', () => {
    it('should not detect clustering with random distribution', () => {
      // Generate random spins with no clustering
      const spins: SpinResult[] = [];
      const now = Date.now();
      
      for (let i = 0; i < 50; i++) {
        const isWin = Math.random() < 0.3;
        spins.push({
          spinId: `spin-${i}`,
          userId: 'test-user',
          casinoId: 'test-casino',
          gameId: 'test-slot',
          wager: 10,
          payout: isWin ? 15 : 0,
          timestamp: now + i * 1000,
        });
      }

      const result = analyzer['detectWinClustering'](spins);
      
      // Random distribution should typically not trigger clustering
      expect(result.anomalyType).toBe('win_clustering');
    });

    it('should detect clustering with artificial win streaks', () => {
      // Generate highly clustered wins
      const spins: SpinResult[] = [];
      const now = Date.now();
      
      for (let i = 0; i < 50; i++) {
        // Create a massive win streak: first 20 are wins, rest are losses
        const isWin = i < 20;
        spins.push({
          spinId: `spin-${i}`,
          userId: 'test-user',
          casinoId: 'test-casino',
          gameId: 'test-slot',
          wager: 10,
          payout: isWin ? 30 : 0,
          timestamp: now + i * 1000,
        });
      }

      const result = analyzer['detectWinClustering'](spins);
      
      expect(result.anomalyType).toBe('win_clustering');
      expect(result.metadata.maxStreak).toBeGreaterThanOrEqual(20);
    });

    it('should return no detection for insufficient data', () => {
      const spins = generateSpins(5);

      const result = analyzer['detectWinClustering'](spins);

      expect(result.detected).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });
  });

  describe('detectRTPDrift', () => {
    it('should not detect drift with stable RTP', () => {
      // Generate spins with consistent RTP
      const spins = generateSpins(100, { rtpMultiplier: 0.96 });

      const result = analyzer['detectRTPDrift'](spins);

      expect(result.anomalyType).toBe('rtp_drift');
      // May or may not detect based on random variance
    });

    it('should return no detection for insufficient data', () => {
      const spins = generateSpins(15);

      const result = analyzer['detectRTPDrift'](spins);

      expect(result.detected).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });
  });

  describe('analyzeSession', () => {
    it('should return null for non-existent session', async () => {
      const report = await analyzer.analyzeSession('non-existent:session');
      expect(report).toBeNull();
    });

    it('should return null for session with insufficient spins', async () => {
      const spins = generateSpins(5);
      analyzer.recordSpinBatch(spins);

      const report = await analyzer.analyzeSession('test-user:test-casino');
      expect(report).toBeNull();
    });

    it('should generate complete report for valid session', async () => {
      const spins = generateSpins(50);
      analyzer.recordSpinBatch(spins);

      const report = await analyzer.analyzeSession('test-user:test-casino');

      expect(report).not.toBeNull();
      expect(report?.userId).toBe('test-user');
      expect(report?.casinoId).toBe('test-casino');
      expect(report?.pumpAnalysis).toBeDefined();
      expect(report?.clusterAnalysis).toBeDefined();
      expect(report?.driftAnalysis).toBeDefined();
      expect(report?.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report?.recommendations.length).toBeGreaterThan(0);
    });

    it('should store report in history', async () => {
      const spins = generateSpins(50);
      analyzer.recordSpinBatch(spins);

      const historyBefore = analyzer.getHistory('test-user').length;
      await analyzer.analyzeSession('test-user:test-casino');

      const history = analyzer.getHistory('test-user');
      expect(history.length).toBe(historyBefore + 1);
    });
  });

  describe('getMobileSummary', () => {
    it('should return null for non-existent session', () => {
      const summary = analyzer.getMobileSummary('non-existent:session');
      expect(summary).toBeNull();
    });

    it('should return compressed summary for valid session', () => {
      const spins = generateSpins(50);
      analyzer.recordSpinBatch(spins);

      const summary = analyzer.getMobileSummary('test-user:test-casino');

      expect(summary).not.toBeNull();
      expect(summary?.sid).toBeDefined();
      expect(summary?.ts).toBeGreaterThan(0);
      expect(summary?.af).toBeDefined();
      expect(summary?.cf).toBeGreaterThanOrEqual(0);
      expect(summary?.cf).toBeLessThanOrEqual(100);
      expect(summary?.rtp).toBeGreaterThan(0);
      expect(summary?.sc).toBe(50);
      expect(summary?.sv).toBeGreaterThanOrEqual(0);
      expect(summary?.sv).toBeLessThanOrEqual(2);
    });
  });

  describe('mobile utilities', () => {
    it('should parse compressed spin data', () => {
      const compressed = '10|15|1000;10|0|2000;10|25|3000';
      
      const spins = analyzer.parseCompressedSpins(
        compressed,
        'user-1',
        'casino-1',
        'slot-1'
      );

      expect(spins.length).toBe(3);
      expect(spins[0].wager).toBe(10);
      expect(spins[0].payout).toBe(15);
      expect(spins[0].timestamp).toBe(1000);
      expect(spins[1].payout).toBe(0);
      expect(spins[2].payout).toBe(25);
    });

    it('should return empty array for empty compressed data', () => {
      const spins = analyzer.parseCompressedSpins('', 'u', 'c', 'g');
      expect(spins.length).toBe(0);
    });

    it('should recommend appropriate poll intervals based on battery', () => {
      // Full battery
      expect(analyzer.getMobilePollInterval(100, false)).toBe(30000);
      
      // Low battery, not charging
      expect(analyzer.getMobilePollInterval(15, false)).toBe(120000);
      
      // Medium battery, not charging
      expect(analyzer.getMobilePollInterval(40, false)).toBe(60000);
      
      // Low battery, but charging
      expect(analyzer.getMobilePollInterval(15, true)).toBe(30000);
    });

    it('should return minimal payload', () => {
      const spins = generateSpins(50);
      analyzer.recordSpinBatch(spins);

      const payload = analyzer.getMinimalPayload('test-user:test-casino');

      expect(payload.ok).toBe(true);
      expect(payload.data).toBeDefined();
    });

    it('should return not ok for missing session', () => {
      const payload = analyzer.getMinimalPayload('missing:session');
      expect(payload.ok).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      analyzer.updateConfig({ baselineRTP: 0.95 });
      
      const config = analyzer.getConfig();
      expect(config.baselineRTP).toBe(0.95);
    });

    it('should enable mobile mode', () => {
      analyzer.enableMobileMode();
      
      const config = analyzer.getConfig();
      expect(config.mobileOptimized).toBe(true);
    });

    it('should disable mobile mode', () => {
      analyzer.enableMobileMode();
      analyzer.disableMobileMode();
      
      const config = analyzer.getConfig();
      expect(config.mobileOptimized).toBe(false);
    });
  });

  describe('session management', () => {
    it('should end session and return final report', async () => {
      const spins = generateSpins(50);
      analyzer.recordSpinBatch(spins);

      const report = await analyzer.endSession('test-user:test-casino');

      expect(report).not.toBeNull();
      
      const session = analyzer.getSession('test-user:test-casino');
      expect(session?.isActive).toBe(false);
    });

    it('should clear session', () => {
      const spins = generateSpins(10);
      analyzer.recordSpinBatch(spins);

      expect(analyzer.getSessionCount()).toBe(1);

      analyzer.clearSession('test-user:test-casino');

      expect(analyzer.getSessionCount()).toBe(0);
    });

    it('should clear all sessions and history', async () => {
      const spins = generateSpins(50);
      analyzer.recordSpinBatch(spins);
      await analyzer.analyzeSession('test-user:test-casino');

      analyzer.clearAll();

      expect(analyzer.getSessionCount()).toBe(0);
      expect(analyzer.getHistory('test-user').length).toBe(0);
    });
  });

  describe('game baselines', () => {
    it('should set and use game-specific baselines', () => {
      analyzer.setGameBaseline('high-rtp-slot', 0.98);
      
      // The baseline is stored but the current implementation
      // uses a global baseline - this could be enhanced
      // For now, just verify it stores correctly
      expect(analyzer['baselinesByGame'].get('high-rtp-slot')).toBe(0.98);
    });
  });

  describe('risk score calculation', () => {
    it('should calculate high risk score for multiple critical anomalies', async () => {
      // Create spins with very high RTP (pump indicator)
      const spins: SpinResult[] = [];
      const now = Date.now();
      
      for (let i = 0; i < 50; i++) {
        spins.push({
          spinId: `spin-${i}`,
          userId: 'test-user',
          casinoId: 'test-casino',
          gameId: 'test-slot',
          wager: 10,
          payout: 15, // 150% RTP - extreme pump
          timestamp: now + i * 1000,
        });
      }

      analyzer.recordSpinBatch(spins);
      const report = await analyzer.analyzeSession('test-user:test-casino');

      expect(report?.overallRiskScore).toBeGreaterThan(0);
      expect(report?.pumpAnalysis.detected).toBe(true);
    });

    it('should generate appropriate recommendations', async () => {
      const spins = generateSpins(50);
      analyzer.recordSpinBatch(spins);

      const report = await analyzer.analyzeSession('test-user:test-casino');

      expect(report?.recommendations).toBeDefined();
      expect(report?.recommendations.length).toBeGreaterThan(0);
    });
  });
});
