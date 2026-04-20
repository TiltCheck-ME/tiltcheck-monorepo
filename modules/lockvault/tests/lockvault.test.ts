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

import { getWithdrawalApprovalsForUser, vaultManager } from '../src/vault-manager.js';
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

  it('supports staged unlock tranches and leaves the locked remainder in place', async () => {
    const rec = await vaultManager.lock({
      userId: 'u1',
      amountRaw: '5',
      durationRaw: '24h',
      disclaimerAccepted: true,
      unlockSchedule: [
        { amountRaw: '1', offsetMinutes: 60, label: 'first cut' },
        { amountRaw: '2', offsetMinutes: 720, label: 'mid cut' },
      ],
    });

    expect(rec.unlockSchedule).toHaveLength(3);
    expect(rec.unlockSchedule?.[2]?.amountSOL).toBeCloseTo(2, 6);

    vi.advanceTimersByTime(60 * 60 * 1000);
    const released = vaultManager.unlock('u1', rec.id);
    expect(released.status).toBe('partially-unlocked');
    expect(released.releasedAmountSOL).toBeCloseTo(1, 6);
    expect(released.lockedAmountSOL).toBeCloseTo(5, 6);
    expect(released.unlockSchedule?.filter((tranche) => tranche.status === 'released')).toHaveLength(1);
    expect(released.history.some((entry) => entry.action === 'tranche-released')).toBe(true);
  });

  it('configures multiple guardians and stores the threshold on the latest vault', async () => {
    await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    const updated = vaultManager.setGuardians('u1', ['u2', 'u3', 'u4'], 2);
    expect(updated.guardianIds).toEqual(['u2', 'u3', 'u4']);
    expect(updated.approvalThreshold).toBe(2);
    expect(updated.secondOwnerId).toBe('u2');
  });

  it('keeps the legacy second-owner helper mapped to a single guardian threshold', async () => {
    await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    const updated = vaultManager.addSecondOwner('u1', 'u2');
    expect(updated.guardianIds).toEqual(['u2']);
    expect(updated.approvalThreshold).toBe(1);
    expect(updated.secondOwnerId).toBe('u2');
  });

  it('runs initiate -> multi-guardian approve -> execute withdrawal lifecycle for unlocked guarded vault', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.setGuardians('u1', ['u2', 'u3', 'u4'], 2);
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);

    const initiated = vaultManager.initiateWithdrawal('u1', 1.25);
    expect(initiated.withdrawalProposal?.status).toBe('pending');
    expect(initiated.withdrawalProposal?.amountSOL).toBe(1.25);
    expect(initiated.withdrawalProposal?.approvalThreshold).toBe(2);
    expect(initiated.withdrawalProposal?.approvals).toEqual([]);

    const partiallyApproved = vaultManager.approveWithdrawal('u1', 'u2');
    expect(partiallyApproved.withdrawalProposal?.status).toBe('pending');
    expect(partiallyApproved.withdrawalProposal?.approvals).toHaveLength(1);

    const approved = vaultManager.approveWithdrawal('u1', 'u3');
    expect(approved.withdrawalProposal?.status).toBe('approved');
    expect(approved.withdrawalProposal?.approvals).toHaveLength(2);

    const executed = vaultManager.executeWithdrawal('u1');
    expect(executed.withdrawalProposal?.status).toBe('executed');
    expect(executed.withdrawalProposal?.executionRequestId).toBeTruthy();
    expect(executed.withdrawalProposal?.executedBy).toBe('u1');
    expect(executed.lockedAmountSOL).toBeCloseTo(1.75, 6);
    expect(executed.releasedAmountSOL).toBeCloseTo(1.75, 6);
    expect(countEvents('vault.withdrawal_execution_requested')).toBe(1);
  });

  it('only allows staged withdrawals against the released balance', async () => {
    const rec = await vaultManager.lock({
      userId: 'u1',
      amountRaw: '4',
      durationRaw: '24h',
      disclaimerAccepted: true,
      unlockSchedule: [
        { amountRaw: '1', offsetMinutes: 60 },
      ],
    });
    vaultManager.setGuardians('u1', ['u2', 'u3'], 2);
    vi.advanceTimersByTime(60 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);

    expect(() => vaultManager.initiateWithdrawal('u1', 1.5)).toThrow(/released balance/i);

    const initiated = vaultManager.initiateWithdrawal('u1', 1);
    expect(initiated.withdrawalProposal?.status).toBe('pending');
    vaultManager.approveWithdrawal('u1', 'u2');
    vaultManager.approveWithdrawal('u1', 'u3');
    const executed = vaultManager.executeWithdrawal('u1');
    expect(executed.lockedAmountSOL).toBeCloseTo(3, 6);
    expect(executed.releasedAmountSOL).toBeCloseTo(0, 6);
    expect(executed.withdrawnAmountSOL).toBeCloseTo(1, 6);
    expect(executed.status).toBe('locked');
  });

  it('lists pending approvals only for guardians who still need to approve', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.setGuardians('u1', ['u2', 'u3', 'u4'], 2);
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1.25);

    const approvalsBefore = getWithdrawalApprovalsForUser('u2');
    expect(approvalsBefore).toHaveLength(1);
    expect(approvalsBefore[0]?.userId).toBe('u1');
    expect(approvalsBefore[0]?.withdrawalProposal?.status).toBe('pending');

    vaultManager.approveWithdrawal('u1', 'u2');
    expect(getWithdrawalApprovalsForUser('u2')).toHaveLength(0);
    expect(getWithdrawalApprovalsForUser('u3')).toHaveLength(1);
  });

  it('rejects approval from non-guardian account and duplicate guardian approvals', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.setGuardians('u1', ['u2', 'u3'], 2);
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1);
    expect(() => vaultManager.approveWithdrawal('u1', 'u1')).toThrow(/Only configured guardians/);
    vaultManager.approveWithdrawal('u1', 'u2');
    expect(() => vaultManager.approveWithdrawal('u1', 'u2')).toThrow(/already approved/i);
  });

  it('rejects withdrawal initiation when guardians are missing', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    expect(() => vaultManager.initiateWithdrawal('u1', 1)).toThrow(/No guardian-protected vault/);
  });

  it('rejects execution before the threshold is met', async () => {
    const rec = await vaultManager.lock({ userId: 'u1', amountRaw: '3', durationRaw: '10m', disclaimerAccepted: true });
    vaultManager.setGuardians('u1', ['u2', 'u3'], 2);
    vi.advanceTimersByTime(10 * 60 * 1000);
    vaultManager.unlock('u1', rec.id);
    vaultManager.initiateWithdrawal('u1', 1);
    vaultManager.approveWithdrawal('u1', 'u2');
    expect(() => vaultManager.executeWithdrawal('u1')).toThrow(/approved/);
  });

  it('hydrates legacy second-owner records into guardian approvals safely', async () => {
    const hydrated = (vaultManager as any).hydrateVaultRecord({
      id: 'legacy-v1',
      userId: 'u1',
      vaultAddress: 'linked-wallet-u1',
      vaultType: 'linked',
      createdAt: Date.now() - 60_000,
      unlockAt: Date.now() - 30_000,
      lockedAmountSOL: 1.5,
      releasedAmountSOL: 1.5,
      withdrawnAmountSOL: 0,
      originalLockedAmountSOL: 1.5,
      originalInput: '1.5',
      status: 'unlocked',
      history: [],
      extendedCount: 0,
      secondOwnerId: 'u2',
      withdrawalProposal: {
        amountSOL: 0.75,
        initiatedBy: 'u1',
        initiatedAt: Date.now() - 20_000,
        approvedBy: 'u2',
        approvedAt: Date.now() - 10_000,
        status: 'approved',
      },
    });

    expect(hydrated.guardianIds).toEqual(['u2']);
    expect(hydrated.approvalThreshold).toBe(1);
    expect(hydrated.secondOwnerId).toBe('u2');
    expect(hydrated.withdrawalProposal?.guardianIds).toEqual(['u2']);
    expect(hydrated.withdrawalProposal?.approvalThreshold).toBe(1);
    expect(hydrated.withdrawalProposal?.approvals).toEqual([
      expect.objectContaining({ guardianId: 'u2' }),
    ]);
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
