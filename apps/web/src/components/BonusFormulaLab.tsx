// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13
'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface BonusFormulaEntry {
  id: string;
  weeklyWager: number;
  weeklyNetPl: number;
  collectedBonus: number;
  recordedAt: string;
}

interface ModelFit {
  intercept: number;
  wagerCoeff: number;
  netPlCoeff: number;
  averageRate: number;
  residualStdDev: number;
  sampleSize: number;
  formulaLabel: string;
  confidenceLabel: 'low' | 'medium' | 'high';
}

interface ForecastInputs {
  weeklyWager: string;
  weeklyNetPl: string;
  actualBonus: string;
}

const ENTRY_STORAGE_KEY = 'bonuscheck_formula_entries_v1';
const FORECAST_STORAGE_KEY = 'bonuscheck_formula_forecast_v1';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function solveLinearSystem3x3(matrix: number[][], vector: number[]): number[] | null {
  const a = matrix.map((row) => [...row]);
  const b = [...vector];

  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 3; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
        pivot = row;
      }
    }

    if (Math.abs(a[pivot][col]) < 1e-9) {
      return null;
    }

    if (pivot !== col) {
      [a[col], a[pivot]] = [a[pivot], a[col]];
      [b[col], b[pivot]] = [b[pivot], b[col]];
    }

    const pivotValue = a[col][col];
    for (let inner = col; inner < 3; inner += 1) {
      a[col][inner] /= pivotValue;
    }
    b[col] /= pivotValue;

    for (let row = 0; row < 3; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let inner = col; inner < 3; inner += 1) {
        a[row][inner] -= factor * a[col][inner];
      }
      b[row] -= factor * b[col];
    }
  }

  return b;
}

function fitModel(entries: BonusFormulaEntry[]): ModelFit | null {
  if (entries.length === 0) {
    return null;
  }

  const totalBonus = entries.reduce((sum, entry) => sum + entry.collectedBonus, 0);
  const totalWager = entries.reduce((sum, entry) => sum + entry.weeklyWager, 0);
  const averageBonus = totalBonus / entries.length;
  const averageRate = totalWager > 0 ? totalBonus / totalWager : 0;

  if (entries.length < 3 || totalWager <= 0) {
    const residuals = entries.map((entry) => entry.collectedBonus - averageBonus);
    const residualStdDev = Math.sqrt(
      residuals.reduce((sum, value) => sum + value * value, 0) / Math.max(entries.length, 1)
    );

    return {
      intercept: averageBonus,
      wagerCoeff: 0,
      netPlCoeff: 0,
      averageRate,
      residualStdDev,
      sampleSize: entries.length,
      formulaLabel: `${formatCurrency(averageBonus)} flat estimate until more history lands`,
      confidenceLabel: 'low',
    };
  }

  const scaled = entries.map((entry) => ({
    x0: 1,
    x1: entry.weeklyWager / 1000,
    x2: entry.weeklyNetPl / 1000,
    y: entry.collectedBonus,
  }));

  const xtx = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const xty = [0, 0, 0];

  for (const row of scaled) {
    const vector = [row.x0, row.x1, row.x2];
    for (let i = 0; i < 3; i += 1) {
      xty[i] += vector[i] * row.y;
      for (let j = 0; j < 3; j += 1) {
        xtx[i][j] += vector[i] * vector[j];
      }
    }
  }

  const solution = solveLinearSystem3x3(xtx, xty);
  if (!solution) {
    const residuals = entries.map((entry) => entry.collectedBonus - averageBonus);
    const residualStdDev = Math.sqrt(
      residuals.reduce((sum, value) => sum + value * value, 0) / entries.length
    );

    return {
      intercept: averageBonus,
      wagerCoeff: averageRate * 1000,
      netPlCoeff: 0,
      averageRate,
      residualStdDev,
      sampleSize: entries.length,
      formulaLabel: `${formatCurrency(averageRate * 1000)} per $1k wager baseline`,
      confidenceLabel: entries.length >= 4 ? 'medium' : 'low',
    };
  }

  const [intercept, wagerCoeff, netPlCoeff] = solution;
  const predictions = scaled.map((row) => intercept + wagerCoeff * row.x1 + netPlCoeff * row.x2);
  const residualStdDev = Math.sqrt(
    predictions.reduce((sum, prediction, index) => {
      const delta = scaled[index].y - prediction;
      return sum + delta * delta;
    }, 0) / entries.length
  );

  const normalizedNoise = averageBonus > 0 ? residualStdDev / averageBonus : 1;
  const confidenceLabel: ModelFit['confidenceLabel'] =
    entries.length >= 6 && normalizedNoise <= 0.2
      ? 'high'
      : entries.length >= 4 && normalizedNoise <= 0.45
        ? 'medium'
        : 'low';

  return {
    intercept,
    wagerCoeff,
    netPlCoeff,
    averageRate,
    residualStdDev,
    sampleSize: entries.length,
    formulaLabel: `${formatCurrency(intercept)} + ${formatCurrency(wagerCoeff)} per $1k wager ${netPlCoeff >= 0 ? '+' : '-'} ${formatCurrency(Math.abs(netPlCoeff))} per $1k P/L`,
    confidenceLabel,
  };
}

function predictBonus(model: ModelFit | null, weeklyWager: number, weeklyNetPl: number): number {
  if (!model) {
    return 0;
  }

  const prediction =
    model.intercept + model.wagerCoeff * (weeklyWager / 1000) + model.netPlCoeff * (weeklyNetPl / 1000);

  return Math.max(0, prediction);
}

function getLightBonusSignal(model: ModelFit | null, predictedBonus: number, actualBonus: number | null) {
  if (!model || actualBonus === null || predictedBonus <= 0) {
    return null;
  }

  const toleratedDrop = Math.max(model.residualStdDev, predictedBonus * 0.1, 0.5);
  const delta = actualBonus - predictedBonus;

  if (actualBonus < predictedBonus - toleratedDrop) {
    return {
      verdict: 'light' as const,
      message: `This hit landed ${formatCurrency(Math.abs(delta))} under the model. Casino might have tightened the formula.`,
    };
  }

  return {
    verdict: 'on-track' as const,
    message: `This landed within the model band (${formatCurrency(toleratedDrop)} tolerance).`,
  };
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function createEntryId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-bonuscheck-entry`;
}

export default function BonusFormulaLab() {
  const [entries, setEntries] = useState<BonusFormulaEntry[]>([]);
  const [form, setForm] = useState<ForecastInputs>({
    weeklyWager: '',
    weeklyNetPl: '',
    actualBonus: '',
  });
  const [forecast, setForecast] = useState<ForecastInputs>({
    weeklyWager: '',
    weeklyNetPl: '',
    actualBonus: '',
  });

  useEffect(() => {
    try {
      const storedEntries = window.localStorage.getItem(ENTRY_STORAGE_KEY);
      const storedForecast = window.localStorage.getItem(FORECAST_STORAGE_KEY);

      if (storedEntries) {
        const parsedEntries = JSON.parse(storedEntries) as BonusFormulaEntry[];
        if (Array.isArray(parsedEntries)) {
          setEntries(parsedEntries);
        }
      }

      if (storedForecast) {
        const parsedForecast = JSON.parse(storedForecast) as ForecastInputs;
        setForecast(parsedForecast);
      }
    } catch (error) {
      console.error('[BonusFormulaLab] Failed to restore local data:', error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('[BonusFormulaLab] Failed to persist entries:', error);
    }
  }, [entries]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FORECAST_STORAGE_KEY, JSON.stringify(forecast));
    } catch (error) {
      console.error('[BonusFormulaLab] Failed to persist forecast:', error);
    }
  }, [forecast]);

  const model = useMemo(() => fitModel(entries), [entries]);
  const projectedWager = parseNumber(forecast.weeklyWager);
  const projectedNetPl = parseNumber(forecast.weeklyNetPl);
  const actualBonus = forecast.actualBonus.trim() === '' ? null : parseNumber(forecast.actualBonus);
  const predictedBonus = predictBonus(model, projectedWager, projectedNetPl);
  const lightSignal = getLightBonusSignal(model, predictedBonus, actualBonus);

  const entryDiagnostics = useMemo(() => {
    return entries.map((entry, index) => {
      const comparisonPool = entries.length >= 4 ? entries.filter((_, rowIndex) => rowIndex !== index) : entries;
      const comparisonModel = fitModel(comparisonPool);
      const predicted = predictBonus(comparisonModel, entry.weeklyWager, entry.weeklyNetPl);
      const signal = getLightBonusSignal(comparisonModel, predicted, entry.collectedBonus);

      return {
        id: entry.id,
        predicted,
        signal,
      };
    });
  }, [entries]);

  const handleAddEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const weeklyWager = parseNumber(form.weeklyWager);
    const weeklyNetPl = parseNumber(form.weeklyNetPl);
    const collectedBonus = parseNumber(form.actualBonus);

    if (weeklyWager <= 0 || collectedBonus <= 0) {
      return;
    }

    setEntries((current) => [
      {
        id: createEntryId(),
        weeklyWager,
        weeklyNetPl,
        collectedBonus,
        recordedAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setForm({ weeklyWager: '', weeklyNetPl: '', actualBonus: '' });
  };

  const removeEntry = (entryId: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
  };

  return (
    <section className="py-16 px-4 border-b border-[#283347]">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mb-8">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">BONUSCHECK 2.0</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
            Reverse-engineer the reload formula
          </h2>
          <p className="text-sm md:text-base text-gray-400 font-mono leading-relaxed">
            Log your weekly wager, net P/L, and actual bonus. TiltCheck fits a simple payout model, predicts the next
            reload, and flags bonuses that come in suspiciously light.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="space-y-6">
            <div className="border border-[#283347] bg-[#111827]/40 p-6">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2] mb-2">MODEL STATUS</p>
                  <p className="text-lg font-black uppercase tracking-tight">
                    {model ? model.formulaLabel : 'Need data before the math talks back'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Confidence</p>
                  <p className="text-sm font-black uppercase tracking-widest text-white">
                    {model?.confidenceLabel ?? 'none'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[#283347] bg-[#0a0c10] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Sample Size</p>
                  <p className="text-2xl font-black">{model?.sampleSize ?? 0}</p>
                </div>
                <div className="border border-[#283347] bg-[#0a0c10] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Avg Bonus Rate</p>
                  <p className="text-2xl font-black">
                    {model ? `${(model.averageRate * 100).toFixed(2)}%` : '0.00%'}
                  </p>
                </div>
                <div className="border border-[#283347] bg-[#0a0c10] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Noise Band</p>
                  <p className="text-2xl font-black">{model ? formatCurrency(model.residualStdDev) : '$0.00'}</p>
                </div>
              </div>
            </div>

            <div className="border border-[#283347] bg-[#111827]/40 p-6">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2] mb-6">WEEKLY INPUTS</p>
              <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                    Weekly Wager
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.weeklyWager}
                    onChange={(event) => setForm((current) => ({ ...current, weeklyWager: event.target.value }))}
                    className="w-full bg-[#0a0c10] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
                    placeholder="2500"
                    required
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                    Weekly P/L
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.weeklyNetPl}
                    onChange={(event) => setForm((current) => ({ ...current, weeklyNetPl: event.target.value }))}
                    className="w-full bg-[#0a0c10] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
                    placeholder="-180"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                    Bonus Received
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.actualBonus}
                    onChange={(event) => setForm((current) => ({ ...current, actualBonus: event.target.value }))}
                    className="w-full bg-[#0a0c10] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
                    placeholder="22.50"
                    required
                  />
                </label>
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    className="w-full border border-[#17c3b2] text-[#17c3b2] font-black uppercase tracking-widest text-sm px-6 py-3 hover:bg-[#17c3b2] hover:text-black transition-colors"
                  >
                    Add Weekly Bonus Snapshot
                  </button>
                </div>
              </form>
            </div>

            <div className="border border-[#283347] bg-[#111827]/40 p-6">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2] mb-6">BONUS HISTORY</p>
              {entries.length === 0 ? (
                <p className="text-sm font-mono text-gray-500">
                  No payout history yet. Three or more snapshots gives the formula enough signal to stop guessing.
                </p>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry, index) => {
                    const diagnostics = entryDiagnostics.find((item) => item.id === entry.id);
                    return (
                      <div key={entry.id} className="border border-[#283347] bg-[#0a0c10] p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-2">
                            <p className="text-sm font-black uppercase tracking-tight">
                              {formatCurrency(entry.collectedBonus)} bonus on {formatCurrency(entry.weeklyWager)} wager
                            </p>
                            <p className="text-[11px] font-mono uppercase tracking-widest text-gray-500">
                              {formatDateTime(entry.recordedAt)} | P/L {formatSignedCurrency(entry.weeklyNetPl)}
                            </p>
                            <p className="text-[11px] font-mono text-gray-400">
                              Model read: {formatCurrency(diagnostics?.predicted ?? 0)} predicted
                              {diagnostics?.signal
                                ? ` | ${diagnostics.signal.verdict === 'light' ? 'LIGHT' : 'ON TRACK'}`
                                : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="text-[11px] font-black font-mono uppercase px-3 py-1.5 border border-gray-700 text-gray-500 hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        {diagnostics?.signal && (
                          <p
                            className={`mt-3 text-[11px] font-mono ${
                              diagnostics.signal.verdict === 'light' ? 'text-[#ef4444]' : 'text-[#17c3b2]'
                            }`}
                          >
                            {diagnostics.signal.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-[#283347] bg-[#111827]/40 p-6">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2] mb-6">NEXT BONUS FORECAST</p>
              <div className="space-y-4">
                <label className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                    Projected Weekly Wager
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={forecast.weeklyWager}
                    onChange={(event) =>
                      setForecast((current) => ({ ...current, weeklyWager: event.target.value }))
                    }
                    className="w-full bg-[#0a0c10] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
                    placeholder="3000"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                    Projected Weekly P/L
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={forecast.weeklyNetPl}
                    onChange={(event) =>
                      setForecast((current) => ({ ...current, weeklyNetPl: event.target.value }))
                    }
                    className="w-full bg-[#0a0c10] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
                    placeholder="-75"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                    Actual Bonus (Optional)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={forecast.actualBonus}
                    onChange={(event) =>
                      setForecast((current) => ({ ...current, actualBonus: event.target.value }))
                    }
                    className="w-full bg-[#0a0c10] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
                    placeholder="20"
                  />
                </label>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4">
                <div className="border border-[#283347] bg-[#0a0c10] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Predicted Bonus</p>
                  <p className="text-3xl font-black">{formatCurrency(predictedBonus)}</p>
                </div>
                <div className="border border-[#283347] bg-[#0a0c10] p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Expected Range</p>
                  <p className="text-xl font-black">
                    {model
                      ? `${formatCurrency(Math.max(0, predictedBonus - model.residualStdDev))} - ${formatCurrency(
                          predictedBonus + model.residualStdDev
                        )}`
                      : '$0.00 - $0.00'}
                  </p>
                </div>
                <div
                  className={`border p-4 ${
                    lightSignal?.verdict === 'light'
                      ? 'border-[#ef4444]/40 bg-[#ef4444]/10'
                      : 'border-[#283347] bg-[#0a0c10]'
                  }`}
                >
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Formula Verdict</p>
                  <p className="text-sm font-mono text-white">
                    {lightSignal?.message ??
                      'Plug in an actual bonus after the reload lands and this box will tell you whether the casino came in light.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[#283347] bg-[#111827]/40 p-6">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2] mb-4">HOW TO USE IT</p>
              <div className="space-y-3 text-sm font-mono text-gray-400 leading-relaxed">
                <p>1. Drop in at least three weekly snapshots from the same casino.</p>
                <p>2. Keep wager and bonus in the same unit every time. USD in, USD out. No mixed units.</p>
                <p>3. Use the forecast box before the next reload hits, then compare with the actual amount.</p>
                <p>4. If light flags stack up, the bonus formula probably changed. That is your cue to stop glazing the reload.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
