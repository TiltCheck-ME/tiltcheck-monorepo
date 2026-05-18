# TiltCheck custody matrix

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18

**Made for Degens. By Degens.**

This document states **who signs, who holds, and who can reverse** for each money-adjacent flow. It is the single source of truth for custody claims on web, dashboard, Discord, and extension copy. Not legal advice.

| Flow | Who signs | Who holds | Reversible by | If TiltCheck is down |
|------|-----------|-----------|---------------|----------------------|
| **JTT direct tip** (Solana Pay / user wallet) | User | User wallet | User / chain | User-signed transfers still work offline from wallet |
| **JTT credits / bot-wallet relay** | User deposit; bot executes payout | Bot operational pool (pooled relay custody leg) | Per credits policy and support | Credits queue or fail closed; no silent custody expansion |
| **LockVault timed lock** | User (vault record) | User-linked vault semantics (advisory) | Timer; optional paid/admin early exit per policy | Locks persist per server state; enforcement is advisory vs casino operator |
| **Wallet action lock** | Server policy (user-initiated) | N/A — blocks vault mutators | Timer-only (`hardLock`) or paid/admin paths when allowed | API returns lock state; client surfaces respect policy |
| **AutoVault / userscript** | User session on casino site | Casino operator | User stops script / extension | No TiltCheck custody of casino balances |

## Scoped marketing language

- Say **non-custodial** only for flows where the user signs with their own wallet and TiltCheck does not hold keys or pooled user funds.
- Say **pooled relay credits** (not “non-custodial”) for JTT credit balances settled via the bot operational wallet.
- **LockVault** and **wallet lock** are harm-reduction policy tools — not bank custody, not on-chain immutability unless a future program ships with explicit disclosure.

## Related documents

- [Fee ethics policy](./fee-ethics-policy.md)
- [Data consent policy](./data-consent-policy.md)
- [Admin break-glass](./admin-break-glass.md)
- Ethics baseline: [../ethics/mission-alignment-audit-2026-05-12.md](../ethics/mission-alignment-audit-2026-05-12.md)
