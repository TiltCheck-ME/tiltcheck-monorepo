<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 -->

# Merge-then-thin-safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the two MERGEABLE PRs, open the Cooldown tip-guard PR for human review, pin Solana Pay 0.2.6 / web3.js 1.98.4 without leftover CI junk, close duplicate axios PR #671, and ship a CI AutoClaimer forbid-script so issue #545 can close.

**Architecture:** Queue ops first (gh merge / pr create / pin rebase-or-replace). Then a single Node walker `scripts/guard-no-autoclaimer.mjs` scans `apps/` and `packages/` and fails CI from the existing Brand Law Enforcer job. No new workflow. No knip. No Discord or kill-switch work.

**Tech Stack:** GitHub `gh` CLI, pnpm 10, Node ESM scripts, Vitest, GitHub Actions (`brand-law-enforcer.yml`).

## Global Constraints

- Squash-merge #686 then #687. Baseline non-blockers: `Dependency Vulnerability Audit`, `E2E Tests (Playwright)`.
- Tip-guard PR from `cursor/cooldown-p1-tip-guard-main`. Do not auto-merge. Title exactly: `feat(api): honor Cooldown locks on /tip/send and /tip/claim`.
- Fail-open stays the code default. Do not flip `COOLDOWN_GUARD_FAIL_CLOSED` to true in code.
- Pin only `@solana/web3.js@1.98.4` and `@solana/pay@0.2.6`. Do not bump `@solana/pay` to 1.x. Do not add root `pnpm.overrides` for those packages.
- If #626 rebase is dirtier than lockfile + those pins, close #626 and open a fresh pin PR from `main`.
- Close #671 as duplicate. Leave remaining Dependabot PRs open.
- AutoClaimer guard scans `apps/**` and `packages/**` for `.ts`, `.tsx`, `.js`, `.jsx`, `.json` plus any filename containing `autoclaim`. Do not scan `docs/`, `node_modules`, `dist`.
- Forbidden identifiers: `AutoClaimer`, `autoclaim`, `TG AutoClaimer` (case-insensitive). Ban list lives in the script only.
- Exit 1 message exactly: `AutoClaimer is out of scope for the player build. Do not ship it.`
- Wire the script into `.github/workflows/brand-law-enforcer.yml`. No new workflow file.
- Leave #541, #542, #555, #556, #558 open. No Notion. No Cooldown mainnet.
- Copyright header on every touched file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13`.
- Spec: `docs/superpowers/specs/2026-10-13-merge-then-thin-safety-design.md`.

---

### Task 1: Merge #686 and #687

**Files:**
- None (GitHub only)

**Interfaces:**
- Consumes: open PRs #686, #687
- Produces: those PRs in `MERGED` state on `main`

- [ ] **Step 1: Confirm MERGEABLE**

Run:

```bash
gh pr view 686 --json mergeable,mergeStateStatus,title --jq '"#686 " + .mergeable + " " + .mergeStateStatus + " " + .title'
gh pr view 687 --json mergeable,mergeStateStatus,title --jq '"#687 " + .mergeable + " " + .mergeStateStatus + " " + .title'
```

Expected: both `MERGEABLE`. `UNSTABLE` is allowed if the only failures are `Dependency Vulnerability Audit` and/or `E2E Tests (Playwright)`.

- [ ] **Step 2: Squash-merge #686 then #687**

```bash
gh pr merge 686 --squash
gh pr merge 687 --squash
```

Expected: both commands exit 0. `gh pr view 686 --json state` and `gh pr view 687 --json state` are `MERGED`.

- [ ] **Step 3: Fetch main**

```bash
git fetch origin main
```

Expected: `origin/main` moves forward.

---

### Task 2: Open the tip-guard PR (do not merge)

**Files:**
- None (GitHub only). Code already on `cursor/cooldown-p1-tip-guard-main`.

**Interfaces:**
- Consumes: branch `cursor/cooldown-p1-tip-guard-main`
- Produces: an open PR targeting `main`

- [ ] **Step 1: Create the PR**

```bash
gh pr create --base main --head cursor/cooldown-p1-tip-guard-main --title "feat(api): honor Cooldown locks on /tip/send and /tip/claim" --body "$(cat <<'EOF'
Credit tips never hit the chain. This HTTP read of GET /cooldown/check is the enforcement layer for POST /tip/send and POST /tip/claim. No keys. No funds held.

## Threat notes
- Active SCOPE_ALL Cooldown lock: 403, tip blocked.
- RPC / cooldown API failure: fail-open unless COOLDOWN_GUARD_FAIL_CLOSED=true. Prod should set true if self-exclusion must survive an outage.
- Sessions with no linked wallet skip the check. That gap stays. Not fixed here.
- GET /tips/log is session-auth, wallet-bound, 10 req/min.

## Tests
28 green at push (24 API tip/tips + 4 tilt-hint).

## Out of this PR
Discord bot wiring, on-chain settlement, CreditService, flipping the fail-open default.

Rollback: revert this PR. Unset the env var. Tips resume without a Cooldown check.

Do not auto-merge. Financial-flow review required.
EOF
)"
```

Expected: a PR URL. State `OPEN`. Do not run `gh pr merge`.

---

### Task 3: Solana pin — rebase #626 or replace it

**Files (if fresh PR):**
- Modify: every workspace `package.json` that lists `@solana/web3.js` or `@solana/pay` — set exact `1.98.4` and `0.2.6`
- Modify: `pnpm-lock.yaml` via `pnpm install --no-frozen-lockfile`

**Interfaces:**
- Consumes: PR #626 branch `cursor/ci-autofix-automation-ddb4`
- Produces: either a pin-only #626 or a new pin PR, plus #626 closed if replaced

- [ ] **Step 1: List #626 files**

```bash
gh pr view 626 --json files --jq '.files[].path'
```

- [ ] **Step 2: Decide**

If the file list is only `package.json` files plus `pnpm-lock.yaml` that change those two packages, rebase onto `origin/main`, resolve lockfile with `pnpm install --no-frozen-lockfile` (never `--theirs` on `package.json` if it downgrades `jsdom`), push, stop.

If any other files are in the PR (CI workflows, tests, docs, unrelated package bumps), skip rebase:

```bash
gh pr close 626 --comment "Closing: branch mixed a Solana Pay pin with unrelated CI autofix. Replacing with a pin-only PR. Pins stay @solana/web3.js@1.98.4 and @solana/pay@0.2.6. No 1.x."
```

Then from `origin/main` create `cursor/solana-pay-pin`, set `@solana/web3.js` to `1.98.4` and `@solana/pay` to `0.2.6` in every workspace package.json that already depends on them (including `apps/web` which is `^1.98.0` today), run `pnpm install --no-frozen-lockfile`, commit, push, open PR titled `fix(deps): pin Solana Pay 0.2.6 and web3.js 1.98.4`.

Do not add root `pnpm.overrides` for `@solana/*`.

- [ ] **Step 3: Frozen lockfile check**

```bash
pnpm install --frozen-lockfile
```

Expected: exit 0 after the pin commit exists on the pin branch.

---

### Task 4: Close duplicate axios PR #671

**Files:**
- None (GitHub only)

**Interfaces:**
- Consumes: PR #671
- Produces: #671 closed

- [ ] **Step 1: Close**

```bash
gh pr close 671 --comment "Duplicate: axios 1.16.0 to 1.20.0 already landed via #658. This branch is CONFLICTING leftover."
```

Expected: #671 `CLOSED`. Do not close other Dependabot PRs.

---

### Task 5: AutoClaimer guard — failing test first

**Files:**
- Create: `tests/guard-no-autoclaimer.test.ts`
- Create: `scripts/guard-no-autoclaimer.mjs` (minimal stub so the test file can import/spawn; full scan in Task 6)

**Interfaces:**
- Consumes: none
- Produces: `scripts/guard-no-autoclaimer.mjs` executable with `TILTCHECK_GUARD_ROOT` override. Exit 0/1.

- [ ] **Step 1: Write the failing test**

Create `tests/guard-no-autoclaimer.test.ts`:

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../scripts/guard-no-autoclaimer.mjs', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function run(root: string) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, TILTCHECK_GUARD_ROOT: root },
    encoding: 'utf8',
  });
}

describe('guard-no-autoclaimer', () => {
  it('exits 0 on the current tree', () => {
    const result = run(repoRoot);
    expect(result.status).toBe(0);
  });

  it('exits 1 when a fixture apps/autoclaimer.ts exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'no-autoclaimer-'));
    mkdirSync(join(dir, 'apps', 'fake'), { recursive: true });
    mkdirSync(join(dir, 'packages'), { recursive: true });
    writeFileSync(join(dir, 'apps', 'fake', 'autoclaimer.ts'), 'export const x = 1;\n');
    try {
      const result = run(dir);
      expect(result.status).toBe(1);
      expect(String(result.stderr) + String(result.stdout)).toContain(
        'AutoClaimer is out of scope for the player build. Do not ship it.',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run tests/guard-no-autoclaimer.test.ts`

Expected: FAIL (script missing, or missing env handling).

- [ ] **Step 3: Write the script**

Create `scripts/guard-no-autoclaimer.mjs`:

```js
#!/usr/bin/env node
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, basename } from 'node:path';

const FORBIDDEN = /AutoClaimer|TG AutoClaimer|autoclaim/i;
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.turbo', 'coverage']);
const ROOTS = ['apps', 'packages'];
const FAIL_LINE = 'AutoClaimer is out of scope for the player build. Do not ship it.';

const root = process.env.TILTCHECK_GUARD_ROOT || process.cwd();
const hits = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    const nameHit = FORBIDDEN.test(entry.name);
    const extOk = EXTENSIONS.has(extname(entry.name));
    if (!nameHit && !extOk) continue;
    if (nameHit) {
      hits.push(relative(root, full));
      continue;
    }
    const text = readFileSync(full, 'utf8');
    if (FORBIDDEN.test(text)) hits.push(relative(root, full));
  }
}

for (const rel of ROOTS) {
  try {
    if (statSync(join(root, rel)).isDirectory()) walk(join(root, rel));
  } catch {
    /* missing root in fixture trees is fine */
  }
}

if (hits.length > 0) {
  console.error(FAIL_LINE);
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log('No AutoClaimer identifiers in apps/ or packages/.');
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run tests/guard-no-autoclaimer.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/guard-no-autoclaimer.mjs tests/guard-no-autoclaimer.test.ts
git commit -m "test(ci): forbid AutoClaimer in apps and packages"
```

---

### Task 6: Wire Brand Law CI and close #545

**Files:**
- Modify: `package.json` scripts — add `"guard:no-autoclaimer": "node scripts/guard-no-autoclaimer.mjs"`
- Modify: `.github/workflows/brand-law-enforcer.yml` — add a step after Checkout
- Modify: `docs/SESSION_LOG.md` — one entry
- Modify: `package.json` header date to 2026-10-13 if not already

**Interfaces:**
- Consumes: `scripts/guard-no-autoclaimer.mjs` from Task 5
- Produces: Brand Law job runs `pnpm guard:no-autoclaimer` (or `node scripts/guard-no-autoclaimer.mjs` if pnpm is not installed in that job)

The Brand Law job currently has no setup-node / pnpm. Call `node scripts/guard-no-autoclaimer.mjs` directly so the job does not need pnpm.

- [ ] **Step 1: Add the npm script**

In `package.json` `scripts`, after `"knip:ci"`:

```json
"guard:no-autoclaimer": "node scripts/guard-no-autoclaimer.mjs",
```

- [ ] **Step 2: Add the workflow step**

In `.github/workflows/brand-law-enforcer.yml`, immediately after the Checkout step, insert:

```yaml
      - name: Forbid AutoClaimer in player surfaces
        run: node scripts/guard-no-autoclaimer.mjs
```

Update the workflow file header date to 2026-10-13.

- [ ] **Step 3: SESSION_LOG entry**

Append to `docs/SESSION_LOG.md`:

```md
## 2026-10-13 — guard: AutoClaimer never ships in the player build

CI walker `scripts/guard-no-autoclaimer.mjs` fails Brand Law if AutoClaimer identifiers return under apps/ or packages/. Closes #545. No product UI. No runtime kill switch.
```

- [ ] **Step 4: Run script + test on the real tree**

```bash
node scripts/guard-no-autoclaimer.mjs
pnpm exec vitest --run tests/guard-no-autoclaimer.test.ts
```

Expected: script exit 0, tests PASS.

- [ ] **Step 5: Commit, push, open PR, merge when MERGEABLE, close #545**

Branch: `cursor/guard-no-autoclaimer` from the current #545 work (or from `origin/main` after Tasks 1–4 if this task is isolated).

```bash
git add package.json .github/workflows/brand-law-enforcer.yml docs/SESSION_LOG.md scripts/guard-no-autoclaimer.mjs tests/guard-no-autoclaimer.test.ts
git commit -m "ci: fail Brand Law if AutoClaimer returns in apps or packages"
git push -u origin HEAD
gh pr create --title "ci: forbid AutoClaimer in player surfaces (#545)" --body "Dedicated walker, not knip. Brand Law job runs node scripts/guard-no-autoclaimer.mjs. Closes #545."
```

Merge only after `mergeable=MERGEABLE` and failures are only the two baseline checks. Then:

```bash
gh issue close 545 --comment "Closed: CI walker scripts/guard-no-autoclaimer.mjs fails Brand Law if AutoClaimer returns under apps/ or packages/. Spec: docs/superpowers/specs/2026-10-13-merge-then-thin-safety-design.md. History docs stay. No product UI. #541 and #542 stay open."
```

---

## Spec coverage

| Spec item | Task |
| :--- | :--- |
| Merge #686 then #687 | Task 1 |
| Open tip-guard PR, no auto-merge | Task 2 |
| #626 pin-only or replace | Task 3 |
| Close #671 | Task 4 |
| AutoClaimer script + test | Task 5 |
| Brand Law wire + close #545 | Task 6 |
| Leave #541 #542 RG issues open | Global constraints / no task |
| No Notion, no Dependabot except #671 | Task 4 + constraints |
| No fail-closed default flip | Task 2 body |

## Self-review

No TBD. Pin decision is a recorded if/else in Task 3, not a placeholder. Script and test are fully specified. Brand Law job uses `node` directly because that workflow has no pnpm setup.
