/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Instant Redeem Routes - /v1/redeem/*
 * Operator/processor white-label Instant Redeem: quote + execute + deposit gate.
 * Same rail: Instant Redeem out, then rebuy cooloff before deposit back in.
 * Irrevocable: settled Instant Redeems cannot be canceled. No more canceled redeems.
 * Phase 5: production grants + processor settlement adapters. Processor holds float.
 * Live money only when INSTANT_REDEEM_LIVE_SETTLEMENT=true and grant approved.
 */

import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { incrementPartnerDailyQuotaUsage } from '@tiltcheck/db';
import { eventRouter } from '@tiltcheck/event-router';
import { INSTANT_REDEEM_PAYOUT_DELTA, trustEngines } from '@tiltcheck/trust-engines';
import {
  getInstantRedeemCapability,
  listInstantRedeemCapabilities,
  normalizeCapabilityDomain,
  upsertInstantRedeemCapabilities,
  type InstantRedeemPartnerType,
  __resetInstantRedeemRegistryForTests,
} from '../lib/instant-redeem-registry.js';
import { evaluateInstantRedeemCasinoGate } from '../lib/instant-redeem-scam-gate.js';
import { buildInstantRedeemReadiness } from '../lib/instant-redeem-readiness.js';
import {
  evaluateProductionGrantScope,
  getApprovedProductionGrant,
  getProductionGrantForPartner,
  partnerHasApprovedProductionRedeem,
  upsertProductionGrant,
  type SettlementRail,
  __resetInstantRedeemProductionForTests,
} from '../lib/instant-redeem-production.js';
import {
  executeSettlement,
  type SettlementMode,
} from '../lib/instant-redeem-settlement.js';
import { partnerAuthMiddleware, type PartnerRequest } from '../middleware/partner.js';
import { internalServiceAuth } from '../middleware/auth.js';

const router = Router();

const SANDBOX_DAILY_QUOTA = 1000;
const QUOTE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_FEE_BPS = 150;
const FEE_FLOOR = 0.5;
const MAX_AMOUNT = 100_000;
const HIGH_AMOUNT_REVIEW = 5_000;
/** Default post-redeem deposit cooloff — same rail, no instant rebuy of the win. */
const DEFAULT_REBUY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_REBUY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const destinationSchema = z.object({
  rail: z.enum(['ach', 'interac', 'crypto', 'card', 'wallet']),
  accountRef: z.string().trim().min(4).max(128),
});

const quoteSchema = z.object({
  playerRef: z.string().trim().min(2).max(128),
  amount: z.number().finite().positive().max(MAX_AMOUNT),
  currency: z.string().trim().min(2).max(8).default('USD'),
  destination: destinationSchema,
  jurisdiction: z.string().trim().min(2).max(8).optional(),
  /** Required for processor partners covering many domains; defaults to partner.casinoDomain. */
  casinoDomain: z.string().trim().min(3).max(255).optional(),
});

const executeSchema = z.object({
  quoteId: z.string().trim().min(8).max(64),
  playerRef: z.string().trim().min(2).max(128),
  idempotencyKey: z.string().trim().min(8).max(128),
  /** Sandbox override for post-redeem rebuy cooloff (minutes). Default 24h. */
  rebuyCooldownMinutes: z.number().int().min(1).max(10_080).optional(),
});

const enableSchema = z.object({
  casinoName: z.string().trim().min(3).max(255).optional(),
  /** operator = single brand; processor = one commercial identity covering many domains */
  partnerType: z.enum(['operator', 'processor']).default('operator'),
  coveredDomains: z.array(z.string().trim().min(3).max(255)).max(50).optional(),
});

const depositGateSchema = z.object({
  playerRef: z.string().trim().min(2).max(128),
  amount: z.number().finite().positive().max(MAX_AMOUNT).optional(),
  currency: z.string().trim().min(2).max(8).optional(),
});

const productionRequestSchema = z.object({
  partnerType: z.enum(['operator', 'processor']).default('processor'),
  coveredDomains: z.array(z.string().trim().min(3).max(255)).min(1).max(50),
  float: z.object({
    holder: z.enum(['processor', 'operator']),
    currency: z.string().trim().min(2).max(8).default('USD'),
    softCapUsd: z.number().finite().positive().max(10_000_000),
    hardCapUsd: z.number().finite().positive().max(50_000_000),
  }),
  rails: z.array(z.enum(['ach', 'interac', 'crypto', 'card', 'wallet'])).min(1).max(5),
  feeShareBps: z.number().int().min(1).max(2000).default(DEFAULT_FEE_BPS),
  rebuyCooloffHours: z.number().int().min(1).max(168).default(24),
  contractRef: z.string().trim().min(3).max(128),
}).superRefine((value, ctx) => {
  if (value.float.hardCapUsd < value.float.softCapUsd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'float.hardCapUsd must be >= float.softCapUsd',
      path: ['float', 'hardCapUsd'],
    });
  }
});

const productionApproveSchema = z.object({
  partnerId: z.string().trim().min(2).max(128),
  status: z.enum(['approved', 'rejected', 'suspended']),
  reviewNote: z.string().trim().max(1000).optional(),
  reviewedBy: z.string().trim().min(2).max(128).default('ops'),
});

type RgDecision = {
  allowed: boolean;
  riskBand: 'low' | 'moderate' | 'high' | 'blocked';
  gates: string[];
  intervention: string | null;
};

type RedeemQuote = {
  quoteId: string;
  partnerId: string;
  playerRef: string;
  casinoDomain: string;
  amountGross: number;
  currency: string;
  feeBps: number;
  feeFloor: number;
  feeAmount: number;
  amountNet: number;
  etaSeconds: number;
  destination: z.infer<typeof destinationSchema>;
  jurisdiction: string | null;
  rg: RgDecision;
  createdAt: number;
  expiresAt: number;
};

type RedeemRecord = {
  redeemId: string;
  partnerId: string;
  quoteId: string;
  playerRef: string;
  status: 'settled' | 'pending' | 'blocked' | 'expired' | 'processor_pending';
  amountGross: number;
  feeAmount: number;
  amountNet: number;
  currency: string;
  rg: RgDecision;
  idempotencyKey: string;
  createdAt: number;
  settledAt: string | null;
  note: string;
  settlementMode: SettlementMode | null;
  processorRef: string | null;
};

type RebuyLock = {
  partnerId: string;
  playerRef: string;
  redeemId: string;
  amountNet: number;
  currency: string;
  lockedAt: number;
  lockedUntil: number;
  reason: 'post_instant_redeem';
};

const quotes = new Map<string, RedeemQuote>();
const redeems = new Map<string, RedeemRecord>();
const idempotencyIndex = new Map<string, string>();
/** Post-redeem deposit cooloffs keyed by partnerId:playerRef. Same rail = same lock namespace. */
const rebuyLocks = new Map<string, RebuyLock>();
/** In-process settled/pending production volume against grant hard caps (USD). */
const productionSettledVolumeUsd = new Map<string, number>();

function rebuyLockKey(partnerId: string, playerRef: string): string {
  return `${partnerId}:${playerRef}`;
}

function getActiveRebuyLock(partnerId: string, playerRef: string): RebuyLock | null {
  const key = rebuyLockKey(partnerId, playerRef);
  const lock = rebuyLocks.get(key);
  if (!lock) return null;
  if (Date.now() >= lock.lockedUntil) {
    rebuyLocks.delete(key);
    return null;
  }
  return lock;
}

function setRebuyLock(input: {
  partnerId: string;
  playerRef: string;
  redeemId: string;
  amountNet: number;
  currency: string;
  cooldownMs: number;
}): RebuyLock {
  const now = Date.now();
  const lock: RebuyLock = {
    partnerId: input.partnerId,
    playerRef: input.playerRef,
    redeemId: input.redeemId,
    amountNet: input.amountNet,
    currency: input.currency,
    lockedAt: now,
    lockedUntil: now + input.cooldownMs,
    reason: 'post_instant_redeem',
  };
  rebuyLocks.set(rebuyLockKey(input.partnerId, input.playerRef), lock);
  return lock;
}

function serializeRebuyLock(lock: RebuyLock | null): Record<string, unknown> | null {
  if (!lock) return null;
  return {
    redeemId: lock.redeemId,
    playerRef: lock.playerRef,
    amountNet: lock.amountNet,
    currency: lock.currency,
    reason: lock.reason,
    lockedAt: new Date(lock.lockedAt).toISOString(),
    lockedUntil: new Date(lock.lockedUntil).toISOString(),
    remainingMs: Math.max(0, lock.lockedUntil - Date.now()),
    note: 'Same payment rail. Redeem a win, cool off before you degen it back in.',
  };
}

function normalizeCasinoName(value: string): string {
  return normalizeCapabilityDomain(value);
}

function resolveCasinoName(partner: NonNullable<PartnerRequest['partner']>, override?: string): string | null {
  const raw = override?.trim() || partner.casinoDomain?.trim() || '';
  if (!raw) return null;
  return normalizeCasinoName(raw);
}

function getProductionSettledVolume(partnerId: string): number {
  return productionSettledVolumeUsd.get(partnerId) ?? 0;
}

function recordProductionSettledVolume(partnerId: string, amountUsd: number): void {
  productionSettledVolumeUsd.set(partnerId, getProductionSettledVolume(partnerId) + amountUsd);
}

/**
 * Claim a quote for exclusive execute. Sync-only — call before any await so
 * concurrent executes cannot double-settle the same quoteId.
 */
function claimQuoteForExecute(
  quoteId: string,
  partnerId: string,
  playerRef: string,
):
  | { ok: true; quote: RedeemQuote }
  | { ok: false; status: number; body: Record<string, unknown> } {
  const quote = quotes.get(quoteId);
  if (!quote || quote.partnerId !== partnerId) {
    return {
      ok: false,
      status: 404,
      body: { error: 'Quote not found for this partner', code: 'REDEEM_QUOTE_NOT_FOUND' },
    };
  }
  if (quote.playerRef !== playerRef) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'playerRef does not match the quoted player',
        code: 'REDEEM_PLAYER_MISMATCH',
      },
    };
  }
  if (Date.now() > quote.expiresAt) {
    quotes.delete(quoteId);
    return {
      ok: false,
      status: 410,
      body: { error: 'Quote expired. Request a fresh quote.', code: 'REDEEM_QUOTE_EXPIRED' },
    };
  }
  if (!quotes.delete(quoteId)) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'Quote already claimed by another execute',
        code: 'REDEEM_QUOTE_CLAIMED',
      },
    };
  }
  return { ok: true, quote };
}

function buildCasinoTrustBoostPayload(casinoName: string | null, partnerId: string) {
  const fromDomain = casinoName ? getInstantRedeemCapability(casinoName) : null;
  const fromPartner = listInstantRedeemCapabilities().find((entry) => entry.partnerId === partnerId) ?? null;
  const enabled = fromDomain || fromPartner;
  if (!enabled) {
    return {
      enabled: false,
      pillar: 'financialPayouts' as const,
      delta: INSTANT_REDEEM_PAYOUT_DELTA,
      note: 'Enable Instant Redeem via POST /v1/redeem/enable to claim the casino trust boost and public badge.',
    };
  }
  const score = trustEngines.getCasinoBreakdown(casinoName || enabled.domain);
  return {
    enabled: true,
    casinoName: enabled.domain,
    partnerType: enabled.partnerType,
    pillar: 'financialPayouts' as const,
    delta: INSTANT_REDEEM_PAYOUT_DELTA,
    overallScore: score.score,
    financialPayouts: score.financialPayouts,
    note: 'Casino trusts get a financialPayouts bump for shipping Instant Redeem. Public /casinos badge follows the durable registry.',
  };
}

function resolveEnableDomains(
  partner: NonNullable<PartnerRequest['partner']>,
  input: {
    casinoName?: string;
    partnerType: InstantRedeemPartnerType;
    coveredDomains?: string[];
  },
): { domains: string[]; error?: { status: number; body: Record<string, unknown> } } {
  const ownedDomain = partner.casinoDomain
    ? normalizeCapabilityDomain(partner.casinoDomain)
    : null;

  if (input.partnerType === 'processor') {
    const covered = (input.coveredDomains ?? [])
      .map((domain) => normalizeCapabilityDomain(domain))
      .filter(Boolean);
    // Prefer explicit casinoName; else partner casino_domain. Hijacks blocked at enable upsert.
    const primary = input.casinoName
      ? normalizeCapabilityDomain(input.casinoName)
      : ownedDomain;
    const domains = [...new Set([...(primary ? [primary] : []), ...covered])];
    if (domains.length === 0) {
      return {
        domains: [],
        error: {
          status: 400,
          body: {
            error: 'Processor partners must pass coveredDomains (and/or casinoName)',
            code: 'REDEEM_PROCESSOR_DOMAINS_REQUIRED',
          },
        },
      };
    }
    return { domains };
  }

  if (!ownedDomain) {
    return {
      domains: [],
      error: {
        status: 400,
        body: {
          error: 'Operator Instant Redeem requires casino_domain on the partner record',
          code: 'REDEEM_CASINO_REQUIRED',
        },
      },
    };
  }

  if (input.casinoName) {
    const requested = normalizeCapabilityDomain(input.casinoName);
    if (requested !== ownedDomain) {
      return {
        domains: [],
        error: {
          status: 403,
          body: {
            error: 'Operators may only enable their own casino_domain',
            code: 'REDEEM_DOMAIN_OWNERSHIP',
          },
        },
      };
    }
  }

  return { domains: [ownedDomain] };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeFee(amountGross: number, feeBps = DEFAULT_FEE_BPS): number {
  const pct = roundMoney((amountGross * feeBps) / 10_000);
  return Math.max(FEE_FLOOR, pct);
}

function evaluateRg(playerRef: string, amount: number): RgDecision {
  const lower = playerRef.toLowerCase();
  const gates: string[] = [];

  if (lower.includes('selfex')) {
    gates.push('SELF_EXCLUSION');
  }
  if (lower.includes('tilt')) {
    gates.push('TILT_VELOCITY');
  }
  if (amount >= HIGH_AMOUNT_REVIEW) {
    gates.push('HIGH_AMOUNT_REVIEW');
  }

  if (gates.includes('SELF_EXCLUSION') || gates.includes('TILT_VELOCITY')) {
    return {
      allowed: false,
      riskBand: 'blocked',
      gates,
      intervention: 'instant_redeem_blocked',
    };
  }

  if (gates.includes('HIGH_AMOUNT_REVIEW')) {
    return {
      allowed: true,
      riskBand: 'moderate',
      gates,
      intervention: 'manual_review_recommended',
    };
  }

  return {
    allowed: true,
    riskBand: 'low',
    gates: [],
    intervention: null,
  };
}

async function enforceSandboxQuota(partnerId: string): Promise<
  | { ok: true; used: number; limit: number; remaining: number; windowStartedAt: Date | null; appId: string }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const updatedPartner = await incrementPartnerDailyQuotaUsage(partnerId);
  if (!updatedPartner) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Failed to record sandbox usage', code: 'SANDBOX_USAGE_FAILED' },
    };
  }

  const used = updatedPartner.daily_quota_used ?? 0;
  const limit = updatedPartner.daily_quota_limit ?? SANDBOX_DAILY_QUOTA;
  if (used > limit) {
    return {
      ok: false,
      status: 429,
      body: { error: 'Sandbox quota exceeded', code: 'SANDBOX_QUOTA_EXCEEDED' },
    };
  }

  return {
    ok: true,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    windowStartedAt: updatedPartner.quota_window_started_at,
    appId: updatedPartner.app_id,
  };
}

function partnerModeLabel(partner: NonNullable<PartnerRequest['partner']>): string {
  return partner.mode === 'production' ? 'production' : 'sandbox';
}

/** Any authenticated sandbox/production partner (used for production grant request/status). */
function requirePartnerCredential(req: PartnerRequest, res: import('express').Response): boolean {
  if (!req.partner) {
    res.status(401).json({ error: 'Partner authentication required', code: 'PARTNER_UNAUTHORIZED' });
    return false;
  }
  if (req.partner.mode === 'sandbox' || req.partner.mode === 'production') {
    return true;
  }
  res.status(403).json({
    error: 'Instant Redeem credentials must be sandbox or production',
    code: 'REDEEM_SANDBOX_ONLY',
  });
  return false;
}

/** Quote/execute/deposit: sandbox always; production only with approved Phase 5 grant. */
function requireRedeemAccess(req: PartnerRequest, res: import('express').Response): boolean {
  if (!requirePartnerCredential(req, res)) return false;
  if (req.partner!.mode === 'sandbox') {
    return true;
  }
  if (req.partner!.mode === 'production' && partnerHasApprovedProductionRedeem(req.partner!.id)) {
    return true;
  }
  res.status(403).json({
    error: 'Production Instant Redeem requires an approved Phase 5 grant',
    code: 'REDEEM_PRODUCTION_REQUIRED',
    next: {
      request: 'POST /v1/redeem/production/request',
      status: 'GET /v1/redeem/production/status',
      docs: '/docs/OPERATOR-INSTANT-REDEEM-PHASE5-PRODUCTION',
    },
  });
  return false;
}

/** @deprecated name kept for tests/docs — prefer requireRedeemAccess */
function requireSandboxPartner(req: PartnerRequest, res: import('express').Response): boolean {
  return requireRedeemAccess(req, res);
}

async function enforcePartnerUsage(partnerId: string, partnerMode: string): Promise<
  | { ok: true; used: number; limit: number | null; remaining: number | null; windowStartedAt: Date | null; appId: string }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  if (partnerMode === 'production' && partnerHasApprovedProductionRedeem(partnerId)) {
    return {
      ok: true,
      used: 0,
      limit: null,
      remaining: null,
      windowStartedAt: null,
      appId: 'production',
    };
  }
  return enforceSandboxQuota(partnerId);
}

/**
 * GET /v1/redeem/capabilities
 * Public supply signal — which domains have Instant Redeem enabled (player demand / FOMO).
 */
router.get('/capabilities', async (_req, res) => {
  const capabilities = listInstantRedeemCapabilities();
  const gated = await Promise.all(
    capabilities.map(async (entry) => {
      const gate = await evaluateInstantRedeemCasinoGate(entry.domain);
      return { entry, gate };
    }),
  );
  const visible = gated
    .filter(({ gate }) => gate.allowed)
    .map(({ entry }) => ({
      domain: entry.domain,
      partnerType: entry.partnerType,
      mode: entry.mode,
      enabledAt: entry.enabledAt,
      rebuyCooloffDefaultHours: entry.rebuyCooloffDefaultHours,
      instantRedeemAvailable: true,
    }));

  res.json({
    success: true,
    updatedAt: visible.length
      ? visible.map((entry) => entry.enabledAt).sort().at(-1) ?? null
      : null,
    count: visible.length,
    capabilities: visible,
    suppressedScamDomains: gated.filter(({ gate }) => !gate.allowed).length,
  });
});

/**
 * GET /v1/redeem/capabilities/:domain
 * Public single-domain Instant Redeem availability.
 */
router.get('/capabilities/:domain', async (req, res) => {
  const domain = normalizeCapabilityDomain(String(req.params.domain || ''));
  if (!domain) {
    res.status(400).json({ error: 'domain required', code: 'REDEEM_DOMAIN_REQUIRED' });
    return;
  }
  const capability = getInstantRedeemCapability(domain);
  const gate = await evaluateInstantRedeemCasinoGate(domain);
  const available = Boolean(capability) && gate.allowed;
  res.json({
    success: true,
    domain,
    instantRedeemAvailable: available,
    capability: available && capability
      ? {
          domain: capability.domain,
          partnerType: capability.partnerType,
          mode: capability.mode,
          enabledAt: capability.enabledAt,
          rebuyCooloffDefaultHours: capability.rebuyCooloffDefaultHours,
        }
      : null,
    casinoGate: {
      allowed: gate.allowed,
      code: gate.code,
      note: gate.note,
    },
  });
});

/**
 * POST /v1/redeem/enable
 * Declare Instant Redeem for one operator domain or many processor-covered domains.
 * Persists durable registry + applies trust boost per domain.
 */
router.post('/enable', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requireSandboxPartner(request, res)) return;

  const parsed = enableSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Instant Redeem enable payload',
      code: 'REDEEM_ENABLE_INVALID',
      details: parsed.error.flatten(),
    });
    return;
  }

  const resolved = resolveEnableDomains(request.partner!, {
    casinoName: parsed.data.casinoName,
    partnerType: parsed.data.partnerType,
    coveredDomains: parsed.data.coveredDomains,
  });
  if (resolved.error) {
    res.status(resolved.error.status).json(resolved.error.body);
    return;
  }

  const quota = await enforcePartnerUsage(request.partner!.id, request.partner!.mode);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const enabledAt = new Date().toISOString();
  const domainResults: Array<Record<string, unknown>> = [];
  const rejectedDomains: Array<Record<string, unknown>> = [];
  const allowedDomains: string[] = [];
  const mode = partnerModeLabel(request.partner!);

  for (const domain of resolved.domains) {
    const existing = getInstantRedeemCapability(domain);
    if (existing && existing.partnerId !== request.partner!.id) {
      rejectedDomains.push({
        domain,
        code: 'REDEEM_DOMAIN_OWNED',
        reasons: ['Domain Instant Redeem capability is owned by another partner'],
        note: 'No domain hijacks. Ask ops to transfer ownership if this is your book.',
      });
      continue;
    }

    const gate = await evaluateInstantRedeemCasinoGate(domain);
    if (!gate.allowed) {
      rejectedDomains.push({
        domain,
        code: gate.code,
        reasons: gate.reasons,
        note: gate.note,
      });
      continue;
    }

    const before = trustEngines.getCasinoBreakdown(domain);
    await eventRouter.publish('trust.casino.feature.enabled' as any, 'rgaas-api', {
      casinoName: domain,
      feature: 'instant_redeem',
      partnerAppId: request.partner!.appId,
      mode,
      enabledAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 15));
    const after = trustEngines.getCasinoBreakdown(domain);
    const applied = after.financialPayouts > before.financialPayouts;
    allowedDomains.push(domain);
    domainResults.push({
      domain,
      trustBoost: {
        pillar: 'financialPayouts',
        delta: INSTANT_REDEEM_PAYOUT_DELTA,
        applied,
        previousOverallScore: before.score,
        overallScore: after.score,
        financialPayouts: after.financialPayouts,
      },
    });
  }

  if (allowedDomains.length === 0) {
    const ownershipBlocked = rejectedDomains.every(
      (entry) => entry.code === 'REDEEM_DOMAIN_OWNED',
    );
    res.status(403).json({
      success: false,
      error: ownershipBlocked
        ? 'Instant Redeem refused — requested domains are owned by another partner'
        : 'Instant Redeem refused — every requested domain failed scam/trust gates',
      code: ownershipBlocked ? 'REDEEM_DOMAIN_OWNED' : 'REDEEM_SCAM_CASINO_BLOCKED',
      rejectedDomains,
      note: ownershipBlocked
        ? 'No domain hijacks. Ask ops to transfer ownership if this is your book.'
        : 'We do not cash out at scam casinos. Clean the book and try again.',
    });
    return;
  }

  upsertInstantRedeemCapabilities(
    allowedDomains.map((domain) => ({
      domain,
      partnerId: request.partner!.id,
      partnerAppId: request.partner!.appId,
      partnerType: parsed.data.partnerType,
      mode,
      enabledAt,
      rebuyCooloffDefaultHours: 24,
      trustBoostApplied: true,
    })),
  );

  res.setHeader('X-Mode', mode);
  res.status(200).json({
    success: true,
    mode,
    feature: 'instant_redeem',
    partnerType: parsed.data.partnerType,
    domains: allowedDomains,
    casinoName: allowedDomains[0],
    results: domainResults,
    rejectedDomains,
    trustBoost: domainResults[0]?.trustBoost ?? null,
    publicCapabilitiesUrl: '/v1/redeem/capabilities',
    note:
      rejectedDomains.length > 0
        ? 'Partial enablement. Scam/low-trust domains were refused — Instant Redeem is not a skem payout rail.'
        : parsed.data.partnerType === 'processor'
          ? 'Processor enablement covers multiple domains under one commercial identity. Public badge follows the durable registry.'
          : 'Operator enablement recorded. Public /casinos badge follows the durable registry.',
    quota: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      windowStartedAt: quota.windowStartedAt,
    },
  });
});

/**
 * POST /v1/redeem/quote
 * Price an Instant Redeem. Fee = cost of not waiting soon™.
 */
router.post('/quote', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requireSandboxPartner(request, res)) return;

  const parsed = quoteSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Instant Redeem quote payload',
      code: 'REDEEM_QUOTE_INVALID',
      details: parsed.error.flatten(),
    });
    return;
  }

  const quota = await enforcePartnerUsage(request.partner!.id, request.partner!.mode);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const casinoDomain = resolveCasinoName(request.partner!, parsed.data.casinoDomain);

  if (!casinoDomain) {
    res.status(400).json({
      error: 'casinoDomain required for Instant Redeem quote',
      code: 'REDEEM_CASINO_REQUIRED',
    });
    return;
  }

  const casinoGate = await evaluateInstantRedeemCasinoGate(casinoDomain);
  if (!casinoGate.allowed) {
    res.status(403).json({
      success: false,
      error: 'Instant Redeem refused for this casino',
      code: 'REDEEM_SCAM_CASINO_BLOCKED',
      casinoGate,
      note: casinoGate.note,
    });
    return;
  }

  const { playerRef, amount, currency, destination, jurisdiction } = parsed.data;
  const mode = partnerModeLabel(request.partner!);
  const productionGrant =
    mode === 'production' ? getApprovedProductionGrant(request.partner!.id) : null;

  if (mode === 'production') {
    const scope = evaluateProductionGrantScope({
      partnerId: request.partner!.id,
      domain: casinoDomain,
      rail: destination.rail as SettlementRail,
      amountUsd: amount,
      settledVolumeUsd: getProductionSettledVolume(request.partner!.id),
    });
    if (!scope.ok) {
      res.status(403).json({
        success: false,
        error: scope.error,
        code: scope.code,
      });
      return;
    }
  }

  const feeBps = productionGrant?.feeShareBps ?? DEFAULT_FEE_BPS;
  const feeAmount = computeFee(amount, feeBps);
  const amountNet = roundMoney(amount - feeAmount);
  if (amountNet <= 0 || amount <= FEE_FLOOR) {
    res.status(400).json({
      error: 'Amount must exceed Instant Redeem fee floor',
      code: 'REDEEM_AMOUNT_BELOW_FEE',
      feeFloor: FEE_FLOOR,
      feeAmount,
    });
    return;
  }

  const rg = evaluateRg(playerRef, amount);
  const now = Date.now();
  const quoteId = `qr_${crypto.randomBytes(12).toString('hex')}`;

  const quote: RedeemQuote = {
    quoteId,
    partnerId: request.partner!.id,
    playerRef,
    casinoDomain,
    amountGross: amount,
    currency: currency.toUpperCase(),
    feeBps,
    feeFloor: FEE_FLOOR,
    feeAmount,
    amountNet,
    etaSeconds: 60,
    destination,
    jurisdiction: jurisdiction?.toUpperCase() ?? null,
    rg,
    createdAt: now,
    expiresAt: now + QUOTE_TTL_MS,
  };
  quotes.set(quoteId, quote);

  res.setHeader('X-Mode', mode);
  res.status(200).json({
    success: true,
    mode,
    quoteId,
    casinoDomain,
    expiresAt: new Date(quote.expiresAt).toISOString(),
    amountGross: quote.amountGross,
    currency: quote.currency,
    feeBps: quote.feeBps,
    feeFloor: quote.feeFloor,
    feeAmount: quote.feeAmount,
    amountNet: quote.amountNet,
    etaSeconds: quote.etaSeconds,
    destination: quote.destination,
    jurisdiction: quote.jurisdiction,
    rg: quote.rg,
    casinoGate: {
      allowed: true,
      code: casinoGate.code,
      trustScore: casinoGate.trustScore,
    },
    casinoTrustBoost: buildCasinoTrustBoostPayload(casinoDomain, request.partner!.id),
    quota: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      windowStartedAt: quota.windowStartedAt,
    },
    note:
      mode === 'production'
        ? 'Production quote. Settlement still rides the processor float desk — TiltCheck does not hold funds.'
        : 'Sandbox quote only. No funds moved. Fee is the cost of not waiting soon™. Scam casinos stay blocked.',
  });
});

/**
 * POST /v1/redeem/execute
 * Settle a previously quoted Instant Redeem.
 * Sandbox settles in-memory. Production uses processor stub/live handoff — TiltCheck does not hold float.
 */
router.post('/execute', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requireSandboxPartner(request, res)) return;

  const parsed = executeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Instant Redeem execute payload',
      code: 'REDEEM_EXECUTE_INVALID',
      details: parsed.error.flatten(),
    });
    return;
  }

  const mode = partnerModeLabel(request.partner!);
  const { quoteId, playerRef, idempotencyKey, rebuyCooldownMinutes } = parsed.data;
  const idemKey = `${request.partner!.id}:${idempotencyKey}`;
  const existingRedeemId = idempotencyIndex.get(idemKey);
  if (existingRedeemId) {
    const existing = redeems.get(existingRedeemId);
    if (existing) {
      res.setHeader('X-Mode', mode);
      res.status(200).json({
        success: true,
        mode,
        idempotentReplay: true,
        ...serializeRedeem(existing),
      });
      return;
    }
  }

  // Claim before any await so concurrent executes cannot double-settle one quote.
  const claimed = claimQuoteForExecute(quoteId, request.partner!.id, playerRef);
  if (!claimed.ok) {
    res.status(claimed.status).json(claimed.body);
    return;
  }
  const quote = claimed.quote;

  if (mode === 'production') {
    const scope = evaluateProductionGrantScope({
      partnerId: request.partner!.id,
      domain: quote.casinoDomain,
      rail: quote.destination.rail as SettlementRail,
      amountUsd: quote.amountGross,
      settledVolumeUsd: getProductionSettledVolume(request.partner!.id),
    });
    if (!scope.ok) {
      res.status(403).json({
        success: false,
        error: scope.error,
        code: scope.code,
      });
      return;
    }
  }

  const casinoGate = await evaluateInstantRedeemCasinoGate(quote.casinoDomain);
  if (!casinoGate.allowed) {
    res.status(403).json({
      success: false,
      error: 'Instant Redeem refused for this casino',
      code: 'REDEEM_SCAM_CASINO_BLOCKED',
      casinoGate,
      note: casinoGate.note,
    });
    return;
  }

  const quota = await enforcePartnerUsage(request.partner!.id, request.partner!.mode);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const rg = evaluateRg(playerRef, quote.amountGross);
  const redeemId = `rd_${crypto.randomBytes(12).toString('hex')}`;
  let status: RedeemRecord['status'];
  let note: string;
  let settlementMode: SettlementMode | null = null;
  let processorRef: string | null = null;

  if (!rg.allowed) {
    status = 'blocked';
    note = 'Blocked by RG gate. No funds moved.';
  } else if (rg.gates.includes('HIGH_AMOUNT_REVIEW')) {
    status = 'pending';
    note = 'Pending manual review for high amount. No funds moved.';
  } else {
    const settlement = await executeSettlement(request.partner!.mode, {
      redeemId,
      partnerId: request.partner!.id,
      partnerAppId: request.partner!.appId,
      playerRef,
      casinoDomain: quote.casinoDomain,
      amountNet: quote.amountNet,
      currency: quote.currency,
      rail: quote.destination.rail,
      accountRef: quote.destination.accountRef,
    });
    settlementMode = settlement.mode;
    processorRef = settlement.processorRef;
    note = settlement.note;
    if (settlement.status === 'settled') {
      status = 'settled';
    } else if (settlement.status === 'processor_pending') {
      status = 'processor_pending';
    } else {
      status = 'blocked';
    }
  }

  // Only final settled redeems arm cooloff (docs + RG contract). processor_pending waits.
  const armsRebuy = status === 'settled';
  const record: RedeemRecord = {
    redeemId,
    partnerId: request.partner!.id,
    quoteId,
    playerRef,
    status,
    amountGross: quote.amountGross,
    feeAmount: quote.feeAmount,
    amountNet: quote.amountNet,
    currency: quote.currency,
    rg,
    idempotencyKey,
    createdAt: Date.now(),
    settledAt: status === 'settled' ? new Date().toISOString() : null,
    note,
    settlementMode,
    processorRef,
  };

  redeems.set(redeemId, record);
  idempotencyIndex.set(idemKey, redeemId);

  if (mode === 'production' && (status === 'settled' || status === 'processor_pending')) {
    recordProductionSettledVolume(request.partner!.id, quote.amountGross);
  }

  let rebuyLock: RebuyLock | null = null;
  if (armsRebuy) {
    const grant = mode === 'production' ? getApprovedProductionGrant(request.partner!.id) : null;
    // Sandbox-only override. Production always uses grant hours (or default 24h).
    const sandboxOverrideMs =
      mode === 'sandbox' && rebuyCooldownMinutes != null
        ? rebuyCooldownMinutes * 60_000
        : null;
    const grantMs = grant?.rebuyCooloffHours
      ? grant.rebuyCooloffHours * 60 * 60 * 1000
      : null;
    const cooldownMs = Math.min(
      MAX_REBUY_COOLDOWN_MS,
      sandboxOverrideMs ?? grantMs ?? DEFAULT_REBUY_COOLDOWN_MS,
    );
    rebuyLock = setRebuyLock({
      partnerId: request.partner!.id,
      playerRef,
      redeemId,
      amountNet: quote.amountNet,
      currency: quote.currency,
      cooldownMs,
    });
    if (mode === 'sandbox') {
      note = 'Sandbox settle only. No funds moved. Rebuy cooloff armed on the same payment rail.';
      record.note = note;
    }
  }

  res.setHeader('X-Mode', mode);
  res.status(status === 'blocked' ? 200 : 201).json({
    success: status !== 'blocked',
    mode,
    idempotentReplay: false,
    settlement: settlementMode
      ? { mode: settlementMode, processorRef, status }
      : null,
    quota: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      windowStartedAt: quota.windowStartedAt,
    },
    rebuyLock: serializeRebuyLock(rebuyLock),
    ...serializeRedeem(record),
  });
});

/**
 * POST /v1/redeem/deposit-check
 * Payment-processor gate: deny deposits while post-redeem rebuy cooloff is active.
 */
router.post('/deposit-check', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requireSandboxPartner(request, res)) return;

  const parsed = depositGateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid deposit-check payload',
      code: 'REDEEM_DEPOSIT_CHECK_INVALID',
      details: parsed.error.flatten(),
    });
    return;
  }

  const quota = await enforcePartnerUsage(request.partner!.id, request.partner!.mode);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const lock = getActiveRebuyLock(request.partner!.id, parsed.data.playerRef);
  const allowed = lock == null;
  const mode = partnerModeLabel(request.partner!);

  res.setHeader('X-Mode', mode);
  res.status(200).json({
    success: true,
    mode,
    allowed,
    code: allowed ? 'DEPOSIT_ALLOWED' : 'REBUY_COOLDOWN',
    playerRef: parsed.data.playerRef,
    amount: parsed.data.amount ?? null,
    currency: parsed.data.currency?.toUpperCase() ?? null,
    rebuyLock: serializeRebuyLock(lock),
    quota: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      windowStartedAt: quota.windowStartedAt,
    },
    note: allowed
      ? 'Deposit gate clear. Same rail, no active post-redeem cooloff.'
      : 'Deposit blocked. You just Instant Redeemed a win — cool off before rebuying. No cap needed on the lecture.',
  });
});

/**
 * POST /v1/redeem/deposit
 * Sandbox mock deposit attempt through the Instant Redeem payment rail.
 */
router.post('/deposit', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requireSandboxPartner(request, res)) return;

  const parsed = depositGateSchema.extend({
    amount: z.number().finite().positive().max(MAX_AMOUNT),
    currency: z.string().trim().min(2).max(8).default('USD'),
  }).safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid deposit payload',
      code: 'REDEEM_DEPOSIT_INVALID',
      details: parsed.error.flatten(),
    });
    return;
  }

  const quota = await enforcePartnerUsage(request.partner!.id, request.partner!.mode);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const mode = partnerModeLabel(request.partner!);
  const lock = getActiveRebuyLock(request.partner!.id, parsed.data.playerRef);
  if (lock) {
    res.setHeader('X-Mode', mode);
    res.status(423).json({
      success: false,
      mode,
      allowed: false,
      code: 'REBUY_COOLDOWN',
      playerRef: parsed.data.playerRef,
      amount: parsed.data.amount,
      currency: parsed.data.currency.toUpperCase(),
      rebuyLock: serializeRebuyLock(lock),
      note: 'Deposit rejected. Instant Redeem and deposits share this rail — rebuy cooloff still active.',
    });
    return;
  }

  const depositId = `dp_${crypto.randomBytes(12).toString('hex')}`;
  res.setHeader('X-Mode', mode);
  res.status(201).json({
    success: true,
    mode,
    allowed: true,
    code: 'DEPOSIT_ACCEPTED',
    depositId,
    playerRef: parsed.data.playerRef,
    amount: parsed.data.amount,
    currency: parsed.data.currency.toUpperCase(),
    rebuyLock: null,
    quota: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      windowStartedAt: quota.windowStartedAt,
    },
    note: mode === 'production'
      ? 'Deposit accepted on processor rail. TiltCheck orchestrates the gate only.'
      : 'Sandbox deposit accepted. No funds moved.',
  });
});

/**
 * POST /v1/redeem/production/request
 * Partner submits Phase 5 float-desk + rails contract for production Instant Redeem.
 * Does not move money. float.holder must be processor|operator (never tiltcheck).
 */
router.post('/production/request', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requirePartnerCredential(request, res)) return;

  const parsed = productionRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Instant Redeem production request',
      code: 'REDEEM_PRODUCTION_REQUEST_INVALID',
      details: parsed.error.flatten(),
      note: 'float.holder must be processor or operator. TiltCheck does not hold float in Phase 5.',
    });
    return;
  }

  const existing = getProductionGrantForPartner(request.partner!.id);
  if (existing?.status === 'approved') {
    res.status(409).json({
      success: false,
      error: 'Production Instant Redeem already approved for this partner',
      code: 'REDEEM_PRODUCTION_ALREADY_APPROVED',
      grant: existing,
    });
    return;
  }

  const now = new Date().toISOString();
  const grant = upsertProductionGrant({
    partnerId: request.partner!.id,
    partnerAppId: request.partner!.appId,
    partnerType: parsed.data.partnerType,
    status: 'requested',
    coveredDomains: parsed.data.coveredDomains,
    float: {
      holder: parsed.data.float.holder,
      currency: parsed.data.float.currency.toUpperCase(),
      softCapUsd: parsed.data.float.softCapUsd,
      hardCapUsd: parsed.data.float.hardCapUsd,
    },
    rails: parsed.data.rails,
    feeShareBps: parsed.data.feeShareBps,
    rebuyCooloffHours: parsed.data.rebuyCooloffHours,
    contractRef: parsed.data.contractRef,
    requestedAt: existing?.requestedAt ?? now,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
  });

  res.status(201).json({
    success: true,
    grant,
    next: {
      status: 'GET /v1/redeem/production/status',
      commercial: 'partners@tiltcheck.me',
      docs: '/docs/OPERATOR-INSTANT-REDEEM-PHASE5-PRODUCTION',
    },
    note: 'Production request recorded. Ops approves after LOI/MSA. Approve != live settlement.',
  });
});

/**
 * GET /v1/redeem/production/status
 * Partner reads Phase 5 grant + float desk status.
 */
router.get('/production/status', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requirePartnerCredential(request, res)) return;

  const grant = getProductionGrantForPartner(request.partner!.id);
  res.status(200).json({
    success: true,
    partnerId: request.partner!.id,
    partnerAppId: request.partner!.appId,
    partnerMode: request.partner!.mode,
    grant,
    liveSettlementEnabled: process.env.INSTANT_REDEEM_LIVE_SETTLEMENT === 'true',
    redeemAccess:
      request.partner!.mode === 'sandbox'
        ? 'sandbox'
        : partnerHasApprovedProductionRedeem(request.partner!.id)
          ? 'production_approved'
          : 'production_gated',
    note: grant
      ? 'Grant on file. Live rails still require INSTANT_REDEEM_LIVE_SETTLEMENT=true after approval.'
      : 'No production grant yet. POST /v1/redeem/production/request with float + rails.',
  });
});

/**
 * POST /v1/redeem/production/approve
 * Internal ops: approve / reject / suspend a partner Instant Redeem production grant.
 */
router.post('/production/approve', internalServiceAuth, async (req, res) => {
  const parsed = productionApproveSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Instant Redeem production approve payload',
      code: 'REDEEM_PRODUCTION_APPROVE_INVALID',
      details: parsed.error.flatten(),
    });
    return;
  }

  const existing = getProductionGrantForPartner(parsed.data.partnerId);
  if (!existing) {
    res.status(404).json({
      error: 'No production grant found for partner',
      code: 'REDEEM_PRODUCTION_GRANT_NOT_FOUND',
    });
    return;
  }

  const grant = upsertProductionGrant({
    ...existing,
    status: parsed.data.status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: parsed.data.reviewedBy,
    reviewNote: parsed.data.reviewNote ?? null,
  });

  res.status(200).json({
    success: true,
    grant,
    note:
      grant.status === 'approved'
        ? 'Partner production credentials can hit /v1/redeem/* . Live money still gated by INSTANT_REDEEM_LIVE_SETTLEMENT.'
        : `Grant set to ${grant.status}.`,
  });
});

/**
 * GET /v1/redeem/readiness
 * Team onboarding + marketable readiness checklist (public).
 */
router.get('/readiness', async (_req, res) => {
  const readiness = await buildInstantRedeemReadiness();
  res.status(readiness.marketReady ? 200 : 503).json({
    success: readiness.marketReady,
    ...readiness,
  });
});

/**
 * Reject cancel attempts — Instant Redeem is irrevocable once executed.
 * No more canceled redeems. That is the product.
 */
function rejectRedeemCancel(res: import('express').Response): void {
  res.status(409).json({
    success: false,
    error: 'Instant Redeem cannot be canceled',
    code: 'REDEEM_IRREVOCABLE',
    irrevocable: true,
    note: 'No more canceled redeems. Settled Instant Redeem stays settled — that is the point of wen payout now.',
  });
}

router.post('/cancel', partnerAuthMiddleware, async (req, res) => {
  if (!requireSandboxPartner(req as PartnerRequest, res)) return;
  rejectRedeemCancel(res);
});

router.delete('/cancel', partnerAuthMiddleware, async (req, res) => {
  if (!requireSandboxPartner(req as PartnerRequest, res)) return;
  rejectRedeemCancel(res);
});

router.post('/:redeemId/cancel', partnerAuthMiddleware, async (req, res) => {
  if (!requireSandboxPartner(req as PartnerRequest, res)) return;
  rejectRedeemCancel(res);
});

router.delete('/:redeemId/cancel', partnerAuthMiddleware, async (req, res) => {
  if (!requireSandboxPartner(req as PartnerRequest, res)) return;
  rejectRedeemCancel(res);
});

/**
 * GET /v1/redeem/:redeemId
 * Fetch a sandbox Instant Redeem record owned by the partner.
 */
router.get('/:redeemId', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (!requireSandboxPartner(request, res)) return;

  const redeemId = String(req.params.redeemId || '');
  // Guard path collisions for reserved words mistakenly hit as ids.
  if (
    redeemId === 'cancel' ||
    redeemId === 'readiness' ||
    redeemId === 'capabilities' ||
    redeemId === 'production'
  ) {
    res.status(404).json({ error: 'Redeem not found', code: 'REDEEM_NOT_FOUND' });
    return;
  }

  const record = redeems.get(redeemId);
  if (!record || record.partnerId !== request.partner!.id) {
    res.status(404).json({ error: 'Redeem not found', code: 'REDEEM_NOT_FOUND' });
    return;
  }

  const mode = partnerModeLabel(request.partner!);
  res.setHeader('X-Mode', mode);
  res.json({
    success: true,
    mode,
    rebuyLock: serializeRebuyLock(getActiveRebuyLock(request.partner!.id, record.playerRef)),
    ...serializeRedeem(record),
  });
});

function serializeRedeem(record: RedeemRecord): Record<string, unknown> {
  return {
    redeemId: record.redeemId,
    quoteId: record.quoteId,
    status: record.status,
    irrevocable:
      record.status === 'settled' ||
      record.status === 'pending' ||
      record.status === 'blocked' ||
      record.status === 'processor_pending',
    cancelAllowed: false,
    playerRef: record.playerRef,
    amountGross: record.amountGross,
    feeAmount: record.feeAmount,
    amountNet: record.amountNet,
    currency: record.currency,
    rg: record.rg,
    settledAt: record.settledAt,
    createdAt: new Date(record.createdAt).toISOString(),
    note: record.note,
    settlementMode: record.settlementMode,
    processorRef: record.processorRef,
    rebuyLock: serializeRebuyLock(getActiveRebuyLock(record.partnerId, record.playerRef)),
  };
}

/** Test-only helper to clear in-memory sandbox state between suites. */
export function __resetRedeemSandboxStateForTests(): void {
  quotes.clear();
  redeems.clear();
  idempotencyIndex.clear();
  rebuyLocks.clear();
  productionSettledVolumeUsd.clear();
  __resetInstantRedeemRegistryForTests();
  __resetInstantRedeemProductionForTests();
}

export { router as redeemRouter };
