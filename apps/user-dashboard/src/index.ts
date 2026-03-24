/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * User Dashboard Service (Degen Hub)
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
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

// Rate limiter
const trustLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is required in production'); })() : 'tiltcheck-user-secret-2024');
const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);
// Solana connection reserved for future wallet verification features
const _solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

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
const isProdEnv = process.env.NODE_ENV === 'production';
const DISCORD_CONFIG = {
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  redirectUri:
    process.env.DISCORD_CALLBACK_URL ||
    (isProdEnv
      ? 'https://user-dashboard.tiltcheck.me/auth/discord/callback'
      : 'http://localhost:6001/auth/discord/callback'),
};

app.get('/auth/discord', (_req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CONFIG.clientId!,
    redirect_uri: DISCORD_CONFIG.redirectUri,
    response_type: 'code',
    scope: 'identify',
  });
  // Note: Discord OAuth authorize endpoint is discord.com/oauth2/authorize (not /api/oauth2/)
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CONFIG.clientId!,
        client_secret: DISCORD_CONFIG.clientSecret!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: DISCORD_CONFIG.redirectUri,
      }),
    });

    const { access_token } = await tokenRes.json() as any;
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userData = await userRes.json() as any;
    const token = jwt.sign(
      { discordId: userData.id, username: userData.username, avatar: userData.avatar },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect('/dashboard');
  } catch {
    res.redirect('/?error=auth_failed');
  }
});

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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    const cookieToken = (req.cookies?.auth_token as string) || null;
    if (!cookieToken) return res.sendStatus(401);
    
    jwt.verify(cookieToken, JWT_SECRET, (err: any, user: any) => {
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
  });
}

export { app };