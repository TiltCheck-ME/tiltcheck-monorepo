<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# Mobile Wrapper (v1)

Thin shell only:

- WebView browser wrapper (Stake allowlist).
- Native HUD (start/stop injection, show status/logs).
- Injects `@tiltcheck/injected-runtime` at document end.

Durable settings do not live here. The website/dashboard owns those.

## Commands

Run from repo root:

- `pnpm --filter @tiltcheck/mobile-wrapper start`
- `pnpm --filter @tiltcheck/mobile-wrapper ios`
- `pnpm --filter @tiltcheck/mobile-wrapper android`
- `pnpm --filter @tiltcheck/mobile-wrapper typecheck`

