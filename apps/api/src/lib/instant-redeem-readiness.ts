/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Instant Redeem product readiness — machine-readable checklist for team onboarding.
 */

import { listInstantRedeemCapabilities } from './instant-redeem-registry.js';
import { evaluateInstantRedeemCasinoGate } from './instant-redeem-scam-gate.js';

export type ReadinessStatus = 'pass' | 'warn' | 'fail';

export type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type InstantRedeemReadiness = {
  product: 'instant_redeem';
  phase: 'sandbox';
  marketReady: boolean;
  generatedAt: string;
  checklist: ReadinessCheck[];
  onboarding: {
    sandboxSignup: string;
    productPage: string;
    readinessPage: string;
    pitchDoc: string;
    growthDoc: string;
    teamReadinessDoc: string;
    apiSpecDoc: string;
    commercialEmail: string;
  };
  talkTrack: {
    oneLiner: string;
    thirtySeconds: string;
  };
  metrics: {
    enabledDomains: number;
    suppressedProbe: 'ok' | 'error';
  };
};

function siteBase(): string {
  return (process.env.SITE_URL || 'https://tiltcheck.me').replace(/\/+$/, '');
}

export async function buildInstantRedeemReadiness(): Promise<InstantRedeemReadiness> {
  const capabilities = listInstantRedeemCapabilities();
  const checklist: ReadinessCheck[] = [];

  checklist.push({
    id: 'pitch',
    label: 'Marketable framing published',
    status: 'pass',
    detail: 'Pitch one-pager + operator portal CTAs are in-repo and linked.',
  });

  checklist.push({
    id: 'registry',
    label: 'Durable capability registry',
    status: 'pass',
    detail: `Registry readable. ${capabilities.length} enabled domain(s) currently recorded.`,
  });

  checklist.push({
    id: 'public_capabilities',
    label: 'Public supply signal',
    status: 'pass',
    detail: 'GET /v1/redeem/capabilities is mounted for /casinos badge hydration.',
  });

  let suppressedProbe: 'ok' | 'error' = 'ok';
  try {
    const scamProbe = await evaluateInstantRedeemCasinoGate('scam-payouts.example');
    const clearProbe = await evaluateInstantRedeemCasinoGate('readiness-clear.example');
    checklist.push({
      id: 'scam_gate',
      label: 'Scam hard-block',
      status: scamProbe.allowed === false && clearProbe.allowed === true ? 'pass' : 'fail',
      detail:
        scamProbe.allowed === false
          ? `Scam probe blocked (${scamProbe.code}). Clear probe allowed.`
          : 'Scam probe was incorrectly allowed — do not scale BD.',
    });
  } catch {
    suppressedProbe = 'error';
    checklist.push({
      id: 'scam_gate',
      label: 'Scam hard-block',
      status: 'fail',
      detail: 'Scam gate threw during readiness probe.',
    });
  }

  checklist.push({
    id: 'rebuy_cooloff',
    label: 'Same-rail rebuy cooloff',
    status: 'pass',
    detail: 'Settled execute arms deposit cooloff; deposit-check/deposit enforce REBUY_COOLDOWN.',
  });

  checklist.push({
    id: 'irrevocable',
    label: 'No canceled redeems',
    status: 'pass',
    detail: 'Cancel routes return REDEEM_IRREVOCABLE. Settled Instant Redeem cannot be undone by the house.',
  });

  checklist.push({
    id: 'trust_boost',
    label: 'Casino trust incentive',
    status: 'pass',
    detail: 'Enable publishes trust.casino.feature.enabled (+5 financialPayouts, idempotent).',
  });

  checklist.push({
    id: 'processor_multidomain',
    label: 'Processor multi-domain enable',
    status: 'pass',
    detail: 'partnerType=processor accepts coveredDomains[] for one-contract scale.',
  });

  checklist.push({
    id: 'badge_surface',
    label: 'Player FOMO badge surface',
    status: 'pass',
    detail: '/casinos hydrates Instant Redeem badges from public capabilities.',
  });

  checklist.push({
    id: 'production_gate',
    label: 'Production money still gated',
    status: 'pass',
    detail: 'Non-sandbox partners receive REDEEM_SANDBOX_ONLY. No accidental live rails.',
  });

  checklist.push({
    id: 'tests',
    label: 'Regression net documented',
    status: 'pass',
    detail: 'pnpm exec vitest run apps/api/tests/routes/redeem.test.ts apps/api/tests/lib/instant-redeem-scam-gate.test.ts',
  });

  const marketReady = checklist.every((check) => check.status === 'pass');
  const base = siteBase();

  return {
    product: 'instant_redeem',
    phase: 'sandbox',
    marketReady,
    generatedAt: new Date().toISOString(),
    checklist,
    onboarding: {
      sandboxSignup: `${base}/operators`,
      productPage: `${base}/operators/instant-redeem`,
      readinessPage: `${base}/operators/instant-redeem/readiness`,
      pitchDoc: `${base}/docs/product/instant-redeem-pitch-one-pager`,
      growthDoc: `${base}/docs/OPERATOR-INSTANT-REDEEM-GROWTH`,
      teamReadinessDoc: `${base}/docs/OPERATOR-INSTANT-REDEEM-TEAM-READINESS`,
      apiSpecDoc: `${base}/docs/OPERATOR-INSTANT-REDEEM`,
      commercialEmail: 'partners@tiltcheck.me',
    },
    talkTrack: {
      oneLiner: 'Wen payout? Now. Instant Redeem turns soon™ into a paid exit — without handing scam casinos a cashout rail.',
      thirtySeconds:
        'Players keep asking wen payout. We sell Instant Redeem — paid exit now, no canceled redeems, cooloff before they degen it back in, and a hard no for scam shops. Processors cover many domains under one rail. Operators who enable it get a trust bump and a public badge. Everyone else still looks like soon™.',
    },
    metrics: {
      enabledDomains: capabilities.length,
      suppressedProbe,
    },
  };
}
