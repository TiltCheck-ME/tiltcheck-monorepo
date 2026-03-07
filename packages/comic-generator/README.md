# Comic Generator Service

Cloud-oriented service that turns daily channel context into a generated 3-panel comic with archive persistence.

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

## Cloud Run deploy (example)

```bash
gcloud run deploy comic-generator \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars COMIC_GCS_BUCKET=<bucket>,COMIC_STORAGE_PREFIX=comics,GEMINI_TEXT_MODEL=gemini-2.0-flash,GEMINI_IMAGE_MODEL=gemini-2.0-flash-preview-image-generation
```

Set secrets via Secret Manager for:

- `GEMINI_API_KEY`
- `COMIC_INGEST_KEY` (optional but recommended)

## One-command deploy

From repo root:

```bash
COMIC_GCS_BUCKET=<your-bucket> GEMINI_API_KEY=<your-key> COMIC_INGEST_KEY=<your-shared-key> npm --prefix packages/comic-generator run deploy:cloudrun
```

Windows PowerShell:

```powershell
$env:COMIC_GCS_BUCKET="<your-bucket>"
$env:GEMINI_API_KEY="<your-key>"
$env:COMIC_INGEST_KEY="<your-shared-key>"
npm --prefix packages/comic-generator run deploy:cloudrun:ps
```

Notes:

- If `PROJECT_ID` is not passed, the script uses your current `gcloud` project.
- Override defaults with env vars: `PROJECT_ID`, `REGION`, `SERVICE_NAME`, `ALLOW_UNAUTH`.
- After deploy, it prints `COMIC_API_URL` for `tools/channel-watcher/.env`.
