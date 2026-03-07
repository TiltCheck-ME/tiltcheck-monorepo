# Discord Commands Redesign (Less Clutter, More Power)

Goal: reduce redundant slash commands, keep the degen voice, and make the UX feel intentional.

## Problems Observed

- Too many top-level commands per bot (Discord command picker gets noisy).
- Redundant flows for the same user intent (especially tipping).
- Legacy non-custodial commands still surface next to the custodial credit flow, confusing users.
- Functions are correct, but the menu feels like a dump of features instead of a guided workflow.

## Design Principle

Use 1 umbrella command per bot (plus `ping` + `help`), then express everything as subcommands/subcommand-groups.

Benefits:
- Cleaner command picker.
- Users learn 1 entry point per bot.
- Easier to onboard: "use `/tip` for money stuff", "use `/tiltcheck` for safety".
- You can keep advanced/legacy actions without exposing them as top-level clutter.

## Current Commands (In Repo)

### TiltCheck Safety Bot (`apps/discord-bot`)
- Top-level: `/tiltcheck`, `/suslink`, `/casino`, `/buddy`, `/report`, `/setstate`, `/ping`, `/help`

### JustTheTip Bot (`apps/justthetip-bot`)
- Top-level: `/tip` (custodial credit), `/justthetip` (legacy non-custodial), `/airdrop` (legacy non-custodial), `/ping`, `/help`

### DA&D Bot (`apps/dad-bot`)
- Top-level: `/play`, `/join`, `/startgame`, `/hand`, `/submit`, `/vote`, `/scores`, `/poker`

## Proposed Command Shape (Recommended)

### 1. TiltCheck Safety Bot

Keep top-level:
- `/tiltcheck`
- `/ping`
- `/help`

Move features into `/tiltcheck`:
- `/tiltcheck status`
- `/tiltcheck history`
- `/tiltcheck cooldown [duration]`
- `/tiltcheck scan url:<url>` (replaces `/suslink scan`)
- `/tiltcheck casino domain:<domain>` (replaces `/casino`)
- `/tiltcheck buddy add|remove|list|test`
- `/tiltcheck promo submit|approve|deny|pending` (replaces promo workflow surface)
- `/tiltcheck report target:<user> action:<...> reason:<...> [evidence]`
- `/tiltcheck setstate state:<XX> [topic]` and `/tiltcheck setstate clear`

Notes:
- Internally this can still call the same existing modules; it is mostly a registration and routing change.
- `/suslink` can remain as an internal module name; it does not need to be user-facing.

### 2. JustTheTip Bot

Keep top-level:
- `/tip`
- `/ping`
- `/help`

Keep all *current* custodial subcommands under `/tip`:
- `deposit`, `deposit-token`, `direct`, `send`, `airdrop`, `withdraw`, `balance`, `history`, `wallet`, `refund-settings`, `claim`
- `lock`, `unlock`, `emergency-unlock`, `extend`, `vaults`
- `trivia`, `rain`
- `admin setup-channels`

Handle legacy non-custodial commands:
- Preferred: move to `/tip legacy ...`
  - `/tip legacy justthetip wallet|tip|balance|pending`
  - `/tip legacy airdrop recipients:<...> amount:<...>`
- Or: deprecate and remove entirely if not needed.

Tone rule:
- `/help` and DM responses should explicitly say:
  - "`/tip` is custodial credit balance (deposit then spend)."
  - "Legacy wallet-signing commands are advanced and optional."

### 3. DA&D Bot

Keep top-level:
- `/dad` (or `/game`)
- `/ping` (optional)
- `/help` (optional)

Move DA&D state machine into `/dad`:
- `/dad lobby create [rounds] [maxplayers]`
- `/dad lobby join`
- `/dad lobby start`
- `/dad hand`
- `/dad submit card:<n>`
- `/dad vote player:<user>`
- `/dad scores`

Move poker into `/dad poker ...`:
- `/dad poker start [buyin] [smallblind]`
- `/dad poker join`
- `/dad poker status`
- `/dad poker fold|check|call|raise amount:<n>|allin`

## Migration Plan (Safe And Not Annoying)

1. Add new umbrella subcommands first.
- Deploy guild-scoped for instant iteration.

2. Keep old top-level commands temporarily (2-4 weeks).
- When invoked, reply with a short degen-but-clear nudge:
  - "This command moved. Use `/tip ...`" or "Use `/tiltcheck ...`".

3. Prune old top-level commands.
- Use each app's deploy script (PUT replaces the command set for that application/scope).
- Optionally run cleanup scripts to delete by name if you need partial pruning.

## Alternative (Minimal Change Option)

If you do not want umbrella commands yet:
- Only remove legacy duplicates from JustTheTip:
  - Remove top-level `/justthetip` and top-level legacy `/airdrop`
  - Keep `/tip` as the sole money interface
- Keep the safety bot split as-is (`/tiltcheck`, `/suslink`, `/casino`, etc.)
- Keep DA&D split as-is (`/play`, `/join`, etc.)

This reduces confusion but does not fix command picker clutter.

## Decisions Needed Before Implementation

- Should TiltCheck use a single `/tiltcheck ...` umbrella, or keep `/suslink` and `/casino` as top-level?
- Should legacy non-custodial commands stay accessible as `/tip legacy ...`, or be removed?
- Should DA&D umbrella be named `/dad` or `/game`?

