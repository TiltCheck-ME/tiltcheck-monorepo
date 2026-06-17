# v1 operations (parallel until v2 cutover)

Production marketing and the **legacy Chrome extension** remain on [`tiltcheck-monorepo`](https://github.com/your-org/tiltcheck-monorepo) until Phase 2 staging sign-off and DNS cutover ([phases.md](./phases.md)).

## Email crawler (stays on v1)

The bonus/email ingest crawler runs from the v1 monorepo and posts to the **production** API:

| Variable | Value |
|----------|--------|
| `CRAWLER_API_URL` | `https://api.tiltcheck.me` |

v2 does not expose `POST /rgaas/email-ingest` yet. Keep the crawler on v1 until that route ships on v2 API, then point `CRAWLER_API_URL` at the new host and re-run with `-Limit` if you need to drain backlog.

**Read path (today):** v1 `GET /bonuses?source=inbox&sort=urgency&limit=N` (see `tiltcheck-monorepo/docs/api/bonuses.md`). v2 web proxies this via `BONUSES_UPSTREAM_URL` until Supabase ingest exists.

## What moves to v2

| System | v2 location |
|--------|-------------|
| Marketing + casinos | `apps/web` on Railway |
| OAuth + vault + casino-scores | `apps/api` on Railway |
| User vault data | New Supabase project (users re-login at cutover) |
| Trust catalog seed | `pnpm seed:casinos` → `casino_scores` |

## Archive monorepo (after cutover)

1. Confirm DNS points at Railway web + api ([cutover-checklist.md](./cutover-checklist.md)).
2. Confirm Playwright staging gate was green.
3. Mark `tiltcheck-monorepo` **read-only** on GitHub (disable pushes or archive repo).
4. Keep the repo clone locally for reference — do not delete until email-ingest and any stragglers are migrated.

## Discord bot

Run v2 `apps/discord` on Railway with `TILTCHECK_API_URL` + optional `TILTCHECK_STATUS_BEARER` for `/vault status`. Retire v1 discord-bot when commands are verified on v2.
