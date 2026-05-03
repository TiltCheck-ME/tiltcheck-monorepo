/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as promClient from 'prom-client';
import path from 'path';
import fs from 'fs';
import { triviaManager } from '../src/trivia-manager.js';

const TMP_STATE = path.join(__dirname, 'tmp-trivia-state.json');

beforeAll(async () => {
  if (fs.existsSync(TMP_STATE)) fs.unlinkSync(TMP_STATE);
  // Initialize trivia manager with a test state file
  await triviaManager.initialize({ stateFilePath: TMP_STATE });
});

afterAll(() => {
  try { promClient.register.clear(); } catch {}
  if (fs.existsSync(TMP_STATE)) fs.unlinkSync(TMP_STATE);
});

describe('Trivia persistence & metrics', () => {
  it('getPersistenceStatus returns expected shape', async () => {
    const status = await triviaManager.getPersistenceStatus();
    expect(status).toHaveProperty('stateFilePath');
    expect(status).toHaveProperty('stats');
    expect(typeof status.stats.persistErrorCount).toBe('number');
  });

  it('scheduling a game emits a snapshot save metric', async () => {
    const result = await triviaManager.scheduleGame({ totalRounds: 3, startTime: Date.now() + 1000 });
    expect(result.success).toBe(true);

    const metrics = await promClient.register.getMetricsAsJSON();
    const snapshotMetric = metrics.find((m) => m.name === 'trivia_snapshot_saves_total');
    expect(snapshotMetric).toBeDefined();
    const value = snapshotMetric?.metrics?.[0]?.value ?? 0;
    expect(value).toBeGreaterThanOrEqual(1);
  });
});
