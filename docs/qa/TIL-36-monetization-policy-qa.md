© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06

# TIL-36 Monetization policy — QA checklist

Quick pass after deploy. Goal: non-game-add-on charges are gone; game add-ons still clear Discord entitlements.

## Discord bot

- [ ] Run `/upgrade` with `DISCORD_SKU_GAME_ADDON_IDS` unset: reply explains retired passes and shows only app-directory link (no platform tier embed, no SOL instructions).
- [ ] Run `/upgrade` with one or more real add-on SKU IDs set: Premium buttons appear (max five per row) and open Discord checkout for those SKUs only.
- [ ] Trigger `EntitlementCreate` for a SKU listed in `DISCORD_SKU_GAME_ADDON_IDS`: mod log embed title is `GAME ADD-ON PURCHASE`; if `DISCORD_SKU_GAME_ADDON_ROLE_ID` is set, user receives that role.
- [ ] Trigger `EntitlementCreate` for a legacy platform SKU (`DISCORD_SKU_PRO_ID` etc.): mod log shows `RETIRED PLATFORM SKU` and **no** auto-role grant.

## API (JustTheTip fee display)

- [ ] `GET /user/:discordId/elite` with founder username in `FOUNDER_USERNAMES`: `isElite` true, `feeSavedSol` computed from lamports.
- [ ] Same route with `DISCORD_SKU_JTT_FEE_WAIVER_IDS` plus bot token + app id + mocked/live entitlement: `isElite` true when Discord returns an active unconsumed entitlement for one of those SKUs.
- [ ] Same route for normal user with no SKUs configured and not founder: `isElite` false, `feeSavedSol` 0.
- [ ] Confirm `subscriptions` table rows no longer flip `isElite` (legacy Stripe/DB path removed).

## Dashboard

- [ ] Open `/premium` on user-dashboard: shows retirement copy only; no tier cards, SOL QR, or claim form.

## Activity overlay

- [ ] Tip tab shows updated free-tier line (no “Upgrade to Elite” paywall CTA).

## Docs / legal

- [ ] Terms “Tips and payments” section matches current billing story (game add-ons only for paid Discord SKUs).

## Rollback notes

- Restore `subscriptions` lookup in `GET /user/:id/elite` and legacy role maps in `EntitlementCreate` if platform billing returns; revert `/upgrade` embeds from git history.

Made for Degens. By Degens.
