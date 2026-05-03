// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
// v0.1.0 — 2026-02-25
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Game Arena Server
 * Web-based multiplayer game arena with TiltCheck Discord authentication
 *
 * Uses @tiltcheck/auth for Discord session verification and shared auth context.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
let createAdapter: any; // loaded dynamically when a Redis client is available
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './config.js';
import { GameManager } from './game-manager.js';
import { statsService } from './stats-service.js';
import { db } from '@tiltcheck/database';
import { 
  getDiscordUser,
  verifySessionCookie, 
  type JWTConfig, 
  type SessionData 
} from '@tiltcheck/auth';
import type {
  DiscordUser,
  ClientToServerEvents,
  ServerToClientEvents,
  CreateGameRequest,
} from './types.js';
import { mapAuthUserToDiscordUser } from './types.js';
import { justthetip } from '@tiltcheck/justthetip';
import { eventRouter } from '@tiltcheck/event-router';
import * as promClient from 'prom-client';
import { triviaManager } from './trivia-manager.js';
import { redisClient } from './redis-client.js';
import type { TriviaCompletedEventData } from '@tiltcheck/types';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration
validateConfig();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Simple CORS middleware with whitelisting
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://tiltcheck.me',
    'https://api.tiltcheck.me',
    'https://activity.tiltcheck.me',
    'https://dev-activity.tiltcheck.me',
    'https://game.tiltcheck.me',
    'https://tiltcheck-game-arena-164294266634.us-central1.run.app',
  ];

  const origin = req.headers.origin;

  // Check if origin is allowed
  const isAllowed = origin
    ? allowedOrigins.includes(origin) ||
      (config.isDev && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')))
    : true;

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize Socket.IO with proper CORS whitelist
const socketIoCorsOrigins = [
  'https://tiltcheck.me',
  'https://api.tiltcheck.me',
  'https://activity.tiltcheck.me',
  'https://dev-activity.tiltcheck.me',
  'https://game.tiltcheck.me',
  'https://tiltcheck-game-arena-164294266634.us-central1.run.app',
];

// Add localhost in development
if (config.isDev) {
  socketIoCorsOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000');
}

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: socketIoCorsOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// If Redis is available, enable Socket.IO Redis adapter so multiple instances can share rooms and events
if (redisClient && redisClient.isAvailable()) {
  const raw = redisClient.raw();
  if (raw) {
    // Duplicate clients for pub/sub
    const pubClient = raw.duplicate();
    const subClient = raw.duplicate();
    try {
      // ioredis v5 requires explicit connect on duplicated clients
      // Attempt to connect, but don't fail startup if it errors
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      pubClient.connect?.();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      subClient.connect?.();
    } catch (e) {
      // ignore connection errors here
    }

    try {
      if (!createAdapter) {
        // Dynamically import the redis adapter only when needed to avoid dev/test failures
        // if '@socket.io/redis-adapter' is not installed in the environment.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = await import('@socket.io/redis-adapter');
        createAdapter = mod.createAdapter;
      }
      io.adapter(createAdapter(pubClient as any, subClient as any));
      console.log('[Socket.IO] Redis adapter enabled for cross-instance pub/sub');
    } catch (err) {
      console.warn('[Socket.IO] Redis adapter not available or failed to initialize:', getErrorMessage(err));
    }
  }
}

// Initialize game manager
const gameManager = new GameManager({
  stateFilePath: config.game.stateFilePath,
});
await gameManager.initialize();
await triviaManager.initialize({
  stateFilePath: config.game.triviaStateFilePath,
});

// Initialize trivia monetization
const discordToken = process.env.TILT_DISCORD_BOT_TOKEN;
const discordClientId = process.env.TILT_DISCORD_CLIENT_ID;
if (discordToken && discordClientId) {
  triviaManager.initializeShop(discordClientId, discordToken);
}

// Initialize stats service
statsService.initialize().catch(err => {
  console.error('[Server] Failed to initialize stats service:', err);
});

// Shared Auth Config
// Ensure we always have a JWT secret available in test environments to avoid import-time failures during parallel tests.
const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET === undefined ? 'test-jwt-secret' : process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}
if (!process.env.JWT_SECRET) {
  console.warn('[Server] JWT_SECRET not set; using fallback test secret (do NOT use in production)');
}

const jwtConfig: JWTConfig = {
  secret: jwtSecret,
  issuer: 'tiltcheck-api',
  audience: 'tiltcheck-apps',
  expiresIn: '24h',
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ── Director's Booth endpoints (called by control-room trivia-director.js) ────

app.get('/trivia/status', async (_req, res) => {
  const liveState = triviaManager.getLiveState();
  res.json({ activeGame: liveState || null });
});

app.post('/trivia/schedule', async (req, res) => {
  try {
    const { category, theme, totalRounds, timerMs, prizeSol } = req.body;
    const result = await triviaManager.scheduleGame({
      startTime: Date.now() + 5000,
      category: category || 'general',
      theme: theme || category || 'Random Degen Knowledge',
      totalRounds: totalRounds || 10,
      prizePool: prizeSol || 0,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/trivia/control', async (req, res) => {
  const { action } = req.body;
  try {
    if (action === 'end') {
      await triviaManager.endGame();
      io.emit('game-update', { type: 'trivia-reset' });
      res.json({ success: true, action: 'end' });
    } else if (action === 'skip') {
      // Skip triggers reveal immediately then advances
      const live = triviaManager.getLiveState();
      if (live?.currentQuestion) {
        // Force-reveal current round by publishing the event
        await eventRouter.publish('trivia.round.skip' as any, 'game-arena', { gameId: live.gameId });
      }
      res.json({ success: true, action: 'skip' });
    } else {
      res.json({ success: true, action, note: `${action} acknowledged (game-arena does not yet implement pause/resume)` });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/trivia/swap-question', async (req, res) => {
  // Placeholder — would require trivia-manager to support hot-swap
  res.json({ success: false, message: 'Question swap not yet implemented in trivia-manager' });
});

app.post('/admin/trivia/start', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { category, theme, rounds } = req.body;
    const result = await triviaManager.scheduleGame({
      startTime: Date.now() + 5000, // Start in 5 seconds
      category: category || 'general',
      theme: theme || 'Random Degen Knowledge',
      totalRounds: rounds || 12,
      prizePool: 0
    });
    if (!result.success) {
      res.status(409).json(result);
      return;
    }
    res.json({ success: true, message: 'Trivia game scheduled to start in 5s.', gameId: result.gameId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/admin/trivia/reset', requireAuth, requireAdmin, async (_req, res) => {
  await triviaManager.endGame();
  res.json({ success: true, message: 'Trivia manager reset.' });
});

// Admin: Force-end a lobby game immediately. Secured by X-Admin-Token header.
app.post('/admin/game/:gameId/force-end', requireAdmin, async (req, res) => {
  const gameId = getSingleParam(req.params.gameId);
  if (!gameId) {
    res.status(400).json({ success: false, error: 'Game ID is required.' });
    return;
  }
  try {
    await gameManager.forceEndGame(gameId);
    res.json({ success: true, message: `Game ${gameId} force-ended.` });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Admin: Replay a provided snapshot payload into memory. POST body must be the snapshot JSON.
app.post('/admin/replay-snapshot', requireAdmin, async (req, res) => {
  const snapshot = req.body;
  if (!snapshot) {
    res.status(400).json({ success: false, error: 'Snapshot JSON required in body' });
    return;
  }
  try {
    await gameManager.replaySnapshot(snapshot);
    res.json({ success: true, message: 'Snapshot replayed into memory.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Export audit/event history from the event router. Supports optional ?limit= query.
app.get('/admin/export-audit', requireAdmin, async (req, res) => {
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
  try {
    const history = eventRouter.getHistory({ limit: limit || 100 });
    res.json({ success: true, events: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Trigger a payout reconciliation workflow (best-effort). This publishes an event that downstream systems can handle.
app.post('/admin/payout-reconcile', requireAdmin, async (_req, res) => {
  try {
    await eventRouter.publish('payout.reconcile' as any, 'game-arena', { initiatedAt: Date.now() } as any);
    res.json({ success: true, message: 'Payout reconciliation requested.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Extended session type


// Authentication middleware - validates shared ecosystem session cookie
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const cookieHeader = req.headers.cookie;
  
  try {
    const result = await verifySessionCookie(cookieHeader, jwtConfig);
    if (result.valid && result.session) {
      req.user = result.session;
      return next();
    }
    
    // Fallback for API calls vs page loads
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    } else {
      res.redirect('/auth/discord');
    }
  } catch (err) {
    console.error('[Auth] requireAuth error:', err);
    res.status(500).json({ error: 'Internal auth error' });
  }
}

// Optional auth middleware - attaches user if available
async function optionalAuth(req: express.Request, _res: express.Response, next: express.NextFunction): Promise<void> {
  const cookieHeader = req.headers.cookie;
  try {
    const result = await verifySessionCookie(cookieHeader, jwtConfig);
    if (result.valid && result.session) {
      req.user = result.session;
    }
  } catch {
    console.warn('[Auth] optionalAuth check failed (non-critical)');
  }
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const configuredToken = config.admin.statusToken;
  if (!configuredToken) return next(); // Bypass if not set

  const providedToken = req.headers['x-admin-token'];
  if (typeof providedToken !== 'string' || providedToken !== configuredToken) {
    res.status(403).json({ error: 'Admin token required' });
    return;
  }
  next();
}

function normalizeTriviaCategory(input: unknown): 'general' | 'strategy' | 'gambling_math' | 'degen' | 'crypto' {
  if (typeof input !== 'string') {
    return 'general';
  }

  const normalized = input.trim().toLowerCase();
  if (
    normalized === 'strategy' ||
    normalized === 'gambling_math' ||
    normalized === 'degen' ||
    normalized === 'crypto'
  ) {
    return normalized;
  }

  return 'general';
}

function clampTriviaRoundCount(input: unknown): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return 5;
  }

  return Math.min(7, Math.max(3, Math.round(input)));
}

function normalizeTriviaTheme(input: unknown, fallbackCategory: string): string {
  if (typeof input === 'string' && input.trim()) {
    return input.trim().slice(0, 80);
  }

  switch (fallbackCategory) {
    case 'strategy':
      return 'Tilt or Skill';
    case 'degen':
      return 'Safe or Sketchy';
    case 'crypto':
      return 'Cash Out or Chase';
    default:
      return 'Rapid Trivia';
  }
}

// Socket.IO Auth Middleware
io.use(async (socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie;
  const activityAccessToken =
    typeof socket.handshake.auth?.accessToken === 'string'
      ? socket.handshake.auth.accessToken.trim()
      : '';
  try {
    const result = await verifySessionCookie(cookieHeader, jwtConfig);
    if (result.valid && result.session) {
      (socket as any).user = result.session;
      next();
      return;
    }

    if (activityAccessToken) {
      const activityUser = await getDiscordUser(activityAccessToken);
      if (activityUser.success && activityUser.user) {
        (socket as any).user = {
          userId: activityUser.user.id,
          type: 'user',
          discordId: activityUser.user.id,
          discordUsername: activityUser.user.globalName || activityUser.user.username,
          roles: [],
          createdAt: Math.floor(Date.now() / 1000),
        } satisfies SessionData;
      } else {
        console.warn('[Auth] Discord activity token rejected for socket connection');
      }
    }
    next();
  } catch {
    next(); // Allow anonymous lobby viewing
  }
});

// Routes

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// Prometheus metrics endpoint (includes trivia metrics registered on global registry)
app.get('/metrics', async (_req, res) => {
  try {
    res.setHeader('Content-Type', promClient.register.contentType);
    const body = await promClient.register.metrics();
    res.send(body);
  } catch (err: any) {
    console.error('[Metrics] Failed to collect metrics:', err);
    res.status(500).send('Failed to collect metrics');
  }
});

// Trivia snapshot health/status - reports whether a durable snapshot exists (Redis or file), size, timestamps and runtime counts
app.get('/health/trivia', async (_req, res) => {
  try {
    const persistence = await triviaManager.getPersistenceStatus();
    res.json({
      success: true,
      stateFilePath: persistence.stateFilePath,
      snapshotExists: persistence.snapshotExists,
      snapshotSizeBytes: persistence.snapshotSizeBytes,
      snapshotModifiedAt: persistence.snapshotModifiedAt,
      activeGames: persistence.activeGames,
      trackedPlayers: persistence.trackedPlayers,
      stats: persistence.stats,
      activeGameId: persistence.activeGameId,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to load trivia health' });
  }
});

async function getLaunchReadiness() {
  const persistence = await gameManager.getPersistenceStatus();
  const triviaPersistence = await triviaManager.getPersistenceStatus();
  const authReady = Boolean(config.supabase.url && config.supabase.anonKey && jwtSecret);
  const discordBridgeReady = Boolean(discordToken && discordClientId);
  const statsTrackingReady = db.isConnected();
  const persistenceReady =
    persistence.stats.persistErrorCount === 0 &&
    persistence.stats.restoreErrorCount === 0 &&
    triviaPersistence.stats.persistErrorCount === 0 &&
    triviaPersistence.stats.restoreErrorCount === 0;
  const sharedTrustIdentityReady = authReady && statsTrackingReady;
  const promoTrackingReady = discordBridgeReady && statsTrackingReady;
  const crossServerReady = authReady && discordBridgeReady && statsTrackingReady && persistenceReady;

  return {
    summary: {
      poker: 'gated',
      crossServer: crossServerReady ? 'ready' : 'partial',
      promoTracking: promoTrackingReady ? 'ready' : 'partial',
      sharedTrustIdentity: sharedTrustIdentityReady ? 'ready' : 'partial',
    },
    gates: [
      {
        key: 'shared-auth',
        label: 'Shared session auth',
        ready: authReady,
        detail: authReady
          ? 'Shared auth cookies can follow players between TiltCheck surfaces.'
          : 'Supabase auth or JWT wiring is still missing.',
      },
      {
        key: 'lobby-persistence',
        label: 'Lobby persistence',
        ready: persistenceReady,
        detail: persistenceReady
          ? 'Arena state can survive restarts without dumping the table.'
          : 'Persistence errors still need cleanup before cross-server tables are safe.',
      },
      {
        key: 'promo-tracking',
        label: 'Promo tracking bridge',
        ready: promoTrackingReady,
        detail: promoTrackingReady
          ? 'Discord/game signals can be tied back to tracked player state.'
          : 'Discord bridge credentials or stats tracking are still incomplete.',
      },
      {
        key: 'shared-trust-identity',
        label: 'Shared trust identity',
        ready: sharedTrustIdentityReady,
        detail: sharedTrustIdentityReady
          ? 'Gameplay outcomes can feed the same trust identity across the ecosystem.'
          : 'Database-backed trust identity wiring is still partial.',
      },
      {
        key: 'poker-launch',
        label: 'Poker launch',
        ready: false,
        detail: 'Poker is still gated while cross-server lobby sync and trust handoff are being finished.',
      },
    ],
    arena: {
      activeGames: gameManager.getActiveGames().map((game) => ({
        id: game.id,
        type: game.type,
        platform: game.platform,
        status: game.status,
        playerCount: game.playerCount,
      })),
      persistence,
      triviaPersistence,
      statsTrackingReady,
    },
  };
}

app.get('/api/network/readiness', async (_req, res) => {
  const readiness = await getLaunchReadiness();
  res.json({
    success: true,
    ...readiness,
  });
});

// Admin status for dashboard
app.get('/admin/status', requireAdmin, async (_req, res) => {
  const readiness = await getLaunchReadiness();
  res.json({
    status: 'ok',
    services: [
      { name: 'Game Arena', status: 'online', port: config.port },
      { name: 'Trivia Manager', status: triviaManager.isActive() ? 'active' : 'idle' },
      { name: 'Event Router', status: 'online' }
    ],
    metrics: {
      uptime: process.uptime(),
      requests: 0,
      activeGames: gameManager.getGameCount()
    },
    readiness,
  });
});

// Home page
app.get('/', optionalAuth, (req, res) => {
  if (req.user) {
    res.redirect('/arena');
  } else {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Arena (lobby) - requires auth
app.get('/arena', requireAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/arena.html'));
});

// Game room - requires auth
app.get('/game/:gameId', requireAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/game.html'));
});

// Auth routes (Unified with Ecosystem API)
app.get('/auth/discord', (req, res) => {
  const redirectBase = config.isDev ? 'http://localhost:3000' : 'https://api.tiltcheck.me';
  const myUrl = config.isDev ? `http://localhost:${config.port}/arena` : 'https://arena.tiltcheck.me/arena';
  res.redirect(`${redirectBase}/auth/discord/login?source=web&redirect=${encodeURIComponent(myUrl)}`);
});

// Compatibility callback
app.get('/auth/callback', (req, res) => {
  res.redirect('/arena');
});

// Ecosystem Logout (Clears shared cookie)
app.get('/auth/logout', (_req, res) => {
  res.clearCookie('tiltcheck_session', { domain: '.tiltcheck.me' });
  res.redirect('/');
});

// API routes

// Get current user
app.get('/api/user', optionalAuth, (req, res) => {
  if (req.user) {
    // Map to DiscordUser format for client compatibility
    const discordUser = mapAuthUserToDiscordUser(req.user);
    res.json(discordUser);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Get active games
app.get('/api/games', (_req, res) => {
  const games = gameManager.getActiveGames();
  res.json({ games });
});

// Create new game
app.post('/api/games', requireAuth, async (req, res) => {
  try {
    const { gameType, maxPlayers, isPrivate }: CreateGameRequest = req.body;
    const user = req.user!;
    const discordUser = mapAuthUserToDiscordUser(user);

    const game = await gameManager.createGame(discordUser.id, discordUser.username, gameType, {
      maxPlayers,
      isPrivate,
      platform: 'web',
    });

    res.json({ game });

    // Broadcast lobby update
    io.emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get game details
app.get('/api/games/:gameId', requireAuth, (req, res) => {
  const { gameId: gameIdParam } = req.params;
  const gameId = Array.isArray(gameIdParam) ? gameIdParam[0] : gameIdParam;
  const game = gameManager.getGame(gameId);
  
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const user = req.user!;
  const discordUser = mapAuthUserToDiscordUser(user);
  const gameState = gameManager.getGameState(gameId, discordUser.id);
  res.json({ game, gameState });
});

// Get user stats
app.get('/api/stats/:discordId', async (req, res) => {
  const { discordId: discordIdParam } = req.params;
  const discordId = Array.isArray(discordIdParam) ? discordIdParam[0] : discordIdParam;
  
  try {
    const stats = await statsService.getUserStats(discordId);
    if (!stats) {
      res.status(404).json({ error: 'User stats not found' });
      return;
    }
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  const gameType = req.query.type as 'dad' | 'poker' | undefined;
  const limit = parseInt(req.query.limit as string) || 100;
  
  try {
    const leaderboard = await statsService.getLeaderboard(gameType, limit);
    res.json({ leaderboard, gameType: gameType || 'global' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user game history
app.get('/api/history/:discordId', async (req, res) => {
  const { discordId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  
  try {
    const history = await statsService.getUserGameHistory(discordId, limit);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: persistence health/status
app.get('/api/admin/persistence-status', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [gameStatus, triviaStatus] = await Promise.all([
      gameManager.getPersistenceStatus(),
      triviaManager.getPersistenceStatus(),
    ]);
    res.json({
      gameArena: gameStatus,
      trivia: {
        ...triviaStatus,
        audit: triviaManager.getAuditSnapshot(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load persistence status' });
  }
});

// JustTheTip API routes

// Get tip history for authenticated user
app.get('/api/tips', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const discordUser = mapAuthUserToDiscordUser(user);
    const tips = await justthetip.getTipsForUser(discordUser.id);
    
    // Format tips for client
    const formattedTips = tips.map(tip => ({
      id: tip.id,
      type: tip.sender_id === discordUser.id ? 'sent' : 'received',
      amount: tip.amount || 0,
      usdAmount: 0, // Not stored in DB currently
      otherUser: tip.sender_id === discordUser.id ? tip.recipient_discord_id : tip.sender_id,
      status: tip.status,
      timestamp: tip.created_at.toISOString(),
    }));

    res.json({ tips: formattedTips });
  } catch (error: any) {
    console.error('[Tips] Failed to get tip history:', error);
    res.status(500).json({ error: error.message || 'Failed to load tip history' });
  }
});

// Get pending tips for authenticated user
app.get('/api/tips/pending', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const discordUser = mapAuthUserToDiscordUser(user);
    const pendingTips = await justthetip.getPendingTipsForUser(discordUser.id);
    
    // Format pending tips for client
    const formattedTips = pendingTips.map(tip => ({
      id: tip.id,
      senderId: tip.sender_id,
      amount: tip.amount || 0,
      usdAmount: 0,
      timestamp: tip.created_at.toISOString(),
      status: tip.status,
    }));

    res.json({ pendingTips: formattedTips });
  } catch (error: any) {
    console.error('[Tips] Failed to get pending tips:', error);
    res.status(500).json({ error: error.message || 'Failed to load pending tips' });
  }
});

// Get user's wallet status
app.get('/api/tips/wallet', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const discordUser = mapAuthUserToDiscordUser(user);
    const wallet = await justthetip.getWallet(discordUser.id);
    
    if (wallet) {
      res.json({
        connected: true,
        address: wallet.address,
        type: wallet.type,
        registeredAt: wallet.registeredAt,
      });
    } else {
      res.json({ connected: false });
    }
  } catch (error: any) {
    console.error('[Tips] Failed to get wallet status:', error);
    res.status(500).json({ error: error.message || 'Failed to get wallet status' });
  }
});

// Get transaction history with receipts
app.get('/api/tips/history', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const discordUser = mapAuthUserToDiscordUser(user);
    const history = await justthetip.getTransactionHistory(discordUser.id);
    
    res.json({ history });
  } catch (error: any) {
    console.error('[Tips] Failed to get transaction history:', error);
    res.status(500).json({ error: error.message || 'Failed to load transaction history' });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  const sessionUser: SessionData | undefined = (socket as any).user;
  const user: DiscordUser | null = sessionUser ? mapAuthUserToDiscordUser(sessionUser) : null;
  console.log(user ? `✅ User connected: ${user.username} (${user.id})` : '👀 Anonymous lobby watcher connected');

  const emitLiveTriviaState = (): void => {
    const liveTriviaState = triviaManager.getLiveState();
    if (!liveTriviaState) {
      return;
    }

    socket.emit('game-update', {
      type: 'trivia-started',
      gameId: liveTriviaState.gameId,
      ...liveTriviaState.settings,
      playerCount: liveTriviaState.playerCount,
      roundNumber: liveTriviaState.roundNumber,
      leaderboard: liveTriviaState.leaderboard,
      players: liveTriviaState.players,
    });
  };

  // Join lobby
  socket.on('join-lobby', () => {
    socket.join('lobby');
    socket.emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
    emitLiveTriviaState();
  });

  socket.on('request-lobby-update', () => {
    socket.emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
    emitLiveTriviaState();
  });

  // Leave lobby
  socket.on('leave-lobby', () => {
    socket.leave('lobby');
  });

  // Join game
  socket.on('join-game', async (gameId: string) => {
    if (!user) {
      socket.emit('game-error', 'Authentication required');
      return;
    }

    const activeTriviaState = triviaManager.getLiveState();
    if (activeTriviaState?.gameId === gameId) {
      const joinResult = await triviaManager.joinGame(user.id, user.username, gameId);
      if (!joinResult.success) {
        socket.emit('game-error', joinResult.message);
        return;
      }

      socket.join(`game:${gameId}`);

      const updatedTriviaState = triviaManager.getLiveState();
      socket.emit('game-update', {
        type: 'trivia-joined',
        gameId,
        playerCount: updatedTriviaState?.playerCount ?? 0,
        prizePool: updatedTriviaState?.settings.prizePool ?? 0,
        roundNumber: updatedTriviaState?.roundNumber ?? 1,
        totalRounds: updatedTriviaState?.totalRounds ?? 0,
        leaderboard: updatedTriviaState?.leaderboard ?? [],
        players: updatedTriviaState?.players ?? [],
      });

      if (updatedTriviaState?.currentQuestion && updatedTriviaState.endsAt) {
        socket.emit('trivia-round-start', {
          gameId,
          question: updatedTriviaState.currentQuestion,
          prizePool: updatedTriviaState.settings.prizePool,
          roundNumber: updatedTriviaState.roundNumber,
          totalRounds: updatedTriviaState.totalRounds,
          endsAt: updatedTriviaState.endsAt,
          leaderboard: updatedTriviaState.leaderboard,
          players: updatedTriviaState.players,
        });
      }

      socket.to(`game:${gameId}`).emit('player-joined', {
        userId: user.id,
        username: user.username,
      });

      return;
    }

    try {
      await gameManager.joinGame(gameId, user.id, user.username);
      socket.join(`game:${gameId}`);
      
      const gameState = gameManager.getGameState(gameId, user.id);
      socket.emit('game-update', gameState);

      // Notify other players
      socket.to(`game:${gameId}`).emit('player-joined', {
        userId: user.id,
        username: user.username,
      });

      // Update lobby
      io.to('lobby').emit('lobby-update', {
        games: gameManager.getActiveGames(),
        playersOnline: gameManager.getOnlinePlayerCount(),
      });
    } catch (error: any) {
      socket.emit('game-error', error.message);
    }
  });

  // Spectate game (read-only)
  socket.on('spectate-game', (gameId: string) => {
    socket.join(`game:${gameId}`);
    const gameState = gameManager.getGameState(gameId, user?.id || 'spectator');
    if (!gameState) {
      socket.emit('game-error', 'Game not found');
      return;
    }
    socket.emit('spectator-mode', true);
    socket.emit('game-update', gameState);
  });

  // Leave game
  socket.on('leave-game', async () => {
    if (!user) {
      return;
    }
    await gameManager.leaveGame(user.id);
    
    // Leave all game rooms
    const rooms = Array.from(socket.rooms);
    for (const room of rooms) {
      if (room.startsWith('game:')) {
        socket.leave(room);
        socket.to(room).emit('player-left', { userId: user.id });
      }
    }

    // Update lobby
    io.to('lobby').emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
  });

  // ── DA&D card play/vote (Activity client) ──────────────────────────────────
  socket.on('play-card', async (data: { gameId: string; cardId: string; userId: string }) => {
    if (!user) return;
    const gameRoom = `game:${data.gameId}`;
    try {
      await gameManager.processAction(data.gameId, user.id, { type: 'play-card', cardId: data.cardId });
      const gameState = gameManager.getGameState(data.gameId, user.id);
      io.to(gameRoom).emit('game-update', gameState);
      // Emit dad.round so Activity DA&D view updates
      io.to(gameRoom).emit('dad.round', gameState);
    } catch (error: any) {
      socket.emit('game-error', error.message);
    }
  });

  socket.on('vote-card', async (data: { gameId: string; cardId: string; userId: string }) => {
    if (!user) return;
    const gameRoom = `game:${data.gameId}`;
    try {
      await gameManager.processAction(data.gameId, user.id, { type: 'vote-card', cardId: data.cardId });
      const gameState = gameManager.getGameState(data.gameId, user.id);
      io.to(gameRoom).emit('game-update', gameState);
      io.to(gameRoom).emit('dad.round', gameState);
    } catch (error: any) {
      socket.emit('game-error', error.message);
    }
  });

  // ── Rain claim (Activity client) ──────────────────────────────────────────
  socket.on('claim-rain', async (data: { rainId: string; timestamp: number }) => {
    if (!user) return;
    try {
      // Publish claim event — the rain host bot or API handles fulfillment
      await eventRouter.publish('tip.rain.claim' as any, 'game-arena', {
        rainId: data.rainId,
        claimantUserId: user.id,
        claimantUsername: user.username,
        timestamp: data.timestamp,
      });
      socket.emit('tip.rain.claimed', { rainId: data.rainId, userId: user.id, success: true });
    } catch (error: any) {
      socket.emit('game-error', error.message);
    }
  });

  // Game action
  socket.on('game-action', async (action: any) => {
    if (!user) {
      socket.emit('game-error', 'Authentication required');
      return;
    }
    const rooms = Array.from(socket.rooms);
    const gameRoom = rooms.find(room => room.startsWith('game:'));
    
    if (!gameRoom) {
      socket.emit('game-error', 'Not in a game');
      return;
    }

    const gameId = gameRoom.replace('game:', '');
    
    try {
      await gameManager.processAction(gameId, user.id, action);
      
      // Broadcast updated game state to all players
      const gameState = gameManager.getGameState(gameId, user.id);
      io.to(gameRoom).emit('game-update', gameState);
    } catch (error: any) {
      socket.emit('game-error', error.message);
    }
  });

  // Chat message
  socket.on('chat-message', (message: string) => {
    if (!user) {
      socket.emit('game-error', 'Authentication required');
      return;
    }
    const normalizedMessage = typeof message === 'string' ? message.trim() : '';
    if (!normalizedMessage) {
      return;
    }
    // Hard cap prevents oversized payload abuse and keeps chat rendering predictable.
    const safeMessage = normalizedMessage.slice(0, 500);

    const rooms = Array.from(socket.rooms);
    const gameRoom = rooms.find(room => room.startsWith('game:'));
    
    if (gameRoom) {
      io.to(gameRoom).emit('chat-message', {
        userId: user.id,
        username: user.username,
        message: safeMessage,
        timestamp: Date.now(),
      });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    if (user) {
      console.log(`❌ User disconnected: ${user.username} (${user.id})`);
      await gameManager.leaveGame(user.id);
    }

    // Update lobby
    io.to('lobby').emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
  });

  // ============================================================================
  // Trivia Game Handlers
  // ============================================================================

  socket.on('submit-trivia-answer', async (data: { questionId: string; answer: string }) => {
    if (!user) return;
    if (!data || typeof data.questionId !== 'string' || typeof data.answer !== 'string') {
      socket.emit('game-error', 'Invalid answer payload');
      return;
    }
    const result = await triviaManager.submitAnswer(user.id, data.questionId, data.answer);
    if (!result.success) {
      socket.emit('game-error', result.message || 'Answer submission failed');
    }
  });

  socket.on('request-ape-in', async (data: { gameId: string; questionId: string }) => {
    if (!user) return;
    if (!data || typeof data.gameId !== 'string' || typeof data.questionId !== 'string') {
      socket.emit('game-error', 'Invalid Ape In payload');
      return;
    }
    const result = await triviaManager.requestApeIn(user.id, data.gameId, data.questionId);
    if (result.success) {
      socket.emit('trivia-ape-in-result', { questionId: data.questionId, distribution: result.stats! });
    } else {
      socket.emit('game-error', result.message || 'Hint request failed');
    }
  });

  socket.on('request-shield', async (data: { gameId: string; questionId: string }) => {
    if (!user) return;
    if (!data || typeof data.gameId !== 'string' || typeof data.questionId !== 'string') {
      socket.emit('game-error', 'Invalid shield payload');
      return;
    }
    const result = await triviaManager.requestShield(user.id, data.gameId, data.questionId);
    if (result.success) {
      socket.emit('trivia-shield-result', { 
        questionId: data.questionId, 
        eliminated: result.eliminated! 
      });
    } else {
      socket.emit('game-error', result.message || 'Shield request failed');
    }
  });

  socket.on('buy-back', async (data: { gameId: string }) => {
    if (!user) return;
    if (!data || typeof data.gameId !== 'string') {
      socket.emit('game-error', 'Invalid buy-back payload');
      return;
    }
    const result = await triviaManager.processBuyBack(user.id, data.gameId);
    if (result.success) {
      socket.emit('game-update', { type: 'buy-back-success', userId: user.id });
    } else {
      socket.emit('game-error', result.message || 'Buy-back failed');
    }
  });

  socket.on('schedule-trivia-game', async (data: { category?: string; theme?: string; totalRounds?: number }) => {
    if (!user) {
      socket.emit('game-error', 'Authentication required');
      return;
    }

    const category = normalizeTriviaCategory(data?.category);
    const totalRounds = clampTriviaRoundCount(data?.totalRounds);
    const theme = normalizeTriviaTheme(data?.theme, category);
    const result = await triviaManager.scheduleGame({
      category,
      theme,
      totalRounds,
      startTime: Date.now() + 3_000,
      prizePool: 0,
    });

    if (!result.success) {
      socket.emit('game-error', result.message);
      return;
    }

    io.to('lobby').emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
  });

  socket.on('reset-trivia-game', async () => {
    if (!user) {
      socket.emit('game-error', 'Authentication required');
      return;
    }

    await triviaManager.endGame();
    io.emit('game-update', { type: 'trivia-reset' });
  });
});

// ============================================================================
// Global Trivia Event Broadcaster
// ============================================================================

// Listen for trivia events from the manager (via eventRouter) and push to all clients
eventRouter.subscribe('trivia.started', (event) => {
  const liveTriviaState = triviaManager.getLiveState();
  io.emit('chat-message', {
    userId: 'system',
    username: 'TiltLive',
    message: `LIVE ROUND ARMED: ${event.data.theme || event.data.category} trivia is live.`,
    timestamp: Date.now(),
  });
  io.emit('game-update', {
    type: 'trivia-started',
    ...event.data,
    playerCount: liveTriviaState?.playerCount ?? 0,
    roundNumber: liveTriviaState?.roundNumber ?? 1,
    leaderboard: liveTriviaState?.leaderboard ?? [],
    players: liveTriviaState?.players ?? [],
  });

  // Jackpot pool update on game start
  io.emit('jackpot-update', {
    pool: event.data.prizePool ?? 0,
    entries: liveTriviaState?.playerCount ?? 0,
  });
}, 'game-arena');

eventRouter.subscribe('trivia.round.start', (event) => {
  io.to(`game:${event.data.gameId}`).emit('trivia-round-start', event.data);
}, 'game-arena');

eventRouter.subscribe('trivia.round.reveal', (event) => {
  io.to(`game:${event.data.gameId}`).emit('trivia-round-reveal', event.data);
}, 'game-arena');

eventRouter.subscribe('trivia.completed', (event) => {
  const completed = event.data as TriviaCompletedEventData & { prizePool?: number };
  const winnerList = completed.winners.map((w) => w.username).join(', ');
  io.emit('chat-message', {
    userId: 'system',
    username: 'TiltLive',
    message: `ROUND LOOP CLOSED. Winners: ${winnerList || 'No one survived the trenches.'}`,
    timestamp: Date.now(),
  });
  io.to(`game:${completed.gameId}`).emit('game-update', { type: 'trivia-completed', ...completed });

  // Jackpot pool reset on game completion
  io.emit('jackpot-update', {
    pool: 0,
    entries: 0,
    lastWinner: completed.winners?.[0]?.username ?? null,
    lastPayout: completed.prizePool ?? 0,
  });
}, 'game-arena');

// Player elimination / reinstatement events → Activity client
eventRouter.subscribe('trivia.player.eliminated' as any, (event) => {
  const d = event.data as { gameId: string; userId: string; username: string };
  io.to(`game:${d.gameId}`).emit('trivia-player-eliminated', { userId: d.userId, username: d.username });
}, 'game-arena');

eventRouter.subscribe('trivia.player.reinstated', (event) => {
  const d = event.data as { gameId: string; userId: string; username: string };
  io.to(`game:${d.gameId}`).emit('trivia-player-reinstated', { userId: d.userId, username: d.username });
}, 'game-arena');

// Trivia notification from Director's Booth → broadcast to lobby
eventRouter.subscribe('trivia.notification' as any, (event) => {
  const d = event.data as { message: string; type: string };
  io.emit('chat-message', {
    userId: 'system',
    username: 'TiltLive',
    message: d.message,
    timestamp: Date.now(),
  });
}, 'game-arena');

// Forward tip rain events from discord-bot → socket.io clients (Activity TipView)
eventRouter.subscribe('prize.distributed', (event) => {
  const d = event.data as {
    distributionId: string;
    hostId: string;
    recipientIds: string[];
    totalPrize: number;
    prizePerRecipient: number;
    context?: string;
  };
  io.emit('tip.rain', {
    id: d.distributionId,
    fromUserId: d.hostId,
    fromUsername: d.hostId,
    amountSol: d.totalPrize,
    amountUsd: 0,
    message: d.context ?? '',
    expiresAt: Date.now() + 5 * 60 * 1000,
    claimable: true,
  });
}, 'game-arena');

eventRouter.subscribe('prize.created', (event) => {
  const d = event.data as {
    distributionId: string;
    hostId: string;
    recipientIds: string[];
    totalPrize: number;
    prizePerRecipient: number;
    context?: string;
  };
  io.emit('tip.sent', {
    id: d.distributionId,
    fromUsername: d.hostId,
    toUsername: `${d.recipientIds.length} degens`,
    amountSol: d.totalPrize,
    message: d.context ?? '',
    timestamp: Date.now(),
    claimed: false,
  });
}, 'game-arena');

// Cleanup interval (every 5 minutes)
setInterval(() => {
  gameManager.cleanup();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  await gameManager.shutdown();
  io.close();
  httpServer.close();
  process.exit(0);
});

// Start server
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`🎮 Game Arena server running on port ${config.port} (0.0.0.0)`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔐 Ecosystem Auth: Shared (.tiltcheck.me)`);
});

export { app, httpServer, io, gameManager, eventRouter };
