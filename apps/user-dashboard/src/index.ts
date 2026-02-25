/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * User Dashboard Service
 * 
 * Discord-linked user dashboard for TiltCheck ecosystem.
 * Provides user authentication via Discord OAuth and personalized dashboard.
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Magic } from '@magic-sdk/admin';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { db, DegenIdentity } from '@tiltcheck/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.USER_DASHBOARD_PORT || 6001;

// Rate limiter for sensitive routes
const trustLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // limit each IP to 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
const JWT_SECRET = process.env.JWT_SECRET || 'tiltcheck-user-secret-2024';
const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);
const solanaConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
const TREASURY_ADDRESS = process.env.TREASURY_WALLET_ADDRESS;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Types
interface UserData {
  discordId: string;
  username: string;
  avatar: string;
  joinedAt: number;
  trustScore: number;
  tiltLevel: number;
  totalTips: number;
  totalTipsValue: number;
  casinosSeen: number;
  analytics?: {
    wagered: number;
    deposited: number;
    lost: number;
    profit: number;
  };
  degenIdentity?: DegenIdentity | null;
  favoriteTools: string[];
  recentActivity: ActivityItem[];
  preferences: UserPreferences;
}

interface ActivityItem {
  type: string;
  timestamp: number;
  [key: string]: any;
}

interface UserPreferences {
  emailNotifications: boolean;
  tiltWarnings: boolean;
  trustUpdates: boolean;
  weeklyDigest: boolean;
}

interface DiscordUser {
  discordId: string;
  username: string;
  discriminator: string;
}

interface AuthenticatedRequest extends Request {
  user?: DiscordUser;
}

// In-memory cache for user data (populated from database, with fallback defaults)
const userCache: Record<string, UserData> = {};

// Constants for trust calculation
const TRUST_CONSTANTS = {
  BASE_SCORE: 50.0,
  WIN_BONUS: 2,
  LOSS_PENALTY: 1,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  HISTORY_DAYS: 7,
  MS_PER_DAY: 86400000,
  HISTORY_VARIANCE: 0.5,
  HISTORY_RANDOM_FACTOR: 2
};

// Helper function to generate default Discord avatar URL
function getDefaultAvatarUrl(discordId: string): string {
  const avatarIndex = Math.abs(parseInt(discordId.slice(-2), 10) || 0) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
}

// Default user data factory (when database user not found or DB unavailable)
function createDefaultUserData(discordId: string, username: string, avatar?: string): UserData {
  return {
    discordId,
    username,
    avatar: avatar || getDefaultAvatarUrl(discordId),
    joinedAt: Date.now(),
    trustScore: TRUST_CONSTANTS.BASE_SCORE,
    tiltLevel: 0,
    totalTips: 0,
    totalTipsValue: 0,
    casinosSeen: 0,
    favoriteTools: [],
    recentActivity: [],
    preferences: {
      emailNotifications: true,
      tiltWarnings: true,
      trustUpdates: true,
      weeklyDigest: false
    }
  };
}

// Calculate trust score from game stats (clamped between 0-100)
function calculateTrustScore(totalWins: number, totalGames: number): number {
  const losses = totalGames - totalWins;
  const rawScore = TRUST_CONSTANTS.BASE_SCORE +
    (totalWins * TRUST_CONSTANTS.WIN_BONUS) -
    (losses * TRUST_CONSTANTS.LOSS_PENALTY);
  return Math.max(TRUST_CONSTANTS.MIN_SCORE, Math.min(TRUST_CONSTANTS.MAX_SCORE, rawScore));
}

// Fetch user data from database or create default
async function getUserData(discordId: string): Promise<UserData | null> {
  // Check cache first
  if (userCache[discordId]) {
    return userCache[discordId];
  }

  // Try to get from database
  if (db.isConnected()) {
    try {
      const [dbStats, dbPrefs, dbIdentity] = await Promise.all([
        db.getUserStats(discordId),
        db.getUserPreferences(discordId),
        db.getDegenIdentity(discordId)
      ]);

      if (dbStats) {
        // Convert database stats to UserData format
        const userData: UserData = {
          discordId: dbStats.discord_id,
          username: dbStats.username,
          avatar: dbStats.avatar || getDefaultAvatarUrl(discordId),
          joinedAt: new Date(dbStats.created_at).getTime(),
          trustScore: dbIdentity?.trust_score ?? calculateTrustScore(dbStats.total_wins, dbStats.total_games),
          tiltLevel: 0,
          totalTips: 0,
          totalTipsValue: 0,
          casinosSeen: dbStats.total_games,
          analytics: {
            wagered: Number(dbStats.wagered_amount_sol),
            deposited: Number(dbStats.deposited_amount_sol),
            lost: Number(dbStats.lost_amount_sol),
            profit: Number(dbStats.profit_sol)
          },
          degenIdentity: dbIdentity,
          favoriteTools: ['JustTheTip', 'TrustEngine'],
          recentActivity: [],
          preferences: dbPrefs ? {
            emailNotifications: dbPrefs.email_notifications,
            tiltWarnings: dbPrefs.tilt_warnings,
            trustUpdates: dbPrefs.trust_updates,
            weeklyDigest: dbPrefs.weekly_digest
          } : {
            emailNotifications: true,
            tiltWarnings: true,
            trustUpdates: true,
            weeklyDigest: false
          }
        };

        // Cache for future requests
        userCache[discordId] = userData;
        return userData;
      }
    } catch (_error) {
      // Database error - fall through to return null
    }
  }

  return null;
}

// Discord OAuth configuration
const DISCORD_CONFIG = {
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  redirectUri: process.env.DISCORD_CALLBACK_URL || process.env.DISCORD_REDIRECT_URI || 'http://localhost:6001/auth/discord/callback'
};

// Routes

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'user-dashboard',
    timestamp: Date.now()
  });
});

// OAuth configuration check
app.get('/auth/status', (_req: Request, res: Response) => {
  const maskUri = (uri: string) => {
    try {
      const url = new URL(uri);
      return `${url.protocol}//${url.host}/...${url.pathname.slice(-20)}`;
    } catch {
      return 'invalid-uri';
    }
  };

  res.json({
    service: 'user-dashboard',
    oauth: {
      configured: !!(DISCORD_CONFIG.clientId && DISCORD_CONFIG.clientSecret),
      clientIdPresent: !!DISCORD_CONFIG.clientId,
      clientSecretPresent: !!DISCORD_CONFIG.clientSecret,
      redirectUriPattern: maskUri(DISCORD_CONFIG.redirectUri)
    },
    timestamp: Date.now()
  });
});

// Discord OAuth flow
app.get('/auth/discord', (_req: Request, res: Response) => {
  if (!DISCORD_CONFIG.clientId) {
    res.status(500).json({ error: 'Discord OAuth not configured' });
    return;
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CONFIG.clientId}&redirect_uri=${encodeURIComponent(DISCORD_CONFIG.redirectUri)}&response_type=code&scope=identify%20email`;
  res.redirect(discordAuthUrl);
});

app.get('/auth/discord/callback', async (req: Request, res: Response) => {
  const { code, error: discordError } = req.query;

  if (discordError) {
    return res.redirect(`/dashboard?error=${encodeURIComponent(discordError as string)}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
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

    const tokenData = await tokenResponse.json() as { access_token: string };

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json() as { id: string; username: string; discriminator: string };

    const token = jwt.sign(
      { discordId: userData.id, username: userData.username, discriminator: userData.discriminator },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`/dashboard?token=${token}`);
  } catch (error) {
    res.redirect('/dashboard?error=auth_failed');
  }
});

// NFT Minting Payment (Solana Pay)
app.post('/api/nft/checkout', authenticateToken as any, requireUser as any, async (_req: any, res: Response) => {
  if (!TREASURY_ADDRESS) {
    res.status(500).json({ error: 'Treasury address not configured' });
    return;
  }

  const reference = new Keypair().publicKey;
  const label = 'TiltCheck Degen Identity NFT';
  const message = 'Minting fee for TiltCheck Degen Identity';
  const amount = '0.05';

  const url = `solana:${TREASURY_ADDRESS}?amount=${amount}&reference=${reference.toBase58()}&label=${encodeURIComponent(label)}&message=${encodeURIComponent(message)}`;

  res.json({ url, reference: reference.toBase58() });
});

app.post('/api/nft/verify', authenticateToken as any, requireUser as any, async (req: any, res: Response) => {
  const { reference, signature } = req.body;
  if (!reference) {
    res.status(400).json({ error: 'Missing reference' });
    return;
  }

  try {
    if (signature) {
      const status = await solanaConnection.getSignatureStatus(signature);
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
        if (db.isConnected()) {
          await db.markNftPaid(req.user!.discordId, signature);
        }
        res.json({ success: true });
        return;
      }
    }
    res.json({ success: false, message: 'Payment not yet confirmed' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Link External Wallet via Signature
app.post('/api/auth/wallet/link', authenticateToken as any, requireUser as any, async (req: any, res: Response) => {
  const { address, signature, message } = req.body;
  if (!address || !signature || !message) {
    res.status(400).json({ error: 'Missing data' });
    return;
  }

  try {
    const pubKey = new PublicKey(address);
    let signatureUint8: Uint8Array;
    try {
      signatureUint8 = bs58.decode(signature);
    } catch {
      signatureUint8 = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    }

    const verified = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      signatureUint8,
      pubKey.toBytes()
    );

    if (!verified) throw new Error('Signature verification failed');

    if (db.isConnected()) {
      await db.upsertDegenIdentity({
        discord_id: req.user!.discordId,
        primary_external_address: address
      });
    }

    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ error: 'Failed to link wallet' });
  }
});

// Link Magic Wallet
app.post('/api/auth/magic/link', authenticateToken as any, requireUser as any, async (req: any, res: Response) => {
  const { didToken } = req.body;
  if (!didToken) {
    res.status(400).json({ error: 'Missing DID token' });
    return;
  }

  try {
    magicAdmin.token.validate(didToken);
    const metadata = await magicAdmin.users.getMetadataByToken(didToken);
    const publicAddress = metadata.publicAddress;

    if (db.isConnected()) {
      await db.upsertDegenIdentity({
        discord_id: req.user!.discordId,
        magic_address: publicAddress
      });
    }

    res.json({ success: true, address: publicAddress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to link Magic wallet' });
  }
});

// Get user profile
app.get('/api/user/:discordId', authenticateToken as any, requireUser as any, async (req: any, res: Response) => {
  const { discordId } = req.params;
  if (req.user!.discordId !== discordId && !isAdmin(req.user!)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    let user = await getUserData(discordId);
    if (!user) {
      user = createDefaultUserData(discordId, req.user!.username);
      if (db.isConnected()) await db.createUserStats(discordId, req.user!.username, null);
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update user preferences
app.put('/api/user/:discordId/preferences', authenticateToken as any, requireUser as any, async (req: any, res: Response) => {
  const { discordId } = req.params;
  const { preferences } = req.body;
  if (req.user!.discordId !== discordId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    let user = await getUserData(discordId);
    if (!user) user = createDefaultUserData(discordId, req.user!.username);

    user.preferences = { ...user.preferences, ...preferences };
    if (db.isConnected()) {
      await db.updateUserPreferences(discordId, {
        email_notifications: user.preferences.emailNotifications,
        tilt_warnings: user.preferences.tiltWarnings,
        trust_updates: user.preferences.trustUpdates,
        weekly_digest: user.preferences.weeklyDigest
      });
    }
    res.json({ success: true, preferences: user.preferences });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Activity feed
app.get('/api/user/:discordId/activity', authenticateToken as any, requireUser as any, async (req: any, res: Response) => {
  const { discordId } = req.params;
  const { limit = 10 } = req.query;
  if (req.user!.discordId !== discordId && !isAdmin(req.user!)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    const gameHistory = await db.getUserGameHistory(discordId, parseInt(limit as string));
    const activities: ActivityItem[] = gameHistory.map((game: any) => ({
      type: 'play',
      game: game.game_type,
      won: game.winner_id === discordId,
      timestamp: new Date(game.completed_at).getTime()
    }));

    const user = await getUserData(discordId);
    if (user) activities.push(...user.recentActivity);

    res.json({ activities: activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, parseInt(limit as string)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Trust metrics
app.get('/api/user/:discordId/trust', authenticateToken as any, requireUser as any, trustLimiter, async (req: any, res: Response) => {
  const { discordId } = req.params;
  if (req.user!.discordId !== discordId && !isAdmin(req.user!)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  try {
    const user = await getUserData(discordId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const dbStats = await db.getUserStats(discordId);
    const totalGames = dbStats?.total_games || 0;
    const totalWins = dbStats?.total_wins || 0;

    res.json({
      trustScore: user.trustScore,
      tiltLevel: user.tiltLevel,
      factors: {
        consistency: Math.min(100, 50 + totalGames * 2),
        community: Math.min(100, 50 + user.totalTips * 5),
        safety: Math.min(100, 80 + (100 - user.tiltLevel * 10)),
        engagement: Math.min(100, 50 + (totalGames > 0 ? (totalWins / totalGames) * 50 : 25))
      },
      stats: { totalGames, totalWins }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trust metrics' });
  }
});

// Middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    req.user = user;
    next();
  });
}

function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim());
function isAdmin(user: any): boolean {
  return user?.discordId && ADMIN_IDS.includes(user.discordId);
}

// Serve dashboard HTML
app.get('/dashboard', (_req, res) => {
  res.sendFile(join(__dirname, '../public/dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`🎯 User Dashboard service listening on port ${PORT}`);
});
