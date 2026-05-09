/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
          signalType: 'loss-streak',
          severity: 5,
          confidence: 0.9,
          detectedAt: Date.now(),
        },
      ];

      const nudge = getNudgeMessage(signals);

      expect(nudge.category).toBe('loss');
    });

    it('should return firm nudge for high severity', () => {
      const signals: TiltSignal[] = [
        {
          userId: 'user-1',
          signalType: 'martingale',
          severity: 5,
          confidence: 0.9,
          detectedAt: Date.now(),
        },
      ];

      const nudge = getNudgeMessage(signals);

      expect(['firm', 'CRITICAL']).toContain(nudge.severity);
    });
  });

  describe('formatNudge', () => {
    it('should format nudge with severity prefix and symbol (no emojis)', () => {
      const nudge: NudgeMessage = {
        text: 'Test message',
        severity: 'gentle',
        category: 'general',
        symbol: '[TEST]',
        intervention_type: 'VIBE_CHECK',
      };

      const formatted = formatNudge(nudge);

      expect(formatted).toBe('[>>] **[TEST] Test message**');
    });
  });

  describe('getEscalatedNudges', () => {
    it('returns a fixed three-step escalation ladder for the user', () => {
      const nudges = getEscalatedNudges('user-1');

      expect(nudges).toHaveLength(3);
      expect(nudges.every((n) => typeof n === 'string')).toBe(true);
      expect(nudges[0]).toContain('user-1');
    });
  });

  describe('getCooldownMessage', () => {
    it('returns the standard cooldown copy', () => {
      const message = getCooldownMessage();

      expect(message).toContain('Session locked');
      expect(message).toContain('15 minutes');
    });
  });

  describe('getViolationMessage', () => {
    it('returns the escalated accountability copy', () => {
      const message = getViolationMessage();

      expect(message).toContain('ESCALATED');
      expect(message).toContain('accountability partner');
    });
  });
});
