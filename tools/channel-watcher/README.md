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

## First run

The browser will open to Discord's login page. Log in normally — the session is saved to `.session.json` so you only need to do this once.

## Getting the channel URL

In Discord: right-click the channel name → **Copy Link**. Paste that into `WATCH_CHANNEL_URL`.

## Controls

- **Ctrl+C** — triggers an immediate final analysis then exits cleanly
- **Reports** — saved to `reports.md` in the watcher directory
- **Raw logs** — every message saved to `messages.jsonl` (one JSON object per line)

## No OpenAI key?

Set `OPENAI_API_KEY=` blank and the watcher will still run and log all messages to file. You can run analysis manually later or paste the log into ChatGPT.
