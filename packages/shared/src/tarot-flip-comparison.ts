/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25 */

type JsonRecord = Record<string, unknown>;

const ROOT_DIFFICULTY_KEYS = ['difficulties', 'difficultyProfiles', 'modes', 'profiles'] as const;
const STEP_COLLECTION_KEYS = ['steps', 'rows', 'rounds', 'progression', 'flipTable', 'payoutTable'] as const;
const TOTAL_CARD_KEYS = ['totalCards', 'cardCount', 'cards', 'deckSize', 'tileCount'] as const;
const SAFE_CARD_KEYS = ['safeCards', 'safe', 'goodCards', 'safeCount', 'winCards'] as const;
const HAZARD_CARD_KEYS = ['hazardCards', 'hazards', 'bombCards', 'bombs', 'badCards', 'loseCards', 'trapCards'] as const;
const MULTIPLIER_KEYS = ['multiplier', 'payoutMultiplier', 'payout', 'cashoutMultiplier'] as const;
const CHANCE_KEYS = ['winChance', 'probability', 'chance', 'safeChance', 'hitRate', 'declaredChance'] as const;
const STEP_INDEX_KEYS = ['step', 'stepIndex', 'pick', 'pickNumber', 'round', 'row', 'index'] as const;
const SOURCE_LABEL_KEYS = ['sourceLabel', 'source', 'provider', 'snapshotLabel', 'title'] as const;
const GAME_NAME_KEYS = ['gameName', 'name', 'game', 'title'] as const;
const DIFFICULTY_KEY_KEYS = ['key', 'id', 'difficulty', 'mode', 'name', 'label'] as const;

export interface TarotFlipCardRules {
  totalCards: number | null;
  cardsPerFlip: number | null;
  replaceAfterFlip: boolean | null;
}

export interface TarotFlipDifficultyStep {
  step: number;
  totalCards: number | null;
  safeCards: number | null;
  hazardCards: number | null;
  multiplier: number | null;
  declaredChance: number | null;
  recalculatedChance: number | null;
}

export interface TarotFlipDifficultyProfile {
  key: string;
  label: string;
  steps: TarotFlipDifficultyStep[];
}

export interface TarotFlipMechanicsSnapshot {
  sourceLabel: string | null;
  gameName: string | null;
  cardRules: TarotFlipCardRules;
  difficulties: TarotFlipDifficultyProfile[];
  warnings: string[];
}

export interface TarotFlipDifference {
  path: string;
  message: string;
  baseline: string | null;
  current: string | null;
}

export interface TarotFlipDifficultyComparison {
  key: string;
  label: string;
  exactMatch: boolean;
  differences: TarotFlipDifference[];
}

export interface TarotFlipComparisonResult {
  exactMatch: boolean;
  coverage: 'complete' | 'partial' | 'insufficient';
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  baseline: TarotFlipMechanicsSnapshot;
  current: TarotFlipMechanicsSnapshot;
  differences: TarotFlipDifference[];
  zeroTrustWarnings: string[];
  difficultyComparisons: TarotFlipDifficultyComparison[];
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFirstDefined(record: JsonRecord, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/,/g, '');
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.endsWith('%') ? trimmed.slice(0, -1) : trimmed;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes') {
      return true;
    }

    if (normalized === 'false' || normalized === 'no') {
      return false;
    }
  }

  return null;
}

function parseProbability(value: unknown): number | null {
  if (typeof value === 'string' && value.trim().endsWith('%')) {
    const percentage = parseNumber(value);
    return percentage === null ? null : percentage / 100;
  }

  const numeric = parseNumber(value);
  if (numeric === null) {
    return null;
  }

  if (numeric > 1 && numeric <= 100) {
    return numeric / 100;
  }

  return numeric >= 0 && numeric <= 1 ? numeric : null;
}

function normalizeLabel(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function normalizeKey(value: unknown, fallback: string): string {
  const label = normalizeLabel(value, fallback);
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function roundProbability(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatValue(value: number | boolean | string | null): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/g, '').replace(/\.$/g, '');
  }

  return String(value);
}

function numbersMatch(left: number | null, right: number | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return Math.abs(left - right) < 0.000001;
}

function parseCardRules(input: JsonRecord): TarotFlipCardRules {
  const nested = ['cardFlip', 'flipConfig', 'deck', 'board']
    .map((key) => input[key])
    .find((candidate) => isRecord(candidate));
  const source = isRecord(nested) ? nested : input;

  return {
    totalCards: parseNumber(getFirstDefined(source, TOTAL_CARD_KEYS)),
    cardsPerFlip: parseNumber(source.cardsPerFlip ?? source.revealCount ?? source.pickCount),
    replaceAfterFlip: parseBoolean(source.replaceAfterFlip ?? source.withReplacement ?? source.replacement),
  };
}

function resolveStepCollection(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (!isRecord(input)) {
    return [];
  }

  for (const key of STEP_COLLECTION_KEYS) {
    const candidate = input[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function parseDifficultySteps(input: unknown, cardRules: TarotFlipCardRules): TarotFlipDifficultyStep[] {
  return resolveStepCollection(input)
    .map((stepInput, index) => {
      if (!isRecord(stepInput)) {
        return null;
      }

      const totalCards = parseNumber(getFirstDefined(stepInput, TOTAL_CARD_KEYS)) ?? cardRules.totalCards;
      const safeCards = parseNumber(getFirstDefined(stepInput, SAFE_CARD_KEYS));
      const hazardCards = parseNumber(getFirstDefined(stepInput, HAZARD_CARD_KEYS));
      const resolvedSafeCards = safeCards ?? (
        totalCards !== null && hazardCards !== null
          ? Math.max(totalCards - hazardCards, 0)
          : null
      );
      const resolvedHazardCards = hazardCards ?? (
        totalCards !== null && resolvedSafeCards !== null
          ? Math.max(totalCards - resolvedSafeCards, 0)
          : null
      );
      const recalculatedChance = (
        totalCards !== null
        && totalCards > 0
        && resolvedSafeCards !== null
      )
        ? roundProbability(resolvedSafeCards / totalCards)
        : null;

      return {
        step: parseNumber(getFirstDefined(stepInput, STEP_INDEX_KEYS)) ?? index + 1,
        totalCards,
        safeCards: resolvedSafeCards,
        hazardCards: resolvedHazardCards,
        multiplier: parseNumber(getFirstDefined(stepInput, MULTIPLIER_KEYS)),
        declaredChance: roundProbability(parseProbability(getFirstDefined(stepInput, CHANCE_KEYS))),
        recalculatedChance,
      } satisfies TarotFlipDifficultyStep;
    })
    .filter((step): step is TarotFlipDifficultyStep => step !== null)
    .sort((left, right) => left.step - right.step);
}

function resolveDifficultyCandidates(input: JsonRecord): Array<{ key: string | null; value: unknown }> {
  for (const key of ROOT_DIFFICULTY_KEYS) {
    const candidate = input[key];
    if (Array.isArray(candidate)) {
      return candidate.map((entry, index) => ({
        key: isRecord(entry) ? normalizeLabel(getFirstDefined(entry, DIFFICULTY_KEY_KEYS), `difficulty-${index + 1}`) : `difficulty-${index + 1}`,
        value: entry,
      }));
    }

    if (isRecord(candidate)) {
      return Object.entries(candidate).map(([entryKey, value]) => ({ key: entryKey, value }));
    }
  }

  if (resolveStepCollection(input).length > 0) {
    return [{
      key: normalizeLabel(getFirstDefined(input, DIFFICULTY_KEY_KEYS), 'default'),
      value: input,
    }];
  }

  return [];
}

function parseDifficultyProfile(candidate: { key: string | null; value: unknown }, cardRules: TarotFlipCardRules): TarotFlipDifficultyProfile | null {
  if (!isRecord(candidate.value) && !Array.isArray(candidate.value)) {
    return null;
  }

  const source = isRecord(candidate.value)
    ? candidate.value
    : { steps: candidate.value };
  const labelValue = isRecord(source)
    ? getFirstDefined(source, DIFFICULTY_KEY_KEYS)
    : candidate.key;
  const label = normalizeLabel(labelValue ?? candidate.key, 'Default');
  const key = normalizeKey(labelValue ?? candidate.key, 'default');
  const steps = parseDifficultySteps(source, cardRules);

  return {
    key,
    label,
    steps,
  };
}

function collectSnapshotWarnings(snapshot: TarotFlipMechanicsSnapshot): string[] {
  const warnings = [...snapshot.warnings];

  if (snapshot.difficulties.length === 0) {
    warnings.push('No difficulty table was parsed from this snapshot.');
  }

  if (snapshot.difficulties.some((difficulty) => difficulty.steps.length === 0)) {
    warnings.push('At least one difficulty profile has no parseable step table.');
  }

  if (snapshot.cardRules.totalCards === null) {
    warnings.push('Deck size was not explicit, so some chance checks may be partial.');
  }

  return [...new Set(warnings)];
}

export function parseTarotFlipMechanicsSnapshot(
  input: unknown,
  options: { sourceLabel?: string } = {},
): TarotFlipMechanicsSnapshot {
  const root = isRecord(input) ? input : {};
  const cardRules = parseCardRules(root);
  const difficulties = resolveDifficultyCandidates(root)
    .map((candidate) => parseDifficultyProfile(candidate, cardRules))
    .filter((difficulty): difficulty is TarotFlipDifficultyProfile => difficulty !== null);
  const sourceLabel = options.sourceLabel ?? normalizeLabel(getFirstDefined(root, SOURCE_LABEL_KEYS), '');
  const gameName = normalizeLabel(getFirstDefined(root, GAME_NAME_KEYS), '');

  const snapshot: TarotFlipMechanicsSnapshot = {
    sourceLabel: sourceLabel || null,
    gameName: gameName || null,
    cardRules,
    difficulties,
    warnings: [],
  };

  return {
    ...snapshot,
    warnings: collectSnapshotWarnings(snapshot),
  };
}

function buildZeroTrustWarnings(snapshot: TarotFlipMechanicsSnapshot): string[] {
  const warnings: string[] = [];

  for (const difficulty of snapshot.difficulties) {
    for (const step of difficulty.steps) {
      if (
        step.declaredChance !== null
        && step.recalculatedChance !== null
        && !numbersMatch(step.declaredChance, step.recalculatedChance)
      ) {
        warnings.push(
          `${snapshot.sourceLabel ?? 'Snapshot'} · ${difficulty.label} step ${step.step}: declared win chance ${formatValue(step.declaredChance)} disagrees with recalculated ${formatValue(step.recalculatedChance)}.`,
        );
      }
    }
  }

  return warnings;
}

function compareDifficultyProfiles(
  baseline: TarotFlipDifficultyProfile,
  current: TarotFlipDifficultyProfile,
): TarotFlipDifficultyComparison {
  const differences: TarotFlipDifference[] = [];
  const maxStepCount = Math.max(baseline.steps.length, current.steps.length);

  if (baseline.steps.length !== current.steps.length) {
    differences.push({
      path: `${baseline.key}.steps`,
      message: `Step count changed for ${baseline.label}.`,
      baseline: formatValue(baseline.steps.length),
      current: formatValue(current.steps.length),
    });
  }

  for (let index = 0; index < maxStepCount; index += 1) {
    const left = baseline.steps[index];
    const right = current.steps[index];
    const pathPrefix = `${baseline.key}.step-${index + 1}`;

    if (!left || !right) {
      differences.push({
        path: pathPrefix,
        message: `Step ${index + 1} exists on only one side.`,
        baseline: left ? 'present' : 'missing',
        current: right ? 'present' : 'missing',
      });
      continue;
    }

    const fieldComparisons: Array<{
      path: string;
      message: string;
      baseline: number | null;
      current: number | null;
    }> = [
      { path: `${pathPrefix}.totalCards`, message: 'Total cards changed.', baseline: left.totalCards, current: right.totalCards },
      { path: `${pathPrefix}.safeCards`, message: 'Safe-card count changed.', baseline: left.safeCards, current: right.safeCards },
      { path: `${pathPrefix}.hazardCards`, message: 'Hazard-card count changed.', baseline: left.hazardCards, current: right.hazardCards },
      { path: `${pathPrefix}.multiplier`, message: 'Multiplier changed.', baseline: left.multiplier, current: right.multiplier },
      {
        path: `${pathPrefix}.recalculatedChance`,
        message: 'Recalculated win chance changed.',
        baseline: left.recalculatedChance,
        current: right.recalculatedChance,
      },
    ];

    for (const field of fieldComparisons) {
      if (!numbersMatch(field.baseline, field.current)) {
        differences.push({
          path: field.path,
          message: field.message,
          baseline: formatValue(field.baseline),
          current: formatValue(field.current),
        });
      }
    }
  }

  return {
    key: baseline.key,
    label: baseline.label,
    exactMatch: differences.length === 0,
    differences,
  };
}

function summarizeComparison(
  exactMatch: boolean,
  coverage: TarotFlipComparisonResult['coverage'],
  differenceCount: number,
  zeroTrustWarningCount: number,
): string {
  if (coverage === 'insufficient') {
    return 'Comparison framework is live, but one side is missing enough card or difficulty data to make a hard call.';
  }

  if (exactMatch) {
    return zeroTrustWarningCount > 0
      ? 'Difficulty tables line up, but at least one declared chance does not survive zero-trust recalculation.'
      : 'Current runtime matches the stored Tarot flip logic on the parsed card and difficulty tables.';
  }

  return `${differenceCount} logic difference${differenceCount === 1 ? '' : 's'} detected across card rules and difficulty tables.`;
}

export function compareTarotFlipMechanics(
  baselineInput: unknown,
  currentInput: unknown,
): TarotFlipComparisonResult {
  const baseline = parseTarotFlipMechanicsSnapshot(baselineInput, { sourceLabel: 'Stored baseline' });
  const current = parseTarotFlipMechanicsSnapshot(currentInput, { sourceLabel: 'Current runtime' });
  const differences: TarotFlipDifference[] = [];

  if (!numbersMatch(baseline.cardRules.totalCards, current.cardRules.totalCards)) {
    differences.push({
      path: 'cardRules.totalCards',
      message: 'Deck size changed.',
      baseline: formatValue(baseline.cardRules.totalCards),
      current: formatValue(current.cardRules.totalCards),
    });
  }

  if (!numbersMatch(baseline.cardRules.cardsPerFlip, current.cardRules.cardsPerFlip)) {
    differences.push({
      path: 'cardRules.cardsPerFlip',
      message: 'Cards-per-flip changed.',
      baseline: formatValue(baseline.cardRules.cardsPerFlip),
      current: formatValue(current.cardRules.cardsPerFlip),
    });
  }

  if (baseline.cardRules.replaceAfterFlip !== current.cardRules.replaceAfterFlip) {
    differences.push({
      path: 'cardRules.replaceAfterFlip',
      message: 'Replacement policy changed.',
      baseline: formatValue(baseline.cardRules.replaceAfterFlip),
      current: formatValue(current.cardRules.replaceAfterFlip),
    });
  }

  const currentByKey = new Map(current.difficulties.map((difficulty) => [difficulty.key, difficulty]));
  const baselineByKey = new Map(baseline.difficulties.map((difficulty) => [difficulty.key, difficulty]));
  const unionKeys = [...new Set([...baselineByKey.keys(), ...currentByKey.keys()])];
  const difficultyComparisons: TarotFlipDifficultyComparison[] = [];

  for (const key of unionKeys) {
    const left = baselineByKey.get(key);
    const right = currentByKey.get(key);

    if (!left || !right) {
      difficultyComparisons.push({
        key,
        label: left?.label ?? right?.label ?? key,
        exactMatch: false,
        differences: [{
          path: `difficulties.${key}`,
          message: 'Difficulty profile exists on only one side.',
          baseline: left ? 'present' : 'missing',
          current: right ? 'present' : 'missing',
        }],
      });
      continue;
    }

    difficultyComparisons.push(compareDifficultyProfiles(left, right));
  }

  for (const comparison of difficultyComparisons) {
    differences.push(...comparison.differences);
  }

  const zeroTrustWarnings = [
    ...baseline.warnings.map((warning) => `Stored baseline: ${warning}`),
    ...current.warnings.map((warning) => `Current runtime: ${warning}`),
    ...buildZeroTrustWarnings(baseline),
    ...buildZeroTrustWarnings(current),
  ];

  const hasDifficultyCoverage = baseline.difficulties.some((difficulty) => difficulty.steps.length > 0)
    && current.difficulties.some((difficulty) => difficulty.steps.length > 0);
  const hasPartialFields = [...baseline.difficulties, ...current.difficulties].some((difficulty) => difficulty.steps.some(
    (step) => step.totalCards === null || step.safeCards === null || step.hazardCards === null,
  ));
  const coverage: TarotFlipComparisonResult['coverage'] = !hasDifficultyCoverage
    ? 'insufficient'
    : hasPartialFields
      ? 'partial'
      : 'complete';
  const exactMatch = differences.length === 0;

  return {
    exactMatch,
    coverage,
    confidence: coverage === 'complete' ? 'high' : coverage === 'partial' ? 'medium' : 'low',
    summary: summarizeComparison(exactMatch, coverage, differences.length, zeroTrustWarnings.length),
    baseline,
    current,
    differences,
    zeroTrustWarnings,
    difficultyComparisons,
  };
}
