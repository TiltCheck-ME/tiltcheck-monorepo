# Launch Cutover — Execution Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement task-by-task. Checkboxes track progress.

**Goal:** Complete remaining engineering work for B+D launch (M0–M5) while operator follows [LAUNCH-CHECKLIST.md](../../LAUNCH-CHECKLIST.md).

**Architecture:** v1 frozen for ops; MVP (`tiltcheckmvp`) is production target after M1 gate. Bonuses upstream proxy until M3 email-ingest.

**Spec:** [2026-06-17-launch-cutover-plan.md](../specs/2026-06-17-launch-cutover-plan.md)

---

## Already done (do not redo)

- v1 P0 security merged (#591)
- Degen Copilot design spec (#594, #595 doc)
- MVP Phase 1 web + API staging deployed (health, casino-scores, OAuth shell)
- Local MVP branches: daily bonus feed, web sitemap/404 (awaiting owner push)
- v1 WEB-SITEMAP + styled sitemap/404 on branch `cursor/web-sitemap-ec58`

---

### Task 1: Commit launch documentation (v1 monorepo)

**Files:**
- `docs/superpowers/specs/2026-06-17-launch-cutover-plan.md`
- `docs/LAUNCH-CHECKLIST.md`
- `docs/superpowers/plans/2026-06-17-launch-cutover-execution.md`
- `docs/metrics-weekly.md`
- `docs/ai/hybrid-v1-mvp-strategy.md` (link updates)
- `docs/migration/tiltcheckmvp-launch/README.md` + doc copies

- [ ] All files committed on `cursor/launch-cutover-plan-ec58`
- [ ] PR opened against v1 `main`

---

### Task 2: MVP — merge bonus feed branch

**Repo:** `jmenichole/tiltcheckmvp`  
**Branch:** `cursor/daily-bonus-feed-port-ec58`

**Files:** `apps/api` bonuses routes, `apps/web` `/bonuses`, shared types

- [ ] Owner pushes branch (403 workaround)
- [ ] `pnpm build` passes on MVP
- [ ] PR merged to MVP `main`
- [ ] Staging web `/bonuses` shows daily picks (upstream or local)

**Reference:** `docs/migration/tiltcheckmvp-bonus-feed-port.md`

---

### Task 3: MVP — merge web SEO branch

**Branch:** `cursor/web-sitemap-ec58`

**Files:**
- `apps/web/src/lib/sitemap-entries.ts`, `sitemap-xml.ts`
- `apps/web/src/app/sitemap.xml/route.ts`
- `apps/web/public/sitemap.xsl`
- `apps/web/src/app/site-map/page.tsx`
- `apps/web/src/app/not-found.tsx`

- [ ] Owner pushes branch
- [ ] Verify `/sitemap.xml`, `/site-map`, 404 recovery links
- [ ] PR merged to MVP `main`

**Reference:** `docs/migration/tiltcheckmvp-web-seo/README.md`

---

### Task 4: M3 — Email ingest on MVP API

**Blocks:** Moving crawler off v1

**Files (expected):**
- `apps/api/src/routes/rgaas/email-ingest.ts` (or equivalent)
- Auth middleware matching v1 `EMAIL_INGEST_SECRET` pattern
- Supabase table for ingested bonus emails
- `apps/web` remove `BONUSES_UPSTREAM_URL` dependency when ingest live

**Steps:**
- [ ] Port v1 ingest handler logic (fail-closed secret check)
- [ ] Add tests for auth rejection + happy path
- [ ] Document env var in MVP `deploy.md`
- [ ] Operator updates crawler `CRAWLER_API_URL` (checklist M3)

**Risk:** Auth mismatch breaks crawler — validate with `--limit 5` dry run.

---

### Task 5: M4 — Phase 3 dashboard tabs

**Order:** analytics → buddies → bonuses tab

**Per tab:**
- [ ] API routes + Supabase schema if needed
- [ ] Web dashboard tab component
- [ ] Basic loading/error states
- [ ] Update `phases.md` ship gate when each lands

**Not required for M2 cutover.**

---

### Task 6: M4 — Degen Copilot Phase 1 (configure)

**Spec:** [2026-06-17-degen-copilot-design.md](../specs/2026-06-17-degen-copilot-design.md)

**Minimum slice:**
- [ ] Tool registry (fixed intents, no codegen)
- [ ] `POST /copilot/chat` + `POST /copilot/confirm`
- [ ] Web dashboard copilot panel OR extension bubble (pick one surface first)
- [ ] Preview + explicit confirm before vault writes

**Defer:** Compose/recipes (Phase 2 of copilot), Discord surface until web/ext stable.

---

### Task 7: M5 — Tools + Discord bot

**Tools (one at a time):**
- [ ] session-stats
- [ ] verify
- [ ] house-edge

**Discord:**
- [ ] `apps/discord` deploy on Railway
- [ ] `/vault status` against MVP API
- [ ] Retire v1 bot after parity check

---

### Task 8: Telemetry for north-star KPI

**Goal:** Count protected sessions/week in prod

- [ ] Extension posts enforcement event to API (or batch)
- [ ] API stores anonymized event with `userId`, timestamp, rule type
- [ ] Optional: weekly rollup query or admin endpoint

**Until built:** Manual count from staging sign-off + prod smoke logs.

---

## Verification commands

```bash
# MVP root
pnpm build
pnpm test:e2e

# Extension staging build
cd apps/extension && EXTENSION_API_URL=https://api-staging.tiltcheck.me node build.js

# v1 crawler (until M3)
pnpm crawl:emails -- --limit 10
```

---

## Operator handoff

When Tasks 1–3 are done, operator continues from [LAUNCH-CHECKLIST.md § M1](../../LAUNCH-CHECKLIST.md).

Agent work for Tasks 4–8 happens **after M2** unless explicitly prioritized.
