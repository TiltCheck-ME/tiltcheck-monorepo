// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('TiltcheckWalletModalProvider source', () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'tiltcheck-wallet-modal.tsx'),
    'utf8',
  );

  it('filters Exodus, keeps Wallet Standard modal chrome, and does not nag Phantom', () => {
    expect(source).toContain('TiltcheckWalletModalProvider');
    expect(source).toContain('WalletModalContext');
    expect(source).toContain('withoutExodusWalletEntries');
    expect(source).toContain('isExodusWalletName');
    expect(source).toContain('WalletReadyState.Installed');
    expect(source).toContain('wallet-adapter-modal');
    expect(source).toContain('Install a Solana wallet');
    expect(source).toContain('disconnect');
    expect(source).not.toContain('PhantomWalletAdapter');
    expect(source).not.toContain('SolflareWalletAdapter');
    expect(source).not.toMatch(/install Phantom/i);
    expect(source).not.toContain('window.solana');
  });
});
