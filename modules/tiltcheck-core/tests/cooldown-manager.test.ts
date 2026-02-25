/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startCooldown,
  endCooldown,
  isOnCooldown,
  getCooldownStatus,
  recordViolation,
  getViolationHistory,
} from '../src/cooldown-manager.js';
import { eventRouter } from '@tiltcheck/event-router';

describe('Cooldown Manager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    eventRouter.clearHistory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('startCooldown', () => {
    it('should start a cooldown for a user', () => {
      const status = startCooldown('user-1', 'Testing', 5 * 60 * 1000);

      expect(status.userId).toBe('user-1');
      expect(status.active).toBe(true);
      expect(status.reason).toBe('Testing');
      expect(status.violationCount).toBe(0);
      expect(status.startedAt).toBeDefined();
      expect(status.endsAt).toBeDefined();
    });

    it('should set correct end time based on duration', () => {
      const now = Date.now();
      const durationMs = 10 * 60 * 1000; // 10 minutes
      const status = startCooldown('user-2', 'Testing', durationMs);

      expect(status.endsAt).toBe(now + durationMs);
    });
  });

  describe('isOnCooldown', () => {
    it('should return true when user is on cooldown', () => {
      startCooldown('user-3', 'Testing', 5 * 60 * 1000);

      expect(isOnCooldown('user-3')).toBe(true);
    });

    it('should return false when user is not on cooldown', () => {
      expect(isOnCooldown('user-unknown')).toBe(false);
    });

    it('should return false after cooldown expires', () => {
      startCooldown('user-4', 'Testing', 1000); // 1 second cooldown

      expect(isOnCooldown('user-4')).toBe(true);

      // Advance time past cooldown
      vi.advanceTimersByTime(2000);

      expect(isOnCooldown('user-4')).toBe(false);
    });
  });

  describe('endCooldown', () => {
    it('should end an active cooldown', () => {
      startCooldown('user-5', 'Testing', 5 * 60 * 1000);
      expect(isOnCooldown('user-5')).toBe(true);

      endCooldown('user-5');

      expect(isOnCooldown('user-5')).toBe(false);
    });

    it('should handle ending non-existent cooldown gracefully', () => {
      expect(() => endCooldown('user-nonexistent')).not.toThrow();
    });
  });

  describe('getCooldownStatus', () => {
    it('should return status for user on cooldown', () => {
      startCooldown('user-6', 'Test reason', 5 * 60 * 1000);

      const status = getCooldownStatus('user-6');

      expect(status).not.toBeNull();
      expect(status?.userId).toBe('user-6');
      expect(status?.reason).toBe('Test reason');
      expect(status?.active).toBe(true);
    });

    it('should return null for user not on cooldown', () => {
      const status = getCooldownStatus('user-unknown');

      expect(status).toBeNull();
    });
  });

  describe('recordViolation', () => {
    it('should increment violation count', () => {
      startCooldown('user-7', 'Testing', 5 * 60 * 1000);

      recordViolation('user-7');

      const status = getCooldownStatus('user-7');
      expect(status?.violationCount).toBe(1);
    });

    it('should emit cooldown.violated event', () => {
      startCooldown('user-8', 'Testing', 5 * 60 * 1000);

      recordViolation('user-8');

      const history = eventRouter.getHistory();
      const violationEvent = history.find((e: any) => e.type === 'cooldown.violated');

      expect(violationEvent).toBeDefined();
      expect(violationEvent?.data.userId).toBe('user-8');
      expect(violationEvent?.data.violationCount).toBe(1);
    });

    it('should extend cooldown after 3 violations', () => {
      startCooldown('user-9', 'Testing', 5 * 60 * 1000);
      const originalStatus = getCooldownStatus('user-9');
      const originalEndsAt = originalStatus?.endsAt;

      // Record 3 violations
      recordViolation('user-9');
      recordViolation('user-9');
      recordViolation('user-9');

      const updatedStatus = getCooldownStatus('user-9');

      expect(updatedStatus?.violationCount).toBe(3);
      expect(updatedStatus?.endsAt).toBeGreaterThan(originalEndsAt!);
      // Extension is 10 minutes
      expect(updatedStatus?.endsAt).toBe(originalEndsAt! + 10 * 60 * 1000);
    });
  });

  describe('getViolationHistory', () => {
    it('should return 0 for user with no violations', () => {
      const count = getViolationHistory('user-unknown');

      expect(count).toBe(0);
    });

    it('should track violations for user', () => {
      startCooldown('user-10', 'Testing', 5 * 60 * 1000);

      recordViolation('user-10');
      recordViolation('user-10');

      const count = getViolationHistory('user-10');

      expect(count).toBe(2);
    });
  });
});
