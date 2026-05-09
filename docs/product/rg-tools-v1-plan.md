<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# RG Tools v1 Plan

This plan keeps responsible gambling tools discoverable without turning every surface into a duplicate control panel. Extension handles in-session urgency, dashboard owns durable settings, Discord handles social delivery and short commands, and web explains the product before a degen clicks anything expensive.

Made for Degens. By Degens.

## 1. Product Line

RG v1 is the first pass at player-side controls that reduce regret without pretending software can guarantee restraint. The stack should be blunt about limits:

- Non-custodial controls only.
- No medical, diagnostic, or regulator-endorsement claims.
- Every hard setting has a clear owner.
- Every live-session nudge has a dashboard escape hatch for durable setup.

## 2. Surface Ownership

| Surface | Job | Not Its Job |
| :--- | :--- | :--- |
| Chrome extension | In-casino detection, quick session actions, license strip, cash-out nudges, and dashboard handoffs. | Long-form configuration, partner graph management, legal explanations. |
| Dashboard | Durable user settings, vault rules, buddy relationships, safety controls, and profile history. | Constant in-session UI while the casino tab is active. |
| Discord | Commands, support delivery, buddy alerts, and community reminders. | Sensitive configuration that needs review, consent, or long-form copy. |
| Web tools | Public explainers, SEO discovery, unauthenticated education, and login handoff. | Acting as the canonical settings store. |

## 3. Cross-Surface Discovery Map

| Tool / Flow | Primary Entry Point | Secondary Entry Point | Support Surface | Dashboard Destination | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Session brake and cash-out intent | Extension sidebar `EMERGENCY BRAKE` and redeem threshold controls | Dashboard safety lane | Discord support prompt during intervention | `/dashboard?tab=safety` | Extension is where urgency happens. Dashboard owns cooldown and durable safety settings. |
| Solana timelock vault | Dashboard vault lane | Extension `Open Vault Controls` / `Vault Rules` | Discord help and status commands | `/tools/auto-vault` | Pre-lock review must stay in dashboard until program policy and signer model are final. |
| Buddy / 2-of-3 accountability | Dashboard buddy lane | Extension `Buddy Controls` quick action | Discord buddy alerts and support-only pings | `/tools/buddy-system` | Partner graph, consent, and thresholds stay dashboard-owned. Discord only delivers messages. |
| Fairness toolkit | Web tools index and verification pages | Extension fairness / license affordances | Discord help link to verifier | `/tools/verify` plus `/tools/session-stats` | Copy must define source, window, and degraded state. No guarantee language. |
| Tilt detection and interventions | Extension sidebar while playing | Dashboard safety lane | Discord optional buddy delivery | `/dashboard?tab=safety` | Sensitivity, snooze, and privacy settings belong in dashboard. Extension shows live state. |
| License / trust surfacing | Extension license strip | Casino trust and web tools pages | Discord `/status` and help links | `/dashboard?tab=safety` when user wants controls | Source and stale-date metadata must be visible where verdicts are shown. |
| Trivia jackpot treasury | Discord, only if voluntary donation rules ship | Web transparency page | Dashboard history if account-linked | Deferred | Penalty-funded jackpots stay out of v1. Counsel review before copy ships. |

## 4. Deep-Link Contract

Extension buttons should open the canonical dashboard host with simple, durable targets:

- Profile overview: `https://dashboard.tiltcheck.me/dashboard`
- Safety controls: `https://dashboard.tiltcheck.me/dashboard?tab=safety`
- Vault rules: `https://dashboard.tiltcheck.me/dashboard?tab=vault`
- Buddy controls: `https://dashboard.tiltcheck.me/dashboard?tab=buddies`

Web handoff routes can keep using `getDashboardHandoffUrl(...)` for environment-aware routing, but the user-facing IA should still name the dashboard lane that owns the setting.

## 5. QA Checklist: Where Do I Click?

Use this checklist before closing RG v1 surface-routing work:

- Extension signed out: user can still find login, demo mode, and the dashboard entry point.
- Extension signed in: `THE DASHBOARD`, `VAULT RULES`, `SAFETY SETTINGS`, and `BUDDY CONTROLS` each open a dashboard URL instead of an API endpoint or dead route.
- Session brake: user sees the immediate action in the extension and a clear route to durable safety settings.
- Vault: extension quick action opens dashboard-owned vault rules; web AutoVault explainer also routes there.
- Buddy system: dashboard is the only place to manage partners and thresholds; Discord is described as delivery.
- Fairness and trust: web explains definitions; extension shows only concise verdicts and links out for deeper control.
- Discord: help copy points users to dashboard or web explainers when the task needs review or configuration.
- Legal tone: no guarantee, treatment, diagnosis, endorsement, or custodial-control language.

## Section A. Session Brake / Cash-Out Intent

Tracked by TIL-122. Extension owns the live session brake. Dashboard owns sensitivity, snooze, cooldown, and history. Degraded mode must say when DOM/API signals are unavailable.

## Section B. Solana Timelock Vault

Tracked by TIL-124. Dashboard owns pre-lock review, amount, duration, unlock destination, signer model, and recovery warnings. Extension can only hand off or show session nudges until the program policy is published.

## Section C. Buddy / 2-of-3 Multisig Vault

Tracked by TIL-127. Dashboard owns partner selection, consent, signer rules, alert thresholds, and break-glass copy. Discord only delivers support pings and commands.

## Section D. Fairness Toolkit

Tracked by TIL-123. Web tools own education and manual verification. Extension can expose compact affordances, but every statistical claim needs source, window, and degraded-state definitions.

## Section E. Tilt Detection + Interventions

Tracked by TIL-125. Extension owns live detection and intervention UI. Dashboard owns durable controls and privacy choices. Copy must avoid medical framing.

## Section F. License / Trust Surfacing

Tracked by TIL-126. Extension owns the quick strip. Web owns deeper evidence pages. Every verdict needs source, last verified date where available, and a no-legal-advice frame.

## Section G. Trivia Jackpot Treasury

Tracked by TIL-129. Deferred for v1 unless voluntary donations and counsel-reviewed contest rules exist. No penalty-funded prize pool copy.
