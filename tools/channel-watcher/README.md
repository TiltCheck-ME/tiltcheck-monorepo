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
5. Reports are printed to the terminal AND saved to `reports.md`

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
- **Reports** — saved to `reports.md` in the watcher directory
- **Raw logs** — every message saved to `messages.jsonl` (one JSON object per line)

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

## No OpenAI key?

Set `OPENAI_API_KEY=` blank and the watcher will still run and log all messages to file. You can run analysis manually later or paste the log into ChatGPT.
