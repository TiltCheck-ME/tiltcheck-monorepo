/**
 * TiltCheck Backend Server
 * WebSocket + API server with Supabase Discord authentication
 * 
 * Exposes game arena, multiplayer games, and real-time WebSocket connections.
 * Uses @tiltcheck/supabase-auth for Discord OAuth via Supabase.
 * 
 * Deployed as a separate service via Spaceship Hyperlift on port 7071.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import { config, validateConfig } from './config.js';
import { GameManager } from './game-manager.js';
import { statsService } from './stats-service.js';
import tiltRoutes from './routes/tilt.js';
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
} from './types.js';
import { mapAuthUserToDiscordUser } from './types.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration
validateConfig();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.isDev ? '*' : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
  },
});

// Initialize game manager
const gameManager = new GameManager();

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
const sessionMiddleware = session({
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

// Tilt events API routes
app.use('/api/tilt', tiltRoutes);

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

// WebSocket handling
io.on('connection', (socket) => {
  const session = (socket.request as any).session;
  const authUser: AuthUser | undefined = session?.user;

  if (!authUser) {
    console.log('❌ Unauthorized WebSocket connection');
    socket.disconnect();
    return;
  }

  const user: DiscordUser = mapAuthUserToDiscordUser(authUser);
  console.log(`✅ User connected: ${user.username} (${user.id})`);

  // Join lobby
  socket.on('join-lobby', () => {
    socket.join('lobby');
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

  // Leave game
  socket.on('leave-game', async () => {
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
    const rooms = Array.from(socket.rooms);
    const gameRoom = rooms.find(room => room.startsWith('game:'));
    
    if (gameRoom) {
      io.to(gameRoom).emit('chat-message', {
        userId: user.id,
        username: user.username,
        message,
        timestamp: Date.now(),
      });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${user.username} (${user.id})`);
    await gameManager.leaveGame(user.id);

    // Update lobby
    io.to('lobby').emit('lobby-update', {
      games: gameManager.getActiveGames(),
      playersOnline: gameManager.getOnlinePlayerCount(),
    });
  });
});

// Cleanup interval (every 5 minutes)
setInterval(() => {
  gameManager.cleanup();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  io.close();
  httpServer.close();
  process.exit(0);
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`🚀 Backend server running on port ${config.port}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔐 Supabase Auth: ${authClient ? 'Enabled' : 'Disabled'}`);
  console.log(`🔗 Auth Redirect: ${config.auth.redirectUrl}`);
  console.log(`🔌 API URL: ${config.apiUrl}`);
  console.log(`📡 WebSocket URL: ${config.wsUrl}`);
});

export { app, httpServer, io };
