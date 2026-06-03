# Casino install pages (nuts + Stake.us)

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03

## DM-ready links

| URL | Casino |
|-----|--------|
| https://tiltcheck.me/nuts | nuts.gg |
| https://tiltcheck.me/stake | Stake.us |

Same Share Edition script (`tiltcheck-autovault-share.user.js`). Plain 4-step UI per casino.

## Auto-tip

- **Default: OFF** (`autoTipEnabled: false` in script defaults).
- **Stake.us:** no tip UI — vault skim only.
- **nuts.gg:** optional checkbox in Advanced gear only. 1% on vault withdraw to `@jmenichole` if enabled.

## Tools index

`/tools` lists **Install now** (nuts + stake) first, then **live** web tools, then **beta** (dashboard handoffs, QR wizards, Discord arena).

Power-user pages (`/tools/auto-vault/share`, `/android`, `/session-wager`) show a banner pointing to `/nuts` and `/stake`.

## Code

- Presets: `apps/web/src/lib/casino-install-setup.ts`
- Registry: `apps/web/src/lib/tool-registry.ts`
- UI: `apps/web/src/components/CasinoSetupClient.tsx`
- Minimal chrome (no nav): `/nuts`, `/stake` via `SiteChrome.tsx`

## Analytics (first-party funnel)

Events POST to `/api/funnel` and log as `[TiltCheck Funnel]` in Railway web logs.

| Step | Meaning |
|------|---------|
| `nuts_install_page_view` / `stake_install_page_view` | DM link opened |
| `autovault_script_install_click` | Install button tapped |
| `dm_blurb_copy` / `install_link_copy` | Sharer copied text |
| `share_edition_first_run` (`install_ping`) | Script ran once on stake/nuts |

Filter Railway logs: `[TiltCheck Funnel]` + step name. No third-party tracker required.

## Distribution

Public casino chat: no links. DM only.
