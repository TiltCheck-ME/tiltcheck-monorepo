/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * /stats route for landing page KPI strip.
 * Aggregates KPIs from repository-backed trust datasets.
 */
import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const router = Router();
const STATS_CONTRACT_VERSION = '2026-03-08';

function getDataDir(): string {
  return process.env.STATS_DATA_DIR || path.resolve(process.cwd(), 'data');
}

type TrustRollupsFile = {
  batches?: Array<{
    generatedAt?: string;
    domain?: { domains?: Record<string, { events?: number }> };
  }>;
};

type DomainTrustScoresFile = {
  generatedAt?: string;
  domains?: Array<{ score?: number }>;
};

type CasinoRow = { risk?: string };

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toSafeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function isHighRiskLabel(label: string | undefined): boolean {
  const risk = (label || '').toLowerCase();
  return risk.includes('high') || risk.includes('critical');
}

async function computeStats() {
  const dataDir = getDataDir();
  const trustRollupsPath = path.join(dataDir, 'trust-rollups.json');
  const domainTrustScoresPath = path.join(dataDir, 'domain-trust-scores.json');
  const sweepstakesCasinosPath = path.join(dataDir, 'sweepstakes-casinos.json');

  const [trustRollups, domainScores, sweepstakesCasinos] = await Promise.all([
    readJson<TrustRollupsFile>(trustRollupsPath, { batches: [] }),
    readJson<DomainTrustScoresFile>(domainTrustScoresPath, { domains: [] }),
    readJson<CasinoRow[]>(sweepstakesCasinosPath, []),
  ]);

  const latestBatch = trustRollups.batches?.at(-1);
  const domainEvents = Object.values(latestBatch?.domain?.domains || {}).reduce(
    (sum, row) => sum + toSafeCount(row?.events || 0),
    0,
  );

  const trackedDomains = toSafeCount((domainScores.domains || []).length);
  const highRiskDomains = (domainScores.domains || []).filter(
    (domain) => Number.isFinite(domain?.score) && Number(domain.score) < 40,
  ).length;
  const highRiskCasinos = (sweepstakesCasinos || []).filter((casino) =>
    isHighRiskLabel(casino.risk),
  ).length;

  const communitiesProtected = trackedDomains;
  const scansLast24h = domainEvents;
  const highRiskBlocked = toSafeCount(highRiskDomains + highRiskCasinos);
  const sourceUpdatedAt =
    domainScores.generatedAt || latestBatch?.generatedAt || new Date().toISOString();

  return {
    communitiesProtected,
    scansLast24h,
    highRiskBlocked,
    updatedAt: sourceUpdatedAt,
    contractVersion: STATS_CONTRACT_VERSION,
    sources: {
      trustRollupsPath,
      domainTrustScoresPath,
      sweepstakesCasinosPath,
    },
    predictions: [
      { id: 'p1', source: 'instagram', label: 'IG Flash Code', estimatedAt: Date.now() + 2700000, confidence: 0.85 },
      { id: 'p2', source: 'x', label: 'X Weekly Drop', estimatedAt: Date.now() + 43200000, confidence: 0.92 },
      { id: 'p3', source: 'telegram', label: 'Telegram Rain', estimatedAt: Date.now() + 300000, confidence: 0.60 }
    ]
  };
}

router.get('/signals', async (_req, res) => {
  const dataDir = getDataDir();
  const signalsPath = path.join(dataDir, 'web_signals.json');
  const signals = await readJson<any[]>(signalsPath, []);
  res.json({
    ok: true,
    signals,
  });
});

export { STATS_CONTRACT_VERSION, computeStats, router as statsRouter };
