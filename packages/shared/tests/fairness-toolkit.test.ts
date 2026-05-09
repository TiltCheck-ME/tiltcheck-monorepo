// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09

import { describe, expect, it } from 'vitest';
import {
  defineFairnessDataSource,
  defineFairnessWindow,
  defineSeedRotationMonitor,
  evaluateFairnessDrift,
} from '../src/fairness-toolkit.js';

describe('fairness toolkit definitions', () => {
  it('marks schema changes as unknown before drift classification', () => {
    const source = defineFairnessDataSource({
      id: 'rtp-api',
      label: 'RTP API',
      type: 'operator-api',
      isAvailable: true,
      schemaVersion: 'v2',
      expectedSchemaVersion: 'v1',
    });

    const window = defineFairnessWindow({
      id: 'hourly',
      label: 'Hourly RTP window',
      unit: 'spin',
      sampleSize: 2000,
      minimumSampleSize: 500,
    });

    const drift = evaluateFairnessDrift({
      source,
      window,
      baselineMetric: 96,
      observedMetric: 91,
      threshold: 2,
    });

    expect(source.state).toBe('unknown');
    expect(drift.state).toBe('unknown');
    expect(drift.confidence).toBe('unknown');
    expect(drift.summary).toContain('paused');
  });

  it('defines drift from explicit source, window, baseline, observed, and threshold inputs', () => {
    const source = defineFairnessDataSource({
      id: 'extension-session',
      label: 'Extension session export',
      type: 'extension-capture',
      isAvailable: true,
      hasUsableSamples: true,
    });
    const window = defineFairnessWindow({
      id: 'session-1',
      label: 'Session 1',
      unit: 'spin',
      sampleSize: 2400,
      minimumSampleSize: 500,
      sourceId: source.id,
    });

    const drift = evaluateFairnessDrift({
      source,
      window,
      baselineMetric: 96.5,
      observedMetric: 92,
      threshold: 2,
    });

    expect(drift.state).toBe('live');
    expect(drift.confidence).toBe('high');
    expect(drift.direction).toBe('below-baseline');
    expect(drift.absoluteDelta).toBeCloseTo(-4.5);
    expect(drift.relativeDelta).toBeCloseTo(-4.5 / 96.5);
  });

  it('degrades small windows instead of overstating statistical confidence', () => {
    const source = defineFairnessDataSource({
      id: 'manual-entry',
      label: 'Manual entry',
      type: 'manual-entry',
      isAvailable: true,
      hasUsableSamples: true,
    });
    const window = defineFairnessWindow({
      id: 'tiny',
      label: 'Tiny sample',
      unit: 'spin',
      sampleSize: 12,
      minimumSampleSize: 500,
    });

    const drift = evaluateFairnessDrift({
      source,
      window,
      baselineMetric: 96,
      observedMetric: 84,
      threshold: 2,
    });

    expect(drift.state).toBe('degraded');
    expect(drift.confidence).toBe('low');
    expect(drift.summary).toContain('minimum for drift classification');
  });

  it('keeps seed rotation unknown until the expected interval is defined', () => {
    const source = defineFairnessDataSource({
      id: 'seed-export',
      label: 'Seed export',
      type: 'player-export',
      isAvailable: true,
      hasUsableSamples: true,
    });
    const window = defineFairnessWindow({
      id: 'rotation-window',
      label: 'Rotation window',
      unit: 'bet',
      sampleSize: 900,
      minimumSampleSize: 500,
    });

    const rotation = defineSeedRotationMonitor({
      source,
      window,
      observedRotationCount: 2,
    });

    expect(rotation.state).toBe('unknown');
    expect(rotation.confidence).toBe('unknown');
    expect(rotation.summary).toContain('not defined');
  });
});
