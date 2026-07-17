# Research + Task Ops Employee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a cheap in-repo loop that fetches allowlisted competitor pages, writes sourced research briefs under `docs/research/`, merges gap + recurring tasks into `docs/ops/linear-tasks.json` (max 5/run), and syncs to Linear via existing `scripts/linear-sync.mjs`.

**Architecture:** Pure Node ESM scripts (no monorepo build). Config JSON drives competitors/axes. Heuristic HTML keyword scoring fills a matrix with `yes|no|partial|unknown`; optional OpenAI-compatible LLM may only structure text already fetched. GitHub Actions cron opens a PR with artifacts; Linear sync runs when secrets exist.

**Tech Stack:** Node 20 ESM, vitest, GitHub Actions, Linear GraphQL API (existing), optional `RESEARCH_LLM_*` env.

**Spec:** [docs/superpowers/specs/2026-07-17-research-ops-employee-design.md](../specs/2026-07-17-research-ops-employee-design.md)

## Global Constraints

- Copyright header on every new/modified file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17`
- No emojis in code, comments, or docs
- UI/docs footers include: `Made for Degens. By Degens.`
- Atomic docs: update runbooks in the same commit as code
- Never invent competitor facts: cells without evidence stay `unknown`
- Max 5 new tasks merged per run
- Task keys: `RES-*` research, `REC-*` recurring; Linear markers `[tc-task:<key>]`
- Labels only: `RESEARCH` | `FEATURE` | `RECURRING`
- No new npm dependencies unless unavoidable (use Node `fetch` + built-ins)
- Scripts must run with `node scripts/...` without requiring `pnpm -r build`

## File map

| Path | Responsibility |
|------|----------------|
| `docs/ops/research-competitors.json` | Allowlist URLs + feature axes + keyword hints |
| `docs/ops/recurring-tasks.json` | Recurring templates + cadence |
| `docs/ops/recurring-state.json` | `lastQueuedAt` per recurring key |
| `scripts/ops/lib/research-matrix.mjs` | Pure: score HTML → cell + gap tasks |
| `scripts/ops/lib/research-brief-format.mjs` | Pure: markdown + sidecar JSON |
| `scripts/ops/research-brief.mjs` | CLI: fetch → matrix → write brief + sidecar |
| `scripts/ops/merge-proposed-tasks.mjs` | CLI: merge sidecar + due recurring into linear-tasks.json |
| `tests/ops/research-matrix.test.ts` | Unit tests for matrix + gaps |
| `tests/ops/merge-proposed-tasks.test.ts` | Unit tests for merge/cap/dedupe |
| `.github/workflows/research-ops.yml` | Cron + dispatch → PR |
| `package.json` | `ops:research:*` scripts |
| `docs/ops/LINEAR-WORKFLOW.md` | Document research ops commands |
| `docs/research/.gitkeep` | Ensure directory exists |
| `docs/research/README.md` | Brief index + rules |

---

### Task 1: Competitor config + matrix scoring (TDD)

**Files:**
- Create: `docs/ops/research-competitors.json`
- Create: `scripts/ops/lib/research-matrix.mjs`
- Create: `tests/ops/research-matrix.test.ts`

**Interfaces:**
- Consumes: competitor config JSON shape below
- Produces:
  - `scorePage(html: string, axisHints: Record<string, string[]>): 'yes' | 'no' | 'partial' | 'unknown'`
  - `buildMatrix(results: FetchResult[], axes: string[], hints: Record<string, string[]>): Matrix`
  - `gapsFromMatrix(matrix: Matrix): Gap[]`
  - `proposedTasksFromGaps(gaps: Gap[], date: string, max: number): ProposedTask[]`

- [ ] **Step 1: Write failing tests**

Create `tests/ops/research-matrix.test.ts`:

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 */
import { describe, expect, it } from 'vitest';
import {
  scorePage,
  buildMatrix,
  gapsFromMatrix,
  proposedTasksFromGaps,
} from '../../scripts/ops/lib/research-matrix.mjs';

describe('scorePage', () => {
  it('returns unknown for empty html', () => {
    expect(scorePage('', { trust_scoring: ['safety index', 'trust score'] })).toBe('unknown');
  });

  it('returns yes when a strong keyword appears', () => {
    const html = '<p>Our Safety Index rates every casino.</p>';
    expect(scorePage(html, { trust_scoring: ['safety index'] })).toBe('yes');
  });

  it('returns unknown when keywords absent', () => {
    const html = '<p>Welcome to our blog about sports.</p>';
    expect(scorePage(html, { trust_scoring: ['safety index', 'trust score'] })).toBe('unknown');
  });
});

describe('gapsFromMatrix + proposedTasksFromGaps', () => {
  it('lists unknown cells and caps proposed tasks at 5', () => {
    const matrix = {
      AskGamblers: { trust_scoring: { value: 'unknown', url: 'https://example.com' } },
      'Casino.guru': { trust_scoring: { value: 'yes', url: 'https://casino.guru' } },
      'Casino.org': { ai_link_scan: { value: 'unknown', url: null } },
    };
    const gaps = gapsFromMatrix(matrix);
    expect(gaps.length).toBe(2);
    const tasks = proposedTasksFromGaps(gaps, '2026-07-17', 5);
    expect(tasks.length).toBe(2);
    expect(tasks[0].key.startsWith('RES-2026-07-17-')).toBe(true);
    expect(tasks[0].labels).toContain('RESEARCH');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run tests/ops/research-matrix.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Add config file**

Create `docs/ops/research-competitors.json`:

```json
{
  "copyright": "© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17",
  "axes": [
    "ai_link_scan",
    "trust_scoring",
    "redeem_vault",
    "pricing",
    "community_reach"
  ],
  "axisHints": {
    "ai_link_scan": ["scam link", "link scanner", "phishing", "url check", "ai scan"],
    "trust_scoring": ["trust score", "safety index", "safety score", "rating methodology"],
    "redeem_vault": ["vault", "cash out", "redeem", "withdrawal lock", "cooldown"],
    "pricing": ["pricing", "subscription", "per month", "$/", "plans"],
    "community_reach": ["monthly visits", "discord", "community", "members", "traffic"]
  },
  "competitors": [
    {
      "id": "askgamblers",
      "name": "AskGamblers",
      "urls": ["https://www.askgamblers.com/", "https://www.askgamblers.com/gambling-news"]
    },
    {
      "id": "casino-guru",
      "name": "Casino.guru",
      "urls": ["https://casino.guru/", "https://casino.guru/about"]
    },
    {
      "id": "casino-org",
      "name": "Casino.org",
      "urls": ["https://www.casino.org/"]
    },
    {
      "id": "fairgambling",
      "name": "FairGambling",
      "urls": ["https://fairgambling.org/"]
    },
    {
      "id": "trustedgamble",
      "name": "TrustedGamble",
      "aliases": ["TrustedGamble", "TrusteelGamble", "Trusted Gambler"],
      "urls": ["https://trustedgamble.com/"]
    }
  ]
}
```

- [ ] **Step 4: Implement `scripts/ops/lib/research-matrix.mjs`**

```js
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
 */

/**
 * @typedef {'yes'|'no'|'partial'|'unknown'} CellValue
 * @typedef {{ value: CellValue, url: string|null }} Cell
 * @typedef {Record<string, Record<string, Cell>>} Matrix
 * @typedef {{ competitor: string, axis: string, url: string|null }} Gap
 * @typedef {{ key: string, title: string, description: string, priority: number, labels: string[] }} ProposedTask
 */

export function scorePage(html, axisHintsForOneAxis) {
  const text = String(html || '').toLowerCase();
  if (!text.trim()) return 'unknown';
  const hints = Array.isArray(axisHintsForOneAxis) ? axisHintsForOneAxis : [];
  let hits = 0;
  for (const hint of hints) {
    if (hint && text.includes(String(hint).toLowerCase())) hits += 1;
  }
  if (hits >= 2) return 'yes';
  if (hits === 1) return 'partial';
  return 'unknown';
}

/**
 * @param {{ name: string, url: string|null, ok: boolean, html: string }[]} results
 * @param {string[]} axes
 * @param {Record<string, string[]>} axisHints
 */
export function buildMatrix(results, axes, axisHints) {
  /** @type {Matrix} */
  const matrix = {};
  for (const row of results) {
    matrix[row.name] = {};
    for (const axis of axes) {
      if (!row.ok || !row.html) {
        matrix[row.name][axis] = { value: 'unknown', url: row.url };
        continue;
      }
      const value = scorePage(row.html, axisHints[axis] || []);
      matrix[row.name][axis] = {
        value,
        url: value === 'unknown' ? row.url : row.url,
      };
    }
  }
  return matrix;
}

export function gapsFromMatrix(matrix) {
  /** @type {Gap[]} */
  const gaps = [];
  for (const [competitor, axes] of Object.entries(matrix)) {
    for (const [axis, cell] of Object.entries(axes)) {
      if (cell.value === 'unknown') {
        gaps.push({ competitor, axis, url: cell.url ?? null });
      }
    }
  }
  return gaps;
}

function slugPart(s) {
  return String(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function proposedTasksFromGaps(gaps, date, max = 5) {
  const limit = Math.max(0, Math.min(5, Number(max) || 5));
  return gaps.slice(0, limit).map((gap) => {
    const key = `RES-${date}-${slugPart(gap.competitor)}-${slugPart(gap.axis)}`;
    return {
      key,
      title: `Fill research gap: ${gap.competitor} / ${gap.axis}`,
      description: `Gap from research brief ${date}: ${gap.axis}=unknown. Source: ${gap.url || 'none'}.`,
      priority: 3,
      labels: ['RESEARCH'],
    };
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm exec vitest run tests/ops/research-matrix.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add docs/ops/research-competitors.json scripts/ops/lib/research-matrix.mjs tests/ops/research-matrix.test.ts
git commit -m "feat(ops): competitor matrix scoring for research briefs"
```

---

### Task 2: Brief formatter (markdown + sidecar JSON)

**Files:**
- Create: `scripts/ops/lib/research-brief-format.mjs`
- Create: `tests/ops/research-brief-format.test.ts`
- Create: `docs/research/README.md`
- Create: `docs/research/.gitkeep`

**Interfaces:**
- Consumes: `Matrix`, fetch meta, `ProposedTask[]`
- Produces:
  - `formatBriefMarkdown(input): string`
  - `formatSidecarJson(input): object`

- [ ] **Step 1: Write failing test**

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 */
import { describe, expect, it } from 'vitest';
import { formatBriefMarkdown, formatSidecarJson } from '../../scripts/ops/lib/research-brief-format.mjs';

describe('formatBriefMarkdown', () => {
  it('includes required sections and footer', () => {
    const md = formatBriefMarkdown({
      date: '2026-07-17',
      slug: 'competitor-matrix',
      fetches: [{ url: 'https://example.com', ok: true, status: 200 }],
      matrix: {
        AskGamblers: {
          trust_scoring: { value: 'unknown', url: 'https://example.com' },
        },
      },
      gaps: [{ competitor: 'AskGamblers', axis: 'trust_scoring', url: 'https://example.com' }],
      proposedTasks: [{
        key: 'RES-2026-07-17-ASKGAMBLERS-TRUST-SCORING',
        title: 'Fill research gap',
        description: 'Gap',
        priority: 3,
        labels: ['RESEARCH'],
      }],
      mode: 'heuristic',
    });
    expect(md).toContain('## Meta');
    expect(md).toContain('## Feature matrix');
    expect(md).toContain('## Gaps');
    expect(md).toContain('## Proposed tasks');
    expect(md).toContain('Made for Degens. By Degens.');
  });
});

describe('formatSidecarJson', () => {
  it('emits proposedTasks array', () => {
    const side = formatSidecarJson({
      date: '2026-07-17',
      slug: 'competitor-matrix',
      proposedTasks: [{ key: 'RES-1', title: 't', description: 'd', priority: 3, labels: ['RESEARCH'] }],
    });
    expect(side.proposedTasks).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm exec vitest run tests/ops/research-brief-format.test.ts`

- [ ] **Step 3: Implement formatter**

`scripts/ops/lib/research-brief-format.mjs` must:

- Render markdown table for matrix (competitors as rows, axes as columns)
- List gaps as bullets
- List proposed tasks as a fenced JSON block AND a bullet list
- Include copyright + footer
- `formatSidecarJson` returns `{ date, slug, proposedTasks }`

- [ ] **Step 4: Add `docs/research/README.md`**

Explain: briefs are machine-generated; `unknown` is success when evidence missing; do not hand-edit matrices without updating Meta sources.

- [ ] **Step 5: Tests PASS + commit**

```bash
git add scripts/ops/lib/research-brief-format.mjs tests/ops/research-brief-format.test.ts docs/research/README.md docs/research/.gitkeep
git commit -m "feat(ops): research brief markdown and sidecar formatter"
```

---

### Task 3: `research-brief.mjs` CLI (fetch + write)

**Files:**
- Create: `scripts/ops/research-brief.mjs`
- Modify: `package.json` (add `ops:research:run`)

**Interfaces:**
- CLI: `node scripts/ops/research-brief.mjs [--slug competitor-matrix] [--date YYYY-MM-DD] [--config docs/ops/research-competitors.json] [--out-dir docs/research]`
- Writes:
  - `docs/research/YYYY-MM-DD-<slug>.md`
  - `docs/research/YYYY-MM-DD-<slug>.tasks.json`
- Env: optional `RESEARCH_LLM_API_KEY`, `RESEARCH_LLM_BASE_URL`, `RESEARCH_LLM_MODEL`
- Exit 0 even if some fetches fail (partial brief still written)

- [ ] **Step 1: Implement fetch helper in the same file (or tiny lib)**

```js
async function fetchText(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'TiltCheckResearchBot/1.0 (+https://tiltcheck.me)' },
      redirect: 'follow',
    });
    const html = await res.text();
    return { url, ok: res.ok, status: res.status, html: res.ok ? html : '' };
  } catch (err) {
    return { url, ok: false, status: 0, html: '', error: String(err?.message || err) };
  } finally {
    clearTimeout(t);
  }
}
```

- [ ] **Step 2: Wire pipeline**

For each competitor, fetch first URL that succeeds (or record all failures). Build per-competitor concatenated HTML for scoring. Call `buildMatrix` → `gapsFromMatrix` → `proposedTasksFromGaps(..., 5)`. Write markdown + sidecar.

LLM path (only if `RESEARCH_LLM_API_KEY` set): POST chat completions with system prompt: "You may only assign yes/partial/no when the provided HTML excerpt contains evidence. Otherwise unknown. Return JSON only." Validate every non-unknown cell by re-running `scorePage` OR substring check against excerpt; if validation fails, force `unknown`.

- [ ] **Step 3: Add package script**

```json
"ops:research:run": "node scripts/ops/research-brief.mjs"
```

- [ ] **Step 4: Manual smoke (degraded)**

Run: `pnpm ops:research:run -- --slug competitor-matrix`  
Expected: files appear under `docs/research/`; matrix has mostly `unknown`/`partial`/`yes` without crashing.

- [ ] **Step 5: Commit** (do not commit generated brief unless useful as fixture; prefer gitignore of ad-hoc runs OR commit one fixture brief for CI)

```bash
git add scripts/ops/research-brief.mjs package.json
git commit -m "feat(ops): research-brief CLI fetches allowlist and writes briefs"
```

---

### Task 4: Merge proposed + recurring tasks (TDD)

**Files:**
- Create: `docs/ops/recurring-tasks.json`
- Create: `docs/ops/recurring-state.json`
- Create: `scripts/ops/merge-proposed-tasks.mjs`
- Create: `tests/ops/merge-proposed-tasks.test.ts`
- Modify: `package.json` (`ops:research:merge-tasks`)
- Modify: `docs/ops/LINEAR-WORKFLOW.md`

**Interfaces:**
- `mergeTasks({ existingTasks, proposed, recurringDue, maxNew }): { tasks, added, stateUpdates }`
- CLI: `node scripts/ops/merge-proposed-tasks.mjs --sidecar docs/research/<file>.tasks.json`

- [ ] **Step 1: Write failing tests**

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 */
import { describe, expect, it } from 'vitest';
import { mergeTasks, dueRecurring } from '../../scripts/ops/merge-proposed-tasks.mjs';

describe('mergeTasks', () => {
  it('dedupes by key and caps at 5', () => {
    const existing = [{ key: 'RES-OLD', title: 'x', description: 'd', priority: 3 }];
    const proposed = Array.from({ length: 8 }, (_, i) => ({
      key: `RES-NEW-${i}`,
      title: `t${i}`,
      description: 'd',
      priority: 3,
      labels: ['RESEARCH'],
    }));
    const { tasks, added } = mergeTasks({
      existingTasks: existing,
      proposed,
      recurringDue: [],
      maxNew: 5,
    });
    expect(added).toHaveLength(5);
    expect(tasks).toHaveLength(6);
  });

  it('skips keys already present', () => {
    const { added } = mergeTasks({
      existingTasks: [{ key: 'RES-1', title: 'x', description: 'd', priority: 3 }],
      proposed: [{ key: 'RES-1', title: 'dup', description: 'd', priority: 3, labels: ['RESEARCH'] }],
      recurringDue: [],
      maxNew: 5,
    });
    expect(added).toHaveLength(0);
  });
});

describe('dueRecurring', () => {
  it('returns weekly item when lastQueuedAt is old', () => {
    const templates = [{
      key: 'REC-COMPETITOR-MATRIX',
      title: 'Refresh competitor feature matrix',
      description: 'Run research brief and fill gaps.',
      priority: 3,
      labels: ['RECURRING', 'RESEARCH'],
      cadenceDays: 7,
    }];
    const state = { 'REC-COMPETITOR-MATRIX': { lastQueuedAt: '2026-01-01T00:00:00.000Z' } };
    const due = dueRecurring(templates, state, new Date('2026-07-17T00:00:00.000Z'));
    expect(due.map((t) => t.key)).toContain('REC-COMPETITOR-MATRIX');
  });
});
```

- [ ] **Step 2: Implement merge module**

Export `dueRecurring` and `mergeTasks`. CLI loads:

1. sidecar proposedTasks
2. `docs/ops/recurring-tasks.json`
3. `docs/ops/recurring-state.json`
4. `docs/ops/linear-tasks.json`

Write updated task file preserving `copyright` field. Update `recurring-state.json` `lastQueuedAt` for queued recurring keys only.

Seed `docs/ops/recurring-tasks.json`:

```json
{
  "copyright": "© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17",
  "templates": [
    {
      "key": "REC-COMPETITOR-MATRIX",
      "title": "Refresh competitor feature matrix",
      "description": "Run pnpm ops:research:run and review Gaps section.",
      "priority": 3,
      "labels": ["RECURRING", "RESEARCH"],
      "cadenceDays": 7
    },
    {
      "key": "REC-DISCORD-MAP",
      "title": "Map 5 early-adopter degen Discord communities",
      "description": "Identify Solana Discord servers and Reddit communities for outreach.",
      "priority": 3,
      "labels": ["RECURRING", "RESEARCH"],
      "cadenceDays": 7
    },
    {
      "key": "REC-TRUST-TOP20",
      "title": "Refresh trust signals for top 20 Solana casinos",
      "description": "Update trust scoring inputs for top 20 Solana casinos.",
      "priority": 3,
      "labels": ["RECURRING", "FEATURE"],
      "cadenceDays": 14
    }
  ]
}
```

Seed `docs/ops/recurring-state.json`:

```json
{
  "copyright": "© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17",
  "queued": {}
}
```

- [ ] **Step 3: Document in LINEAR-WORKFLOW.md**

Add section **Research ops employee** with:

```bash
pnpm ops:research:run
pnpm ops:research:merge-tasks -- --sidecar docs/research/YYYY-MM-DD-competitor-matrix.tasks.json
pnpm ops:linear:dry
pnpm ops:linear:sync
```

- [ ] **Step 4: Tests PASS + commit**

```bash
git add scripts/ops/merge-proposed-tasks.mjs tests/ops/merge-proposed-tasks.test.ts docs/ops/recurring-tasks.json docs/ops/recurring-state.json docs/ops/LINEAR-WORKFLOW.md package.json
git commit -m "feat(ops): merge research and recurring tasks into linear-tasks.json"
```

---

### Task 5: GitHub Actions workflow (PR delivery)

**Files:**
- Create: `.github/workflows/research-ops.yml`
- Modify: `docs/ops/LINEAR-WORKFLOW.md` (CI secrets note)
- Modify: `scripts/README.md` (point to research ops)

**Behavior:**

1. Trigger: cron `0 14 * * 1,4` + `workflow_dispatch` (`slug` input default `competitor-matrix`)
2. Checkout with `contents: write` + `pull-requests: write`
3. `pnpm ops:research:run -- --slug <slug>`
4. Find newest `docs/research/*.tasks.json` from this run and merge
5. Create branch `ops/research-<date>-<slug>`
6. Commit research md + sidecar + linear-tasks.json + recurring-state.json
7. Open PR to `main` with title `ops(research): <date> <slug> brief`
8. If `LINEAR_API_KEY` and `LINEAR_TEAM_KEY` secrets exist: `pnpm ops:linear:sync` (not dry-run)
9. If Linear secrets missing: skip sync with warning (PR still opens)

Use ` stefanzweifel/git-auto-commit-action` OR raw git commands. Prefer raw git for fewer deps:

```yaml
# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
name: Research Ops Employee

on:
  schedule:
    - cron: '0 14 * * 1,4'
  workflow_dispatch:
    inputs:
      slug:
        description: 'Research brief slug'
        required: true
        default: competitor-matrix

permissions:
  contents: write
  pull-requests: write

jobs:
  research:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.29.1
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Run research brief
        env:
          RESEARCH_LLM_API_KEY: ${{ secrets.RESEARCH_LLM_API_KEY }}
          RESEARCH_LLM_BASE_URL: ${{ secrets.RESEARCH_LLM_BASE_URL }}
          RESEARCH_LLM_MODEL: ${{ secrets.RESEARCH_LLM_MODEL }}
        run: pnpm ops:research:run -- --slug "${{ github.event.inputs.slug || 'competitor-matrix' }}"
      - name: Merge tasks
        run: |
          SIDE=$(ls -1t docs/research/*.tasks.json | head -1)
          pnpm ops:research:merge-tasks -- --sidecar "$SIDE"
      - name: Open PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          DATE=$(date -u +%F)
          SLUG="${{ github.event.inputs.slug || 'competitor-matrix' }}"
          BRANCH="ops/research-${DATE}-${SLUG}"
          git config user.name "tiltcheck-research-ops"
          git config user.email "ops@tiltcheck.me"
          git checkout -b "$BRANCH"
          git add docs/research docs/ops/linear-tasks.json docs/ops/recurring-state.json
          git commit -m "ops(research): ${DATE} ${SLUG} brief" || echo "No changes"
          git push -u origin "$BRANCH"
          gh pr create --base main --head "$BRANCH" --title "ops(research): ${DATE} ${SLUG} brief" --body "Automated research brief + Linear task merge. Review Gaps before trusting matrix cells." || true
      - name: Sync Linear
        if: ${{ secrets.LINEAR_API_KEY != '' }}
        env:
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
          LINEAR_TEAM_KEY: ${{ secrets.LINEAR_TEAM_KEY }}
          LINEAR_PROJECT_ID: ${{ secrets.LINEAR_PROJECT_ID }}
        run: pnpm ops:linear:sync
```

Note: GitHub Actions cannot use `secrets.X != ''` in `if` for some orgs — prefer:

```yaml
if: ${{ env.HAS_LINEAR == 'true' }}
```

with a prior step that sets `HAS_LINEAR` when key present.

- [ ] **Step 1: Add workflow file**
- [ ] **Step 2: Update docs**
- [ ] **Step 3: Commit**

```bash
git add .github/workflows/research-ops.yml docs/ops/LINEAR-WORKFLOW.md scripts/README.md
git commit -m "ci(ops): research-ops workflow opens PR and syncs Linear"
```

---

### Task 6: End-to-end verification

**Files:** none new (may add fixture under `tests/ops/fixtures/sample-competitor.html`)

- [ ] **Step 1: Unit suite**

Run: `pnpm exec vitest run tests/ops/`  
Expected: all PASS

- [ ] **Step 2: Offline brief from fixture**

Add optional `--html-fixture` flag OR unit-only path: ensure CI never depends on live competitor sites for unit tests (live fetch only in workflow).

- [ ] **Step 3: Dry Linear**

If local env has Linear keys: `pnpm ops:linear:dry` after merge.  
Expected: shows creates/skips, no crash.

- [ ] **Step 4: Update spec status**

In `docs/superpowers/specs/2026-07-17-research-ops-employee-design.md` set `Status: Implemented (v1)` when done.

- [ ] **Step 5: Final commit + PR update**

```bash
git add docs/superpowers/specs/2026-07-17-research-ops-employee-design.md
git commit -m "docs(spec): mark research ops employee v1 implemented"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Allowlisted competitors + axes | Task 1 |
| Sourced matrix / unknown rule | Task 1–3 |
| Brief sections Meta/Matrix/Gaps/Tasks/Footer | Task 2 |
| Sidecar proposedTasks max 5 | Task 1–3 |
| Recurring templates + state | Task 4 |
| Merge into linear-tasks.json + dedupe | Task 4 |
| linear-sync reuse | Task 5 |
| GH Actions Mon/Thu + dispatch | Task 5 |
| PR delivery not direct main | Task 5 |
| Optional LLM / free degraded | Task 3 |
| Docs atomic with code | Tasks 2, 4, 5 |
| Discord gate deferred | N/A (non-goal) |

## Placeholder scan

None intentional. Workflow Linear `if:` secret check must be implemented carefully (Task 5 note).

---

Made for Degens. By Degens.
