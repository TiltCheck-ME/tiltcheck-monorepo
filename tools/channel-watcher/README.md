# TiltCheck Channel Watcher

Passively watches a Discord channel from your logged-in browser session, then runs scheduled GPT-4o analysis to surface pain points, friction, and community insights — no keyword lists needed.

## How it works

1. Opens Discord web in a real browser using your saved login
2. Watches the channel silently — every message is logged to `messages.jsonl`
3. Every 2 hours (configurable), sends the buffered messages to GPT-4o-mini
4. GPT produces a structured **analyst report** identifying:
   - 🔴 Pain points & frustrations
   - ⚡ Friction moments
   - 🚩 Scam & safety signals
   - 😤 Emotional state of the community
   - 💡 Community needs
   - 🎯 Opportunities for TiltCheck to respond
5. Reports are printed to the terminal AND saved to `reports_business.md`

## Setup

```bash
cd tools/channel-watcher
npm install
npx playwright install chromium
cp .env.example .env
# Fill in WATCH_CHANNEL_URL and OPENAI_API_KEY in .env
npm start
```

## Run with GCP Ollama (low-cost burst mode)

This mode is designed for your use case: run for a short window, then shut down compute.

1. In `tools/channel-watcher/.env`, set:
   - `PROVIDER=ollama`
   - `GCP_VM_NAME=...`
   - `GCP_VM_ZONE=...`
   - `GCP_PROJECT_ID=...` (optional if your gcloud default project is already correct)
   - `DEV_UPDATES_WEBHOOK_URL=...` (optional, posts each generated report to Discord)
   - `TRUST_ENGINE_INGEST_URL=...` (optional, sends each report into your internal trust pipeline)
   - `COMMUNITY_INTEL_INGEST_KEY=...` (optional key header for trust ingest auth)
2. Make sure `gcloud auth login` is done on your machine.
3. Run:

```bash
npm run cloud
```

What this does automatically:

- Starts your GCP VM
- Resolves VM IP
- Waits for `http://<vm-ip>:11434` to respond
- Sets `OLLAMA_URL=http://<vm-ip>:11434/v1`
- Runs watcher in live mode for 10 minutes
- Runs `npm run comic:daily` to refresh `apps/web/daily-degen-comic.json`
- If `COMIC_API_URL` is set, runs `npm run comic:publish` to send latest day context to cloud comic API
- Stops VM when finished (even if watcher errors)
- Posts generated reports to your Discord webhook when `DEV_UPDATES_WEBHOOK_URL` is configured
- Sends generated report payloads to `TRUST_ENGINE_INGEST_URL` when configured

Optional flags:

```powershell
# Custom duration in minutes
./run-cloud-watcher.ps1 -DurationMinutes 15

# Keep VM running after watcher run
./run-cloud-watcher.ps1 -KeepVmRunning

# Skip comic payload generation for this run
./run-cloud-watcher.ps1 -SkipComic

# Override VM details at runtime
./run-cloud-watcher.ps1 -VmName "my-vm" -Zone "us-central1-a" -ProjectId "my-project"
```

## Schedule it on Windows (3 days/week)

Create a recurring Task Scheduler job that runs the cloud watcher automatically:

```powershell
npm run cloud:schedule
```

Default schedule created by the script:

- Days: Monday, Wednesday, Friday, Saturday
- Times: 00:00 and 08:00
- Run length per execution: 10 minutes

Custom schedule example:

```powershell
./register-cloud-watcher-task.ps1 `
  -TaskName "TiltCheck-Cloud-Watcher" `
  -Days Monday,Wednesday,Friday,Saturday `
  -Times 00:00,08:00 `
  -DurationMinutes 10
```

Manage the task:

```powershell
Start-ScheduledTask -TaskName "TiltCheck-ChannelWatcher-Cloud"      # run now
Disable-ScheduledTask -TaskName "TiltCheck-ChannelWatcher-Cloud"    # pause
Enable-ScheduledTask -TaskName "TiltCheck-ChannelWatcher-Cloud"     # resume
Unregister-ScheduledTask -TaskName "TiltCheck-ChannelWatcher-Cloud" -Confirm:$false
```

## First run

The browser will open to Discord's login page. Log in normally — the session is saved to `.session.json` so you only need to do this once.

## Getting the channel URL

In Discord: right-click the channel name → **Copy Link**. Paste that into `WATCH_CHANNEL_URL`.

## Controls

- **Ctrl+C** — triggers an immediate final analysis then exits cleanly
- **Reports** — saved to `reports_business.md` in the watcher directory
- **Raw logs** — every message saved to `messages.jsonl` (one JSON object per line)

## Bonus Drops sync

Use the same saved Discord session to scrape a source bonus channel, strip out chatter/non-bonus junk, dedupe links, and repost fresh claims into TiltCheck `#bonus-drops`.

```bash
# Dry run the filtered payload
node sync-bonus-drops.js "<discord-channel-link>" --dry-run

# Post fresh links into TiltCheck Bonus Drops
npm run bonus:sync -- "<discord-channel-link>"
```

Config values:

- `BONUS_SOURCE_CHANNEL_URL` — source Discord channel link to scrape
- `BONUS_DROPS_CHANNEL_ID` — target TiltCheck channel (defaults to `1488256038665981982`)
- `TILT_DISCORD_BOT_TOKEN` or `DISCORD_BOT_TOKEN` — bot token used to post

The sync stores de-dup state in `.bonus-sync-state.json`, so reruns only post new links.
If Discord keeps trying to throw you back to login, set `DISCORD_TOKEN` in `.env` as well — the sync now hydrates that token before page load so it can reuse the saved session cleanly.

### Schedule Bonus Drops sync every 2 hours on Windows

```powershell
./register-bonus-sync-task.ps1 `
  -ChannelUrl "https://discord.com/channels/1088790880573476964/1364048680805601371"
```

Default schedule times:

- 00:00, 02:00, 04:00, 06:00, 08:00, 10:00
- 12:00, 14:00, 16:00, 18:00, 20:00, 22:00

## Manual backfill for already-scraped logs

If the watcher already scraped messages into `messages.jsonl` but you never ran analysis on them, use the manual backfill path instead of scraping again.

```bash
# Show which old log windows are still uncovered
npm run backfill -- --dry-run

# Analyze only uncovered windows and record them as reported
npm run backfill

# Narrow to a manual time range
npm run backfill -- --from=2026-04-01T00:00:00Z --to=2026-04-03T23:59:59Z

# Resume a failed long run from a later chunk
npm run backfill -- --from-chunk=3
```

What this does:

- reads existing `messages.jsonl`
- skips time ranges already recorded in `.analysis-manifest.json`
- appends fresh report output to `reports_business.md`, `reports_lore.md`, and `citations.md`
- records the analyzed time window in `.analysis-manifest.json` so the next backfill only picks up uncovered segments

The cron/live watcher behavior does not change. Backfill stays manual and operator-controlled.

## Daily Degen Comic export

Generate a home-page comic payload from the latest day in `messages.jsonl`:

```bash
npm run comic:daily
```

This writes `apps/web/daily-degen-comic.json`, which the website can render in a "Daily Degen Comic" section.
By default it uses your configured Ollama-compatible endpoint (`OLLAMA_URL`) and model (`COMIC_MODEL`), which works with your cloud VM flow.
It also updates `apps/web/daily-degen-comic-archive.json` so previous strips are preserved.

To publish today’s context to cloud comic generator service:

```bash
npm run comic:publish
```

Required env values for cloud publish:

- `COMIC_API_URL=https://<your-cloud-run-service>`
- optional `COMIC_API_INGEST_KEY=<shared-secret>`

## No API key?

Set `PROVIDER=ollama` with `OLLAMA_URL` to run keyless via your VM/local model.  
If Ollama is unreachable, the watcher now falls through to any configured cloud provider key (`GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY`) instead of dropping the whole chunk.  
If cloud providers are unset, the watcher still runs and logs all messages to file for later analysis.
