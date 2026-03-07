# Daily Degen Comic Architecture

## System Overview

```mermaid
flowchart TD
  discordChannel[DiscordChannel] --> watcher[tools/channel-watcher/index.js]
  watcher --> messageLog[messages.jsonl]
  messageLog --> localComic[generate-daily-comic.js]
  messageLog --> publishScript[publish-comic-to-cloud.js]
  publishScript --> comicApi[CloudRunComicGenerator]
  comicApi --> geminiText[GeminiTextModel]
  comicApi --> geminiImage[GeminiImageModel]
  comicApi --> gcsBucket[CloudStorageBucket]
  gcsBucket --> currentJson[current.json]
  gcsBucket --> archiveJson[archive.json]
  gcsBucket --> panelAssets[panel-images]
  webHome[apps/web comic section] --> cloudEndpoint[/api/comic or /v1/comic]
  webHome --> localFallback[/daily-degen-comic.json]
```

## Data Flow

1. `channel-watcher` scrapes Discord and writes `messages.jsonl`.
2. Local comic script always builds/archives local JSON payloads for offline fallback.
3. `publish-comic-to-cloud.js` sends latest day context to cloud API (`POST /v1/comic/generate`).
4. Cloud service calls Gemini for structured narrative + panel images.
5. Cloud service writes:
   - `comics/<communityId>/current.json`
   - `comics/<communityId>/archive.json`
   - `comics/<communityId>/<date>/panel-N.(png|svg)`
6. Homepage widget fetches cloud first, local JSON fallback second.

## Cost Controls

- One scheduled generation per day.
- Message cap (`COMIC_MAX_MESSAGES`) before generation.
- Fixed panel count (3) and one image per panel.
- Archive retention cap (`COMIC_ARCHIVE_LIMIT`).
- Optional shared-key protection on generation endpoint to avoid abuse.

## Reliability Controls

- Local JSON generation remains available if cloud/Gemini fails.
- Cloud image generation has SVG fallback for each panel.
- Cloud API validates input schema and returns explicit 4xx/5xx errors.
- Homepage falls back to local files automatically.
