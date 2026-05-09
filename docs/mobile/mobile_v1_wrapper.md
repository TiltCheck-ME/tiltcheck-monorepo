<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# Mobile v1: WebView wrapper + injected runtime

Mobile is a thin shell:

- WebView browser (casino session stays inside WebView cookies; non-custodial).
- Strict host allowlist.
- Native HUD: start/stop injection, show status/logs, emergency off-switch.

The real product logic lives in the injected runtime (shared behavioral core with the Chrome extension):

- Allowlist + injection gating.
- Page bridge (native <-> web).
- Session monitoring + interventions.
- Fairness/verifier hooks.

## Canonical settings

Durable settings and relationships live on `web` + `user-dashboard`.

Mobile is for in-session guardrails. If a feature requires durable config and is not yet wired to the dashboard, it is gated as "coming soon".

## Explicit out-of-scope for player-facing mobile v1

- AutoClaimer or similar personal-use automation.
- Any credential collection or cookie/token exfiltration.
- Any "all-sites" injection behavior.

