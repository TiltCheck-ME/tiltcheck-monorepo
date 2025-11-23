import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vaultManager } from '../src/vault-manager.js';
import { eventRouter } from '../../../services/event-router/src/event-router.js';

// Helper to count events of a type
function countEvents(type: string) {
  return eventRouter.getHistory({ eventType: type as any }).length;
}

describe('LockVault Module', () => {
  beforeEach(() => {
    // Reset singleton state & event history
    vaultManager.clearAll();
    eventRouter.clearHistory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z')); // deterministic base
  });

  it('locks a vault with valid inputs and emits vault.locked', () => {
    const rec = vaultManager.lock({ userId: 'u1', amountRaw: '5', durationRaw: '10m', reason: 'focus' });
    expect(rec.userId).toBe('u1');
    expect(rec.status).toBe('locked');
    expect(rec.unlockAt).toBeGreaterThan(Date.now());
    expect(countEvents('vault.locked')).toBe(1);
  });

  it('rejects lock below minimum duration', () => {
    expect(() => vaultManager.lock({ userId: 'u1', amountRaw: '2', durationRaw: '5m' })).toThrow(/Minimum lock/);
    expect(countEvents('vault.locked')).toBe(0);
  });

  it('prevents early unlock', () => {
    const rec = vaultManager.lock({ userId: 'u1', amountRaw: '1', durationRaw: '10m' });
    expect(() => vaultManager.unlock('u1', rec.id)).toThrow(/Cannot unlock yet/);
    expect(countEvents('vault.unlocked')).toBe(0);
  });

  it('allows unlock after duration passes and emits vault.unlocked', () => {
    const rec = vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m' });
    // Advance 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);
    const unlocked = vaultManager.unlock('u1', rec.id);
    expect(unlocked.status).toBe('unlocked');
    expect(countEvents('vault.unlocked')).toBe(1);
  });

  it('extends a vault and emits vault.extended', () => {
    const rec = vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m' });
    const originalUnlock = rec.unlockAt;
    const extended = vaultManager.extend('u1', rec.id, '10m');
    expect(extended.unlockAt).toBeGreaterThan(originalUnlock);
    expect(extended.extendedCount).toBe(1);
    expect(extended.status).toBe('extended');
    expect(countEvents('vault.extended')).toBe(1);
  });

  it('unlock after extension respects new unlockAt', () => {
    const rec = vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m' });
    vaultManager.extend('u1', rec.id, '10m'); // now 20m total
    // Advance 10m (should still be locked)
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(() => vaultManager.unlock('u1', rec.id)).toThrow(/Cannot unlock yet/);
    // Advance remaining 10m
    vi.advanceTimersByTime(10 * 60 * 1000);
    const unlocked = vaultManager.unlock('u1', rec.id);
    expect(unlocked.status).toBe('unlocked');
    expect(countEvents('vault.unlocked')).toBe(1);
  });
});
