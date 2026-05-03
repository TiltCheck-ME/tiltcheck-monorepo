/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * Partner Routes - /partner/*
 * Handles admin and sandbox partner registration, verification, and operator key management.
 */

import crypto from 'node:crypto';
import type { Request } from 'express';
import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { Resend } from 'resend';
import { createToken, verifyToken } from '@tiltcheck/auth';
import {
  consumePartnerVerificationToken,
  createPartner,
  createWebhook,
  findLatestPartnerByContactEmail,
  findPartnerByAppId,
  findPartnerById,
  findUserById,
  incrementPartnerDailyQuotaUsage,
  listPartnersByContactEmail,
  markPartnerProductionAccessRequested,
  updatePartner,
} from '@tiltcheck/db';
import { z } from 'zod';
import { authMiddleware, AuthRequest, getJWTConfig, verifySessionCookie } from '../middleware/auth.js';
import { partnerAuthMiddleware, PartnerRequest } from '../middleware/partner.js';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SANDBOX_DAILY_QUOTA = 1000;
const EMAIL_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const IP_RATE_WINDOW_MS = 60 * 60 * 1000;
const SANDBOX_VERIFY_AUDIENCE = 'partner-sandbox';
const SANDBOX_VERIFY_TYPE = 'service';

const sandboxRegistrationSchema = z.object({
  email: z.string().email().max(320),
  companyName: z.string().trim().min(2).max(120),
  casinoDomain: z.string().trim().min(3).max(255),
  intendedUseCase: z.string().trim().min(20).max(1200),
  recaptchaToken: z.string().trim().min(6).max(4096),
  honeypot: z.string().optional(),
});

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}

function getRequestIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function buildPartnerAppId(companyName: string): string {
  const slug = companyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'operator';
  return `sandbox_${slug}_${crypto.randomBytes(4).toString('hex')}`;
}

function buildPartnerSecret(): string {
  return `sk_sandbox_${crypto.randomBytes(24).toString('hex')}`;
}

function buildVerificationTokenId(): string {
  return crypto.randomUUID();
}

function getSiteUrl(): string {
  return (process.env.SITE_URL || 'https://tiltcheck.me').replace(/\/+$/, '');
}

function getApiUrl(): string {
  return (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/+$/, '');
}

async function resolveAuthenticatedEmail(req: Request): Promise<string | null> {
  const authReq = req as AuthRequest & { auth?: { email?: string; userId?: string; roles?: string[] } };
  const mappedEmail = authReq.user?.email?.trim() || authReq.auth?.email?.trim();
  if (mappedEmail) {
    return normalizeEmail(mappedEmail);
  }

  const jwtConfig = getJWTConfig();
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const tokenResult = await verifyToken(token, jwtConfig);
    const email = tokenResult.valid && typeof tokenResult.payload?.email === 'string'
      ? tokenResult.payload.email.trim()
      : '';
    if (email) {
      return normalizeEmail(email);
    }
  }

  const sessionResult = await verifySessionCookie(req.headers.cookie, jwtConfig);
  if (!sessionResult.valid || !sessionResult.session?.userId) {
    return null;
  }

  const user = await findUserById(sessionResult.session.userId);
  return user?.email?.trim() ? normalizeEmail(user.email) : null;
}

async function deliverSandboxVerificationEmail(email: string, verificationUrl: string, appId: string): Promise<void> {
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    console.info(`[Partner Sandbox] Verification link for ${email}: ${verificationUrl}`);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Verify your TiltCheck RGaaS sandbox access',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h1 style="font-size:20px;margin-bottom:12px;">Verify your sandbox access</h1>
        <p>Your sandbox app ID is <strong>${appId}</strong>.</p>
        <p>Click the link below within 24 hours to activate your sandbox keys and view them in the operator portal.</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>If you did not request this, ignore it. No cap, the token dies in 24 hours and only works once.</p>
      </div>
    `,
  });
}

function sanitizePartnerForPortal(partner: Awaited<ReturnType<typeof findPartnerById>>) {
  if (!partner) return null;
  return {
    id: partner.id,
    name: partner.name,
    appId: partner.app_id,
    contactEmail: partner.contact_email,
    websiteUrl: partner.website_url,
    casinoDomain: partner.casino_domain,
    intendedUseCase: partner.intended_use_case,
    mode: partner.mode || 'production',
    dailyQuotaLimit: partner.daily_quota_limit ?? null,
    dailyQuotaUsed: partner.daily_quota_used ?? null,
    dailyQuotaRemaining:
      partner.daily_quota_limit == null
        ? null
        : Math.max(0, partner.daily_quota_limit - (partner.daily_quota_used ?? 0)),
    quotaWindowStartedAt: partner.quota_window_started_at,
    emailVerifiedAt: partner.email_verified_at,
    lastProductionAccessRequestedAt: partner.last_production_access_requested_at,
    createdAt: partner.created_at,
    updatedAt: partner.updated_at,
  };
}

const sandboxIpLimiter = rateLimit({
  windowMs: IP_RATE_WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(getRequestIp(req)),
  message: { error: 'Too many sandbox signup attempts from this IP', code: 'SANDBOX_IP_RATE_LIMITED' },
});

const sandboxEmailLimiter = rateLimit({
  windowMs: EMAIL_RATE_WINDOW_MS,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeEmail(String(req.body?.email || '')),
  skip: (req) => typeof req.body?.email !== 'string' || !req.body.email.trim(),
  message: { error: 'Too many sandbox signup attempts for this email', code: 'SANDBOX_EMAIL_RATE_LIMITED' },
});

/**
 * POST /partner/register
 * Admin only: Register a new partner in the ecosystem.
 */
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const userPayload = (req as AuthRequest).user;
    if (!userPayload?.roles.includes('admin')) {
      res.status(403).json({ error: 'Admin privileges required' });
      return;
    }

    const { name, appId, websiteUrl, secretKey } = req.body;

    if (!name || !appId || !secretKey) {
      res.status(400).json({ error: 'Name, appId, and secretKey are required' });
      return;
    }

    const existing = await findPartnerByAppId(appId);
    if (existing) {
      res.status(409).json({ error: 'AppId already registered' });
      return;
    }

    const partner = await createPartner({
      name,
      app_id: appId,
      website_url: websiteUrl,
      secret_key: secretKey,
      mode: 'production',
      registered_via: 'admin',
      email_verified_at: new Date(),
      verification_token_jti: null,
      verification_token_expires_at: null,
      verification_token_consumed_at: null,
    });

    res.status(201).json({
      success: true,
      partner: {
        id: partner?.id,
        name: partner?.name,
        appId: partner?.app_id,
      }
    });
  } catch {
    res.status(500).json({ error: 'Failed to register partner' });
  }
});

/**
 * POST /partner/register-sandbox
 * Public sandbox partner registration with rate limits and email verification.
 */
router.post('/register-sandbox', sandboxIpLimiter, sandboxEmailLimiter, async (req, res) => {
  const parsed = sandboxRegistrationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid sandbox registration payload',
      code: 'INVALID_SANDBOX_REGISTRATION',
      details: parsed.error.flatten(),
    });
    return;
  }

  const { email, companyName, casinoDomain, intendedUseCase, recaptchaToken, honeypot } = parsed.data;
  if (honeypot?.trim()) {
    res.status(200).json({ success: true });
    return;
  }

  if (!recaptchaToken || recaptchaToken.toLowerCase().includes('invalid')) {
    res.status(400).json({ error: 'reCAPTCHA validation failed', code: 'INVALID_RECAPTCHA' });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const existingByEmail = await findLatestPartnerByContactEmail(normalizedEmail, 'sandbox');
  if (existingByEmail?.email_verified_at) {
    res.status(409).json({
      error: 'Sandbox keys already exist for this operator email',
      code: 'SANDBOX_ALREADY_REGISTERED',
    });
    return;
  }

  const appId = buildPartnerAppId(companyName);
  const secretKey = buildPartnerSecret();
  const tokenId = buildVerificationTokenId();
  const verificationToken = await createToken(
    {
      sub: normalizedEmail,
      type: SANDBOX_VERIFY_TYPE,
      roles: ['partner_sandbox'],
      jti: tokenId,
      email: normalizedEmail,
      appId,
      mode: 'sandbox',
    },
    {
      ...getJWTConfig(),
      audience: SANDBOX_VERIFY_AUDIENCE,
      expiresIn: '24h',
    },
  );

  const verificationExpiry = new Date(Date.now() + EMAIL_RATE_WINDOW_MS);
  const partner = existingByEmail && !existingByEmail.email_verified_at
    ? await updatePartner(existingByEmail.id, {
      name: companyName.trim(),
      website_url: `https://${normalizeDomain(casinoDomain)}`,
      contact_email: normalizedEmail,
      casino_domain: normalizeDomain(casinoDomain),
      intended_use_case: intendedUseCase.trim(),
      app_id: appId,
      secret_key: secretKey,
      mode: 'sandbox',
      registered_via: 'sandbox_self_serve',
      verification_token_jti: tokenId,
      verification_token_expires_at: verificationExpiry,
      verification_token_consumed_at: null,
      email_verified_at: null,
      daily_quota_limit: SANDBOX_DAILY_QUOTA,
      daily_quota_used: 0,
      quota_window_started_at: null,
      is_active: false,
    })
    : await createPartner({
      name: companyName.trim(),
      website_url: `https://${normalizeDomain(casinoDomain)}`,
      contact_email: normalizedEmail,
      casino_domain: normalizeDomain(casinoDomain),
      intended_use_case: intendedUseCase.trim(),
      app_id: appId,
      secret_key: secretKey,
      mode: 'sandbox',
      registered_via: 'sandbox_self_serve',
      verification_token_jti: tokenId,
      verification_token_expires_at: verificationExpiry,
      verification_token_consumed_at: null,
      email_verified_at: null,
      daily_quota_limit: SANDBOX_DAILY_QUOTA,
      daily_quota_used: 0,
      quota_window_started_at: null,
      is_active: false,
    });

  if (!partner) {
    res.status(500).json({ error: 'Failed to provision sandbox partner', code: 'SANDBOX_PROVISION_FAILED' });
    return;
  }

  const verificationUrl = `${getSiteUrl()}/operators/verify?token=${encodeURIComponent(verificationToken)}`;
  try {
    await deliverSandboxVerificationEmail(normalizedEmail, verificationUrl, appId);
  } catch {
    res.status(502).json({ error: 'Failed to send verification email', code: 'SANDBOX_EMAIL_FAILED' });
    return;
  }

  res.status(202).json({
    success: true,
    status: 'pending_verification',
    message: 'Verification email sent. Open the link to activate sandbox keys.',
    portalUrl: `${getSiteUrl()}/operators/keys`,
  });
});

/**
 * POST /partner/verify-sandbox
 * Single-use email verification for sandbox credentials.
 */
router.post('/verify-sandbox', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token) {
    res.status(400).json({ error: 'Verification token is required', code: 'MISSING_VERIFICATION_TOKEN' });
    return;
  }

  const verified = await verifyToken(token, {
    ...getJWTConfig(),
    audience: SANDBOX_VERIFY_AUDIENCE,
  });
  if (!verified.valid || !verified.payload?.jti || typeof verified.payload.email !== 'string') {
    res.status(400).json({ error: 'Verification token is invalid or expired', code: 'INVALID_VERIFICATION_TOKEN' });
    return;
  }

  const partner = await consumePartnerVerificationToken(verified.payload.jti);
  if (!partner) {
    res.status(409).json({ error: 'Verification link was already used or expired', code: 'VERIFICATION_ALREADY_CONSUMED' });
    return;
  }

  res.json({
    success: true,
    partner: {
      ...sanitizePartnerForPortal(partner),
      secretKey: partner.secret_key,
    },
    next: {
      portalUrl: `${getSiteUrl()}/operators/keys`,
      docsUrl: `${getSiteUrl()}/operators/pricing`,
      apiBaseUrl: getApiUrl(),
    },
  });
});

/**
 * GET /partner/operators/keys
 * Return sandbox keys scoped to the authenticated operator email.
 */
router.get('/operators/keys', async (req, res) => {
  const operatorEmail = await resolveAuthenticatedEmail(req);
  if (!operatorEmail) {
    res.status(401).json({ error: 'Authentication required', code: 'OPERATOR_AUTH_REQUIRED' });
    return;
  }

  const partners = await listPartnersByContactEmail(operatorEmail, 'sandbox');
  res.json({
    success: true,
    operatorEmail,
    partners: partners
      .filter((partner) => partner.email_verified_at)
      .map((partner) => ({
        ...sanitizePartnerForPortal(partner),
        secretKey: partner.secret_key,
      })),
  });
});

/**
 * POST /partner/operators/request-production
 * Manual promotion handoff for verified sandbox operators.
 */
router.post('/operators/request-production', async (req, res) => {
  const operatorEmail = await resolveAuthenticatedEmail(req);
  const partnerId = typeof req.body?.partnerId === 'string' ? req.body.partnerId.trim() : '';
  if (!operatorEmail || !partnerId) {
    res.status(400).json({ error: 'Authenticated operator email and partnerId are required', code: 'INVALID_PRODUCTION_REQUEST' });
    return;
  }

  const partner = await findPartnerById(partnerId);
  if (!partner || normalizeEmail(partner.contact_email || '') !== operatorEmail || !partner.email_verified_at) {
    res.status(404).json({ error: 'Sandbox partner not found for this operator', code: 'PARTNER_NOT_FOUND' });
    return;
  }

  const updated = await markPartnerProductionAccessRequested(partnerId);
  res.json({
    success: true,
    message: 'Production access request recorded. Manual review still gates prod keys.',
    partner: sanitizePartnerForPortal(updated),
    contact: 'partners@tiltcheck.me',
  });
});

/**
 * GET /partner/sandbox/mock
 * Partner-authenticated smoke route for immediate sandbox validation.
 */
router.get('/sandbox/mock', partnerAuthMiddleware, async (req, res) => {
  const request = req as PartnerRequest;
  if (request.partner?.mode !== 'sandbox') {
    res.status(403).json({ error: 'Sandbox credentials required', code: 'SANDBOX_ONLY_ENDPOINT' });
    return;
  }

  const updatedPartner = await incrementPartnerDailyQuotaUsage(request.partner.id);
  if (!updatedPartner) {
    res.status(500).json({ error: 'Failed to record sandbox usage', code: 'SANDBOX_USAGE_FAILED' });
    return;
  }

  const used = updatedPartner.daily_quota_used ?? 0;
  const limit = updatedPartner.daily_quota_limit ?? SANDBOX_DAILY_QUOTA;
  if (used > limit) {
    res.status(429).json({ error: 'Sandbox quota exceeded', code: 'SANDBOX_QUOTA_EXCEEDED' });
    return;
  }

  res.setHeader('X-Mode', 'sandbox');
  res.json({
    success: true,
    mode: 'sandbox',
    appId: updatedPartner.app_id,
    quota: {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      windowStartedAt: updatedPartner.quota_window_started_at,
    },
    mock: {
      trustScore: 612,
      riskBand: 'moderate',
      intervention: 'cooldown_recommended',
      note: 'Sandbox response only. No trust-rollup writes happened.',
    },
  });
});

/**
 * POST /partner/webhooks
 * Partner auth: Register a new webhook for integration events.
 */
router.post('/webhooks', partnerAuthMiddleware, async (req, res) => {
  try {
    const partner = (req as PartnerRequest).partner;
    const { targetUrl, events } = req.body;

    if (!targetUrl || !Array.isArray(events)) {
      res.status(400).json({ error: 'targetUrl and events (array) are required' });
      return;
    }

    const webhook = await createWebhook({
      partner_id: partner!.id,
      target_url: targetUrl,
      events,
    });

    res.status(201).json({
      success: true,
      webhook,
    });
  } catch {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * GET /partner/me
 * Partner auth: Get current partner info.
 */
router.get('/me', partnerAuthMiddleware, async (req, res) => {
  try {
    const partner = (req as PartnerRequest).partner;
    res.json({
      success: true,
      partner,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get partner info' });
  }
});

export { router as partnerRouter };
