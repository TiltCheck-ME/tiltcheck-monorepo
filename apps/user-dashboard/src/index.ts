// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import fs from 'node:fs/promises';
import { WebSocketServer, WebSocket } from 'ws';
import { 
  verifySessionCookie, 
  getCookieConfig,
  type JWTConfig,
  type SessionData
} from '@tiltcheck/auth';
import rateLimit from 'express-rate-limit';
import { Magic } from '@magic-sdk/admin';
import { Connection, PublicKey } from '@solana/web3.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';
import type { Request, Response, NextFunction } from 'express';

interface DashboardRequest extends Request {
  user?: {
    discordId: string;
    username: string;
    avatar: string | null;
  };
  params: Record<string, string>;
}
import { db, DegenIdentity } from '@tiltcheck/database';
import { findUserByDiscordId, findOnboardingByDiscordId, upsertOnboarding, getAggregatedTrustByDiscordId, getUserBuddies, getPendingBuddyRequests, queryOne, sendBuddyRequest, type UserOnboarding } from '@tiltcheck/db';
import { runner } from '@tiltcheck/agent';

/**
 * Utility to convert agent content to string
 */
interface AgentContent {
  parts?: { text?: string }[];
}

function stringifyContent(content: AgentContent | string): string {
  if (typeof content === 'string') return content;
  if (content?.parts) return content.parts.map((p) => p.text || '').join('');
  return JSON.stringify(content);
}

function requireAuthorizedDiscordId(req: DashboardRequest, res: Response): string | null {
  const authenticatedDiscordId = req.user?.discordId;
  const requestedDiscordId = req.params.discordId;

  if (!authenticatedDiscordId) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return null;
  }

  if (!requestedDiscordId || requestedDiscordId !== authenticatedDiscordId) {
    res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    return null;
  }

  return authenticatedDiscordId;
}

interface AgentEvent {
  content?: AgentContent | string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.USER_DASHBOARD_PORT || 6001;
const DISCORD_CALLBACK_URL = process.env.TILT_DISCORD_REDIRECT_URI || 'https://api.tiltcheck.me/auth/discord/callback';
const DEFAULT_DISCORD_CLIENT_ID = '1445916179163250860';

// Configuration
const isProd = process.env.NODE_ENV === 'production';
const HUB_BASE_URL = isProd ? 'https://hub.tiltcheck.me' : `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

// Shared Auth Config
const jwtConfig: JWTConfig = {
  secret: JWT_SECRET,
  issuer: 'tiltcheck-api',
  audience: 'tiltcheck-apps',
  expiresIn: '7d'
};

// Rate limiter
const trustLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentClaimLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);
const _solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allowed origins for user dashboard
    const allowedOrigins = [
      'https://tiltcheck.me',
      'https://dashboard.tiltcheck.me',
      'https://api.tiltcheck.me',
      'https://tiltcheck-user-dashboard-164294266634.us-central1.run.app',
    ];

    // Allow requests with no origin (like mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.includes(origin);

    if (isAllowed) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // Allow local development origins in dev
      const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      callback(null, isLocal);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// === Auth Middleware (Shared Ecosystem) ===
function authenticateToken(req: DashboardRequest, res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie;
  
  verifySessionCookie(cookieHeader, jwtConfig)
    .then(async (result) => {
      if (result.valid && result.session && result.session.discordId) {
        const user = await findUserByDiscordId(result.session.discordId);
        req.user = {
            discordId: result.session.discordId,
            username: result.session.discordUsername || 'Unknown',
            avatar: user?.discord_avatar || null
        };
        next();
      } else {
        // Log cause of rejection for debugging
        console.warn('[Auth] Session invalid or missing:', result.error);
        res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
      }
    })
    .catch(err => {
      console.error('[Auth] Middleware error:', err);
      res.status(500).json({ error: 'Internal auth error' });
    });
}

// === API Routes ===
app.get('/api/auth/me', authenticateToken, (req: DashboardRequest, res) => {
  res.json(req.user);
});

app.get('/api/config/public', (_req, res) => {
  const clientId = getPublicDiscordClientId();
  res.json({
    client_id: clientId,
    clientId,
  });
});


// === Auth Routes (Redirect to Central Login) ===
app.get('/auth/discord', async (req, res) => {
  const redirectBase = isProd ? 'https://api.tiltcheck.me' : 'http://localhost:3000';
  const requestedRedirect = typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '';
  const targetPath = isAllowedHubRedirect(requestedRedirect) ? requestedRedirect : '/dashboard';
  const targetUrl = targetPath.startsWith('http') ? targetPath : `${HUB_BASE_URL}${targetPath}`;

  try {
    const result = await verifySessionCookie(req.headers.cookie, jwtConfig);
    if (result.valid && result.session?.discordId) {
      res.redirect(targetPath);
      return;
    }
  } catch (error) {
    console.warn('[Auth] Existing dashboard session check failed:', error);
  }

  res.redirect(`${redirectBase}/auth/discord/login?source=web&redirect=${encodeURIComponent(targetUrl)}`);
});

// For compatibility with any direct callbacks that might still hit this app
app.get('/auth/discord/callback', (req, res) => {
  res.redirect('/dashboard');
});

// === Types ===
interface UserData {
  discordId: string;
  username: string;
  avatar: string;
  trustScore: number;
  tiltLevel: number;
  analytics?: {
    totalJuice: number;
    totalTipsCaught: number;
    eventCount: number;
    wagered: number;
    deposited: number;
    profit: number;
    redeemWins: number;
    totalRedeemed: number;
  };
  degenIdentity?: DegenIdentity | null;
  nftIdentity?: NftIdentityStatus;
  recentActivity: ActivityItem[];
  preferences: UserPreferences;
}

interface ActivityItem {
  type: string;
  description: string;
  timestamp: number;
}

interface UserPreferences {
  notifyBonus: boolean;
  notifyJuice: boolean;

  anonTipping: boolean;
  showAnalytics: boolean;
  baseCurrency: string;
}

interface RtpDriftEvent {
  casino: string;
  game: string;
  drift: number;
  detectedMinsAgo: number;
}

interface NftIdentityStatus {
  optedIn: boolean;
  walletLinked: boolean;
  walletType: 'external' | 'magic' | 'none';
  tosAccepted: boolean;
  minted: boolean;
  paid: boolean;
  ready: boolean;
  notificationPending: boolean;
  notifiedAt: string | null;
  status: string;
  detail: string;
}

function getIdentityMetadata(identity: DegenIdentity | null): Record<string, unknown> {
  return identity?.identity_metadata && typeof identity.identity_metadata === 'object'
    ? identity.identity_metadata
    : {};
}

function getStatsDataDir(): string {
  return process.env.STATS_DATA_DIR || resolve(process.cwd(), 'data');
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getRtpDriftSnapshot() {
  const filePath = join(getStatsDataDir(), 'rtp-drift-events.json');
  const events = await readJsonFile<RtpDriftEvent[]>(filePath, []);
  const validEvents = events.filter((event) =>
    typeof event?.drift === 'number' &&
    Number.isFinite(event.drift) &&
    typeof event?.detectedMinsAgo === 'number' &&
    Number.isFinite(event.detectedMinsAgo)
  );

  const drift = validEvents.length > 0
    ? validEvents.reduce((lowest, event) => Math.min(lowest, event.drift), 0)
    : 0;

  const freshestDetectedMinsAgo = validEvents.length > 0
    ? validEvents.reduce((freshest, event) => Math.min(freshest, event.detectedMinsAgo), validEvents[0].detectedMinsAgo)
    : null;

  return {
    drift,
    source: {
      type: 'file' as const,
      path: filePath,
      eventCount: validEvents.length,
      freshestDetectedMinsAgo,
    },
  };
}

function getPublicDiscordClientId(): string {
  return process.env.TILT_DISCORD_CLIENT_ID?.trim()
    || process.env.DISCORD_CLIENT_ID?.trim()
    || DEFAULT_DISCORD_CLIENT_ID;
}

function getNftIdentityStatus(
  onboarding: UserOnboarding | null,
  identity: DegenIdentity | null
): NftIdentityStatus {
  const optedIn = onboarding?.notify_nft_identity_ready === true;
  const walletType = identity?.primary_external_address
    ? 'external'
    : identity?.magic_address
      ? 'magic'
      : 'none';
  const walletLinked = walletType !== 'none';
  const tosAccepted = identity?.tos_accepted === true;
  const minted = identity?.tos_nft_minted === true;
  const paid = identity?.tos_nft_paid === true;
  const metadata = getIdentityMetadata(identity);
  const notifiedAt = typeof metadata.nft_identity_ready_notified_at === 'string'
    ? metadata.nft_identity_ready_notified_at
    : null;
  const ready = optedIn && tosAccepted && walletLinked && !minted && !paid;
  const notificationPending = ready && !notifiedAt;

  if (!optedIn) {
    return {
      optedIn,
      walletLinked,
      walletType,
      tosAccepted,
      minted,
      paid,
      ready,
      notificationPending,
      notifiedAt,
      status: 'Notice off',
      detail: 'Opt in during onboarding if you want first-wave NFT identity notice.',
    };
  }

  if (!tosAccepted) {
    return {
      optedIn,
      walletLinked,
      walletType,
      tosAccepted,
      minted,
      paid,
      ready,
      notificationPending,
      notifiedAt,
      status: 'Terms missing',
      detail: 'Accept the terms first so the identity flow has a real owner attached.',
    };
  }

  if (!walletLinked) {
    return {
      optedIn,
      walletLinked,
      walletType,
      tosAccepted,
      minted,
      paid,
      ready,
      notificationPending,
      notifiedAt,
      status: 'Wallet missing',
      detail: 'Link a wallet and you are first in line when the identity fingerprint opens.',
    };
  }

  if (minted || paid) {
    return {
      optedIn,
      walletLinked,
      walletType,
      tosAccepted,
      minted,
      paid,
      ready,
      notificationPending,
      notifiedAt,
      status: 'Already live',
      detail: 'Your identity NFT work is already recorded. No extra ping needed.',
    };
  }

  return {
    optedIn,
    walletLinked,
    walletType,
    tosAccepted,
    minted,
    paid,
    ready,
    notificationPending,
    notifiedAt,
    status: notifiedAt ? 'Ready' : 'Ready for notice',
    detail: notifiedAt
      ? 'You already got the heads-up. When the mint opens, you are in the first wave.'
      : 'Terms are signed and a wallet is linked. You are lined up for first-wave NFT identity notice.',
  };
}

async function sendDiscordDirectMessage(discordId: string, content: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn('[NFT Identity] DISCORD_BOT_TOKEN not set - DM notification skipped');
    return false;
  }

  try {
    const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: discordId }),
    });

    if (!dmChannelResponse.ok) {
      console.warn('[NFT Identity] Failed to open DM channel:', dmChannelResponse.status);
      return false;
    }

    const dmChannel = await dmChannelResponse.json() as { id?: string };
    if (!dmChannel.id) {
      console.warn('[NFT Identity] Discord did not return a DM channel ID');
      return false;
    }

    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!messageResponse.ok) {
      console.warn('[NFT Identity] Failed to send DM notification:', messageResponse.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[NFT Identity] DM notification failed:', error);
    return false;
  }
}

async function notifyNftIdentityReady(
  discordId: string,
  username: string,
  onboarding: UserOnboarding | null,
  identity: DegenIdentity | null
): Promise<NftIdentityStatus> {
  const status = getNftIdentityStatus(onboarding, identity);
  if (!status.notificationPending || !db.isConnected() || !identity) {
    return status;
  }

  const message = [
    `${username || 'Degen'}, your TiltCheck NFT identity fingerprint waitlist is ready.`,
    '',
    'You already handled the hard part: terms accepted and wallet linked.',
    'When the identity mint opens, you are first-wave ready.',
    '',
    'Hub: https://hub.tiltcheck.me/dashboard',
    '',
    'Made for Degens. By Degens.',
  ].join('\n');

  const dashboardDelivered = broadcastToUser(discordId, {
    type: 'identity.nft_ready',
    data: { message },
  });
  const dmDelivered = await sendDiscordDirectMessage(discordId, message);

  if (!dashboardDelivered && !dmDelivered) {
    return status;
  }

  const notifiedAt = new Date().toISOString();
  const updatedIdentity = await db.upsertDegenIdentity({
    discord_id: discordId,
    identity_metadata: {
      ...getIdentityMetadata(identity),
      nft_identity_ready_notified_at: notifiedAt,
    },
  });

  return getNftIdentityStatus(onboarding, updatedIdentity ?? identity);
}

// === Data Fetching ===
async function getUserData(discordId: string): Promise<UserData | null> {
  try {
    const [user, onboarding, dbIdentity, trustSummary, tipSummary] = await Promise.all([
      findUserByDiscordId(discordId),
      findOnboardingByDiscordId(discordId),
      db.isConnected() ? db.getDegenIdentity(discordId) : null,
      db.isConnected() ? getAggregatedTrustByDiscordId(discordId).catch(() => null) : null,
      db.isConnected()
        ? queryOne<{ total_caught: string | number | null }>(
            `SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN amount::numeric ELSE 0 END), 0) AS total_caught
             FROM tips
             WHERE recipient_discord_id = $1`,
            [discordId]
          ).catch(() => null)
        : null
    ]);

    if (!user) return null;

    const totalRedeemed = Number(user.total_redeemed || 0);
    const totalTipsCaught = Number(tipSummary?.total_caught || 0);
    const eventCount = trustSummary?.signals_count || 0;

    return {
      discordId: user.discord_id!,
      username: user.discord_username || 'Unknown',
      avatar: user.discord_avatar || '',
      trustScore: dbIdentity?.trust_score ?? trustSummary?.total_score ?? 75,
      tiltLevel: 0,
      analytics: {
        totalJuice: totalRedeemed,
        totalTipsCaught,
        eventCount,
        wagered: 0,
        deposited: 0,
        profit: 0,
        redeemWins: user!.redeem_wins || 0,
        totalRedeemed
      },
      degenIdentity: dbIdentity,
      nftIdentity: getNftIdentityStatus(onboarding, dbIdentity),
      recentActivity: [],
      preferences: {
        notifyBonus: onboarding?.notifications_promos || true,
        notifyJuice: onboarding?.notifications_tips || true,
        anonTipping: false,
        showAnalytics: true,
        baseCurrency: 'SOL'
      }
    };
  } catch (err) {
    console.error('[Dashboard Server] Fetch user data error:', err);
    return null;
  }
}


// Authentication and onboarding routes are now unified via central app.

// Onboarding route
app.get('/onboarding', async (req, res) => {
  try {
    const result = await verifySessionCookie(req.headers.cookie, jwtConfig);
    if (!result.valid || !result.session?.discordId) {
      res.redirect(`/auth/discord?redirect=${encodeURIComponent('/onboarding')}`);
      return;
    }
  } catch (error) {
    console.warn('[Onboarding] Session verification failed:', error);
    res.redirect(`/auth/discord?redirect=${encodeURIComponent('/onboarding')}`);
    return;
  }

  res.sendFile(join(__dirname, '../public/onboard.html'));
});

app.get('/api/user/onboard', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = req.user!.discordId;
    const onboarding = await findOnboardingByDiscordId(discordId);

    res.json({
      success: true,
      onboarding: {
        riskLevel: onboarding?.risk_level || 'moderate',
        cooldownEnabled: onboarding?.cooldown_enabled ?? true,
        voiceInterventionEnabled: onboarding?.voice_intervention_enabled ?? false,
        redeemThreshold: onboarding?.redeem_threshold ?? 500,
        notifications: {
          tips: onboarding?.notifications_tips ?? true,
          trivia: onboarding?.notifications_trivia ?? true,
          promos: onboarding?.notifications_promos ?? false,
        },
        trustEngineOptIn: {
          message_contents: onboarding?.share_message_contents ?? false,
          financial_data: onboarding?.share_financial_data ?? false,
          session_telemetry: onboarding?.share_session_telemetry ?? false,
          notify_nft_identity_ready: onboarding?.notify_nft_identity_ready ?? false,
        },
      },
    });
  } catch (error) {
    console.error('[API] Load onboarding state error:', error);
    res.status(500).json({ error: 'Failed to load onboarding state' });
  }
});

app.get('/api/user/:discordId', authenticateToken, async (req: DashboardRequest, res) => {
  const discordId = requireAuthorizedDiscordId(req, res);
  if (!discordId) return;

  const data = await getUserData(discordId);
  if (!data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

app.post('/api/user/onboard', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const {
      primary_external_address,
      tos_accepted,
      risk_level,
      cooldown_enabled,
      voice_intervention_enabled,
      redeem_threshold,
      notifications,
      trust_engine_opt_in
    } = req.body;
    const discordId = req.user!.discordId;
    const normalizedRiskLevel = risk_level === 'conservative' || risk_level === 'moderate' || risk_level === 'degen'
      ? risk_level
      : 'moderate';
    const normalizedRedeemThreshold = typeof redeem_threshold === 'number' && Number.isFinite(redeem_threshold) && redeem_threshold > 0
      ? redeem_threshold
      : 500;
    const normalizedNotifications = typeof notifications === 'object' && notifications
      ? notifications as {
          tips?: boolean;
          trivia?: boolean;
          promos?: boolean;
        }
      : {};
    const trustEngineOptIn = typeof trust_engine_opt_in === 'object' && trust_engine_opt_in
      ? trust_engine_opt_in as {
          message_contents?: boolean;
          financial_data?: boolean;
          session_telemetry?: boolean;
          notify_nft_identity_ready?: boolean;
        }
      : {};
    const existingIdentity = db.isConnected()
      ? await db.getDegenIdentity(discordId).catch(() => null)
      : null;
    const normalizedPrimaryExternalAddress = typeof primary_external_address === 'string' && primary_external_address.trim().length > 0
      ? primary_external_address.trim()
      : existingIdentity?.primary_external_address || null;

    if (!tos_accepted) {
      return res.status(400).json({ error: 'You must accept the ToS to proceed' });
    }

    const updatedIdentity = await db.upsertDegenIdentity({
      discord_id: discordId,
      primary_external_address: normalizedPrimaryExternalAddress,
      tos_accepted: true,
      updated_at: new Date().toISOString()
    });

    if (!updatedIdentity) {
      return res.status(500).json({ error: 'Failed to update identity' });
    }

    await upsertOnboarding({
      discord_id: discordId,
      is_onboarded: true,
      has_accepted_terms: true,
      risk_level: normalizedRiskLevel,
      cooldown_enabled: typeof cooldown_enabled === 'boolean' ? cooldown_enabled : normalizedRiskLevel !== 'degen',
      voice_intervention_enabled: voice_intervention_enabled === true,
      share_message_contents: trustEngineOptIn.message_contents === true,
      share_financial_data: trustEngineOptIn.financial_data === true,
      share_session_telemetry: trustEngineOptIn.session_telemetry === true,
      notify_nft_identity_ready: trustEngineOptIn.notify_nft_identity_ready === true,
      notifications_tips: normalizedNotifications.tips !== false,
      notifications_trivia: normalizedNotifications.trivia !== false,
      notifications_promos: normalizedNotifications.promos === true,
      redeem_threshold: normalizedRedeemThreshold,
      tutorial_completed: true,
    });

    const savedOnboarding = await findOnboardingByDiscordId(discordId);
    const nftIdentity = await notifyNftIdentityReady(
      discordId,
      req.user!.username,
      savedOnboarding,
      updatedIdentity
    );

    res.json({ success: true, identity: updatedIdentity, nftIdentity });
  } catch (err) {
    const error = err as Error;
    console.error('[API] Onboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

function isAllowedHubRedirect(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('/')) return true;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isHubHost = parsed.protocol === 'https:' && (host === 'hub.tiltcheck.me' || host === 'tiltcheck.me' || host.endsWith('.tiltcheck.me'));
    const isLocalHost = !isProd && parsed.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1');
    return isHubHost || isLocalHost;
  } catch {
    return false;
  }
}

app.get('/api/user/:discordId/trust', authenticateToken, trustLimiter, async (req: DashboardRequest, res) => {
  const discordId = requireAuthorizedDiscordId(req, res);
  if (!discordId) return;

  const data = await getUserData(discordId);
  if (!data) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    trustScore: data.trustScore,
    tiltLevel: data.tiltLevel,
    factors: { consistency: 85, community: 70 }
  });
});

app.get('/api/user/:discordId/activity', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const activities: { type: string; description: string; timestamp: number }[] = [];

    if (db.isConnected()) {
      // Fetch recent trust signals
      const signals = await db.getRecentTrustSignals(discordId, 20).catch(() => []);
      for (const s of signals) {
        activities.push({
          type: s.signal_type || 'event',
          description: s.metadata?.description || `Trust signal: ${s.signal_type}`,
          timestamp: new Date(s.created_at).getTime()
        });
      }
    }

    // Sort newest first
    activities.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ activities: activities.slice(0, 20) });
  } catch (err) {
    console.error('[Activity]', err);
    res.json({ activities: [] });
  }
});

app.put('/api/user/:discordId/preferences', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const { notifyBonus, notifyJuice, showAnalytics, baseCurrency, riskLevel } = req.body;

    if (typeof upsertOnboarding === 'function') {
      await upsertOnboarding({
        discord_id: discordId,
        notifications_promos: notifyBonus,
        notifications_tips: notifyJuice,
        risk_level: riskLevel
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Preferences]', err);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

app.post('/api/auth/wallet/link', authenticateToken, async (req: DashboardRequest, res) => {
  const { address } = req.body;
  if (typeof address !== 'string' || !address.trim()) {
    res.status(400).json({ error: 'Wallet address is required' });
    return;
  }

  try {
    new PublicKey(address.trim());
  } catch {
    res.status(400).json({ error: 'Invalid Solana wallet address' });
    return;
  }

  let updatedIdentity: DegenIdentity | null = null;
  if (db.isConnected()) {
    updatedIdentity = await db.upsertDegenIdentity({
      discord_id: req.user!.discordId,
      primary_external_address: address.trim()
    });
  }
  const onboarding = await findOnboardingByDiscordId(req.user!.discordId);
  const nftIdentity = await notifyNftIdentityReady(
    req.user!.discordId,
    req.user!.username,
    onboarding,
    updatedIdentity
  );
  res.json({ success: true, nftIdentity });
});

app.post('/api/auth/magic/link', authenticateToken, async (req: DashboardRequest, res) => {
  const { didToken } = req.body;
  const metadata = await magicAdmin.users.getMetadataByToken(didToken);
  let updatedIdentity: DegenIdentity | null = null;
  if (db.isConnected()) {
    updatedIdentity = await db.upsertDegenIdentity({
      discord_id: req.user!.discordId,
      magic_address: metadata.publicAddress
    });
  }
  const onboarding = await findOnboardingByDiscordId(req.user!.discordId);
  const nftIdentity = await notifyNftIdentityReady(
    req.user!.discordId,
    req.user!.username,
    onboarding,
    updatedIdentity
  );
  res.json({ success: true, address: metadata.publicAddress, nftIdentity });
});

// === AI Agent Route ===
app.post('/api/agent/query', authenticateToken, async (req: DashboardRequest, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    let finalResponse = '';
    const it = runner.runAsync({
      userId: req.user!.discordId,
      sessionId: `dashboard-session-${req.user!.discordId}`,
      newMessage: {
        role: 'user',
        parts: [{ text: query }]
      }
    });

    for await (const event of it) {
      const content = (event as AgentEvent).content;
      if (content) {
        finalResponse = stringifyContent(content);
      }
    }

    if (!finalResponse) {
      return res.status(502).json({ error: 'Agent returned no response' });
    }

    res.json({ response: finalResponse });
  } catch (err) {
    console.error('[Agent] Error:', err);
    res.status(500).json({ error: 'Agent failed to process query' });
  }
});




// === Vault Routes ===
app.get('/api/user/:discordId/vault', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    if (!db.isConnected()) {
      return res.json({ locked: false, amount: 0, history: [] });
    }

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const vaultData = await db.getVaultStatus(user.id).catch(() => null);
    const history = await db.getVaultHistory(user.id, 5).catch(() => []);

    res.json({
      locked: vaultData?.status === 'locked',
      unlockAt: vaultData?.unlock_at || null,
      amount: vaultData?.amount_sol || 0,
      history
    });
  } catch (err) {
    console.error('[Vault GET]', err);
    res.json({ locked: false, amount: 0, history: [] });
  }
});

app.post('/api/user/:discordId/vault/lock', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const { amountSol, durationMs } = req.body;

    if (!amountSol || amountSol <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!durationMs || durationMs < 3600000) return res.status(400).json({ error: 'Minimum lock duration is 1 hour' });

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const unlockAt = new Date(Date.now() + durationMs).toISOString();

    if (db.isConnected()) {
      await db.createVaultLock({ userId: user.id, amountSol, unlockAt });
    }

    broadcastToUser(discordId, { type: 'vault.locked', data: { amountSol, unlockAt } });
    res.json({ success: true, unlockAt });
  } catch (err) {
    console.error('[Vault LOCK]', err);
    res.status(500).json({ error: 'Vault lock failed' });
  }
});

app.post('/api/user/:discordId/vault/unlock', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (db.isConnected()) {
      await db.requestVaultUnlock(user.id);
    }

    broadcastToUser(discordId, { type: 'vault.unlock_requested' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Vault UNLOCK]', err);
    res.status(500).json({ error: 'Unlock request failed' });
  }
});

// === Bonus Routes ===
app.get('/api/user/:discordId/bonuses', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    if (!db.isConnected()) {
      return res.json({ active: [], history: [], nerfs: [] });
    }

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const active = await db.getActiveBonuses(user.id).catch(() => []);
    const history = await db.getBonusHistory(user.id, 10).catch(() => []);
    const nerfs = await db.getRecentNerfs(5).catch(() => []);

    res.json({ active, history, nerfs });
  } catch (err) {
    console.error('[Bonuses]', err);
    res.json({ active: [], history: [], nerfs: [] });
  }
});

app.post('/api/bonus/:discordId/claim', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const { bonusId } = req.body;
    if (!bonusId) return res.status(400).json({ error: 'Missing bonusId' });

    if (db.isConnected()) {
      await db.claimBonus(discordId, bonusId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Bonus Claim]', err);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// === Session History ===
app.get('/api/user/:discordId/sessions', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const rtpSnapshot = await getRtpDriftSnapshot();

    if (!db.isConnected()) {
      return res.json({
        sessions: [],
        stats: {
          weeklyPL: 0,
          winRate: 0,
          avgSession: 0,
          rtpDrift: rtpSnapshot.drift,
          rtpSource: rtpSnapshot.source,
        }
      });
    }

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sessions = await db.getUserSessions(user.id, 7).catch(() => []);

    const totalPL = sessions.reduce((sum: number, s: { net_pl?: number }) => sum + (s.net_pl || 0), 0);
    const wins = sessions.filter((s: { net_pl?: number }) => (s.net_pl || 0) > 0).length;
    const winRate = sessions.length > 0 ? Math.round((wins / sessions.length) * 100) : 0;
    const avgSession = sessions.length > 0
      ? Math.round(sessions.reduce((sum: number, s: { duration_ms?: number }) => sum + (s.duration_ms || 0), 0) / sessions.length / 60000)
      : 0;

    res.json({
      sessions,
      stats: {
        weeklyPL: totalPL,
        winRate,
        avgSession,
        rtpDrift: rtpSnapshot.drift,
        rtpSource: rtpSnapshot.source,
      }
    });
  } catch (err) {
    console.error('[Sessions]', err);
    const rtpSnapshot = await getRtpDriftSnapshot();
    res.json({
      sessions: [],
      stats: {
        weeklyPL: 0,
        winRate: 0,
        avgSession: 0,
        rtpDrift: rtpSnapshot.drift,
        rtpSource: rtpSnapshot.source,
      }
    });
  }
});

// === Buddy Routes ===
app.get('/api/user/:discordId/buddies', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [buddies, pending] = await Promise.all([
      getUserBuddies(user.id).catch(() => []),
      getPendingBuddyRequests(user.id).catch(() => [])
    ]);

    res.json({ buddies, pending });
  } catch (err) {
    console.error('[Buddies GET]', err);
    res.json({ buddies: [], pending: [] });
  }
});

app.post('/api/user/:discordId/buddies', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const { buddyId } = req.body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await sendBuddyRequest(user.id, buddyId);
    res.json({ success: true });
  } catch (err) {
    console.error('[Buddy Invite]', err);
    res.status(500).json({ error: 'Failed to send buddy request' });
  }
});

app.post('/api/user/:discordId/buddies/:requestId/accept', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pending = await getPendingBuddyRequests(user.id).catch(() => []);
    const request = pending.find((entry) => entry.id === req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Buddy request not found' });

    if (db.isConnected()) {
      await db.acceptBuddyRequest(req.params.requestId as string);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

app.post('/api/user/:discordId/buddies/:requestId/decline', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = requireAuthorizedDiscordId(req, res);
    if (!discordId) return;

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pending = await getPendingBuddyRequests(user.id).catch(() => []);
    const request = pending.find((entry) => entry.id === req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Buddy request not found' });

    if (db.isConnected()) {
      await db.declineBuddyRequest(req.params.requestId as string);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// === Premium page + crypto payment claim ===
app.get('/premium', (_req, res) => res.sendFile(join(__dirname, '../public/premium.html')));

app.post('/api/payments/claim-crypto', paymentClaimLimiter, async (req, res) => {
  const { discordUsername, txHash, tier, amount } = req.body as {
    discordUsername?: string;
    txHash?: string;
    tier?: string;
    amount?: string | number;
  };

  if (!discordUsername || !txHash || !tier || !amount) {
    res.status(400).json({ error: 'All fields required: discordUsername, txHash, tier, amount' });
    return;
  }

  const MOD_LOG_CHANNEL_ID = '1488256044349128974';
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (botToken) {
    try {
      const embed = {
        title: 'CRYPTO PAYMENT CLAIM',
        color: 0x22d3a6,
        fields: [
          { name: 'Discord Username', value: String(discordUsername), inline: true },
          { name: 'Tier', value: String(tier), inline: true },
          { name: 'Amount Sent', value: String(amount) + ' SOL', inline: true },
          { name: 'Tx Hash', value: String(txHash), inline: false },
        ],
        footer: { text: 'Manual role grant required - verify on-chain before granting' },
        timestamp: new Date().toISOString(),
      };

      await fetch(`https://discord.com/api/v10/channels/${MOD_LOG_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (err) {
      console.error('[Payments] Failed to notify MOD_LOG:', err);
    }
  } else {
    console.warn('[Payments] DISCORD_BOT_TOKEN not set - MOD_LOG notification skipped');
  }

  res.json({
    success: true,
    message: "Claim received. We'll verify and grant your role within 24 hours.",
  });
});

// === Preview page (no auth) ===
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/preview', (_req, res) => {
  res.sendFile(join(__dirname, '../public/preview.html'));
});

app.get('/onboard.html', (_req, res) => {
  res.sendFile(join(__dirname, '../public/onboard.html'));
});

app.get('/dashboard', authenticateToken, async (req: DashboardRequest, res) => {
  const discordId = req.user!.discordId;
  if (db.isConnected()) {
    try {
      const identity = await db.getDegenIdentity(discordId);
      if (!identity || !identity.tos_accepted) return res.redirect('/onboard.html');
    } catch (err) { console.warn('Onboarding check error:', err); }
  }
  res.sendFile(join(__dirname, '../public/index.html'));
});

// ============================================================
// WEBSOCKET SERVER - real-time push to dashboard clients
// ============================================================
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

const userConnections = new Map<string, Set<WebSocket>>();

wss.on('connection', async (socket: WebSocket, request) => {
  let connectedDiscordId: string | null = null;

  try {
    const result = await verifySessionCookie(request.headers.cookie, jwtConfig);
    if (!result.valid || !result.session?.discordId) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    connectedDiscordId = result.session.discordId;
    if (!userConnections.has(connectedDiscordId)) {
      userConnections.set(connectedDiscordId, new Set());
    }
    userConnections.get(connectedDiscordId)!.add(socket);
  } catch (error) {
    console.warn('[WebSocket] Session verification failed:', error);
    socket.close(1008, 'Unauthorized');
    return;
  }

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth' && typeof msg.discordId === 'string' && msg.discordId !== connectedDiscordId) {
        socket.close(1008, 'Forbidden');
      }
    } catch (_) { /* ignore malformed messages */ }
  });

  socket.on('close', () => {
    if (connectedDiscordId) {
      const sockets = userConnections.get(connectedDiscordId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) userConnections.delete(connectedDiscordId);
      }
    }
  });
});

function broadcastToUser(discordId: string, payload: object): boolean {
  const sockets = userConnections.get(discordId);
  if (!sockets || sockets.size === 0) return false;
  const data = JSON.stringify(payload);
  let delivered = false;
  sockets.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
      delivered = true;
    }
  });
  return delivered;
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  httpServer.listen(PORT, () => {
    console.log(`[Dashboard] Listening on port ${PORT}`);
    console.log(`[Dashboard] Discord OAuth configured for: ${DISCORD_CALLBACK_URL}`);
  });
}

export { app, broadcastToUser };
