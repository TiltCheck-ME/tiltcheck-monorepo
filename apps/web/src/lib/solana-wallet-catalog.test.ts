// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { describe, expect, it } from 'vitest';
import {
  isExodusWalletName,
  NO_EXTRA_WALLET_ADAPTERS,
  withoutExodusWalletEntries,
  withoutExodusWallets,
} from './solana-wallet-catalog';

describe('isExodusWalletName', () => {
  it('matches Exodus regardless of case and leading/trailing space', () => {
    expect(isExodusWalletName('Exodus')).toBe(true);
    expect(isExodusWalletName('exodus')).toBe(true);
    expect(isExodusWalletName(' EXODUS ')).toBe(true);
  });

  it('matches names that start with Exodus', () => {
    expect(isExodusWalletName('Exodus Mobile')).toBe(true);
    expect(isExodusWalletName('exodus wallet')).toBe(true);
  });

  it('does not match other wallets', () => {
    expect(isExodusWalletName('Phantom')).toBe(false);
    expect(isExodusWalletName('Solflare')).toBe(false);
    expect(isExodusWalletName('Backpack')).toBe(false);
    expect(isExodusWalletName('Trust')).toBe(false);
  });
});

describe('withoutExodusWallets', () => {
  it('drops Exodus adapters and keeps others', () => {
    const kept = withoutExodusWallets([
      { name: 'Phantom' },
      { name: 'Exodus' },
      { name: 'Backpack' },
      { name: 'Exodus Mobile' },
    ]);
    expect(kept.map((w) => w.name)).toEqual(['Phantom', 'Backpack']);
  });
});

describe('withoutExodusWalletEntries', () => {
  it('drops useWallet entries whose adapter name is Exodus', () => {
    const kept = withoutExodusWalletEntries([
      { adapter: { name: 'Backpack' }, readyState: 'Installed' },
      { adapter: { name: 'Exodus' }, readyState: 'Installed' },
    ]);
    expect(kept.map((w) => w.adapter.name)).toEqual(['Backpack']);
  });
});

describe('NO_EXTRA_WALLET_ADAPTERS', () => {
  it('is an empty extra-adapter catalog', () => {
    expect(NO_EXTRA_WALLET_ADAPTERS).toEqual([]);
  });
});
