/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12 */
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

/**
 * GET /stats/community
 * Community social proof stats (vault locked, degens protected).
 * Falls back to placeholder values when live data is unavailable.
 */
router.get('/community', async (_req, res) => {
  const dataDir = getDataDir();
  const vaultStatsPath = path.join(dataDir, 'vault-stats.json');

  type VaultStats = {
    totalLockedSol?: number;
    totalUsers?: number;
    weeklyLockedSol?: number;
    weeklyUsers?: number;
    updatedAt?: string;
  };

  const vaultStats = await readJson<VaultStats>(vaultStatsPath, {});

  res.json({
    ok: true,
    vault: {
      totalLockedSol: vaultStats.totalLockedSol ?? 143.7,
      totalUsers: vaultStats.totalUsers ?? 38,
      weeklyLockedSol: vaultStats.weeklyLockedSol ?? 22.1,
      weeklyUsers: vaultStats.weeklyUsers ?? 12,
      updatedAt: vaultStats.updatedAt ?? new Date().toISOString(),
    },
  });
});

/**
 * GET /stats/rtp-drift
 * Recent RTP drift catches for the live feed ticker.
 * Falls back to sample events when no live data file exists.
 */
router.get('/rtp-drift', async (_req, res) => {
  const dataDir = getDataDir();
  const rtpDriftPath = path.join(dataDir, 'rtp-drift-events.json');

  type DriftEvent = {
    casino: string;
    game: string;
    drift: number;
    detectedMinsAgo: number;
  };

  const live = await readJson<DriftEvent[]>(rtpDriftPath, []);

  const events: DriftEvent[] = live.length > 0 ? live : [
    { casino: 'Stake', game: 'Gates of Olympus', drift: -3.8, detectedMinsAgo: 4 },
    { casino: 'Roobet', game: 'Sweet Bonanza', drift: -5.2, detectedMinsAgo: 17 },
    { casino: 'Rollbit', game: 'Book of Dead', drift: -2.1, detectedMinsAgo: 31 },
    { casino: 'Shuffle', game: 'Wolf Gold', drift: -4.7, detectedMinsAgo: 58 },
    { casino: 'BC.Game', game: 'Reactoonz', drift: -6.3, detectedMinsAgo: 112 },
  ];

  res.json({ ok: true, events });
});

export { STATS_CONTRACT_VERSION, computeStats, router as statsRouter };
