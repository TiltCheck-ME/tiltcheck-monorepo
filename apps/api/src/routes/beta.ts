/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13 */
/**
 * Beta Routes - /beta/*
 * Handles data contributor signups from tiltcheck.me/beta-tester
 */

import type { Request } from 'express';
import { Router } from 'express';
import { Resend } from 'resend';
import { verifySessionCookie, verifyToken } from '@tiltcheck/auth';
import {
  findBetaSignupById,
  findLatestBetaSignupByDiscordId,
  findLatestBetaSignupByEmail,
  findLatestBetaSignupByUserId,
  createBetaSignup,
  listBetaSignupsByStatus,
  updateBetaSignup,
  type BetaEntitlements,
  type BetaSignup,
  type BetaSignupStatus,
} from '@tiltcheck/db';
import { z } from 'zod';
import { getJWTConfig } from '../middleware/auth.js';

const router = Router();
type BetaQueueEventType = 'submitted' | 'reviewed';

const betaSignupSchema = z.object({
  applicationPath: z.enum(['discord', 'site']).optional(),
  email: z.string().optional(),
  casinos: z.string().optional(),
  style: z.string().optional(),
  aspects: z.array(z.string()).optional(),
  setup: z.string().optional(),
  proof: z.string().optional(),
  website: z.string().optional(),
});

const betaReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'waitlisted']),
  reviewerNotes: z.string().max(1000).optional(),
  entitlements: z.object({
    beta_access_web: z.boolean().optional(),
    beta_access_dashboard: z.boolean().optional(),
    beta_access_extension: z.boolean().optional(),
    beta_access_discord: z.boolean().optional(),
    beta_access_community: z.boolean().optional(),
  }).optional(),
});

function parseList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
    .slice(0, 20);
}

function parseCommaSeparatedList(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, 20);
}

function normalizeOptionalText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function hasInternalServiceAccess(req: Request): boolean {
  const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
  if (!internalSecret) return false;

  const bearerToken = extractBearerToken(req.headers.authorization);
  const headerSecret = typeof req.headers['x-internal-secret'] === 'string' ? req.headers['x-internal-secret'].trim() : '';
  return bearerToken === internalSecret || headerSecret === internalSecret;
}

async function syncDiscordReviewQueue(
  signupId: string,
  eventType: BetaQueueEventType,
  previousStatus?: BetaSignupStatus,
): Promise<'sent' | 'skipped' | 'failed'> {
  const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
  const botInternalUrl = process.env.DISCORD_BOT_INTERNAL_URL?.trim()
    || process.env.BOT_INTERNAL_URL?.trim()
    || (process.env.NODE_ENV === 'production' ? 'https://bot.tiltcheck.me' : 'http://localhost:8080');

  if (!internalSecret || !botInternalUrl) {
    return 'skipped';
  }

  try {
    const response = await fetch(`${botInternalUrl}/internal/beta-signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalSecret}`,
      },
      body: JSON.stringify({
        signupId,
        eventType,
        previousStatus,
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord beta queue sync returned ${response.status}`);
    }

    return 'sent';
  } catch (error) {
    console.error('[Beta API] Discord review queue sync failed:', error);
    return 'failed';
  }
}

async function resolveAuthContext(req: Request) {
  const jwtConfig = getJWTConfig();
  let userId: string | null = null;
  let email: string | null = null;
  let discordId: string | null = null;
  let discordUsername: string | null = null;
  let roles: string[] = [];
  let isAdmin = false;

  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken) {
    const tokenResult = await verifyToken(bearerToken, jwtConfig);
    if (tokenResult.valid && tokenResult.payload) {
      const tokenUserId =
        typeof tokenResult.payload.sub === 'string'
          ? tokenResult.payload.sub
          : typeof (tokenResult.payload as { userId?: unknown }).userId === 'string'
            ? String((tokenResult.payload as { userId?: unknown }).userId)
            : null;

      userId = tokenUserId;
      email = normalizeOptionalText((tokenResult.payload as { email?: unknown }).email)?.toLowerCase() || null;
      discordId = normalizeOptionalText((tokenResult.payload as { discordId?: unknown }).discordId) || discordId;
      discordUsername = normalizeOptionalText((tokenResult.payload as { discordUsername?: unknown }).discordUsername) || discordUsername;
      const tokenRoles = (tokenResult.payload as { roles?: unknown }).roles;
      roles = Array.isArray(tokenRoles)
        ? tokenRoles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
        : roles;
      isAdmin = isAdmin || roles.includes('admin');
    }
  }

  const sessionResult = await verifySessionCookie(req.headers.cookie, jwtConfig);
  if (sessionResult.valid && sessionResult.session) {
    userId = sessionResult.session.userId || userId;
    discordId = sessionResult.session.discordId || null;
    discordUsername = sessionResult.session.discordUsername?.trim() || discordId;
    roles = sessionResult.session.roles || roles;
    isAdmin = isAdmin || sessionResult.session.type === 'admin' || roles.includes('admin');
  }

  return { userId, email, discordId, discordUsername, roles, isAdmin };
}

function getDefaultEntitlements(signup: BetaSignup): BetaEntitlements {
  const discordEligible = signup.application_path === 'discord' && Boolean(signup.discord_id);

  return {
    beta_access_web: true,
    beta_access_dashboard: true,
    beta_access_extension: true,
    beta_access_discord: discordEligible,
    beta_access_community: discordEligible,
  };
}

function getLockedEntitlements(): BetaEntitlements {
  return {
    beta_access_web: false,
    beta_access_dashboard: false,
    beta_access_extension: false,
    beta_access_discord: false,
    beta_access_community: false,
  };
}

function buildInboxMessages(signup: BetaSignup): Array<{ kind: BetaSignupStatus; title: string; body: string }> {
  const surfaceList = [
    signup.beta_access_web ? 'web tools' : '',
    signup.beta_access_dashboard ? 'dashboard access' : '',
    signup.beta_access_extension ? 'extension beta' : '',
    signup.beta_access_discord ? 'Discord beta surfaces' : '',
    signup.beta_access_community ? 'community channels' : '',
  ].filter(Boolean);

  if (signup.status === 'approved') {
    return [{
      kind: 'approved',
      title: 'Beta access approved',
      body: surfaceList.length > 0
        ? `You are in. Approved surfaces: ${surfaceList.join(', ')}. ${signup.reviewer_notes || 'Watch this panel for next-step updates.'}`
        : `You are approved. ${signup.reviewer_notes || 'Watch this panel for next-step updates.'}`,
    }];
  }

  if (signup.status === 'waitlisted') {
    return [{
      kind: 'waitlisted',
      title: 'Beta application waitlisted',
      body: signup.reviewer_notes || 'You are still in line. We have your application and will open more slots when capacity loosens up.',
    }];
  }

  if (signup.status === 'rejected') {
    return [{
      kind: 'rejected',
      title: 'Beta application closed',
      body: signup.reviewer_notes || 'This beta slot did not clear review. You can reapply later when the next wave opens.',
    }];
  }

  return [{
    kind: 'pending',
    title: 'Beta application pending review',
    body: 'Your application is in the queue. No action needed until we review it.',
  }];
}

async function notifyEmailReview(signup: BetaSignup): Promise<'sent' | 'skipped' | 'failed'> {
  if (signup.contact_method !== 'email' || !signup.notification_email) {
    return 'skipped';
  }

  const message = buildInboxMessages(signup)[0];
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const webhookUrl = process.env.BETA_EMAIL_WEBHOOK_URL?.trim();

  try {
    if (resendApiKey && resendFromEmail) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: resendFromEmail,
        to: signup.notification_email,
        subject: `TiltCheck Beta: ${message.title}`,
        text: message.body,
      });

      return 'sent';
    }

    if (!webhookUrl) {
      return 'skipped';
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: signup.notification_email,
        subject: `TiltCheck Beta: ${message.title}`,
        text: message.body,
        beta_signup_id: signup.id,
        status: signup.status,
        application_path: signup.application_path,
        user_id: signup.user_id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email webhook returned ${response.status}`);
    }

    return 'sent';
  } catch (error) {
    console.error('[Beta API] Email notification failed:', error);
    return 'failed';
  }
}

async function findAccessibleSignup(authContext: Awaited<ReturnType<typeof resolveAuthContext>>): Promise<BetaSignup | null> {
  if (authContext.userId) {
    const byUserId = await findLatestBetaSignupByUserId(authContext.userId);
    if (byUserId) return byUserId;
  }

  if (authContext.email) {
    const byEmail = await findLatestBetaSignupByEmail(authContext.email);
    if (byEmail) return byEmail;
  }

  if (authContext.discordId) {
    const byDiscord = await findLatestBetaSignupByDiscordId(authContext.discordId);
    if (byDiscord) return byDiscord;
  }

  return null;
}

/**
 * POST /beta/signup
 * Beta signup supporting linked Discord applicants and site/email applicants.
 */
router.post('/signup', async (req, res) => {
  const parsedBody = betaSignupSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ success: false, error: 'Invalid beta application payload' });
    return;
  }

  const { applicationPath, email, casinos, style, aspects, setup, proof, website } = parsedBody.data;
  const signupPath = applicationPath === 'site' ? 'site' : 'discord';

  // Honeypot
  if (website) {
    res.status(400).json({ success: false, error: 'Bot detected' });
    return;
  }

  const authContext = await resolveAuthContext(req);
  const casinoList = parseCommaSeparatedList(casinos);
  const requestedTools = parseList(aspects);
  const reviewerNotes = [
    typeof setup === 'string' && setup.trim() ? `Setup: ${setup.trim()}` : '',
    typeof proof === 'string' && proof.trim() ? `Trust requirement: ${proof.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 500);

  let signupEmail: string;
  let contactMethod: 'discord' | 'email';
  let signupDiscordId: string | null = null;
  let signupDiscordUsername: string | null = null;

  if (signupPath === 'discord') {
    if (!authContext.discordId) {
      res.status(401).json({ success: false, error: 'Link Discord before applying', code: 'DISCORD_LINK_REQUIRED' });
      return;
    }

    signupDiscordId = authContext.discordId;
    signupDiscordUsername = authContext.discordUsername || signupDiscordId;
    signupEmail = `${signupDiscordId}@discord.tiltcheck.placeholder`;
    contactMethod = 'discord';
  } else {
    const normalizedEmail = normalizeOptionalText(email)?.toLowerCase() || null;
    const emailValidation = normalizedEmail ? z.string().email().safeParse(normalizedEmail) : null;

    if (!emailValidation?.success) {
      res.status(400).json({ success: false, error: 'Email is required for non-Discord beta access', code: 'EMAIL_REQUIRED' });
      return;
    }

    signupEmail = emailValidation.data;
    contactMethod = 'email';
  }

  try {
    const existing = await findLatestBetaSignupByEmail(signupEmail);
    if (existing) {
      res.json({ success: true, duplicate: true, message: 'Already signed up' });
      return;
    }

    const created = await createBetaSignup({
      user_id: authContext.userId,
      email: signupEmail,
      application_path: signupPath,
      contact_method: contactMethod,
      status: 'pending',
      discord_id: signupDiscordId,
      discord_username: signupDiscordUsername,
      notification_email: contactMethod === 'email' ? signupEmail : null,
      notification_discord_id: contactMethod === 'discord' ? signupDiscordId : null,
      beta_access_web: false,
      beta_access_dashboard: false,
      beta_access_extension: false,
      beta_access_discord: false,
      beta_access_community: false,
      interests: casinoList,
      experience_level: typeof style === 'string' ? style.trim() : null,
      feedback_preference: requestedTools.join(', ') || null,
      referral_source: reviewerNotes || 'direct',
    });
    if (!created) {
      res.status(500).json({ success: false, error: 'Failed to create beta signup' });
      return;
    }

    const reviewQueue = await syncDiscordReviewQueue(created.id, 'submitted');

    res.json({
      success: true,
      message: 'Signed up successfully',
      delivery: {
        reviewQueue,
      },
    });
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

    if (code === '23505') {
      res.json({ success: true, duplicate: true, message: 'Already signed up' });
      return;
    }

    console.error('[Beta API] Signup error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/inbox', async (req, res) => {
  const authContext = await resolveAuthContext(req);

  if (!authContext.userId && !authContext.email && !authContext.discordId) {
    res.status(401).json({ success: false, error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return;
  }

  try {
    const signup = await findAccessibleSignup(authContext);
    if (!signup) {
      res.json({ success: true, application: null, messages: [] });
      return;
    }

    res.json({
      success: true,
      application: {
        id: signup.id,
        status: signup.status,
        applicationPath: signup.application_path,
        contactMethod: signup.contact_method,
        approvedAt: signup.approved_at,
        rejectedAt: signup.rejected_at,
        reviewerNotes: signup.reviewer_notes,
        entitlements: {
          beta_access_web: signup.beta_access_web,
          beta_access_dashboard: signup.beta_access_dashboard,
          beta_access_extension: signup.beta_access_extension,
          beta_access_discord: signup.beta_access_discord,
          beta_access_community: signup.beta_access_community,
        },
      },
      messages: buildInboxMessages(signup),
    });
  } catch (error) {
    console.error('[Beta API] Inbox error:', error);
    res.status(500).json({ success: false, error: 'Failed to load beta inbox' });
  }
});

router.get('/admin/signups', async (req, res) => {
  const authContext = await resolveAuthContext(req);
  if (!authContext.isAdmin) {
    res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
    return;
  }

  const statusParam = typeof req.query.status === 'string' ? req.query.status : 'pending';
  const parsedStatus = z.enum(['pending', 'approved', 'rejected', 'waitlisted']).safeParse(statusParam);
  if (!parsedStatus.success) {
    res.status(400).json({ success: false, error: 'Invalid beta signup status' });
    return;
  }

  try {
    const signups = await listBetaSignupsByStatus(parsedStatus.data);
    res.json({ success: true, signups });
  } catch (error) {
    console.error('[Beta API] Admin list error:', error);
    res.status(500).json({ success: false, error: 'Failed to load beta signups' });
  }
});

router.post('/:id/review', async (req, res) => {
  const authContext = await resolveAuthContext(req);
  const internalRequest = hasInternalServiceAccess(req);
  if (!authContext.isAdmin && !internalRequest) {
    res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
    return;
  }

  const parsedBody = betaReviewSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ success: false, error: 'Invalid beta review payload' });
    return;
  }

  try {
    const signup = await findBetaSignupById(req.params.id);
    if (!signup) {
      res.status(404).json({ success: false, error: 'Beta signup not found' });
      return;
    }

    const decision = parsedBody.data.status;
    const entitlementPatch = decision === 'approved'
      ? { ...getDefaultEntitlements(signup), ...(parsedBody.data.entitlements || {}) }
      : getLockedEntitlements();

    const updated = await updateBetaSignup(signup.id, {
      status: decision,
      reviewer_notes: normalizeOptionalText(parsedBody.data.reviewerNotes),
      approved_at: decision === 'approved' ? new Date() : null,
      rejected_at: decision === 'rejected' ? new Date() : null,
      ...entitlementPatch,
    });

    if (!updated) {
      res.status(500).json({ success: false, error: 'Failed to update beta signup' });
      return;
    }

    const emailDelivery = await notifyEmailReview(updated);
    const reviewQueue = await syncDiscordReviewQueue(updated.id, 'reviewed', signup.status);

    res.json({
      success: true,
      signup: updated,
      delivery: {
        email: emailDelivery,
        reviewQueue,
      },
    });
  } catch (error) {
    console.error('[Beta API] Review error:', error);
    res.status(500).json({ success: false, error: 'Failed to review beta signup' });
  }
});

export { router as betaRouter };
