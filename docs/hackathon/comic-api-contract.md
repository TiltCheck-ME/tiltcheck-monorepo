# Daily Degen Comic API Contract

This contract defines how channel logs are converted into a generated comic strip for cloud delivery.

## Endpoint: `POST /v1/comic/generate`

Generates a daily strip and persists:
- `current.json` (latest strip)
- `archive.json` (all prior strips, newest first)
- panel image assets

### Auth

- Optional shared key header:
  - `x-comic-ingest-key: <COMIC_INGEST_KEY>`
- If `COMIC_INGEST_KEY` is unset, endpoint accepts unauthenticated requests.

### Request Body

```json
{
  "communityId": "tiltcheck-discord",
  "date": "2026-03-07",
  "timezone": "UTC",
  "messages": [
    {
      "author": "Droopy",
      "timestamp": "2026-03-07T05:56:47.107Z",
      "content": "I'm cheating..."
    }
  ],
  "credits": {
    "creator": "jmenichole",
    "visualInspiration": "samoxic",
    "visualInspirationUrl": "https://pheverdream.github.io/The-Book-of-SealStats/"
  },
  "source": {
    "logFile": "tools/channel-watcher/messages.jsonl",
    "generatedBy": "tools/channel-watcher/generate-daily-comic.js"
  }
}
```

### Validation Rules

- `communityId`: required, max 80 chars, `[a-zA-Z0-9_-]+`
- `date`: optional; defaults from latest message using timezone
- `timezone`: optional; defaults `UTC`
- `messages`: required, min 1, max `COMIC_MAX_MESSAGES` (default 180)
- message fields:
  - `author`: optional, clipped to 64 chars
  - `timestamp`: required ISO date
  - `content`: required, clipped to 300 chars
- `credits`: optional; defaults to configured values

### Response Body

```json
{
  "ok": true,
  "comic": {
    "communityId": "tiltcheck-discord",
    "generatedAt": "2026-03-07T12:00:00.000Z",
    "date": "2026-03-07",
    "timezone": "UTC",
    "title": "TiltCheck Daily Degen Comic",
    "subtitle": "Auto-built from today's channel logs.",
    "mood": "Chaotic hype",
    "oneLiner": "Weekly just dropped and sanity left the room.",
    "stats": {
      "messageCount": 98,
      "uniqueAuthors": 16,
      "topSpeakers": [{ "author": "A", "count": 10 }]
    },
    "panels": [
      {
        "title": "Opening Bell",
        "caption": "The room wakes up tilted.",
        "quote": "when 50k wager code for us",
        "imagePrompt": "discord scene with neon...",
        "imageUrl": "https://storage.googleapis.com/<bucket>/comics/tiltcheck-discord/2026-03-07/panel-1.png"
      }
    ],
    "credits": {
      "creator": "jmenichole",
      "visualInspiration": "samoxic",
      "visualInspirationUrl": "https://pheverdream.github.io/The-Book-of-SealStats/"
    },
    "source": {
      "generatedBy": "comic-generator-service"
    },
    "archiveRecent": []
  }
}
```

## Endpoint: `GET /v1/comic/current`

### Query
- `communityId` (optional, default `tiltcheck-discord`)

### Success
- Returns latest `current.json`.

## Endpoint: `GET /v1/comic/archive`

### Query
- `communityId` (optional)
- `limit` (optional, default `20`, max `100`)

### Success
- Returns array newest first.

## Storage Layout (Cloud Storage)

- `gs://<bucket>/comics/<communityId>/current.json`
- `gs://<bucket>/comics/<communityId>/archive.json`
- `gs://<bucket>/comics/<communityId>/<YYYY-MM-DD>/panel-1.png`
- `gs://<bucket>/comics/<communityId>/<YYYY-MM-DD>/panel-2.png`
- `gs://<bucket>/comics/<communityId>/<YYYY-MM-DD>/panel-3.png`

## Error Contract

- 400: invalid payload
- 401: invalid ingest key
- 404: current/archive not found
- 502: Gemini generation failure
- 500: storage or internal errors
