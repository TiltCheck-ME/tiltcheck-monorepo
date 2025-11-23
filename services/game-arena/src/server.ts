/**
 * Game Arena Server
 * Web-based multiplayer game arena with Discord authentication and Supabase stats
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import path from 'path';
import { fileURLToPath } from 'url';

import { config, validateConfig } from './config.js';
import { GameManager } from './game-manager.js';
import { statsService } from './stats-service.js';
import type {
  DiscordUser,
  ClientToServerEvents,
  ServerToClientEvents,
  CreateGameRequest,
} from './types.js';

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
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

// Passport configuration
if (config.discord.clientId && config.discord.clientSecret) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: config.discord.clientId,
        clientSecret: config.discord.clientSecret,
        callbackURL: config.discord.callbackUrl,
        scope: ['identify', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        const user: DiscordUser = {
          id: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          avatar: profile.avatar,
          email: profile.email,
        };
        return done(null, user);
      }
    )
  );

  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  app.use(passport.initialize());
  app.use(passport.session());
}

// Authentication middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
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
  });
});

// Home page
app.get('/', (req, res) => {
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

// Auth routes
if (config.discord.clientId && config.discord.clientSecret) {
  app.get('/auth/discord', passport.authenticate('discord'));

  app.get(
    '/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/?error=auth_failed' }),
    (_req, res) => {
      res.redirect('/arena');
    }
  );

  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ error: 'Logout failed' });
        return;
      }
      res.redirect('/');
    });
  });
} else {
  console.warn('⚠️  Discord OAuth not configured - authentication endpoints disabled');
}

// API routes

// Get current user
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json(req.user);
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
    const user = req.user as DiscordUser;

    const game = await gameManager.createGame(user.id, user.username, gameType, {
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

  const user = req.user as DiscordUser;
  const gameState = gameManager.getGameState(gameId, user.id);
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

// WebSocket handling
io.on('connection', (socket) => {
  const session = (socket.request as any).session;
  const user: DiscordUser | undefined = session?.passport?.user;

  if (!user) {
    console.log('❌ Unauthorized WebSocket connection');
    socket.disconnect();
    return;
  }

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
  console.log(`🎮 Game Arena server running on port ${config.port}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔐 Discord OAuth: ${config.discord.clientId ? 'Enabled' : 'Disabled'}`);
});

export { app, httpServer, io };
