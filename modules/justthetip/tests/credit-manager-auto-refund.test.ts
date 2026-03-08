import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditManager, MIN_DEPOSIT_LAMPORTS } from '../src/credit-manager.js';

describe('CreditManager auto-refund deposit window', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    process.env.JUSTTHETIP_DEPOSIT_AUTO_REFUND_MINUTES = '30';
  });

  it('sets hard-expiry refund settings on deposit', async () => {
    const db = {
      isConnected: () => true,
      creditBalance: vi.fn().mockResolvedValue({ newBalance: MIN_DEPOSIT_LAMPORTS, txId: 'tx-1' }),
      updateRefundSettings: vi.fn().mockResolvedValue(true),
    } as any;

    const manager = new CreditManager(db);
    await manager.deposit('user-1', MIN_DEPOSIT_LAMPORTS, { memo: 'deposit-test' });

    expect(db.creditBalance).toHaveBeenCalled();
    expect(db.updateRefundSettings).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        refundMode: 'hard-expiry',
        hardExpiryAt: expect.any(String),
      })
    );
  });

  it('includes hard-expiry balances when determining stale refunds', async () => {
    const nowIso = new Date().toISOString();
    const oldIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const expiredIso = new Date(Date.now() - 60_000).toISOString();
    const futureIso = new Date(Date.now() + 60_000).toISOString();

    const db = {
      isConnected: () => true,
      getStaleBalances: vi.fn().mockResolvedValue([
        {
          discord_id: 'hard-expired',
          balance_lamports: 1000,
          wallet_address: 'Wallet111',
          last_activity_at: nowIso,
          refund_mode: 'hard-expiry',
          hard_expiry_at: expiredIso,
          inactivity_days: 7,
        },
        {
          discord_id: 'hard-future',
          balance_lamports: 1000,
          wallet_address: 'Wallet222',
          last_activity_at: nowIso,
          refund_mode: 'hard-expiry',
          hard_expiry_at: futureIso,
          inactivity_days: 7,
        },
        {
          discord_id: 'inactive-old',
          balance_lamports: 1000,
          wallet_address: 'Wallet333',
          last_activity_at: oldIso,
          refund_mode: 'reset-on-activity',
          hard_expiry_at: null,
          inactivity_days: 7,
        },
      ]),
    } as any;

    const manager = new CreditManager(db);
    const stale = await manager.getStaleBalancesForRefund();
    const ids = stale.map((b: any) => b.discord_id);

    expect(ids).toContain('hard-expired');
    expect(ids).toContain('inactive-old');
    expect(ids).not.toContain('hard-future');
  });
});
