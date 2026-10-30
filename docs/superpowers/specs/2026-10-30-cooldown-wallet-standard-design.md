<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30 -->

# Cooldown: Wallet Standard signers — design spec

Status: Approved  
Owner: founder (solo)  
Surface: Next.js `apps/web` Cooldown (`/cooldown`) + site-wide Solana `WalletProvider`  
Date: 2026-10-30  
Related: `apps/web/src/lib/providers.tsx`, `apps/web/src/app/cooldown/page.tsx`

Approach A from the 2026-10-30 brainstorm. Founder does not use Phantom or Solflare. JustTheTip send/receive is unfinished and is not the source of truth for this change. Exodus is banned (scam surface).

## Problem

`/cooldown` is a signed Solana lock. The connect modal only lists Phantom and Solflare because `RootProvider` hardcodes those two adapters as the product catalog. Degens with Backpack, Trust, Ledger, Brave, or any other Wallet Standard signer never see their wallet. Copy that names Phantom/Solflare makes it look exclusive. The homepage CTA still needs a working signer today; tips are not ready to own identity.

## Job (locked)

Cooldown stays a signed lock on Solana devnet. The picker lists **installed Wallet Standard wallets**, not a hardcoded Phantom/Solflare pair. Copy says Solana wallet. Exodus is filtered even if installed. JustTheTip does not block this. When tips ship, the same pubkey is the tip address — that wire is later, not this spec.

## Goals

- Any installed Solana Wallet Standard signer can open the Cooldown modal (except Exodus).
- Copy does not name Phantom or Solflare as the only options.
- Same sign path: `useWallet` / `sendTransaction`. No `window.solana` connect.
- Empty browser: honest “install a Solana wallet,” not a Phantom nag.
- AutoConnect stays on for a returning signer.
- Non-custodial. No keys held. No SOL moved by Cooldown.

## Non-goals

- JustTheTip send/receive, rain, or `/linkwallet` auto-fill from a Cooldown signature.
- Magic, x402, or any custodial/email signer for Cooldown.
- Exodus in the picker.
- Mainnet Cooldown.
- Redesigning the lock form (scope, duration, Sign and Lock).
- Moving glitter. Homepage wallet copy.
- Adding WalletConnect mobile as a required path in this spec.

## Decisions (locked)

| Topic | Choice |
| :--- | :--- |
| Approach | A — detect installed Wallet Standard wallets |
| Product list | Not a hardcoded Phantom + Solflare array |
| Exodus | Exclude by name (case-insensitive). Do not suggest it in copy. |
| JustTheTip | Unfinished. Do not gate Cooldown on a linked tip wallet. Later: same pubkey. |
| Signer types | User-held Solana wallets only |
| Copy punch | `Sign a lock so 3am-you cannot put the stack back.` |
| Copy fine print | `Not a deposit. No keys. Solana wallet. Devnet. Casinos do not have to honor it. You do. Stronger only.` |
| Button | `SIGN WITH WALLET` |
| Connect path | Wallet adapter modal (`useWalletModal`). Not `window.solana`. |
| Cluster | Devnet for Cooldown txs (unchanged) |

## Architecture

`RootProvider` (`apps/web/src/lib/providers.tsx`) already mounts `ConnectionProvider`, `WalletProvider`, and `WalletModalProvider`. Today `wallets` is `[PhantomWalletAdapter, SolflareWalletAdapter]`. That array is treated as the catalog.

Change the catalog rule:

1. Do not ship Phantom/Solflare as the exclusive `wallets` catalog.
2. Installed Wallet Standard wallets must appear in the modal. If this adapter version does not auto-merge them, add the official Standard-wallet merge the Solana adapter docs specify. Do not invent `window.solana` injects.
3. After adapters resolve, drop any wallet whose `name` equals or starts with `Exodus` (case-insensitive).
4. Cooldown page keeps `useWallet` + `useWalletModal` + `sendTransaction` against the existing devnet `Connection` in `signAndSendLock` / extend.

Phantom may still show **if installed**. It is not required and not the headline.

Cooldown UI (opaque panel, condensed copy, modal z-index fix) stays. This spec only changes **which signers show** and **brand-free copy**.

## Data flow

1. User hits `/cooldown` → `SIGN WITH WALLET` → `setVisible(true)`.
2. Modal lists detected Standard wallets minus Exodus.
3. User picks one → adapter `connect` → `publicKey` drives lock checks.
4. `Sign and Lock` / `Extend +7d` call `sendTransaction` on the selected adapter with the Cooldown program ix on **devnet**.
5. No write to JustTheTip wallet tables.

## Errors

- No installed wallet: modal empty of signers; copy does not tell them to install Phantom. Existing `txStatus` line still reports sign/connect failures.
- User rejects the prompt: existing rejection handling.
- Exodus installed: it does not appear. No error toast required.
- Wrong cluster / no devnet SOL: existing transaction error string. Do not add a faucet UI in this spec.

## Testing

- Provider tests or a source test: `wallets` construction is not `PhantomWalletAdapter` + `SolflareWalletAdapter` as the exclusive list; Exodus filter exists.
- Cooldown page-copy test: punch + fine print as locked above; `SIGN WITH WALLET`; `useWalletModal`; no `Phantom or Solflare`; no `window.solana`; no self-exclusion.
- Manual: with a non-Phantom Standard wallet installed, it appears in the modal. With only Exodus installed, the picker does not offer Exodus.

## Files

- `apps/web/src/lib/providers.tsx` — catalog + Exodus filter
- `apps/web/src/app/cooldown/page.tsx` — copy
- `apps/web/src/app/cooldown/layout.tsx` — meta description
- `apps/web/src/app/cooldown/page-copy.test.ts` — copy contract
- Provider/filter unit test next to `providers.tsx` if adapters can be tested without a browser
- `CHANGELOG.md` — unreleased bullet

## Threat / rollback

- **Threat:** A malicious wallet extension that implements Wallet Standard can appear in the picker. Same risk as any dapp using Standard. We do not whitelist beyond dropping Exodus. Users pick the extension they installed.
- **Validation:** Only the selected adapter signs. Cooldown still does not take seeds or send SOL as a transfer.
- **Rollback:** Restore the two hardcoded adapters and the previous copy string. Modal z-index CSS is unrelated and can stay.

## Later (not this spec)

When JustTheTip can send/receive, the linked tip address should be the Cooldown owner pubkey. Do not implement that wire here.
