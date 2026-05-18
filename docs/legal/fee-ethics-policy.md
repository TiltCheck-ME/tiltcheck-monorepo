# Fee ethics policy (wallet lock early exit)

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18

**Made for Degens. By Degens.**

## Principles

1. **No surprise fees** — any paid early exit shows the percentage, basis balance, and destination split **before** the user commits to a wallet lock (when early exit is allowed).
2. **No dark patterns** — we do not design flows to maximize fee revenue from distress; friction should support pre-commitment, not extraction.
3. **Cooling-off** — web and dashboard require an explicit confirm step before submitting a paid early unlock request.
4. **RG v1 trivia routing** — penalty fees do not fund trivia jackpots in v1 (`triviaSOL: 0`); remainder routes to recovery microgrants and a disclosed dev skim.

## Formula (paid early unlock)

- Fee = `WALLET_EARLY_UNLOCK_FEE_PERCENT` (default **10%**) of LockVault ledger basis at request time.
- Split: dev skim (default **2%** of basis, capped by fee total), trivia **0**, remainder to microgrant pool.

## Surfaces

- API: `earlyUnlockFeePercent`, `feeAllocation`, `basisSOL` on wallet-lock responses.
- Hub: [apps/web/src/components/LockVault.tsx](../../apps/web/src/components/LockVault.tsx)
- Dashboard: vault safety lane
- Discord: `/walletlock disclose`

See also [custody-matrix.md](./custody-matrix.md).
