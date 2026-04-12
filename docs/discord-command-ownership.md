© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

# Discord Command Ownership

This is the source of truth for slash command split across bots.

## `@tiltcheck/discord-bot` (Safety + Trust)

- `/status`
- `/buddy`
- `/odds`
- `/verify`
- `/goal`
- `/intervene`
- `/dashboard`
- `/cooldown`
- `/tilt`
- `/scan`
- `/sos`
- `/casino`
- `/reputation`
- `/support`
- `/help`
- `/jme`
- `/ping`
- `/setstate`
- `/terms`
- `/block-game`
- `/unblock-game`
- `/my-exclusions`
- `/upgrade`
- `/touchgrass`

## `@tiltcheck/justthetip-bot` (Tipping + Wallet)

- `/juicedrop`
- `/profitdrop`
- `/lockvault`
- `/bonuses`
- `/linkwallet`
- `/donation`
- `/ping`
- `/help`

## `@tiltcheck/dad-bot` (DA&D + Poker)

- `/lobby`
- `/triviadrop`
- `/jackpot`
- `/play`
- `/degens-help`
- `/ping`
- `/help`

## Deployment Note

Each bot must deploy slash commands using its own Discord application token/client id.
Running deploy with `Routes.applicationGuildCommands(...)` or `Routes.applicationCommands(...)`
replaces that app's command set for the scope, which prunes stale commands for that bot.
