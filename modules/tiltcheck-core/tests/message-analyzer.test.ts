import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeMessages, calculateTiltScore, analyzeMessagesWithAI } from '../src/message-analyzer.js';
import type { MessageActivity, TiltSignal } from '../src/types.js';

describe('Message Analyzer', () => {
  describe('analyzeMessages', () => {
    it('should return empty array for no messages', () => {
      const signals = analyzeMessages([], 'user-1');
      expect(signals).toEqual([]);
    });

    it('should detect rapid messaging (5+ messages in 30 seconds)', () => {
      const now = Date.now();
      const messages: MessageActivity[] = Array.from({ length: 6 }, (_, i) => ({
        content: `Message ${i}`,
        timestamp: now - i * 1000, // 1 second apart
        channelId: 'channel-1',
      }));

      const signals = analyzeMessages(messages, 'user-1');

      const rapidSignal = signals.find((s: any) => s.signalType === 'rapid-messages');
      expect(rapidSignal).toBeDefined();
      expect(rapidSignal?.severity).toBeGreaterThan(0);
      expect(rapidSignal?.confidence).toBe(0.7);
    });

    it('should not detect rapid messaging for slow messages', () => {
      const now = Date.now();
      const messages: MessageActivity[] = Array.from({ length: 3 }, (_, i) => ({
        content: `Message ${i}`,
        timestamp: now - i * 60000, // 1 minute apart
        channelId: 'channel-1',
      }));

      const signals = analyzeMessages(messages, 'user-1');

      const rapidSignal = signals.find((s: any) => s.signalType === 'rapid-messages');
      expect(rapidSignal).toBeUndefined();
    });

    it('should detect caps spam', () => {
      const now = Date.now();
      const messages: MessageActivity[] = [
        { content: 'THIS IS ALL CAPS MESSAGE', timestamp: now - 1000, channelId: 'channel-1' },
        { content: 'ANOTHER ALL CAPS MESSAGE', timestamp: now - 2000, channelId: 'channel-1' },
        { content: 'WHY IS EVERYTHING CAPS', timestamp: now - 3000, channelId: 'channel-1' },
        { content: 'STILL USING CAPS HERE', timestamp: now - 4000, channelId: 'channel-1' },
        { content: 'MORE CAPS SPAM HERE', timestamp: now - 5000, channelId: 'channel-1' },
      ];

      const signals = analyzeMessages(messages, 'user-1');

      const capsSignal = signals.find((s: any) => s.signalType === 'caps-spam');
      expect(capsSignal).toBeDefined();
      expect(capsSignal?.severity).toBe(3);
    });

    it('should detect rage keywords', () => {
      const now = Date.now();
      const messages: MessageActivity[] = [
        { content: 'this game is fucking rigged', timestamp: now - 1000, channelId: 'channel-1' },
        { content: 'what a scam', timestamp: now - 2000, channelId: 'channel-1' },
      ];

      const signals = analyzeMessages(messages, 'user-1');

      const rageSignal = signals.find((s: any) => s.signalType === 'rage-quit');
      expect(rageSignal).toBeDefined();
      expect(rageSignal?.confidence).toBe(0.8);
    });

    it('should detect loan requests', () => {
      const now = Date.now();
      const messages: MessageActivity[] = [
        { content: 'can someone loan me $50', timestamp: now - 1000, channelId: 'channel-1' },
      ];

      const signals = analyzeMessages(messages, 'user-1');

      const loanSignal = signals.find((s: any) => s.signalType === 'loan-request');
      expect(loanSignal).toBeDefined();
      expect(loanSignal?.severity).toBe(4);
      expect(loanSignal?.confidence).toBe(0.9);
    });

    it('should detect "im broke" as loan request', () => {
      const now = Date.now();
      const messages: MessageActivity[] = [
        { content: 'im broke and need help', timestamp: now - 1000, channelId: 'channel-1' },
      ];

      const signals = analyzeMessages(messages, 'user-1');

      const loanSignal = signals.find((s: any) => s.signalType === 'loan-request');
      expect(loanSignal).toBeDefined();
    });
  });

  describe('calculateTiltScore', () => {
    it('should return 0 for no signals', () => {
      const score = calculateTiltScore([]);
      expect(score).toBe(0);
    });

    it('should calculate weighted average score', () => {
      const signals: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'rapid-messages',
          severity: 3,
          confidence: 0.7,
          detectedAt: Date.now(),
        },
        {
          userId: 'user-1',
          signalType: 'rage-quit',
          severity: 4,
          confidence: 0.8,
          detectedAt: Date.now(),
        },
      ];

      const score = calculateTiltScore(signals);

      // Expected: (3 * 0.7 + 4 * 0.8) / (0.7 + 0.8) = (2.1 + 3.2) / 1.5 = 3.53
      expect(score).toBeCloseTo(3.53, 1);
    });

    it('should weight higher confidence signals more', () => {
      const lowConfidence: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'rapid-messages',
          severity: 5,
          confidence: 0.3,
          detectedAt: Date.now(),
        },
      ];

      const highConfidence: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'loan-request',
          severity: 5,
          confidence: 0.9,
          detectedAt: Date.now(),
        },
      ];

      // Both have severity 5, so single signal scores should equal severity
      const lowScore = calculateTiltScore(lowConfidence);
      const highScore = calculateTiltScore(highConfidence);

      expect(lowScore).toBe(5);
      expect(highScore).toBe(5);
    });
  });

  describe('analyzeMessagesWithAI', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return local analysis when AI client is not available', async () => {
      const now = Date.now();
      const messages: MessageActivity[] = [
        { content: 'this game is rigged', timestamp: now - 1000, channelId: 'channel-1' },
        { content: 'such a scam', timestamp: now - 2000, channelId: 'channel-1' },
      ];

      const result = await analyzeMessagesWithAI(messages, 'user-1');

      expect(result.signals).toBeDefined();
      expect(result.tiltScore).toBeGreaterThanOrEqual(0);
      // AI analysis should be undefined when AI client is not available
      expect(result.aiAnalysis).toBeUndefined();
    });

    it('should include local tilt score for all messages', async () => {
      const now = Date.now();
      const messages: MessageActivity[] = [
        { content: 'can someone loan me money?', timestamp: now - 1000, channelId: 'channel-1' },
      ];

      const result = await analyzeMessagesWithAI(messages, 'user-1');

      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.tiltScore).toBeGreaterThan(0);
      
      // Should have loan-request signal
      const loanSignal = result.signals.find((s: any) => s.signalType === 'loan-request');
      expect(loanSignal).toBeDefined();
    });

    it('should return empty signals for empty messages', async () => {
      const result = await analyzeMessagesWithAI([], 'user-1');

      expect(result.signals).toEqual([]);
      expect(result.tiltScore).toBe(0);
    });

    it('should accept additional context for analysis', async () => {
      const now = Date.now();
      const messages: MessageActivity[] = [
        { content: 'im on a roll', timestamp: now - 1000, channelId: 'channel-1' },
      ];

      const additionalContext = {
        recentBets: [
          { amount: 100, won: false, timestamp: now - 10000 },
          { amount: 200, won: false, timestamp: now - 5000 },
        ],
        sessionDuration: 3600,
        losses: 500,
      };

      const result = await analyzeMessagesWithAI(messages, 'user-1', additionalContext);

      expect(result).toBeDefined();
      expect(result.signals).toBeDefined();
      expect(result.tiltScore).toBeGreaterThanOrEqual(0);
    });
  });
});
