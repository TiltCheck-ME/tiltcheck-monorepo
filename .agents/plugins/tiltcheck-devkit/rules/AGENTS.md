<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 -->

# TiltCheck DevKit Rules & Invariants

These rules and domain invariants apply across all TiltCheck development when the `tiltcheck-devkit` plugin is active.

## 1. Brand Laws & System Constraints

- **Zero Emojis:** Strictly prohibited across all code, tests, documentation, commit messages, and agent outputs.
- **Copyright Headers:** Every source file (`.ts`, `.tsx`, `.js`, `.html`, `.md`, `.css`, `.yml`) must include the line 1 copyright header:
  `/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */`
  (or corresponding comment syntax for HTML/Markdown/YAML).
- **Non-Custodial Architecture:** Pure client-side harm reduction. Never introduce custodial keys, wallet signing hot-wallets, or server custody of casino player funds.
- **Tone:** Direct, sharp, confident, and professional. Avoid sycophancy, apologies, and filler text.

## 2. Sweepstakes & Casino Domain Invariants

- **Dual-Currency Awareness (SC vs GC):** Sweepstakes casinos (Stake.us, Crown Coins, LoneStar, Real Prize, Chumba, McLuck, Pulsz, WOW Vegas) utilize Sweeps Coins (SC, redeemable 1:1 USD) and Gold Coins (GC, play-money tokens). Content scripts and telemetry MUST inspect active currency toggles before processing balances. Never fire real-money cashout goals, financial loss warnings, or drawdown alerts when GC or free-play mode is active.
- **Iframe & Frame Penetration:** Casino slot grids render almost universally inside nested iframes. `manifest.json` `content_scripts` MUST specify `"all_frames": true`, and telemetry selectors must resolve buttons inside frame boundaries.
- **Default Bet Protection on Game Load:** Slot providers routinely initialize sessions with inflated default stakes ($1.00–$2.00) rather than minimum bets ($0.10–$0.20). Maintain the Default Bet Breaker check on the first spin after page load, reload, or SPA game switch to protect player bankroll.
- **Cashier & Wallet Route Invariants:** Stake wallet modal links must use `?modal=wallet&tab=withdraw` (Stake.com) and `?modal=wallet&tab=redeem` (Stake.us). Never invert query parameters to `tab=wallet&modal=withdraw`, which causes Stake's router to hang in an endless loading state.

## 3. Extension UI & Component Standards

- **Zero Unwired UI Elements:** Never introduce an interactive control (`<button>`, `<input>`, `<a>`) in `popup.html` without immediately defining and attaching an active, non-throwing event listener in `popup.ts`.
- **Icon Semantic Standards:** Use standard, universally recognized glyphs on a unified 24x24 viewBox (e.g., standard 6-tooth mechanical cog for settings; `help-circle` question mark for tutorials/onboarding; external link for window popouts). Never use sun/brightness icons for settings.
- **Neurocognitive Calm-Saliency (PMC12289795):** Keep baseline telemetry and status indicators muted (slate/subtle fills). Reserve saturated neon and warning colors strictly for active risk states (drain, tilt, drawdown).

## 4. Extension Verification & Packaging Runbook

- **Testing:** Always run `pnpm --filter @tiltcheck/chrome-extension test` before packaging to verify all unit test suites pass.
- **Packaging:** Always execute `pnpm --filter @tiltcheck/chrome-extension package`. This runs `vitest --run`, builds `./dist`, and updates the packaged zip archives at both `apps/chrome-extension/tiltcheck-extension.zip` and `apps/web/public/downloads/tiltcheck-extension.zip`.
- **Windows / PowerShell Tooling:** Avoid bash-only `&` operators in commands. For file regex replacements on Windows, use Node.js one-liners (`node -e '...'`) to ensure CRLF line endings match cleanly.
