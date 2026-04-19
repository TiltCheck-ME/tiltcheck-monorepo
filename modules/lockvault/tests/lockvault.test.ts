/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const databaseMock = vi.hoisted(() => ({
  isConnected: vi.fn(),
  getDegenIdentity: vi.fn(),
  updateNftSavings: vi.fn(),
}));

vi.mock('@tiltcheck/database', () => ({
  db: databaseMock,
}));

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
    databaseMock.isConnected.mockReturnValue(true);
    databaseMock.getDegenIdentity.mockResolvedValue({
      discord_id: 'u1',
      magic_address: null,
      primary_external_address: 'linked-wallet-u1',
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z')); // deterministic base
  });

  it('locks a vault with valid inputs and emits vault.locked', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '5', durationRaw: '10m', reason: 'focus', disclaimerAccepted: true });
    expect(rec.userId).toBe('u1');
    expect(rec.status).toBe('locked');
    expect(rec.vaultType).toBe('linked');
    expect(rec.vaultAddress).toBe('linked-wallet-u1');
    expect(rec.vaultSecret).toBeUndefined();
    expect(rec.unlockAt).toBeGreaterThan(Date.now());
    expect(countEvents('vault.locked')).toBe(1);
  });

  it('rejects new locks when no linked wallet or Degen Identity exists', async () => {
    databaseMock.getDegenIdentity.mockResolvedValueOnce(null);
    await expect(
      vaultManager.lock({ userId: 'u1', amountRaw: '5', durationRaw: '10m', disclaimerAccepted: true })
    ).rejects.toMatchObject({
      code: 'LOCKVAULT_IDENTITY_REQUIRED',
      httpStatus: 409,
    });
    expect(vaultManager.status('u1')).toEqual([]);
    expect(countEvents('vault.locked')).toBe(0);
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
    expect(executed.withdrawalProposal?.status).toBe('execution-pending');
    expect(executed.withdrawalProposal?.executionRequestId).toBeTruthy();
    expect(executed.lockedAmountSOL).toBeCloseTo(3, 6);
    expect(countEvents('vault.withdrawal_execution_requested')).toBe(1);
  });

  it('keeps withdrawal execution idempotent while execution is still pending', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.addSecondOwner('u1', 'u2');
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1.25);
    vaultManager.approveWithdrawal('u1', 'u2');

    const firstRequest = vaultManager.executeWithdrawal('u1');
    const secondRequest = vaultManager.executeWithdrawal('u1');

    expect(firstRequest.withdrawalProposal?.status).toBe('execution-pending');
    expect(secondRequest.withdrawalProposal?.executionRequestId).toBe(firstRequest.withdrawalProposal?.executionRequestId);
    expect(countEvents('vault.withdrawal_execution_requested')).toBe(1);
  });

  it('recovers stale execution-pending withdrawals back to approved without claiming success', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.addSecondOwner('u1', 'u2');
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1.25);
    vaultManager.approveWithdrawal('u1', 'u2');

    const requested = vaultManager.executeWithdrawal('u1');
    const firstRequestId = requested.withdrawalProposal?.executionRequestId;
    expect(requested.withdrawalProposal?.executionTimeoutAt).toBeGreaterThan(Date.now());

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    const recovered = vaultManager.executeWithdrawal('u1');
    expect(recovered.withdrawalProposal?.status).toBe('approved');
    expect(recovered.withdrawalProposal?.executionRequestId).toBeUndefined();
    expect(recovered.withdrawalProposal?.executionRequestedAt).toBeUndefined();
    expect(recovered.withdrawalProposal?.lastRecoveryReason).toBe('execution-timeout');
    expect(recovered.history.some((entry) => (
      entry.action === 'withdrawal-execution-timeout-recovered'
      && entry.note?.includes(firstRequestId || '')
    ))).toBe(true);
    expect(recovered.lockedAmountSOL).toBeCloseTo(3, 6);
    expect(countEvents('vault.withdrawal_execution_requested')).toBe(1);
  });

  it('allows manual retry after stale execution recovery', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.addSecondOwner('u1', 'u2');
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1.25);
    vaultManager.approveWithdrawal('u1', 'u2');

    const firstRequest = vaultManager.executeWithdrawal('u1');
    const firstRequestId = firstRequest.withdrawalProposal?.executionRequestId;
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    const recovered = vaultManager.status('u1')[0];
    expect(recovered.withdrawalProposal?.status).toBe('approved');

    const retried = vaultManager.executeWithdrawal('u1');
    expect(retried.withdrawalProposal?.status).toBe('execution-pending');
    expect(retried.withdrawalProposal?.executionRequestId).toBeTruthy();
    expect(retried.withdrawalProposal?.executionRequestId).not.toBe(firstRequestId);
    expect(retried.withdrawalProposal?.executionAttempts).toBe(2);
    expect(countEvents('vault.withdrawal_execution_requested')).toBe(2);
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

  it('gates paid early unlock until fee routing exists', async () => {
    vaultManager.setWalletActionLock('u1', 30 * 60 * 1000, 'manual');
    expect(() => vaultManager.requestPaidWalletUnlock('u1', 'u1')).toThrow(/temporarily disabled/i);
    expect(() => vaultManager.settlePaidWalletUnlock('u1', 'u1')).toThrow(/temporarily disabled/i);
  });

  it('rejects new auto-withdraw locks until a real execution consumer exists', async () => {
    await expect(
      vaultManager.lock({
        userId: 'u1',
        amountRaw: '1',
        durationRaw: '10m',
        disclaimerAccepted: true,
        autoWithdraw: true,
      })
    ).rejects.toThrow(/auto-withdraw is temporarily disabled/i);
  });

  it('disables legacy auto-withdraw on expiry instead of publishing a fake execution request', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '1', durationRaw: '10m', disclaimerAccepted: true });
    rec.autoWithdraw = true;
    vi.advanceTimersByTime(10 * 60 * 1000);

    (vaultManager as any).processExpiredVaults();

    const updated = vaultManager.get(rec.id);
    expect(updated?.status).toBe('unlocked');
    expect(updated?.autoWithdraw).toBe(false);
    expect(updated?.history.some((entry) => entry.action === 'auto-withdraw-disabled')).toBe(true);
    expect(countEvents('vault.auto_withdraw_requested')).toBe(0);
  });
});
