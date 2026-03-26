/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * User Dashboard Service (Degen Hub)
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { Magic } from '@magic-sdk/admin';
import { Connection } from '@solana/web3.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import type { Request, Response, NextFunction } from 'express';
import { db, DegenIdentity } from '@tiltcheck/database';
import { runner } from '@tiltcheck/agent';
import { stringifyContent } from '@google/adk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.USER_DASHBOARD_PORT || 6001;

// Configuration
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProd ? (() => { throw new Error('JWT_SECRET is required in production'); })() : 'tiltcheck-user-secret-2024');
const SESSION_SECRET = process.env.SESSION_SECRET || (isProd ? (() => { throw new Error('SESSION_SECRET is required in production'); })() : 'tiltcheck-user-dashboard-secret');
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || (isProd ? (() => { throw new Error('DISCORD_CLIENT_ID is required in production'); })() : 'your-client-id');
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || (isProd ? (() => { throw new Error('DISCORD_CLIENT_SECRET is required in production'); })() : 'your-client-secret');
const DISCORD_CALLBACK_URL = process.env.DISCORD_CALLBACK_URL || (isProd ? 'https://dashboard.tiltcheck.me/auth/discord/callback' : 'http://localhost:6001/auth/discord/callback');

// Rate limiter
const trustLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);
// Solana connection reserved for future wallet verification features
const _solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isProd }
}));
app.use(passport.initialize());
app.use(passport.session());


// === Passport (Discord) Setup ===
passport.use(new DiscordStrategy({
    clientID: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
    callbackURL: DISCORD_CALLBACK_URL,
    scope: ['identify', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    // This callback is called after Discord successfully authenticates the user.
    // The profile object contains the user's Discord information.
    // We pass the profile to the `done` callback to be used in our /auth/discord/callback route.
    return done(null, profile);
  }
));

// No need to serialize/deserialize user for JWT-based session management
// We handle user state in the callback directly.

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

interface DiscordUser {
  discordId: string;
  username: string;
  avatar: string;
}

interface AuthenticatedRequest extends Request {
  user?: DiscordUser;
}

// === Data Fetching ===
async function getUserData(discordId: string): Promise<UserData | null> {
  if (!db.isConnected()) return null;

  try {
    const [dbStats, _dbPrefs, dbIdentity] = await Promise.all([
      db.getUserStats(discordId),
      db.getUserPreferences(discordId),
      db.getDegenIdentity(discordId)
    ]);

    if (!dbStats) return null;

    return {
      discordId: dbStats.discord_id,
      username: dbStats.username,
      avatar: dbStats.avatar || '',
      trustScore: dbIdentity?.trust_score ?? 50,
      tiltLevel: 0,
      analytics: {
        totalJuice: 0, // Future: Pull from distribution table
        totalTipsCaught: 0,
        eventCount: 0,
        wagered: Number(dbStats.wagered_amount_sol),
        deposited: Number(dbStats.deposited_amount_sol),
        profit: Number(dbStats.profit_sol)
      },
      degenIdentity: dbIdentity,
      recentActivity: [],
      preferences: {
        notifyBonus: true,
        notifyJuice: true,
        anonTipping: false,
        showAnalytics: true,
        baseCurrency: 'SOL'
      }
    };
  } catch {
    return null;
  }
}

// === Auth Routes ===
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/?error=auth_failed', session: false }),
  (req: any, res) => {
    // passport-discord puts the user profile on req.user
    const user = req.user as { id: string, username: string, avatar: string };

    const token = jwt.sign(
      { discordId: user.id, username: user.username, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect('/dashboard');
  }
);


// === API Routes ===
app.get('/api/auth/me', authenticateToken as any, (req: any, res) => {
  res.json(req.user);
});

app.get('/api/user/:discordId', authenticateToken as any, async (req: any, res) => {
  const data = await getUserData(req.params.discordId);
  if (!data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

app.get('/api/user/:discordId/trust', authenticateToken as any, trustLimiter, async (req: any, res) => {
  const data = await getUserData(req.params.discordId);
  if (!data) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    trustScore: data.trustScore,
    tiltLevel: data.tiltLevel,
    factors: { consistency: 85, community: 70 }
  });
});

app.get('/api/user/:discordId/activity', authenticateToken as any, async (req: any, res) => {
  // Mock activity for now
  res.json({
    activities: [
      { type: 'juice', description: 'Caught 0.05 SOL in /juice drop', timestamp: Date.now() - 3600000 },
      { type: 'tip', description: 'Received 0.1 SOL tip from @DegenMaster', timestamp: Date.now() - 86400000 }
    ]
  });
});

app.put('/api/user/:discordId/preferences', authenticateToken as any, async (req: any, res) => {
  // Logic to save preferences to DB
  res.json({ success: true });
});

app.post('/api/auth/wallet/link', authenticateToken as any, async (req: any, res) => {
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

app.post('/api/auth/magic/link', authenticateToken as any, async (req: any, res) => {
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
app.post('/api/agent/query', authenticateToken as any, async (req: any, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    let finalResponse = '';
    const it = runner.runAsync({
      userId: req.user.discordId,
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

// === Middleware ===
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Prefer cookie-based auth for web dashboard
  const token = (req.cookies?.auth_token as string) || null;
  if (!token) {
    // Fallback to bearer token for direct API calls
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    if (!bearerToken) return res.sendStatus(401);
    
    jwt.verify(bearerToken, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}


app.get('/dashboard', (_req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`🎯 Degen Hub listening on port ${PORT}`);
    console.log(`🔗 Discord OAuth configured for: ${DISCORD_CALLBACK_URL}`);
  });
}

export { app };