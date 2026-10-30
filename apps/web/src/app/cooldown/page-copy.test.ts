// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('Cooldown page copy', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(path.join(dir, 'page.tsx'), 'utf8');
  const layout = readFileSync(path.join(dir, 'layout.tsx'), 'utf8');

  it('keeps Cooldown copy short: lock, not a deposit, any Solana wallet', () => {
    expect(source).toContain('Sign a lock so 3am-you cannot put the stack back.');
    expect(source).toContain(
      'Not a deposit. No keys. Solana wallet. Devnet. Casinos do not have to honor it. You do. Stronger only.',
    );
    expect(source).toContain('SIGN WITH WALLET');
    expect(source).toContain('useWalletModal');
    expect(source).toContain('cooldown-panel');
    expect(source).not.toMatch(/self-exclusion/i);
    expect(source).not.toContain('Connect Wallet (Phantom)');
    expect(source).not.toContain('Phantom or Solflare');
    expect(source).not.toContain('window.solana');
    expect(source).not.toContain('Why a wallet');
    expect(layout).toContain(
      'Sign a lock so 3am-you cannot put the stack back. Not a deposit. Solana wallet. Devnet.',
    );
    expect(layout).not.toContain('Phantom or Solflare');
  });

  it('shows devnet guidance when wallet send errors have no message', () => {
    expect(source).toContain(
      'Switch your wallet to Solana devnet and try again. Cooldown only signs a lock on devnet — no SOL moves.',
    );
    expect(source).toContain('walletTxErrorMessage');
  });
});
