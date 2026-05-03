<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Comic Generator Service

Cloud-oriented service that turns daily channel context into a generated 3-panel comic with archive persistence in Cloudflare R2.

## Endpoints

- `GET /health`
- `GET /v1/comic/current?communityId=tiltcheck-discord`
- `GET /v1/comic/archive?communityId=tiltcheck-discord&limit=20`
- `POST /v1/comic/generate`

## Local run

```bash
cd packages/comic-generator
npm install
cp .env.example .env
npm run start
```

## Generate request example

```bash
curl -X POST http://localhost:8080/v1/comic/generate \
  -H "Content-Type: application/json" \
  -H "x-comic-ingest-key: $COMIC_INGEST_KEY" \
  -d '{
    "communityId":"tiltcheck-discord",
    "date":"2026-03-07",
    "timezone":"UTC",
    "messages":[{"author":"Droopy","timestamp":"2026-03-07T05:56:47.107Z","content":"when weekly"}],
    "credits":{"creator":"jmenichole","visualInspiration":"samoxic","visualInspirationUrl":"https://pheverdream.github.io/The-Book-of-SealStats/"}
  }'
```

## Storage and access

- Object storage: Cloudflare R2 via S3-compatible API
- API archive/current endpoints stay stable regardless of object storage URLs
- Optional `COMIC_PUBLIC_BASE_URL` can be set if you want panel assets to return public object URLs instead of inline fallback SVG data URLs

## Local run

Requires the R2 env values from `.env.example`.

## Deploy notes

This package was migrated off GCS. Use the R2 env vars from `.env.example`:

- `COMIC_R2_BUCKET`
- `COMIC_R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- optional `COMIC_PUBLIC_BASE_URL`

The README still documents the API contract; deployment should follow your current Railway / container flow rather than the old single-runtime examples.

## One-command cloud smoke test

From repo root (after deploy):

```bash
COMIC_API_URL=https://your-comic-api.example.com COMIC_API_INGEST_KEY=<your-shared-key> npm --prefix packages/comic-generator run smoke:cloud
```

The smoke test checks, in order:

- `GET /health`
- `POST /v1/comic/generate`
- `GET /v1/comic/current`
- `GET /v1/comic/archive`
