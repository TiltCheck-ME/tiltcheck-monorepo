# Discord Command Ownership

This is the source of truth for slash command split across bots.

## `@tiltcheck/discord-bot` (Safety + Moderation)

- `/tiltcheck`
- `/suslink`
- `/casino`
- `/buddy`
- `/report`
- `/setstate`
- `/ping`
- `/help`

## `@tiltcheck/justthetip-bot` (Tipping + Wallet)

- `/tip`
- `/airdrop`
- `/justthetip`
- `/ping`
- `/help`

## `@tiltcheck/dad-bot` (DA&D + Poker)

- `/play`
- `/join`
- `/startgame`
- `/hand`
- `/submit`
- `/vote`
- `/scores`
- `/poker`

## `collectclock` Bot (External Repo)

- `/bonus` and related bonus-tracking commands

## Deployment Note

Each bot must deploy slash commands using its own Discord application token/client id.
Running deploy with `Routes.applicationGuildCommands(...)` or `Routes.applicationCommands(...)`
replaces that app's command set for the scope, which prunes stale commands for that bot.
