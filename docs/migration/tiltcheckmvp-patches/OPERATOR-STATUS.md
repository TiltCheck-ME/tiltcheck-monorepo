<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 -->

# MVP Branch Push — Operator Status

Cloud agents cannot push to `jmenichole/tiltcheckmvp` (403). Owner must complete these steps with a fine-grained PAT.

## Required pushes

| Branch | Patches | Status |
|--------|---------|--------|
| `cursor/daily-bonus-feed-port-ec58` | `docs/migration/tiltcheckmvp-patches/daily-bonus-feed/*.patch` | Pending owner push |
| `cursor/web-sitemap-ec58` | `docs/migration/tiltcheckmvp-patches/web-sitemap/*.patch` | Pending owner push |

See [PUSH-GUIDE.md](./PUSH-GUIDE.md) for commands.

## v1 monorepo PR triage (completed by agent)

| PR | Action |
|----|--------|
| #609 | CI gate + infra fixes — merge when green |
| #595 | Doc-only copilot spec — merge when green |
| #590, #583, #584 | Closed — MVP owns product; v1 ops-only |
| #586 | Closed — ws override in security PR |
| #573–#605 drafts | Closed — superseded |

## Railway secrets (M0)

- [ ] `EMAIL_INGEST_SECRET` set on v1 API
- [ ] `INTERNAL_SERVICE_TOKEN` set on v1 API
