import { describe, it, expect } from 'vitest';
import {
  getNudgeMessage,
  formatNudge,
  getEscalatedNudges,
  getCooldownMessage,
  getViolationMessage,
  type NudgeMessage,
} from '../src/nudge-generator.js';
import type { TiltSignal } from '../src/types.js';

describe('Nudge Generator', () => {
  describe('getNudgeMessage', () => {
    it('should return a generic nudge for no signals', () => {
      const nudge = getNudgeMessage([]);

      expect(nudge).toBeDefined();
      expect(nudge.text).toBeDefined();
      expect(nudge.severity).toBeDefined();
      expect(nudge.category).toBe('general');
    });

    it('should return a nudge based on signal type', () => {
      const signals: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'rapid-messages',
          severity: 3,
          confidence: 0.7,
          detectedAt: Date.now(),
        },
      ];

      const nudge = getNudgeMessage(signals);

      expect(nudge).toBeDefined();
      expect(nudge.category).toBe('pacing');
    });

    it('should prioritize more severe signals', () => {
      const signals: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'rapid-messages',
          severity: 2,
          confidence: 0.7,
          detectedAt: Date.now(),
        },
        {
          userId: 'user-1',
          signalType: 'loan-request',
          severity: 5,
          confidence: 0.9,
          detectedAt: Date.now(),
        },
      ];

      const nudge = getNudgeMessage(signals);

      // Should select from loan-request messages (safety category)
      expect(nudge.category).toBe('safety');
    });

    it('should return firm nudge for high severity', () => {
      const signals: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'loan-request',
          severity: 5,
          confidence: 0.9,
          detectedAt: Date.now(),
        },
      ];

      const nudge = getNudgeMessage(signals);

      expect(nudge.severity).toBe('firm');
    });
  });

  describe('formatNudge', () => {
    it('should format nudge with emoji prefix', () => {
      const nudge: NudgeMessage = {
        text: 'Test message',
        severity: 'gentle',
        category: 'general',
        emoji: '🧪',
      };

      const formatted = formatNudge(nudge);

      expect(formatted).toBe('🧪 Test message');
    });
  });

  describe('getEscalatedNudges', () => {
    it('should return single nudge for mild signals', () => {
      const signals: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'rapid-messages',
          severity: 2,
          confidence: 0.7,
          detectedAt: Date.now(),
        },
      ];

      const nudges = getEscalatedNudges(signals);

      expect(nudges.length).toBe(1);
    });

    it('should return multiple nudges for severe tilt (score >= 8)', () => {
      const signals: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'loan-request',
          severity: 5,
          confidence: 0.9,
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

      const nudges = getEscalatedNudges(signals);

      expect(nudges.length).toBe(2);
      expect(nudges.some((n: any) => n.severity === 'firm')).toBe(true);
    });
  });

  describe('getCooldownMessage', () => {
    it('should return appropriate message for short cooldown', () => {
      const message = getCooldownMessage(1);

      expect(message).toContain('Almost there');
    });

    it('should return appropriate message for medium cooldown', () => {
      const message = getCooldownMessage(5);

      expect(message).toContain('5 minutes');
    });

    it('should return appropriate message for long cooldown', () => {
      const message = getCooldownMessage(10);

      expect(message).toContain('touch grass');
    });

    it('should return extended message for very long cooldown', () => {
      const message = getCooldownMessage(20);

      expect(message).toContain('Extended');
      expect(message).toContain('grab some food');
    });
  });

  describe('getViolationMessage', () => {
    it('should return first violation message', () => {
      const message = getViolationMessage(1);

      expect(message).toContain('First violation');
    });

    it('should return second violation message', () => {
      const message = getViolationMessage(2);

      expect(message).toContain('Second violation');
    });

    it('should return third violation message with extension note', () => {
      const message = getViolationMessage(3);

      expect(message).toContain('Third violation');
      expect(message).toContain('extended');
    });

    it('should return generic message for many violations', () => {
      const message = getViolationMessage(5);

      expect(message).toContain('5 violations');
      expect(message).toContain('keeps getting longer');
    });
  });
});
