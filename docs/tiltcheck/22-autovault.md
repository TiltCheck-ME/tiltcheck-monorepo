<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10 -->

# Auto-Vault Rule Engine

**Made for Degens. By Degens.**

The Auto-Vault Rule Engine lets users configure flexible, automatic vault rules that move winnings into the casino's vault feature based on configurable triggers — before the urge to gamble them back kicks in.

---

## The Problem It Solves

Winning is easy. Keeping the win is hard. Manual vaulting requires discipline in the exact moment you have the least of it. The rule engine automates the decision so the discipline is set once, not every hand.

---

## Rule Types

### 1. `percent_of_win`
Vault a fixed percentage of every win.

- **Config**: `percent` (1-100)
- **Trigger**: On every win event
- **Example**: Vault 25% of every win above $2.

### 2. `fixed_per_threshold`
Vault a fixed dollar amount for every X dollars won cumulatively.

- **Config**: `fixed_amount`, `threshold_amount`
- **Trigger**: When running win total crosses threshold; resets after each vault
- **Example**: Vault $5 for every $20 won. Hit $20, vault $5. Hit $40, vault $5 again.

### 3. `balance_ceiling`
Vault everything above a set balance ceiling.

- **Config**: `ceiling_amount`
- **Trigger**: After each win, if balance exceeds ceiling
- **Example**: Never hold more than $100. Everything above auto-vaults.

### 4. `session_profit_lock`
Lock in your session profit once a target is hit.

- **Config**: `profit_target`
- **Trigger**: Once session profit (balance - starting balance) reaches target
- **Example**: Lock $50 profit into vault once session is $50 up.

---

## Casino Support

| Casino | Vault Method | Notes |
|--------|-------------|-------|
| Stake.com | GraphQL API | Full native support, uses session cookie |
| Roobet | DOM-based | Finds and clicks the vault button |
| BC.Game | DOM-based | Targets "Safe" UI button |
| Rollbit | DOM-based | Targets vault/lock button |
| Gamdom | DOM-based | Targets save button |
| Shuffle | DOM-based | Targets vault button |

Casinos without a native vault feature are not supported. Rules scoped to unsupported casinos are silently skipped.

---

## Architecture

```
CasinoWinEvent
    |
    v
VaultRuleEngine.evaluate(event)
    |-- filters by casino match
    |-- filters by min_win_amount
    |-- enforces cooldown_ms
    |-- per-rule type logic
    |
    v
VaultActionResult[]
    |
    v
CasinoAdapterRegistry.getAdapterForHost(hostname)
    |
    v
CasinoVaultAdapter.vaultAmount(amount)
    (StakeVaultAdapter | GenericDOMVaultAdapter)
```

State (running totals, last vault timestamps) persists in `chrome.storage.local` under `vault_rule_state`. Session-scoped rules (`session_profit_lock`) are cleared on session reset.

---

## API Reference

### List rules
```
GET /user/:discordId/vault-rules
Authorization: Bearer <token>
```

### Create rule
```
POST /user/:discordId/vault-rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "percent_of_win",
  "casino": "all",
  "percent": 25,
  "min_win_amount": 2.00,
  "label": "Slots cleanup"
}
```

### Update rule
```
PATCH /user/:discordId/vault-rules/:ruleId
Authorization: Bearer <token>

{ "enabled": false }
```

### Delete rule
```
DELETE /user/:discordId/vault-rules/:ruleId
Authorization: Bearer <token>
```

---

## Extension UI

The Vault tab in the extension popup provides:

- Session auto-vault total (resets per session)
- Per-rule enable/disable toggle
- Add/remove rules with a type-aware form
- Per-casino rule scoping

---

## Database Schema

```sql
CREATE TABLE user_vault_rules (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           TEXT NOT NULL,
    type              TEXT NOT NULL CHECK (type IN (
                          'percent_of_win', 'fixed_per_threshold',
                          'balance_ceiling', 'session_profit_lock'
                      )),
    enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    casino            TEXT NOT NULL DEFAULT 'all',
    percent           NUMERIC(5,2),
    fixed_amount      NUMERIC(18,8),
    threshold_amount  NUMERIC(18,8),
    ceiling_amount    NUMERIC(18,8),
    profit_target     NUMERIC(18,8),
    min_win_amount    NUMERIC(18,8),
    cooldown_ms       INTEGER,
    label             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Files

| File | Description |
|------|-------------|
| `apps/chrome-extension/src/vault-rule-engine.ts` | Core rule evaluation engine |
| `apps/chrome-extension/src/casino-vault-adapters.ts` | Casino-specific vault execution |
| `apps/chrome-extension/src/popup.ts` | Vault tab UI controller |
| `apps/api/src/routes/user.ts` | REST CRUD for vault rules |
| `packages/db/src/queries.ts` | DB query helpers |
| `packages/types/src/index.ts` | Shared TypeScript types |
| `SCHEMA.sql` | DB migration |

---

## Limitations

- DOM-based adapters depend on casino UI not changing. If the vault button moves, the adapter will not find it.
- Balance detection for DOM-based adapters is not implemented — rules requiring balance comparisons (`balance_ceiling`) work only on Stake.
- `session_profit_lock` requires the content script to track `session_profit` and include it in the win event payload.
- No server-side execution — all rule evaluation runs in the Chrome Extension.
