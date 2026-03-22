/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Game Arena Server
 * Web-based multiplayer game arena with Supabase Discord authentication
 *
 * Uses @tiltcheck/supabase-auth for Discord OAuth via Supabase
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';

import { config, validateConfig } from './config.js';
import { GameManager } from './game-manager.js';
import { statsService } from './stats-service.js';
import {
  createAuthClient,
  type SupabaseAuthClient,
  type AuthUser,
} from '@tiltcheck/supabase-auth';
import type {
  DiscordUser,
  ClientToServerEvents,
  ServerToClientEvents,
  CreateGameRequest,
  TriviaStartedEventData,
  TriviaRoundStartEventData,
  TriviaRoundRevealEventData,
  TriviaCompletedEventData,
  TriviaWinner,
  GameLobbyInfo,
} from './types.js';
import { mapAuthUserToDiscordUser } from './types.js';
import { justthetip } from '@tiltcheck/justthetip';
import { triviaManager } from './trivia-manager.js';
import { eventRouter } from '@tiltcheck/event-router';
import { TiltCheckEvent, EventType } from '@tiltcheck/types';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration
validateConfig();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Simple CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.isDev ? '*' : process.env.ALLOWED_ORIGINS || '');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize Socket.IO
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.isDev ? true : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
  },
});

// Initialize game manager
const gameManager = new GameManager({
  stateFilePath: config.game.stateFilePath,
});
await gameManager.initialize();

// Initialize stats service
statsService.initialize().catch(err => {
  console.error('[Server] Failed to initialize stats service:', err);
});

// Initialize Supabase auth client (if configured)
let authClient: SupabaseAuthClient | null = null;
if (config.supabase.url && config.supabase.anonKey) {
  authClient = createAuthClient({
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
    persistSession: false, // Server-side doesn't persist sessions
  });
  console.log('✅ Supabase auth client initialized');
} else {
  console.warn('⚠️  Supabase auth not configured - authentication will be disabled');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration (used to store auth tokens)
let redisSessionClient: ReturnType<typeof createClient> | null = null;
let sessionStore: session.Store | undefined;

if (config.redis.url) {
  try {
    redisSessionClient = createClient({ url: config.redis.url });
    redisSessionClient.on('error', (error) => {
      console.warn('[Session] Redis session client error:', error);
    });
    await redisSessionClient.connect();
    sessionStore = new RedisStore({
      client: redisSessionClient,
      prefix: 'arena:sess:',
    });
    console.log('✅ Redis session store enabled');
  } catch (error) {
    redisSessionClient = null;
    console.warn('[Session] Redis unavailable, falling back to in-memory sessions:', error);
  }
}

const sessionMiddleware = session({
  ...(sessionStore ? { store: sessionStore } : {}),
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  name: config.session.cookieName,
  cookie: {
    maxAge: config.session.maxAge,
    httpOnly: true,
    secure: !config.isDev,
    sameSite: config.isDev ? 'lax' : 'strict',
  },
});

app.use(sessionMiddleware);
app.use(express.json());

app.post('/admin/trivia/start', async (req, res) => {
  try {
    const { category, theme, rounds } = req.body;
    await triviaManager.scheduleGame({
      startTime: Date.now() + 5000, // Start in 5 seconds
      category: category || 'general',
      theme: theme || 'Random Degen Knowledge',
      totalRounds: rounds || 12,
      prizePool: 0
    });
    res.json({ success: true, message: 'Trivia game scheduled to start in 5s.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/admin/trivia/reset', (req, res) => {
  triviaManager.endGame();
  res.json({ success: true, message: 'Trivia manager reset.' });
});

// Extended session type
declare module 'express-session' {
  interface SessionData {
    accessToken?: string;
    refreshToken?: string;
    user?: AuthUser;
  }
}

// Authentication middleware - validates session token
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  // Check if user is stored in session
  if (req.session.user && req.session.accessToken) {
    req.user = req.session.user;
    return next();
  }
  
  // Check for Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && authClient) {
    const token = authHeader.substring(7);
    try {
      // Set the session and get user
      const { data: sessionData, error: sessionError } = await authClient.setSession(
        token,
        req.session.refreshToken || ''
      );
      
      if (sessionError || !sessionData) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      
      req.user = sessionData.user;
      return next();
    } catch {
      res.status(401).json({ error: 'Authentication failed' });
      return;
    }
  }
  
  res.status(401).json({ error: 'Authentication required' });
}

// Optional auth middleware - attaches user if available
async function optionalAuth(req: express.Request, _res: express.Response, next: express.NextFunction): Promise<void> {
  if (req.session.user) {
    req.user = req.session.user;
  }
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (config.isDev) {
    next();
    return;
  }

  const configuredToken = config.admin.statusToken;
  if (!configuredToken) {
    res.status(503).json({ error: 'Admin status endpoint is not configured' });
    return;
  }

  const providedToken = req.headers['x-admin-token'];
  if (typeof providedToken !== 'string' || providedToken !== configuredToken) {
    res.status(403).json({ error: 'Admin token required' });
    return;
  }

  next();
}

// Share session with Socket.IO
io.engine.use(sessionMiddleware as any);

// Routes

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    auth: authClient ? 'enabled' : 'disabled',
  });
});

// Admin status for dashboard
app.get('/admin/status', requireAdmin, (_req, res) => {
  res.json({
    status: 'ok',
    services: [
      { name: 'Game Arena', status: 'online', port: config.port },
      { name: 'Trivia Manager', status: triviaManager.isActive() ? 'active' : 'idle' },
      { name: 'Event Router', status: 'online' }
    ],
    metrics: {
      uptime: process.uptime(),
      requests: 0, // Mock for now
      activeGames: gameManager.getGameCount()
    }
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

// Auth routes using Supabase Discord OAuth
if (authClient) {
  // Initiate Discord OAuth via Supabase
  app.get('/auth/discord', async (_req, res) => {
    try {
      const { data, error } = await authClient!.signInWithOAuth({
        provider: 'discord',
        options: {
          scopes: 'identify email',
          redirectTo: config.auth.redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        console.error('[Auth] Failed to get OAuth URL:', error);
        res.redirect(config.auth.failureUrl);
        return;
      }

      // Redirect user to Discord OAuth page via Supabase
      res.redirect(data.url);
    } catch (err) {
      console.error('[Auth] OAuth error:', err);
      res.redirect(config.auth.failureUrl);
    }
  });

  // OAuth callback - exchange code for session
  app.get('/auth/callback', async (req, res) => {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
      console.error('[Auth] OAuth error from provider:', oauthError);
      res.redirect(config.auth.failureUrl);
      return;
    }

    if (!code || typeof code !== 'string') {
      console.error('[Auth] No code received');
      res.redirect(config.auth.failureUrl);
      return;
    }

    try {
      // Exchange code for session
      const { data: sessionData, error: exchangeError } = await authClient!.exchangeCodeForSession(code);

      if (exchangeError || !sessionData) {
        console.error('[Auth] Code exchange failed:', exchangeError);
        res.redirect(config.auth.failureUrl);
        return;
      }

      // Store session in express session
      req.session.accessToken = sessionData.accessToken;
      req.session.refreshToken = sessionData.refreshToken;
      req.session.user = sessionData.user;

      console.log(`✅ User authenticated: ${sessionData.user.discordUsername || sessionData.user.email}`);
      
      // Redirect to arena
      res.redirect('/arena');
    } catch (err) {
      console.error('[Auth] Callback error:', err);
      res.redirect(config.auth.failureUrl);
    }
  });

  // Logout
  app.get('/auth/logout', async (req, res) => {
    try {
      if (authClient && req.session.accessToken) {
        await authClient.signOut();
      }
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('[Auth] Session destroy error:', err);
      }
      res.redirect('/');
    });
  });
} else {
  console.warn('⚠️  Supabase auth not configured - authentication endpoints disabled');
  
  // Provide helpful error messages
  app.get('/auth/discord', (_req, res) => {
    res.status(503).json({
      error: 'Authentication not configured',
      message: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables to enable authentication',
    });
  });
}

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
  const { gameId } = req.params;
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
  const { discordId } = req.params;
  
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
    const status = await gameManager.getPersistenceStatus();
    res.json(status);
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
  const session = (socket.request as any).session;
  const authUser: AuthUser | undefined = session?.user;
  const user: DiscordUser | null = authUser ? mapAuthUserToDiscordUser(authUser) : null;
  console.log(user ? `✅ User connected: ${user.username} (${user.id})` : '👀 Anonymous lobby watcher connected');

  // Join lobby
  socket.on('join-lobby', () => {
    socket.join('lobby');
    socket.emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
  });

  socket.on('request-lobby-update', () => {
    socket.emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
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

  socket.on('submit-trivia-answer', (data: { questionId: string; answer: string }) => {
    if (!user) return;
    triviaManager.submitAnswer(user.id, data.answer);
  });

  socket.on('request-ape-in', async (data: { gameId: string; questionId: string }) => {
    if (!user) return;
    const result = await triviaManager.requestApeIn(user.id);
    if (result.success) {
      socket.emit('trivia-ape-in-result', { questionId: data.questionId, distribution: result.stats! });
    } else {
      socket.emit('game-error', result.message || 'Hint request failed');
    }
  });

  socket.on('buy-back', async (data: { gameId: string }) => {
    if (!user) return;
    const result = await triviaManager.processBuyBack(user.id);
    if (result.success) {
      socket.emit('game-update', { type: 'buy-back-success', userId: user.id });
    } else {
      socket.emit('game-error', result.message || 'Buy-back failed');
    }
  });
});

// ============================================================================
// Global Trivia Event Broadcaster
// ============================================================================

// Listen for trivia events from the manager (via eventRouter) and push to all clients
eventRouter.subscribe('trivia.started', (event) => {
  io.emit('chat-message', {
    userId: 'system',
    username: 'TiltLive',
    message: `📢 LIVESTREAM STARTED: ${event.data.theme || event.data.category} Trivia is LIVE!`,
    timestamp: Date.now(),
  });
  io.emit('game-update', { type: 'trivia-started', ...event.data });
}, 'game-arena');

eventRouter.subscribe('trivia.round.start', (event) => {
  io.emit('trivia-round-start', event.data);
}, 'game-arena');

eventRouter.subscribe('trivia.round.reveal', (event) => {
  io.emit('trivia-round-reveal', event.data);
}, 'game-arena');

eventRouter.subscribe('trivia.completed', (event) => {
  const winnerList = event.data.winners.map((w) => w.username).join(', ');
  io.emit('chat-message', {
    userId: 'system',
    username: 'TiltLive',
    message: `🏆 GAME OVER! Winners: ${winnerList || 'No one survived the trenches.'}`,
    timestamp: Date.now(),
  });
  io.emit('game-update', { type: 'trivia-completed', ...event.data });
}, 'game-arena');

// Cleanup interval (every 5 minutes)
setInterval(() => {
  gameManager.cleanup();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  await gameManager.shutdown();
  if (redisSessionClient) {
    await redisSessionClient.quit();
  }
  io.close();
  httpServer.close();
  process.exit(0);
});

// Start server
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`🎮 Game Arena server running on port ${config.port} (0.0.0.0)`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔐 Supabase Auth: ${authClient ? 'Enabled' : 'Disabled'}`);
  console.log(`🔗 Auth Redirect: ${config.auth.redirectUrl}`);
});

export { app, httpServer, io };
