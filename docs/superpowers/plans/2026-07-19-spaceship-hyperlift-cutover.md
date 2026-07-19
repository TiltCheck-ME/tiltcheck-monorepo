# Spaceship Hyperlift Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Spaceship Hyperlift the phase-1 home for `tiltcheck.me` (web) and `api.tiltcheck.me` (api) behind Cloudflare DNS, with Railway parked and docs matching reality.

**Architecture:** Dual Hyperlift apps built from existing `apps/web/Dockerfile` and `apps/api/Dockerfile` (monorepo root context). Cloudflare CNAMEs point at Hyperlift origins — no tunnel. Repo work is mostly cutover runbook + deploy inventory updates + park Railway workflow; founder executes Hyperlift UI and Cloudflare DNS. VPS compose plan remains path B.

**Tech Stack:** Spaceship Starlight Hyperlift, Cloudflare DNS, Docker (`apps/web`, `apps/api`), GitHub Actions (park Railway), Markdown ops docs, vitest for API port contract.

**Spec:** [docs/superpowers/specs/2026-07-19-spaceship-hyperlift-cutover-design.md](../specs/2026-07-19-spaceship-hyperlift-cutover-design.md)

## Global Constraints

- Copyright header on new/modified docs: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-19`
- No emojis in new docs
- Phase 1 = web + api only; Discord bots not deployed
- Edge = Cloudflare DNS → Hyperlift (no `cloudflared`)
- Promo/Gmail durability deferred
- Keep VPS exit plan open as path B
- Atomic docs with code/workflow changes
- Do not commit secrets (Hyperlift env is dashboard-only)

## File map

| Path | Responsibility |
|------|----------------|
| `apps/api/tests/runtime-config.test.ts` | Prove Hyperlift-friendly default `PORT=8080` when unset in production |
| `docs/migration/spaceship-hyperlift-cutover.md` | Canonical phase-1 runbook (env, DNS, smoke, rollback) |
| `docs/DEPLOY.md` | Production target = Hyperlift dual-app; Railway dead |
| `AGENTS.md` | Deployment reality table matches DEPLOY.md |
| `docs/migration/exit-railway-plan.md` | Banner: path B after Hyperlift phase 1 |
| `docs/history/HYPERLIFT.md` | Obsolete banner → new cutover doc |
| `docs/history/HYPERLIFT-ALL-IN-ONE.md` | Obsolete banner |
| `docs/history/HYPERLIFT-INSTANCES.md` | Obsolete banner |
| `docs/history/SPACESHIP-DEPLOYMENT-ENV.md` | Obsolete banner |
| `.github/workflows/deploy-railway.yml` | Remove `push` trigger; `workflow_dispatch` only + header note |

---

### Task 1: Hyperlift port contract test (API)

**Files:**
- Modify: `apps/api/tests/runtime-config.test.ts`
- Modify: `apps/api/src/runtime-config.ts` only if a test reveals a real bug (unlikely — production already defaults to 8080)

**Interfaces:**
- Consumes: `resolveApiPort(env: ApiRuntimeEnv): number`
- Produces: test coverage that unset `PORT` in production → `8080` (Hyperlift default)

- [ ] **Step 1: Add failing-first assertion for unset production PORT**

Append to `apps/api/tests/runtime-config.test.ts`:

```ts
  it('defaults production to 8080 when PORT is unset (Hyperlift contract)', () => {
    expect(resolveApiPort({ NODE_ENV: 'production' })).toBe(8080);
  });
```

- [ ] **Step 2: Run the test**

```bash
pnpm exec vitest --run apps/api/tests/runtime-config.test.ts
```

Expected: PASS (existing `resolveApiPort` already returns 8080 when production PORT missing). If FAIL, fix `resolveApiPort` minimally so production unset → 8080 without breaking the other three cases.

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/runtime-config.test.ts apps/api/src/runtime-config.ts
git commit -m "test(api): assert production PORT defaults to 8080 for Hyperlift"
```

---

### Task 2: Canonical Spaceship Hyperlift cutover runbook

**Files:**
- Create: `docs/migration/spaceship-hyperlift-cutover.md`

**Interfaces:**
- Consumes: decisions from the design spec
- Produces: ops checklist founders follow in Spaceship + Cloudflare dashboards

- [ ] **Step 1: Write the runbook**

Create `docs/migration/spaceship-hyperlift-cutover.md` with exactly these sections (fill content; no TBD):

1. Header copyright + title **Spaceship Hyperlift Cutover (Phase 1)**
2. **Scope** — web + api only; Discord/tunnel/persistence out
3. **Architecture diagram** (text) matching the spec
4. **Prerequisites** — Spaceship Hyperlift account, GitHub connected, Cloudflare zone for `tiltcheck.me`, secrets ready offline (not in git)
5. **Create Hyperlift apps** table:

| App name (suggested) | Dockerfile | Build context | Public host |
|----------------------|------------|---------------|-------------|
| `tiltcheck-web` | `apps/web/Dockerfile` | repository root `.` | `tiltcheck.me`, `www` |
| `tiltcheck-api` | `apps/api/Dockerfile` | repository root `.` | `api.tiltcheck.me` |

6. **Environment variables**

Web (set as **build-time** where Hyperlift requires for Next):

```bash
NODE_ENV=production
PORT=8080
HOSTNAME=0.0.0.0
SITE_URL=https://tiltcheck.me
PUBLIC_BASE_URL=https://tiltcheck.me
NEXT_PUBLIC_API_URL=https://api.tiltcheck.me
# NEXT_PUBLIC_DASHBOARD_URL optional in phase 1 — omit or point at future host
```

API (runtime):

```bash
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
JWT_SECRET=<generate>
DISCORD_CLIENT_ID=<if OAuth routes enabled>
DISCORD_CLIENT_SECRET=<if OAuth routes enabled>
# Do not enable SKIP_ENV_VALIDATION in real prod unless temporarily unblocking a known gap
```

7. **Cloudflare DNS** — keep Spaceship as registrar / CF as NS; set:

| Name | Type | Target | Proxy |
|------|------|--------|-------|
| `@` / `tiltcheck.me` | CNAME (or A/AAAA per Hyperlift docs) | Hyperlift web origin | Proxied OK |
| `www` | CNAME | Hyperlift web origin or apex | Proxied OK |
| `api` | CNAME | Hyperlift api origin | Proxied OK |

Remove/disable old Railway / Cloudflare Tunnel CNAMEs for those hosts before cutover.

8. **Deploy order** — build api → smoke Hyperlift URL `/health` → build web → smoke Hyperlift URL `/` → attach custom domains → flip Cloudflare DNS → smoke custom domains
9. **Verification** — copy the four checks from the spec
10. **Rollback** — revert Cloudflare records; Pages twin may serve marketing only; API may be down
11. **Path B** — link `docs/migration/exit-railway-plan.md` (VPS+compose+tunnel later)
12. **Deferred** — Gmail crawl, promo durability, Discord bots

- [ ] **Step 2: Commit**

```bash
git add docs/migration/spaceship-hyperlift-cutover.md
git commit -m "docs(ops): Spaceship Hyperlift phase-1 cutover runbook"
```

---

### Task 3: Mark historical Hyperlift docs obsolete

**Files:**
- Modify: `docs/history/HYPERLIFT.md` (insert banner after title)
- Modify: `docs/history/HYPERLIFT-ALL-IN-ONE.md`
- Modify: `docs/history/HYPERLIFT-INSTANCES.md`
- Modify: `docs/history/SPACESHIP-DEPLOYMENT-ENV.md`

**Interfaces:**
- Produces: readers redirected to `docs/migration/spaceship-hyperlift-cutover.md`

- [ ] **Step 1: Insert the same obsolete banner at the top of each file** (after any existing H1, before Overview)

```markdown
> **OBSOLETE (2026-07-19):** Paths like `Dockerfile.unified` and `services/landing` no longer exist.
> Use **[docs/migration/spaceship-hyperlift-cutover.md](../migration/spaceship-hyperlift-cutover.md)** for phase-1 Hyperlift (`apps/web` + `apps/api`).
```

For `SPACESHIP-DEPLOYMENT-ENV.md`, also note that env lists may still hint variable *names*, but Dockerfile paths and PORT assumptions in that file are not authoritative.

- [ ] **Step 2: Commit**

```bash
git add docs/history/HYPERLIFT.md docs/history/HYPERLIFT-ALL-IN-ONE.md docs/history/HYPERLIFT-INSTANCES.md docs/history/SPACESHIP-DEPLOYMENT-ENV.md
git commit -m "docs: mark historical Hyperlift guides obsolete"
```

---

### Task 4: Update DEPLOY.md + AGENTS.md + VPS plan banner

**Files:**
- Modify: `docs/DEPLOY.md`
- Modify: `AGENTS.md` (section 4 Deployment Reality table)
- Modify: `docs/migration/exit-railway-plan.md`

**Interfaces:**
- Produces: single source of truth that production phase 1 = Hyperlift dual-app

- [ ] **Step 1: Rewrite `docs/DEPLOY.md` "Current Reality" bullets**

Replace the production bullets so they say:

- Phase-1 production compute: Spaceship Starlight Hyperlift dual apps (`apps/web`, `apps/api`) — runbook `docs/migration/spaceship-hyperlift-cutover.md`
- Public edge: Cloudflare DNS → Hyperlift origins (no tunnel required for phase 1)
- Railway workflow is parked (`workflow_dispatch` only); Railway is not the live host
- VPS compose (`deploy-stack.yml` + `exit-railway-plan.md`) remains an optional later path
- Hub Worker + GitHub Pages remain separate surfaces

Update the inventory rows for `api` and `web`:

| Deployable | Delivery | Workflow | Notes |
|------------|----------|----------|-------|
| `api` | Hyperlift Dockerfile deploy | Spaceship dashboard (see cutover runbook) | Smoke `https://api.tiltcheck.me/health` |
| `web` | Hyperlift Dockerfile deploy | Spaceship dashboard | Smoke `https://tiltcheck.me/` |

Keep other rows but mark Railway delivery as **parked / not phase-1**.

Bump header date to `2026-07-19`.

- [ ] **Step 2: Update `AGENTS.md` section 4 table**

For `api` and `web` rows: Delivery = `Spaceship Hyperlift`; Source of Truth = `docs/migration/spaceship-hyperlift-cutover.md`; Verdict = Live phase-1 target (or "Wire per cutover runbook").

Add a short note under the table: Railway GHCR workflow parked; Discord bots optional/not phase-1; VPS plan is path B.

Bump AGENTS copyright/Last Updated to `2026-07-19` where present.

- [ ] **Step 3: Banner on `docs/migration/exit-railway-plan.md`**

Insert after the H1:

```markdown
> **Path B (2026-07-19):** Phase-1 production home is Spaceship Hyperlift
> (`docs/migration/spaceship-hyperlift-cutover.md`). This VPS+tunnel plan remains valid
> if Hyperlift is left later; do not treat Railway as live.
```

- [ ] **Step 4: Commit**

```bash
git add docs/DEPLOY.md AGENTS.md docs/migration/exit-railway-plan.md
git commit -m "docs(deploy): Hyperlift phase-1 production target; VPS path B"
```

---

### Task 5: Park Railway deploy workflow

**Files:**
- Modify: `.github/workflows/deploy-railway.yml`

**Interfaces:**
- Produces: no automatic Railway redeploys on `main` push (saves Actions minutes + avoids dead-host thrash)

- [ ] **Step 1: Change triggers**

Replace the `on:` block with:

```yaml
on:
  # Parked 2026-07-19: Railway is not the live host. Manual only if account restored.
  workflow_dispatch:
```

Update the file header comment / date to note parked status and point to `docs/migration/spaceship-hyperlift-cutover.md`.

Do **not** delete the workflow — keep GHCR build logic available for manual dispatch / future VPS image builds if still useful. If the workflow's only purpose was Railway redeploy and GHCR builds are also unused, leaving `workflow_dispatch` is enough.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-railway.yml
git commit -m "ci: park deploy-railway.yml (workflow_dispatch only)"
```

---

### Task 6: Founder ops checklist (documented, not automated)

**Files:**
- Modify: `docs/migration/spaceship-hyperlift-cutover.md` — ensure a final **Founder execution checklist** with unchecked boxes exists (add if missing from Task 2)

**Interfaces:**
- Produces: human-executable cutover steps; agent does not require Spaceship/Cloudflare credentials

- [ ] **Step 1: Append checklist**

```markdown
## Founder execution checklist

- [ ] Connect GitHub repo to Hyperlift
- [ ] Create `tiltcheck-api` app (Dockerfile `apps/api/Dockerfile`, context `.`)
- [ ] Set API env; build; confirm `/health` on Hyperlift URL
- [ ] Create `tiltcheck-web` app (Dockerfile `apps/web/Dockerfile`, context `.`)
- [ ] Set web build/runtime env including `NEXT_PUBLIC_API_URL`; build; confirm `/` on Hyperlift URL
- [ ] Attach custom domains in Hyperlift if required
- [ ] Cloudflare: point apex/`www`/`api` at Hyperlift; remove tunnel/Railway leftovers
- [ ] Smoke `https://tiltcheck.me/`, `https://api.tiltcheck.me/health`, `https://tiltcheck.me/bonuses`
- [ ] Confirm `deploy-railway.yml` is parked on `main`
```

- [ ] **Step 2: Commit if checklist was added/changed**

```bash
git add docs/migration/spaceship-hyperlift-cutover.md
git commit -m "docs(ops): founder Hyperlift cutover checklist"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Dual Hyperlift apps web+api | Task 2 runbook |
| CF DNS no tunnel | Task 2 + Task 6 |
| Discord out of phase 1 | Task 2 scope |
| Durability deferred | Task 2 deferred |
| VPS path open | Task 4 banner |
| Obsolete history docs | Task 3 |
| DEPLOY/AGENTS update | Task 4 |
| Park Railway workflow | Task 5 |
| PORT / Hyperlift 8080 | Task 1 (+ runbook env) |
| Verification / rollback | Task 2 + Task 6 |

## Out of plan (do not implement here)

- Creating Hyperlift apps or changing Cloudflare DNS from the agent (founder)
- Supabase/volume promo persistence
- Gmail Apps Script / crawler automation
- Unified Dockerfile
- Discord bot Hyperlift apps
