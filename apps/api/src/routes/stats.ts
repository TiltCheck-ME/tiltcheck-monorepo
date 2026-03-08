/**
 * /stats route for landing page KPI strip.
 */
import { Router } from 'express';

const router = Router();

function toNonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

router.get('/', (_req, res) => {
  const communitiesProtected = toNonNegativeInt(process.env.STATS_COMMUNITIES_PROTECTED, 0);
  const scansLast24h = toNonNegativeInt(process.env.STATS_SCANS_24H, 0);
  const highRiskBlocked = toNonNegativeInt(process.env.STATS_HIGH_RISK_BLOCKED_24H, 0);

  res.json({
    ok: true,
    stats: {
      communitiesProtected,
      scansLast24h,
      highRiskBlocked,
      updatedAt: new Date().toISOString(),
    },
  });
});

export { router as statsRouter };
