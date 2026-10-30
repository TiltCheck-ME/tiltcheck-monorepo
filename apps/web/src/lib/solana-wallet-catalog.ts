// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import type { Adapter } from '@solana/wallet-adapter-base';

export const NO_EXTRA_WALLET_ADAPTERS: Adapter[] = [];

export function isExodusWalletName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === 'exodus' || normalized.startsWith('exodus');
}

export function withoutExodusWallets<T extends { name: string }>(adapters: T[]): T[] {
  return adapters.filter((adapter) => !isExodusWalletName(adapter.name));
}

export function withoutExodusWalletEntries<T extends { adapter: { name: string } }>(
  wallets: T[],
): T[] {
  return wallets.filter((wallet) => !isExodusWalletName(wallet.adapter.name));
}
