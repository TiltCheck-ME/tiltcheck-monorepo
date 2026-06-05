<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 -->

# AutoVault Android + Mobile UI — Design Spec

## Summary

Deliver AutoVault on Android for **Stake.us** and **nuts.gg** without Play Store Tampermonkey, with a **simplified mobile UI** whose primary control is an obvious full-width **AUTOVAULT ON/OFF** toggle.

**First-run UX (approved):** Show the **full settings panel once**; after the user taps **Start** the first time, default to **Compact playing mode** on subsequent visits (remembered per device).

## Goals

- Support **Stake.us** (GraphQL API vault) and **nuts.gg** (WebSocket vault) on Android.
- Reduce on-screen clutter on small viewports; one master toggle, one vaulted stat, one status line in Compact mode.
- Keep durable rules and deep config on **tiltcheck.me dashboard** where possible.
- Align long-term with **mobile wrapper + `@tiltcheck/injected-runtime`** (no permanent fork from extension logic).

## Non-goals (v1 mobile UI)

- Play Store Tampermonkey dependency.
- Full 8-stat session grid on mobile default surface.
- Auto-tip enabled by default on nuts.gg (remains opt-in in Advanced).
- nuts.gg inside mobile wrapper until runtime adapter exists (sideload userscript path first).

---

## Android delivery (hybrid)

| Phase | Surface | Stake.us | nuts.gg |
|-------|---------|----------|---------|
| **Now** | Sideload Violentmonkey/Tampermonkey APK + **Share Edition** userscript | `tiltcheck-autovault-share.user.js` | same file |
| **Next** | TiltCheck mobile wrapper (WebView + native HUD) | Inject shared runtime | Add nuts adapter + allowlist |
| **Doc only** | Firefox + VM add-on | Optional fallback in install guide | Same |

Power users get scripts immediately; product path is the wrapper app with native toggle.

---

## UI states (three tiers)

### 1. First run — **Full panel** (once per device)

Shown when `localStorage['tiltcheck-autovault-mobile-onboarded']` (userscript) or app equivalent is unset.

Contains (same fields as today, mobile layout):

- Skim % of profit
- Heater threshold / multiplier (optional collapse to defaults link: “Use recommended”)
- Check interval
- Client seed row (Stake / provably fair) — **Advanced subsection**, not hero
- nuts.gg only: auto-tip checkbox (off by default)
- **Start** button (primary) — first Start sets onboarded flag and switches to Compact

Full panel remains reachable later via **gear / “Settings”** from Compact.

### 2. Default after first Start — **Compact playing mode**

Triggered automatically on load when onboarded **and** user has started at least once.

```
┌─────────────────────────────┐
│ TC · AutoVault    [−] [○] [⚙]│
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │      AUTOVAULT          │ │
│ │         ON / OFF        │ │  ← full-width, min 48px
│ └─────────────────────────┘ │
│ Vaulted (session): 0.0042   │  ← single stat
│ 14:32:01 · Bag secured…     │  ← single status line
└─────────────────────────────┘
```

- Master toggle **replaces** separate Start/Stop and “Injection ON/OFF”.
- Ticker/history: **replace-only** status line (no scroll list).
- Minimize (−): header + status dot only (existing behavior).
- Stealth (○): unchanged.

### 3. **Advanced drawer** (explicit open)

Opened from ⚙; never default after onboarding.

- All numeric tunables
- Client seed (New / Copy)
- nuts auto-tip toggle
- Link: “Full rules on dashboard →”
- Optional: “Reset first-run tour” (clears onboarded flag)

---

## Master toggle specification

| Property | Value |
|----------|--------|
| Min touch height | 48px |
| Width | 100% of panel content |
| OFF | Muted surface, `#ef4444` status dot, label `AUTOVAULT · OFF` |
| ON | Teal border + glow, `#17c3b2` dot, label `AUTOVAULT · ON` |
| Action | Same as Start/Stop today (start/stop monitoring loops) |
| Kill switch | Long-press OFF ≥ 800ms → stop + log “AutoVault killed” |
| Native wrapper | Same labels; optional haptic on toggle |

---

## Mobile detection

Apply Compact/Full rules when **any** of:

- Viewport width ≤ 500px
- `(pointer: coarse)` media query
- User agent matches common Android mobile patterns (fallback)

Desktop (>500px, fine pointer) keeps **full floaty** by default; optional “Compact mode” toggle in header for testing.

---

## Site handling (Stake.us + nuts.gg)

| Site | Script / runtime | Mode chip (Advanced only) |
|------|------------------|---------------------------|
| stake.us | Unified autovault userscript | API |
| nuts.gg | Dedicated nuts autovault userscript | WS · Full |

**No site picker in panel** — detect hostname at load. Show site name only in Advanced footer.

Do **not** run both scripts on the same tab.

---

## Persistence keys

| Key | Purpose |
|-----|---------|
| `tiltcheck-autovault-config` | Existing numeric settings (shared) |
| `tiltcheck-autovault-mobile-onboarded` | `"1"` after first Start |
| `tiltcheck-autovault-mobile-view` | `"compact"` \| `"full"` — user override from ⚙ |
| `tiltcheck-autovault-last-running` | `"1"` while user wants AutoVault ON; cleared only on explicit OFF |

nuts.gg script: parallel key `nuts-autovault-mobile-onboarded` or migrate to shared prefix `tiltcheck-autovault-*` for consistency (implementation choice).

---

## Mobile wrapper alignment (phase 2)

Native shell (`apps/mobile-wrapper`):

- **Native** master toggle (not WebView floaty) — same ON/OFF spec.
- WebView: inject runtime only; **no duplicate fat floaty** on phone.
- Site tabs: **Stake US** | **nuts.gg** in native chrome (allowlist expansion).
- Token sync + meta rows move to **Settings** screen, not overlay on casino view.

First-run Full panel can be native onboarding sheet (3 screens max) instead of injected DOM.

---

## Architecture

```
┌──────────────────┐     ┌─────────────────────┐
│  Casino WebView  │     │  Native HUD (later) │
│  or mobile browser│     │  master toggle      │
└────────┬─────────┘     └──────────┬──────────┘
         │                          │
         ▼                          ▼
┌────────────────────────────────────────────┐
│  AutoVault engine (site adapter)             │
│  · stake-api  · nuts-ws  · generic-dom     │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  UI shell (viewport-aware)                 │
│  · First-run Full  · Compact  · Advanced   │
└────────────────────────────────────────────┘
```

Shared behavioral core target: `@tiltcheck/injected-runtime` + extension autovault module (roadmap); userscript remains ship vehicle until runtime parity.

---

## Error handling

- Toggle ON while socket/API not ready: status line warning; toggle stays ON but vault attempts queue/retry (nuts) or log warning (Stake CF).
- Toggle OFF: always immediate stop of intervals; no in-flight vault after stop ack.
- First-run skipped close: if user closes panel before Start, next open still Full until Start.

---

## Success criteria

- [ ] Android sideload: Stake.us vault skim works with Compact UI after first Start.
- [ ] Android sideload: nuts.gg vault skim works; auto-tip off unless Advanced enabled.
- [ ] First visit shows Full; second visit shows Compact with prominent toggle.
- [ ] Toggle readable at arm’s length; one-handed thumb reach on 6" phone.
- [ ] Desktop regression: full panel unchanged for width > 500px.
- [ ] Returning user with `last-running=1` auto-starts monitoring in Compact without tapping Start again.
- [ ] Explicit OFF persists across tab reload / app restart until user turns ON.

---

## Implementation order (for planning phase)

1. Mobile viewport detection + onboarded flag + Compact DOM shell in `tiltcheck-autovault.user.js`.
2. Port same shell to `tiltcheck-nuts-autovault.user.js` (shared CSS/structure, nuts-specific Advanced fields).
3. Master toggle component (replace Start/Stop in mobile Compact).
4. Advanced drawer + dashboard deep link.
5. Install doc: `docs/mobile/android-autovault-install.md` (sideload VM path).
6. **Shipped:** Share Edition `tiltcheck-autovault-share.user.js` + `/tools/auto-vault/share` + `/userscripts/install.html` + session wager line in Share panel + `/tools/session-wager`.
7. Mobile wrapper native toggle + nuts allowlist (separate milestone).

---

## Session restore (approved)

AutoVault returns **ON** when the user opens the casino tab or app again **unless they explicitly toggled OFF** last time.

| Last explicit state | Next visit |
|---------------------|------------|
| ON (or running when tab closed) | Compact UI + monitoring **starts automatically** |
| OFF (user tapped master toggle off or long-press kill) | Compact UI + ** stays OFF** until user turns on |

**Persistence:**

| Key | Value |
|-----|--------|
| `tiltcheck-autovault-last-running` | `"1"` when user had AutoVault ON; cleared or `"0"` only on explicit OFF |
| `tiltcheck-autovault-mobile-onboarded` | unchanged — still set after first Start |

**Rules:**

- Closing the panel, minimizing, stealth mode, or navigating away does **not** count as OFF.
- Only master toggle OFF (or long-press kill switch) sets `last-running` to off.
- First-run Full panel: user must still tap **Start** once for onboarding; after that, restore behavior applies on subsequent visits.
- If restore fails (no session / socket not ready), status line shows warning; toggle remains ON visually until user turns off or connection succeeds.

Apply the same contract to `tiltcheck-nuts-autovault.user.js` (parallel key or shared `tiltcheck-autovault-last-running`).

---

## Open decisions (deferred)

- Unify nuts config under `tiltcheck-autovault-*` keys vs keep `nuts-autovault-*`.
