// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { 
  verifySessionCookie, 
  type JWTConfig,
} from '@tiltcheck/auth';
import rateLimit from 'express-rate-limit';
import { Magic } from '@magic-sdk/admin';
import { Connection } from '@solana/web3.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import type { Request, Response, NextFunction } from 'express';

interface DashboardRequest extends Request {
  user?: {
    discordId: string;
    username: string;
    avatar: string | null;
  };
}
import { db, DegenIdentity } from '@tiltcheck/database';
import { findUserByDiscordId, findOnboardingByDiscordId, upsertOnboarding, getUserBuddies, getPendingBuddyRequests, sendBuddyRequest } from '@tiltcheck/db';
import { getVaultStatus, lockVault, unlockVault } from '@tiltcheck/lockvault';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.USER_DASHBOARD_PORT || 6001;
const DISCORD_CALLBACK_URL = process.env.TILT_DISCORD_REDIRECT_URI || 'https://api.tiltcheck.me/auth/discord/callback';

// Configuration
const isProd = process.env.NODE_ENV === 'production';
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


// === Auth Routes (Redirect to Central Login) ===
app.get('/auth/discord', (req, res) => {
  const redirectBase = isProd ? 'https://api.tiltcheck.me' : 'http://localhost:3000';
  const myUrl = isProd ? 'https://hub.tiltcheck.me/dashboard' : `http://localhost:${PORT}/dashboard`;
  res.redirect(`${redirectBase}/auth/discord/login?source=web&redirect=${encodeURIComponent(myUrl)}`);
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

// === Data Fetching ===
async function getUserData(discordId: string): Promise<UserData | null> {
  try {
    const [user, onboarding, dbIdentity] = await Promise.all([
      findUserByDiscordId(discordId),
      findOnboardingByDiscordId(discordId),
      db.isConnected() ? db.getDegenIdentity(discordId) : null
    ]);

    if (!user) return null;

    return {
      discordId: user.discord_id!,
      username: user.discord_username || 'Unknown',
      avatar: user.discord_avatar ?? '',
      trustScore: dbIdentity?.trust_score ?? 75,
      tiltLevel: 0,
      analytics: {
        totalJuice: 0, 
        totalTipsCaught: 0,
        eventCount: 42,
        wagered: 0,
        deposited: 0,
        profit: 0,
        redeemWins: user!.redeem_wins || 0,
        totalRedeemed: user!.total_redeemed || 0
      },
      degenIdentity: dbIdentity,
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
app.get('/onboarding', (_req, res) => {
  res.sendFile(join(__dirname, '../public/onboarding.html'));
});

app.get('/api/user/:discordId', authenticateToken, async (req: DashboardRequest, res) => {
  const data = await getUserData(req.params.discordId as string);
  if (!data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

app.post('/api/user/onboard', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const { primary_external_address, tos_accepted } = req.body;
    const discordId = req.user!.discordId;

    if (!tos_accepted) {
      return res.status(400).json({ error: 'You must accept the ToS to proceed' });
    }

    const updatedIdentity = await db.upsertDegenIdentity({
      discord_id: discordId,
      primary_external_address: primary_external_address || null,
      tos_accepted: true,
      updated_at: new Date().toISOString()
    });

    if (!updatedIdentity) {
      return res.status(500).json({ error: 'Failed to update identity' });
    }

    res.json({ success: true, identity: updatedIdentity });
  } catch (err) {
    const error = err as Error;
    console.error('[API] Onboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/:discordId/trust', authenticateToken, trustLimiter, async (req: DashboardRequest, res) => {
  const data = await getUserData(req.params.discordId as string);
  if (!data) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    trustScore: data.trustScore,
    tiltLevel: data.tiltLevel,
    factors: { consistency: 85, community: 70 }
  });
});

app.get('/api/user/:discordId/activity', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const activities: { type: string; description: string; timestamp: number }[] = [];

    // Trust signals not yet implemented in DatabaseClient; activity list stays empty

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
    const discordId = req.params.discordId as string;
    const { notifyBonus, notifyJuice, showAnalytics: _showAnalytics, baseCurrency: _baseCurrency, riskLevel } = req.body;

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
  // Verify signature and save to DB
  if (db.isConnected()) {
    await db.upsertDegenIdentity({
      discord_id: req.user!.discordId,
      primary_external_address: address
    });
  }
  res.json({ success: true });
});

app.post('/api/auth/magic/link', authenticateToken, async (req: DashboardRequest, res) => {
  const { didToken } = req.body;
  const metadata = await magicAdmin.users.getMetadataByToken(didToken);
  if (db.isConnected()) {
    await db.upsertDegenIdentity({
      discord_id: req.user!.discordId,
      magic_address: metadata.publicAddress
    });
  }
  res.json({ success: true, address: metadata.publicAddress });
});

// === AI Agent Route ===
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runner: any = null; // TODO: Initialize with Google ADK runner when available
app.post('/api/agent/query', authenticateToken, async (req: DashboardRequest, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  if (!runner) {
    return res.status(501).json({ error: 'AI agent not yet initialized' });
  }

  try {
    let finalResponse = '';
    const it = runner.runAsync({
      userId: req.user!.discordId,
      sessionId: 'dashboard-session',
      newMessage: {
        role: 'user',
        parts: [{ text: query }]
      }
    });

    for await (const event of it) {
      finalResponse = stringifyContent(event);
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
    const discordId = req.params.discordId as string;
    if (!db.isConnected()) {
      return res.json({ locked: false, amount: 0, history: [] });
    }

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const nowTs = Date.now();
    const vaults = getVaultStatus(discordId);
    const locked = vaults.some((v) => (v.status === 'locked' || v.status === 'extended') && v.unlockAt > nowTs);
    const amount = vaults.reduce((sum, v) => sum + (v.lockedAmountSOL || 0), 0);
    const history = vaults
      .flatMap((v) => v.history.map((h) => ({ ...h, vaultId: v.id })))
      .sort((a, b) => b.ts - a.ts);

    res.json({ locked, amount, history });
  } catch (err) {
    console.error('[Vault GET]', err);
    res.json({ locked: false, amount: 0, history: [] });
  }
});

app.post('/api/user/:discordId/vault/lock', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = req.params.discordId as string;
    const { amountSol, durationMs } = req.body;

    if (!amountSol || amountSol <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!durationMs || durationMs < 3600000) return res.status(400).json({ error: 'Minimum lock duration is 1 hour' });

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const durationMinutes = Math.max(1, Math.trunc(Number(durationMs) / 60000));
    const vault = await lockVault({
      userId: discordId,
      amountRaw: `${Number(amountSol)} SOL`,
      durationRaw: `${durationMinutes}m`,
      reason: 'Dashboard lock',
      currencyHint: 'SOL',
      disclaimerAccepted: true,
    });
    const unlockAt = new Date(vault.unlockAt).toISOString();
    broadcastToUser(discordId, { type: 'vault.locked', data: { amountSol, unlockAt } });
    res.json({ success: true, unlockAt, vault });
  } catch (err) {
    console.error('[Vault LOCK]', err);
    res.status(400).json({ error: 'Vault lock failed' });
  }
});

app.post('/api/user/:discordId/vault/unlock', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = req.params.discordId as string;
    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const nowTs = Date.now();
    const vaults = getVaultStatus(discordId);
    const releasable = vaults.find((v) => (v.status === 'locked' || v.status === 'extended') && nowTs >= v.unlockAt);
    const alreadyUnlocked = vaults.find((v) => v.status === 'unlocked');

    if (!releasable && !alreadyUnlocked) {
      return res.status(400).json({ error: 'No vaults ready for release' });
    }

    const vault = releasable ? unlockVault(discordId, releasable.id) : alreadyUnlocked!;
    broadcastToUser(discordId, { type: 'vault.unlock_requested' });
    res.json({ success: true, vault });
  } catch (err) {
    console.error('[Vault UNLOCK]', err);
    res.status(400).json({ error: 'Unlock request failed' });
  }
});

// === Bonus Routes ===
app.get('/api/user/:discordId/bonuses', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = req.params.discordId as string;
    if (!db.isConnected()) {
      return res.json({ active: [], history: [], nerfs: [] });
    }

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // getActiveBonuses/getBonusHistory/getRecentNerfs not yet implemented in DatabaseClient
    res.json({ active: [], history: [], nerfs: [] });
  } catch (err) {
    console.error('[Bonuses]', err);
    res.json({ active: [], history: [], nerfs: [] });
  }
});

app.post('/api/bonus/:discordId/claim', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const { bonusId } = req.body;
    if (!bonusId) return res.status(400).json({ error: 'Missing bonusId' });

    // claimBonus not yet implemented in DatabaseClient
    res.json({ success: true });
  } catch (err) {
    console.error('[Bonus Claim]', err);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// === Session History ===
app.get('/api/user/:discordId/sessions', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const discordId = req.params.discordId as string;
    if (!db.isConnected()) {
      return res.json({ sessions: [], stats: { weeklyPL: 0, winRate: 0, avgSession: 0, rtpDrift: 0 } });
    }

    const user = await findUserByDiscordId(discordId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // getUserSessions not yet implemented in DatabaseClient
    const sessions: { net_pl?: number; duration_ms?: number }[] = [];

    const totalPL = sessions.reduce((sum: number, s: { net_pl?: number }) => sum + (s.net_pl || 0), 0);
    const wins = sessions.filter((s: { net_pl?: number }) => (s.net_pl || 0) > 0).length;
    const winRate = sessions.length > 0 ? Math.round((wins / sessions.length) * 100) : 0;
    const avgSession = sessions.length > 0
      ? Math.round(sessions.reduce((sum: number, s: { duration_ms?: number }) => sum + (s.duration_ms || 0), 0) / sessions.length / 60000)
      : 0;

    res.json({
      sessions,
      stats: { weeklyPL: totalPL, winRate, avgSession, rtpDrift: 0 }
    });
  } catch (err) {
    console.error('[Sessions]', err);
    res.json({ sessions: [], stats: { weeklyPL: 0, winRate: 0, avgSession: 0, rtpDrift: 0 } });
  }
});

// === Buddy Routes ===
app.get('/api/user/:discordId/buddies', authenticateToken, async (req: DashboardRequest, res) => {
  try {
    const user = await findUserByDiscordId(req.params.discordId as string);
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
    const { buddyId } = req.body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const user = await findUserByDiscordId(req.params.discordId as string);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await sendBuddyRequest(user.id, buddyId);
    res.json({ success: true });
  } catch (err) {
    console.error('[Buddy Invite]', err);
    res.status(500).json({ error: 'Failed to send buddy request' });
  }
});

app.post('/api/user/:discordId/buddies/:requestId/accept', authenticateToken, async (_req: DashboardRequest, res) => {
  try {
    // acceptBuddyRequest not yet implemented in DatabaseClient
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

app.post('/api/user/:discordId/buddies/:requestId/decline', authenticateToken, async (_req: DashboardRequest, res) => {
  try {
    // declineBuddyRequest not yet implemented in DatabaseClient
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// === Preview page (no auth) ===
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

wss.on('connection', (socket: WebSocket) => {
  let connectedDiscordId: string | null = null;

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth' && typeof msg.discordId === 'string') {
        connectedDiscordId = msg.discordId;
        if (!userConnections.has(connectedDiscordId)) {
          userConnections.set(connectedDiscordId, new Set());
        }
        userConnections.get(connectedDiscordId)!.add(socket);
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

function broadcastToUser(discordId: string, payload: object): void {
  const sockets = userConnections.get(discordId);
  if (!sockets) return;
  const data = JSON.stringify(payload);
  sockets.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  });
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  httpServer.listen(PORT, () => {
    console.log(`[Dashboard] Listening on port ${PORT}`);
    console.log(`[Dashboard] Discord OAuth configured for: ${DISCORD_CALLBACK_URL}`);
  });
}

export { app, broadcastToUser };
