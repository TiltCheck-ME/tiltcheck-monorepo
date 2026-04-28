"use client";

/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25 */

import React, { useMemo, useState } from 'react';
import {
  compareTarotFlipMechanics,
  type TarotFlipComparisonResult,
  type TarotFlipDifficultyProfile,
  type TarotFlipMechanicsSnapshot,
} from '@tiltcheck/shared';

const MATCHING_BASELINE = JSON.stringify({
  gameName: 'Tarot Flip',
  sourceLabel: 'Stored baseline',
  cardCount: 3,
  difficulties: {
    easy: {
      steps: [
        { step: 1, safeCards: 2, hazardCards: 1, multiplier: 1.2, winChance: 0.666667 },
        { step: 2, safeCards: 1, hazardCards: 2, multiplier: 2.1, winChance: 0.333333 },
      ],
    },
    hard: {
      steps: [
        { step: 1, safeCards: 1, hazardCards: 2, multiplier: 2.4, winChance: 0.333333 },
        { step: 2, safeCards: 1, hazardCards: 2, multiplier: 5.6, winChance: 0.333333 },
      ],
    },
  },
}, null, 2);

const MATCHING_CURRENT = JSON.stringify({
  title: 'Tarot Flip',
  deck: { totalCards: 3 },
  difficultyProfiles: [
    {
      id: 'easy',
      rows: [
        { row: 1, goodCards: 2, bombs: 1, payoutMultiplier: 1.2, probability: '66.6667%' },
        { row: 2, goodCards: 1, bombs: 2, payoutMultiplier: 2.1, probability: '33.3333%' },
      ],
    },
    {
      id: 'hard',
      rows: [
        { row: 1, goodCards: 1, bombs: 2, payoutMultiplier: 2.4, probability: '33.3333%' },
        { row: 2, goodCards: 1, bombs: 2, payoutMultiplier: 5.6, probability: '33.3333%' },
      ],
    },
  ],
}, null, 2);

const MISMATCH_CURRENT = JSON.stringify({
  title: 'Tarot Flip',
  deck: { totalCards: 3 },
  difficultyProfiles: [
    {
      id: 'easy',
      rows: [
        { row: 1, goodCards: 1, bombs: 2, payoutMultiplier: 1.5, probability: '50%' },
        { row: 2, goodCards: 1, bombs: 2, payoutMultiplier: 2.9, probability: '33.3333%' },
      ],
    },
    {
      id: 'hard',
      rows: [
        { row: 1, goodCards: 1, bombs: 2, payoutMultiplier: 2.4, probability: '33.3333%' },
        { row: 2, goodCards: 0, bombs: 3, payoutMultiplier: 8.2, probability: '0%' },
      ],
    },
  ],
}, null, 2);

function parseJsonInput(value: string): unknown {
  return JSON.parse(value);
}

function formatChance(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }

  return `${(value * 100).toFixed(4).replace(/0+$/g, '').replace(/\.$/g, '')}%`;
}

function formatScalar(value: number | boolean | string | null): string {
  if (value === null) {
    return 'n/a';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(6).replace(/0+$/g, '').replace(/\.$/g, '');
  }

  return String(value);
}

function SnapshotTable({ snapshot }: { snapshot: TarotFlipMechanicsSnapshot }) {
  return (
    <div className="space-y-4 rounded-2xl border border-[#283347] bg-black/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">{snapshot.sourceLabel ?? 'Snapshot'}</p>
          <h2 className="mt-2 text-lg font-black text-white">{snapshot.gameName ?? 'Tarot Flip'}</h2>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>{snapshot.difficulties.length} difficulty profiles</p>
          <p>{snapshot.cardRules.totalCards ?? 'n/a'} total cards</p>
        </div>
      </div>

      {snapshot.difficulties.length > 0 ? (
        <div className="space-y-4">
          {snapshot.difficulties.map((difficulty) => (
            <DifficultyGrid key={`${snapshot.sourceLabel}-${difficulty.key}`} difficulty={difficulty} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-yellow-300">No difficulty table parsed yet. Paste the raw mechanic snapshot, not a cropped UI label dump.</p>
      )}

      {snapshot.warnings.length > 0 && (
        <ul className="space-y-2 text-sm text-yellow-300">
          {snapshot.warnings.map((warning) => (
            <li key={`${snapshot.sourceLabel}-${warning}`}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DifficultyGrid({ difficulty }: { difficulty: TarotFlipDifficultyProfile }) {
  return (
    <div className="rounded-xl border border-[#283347] bg-black/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-white">{difficulty.label}</p>
        <p className="text-xs text-gray-500">{difficulty.steps.length} steps</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-gray-300">
          <thead>
            <tr className="border-b border-[#283347] text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
              <th className="px-2 py-2">Step</th>
              <th className="px-2 py-2">Cards</th>
              <th className="px-2 py-2">Safe</th>
              <th className="px-2 py-2">Hazard</th>
              <th className="px-2 py-2">Multiplier</th>
              <th className="px-2 py-2">Declared</th>
              <th className="px-2 py-2">Recalc</th>
            </tr>
          </thead>
          <tbody>
            {difficulty.steps.map((step) => (
              <tr key={`${difficulty.key}-${step.step}`} className="border-b border-[#16202f]/80 last:border-b-0">
                <td className="px-2 py-2 font-mono text-white">{step.step}</td>
                <td className="px-2 py-2">{formatScalar(step.totalCards)}</td>
                <td className="px-2 py-2">{formatScalar(step.safeCards)}</td>
                <td className="px-2 py-2">{formatScalar(step.hazardCards)}</td>
                <td className="px-2 py-2">{formatScalar(step.multiplier)}</td>
                <td className="px-2 py-2">{formatChance(step.declaredChance)}</td>
                <td className="px-2 py-2">{formatChance(step.recalculatedChance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonPanel({ result }: { result: TarotFlipComparisonResult }) {
  const statusClasses = result.exactMatch
    ? 'border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2]'
    : 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]';

  return (
    <div className="space-y-4 rounded-2xl border border-[#283347] bg-black/30 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Validator verdict</p>
          <h2 className="mt-2 text-2xl font-black text-white">
            {result.exactMatch ? 'Exact logic match' : 'Logic drift detected'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">{result.summary}</p>
        </div>
        <div className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${statusClasses}`}>
          {result.coverage} coverage · {result.confidence} confidence
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Differences" value={result.differences.length} />
        <StatCard label="Zero-trust warnings" value={result.zeroTrustWarnings.length} />
        <StatCard label="Difficulty profiles checked" value={result.difficultyComparisons.length} />
      </div>

      {result.differences.length > 0 ? (
        <div className="rounded-xl border border-[#283347] bg-black/40 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Detected logic differences</p>
          <ul className="mt-3 space-y-3 text-sm text-gray-300">
            {result.differences.map((difference) => (
              <li key={`${difference.path}-${difference.message}`} className="border border-[#283347] bg-black/40 p-3">
                <p className="font-black text-white">{difference.message}</p>
                <p className="mt-1 font-mono text-[11px] text-gray-500">{difference.path}</p>
                <p className="mt-2 text-xs text-gray-400">Stored baseline: <span className="text-white">{difference.baseline ?? 'n/a'}</span></p>
                <p className="text-xs text-gray-400">Current runtime: <span className="text-white">{difference.current ?? 'n/a'}</span></p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-[#283347] bg-black/40 p-4 text-sm text-gray-300">
          No structural drift was detected in the parsed card and difficulty tables.
        </div>
      )}

      {result.zeroTrustWarnings.length > 0 && (
        <div className="rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f59e0b]">Zero-trust warnings</p>
          <ul className="mt-3 space-y-2 text-sm text-yellow-100">
            {result.zeroTrustWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#283347] bg-black/40 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

export default function TarotFlipComparisonPage() {
  const [baselineText, setBaselineText] = useState(MATCHING_BASELINE);
  const [currentText, setCurrentText] = useState(MATCHING_CURRENT);

  const analysis = useMemo(() => {
    const parseErrors: string[] = [];
    let baseline: unknown = null;
    let current: unknown = null;

    try {
      baseline = parseJsonInput(baselineText);
    } catch (error) {
      parseErrors.push(`Stored baseline JSON is invalid: ${(error as Error).message}`);
    }

    try {
      current = parseJsonInput(currentText);
    } catch (error) {
      parseErrors.push(`Current runtime JSON is invalid: ${(error as Error).message}`);
    }

    if (parseErrors.length > 0 || baseline === null || current === null) {
      return {
        parseErrors,
        comparison: null,
      };
    }

    return {
      parseErrors: [],
      comparison: compareTarotFlipMechanics(baseline, current),
    };
  }, [baselineText, currentText]);

  return (
    <main className="min-h-screen bg-[#0a0c10] px-4 pb-16 pt-24 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-[#283347] bg-black/30 p-6 md:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Tarot flip comparison</p>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">Compare the stored Tarot flip table against the live one.</h1>
          <p className="mt-4 max-w-4xl text-sm text-gray-400 md:text-base">
            Paste the stored mechanic snapshot from the dashboard lane beside the current runtime snapshot. TiltCheck normalizes both sides, recalculates card survival odds from raw card counts, and flags drift without trusting UI claims.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#283347] bg-black/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Scope</p>
              <p className="mt-2 text-sm text-gray-300">Card count, safe-card count, hazard count, per-step win odds, and multiplier table drift.</p>
            </div>
            <div className="rounded-2xl border border-[#283347] bg-black/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Zero trust</p>
              <p className="mt-2 text-sm text-gray-300">Declared probabilities are checked against our own survival math. Bad odds claims get called out.</p>
            </div>
            <div className="rounded-2xl border border-[#283347] bg-black/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Guardrail</p>
              <p className="mt-2 text-sm text-gray-300">This validates game logic snapshots. It does not replace seed verification, seed hygiene, or trust-rollup evidence.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-2">
          <EditorCard
            label="Stored baseline JSON"
            helper="Paste the previously submitted mechanic snapshot."
            value={baselineText}
            onChange={setBaselineText}
          />
          <EditorCard
            label="Current runtime JSON"
            helper="Paste the current runtime or freshly captured mechanic snapshot."
            value={currentText}
            onChange={setCurrentText}
          />
        </section>

        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setBaselineText(MATCHING_BASELINE);
              setCurrentText(MATCHING_CURRENT);
            }}
            className="rounded-full border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#17c3b2]"
          >
            Load matching example
          </button>
          <button
            type="button"
            onClick={() => {
              setBaselineText(MATCHING_BASELINE);
              setCurrentText(MISMATCH_CURRENT);
            }}
            className="rounded-full border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ef4444]"
          >
            Load drift example
          </button>
        </section>

        {analysis.parseErrors.length > 0 ? (
          <section className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ef4444]">JSON parse error</p>
            <ul className="mt-3 space-y-2 text-sm text-red-100">
              {analysis.parseErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        ) : analysis.comparison ? (
          <>
            <ComparisonPanel result={analysis.comparison} />

            <section className="grid gap-6 xl:grid-cols-2">
              <SnapshotTable snapshot={analysis.comparison.baseline} />
              <SnapshotTable snapshot={analysis.comparison.current} />
            </section>
          </>
        ) : null}

        <section className="rounded-2xl border border-[#283347] bg-black/30 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Accepted field aliases</p>
          <p className="mt-3 text-sm text-gray-400">
            The parser accepts generic mechanic keys like <span className="font-mono text-white">difficulties</span>, <span className="font-mono text-white">difficultyProfiles</span>, <span className="font-mono text-white">steps</span>, <span className="font-mono text-white">rows</span>, <span className="font-mono text-white">cardCount</span>, <span className="font-mono text-white">safeCards</span>, <span className="font-mono text-white">hazardCards</span>, <span className="font-mono text-white">multiplier</span>, and <span className="font-mono text-white">chance</span>.
          </p>
        </section>
      </div>
    </main>
  );
}

function EditorCard({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#283347] bg-black/30 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">{label}</p>
      <p className="mt-2 text-sm text-gray-400">{helper}</p>
      <textarea
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-4 h-[26rem] w-full rounded-2xl border border-[#283347] bg-[#05070b] p-4 font-mono text-xs text-gray-200 outline-none transition focus:border-[#17c3b2]"
      />
    </div>
  );
}
