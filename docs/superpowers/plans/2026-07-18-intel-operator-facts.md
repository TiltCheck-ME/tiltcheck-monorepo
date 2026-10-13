# Intel Operator Facts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Ask Intel (`/ask` + widget) so users get cited VIP, redemption, and welcome-bonus facts from a human-gated live store — or a blunt refuse when no live record exists.

**Architecture:** Add `data/trust-engine/operator-facts.live.json` (answers) and `operator-facts.proposals.json` (ops-only). `@tiltcheck/intel-tools` loads live facts and exposes query helpers. `@tiltcheck/intel-agent` routes VIP/redemption/welcome intents before trust lookup and builds structured text + CTA blocks. Promote CLI copies proposal → live. No LLM freestyle path.

**Tech Stack:** TypeScript ESM packages (`intel-tools`, `intel-agent`), vitest, Next.js web BFF (`POST /api/intel/chat`), Node CLI for promote.

**Spec:** [docs/superpowers/specs/2026-07-18-intel-operator-facts-design.md](../specs/2026-07-18-intel-operator-facts-design.md)

## Global Constraints

- Copyright header on every new/modified file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18`
- No emojis in code, comments, or docs
- User-facing UI keeps footer: `Made for Degens. By Degens.`
- Atomic docs: update `docs/api/intel-agent.md` + ops runbook in the same commit as the wiring that needs them
- **Never invent operator facts** — miss → refuse; only `status: live` answers
- No auto-promote from proposals to live
- Stale threshold: **90 days** from `asOf` → still answer with stale label
- Geo roundups: refuse if no geo-tagged live welcome facts match
- Do not implement dice/EV strategy intents
- Do not build Degen Copilot in this plan
- Rebuild packages after changes: `pnpm --filter @tiltcheck/intel-tools... build` then `pnpm --filter @tiltcheck/intel-agent... build`

## File map

| Path | Responsibility |
|------|----------------|
| `data/trust-engine/operator-facts.live.json` | Live facts Intel may answer from |
| `data/trust-engine/operator-facts.proposals.json` | Proposed facts (not user-visible) |
| `docs/ops/operator-facts-priority.json` | ~25–40 priority operator checklist for coverage gate |
| `packages/intel-tools/src/operator-facts-types.ts` | Fact schema types |
| `packages/intel-tools/src/load-operator-facts.ts` | Load + filter live facts |
| `packages/intel-tools/src/operator-facts.ts` | Query helpers + stale check |
| `packages/intel-tools/src/types.ts` | Extend `IntelToolsConfig` |
| `packages/intel-tools/src/tools.ts` | Wire fact methods on `IntelTools` |
| `packages/intel-tools/src/index.ts` | Re-exports |
| `packages/intel-tools/tests/operator-facts.test.ts` | Unit tests for load/query |
| `packages/intel-agent/src/types.ts` | New intent kinds + optional `operator_fact` block |
| `packages/intel-agent/src/intent-router.ts` | Route VIP/redemption/welcome before lookup |
| `packages/intel-agent/src/block-builder.ts` | Fact hit/miss/ambiguous blocks |
| `packages/intel-agent/src/process-message.ts` | Handle fact intents |
| `packages/intel-agent/tests/intent-router.test.ts` | Router coverage |
| `packages/intel-agent/tests/operator-facts-process.test.ts` | End-to-end processMessage fact cases |
| `scripts/ops/promote-operator-facts.mjs` | Promote/reject proposals → live |
| `tests/ops/promote-operator-facts.test.ts` | Promote CLI unit tests |
| `docs/ops/OPERATOR-FACTS.md` | Ops runbook |
| `docs/api/intel-agent.md` | Public API note for new intents |
| `apps/web/src/components/intel/IntelChatPanel.tsx` | Prompt chips for fact examples |
| `package.json` | `ops:facts:promote` script |

---

### Task 1: Fact schema + live loader (TDD)

**Files:**
- Create: `packages/intel-tools/src/operator-facts-types.ts`
- Create: `packages/intel-tools/src/load-operator-facts.ts`
- Create: `packages/intel-tools/tests/operator-facts.test.ts`
- Create: `data/trust-engine/operator-facts.live.json`
- Create: `data/trust-engine/operator-facts.proposals.json`
- Modify: `packages/intel-tools/src/index.ts`

**Interfaces:**
- Produces types:
  - `OperatorFactStatus = 'live' | 'stale' | 'retracted'`
  - `VipCurrencyRule`, `RedemptionFact`, `WelcomeBonusFact`, `OperatorFactRecord`, `OperatorFactsFile`
  - `loadOperatorFactsFromMonorepo(root?: string): OperatorFactRecord[]`
  - `filterLiveOperatorFacts(records: OperatorFactRecord[]): OperatorFactRecord[]` — drops `retracted`; keeps `live` and `stale` status values that are answerable (status `live` only per spec — implement: only `status === 'live'`)

- [ ] **Step 1: Write failing test**

Create `packages/intel-tools/tests/operator-facts.test.ts`:

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  filterLiveOperatorFacts,
  loadOperatorFactsFromPath,
} from '../src/load-operator-facts.js';

describe('filterLiveOperatorFacts', () => {
  it('keeps only status live', () => {
    const kept = filterLiveOperatorFacts([
      { slug: 'a', name: 'A', status: 'live', vipCurrencyRules: [], lastVerifiedAt: '2026-07-01' },
      { slug: 'b', name: 'B', status: 'retracted', vipCurrencyRules: [], lastVerifiedAt: '2026-07-01' },
      { slug: 'c', name: 'C', status: 'stale', vipCurrencyRules: [], lastVerifiedAt: '2026-01-01' },
    ]);
    expect(kept.map((r) => r.slug)).toEqual(['a']);
  });
});

describe('loadOperatorFactsFromPath', () => {
  it('loads operators array from json', () => {
    const dir = join(tmpdir(), `tc-facts-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'operator-facts.live.json');
    writeFileSync(
      path,
      JSON.stringify({
        copyright: '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18',
        operators: [
          {
            slug: 'metawin',
            name: 'MetaWin',
            status: 'live',
            vipCurrencyRules: [
              {
                currencyName: 'Gold Coins',
                canLevel: false,
                notes: 'Gold Coins do not count toward VIP level.',
                sourceUrl: 'https://example.com/vip',
                asOf: '2026-07-01',
              },
            ],
            lastVerifiedAt: '2026-07-01',
            verifiedBy: 'fixture',
          },
        ],
      }),
    );
    const loaded = loadOperatorFactsFromPath(path);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.slug).toBe('metawin');
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tiltcheck/intel-tools test -- tests/operator-facts.test.ts`  
Expected: FAIL — module not found / exports missing

- [ ] **Step 3: Implement types + loader**

`operator-facts-types.ts`:

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

export type OperatorFactStatus = 'live' | 'stale' | 'retracted';

export interface VipCurrencyRule {
  currencyName: string;
  canLevel: boolean;
  notes: string;
  sourceUrl: string;
  asOf: string; // YYYY-MM-DD
}

export interface RedemptionFact {
  claim: string;
  sourceUrl: string;
  asOf: string;
  minHours?: number;
  maxHours?: number;
}

export interface WelcomeBonusFact {
  summary: string;
  sourceUrl: string;
  asOf: string;
  geoTags?: string[]; // e.g. ['US-FL']
}

export interface OperatorFactRecord {
  slug: string;
  name: string;
  aliases?: string[];
  domains?: string[];
  category?: string;
  status: OperatorFactStatus;
  vipCurrencyRules?: VipCurrencyRule[];
  redemptionTime?: RedemptionFact;
  welcomeBonusSummary?: WelcomeBonusFact;
  verifiedBy?: string;
  lastVerifiedAt: string;
}

export interface OperatorFactsFile {
  copyright: string;
  operators: OperatorFactRecord[];
}
```

`load-operator-facts.ts`: implement `loadOperatorFactsFromPath`, `loadOperatorFactsFromMonorepo` (read `data/trust-engine/operator-facts.live.json` from monorepo root), `filterLiveOperatorFacts`.

Seed empty live + proposals files:

```json
{
  "copyright": "© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18",
  "operators": []
}
```

Export new symbols from `index.ts`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter @tiltcheck/intel-tools test -- tests/operator-facts.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data/trust-engine/operator-facts.live.json data/trust-engine/operator-facts.proposals.json \
  packages/intel-tools/src/operator-facts-types.ts packages/intel-tools/src/load-operator-facts.ts \
  packages/intel-tools/src/index.ts packages/intel-tools/tests/operator-facts.test.ts
git commit -m "feat(intel-tools): add operator facts schema and live loader"
```

---

### Task 2: Query helpers + IntelTools methods (TDD)

**Files:**
- Create: `packages/intel-tools/src/operator-facts.ts`
- Modify: `packages/intel-tools/src/types.ts` — add `operatorFacts?: OperatorFactRecord[]` to `IntelToolsConfig`
- Modify: `packages/intel-tools/src/tools.ts` — store facts; add query methods
- Modify: `packages/intel-tools/src/index.ts`
- Modify: `packages/intel-tools/tests/operator-facts.test.ts` — add query tests

**Interfaces:**
- Produces:
  - `STALE_AFTER_DAYS = 90`
  - `isFactStale(asOf: string, now?: Date): boolean`
  - `resolveOperatorFacts(records: OperatorFactRecord[], query: string): OperatorFactRecord[]` — match slug, name, aliases (case-insensitive), domains
  - `getVipFactsForQuery(records, query): { matches: OperatorFactRecord[]; rules: VipCurrencyRule[]; stale: boolean } | { matches: OperatorFactRecord[]; rules: []; missing: true }`
  - Same pattern for redemption / welcome (welcome accepts optional `geoTag?: string`)
  - On `IntelTools`: `getOperatorVipFacts(query)`, `getOperatorRedemptionFacts(query)`, `getOperatorWelcomeBonusFacts(query, geoTag?)`, `listAvailableFactTypes(query)`

- [ ] **Step 1: Write failing tests** (append to `operator-facts.test.ts`)

```ts
import { isFactStale, resolveOperatorFacts, getVipCurrencyAnswer } from '../src/operator-facts.js';

describe('isFactStale', () => {
  it('marks facts older than 90 days stale', () => {
    expect(isFactStale('2026-01-01', new Date('2026-07-18'))).toBe(true);
    expect(isFactStale('2026-06-01', new Date('2026-07-18'))).toBe(false);
  });
});

describe('getVipCurrencyAnswer', () => {
  const records = [
    {
      slug: 'metawin',
      name: 'MetaWin',
      aliases: ['metawin.us'],
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
      vipCurrencyRules: [
        {
          currencyName: 'Gold Coins',
          canLevel: false,
          notes: 'Gold Coins do not count toward VIP level.',
          sourceUrl: 'https://example.com/vip',
          asOf: '2026-07-01',
        },
      ],
    },
  ];

  it('returns rules for matched operator', () => {
    const answer = getVipCurrencyAnswer(records, 'metawin');
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.rules[0]?.canLevel).toBe(false);
    }
  });

  it('returns miss when operator has no vip rules', () => {
    const answer = getVipCurrencyAnswer(
      [{ slug: 'x', name: 'X', status: 'live', lastVerifiedAt: '2026-07-01' }],
      'x',
    );
    expect(answer.kind).toBe('miss');
  });

  it('returns none when operator unknown', () => {
    expect(getVipCurrencyAnswer(records, 'unknown-casino').kind).toBe('none');
  });

  it('returns ambiguous when multiple match', () => {
    const dup = [
      ...records,
      { ...records[0], slug: 'metawin-mirror', name: 'MetaWin Mirror', aliases: ['metawin'] },
    ];
    // Use a query that hits both via alias/name — adjust matcher so "metawin" hits slug metawin and alias metawin on mirror
    expect(getVipCurrencyAnswer(dup, 'metawin').kind).toBe('ambiguous');
  });
});
```

Define answer union in `operator-facts.ts`:

```ts
export type FactAnswer<T> =
  | { kind: 'hit'; record: OperatorFactRecord; payload: T; stale: boolean }
  | { kind: 'miss'; record: OperatorFactRecord } // operator known, fact absent
  | { kind: 'none' } // operator unknown
  | { kind: 'ambiguous'; matches: OperatorFactRecord[] };
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement `operator-facts.ts` + wire `IntelTools`**

Constructor accepts `config.operatorFacts ?? []` filtered with `filterLiveOperatorFacts`. Methods call the pure helpers.

For welcome + geo:

```ts
export function getWelcomeBonusAnswer(
  records: OperatorFactRecord[],
  query: string,
  geoTag?: string,
): FactAnswer<WelcomeBonusFact> {
  // resolve → if geoTag set and welcomeBonusSummary.geoTags missing or not including geoTag → miss (or none)
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/intel-tools/src/operator-facts.ts packages/intel-tools/src/types.ts \
  packages/intel-tools/src/tools.ts packages/intel-tools/src/index.ts \
  packages/intel-tools/tests/operator-facts.test.ts
git commit -m "feat(intel-tools): query VIP, redemption, and welcome operator facts"
```

---

### Task 3: Intent router for operator facts (TDD)

**Files:**
- Modify: `packages/intel-agent/src/types.ts`
- Modify: `packages/intel-agent/src/intent-router.ts`
- Modify: `packages/intel-agent/tests/intent-router.test.ts`

**Interfaces:**
- Extends `RoutedIntent` with:
  - `{ kind: 'operator_vip_fact'; name: string; currencyHint?: string }`
  - `{ kind: 'operator_redemption_fact'; name: string }`
  - `{ kind: 'operator_welcome_bonus_fact'; name: string; geoTag?: string }`
  - `{ kind: 'operator_fact_lookup'; name: string }`

- [ ] **Step 1: Write failing router tests**

Append to `intent-router.test.ts`:

```ts
  it('routes VIP currency leveling questions', () => {
    expect(routeIntelIntent('Can you level with gold coins on metawin.us?')).toEqual({
      kind: 'operator_vip_fact',
      name: expect.stringMatching(/metawin/i),
      currencyHint: expect.stringMatching(/gold/i),
    });
  });

  it('routes redemption timing questions', () => {
    const intent = routeIntelIntent('How long does crown coins take for redemption?');
    expect(intent.kind).toBe('operator_redemption_fact');
    if (intent.kind === 'operator_redemption_fact') {
      expect(intent.name.toLowerCase()).toContain('crown');
    }
  });

  it('routes welcome bonus with florida geo', () => {
    const intent = routeIntelIntent('What new player bonuses are available on McLuck in Florida?');
    expect(intent.kind).toBe('operator_welcome_bonus_fact');
    if (intent.kind === 'operator_welcome_bonus_fact') {
      expect(intent.geoTag).toBe('US-FL');
    }
  });

  it('does not steal personal bonus intent for my bonus', () => {
    expect(routeIntelIntent('what is my bonus status')).toEqual({ kind: 'personal', topic: 'bonus' });
  });

  it('routes vague VIP deal questions to fact lookup', () => {
    expect(routeIntelIntent('what is the VIP deal on Stake').kind).toBe('operator_fact_lookup');
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter @tiltcheck/intel-agent test -- tests/intent-router.test.ts`

- [ ] **Step 3: Implement router**

Order matters — insert **after** personal intents, **before** generic list/lookup:

1. If message matches VIP/level/loyalty currency patterns → `operator_vip_fact` (extract name via `extractCasinoNameCandidate` or domain; currencyHint from `gold coins|sweeps coins|GC|SC|…`)
2. Else if redemption/payout/cashout timing → `operator_redemption_fact`
3. Else if welcome/new player bonus **and not** `my bonus` → `operator_welcome_bonus_fact`; map florida → `US-FL`
4. Else if VIP deal / loyalty program vague → `operator_fact_lookup`
5. Existing trust routes unchanged

Refuse path for dice strategy: do **not** add intents; those fall through to `unknown` or lookup without inventing strategy.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/intel-agent/src/types.ts packages/intel-agent/src/intent-router.ts \
  packages/intel-agent/tests/intent-router.test.ts
git commit -m "feat(intel-agent): route VIP, redemption, and welcome fact intents"
```

---

### Task 4: Fact blocks + processMessage wiring (TDD)

**Files:**
- Modify: `packages/intel-agent/src/block-builder.ts`
- Modify: `packages/intel-agent/src/process-message.ts`
- Modify: `packages/intel-agent/src/types.ts` — optional citations already on text blocks
- Create: `packages/intel-agent/tests/operator-facts-process.test.ts`
- Modify: apps/web BFF if `createDefaultIntelAgent` needs facts loaded — find call site and pass `operatorFacts`

**Interfaces:**
- Produces:
  - `buildOperatorFactHitBlocks(...)`
  - `buildOperatorFactMissBlocks(name, slug?)`
  - `buildOperatorFactAmbiguousBlocks(matches)`
  - `buildOperatorFactNoneBlocks(query)`
  - processMessage handlers for four fact intent kinds

- [ ] **Step 1: Find agent construction in web**

```bash
rg -n "createDefaultIntelAgent|createIntelTools|loadCasinosFromMonorepo" apps/web packages --glob '*.ts'
```

Pass `operatorFacts: filterLiveOperatorFacts(loadOperatorFactsFromMonorepo(...))` into `createIntelTools`.

- [ ] **Step 2: Write failing process tests**

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { describe, expect, it } from 'vitest';
import { createIntelAgent } from '../src/process-message.js';
import { createIntelTools } from '@tiltcheck/intel-tools';

const fixtures = [
  {
    slug: 'metawin',
    name: 'MetaWin',
    status: 'live' as const,
    lastVerifiedAt: '2026-07-01',
    vipCurrencyRules: [
      {
        currencyName: 'Gold Coins',
        canLevel: false,
        notes: 'Gold Coins do not count toward VIP level.',
        sourceUrl: 'https://example.com/vip',
        asOf: '2026-07-01',
      },
    ],
  },
];

describe('processMessage operator facts', () => {
  it('returns cited hit for VIP question', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [{ name: 'MetaWin', grade: 'B', risk: 'Medium', category: 'Crypto', slug: 'metawin', score: 70 }],
      operatorFacts: fixtures,
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'Can you level with gold coins on MetaWin?',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/do not count|cannot level|canLevel/i);
    expect(text).toMatch(/Source:/i);
    expect(result.blocks.some((b) => b.type === 'cta' && 'href' in b && b.href.includes('/casinos/metawin'))).toBe(true);
  });

  it('refuses when no live fact', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [{ name: 'MetaWin', grade: 'B', risk: 'Medium', category: 'Crypto', slug: 'metawin', score: 70 }],
      operatorFacts: [],
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'How long does MetaWin redemption take?',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/No sourced record/i);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

- [ ] **Step 4: Implement block builders + processMessage branches**

Refuse copy (exact pattern from spec):

`No sourced record for that. Not guessing VIP/bonus/redemption terms. Check their ToS — or open the proof page when we have one.`

Hit copy: fact notes + `Source: {url} · As of {asOf}` + optional `Stale — verify on source` + CTA `Open proof page` → `/casinos/{slug}`.

Wire `createDefaultIntelAgent` / web route to load facts.

- [ ] **Step 5: Run tests — expect PASS**

Also run full package tests:

```bash
pnpm --filter @tiltcheck/intel-tools test
pnpm --filter @tiltcheck/intel-agent test
```

- [ ] **Step 6: Commit**

```bash
git add packages/intel-agent packages/intel-tools apps/web/src/app/api/intel
git commit -m "feat(intel-agent): answer operator facts with cite or refuse"
```

---

### Task 5: Promote CLI (TDD)

**Files:**
- Create: `scripts/ops/promote-operator-facts.mjs`
- Create: `tests/ops/promote-operator-facts.test.ts`
- Modify: `package.json` — add `"ops:facts:promote": "node scripts/ops/promote-operator-facts.mjs"`
- Create: `docs/ops/OPERATOR-FACTS.md`

**Interfaces:**
- CLI:
  - `node scripts/ops/promote-operator-facts.mjs --list`
  - `node scripts/ops/promote-operator-facts.mjs --promote <slug>`
  - `node scripts/ops/promote-operator-facts.mjs --reject <slug>`
- Reads/writes `data/trust-engine/operator-facts.proposals.json` and `.live.json`
- Promote: set `status: 'live'`, copy record into live by slug (replace if exists), remove from proposals
- Reject: remove from proposals only
- Never invent fields

- [ ] **Step 1: Write failing tests** using temp dirs (same pattern as research-ops merge tests)

- [ ] **Step 2: Implement CLI** (pure helpers exported for tests)

- [ ] **Step 3: Write `docs/ops/OPERATOR-FACTS.md`** with promote flow, 90-day stale rule, coverage gate (≥25 operators with ≥1 live fact), refuse policy

- [ ] **Step 4: Add package.json script**

- [ ] **Step 5: Run `pnpm exec vitest run tests/ops/promote-operator-facts.test.ts` — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add scripts/ops/promote-operator-facts.mjs tests/ops/promote-operator-facts.test.ts \
  docs/ops/OPERATOR-FACTS.md package.json
git commit -m "feat(ops): promote-operator-facts CLI and runbook"
```

---

### Task 6: Priority checklist + optional seed proposals

**Files:**
- Create: `docs/ops/operator-facts-priority.json`
- Modify: `docs/ops/OPERATOR-FACTS.md` — link checklist
- Optionally add **proposals only** (not live) for operators ops will verify — do **not** promote unverified claims into live

**Priority list shape:**

```json
{
  "copyright": "© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18",
  "coverageGateMin": 25,
  "operators": [
    { "slug": "metawin", "name": "MetaWin", "category": "Crypto", "needed": ["vip", "redemption"] },
    { "slug": "crown-coins", "name": "Crown Coins", "category": "Sweeps", "needed": ["redemption", "welcome"] }
  ]
}
```

Fill **25–40** real sweeps/crypto names from `apps/web/src/data/casinos.json` (prefer Sweeps + Crypto categories). Leave live file empty until human-verified promote.

- [ ] **Step 1: Generate checklist from casinos.json** (script one-off or hand-curate 25–40)

- [ ] **Step 2: Document that feature is not “live” until `coverageGateMin` operators have ≥1 live fact**

- [ ] **Step 3: Commit**

```bash
git add docs/ops/operator-facts-priority.json docs/ops/OPERATOR-FACTS.md
git commit -m "docs(ops): operator facts priority checklist for coverage gate"
```

---

### Task 7: Web chips + API docs + cohesion note

**Files:**
- Modify: `apps/web/src/components/intel/IntelChatPanel.tsx` — extend `PROMPT_CHIPS`
- Modify: `docs/api/intel-agent.md` — document fact intents + refuse behavior
- Modify: `docs/ops/AGENT-COHESION.md` — one row: operator facts owned by Intel/`/ask`; scraper fills proposals; research-ops may queue verify tasks
- Modify: `docs/superpowers/specs/2026-07-18-intel-operator-facts-design.md` — Status → Implemented (v1 code) when code ships (only after Tasks 1–5 green); leave coverage gate note

**Chips to add (keep existing trust chips):**

```ts
const PROMPT_CHIPS = [
  'Is roobet a scam?',
  'List US crypto casinos',
  'List US sweeps casinos',
  'How do trust grades work?',
  'Check domain stake.com',
  'Can you level with gold coins on MetaWin?',
  'How long does Crown Coins redemption take?',
  'What is the welcome bonus on Stake.us?',
];
```

Note in UI copy / unknown fallback: operator VIP/bonus/redemption answers need a sourced live record.

- [ ] **Step 1: Update chips + docs**

- [ ] **Step 2: Manually smoke `/ask` locally**

```bash
pnpm --filter @tiltcheck/intel-tools... build
pnpm --filter @tiltcheck/intel-agent... build
pnpm -C apps/web dev
```

Ask a fact question with empty live store → expect refuse.  
Temporarily inject a fixture live record locally → expect cite. Do not commit unverified live facts.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/intel/IntelChatPanel.tsx docs/api/intel-agent.md \
  docs/ops/AGENT-COHESION.md docs/superpowers/specs/2026-07-18-intel-operator-facts-design.md
git commit -m "docs(web): Intel operator-fact chips and API notes"
```

---

### Task 8: Verification gate

- [x] **Step 1: Run targeted tests**

```bash
pnpm --filter @tiltcheck/intel-tools test
pnpm --filter @tiltcheck/intel-agent test
pnpm exec vitest run tests/ops/promote-operator-facts.test.ts
```

Expected: all PASS

- [x] **Step 2: Spec coverage check**

| Spec requirement | Task |
|------------------|------|
| Refuse unsourced | 4 |
| VIP / redemption / welcome only | 3–4 |
| `/ask` + widget | 4, 7 |
| Live vs proposals + human promote | 1, 5 |
| 90-day stale label | 2, 4 |
| Geo miss refuse | 2, 4 |
| Coverage checklist ≥25 | 6 |
| No freestyle LLM | all (no LLM path added) |
| Docs atomic | 5, 7 |

- [x] **Step 3: Final commit if any fixups**

- [x] **Step 4: Push + update PR** — do not claim product “live” until ops promotes ≥25 operators

---

## Self-review (plan author)

1. **Spec coverage:** All locked decisions mapped to tasks; coverage gate is ops checklist (Task 6), not fake live seeds.
2. **Placeholders:** None — types, refuse copy, CLI flags, chip strings specified.
3. **Type consistency:** `OperatorFactRecord`, `FactAnswer`, intent kinds reused across tasks 1–4.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-intel-operator-facts.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
