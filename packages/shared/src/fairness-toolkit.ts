// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09

import type {
  FairnessToolkitDataSourceDefinition,
  FairnessToolkitDriftDefinition,
  FairnessToolkitDriftDirection,
  FairnessToolkitSeedRotationDefinition,
  FairnessToolkitSourceState,
  FairnessToolkitWindowDefinition,
  SeedAuditConfidenceTier,
} from '@tiltcheck/types';

const DEFAULT_MINIMUM_SAMPLE_SIZE = 500;

type DataSourceDefinitionInput = Omit<FairnessToolkitDataSourceDefinition, 'state' | 'reason'> & {
  isAvailable?: boolean;
  hasUsableSamples?: boolean;
  maxSourceAgeMs?: number;
  now?: number;
  reason?: string;
};

type WindowDefinitionInput = Omit<FairnessToolkitWindowDefinition, 'minimumSampleSize'> & {
  minimumSampleSize?: number;
};

export interface FairnessDriftEvaluationInput {
  source: FairnessToolkitDataSourceDefinition;
  window: FairnessToolkitWindowDefinition;
  baselineMetric: number;
  observedMetric: number;
  threshold: number;
}

export interface SeedRotationMonitorInput {
  source: FairnessToolkitDataSourceDefinition;
  window: FairnessToolkitWindowDefinition;
  observedRotationCount: number;
  expectedRotationInterval?: number;
  observedAverageInterval?: number;
  tolerance?: number;
}

function pickConfidence(state: FairnessToolkitSourceState, window: FairnessToolkitWindowDefinition): SeedAuditConfidenceTier {
  if (state === 'unknown') {
    return 'unknown';
  }

  if (state === 'degraded') {
    return 'low';
  }

  if (window.sampleSize < window.minimumSampleSize) {
    return 'low';
  }

  if (window.sampleSize >= window.minimumSampleSize * 4) {
    return 'high';
  }

  return 'medium';
}

function formatMetric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getDriftDirection(delta: number, threshold: number): FairnessToolkitDriftDirection {
  if (Math.abs(delta) < threshold) {
    return 'flat';
  }

  return delta > 0 ? 'above-baseline' : 'below-baseline';
}

export function defineFairnessDataSource(input: DataSourceDefinitionInput): FairnessToolkitDataSourceDefinition {
  if (input.isAvailable === undefined) {
    return {
      ...input,
      state: 'unknown',
      reason: input.reason ?? 'Source availability has not been checked.',
    };
  }

  if (!input.isAvailable) {
    return {
      ...input,
      state: 'degraded',
      reason: input.reason ?? 'Source is unavailable; fairness output should stay degraded.',
    };
  }

  if (
    input.expectedSchemaVersion
    && input.schemaVersion
    && input.schemaVersion !== input.expectedSchemaVersion
  ) {
    return {
      ...input,
      state: 'unknown',
      reason: input.reason ?? 'Source schema changed; hold drift classification until the parser is reviewed.',
    };
  }

  if (
    input.lastCheckedAt !== undefined
    && input.maxSourceAgeMs !== undefined
    && (input.now ?? Date.now()) - input.lastCheckedAt > input.maxSourceAgeMs
  ) {
    return {
      ...input,
      state: 'degraded',
      reason: input.reason ?? 'Source data is stale for this monitor window.',
    };
  }

  if (input.hasUsableSamples === false) {
    return {
      ...input,
      state: 'degraded',
      reason: input.reason ?? 'Source responded but did not include usable samples.',
    };
  }

  return {
    ...input,
    state: 'live',
    reason: input.reason,
  };
}

export function defineFairnessWindow(input: WindowDefinitionInput): FairnessToolkitWindowDefinition {
  return {
    ...input,
    sampleSize: Math.max(0, input.sampleSize),
    minimumSampleSize: input.minimumSampleSize ?? DEFAULT_MINIMUM_SAMPLE_SIZE,
  };
}

export function evaluateFairnessDrift(input: FairnessDriftEvaluationInput): FairnessToolkitDriftDefinition {
  const absoluteDelta = input.observedMetric - input.baselineMetric;
  const threshold = Math.abs(input.threshold);
  const direction = getDriftDirection(absoluteDelta, threshold);
  const relativeDelta = input.baselineMetric === 0 ? null : absoluteDelta / Math.abs(input.baselineMetric);
  const state: FairnessToolkitSourceState = input.source.state !== 'live'
    ? input.source.state
    : input.window.sampleSize < input.window.minimumSampleSize
      ? 'degraded'
      : 'live';
  const confidence = pickConfidence(state, input.window);

  const summary = (() => {
    if (input.source.state === 'unknown') {
      return 'Data source shape is unknown; drift classification is paused.';
    }

    if (input.source.state === 'degraded') {
      return 'Data source is degraded; drift output is informational only.';
    }

    if (input.window.sampleSize < input.window.minimumSampleSize) {
      return `Window has ${input.window.sampleSize} sample(s); minimum for drift classification is ${input.window.minimumSampleSize}.`;
    }

    if (direction === 'flat') {
      return `Observed metric is within ${formatMetric(threshold)} point(s) of baseline for ${input.window.label}.`;
    }

    return `Observed metric is ${formatMetric(Math.abs(absoluteDelta))} point(s) ${
      direction === 'below-baseline' ? 'below' : 'above'
    } baseline for ${input.window.label}.`;
  })();

  return {
    source: input.source,
    window: input.window,
    baselineMetric: input.baselineMetric,
    observedMetric: input.observedMetric,
    absoluteDelta,
    relativeDelta,
    threshold,
    direction,
    state,
    confidence,
    summary,
  };
}

export function defineSeedRotationMonitor(input: SeedRotationMonitorInput): FairnessToolkitSeedRotationDefinition {
  const state: FairnessToolkitSourceState = input.source.state !== 'live'
    ? input.source.state
    : input.window.sampleSize < input.window.minimumSampleSize
      ? 'degraded'
      : input.expectedRotationInterval === undefined || input.observedAverageInterval === undefined
        ? 'unknown'
        : 'live';
  const confidence = pickConfidence(state, input.window);

  const summary = (() => {
    if (input.source.state !== 'live') {
      return 'Seed rotation monitor is waiting on a usable source.';
    }

    if (input.window.sampleSize < input.window.minimumSampleSize) {
      return `Window has ${input.window.sampleSize} sample(s); seed rotation checks need ${input.window.minimumSampleSize}.`;
    }

    if (input.expectedRotationInterval === undefined || input.observedAverageInterval === undefined) {
      return 'Seed rotation interval is not defined for this source.';
    }

    const tolerance = input.tolerance ?? 0;
    const delta = Math.abs(input.observedAverageInterval - input.expectedRotationInterval);

    if (delta <= tolerance) {
      return `Observed seed rotation interval stays within ${formatMetric(tolerance)} ${input.window.unit}(s) of the declared schedule.`;
    }

    return `Observed seed rotation interval differs from the declared schedule by ${formatMetric(delta)} ${input.window.unit}(s).`;
  })();

  return {
    source: input.source,
    window: input.window,
    observedRotationCount: input.observedRotationCount,
    expectedRotationInterval: input.expectedRotationInterval,
    observedAverageInterval: input.observedAverageInterval,
    tolerance: input.tolerance,
    state,
    confidence,
    summary,
  };
}
