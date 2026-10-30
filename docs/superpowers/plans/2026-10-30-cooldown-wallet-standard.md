<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30 -->

# Cooldown Wallet Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cooldown's connect modal lists installed Solana Wallet Standard signers (not a hardcoded Phantom/Solflare pair), copy says Solana wallet, and Exodus never appears.

**Architecture:** `@solana/wallet-adapter-react` `WalletProvider` already calls `useStandardWalletAdapters` on the `wallets` prop. Passing `[]` means the modal catalog is detected Standard wallets, not extra legacy adapters. `WalletProvider` re-discovers Standard wallets internally, so Exodus cannot be dropped via the `wallets` prop. Filter Exodus in a TiltCheck modal that still uses `WalletModalContext` (Cooldown keeps `useWalletModal`). A disconnect guard drops Exodus if autoConnect restores it. Cooldown sign path stays `useWallet` / `sendTransaction`.

**Tech Stack:** Next.js App Router (`apps/web`), `@solana/wallet-adapter-react` 0.15.x, `@solana/wallet-adapter-react-ui`, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-30-cooldown-wallet-standard-design.md` (Approved)
- Copyright on every touched file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30`
- No emojis. No `self-exclusion`. No `window.solana` connect. No JustTheTip send/receive/linkwallet wire.
- Do not name Phantom or Solflare as the only Cooldown wallets in UI copy or meta.
- Button label stays exactly `SIGN WITH WALLET`
- Punch stays exactly `Sign a lock so 3am-you cannot put the stack back.`
- Fine print stays exactly `Not a deposit. No keys. Solana wallet. Devnet. Casinos do not have to honor it. You do. Stronger only.`
- AutoConnect stays on. Cooldown stays non-custodial and does not move SOL.
- Leave `ConnectionProvider` endpoint alone. Do not switch Cooldown to mainnet.
- Do not redesign the lock form (scope, duration, Sign and Lock, Extend).
- Do not move glitter. Do not change homepage wallet copy.
- Do not add WalletConnect mobile as a required path.
- Do not push to `main`. Zip stays gated.
- Keep `.wallet-adapter-modal` class on the custom modal so `globals.css` z-index 2000 still applies.

## File map

| File | Responsibility |
| :--- | :--- |
| `apps/web/src/lib/solana-wallet-catalog.ts` | Exodus name check + list filters + empty extra-adapter constant |
| `apps/web/src/lib/solana-wallet-catalog.test.ts` | Unit tests for Exodus filter |
| `apps/web/src/lib/tiltcheck-wallet-modal.tsx` | Modal provider: installed Standard wallets minus Exodus; empty install copy; Exodus disconnect guard |
| `apps/web/src/lib/providers.tsx` | `wallets={NO_EXTRA_WALLET_ADAPTERS}`; swap stock modal for TiltCheck modal |
| `apps/web/src/lib/providers.test.ts` | Source contract: no Phantom/Solflare adapters, empty extra catalog, TiltCheck modal |
| `apps/web/src/app/cooldown/page.tsx` | Fine print: Solana wallet, not Phantom or Solflare |
| `apps/web/src/app/cooldown/layout.tsx` | Meta description matches brand-free line |
| `apps/web/src/app/cooldown/page-copy.test.ts` | Copy contract |
| `CHANGELOG.md` | Unreleased bullet |

---

### Task 1: Exodus catalog helpers

**Files:**
- Create: `apps/web/src/lib/solana-wallet-catalog.ts`
- Create: `apps/web/src/lib/solana-wallet-catalog.test.ts`

**Interfaces:**
- Consumes: `Adapter` type from `@solana/wallet-adapter-base`; `Wallet` shape `{ adapter: { name: string } }` from `useWallet`
- Produces: `isExodusWalletName(name: string): boolean`; `withoutExodusWallets<T extends { name: string }>(adapters: T[]): T[]`; `withoutExodusWalletEntries<T extends { adapter: { name: string } }>(wallets: T[]): T[]`; `NO_EXTRA_WALLET_ADAPTERS: Adapter[]` (empty array)

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/solana-wallet-catalog.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/solana-wallet-catalog.test.ts`

Expected: FAIL with cannot find module `./solana-wallet-catalog` (or `isExodusWalletName` is not exported)

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/lib/solana-wallet-catalog.ts`:

```ts
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
```

Note: `normalized.startsWith('exodus')` already covers `normalized === 'exodus'`. Keep both clauses anyway so the spec wording is obvious in code.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/solana-wallet-catalog.test.ts`

Expected: PASS (4 describes / 6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/solana-wallet-catalog.ts apps/web/src/lib/solana-wallet-catalog.test.ts
git commit -m "feat(web): filter Exodus out of the Cooldown wallet catalog"
```

---

### Task 2: TiltCheck wallet modal (Standard list, no Exodus)

**Files:**
- Create: `apps/web/src/lib/tiltcheck-wallet-modal.tsx`
- Create: `apps/web/src/lib/tiltcheck-wallet-modal.test.ts`

**Interfaces:**
- Consumes: `withoutExodusWalletEntries`, `isExodusWalletName` from `./solana-wallet-catalog`; `useWallet` from `@solana/wallet-adapter-react`; `WalletModalContext` from `@solana/wallet-adapter-react-ui`; `WalletReadyState` from `@solana/wallet-adapter-base`
- Produces: `TiltcheckWalletModalProvider({ children }: { children: React.ReactNode })` which provides the same `WalletModalContext` Cooldown already reads via `useWalletModal`. Must render a node with class `wallet-adapter-modal` when visible. Empty installed-signer list copy must include `Install a Solana wallet` and must not include `Phantom` or `Solflare`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/tiltcheck-wallet-modal.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/tiltcheck-wallet-modal.test.ts`

Expected: FAIL with ENOENT `tiltcheck-wallet-modal.tsx`

- [ ] **Step 3: Write the modal**

Create `apps/web/src/lib/tiltcheck-wallet-modal.tsx`:

```tsx
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
'use client';

import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalContext, useWalletModal } from '@solana/wallet-adapter-react-ui';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { isExodusWalletName, withoutExodusWalletEntries } from './solana-wallet-catalog';

export function TiltcheckWalletModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <WalletModalContext.Provider value={{ visible, setVisible }}>
      <ExodusDisconnectGuard />
      {children}
      {visible ? <TiltcheckWalletModal /> : null}
    </WalletModalContext.Provider>
  );
}

function ExodusDisconnectGuard() {
  const { wallet, disconnect } = useWallet();

  React.useEffect(() => {
    if (wallet && isExodusWalletName(wallet.adapter.name)) {
      void disconnect();
    }
  }, [wallet, disconnect]);

  return null;
}

function TiltcheckWalletModal() {
  const { wallets, select } = useWallet();
  const { setVisible } = useWalletModal();
  const [fadeIn, setFadeIn] = React.useState(false);
  const [portal, setPortal] = React.useState<Element | null>(null);

  const listed = React.useMemo(
    () =>
      withoutExodusWalletEntries(wallets).filter(
        (wallet) => wallet.readyState === WalletReadyState.Installed,
      ),
    [wallets],
  );

  const hideModal = React.useCallback(() => {
    setFadeIn(false);
    window.setTimeout(() => setVisible(false), 150);
  }, [setVisible]);

  const handleWalletClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, walletName: WalletName) => {
      event.preventDefault();
      select(walletName);
      hideModal();
    },
    [select, hideModal],
  );

  React.useLayoutEffect(() => {
    setPortal(document.querySelector('body'));
    const timeout = window.setTimeout(() => setFadeIn(true), 0);
    const { overflow } = window.getComputedStyle(document.body);
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hideModal]);

  if (!portal) return null;

  return createPortal(
    <div
      aria-labelledby="wallet-adapter-modal-title"
      aria-modal="true"
      className={`wallet-adapter-modal ${fadeIn ? 'wallet-adapter-modal-fade-in' : ''}`}
      role="dialog"
    >
      <div className="wallet-adapter-modal-container">
        <div className="wallet-adapter-modal-wrapper">
          <button
            type="button"
            onClick={hideModal}
            className="wallet-adapter-modal-button-close"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z"
              />
            </svg>
          </button>
          {listed.length ? (
            <>
              <h1 className="wallet-adapter-modal-title" id="wallet-adapter-modal-title">
                Connect a wallet on Solana to continue
              </h1>
              <ul className="wallet-adapter-modal-list">
                {listed.map((wallet) => (
                  <li key={wallet.adapter.name}>
                    <button
                      type="button"
                      className="wallet-adapter-button"
                      onClick={(event) => handleWalletClick(event, wallet.adapter.name)}
                    >
                      <i className="wallet-adapter-button-start-icon">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={wallet.adapter.icon} alt="" width={28} height={28} />
                      </i>
                      {wallet.adapter.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h1 className="wallet-adapter-modal-title" id="wallet-adapter-modal-title">
                Install a Solana wallet
              </h1>
              <p className="wallet-adapter-modal-middle">
                Any Wallet Standard signer works. Not a deposit. Not Exodus.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="wallet-adapter-modal-overlay" onMouseDown={hideModal} />
    </div>,
    portal,
  );
}
```

If eslint complains about the `no-img-element` comment, keep the img anyway — wallet adapter icons are data URIs from the extension, not Next Image assets.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/tiltcheck-wallet-modal.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/tiltcheck-wallet-modal.tsx apps/web/src/lib/tiltcheck-wallet-modal.test.ts
git commit -m "feat(web): list installed Solana wallets in Cooldown, skip Exodus"
```

---

### Task 3: RootProvider uses Standard detection, not Phantom/Solflare extras

**Files:**
- Modify: `apps/web/src/lib/providers.tsx`
- Create: `apps/web/src/lib/providers.test.ts`

**Interfaces:**
- Consumes: `NO_EXTRA_WALLET_ADAPTERS` from `./solana-wallet-catalog`; `TiltcheckWalletModalProvider` from `./tiltcheck-wallet-modal`
- Produces: `RootProvider` still wraps `ConnectionProvider` + `WalletProvider autoConnect` + query client. `wallets` is `NO_EXTRA_WALLET_ADAPTERS`. Stock `WalletModalProvider` is gone. No `PhantomWalletAdapter` / `SolflareWalletAdapter` imports.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/providers.test.ts`:

```ts
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
    expect(source).not.toContain('WalletModalProvider');
  });
});
```

The last assertion (`WalletModalProvider`) is the stock import/component name. `TiltcheckWalletModalProvider` does not contain that exact identifier.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/providers.test.ts`

Expected: FAIL — file still imports `PhantomWalletAdapter` and `WalletModalProvider`

- [ ] **Step 3: Replace the catalog and modal in RootProvider**

Replace `apps/web/src/lib/providers.tsx` with:

```tsx
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
"use client";

import * as React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NO_EXTRA_WALLET_ADAPTERS } from './solana-wallet-catalog';
import { TiltcheckWalletModalProvider } from './tiltcheck-wallet-modal';

import '@solana/wallet-adapter-react-ui/styles.css';

export function RootProvider({ children }: { children: React.ReactNode }) {
  const endpoint = React.useMemo(() => clusterApiUrl('mainnet-beta'), []);
  const queryClient = new QueryClient();

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={NO_EXTRA_WALLET_ADAPTERS} autoConnect>
        <TiltcheckWalletModalProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </TiltcheckWalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

Do not add a `useMemo` that rebuilds Phantom/Solflare. `WalletProvider` still merges installed Wallet Standard adapters on its own.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/web/src/lib/providers.test.ts apps/web/src/lib/solana-wallet-catalog.test.ts apps/web/src/lib/tiltcheck-wallet-modal.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/providers.tsx apps/web/src/lib/providers.test.ts
git commit -m "feat(web): detect installed Solana wallets instead of shipping Phantom and Solflare"
```

---

### Task 4: Cooldown copy drops Phantom/Solflare

**Files:**
- Modify: `apps/web/src/app/cooldown/page-copy.test.ts`
- Modify: `apps/web/src/app/cooldown/page.tsx` (fine print paragraph only)
- Modify: `apps/web/src/app/cooldown/layout.tsx` (metadata description only)

**Interfaces:**
- Consumes: none from earlier tasks
- Produces: page punch + fine print as locked in Global Constraints; layout description uses `Solana wallet` not `Phantom or Solflare`; `SIGN WITH WALLET` and `useWalletModal` unchanged

- [ ] **Step 1: Write the failing test**

Replace `apps/web/src/app/cooldown/page-copy.test.ts` with:

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/app/cooldown/page-copy.test.ts`

Expected: FAIL on `Phantom or Solflare` still present / `Solana wallet` missing

- [ ] **Step 3: Update page and layout copy only**

In `apps/web/src/app/cooldown/page.tsx`, change the fine-print paragraph from:

```
Not a deposit. No keys. Phantom or Solflare. Devnet. Casinos do not have to honor it. You do. Stronger only.
```

to:

```
Not a deposit. No keys. Solana wallet. Devnet. Casinos do not have to honor it. You do. Stronger only.
```

Do not change the punch line, the `SIGN WITH WALLET` button, `connectWallet`, `useWallet`, `useWalletModal`, or `sendTransaction`.

In `apps/web/src/app/cooldown/layout.tsx`, set:

```ts
description:
  'Sign a lock so 3am-you cannot put the stack back. Not a deposit. Solana wallet. Devnet.',
```

Leave the JsonLd description as-is (`Not a deposit. No custody.`) unless it still says Phantom — it should not.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/app/cooldown/page-copy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/cooldown/page.tsx apps/web/src/app/cooldown/layout.tsx apps/web/src/app/cooldown/page-copy.test.ts
git commit -m "fix(web): Cooldown copy says Solana wallet, not Phantom or Solflare"
```

---

### Task 5: CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` Unreleased Changed section

**Interfaces:**
- Consumes: none
- Produces: one Changed bullet that replaces the Phantom-or-Solflare Cooldown line

- [ ] **Step 1: Edit the Unreleased Cooldown bullet**

In `CHANGELOG.md` under `## [Unreleased] — 2026-10-29` → `### Changed`, replace:

```
- Cooldown page says why a wallet is there: it is the signer for the lock, not a deposit. Phantom or Solflare. Copy sits on an opaque panel so glitter does not eat the letters.
```

with:

```
- Cooldown signs with any installed Solana Wallet Standard wallet except Exodus. Copy says Solana wallet, not Phantom or Solflare. Same lock, not a deposit. Opaque panel stays so glitter does not eat the letters.
```

Do not touch other Unreleased bullets.

- [ ] **Step 2: Confirm no leftover exclusive-wallet copy in the files this plan owns**

Run from repo root:

```powershell
rg -n "Phantom or Solflare|PhantomWalletAdapter|SolflareWalletAdapter" apps/web/src/lib/providers.tsx apps/web/src/lib/tiltcheck-wallet-modal.tsx apps/web/src/app/cooldown/page.tsx apps/web/src/app/cooldown/layout.tsx apps/web/src/app/cooldown/page-copy.test.ts CHANGELOG.md
```

Expected: no matches in those files. (`solana-wallet-catalog.test.ts` may still mention Phantom/Solflare as negative examples — that is allowed.)

- [ ] **Step 3: Run the full wallet-standard test set**

Run: `pnpm exec vitest run apps/web/src/lib/solana-wallet-catalog.test.ts apps/web/src/lib/tiltcheck-wallet-modal.test.ts apps/web/src/lib/providers.test.ts apps/web/src/app/cooldown/page-copy.test.ts`

Expected: PASS

- [ ] **Step 4: Manual check (do not skip)**

1. `pnpm -C apps/web dev` (port 3001).
2. Open `/cooldown`. Confirm punch + fine print. Confirm `SIGN WITH WALLET`.
3. Click it. If a non-Exodus Standard wallet is installed, it is in the list. If only Exodus is installed, the modal says `Install a Solana wallet` and does not list Exodus.
4. Do not test JustTheTip. Do not send mainnet txs.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: Cooldown wallet picker is Wallet Standard, not Phantom-only"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
| :--- | :--- |
| Empty extra `wallets` catalog; Standard auto-merge | Task 3 (`NO_EXTRA_WALLET_ADAPTERS` + existing `WalletProvider`) |
| Exodus dropped by name | Task 1 helpers, Task 2 modal filter + disconnect guard |
| Copy punch / fine print / SIGN WITH WALLET | Task 4 |
| `useWalletModal` + `sendTransaction`, no `window.solana` | Task 2 context + Task 4 does not touch sign path |
| Empty browser: install a Solana wallet, not Phantom | Task 2 empty state |
| AutoConnect on | Task 3 |
| No JustTheTip wire | Global constraint; no task implements it |
| Tests: catalog, provider source, page-copy | Tasks 1–4 |
| CHANGELOG | Task 5 |
| Rollback: restore two adapters + old copy | Inverse of Tasks 3–4; modal z-index CSS untouched |

## Threat / rollback (carry from spec)

- **Threat:** A malicious Wallet Standard extension can appear in the picker. Same as any Standard dapp. We only drop Exodus. User picks the extension they installed.
- **Validation:** Only the selected adapter signs. Cooldown still does not take seeds or transfer SOL.
- **Rollback:** Restore `PhantomWalletAdapter` + `SolflareWalletAdapter` in `providers.tsx` and the previous copy string. Keep `globals.css` modal z-index.
