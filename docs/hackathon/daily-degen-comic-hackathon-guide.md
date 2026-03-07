# Daily Degen Comic Hackathon Guide

## Project Description

Daily Degen Comic turns noisy daily Discord chat into a structured, visual comic strip recap for the TiltCheck community.

It uses:

- `tools/channel-watcher` to collect and curate daily message context
- Gemini-powered cloud generation for story + panel visuals
- homepage rendering with attribution, timestamp, and archive history
- cloud persistence for current strip + historical archive

This aligns with the Creative Storyteller category by producing mixed media output from real community context.

## Core Components

- Watcher and local fallback:
  - `tools/channel-watcher/index.js`
  - `tools/channel-watcher/generate-daily-comic.js`
  - `tools/channel-watcher/publish-comic-to-cloud.js`
- Cloud service:
  - `packages/comic-generator/src/index.js`
  - `packages/comic-generator/src/gemini.js`
  - `packages/comic-generator/src/storage.js`
- Web display:
  - `apps/web/scripts/daily-comic.js`
  - `apps/web/index.html`

## Quick Start (Local + Cloud)

1) Install comic-generator dependencies:

```bash
npm --prefix packages/comic-generator install
```

1) Configure watcher `.env`:

- `COMIC_API_URL`
- `COMIC_API_INGEST_KEY` (if enabled in service)
- `COMIC_COMMUNITY_ID=tiltcheck-discord`

1) One-command Cloud Run deploy:

```bash
COMIC_GCS_BUCKET=<your-bucket> GEMINI_API_KEY=<your-key> COMIC_INGEST_KEY=<your-shared-key> npm --prefix packages/comic-generator run deploy:cloudrun
```

1) Generate/publish from watcher flow:

```bash
cd tools/channel-watcher
npm run comic:daily
npm run comic:publish
```

Or run your cloud watcher automation, which triggers comic generation and publish when `COMIC_API_URL` is set.

1) Run one-command cloud smoke test after deploy:

```bash
COMIC_API_URL=<your-cloud-run-url> COMIC_API_INGEST_KEY=<your-shared-key> npm --prefix packages/comic-generator run smoke:cloud
```

## Environment Variables

### `packages/comic-generator`

- `COMIC_GCS_BUCKET` (required)
- `GEMINI_API_KEY` (required for Gemini generation)
- `COMIC_INGEST_KEY` (optional but recommended)
- `COMIC_STORAGE_PREFIX` (default `comics`)
- `GEMINI_TEXT_MODEL` (default `gemini-2.0-flash`)
- `GEMINI_IMAGE_MODEL` (default `gemini-2.0-flash-preview-image-generation`)

### `tools/channel-watcher`

- `COMIC_API_URL` (Cloud Run URL)
- `COMIC_API_INGEST_KEY` (must match cloud setting if enabled)
- `COMIC_COMMUNITY_ID` (default `tiltcheck-discord`)
- local fallback settings:
  - `OLLAMA_URL`, `COMIC_MODEL`, `COMIC_USE_AI`

## How To Test

## Automated checks run in this repo

- Syntax checks for service and scripts:
  - `node --check packages/comic-generator/src/index.js`
  - `node --check packages/comic-generator/src/gemini.js`
  - `node --check tools/channel-watcher/publish-comic-to-cloud.js`
  - `node --check apps/web/scripts/daily-comic.js`

## Manual verification checklist

1) Cloud service health:

```bash
curl <COMIC_API_URL>/health
```

Expected: `{"ok":true,...}`

1) Generate a strip:

```bash
curl -X POST <COMIC_API_URL>/v1/comic/generate \
  -H "Content-Type: application/json" \
  -H "x-comic-ingest-key: <COMIC_API_INGEST_KEY>" \
  -d '{
    "communityId":"tiltcheck-discord",
    "date":"2026-03-07",
    "timezone":"UTC",
    "messages":[{"author":"tester","timestamp":"2026-03-07T10:00:00.000Z","content":"weekly dropped and chaos started"}],
    "credits":{"creator":"jmenichole","visualInspiration":"samoxic","visualInspirationUrl":"https://pheverdream.github.io/The-Book-of-SealStats/"}
  }'
```

Expected:

- `ok: true`
- `comic.panels[0..2]` present
- `comic.storage.currentUrl` and `comic.storage.archiveUrl` present

1) Fetch current + archive:

```bash
curl "<COMIC_API_URL>/v1/comic/current?communityId=tiltcheck-discord"
curl "<COMIC_API_URL>/v1/comic/archive?communityId=tiltcheck-discord&limit=5"
```

Expected:

- current returns latest generated strip
- archive returns prior strips in descending order

1) Frontend render:

- Open homepage
- Confirm comic section shows:
  - current strip
  - last updated timestamp
  - samoxic visual inspiration credit + jmenichole attribution
  - archive list

1) Watcher publish:

```bash
cd tools/channel-watcher
npm run comic:publish
```

Expected:

- logs `Cloud comic publish success`
- cloud current/archive endpoints reflect latest day context
- optional full endpoint smoke test also passes via `npm --prefix packages/comic-generator run smoke:cloud`

## Troubleshooting

- `Cloud publish skipped`: set `COMIC_API_URL` in watcher `.env`.
- `401 invalid ingest key`: watcher `COMIC_API_INGEST_KEY` mismatch.
- `500 COMIC_GCS_BUCKET required`: missing service env var.
- timeout/network errors: verify Cloud Run service URL and IAM/public access mode.
- local AI fallback only: verify `OLLAMA_URL` and VM/firewall reachability.
