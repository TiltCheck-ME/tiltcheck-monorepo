# Daily Degen Comic Hackathon Submission Checklist

## Category Alignment

- [ ] Submit under Creative Storyteller category.
- [ ] Confirm Gemini is used for multimodal generation.
- [ ] Confirm backend is hosted on Google Cloud (Cloud Run).

## Required Submission Assets

- [ ] Public code repository URL with full spin-up instructions.
- [ ] Project write-up: features, stack, data sources, learnings.
- [ ] Cloud proof:
  - [ ] screen recording showing Cloud Run deployment + live logs, or
  - [ ] linked code/config showing Google Cloud services in use.
- [ ] Architecture diagram attached (see `comic-architecture.md`).
- [ ] Demo video under 4 minutes with real-time functionality.

## Demo Video Structure (Suggested)

1. Problem framing (20-30s): degen chat chaos, info overload.
2. Input capture (40s): channel watcher log + selected daily context.
3. Generation (70s): cloud endpoint call returning comic + panel images.
4. Product view (60s): homepage section shows strip, timestamp, archive.
5. Cloud proof + closing (30-40s): Cloud Run + storage objects.

## Technical Validation

- [ ] `POST /v1/comic/generate` works with ingest key.
- [ ] `GET /v1/comic/current` returns latest strip.
- [ ] `GET /v1/comic/archive` returns prior strips.
- [ ] Panel image URLs resolve from Cloud Storage.
- [ ] Home page cloud-first, local-fallback loading works.

## Deployment and Environment

- [ ] `GEMINI_API_KEY` configured as cloud secret.
- [ ] `COMIC_GCS_BUCKET` configured.
- [ ] `COMIC_INGEST_KEY` configured.
- [ ] CORS configured for website origin(s).
- [ ] Scheduled run configured (Cloud Scheduler or watcher schedule).

## Bonus Opportunities

- [ ] Add deployment automation scripts / IaC snippet.
- [ ] Publish technical build post and include challenge hashtag.
