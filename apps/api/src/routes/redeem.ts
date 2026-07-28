/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Instant Redeem Routes - /v1/redeem/*
 * Operator white-label sandbox for quote + execute + deposit gate.
 * Same rail: Instant Redeem out, then rebuy cooloff before deposit back in.
 * Irrevocable: settled Instant Redeems cannot be canceled. No more canceled redeems.
 * No real funds move.
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
import { partnerAuthMiddleware, type PartnerRequest } from '../middleware/partner.js';

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
  status: 'settled' | 'pending' | 'blocked' | 'expired';
  amountGross: number;
  feeAmount: number;
  amountNet: number;
  currency: string;
  rg: RgDecision;
  idempotencyKey: string;
  createdAt: number;
  settledAt: string | null;
  note: string;
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
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}

function resolveCasinoName(partner: NonNullable<PartnerRequest['partner']>, override?: string): string | null {
  const raw = override?.trim() || partner.casinoDomain?.trim() || '';
  if (!raw) return null;
  return normalizeCasinoName(raw);
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
  if (input.partnerType === 'processor') {
    const covered = (input.coveredDomains ?? [])
      .map((domain) => normalizeCapabilityDomain(domain))
      .filter(Boolean);
    const primary = input.casinoName
      ? normalizeCapabilityDomain(input.casinoName)
      : partner.casinoDomain
        ? normalizeCapabilityDomain(partner.casinoDomain)
        : null;
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

  const single = resolveCasinoName(partner, input.casinoName);
  if (!single) {
    return {
      domains: [],
      error: {
        status: 400,
        body: {
          error: 'casinoName required when partner has no casino_domain on file',
          code: 'REDEEM_CASINO_REQUIRED',
        },
      },
    };
  }
  return { domains: [single] };
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

function requireSandboxPartner(req: PartnerRequest, res: import('express').Response): boolean {
  if (!req.partner) {
    res.status(401).json({ error: 'Partner authentication required', code: 'PARTNER_UNAUTHORIZED' });
    return false;
  }
  if (req.partner.mode !== 'sandbox') {
    res.status(403).json({
      error: 'Instant Redeem is sandbox-only in this phase. Production stays human-gated.',
      code: 'REDEEM_SANDBOX_ONLY',
    });
    return false;
  }
  return true;
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

  const quota = await enforceSandboxQuota(request.partner!.id);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const enabledAt = new Date().toISOString();
  const domainResults: Array<Record<string, unknown>> = [];
  const rejectedDomains: Array<Record<string, unknown>> = [];
  const allowedDomains: string[] = [];

  for (const domain of resolved.domains) {
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
    await eventRouter.publish('trust.casino.feature.enabled', 'rgaas-api', {
      casinoName: domain,
      feature: 'instant_redeem',
      partnerAppId: request.partner!.appId,
      mode: 'sandbox',
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
    res.status(403).json({
      success: false,
      error: 'Instant Redeem refused — every requested domain failed scam/trust gates',
      code: 'REDEEM_SCAM_CASINO_BLOCKED',
      rejectedDomains,
      note: 'We do not cash out at scam casinos. Clean the book and try again.',
    });
    return;
  }

  upsertInstantRedeemCapabilities(
    allowedDomains.map((domain) => ({
      domain,
      partnerId: request.partner!.id,
      partnerAppId: request.partner!.appId,
      partnerType: parsed.data.partnerType,
      mode: 'sandbox',
      enabledAt,
      rebuyCooloffDefaultHours: 24,
      trustBoostApplied: true,
    })),
  );

  res.setHeader('X-Mode', 'sandbox');
  res.status(200).json({
    success: true,
    mode: 'sandbox',
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

  const quota = await enforceSandboxQuota(request.partner!.id);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const casinoDomain =
    resolveCasinoName(request.partner!, parsed.data.casinoDomain) ||
    (request.partner!.casinoDomain
      ? normalizeCapabilityDomain(request.partner!.casinoDomain)
      : null);

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
  const feeAmount = computeFee(amount);
  const amountNet = roundMoney(Math.max(0, amount - feeAmount));
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
    feeBps: DEFAULT_FEE_BPS,
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

  res.setHeader('X-Mode', 'sandbox');
  res.status(200).json({
    success: true,
    mode: 'sandbox',
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
    note: 'Sandbox quote only. No funds moved. Fee is the cost of not waiting soon™. Scam casinos stay blocked.',
  });
});

/**
 * POST /v1/redeem/execute
 * Settle a previously quoted Instant Redeem (sandbox mock).
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

  const { quoteId, playerRef, idempotencyKey, rebuyCooldownMinutes } = parsed.data;
  const idemKey = `${request.partner!.id}:${idempotencyKey}`;
  const existingRedeemId = idempotencyIndex.get(idemKey);
  if (existingRedeemId) {
    const existing = redeems.get(existingRedeemId);
    if (existing) {
      res.setHeader('X-Mode', 'sandbox');
      res.status(200).json({
        success: true,
        mode: 'sandbox',
        idempotentReplay: true,
        ...serializeRedeem(existing),
      });
      return;
    }
  }

  const quote = quotes.get(quoteId);
  if (!quote || quote.partnerId !== request.partner!.id) {
    res.status(404).json({ error: 'Quote not found for this partner', code: 'REDEEM_QUOTE_NOT_FOUND' });
    return;
  }

  if (quote.playerRef !== playerRef) {
    res.status(409).json({
      error: 'playerRef does not match the quoted player',
      code: 'REDEEM_PLAYER_MISMATCH',
    });
    return;
  }

  if (Date.now() > quote.expiresAt) {
    res.status(410).json({ error: 'Quote expired. Request a fresh quote.', code: 'REDEEM_QUOTE_EXPIRED' });
    return;
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

  const quota = await enforceSandboxQuota(request.partner!.id);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const rg = evaluateRg(playerRef, quote.amountGross);
  let status: RedeemRecord['status'] = 'settled';
  let note = 'Sandbox settle only. No funds moved.';

  if (!rg.allowed) {
    status = 'blocked';
    note = 'Sandbox blocked by RG gate. No funds moved.';
  } else if (rg.gates.includes('HIGH_AMOUNT_REVIEW')) {
    status = 'pending';
    note = 'Sandbox pending manual review for high amount. No funds moved.';
  }

  const redeemId = `rd_${crypto.randomBytes(12).toString('hex')}`;
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
  };

  redeems.set(redeemId, record);
  idempotencyIndex.set(idemKey, redeemId);
  quotes.delete(quoteId);

  let rebuyLock: RebuyLock | null = null;
  if (status === 'settled') {
    const cooldownMs = Math.min(
      MAX_REBUY_COOLDOWN_MS,
      rebuyCooldownMinutes != null
        ? rebuyCooldownMinutes * 60_000
        : DEFAULT_REBUY_COOLDOWN_MS,
    );
    rebuyLock = setRebuyLock({
      partnerId: request.partner!.id,
      playerRef,
      redeemId,
      amountNet: quote.amountNet,
      currency: quote.currency,
      cooldownMs,
    });
    note = 'Sandbox settle only. No funds moved. Rebuy cooloff armed on the same payment rail.';
    record.note = note;
  }

  res.setHeader('X-Mode', 'sandbox');
  res.status(status === 'blocked' ? 200 : 201).json({
    success: status !== 'blocked',
    mode: 'sandbox',
    idempotentReplay: false,
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

  const quota = await enforceSandboxQuota(request.partner!.id);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const lock = getActiveRebuyLock(request.partner!.id, parsed.data.playerRef);
  const allowed = lock == null;

  res.setHeader('X-Mode', 'sandbox');
  res.status(200).json({
    success: true,
    mode: 'sandbox',
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

  const quota = await enforceSandboxQuota(request.partner!.id);
  if (!quota.ok) {
    res.status(quota.status).json(quota.body);
    return;
  }

  const lock = getActiveRebuyLock(request.partner!.id, parsed.data.playerRef);
  if (lock) {
    res.setHeader('X-Mode', 'sandbox');
    res.status(423).json({
      success: false,
      mode: 'sandbox',
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
  res.setHeader('X-Mode', 'sandbox');
  res.status(201).json({
    success: true,
    mode: 'sandbox',
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
    note: 'Sandbox deposit accepted. No funds moved.',
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
  if (redeemId === 'cancel' || redeemId === 'readiness' || redeemId === 'capabilities') {
    res.status(404).json({ error: 'Redeem not found', code: 'REDEEM_NOT_FOUND' });
    return;
  }

  const record = redeems.get(redeemId);
  if (!record || record.partnerId !== request.partner!.id) {
    res.status(404).json({ error: 'Redeem not found', code: 'REDEEM_NOT_FOUND' });
    return;
  }

  res.setHeader('X-Mode', 'sandbox');
  res.json({
    success: true,
    mode: 'sandbox',
    rebuyLock: serializeRebuyLock(getActiveRebuyLock(request.partner!.id, record.playerRef)),
    ...serializeRedeem(record),
  });
});

function serializeRedeem(record: RedeemRecord): Record<string, unknown> {
  return {
    redeemId: record.redeemId,
    quoteId: record.quoteId,
    status: record.status,
    irrevocable: record.status === 'settled' || record.status === 'pending' || record.status === 'blocked',
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
    rebuyLock: serializeRebuyLock(getActiveRebuyLock(record.partnerId, record.playerRef)),
  };
}

/** Test-only helper to clear in-memory sandbox state between suites. */
export function __resetRedeemSandboxStateForTests(): void {
  quotes.clear();
  redeems.clear();
  idempotencyIndex.clear();
  rebuyLocks.clear();
  __resetInstantRedeemRegistryForTests();
}

export { router as redeemRouter };
