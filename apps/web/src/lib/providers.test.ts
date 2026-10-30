// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('RootProvider wallet catalog', () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'providers.tsx'),
    'utf8',
  );

  it('does not hardcode Phantom and Solflare as the product catalog', () => {
    expect(source).toContain('NO_EXTRA_WALLET_ADAPTERS');
    expect(source).toContain('wallets={NO_EXTRA_WALLET_ADAPTERS}');
    expect(source).toContain('TiltcheckWalletModalProvider');
    expect(source).toContain('autoConnect');
    expect(source).not.toContain('PhantomWalletAdapter');
    expect(source).not.toContain('SolflareWalletAdapter');
    expect(source).not.toContain('@solana/wallet-adapter-wallets');
    expect(source).not.toMatch(/\{\s*WalletModalProvider\s*\}/);
    expect(source).not.toContain('<WalletModalProvider');
  });
});
