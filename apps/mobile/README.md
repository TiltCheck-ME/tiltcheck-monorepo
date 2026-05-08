<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 -->

# TiltCheck Mobile

Initial cross-platform mobile wrapper for Stake v1. The app uses Expo + React Native so the team can run iOS and Android simulator builds from one TypeScript surface before deciding whether native folders are worth the maintenance tax.

## Scope

- Hosts `https://stake.us/` and `https://stake.com/` inside an in-app WebView.
- Blocks off-scope WebView navigation outside the Stake host allowlist.
- Renders a native HUD shell over the WebView for future session risk, cash-out nudges, and accountability controls.
- Includes the user-facing footer text: `Made for Degens. By Degens.`

## Commands

Run from the repository root:

```bash
pnpm --filter @tiltcheck/mobile start
pnpm --filter @tiltcheck/mobile ios
pnpm --filter @tiltcheck/mobile android
pnpm --filter @tiltcheck/mobile typecheck
pnpm --filter @tiltcheck/mobile build
```

Expo CLI handles simulator launch for `ios` and `android`. Physical device builds can use the same app config with EAS when the release path is ready.

## Stack Decision

Expo managed workflow is the v1 choice because the wrapper needs a WebView and native HUD, not bespoke platform modules yet. It keeps iOS and Android aligned, fits the existing TypeScript workspace, and lets us prebuild native projects later if the HUD needs deeper device APIs.
