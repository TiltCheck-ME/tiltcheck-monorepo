/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-07 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vaultManager } from '../src/vault-manager.js';
import { eventRouter } from '@tiltcheck/event-router';

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

  it('locks a vault with valid inputs and emits vault.locked', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '5', durationRaw: '10m', reason: 'focus', disclaimerAccepted: true });
    expect(rec.userId).toBe('u1');
    expect(rec.status).toBe('locked');
    expect(rec.unlockAt).toBeGreaterThan(Date.now());
    expect(countEvents('vault.locked')).toBe(1);
  });

  it('rejects lock below minimum duration', async () => {
    await expect(vaultManager.lock({ userId: 'u1', amountRaw: '2', durationRaw: '5m', disclaimerAccepted: true })).rejects.toThrow(/Minimum lock/);
    expect(countEvents('vault.locked')).toBe(0);
  });

  it('prevents early unlock', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '1', durationRaw: '10m', disclaimerAccepted: true });
    expect(() => vaultManager.unlock('u1', rec.id)).toThrow(/Cannot unlock yet/);
    expect(countEvents('vault.unlocked')).toBe(0);
  });

  it('allows unlock after duration passes and emits vault.unlocked', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    // Advance 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);
    const unlocked = vaultManager.unlock('u1', rec.id);
    expect(unlocked.status).toBe('unlocked');
    expect(countEvents('vault.unlocked')).toBe(1);
  });

  it('extends a vault and emits vault.extended', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    const originalUnlock = rec.unlockAt;
    const extended = vaultManager.extend('u1', rec.id, '10m');
    expect(extended.unlockAt).toBeGreaterThan(originalUnlock);
    expect(extended.extendedCount).toBe(1);
    expect(extended.status).toBe('extended');
    expect(countEvents('vault.extended')).toBe(1);
  });

  it('unlock after extension respects new unlockAt', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
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

  it('adds second owner and stores it on latest vault', async () => {
    await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    const updated = vaultManager.addSecondOwner('u1', 'u2');
    expect(updated.secondOwnerId).toBe('u2');
  });

  it('runs initiate -> approve -> execute withdrawal lifecycle for unlocked dual-owner vault', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.addSecondOwner('u1', 'u2');
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);

    const initiated = vaultManager.initiateWithdrawal('u1', 1.25);
    expect(initiated.withdrawalProposal?.status).toBe('pending');
    expect(initiated.withdrawalProposal?.amountSOL).toBe(1.25);

    const approved = vaultManager.approveWithdrawal('u1', 'u2');
    expect(approved.withdrawalProposal?.status).toBe('approved');

    const executed = vaultManager.executeWithdrawal('u1');
    expect(executed.withdrawalProposal).toBeUndefined();
    expect(executed.lockedAmountSOL).toBeCloseTo(1.75, 6);
  });

  it('rejects approval from non-second-owner account', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.addSecondOwner('u1', 'u2');
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1);
    expect(() => vaultManager.approveWithdrawal('u1', 'u1')).toThrow(/Only the second owner/);
  });

  it('rejects withdrawal initiation when second owner is missing', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    expect(() => vaultManager.initiateWithdrawal('u1', 1)).toThrow(/No dual-owner vault/);
  });

  it('rejects execution before approval', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.addSecondOwner('u1', 'u2');
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1);
    expect(() => vaultManager.executeWithdrawal('u1')).toThrow(/approved/);
  });
});
