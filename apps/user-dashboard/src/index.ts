import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { 
  verifySessionCookie, 
  getCookieConfig,
  type JWTConfig,
  type SessionData,
  type AuthenticatedRequest
} from '@tiltcheck/auth';
import rateLimit from 'express-rate-limit';
import { Magic } from '@magic-sdk/admin';
import { Connection } from '@solana/web3.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import type { Request, Response, NextFunction } from 'express';
import { db, DegenIdentity } from '@tiltcheck/database';
import { findUserByDiscordId, findOnboardingByDiscordId } from '@tiltcheck/db';

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
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
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
      avatar: user.discord_avatar || '',
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

app.get('/api/user/:discordId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const data = await getUserData(req.params.discordId);
  if (!data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

app.post('/api/user/onboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
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

app.get('/api/user/:discordId/trust', authenticateToken, trustLimiter, async (req: AuthenticatedRequest, res) => {
  const data = await getUserData(req.params.discordId);
  if (!data) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    trustScore: data.trustScore,
    tiltLevel: data.tiltLevel,
    factors: { consistency: 85, community: 70 }
  });
});

app.get('/api/user/:discordId/activity', authenticateToken, async (req: AuthenticatedRequest, res) => {
  // Mock activity for now
  res.json({
    activities: [
      { type: 'juice', description: 'Caught 0.05 SOL in /juice drop', timestamp: Date.now() - 3600000 },
      { type: 'tip', description: 'Received 0.1 SOL tip from @DegenMaster', timestamp: Date.now() - 86400000 }
    ]
  });
});

app.put('/api/user/:discordId/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  // Logic to save preferences to DB
  res.json({ success: true });
});

app.post('/api/auth/wallet/link', authenticateToken, async (req: AuthenticatedRequest, res) => {
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

app.post('/api/auth/magic/link', authenticateToken, async (req: AuthenticatedRequest, res) => {
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
app.post('/api/agent/query', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

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




app.get('/dashboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const discordId = req.user!.discordId;
  if (db.isConnected()) {
    try {
      const identity = await db.getDegenIdentity(discordId);
      if (!identity || !identity.tos_accepted) return res.redirect('/onboard.html');
    } catch (err) { console.warn('Onboarding check error:', err); }
  }
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