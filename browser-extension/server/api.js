/**
 * TiltGuard Browser Extension - Backend API Server
 * Provides REST endpoints for dashboard, vault, wallet, and session management
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.TILTGUARD_API_PORT || 3333;

// Initialize Supabase client (if credentials provided)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️  Supabase not configured - using in-memory storage');
}

// Data directory
const DATA_DIR = join(dirname(__dirname), '..', 'data', 'tiltguard-extension');
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory storage (for demo - use database in production)
let users = new Map();
let vaults = new Map();
let sessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'tiltguard-api',
    timestamp: new Date().toISOString(),
    users: users.size,
    vaults: vaults.size,
    sessions: sessions.size
  });
});

// ==================== AUTHENTICATION ====================
app.post('/api/auth/guest', async (req, res) => {
  const userId = `guest_${Date.now()}`;
  
  // If Supabase is configured, use database
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({ id: userId, username: 'Guest', tier: 'free' })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create vault entry
      await supabase
        .from('vaults')
        .insert({ user_id: userId, balance: 0, locked: false });
      
      return res.json({ 
        success: true,
        token: `token_${userId}`,
        user: data 
      });
    } catch (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Fallback to in-memory storage
  const user = {
    id: userId,
    username: req.body.username || 'Guest',
    tier: 'free',
    isGuest: true,
    createdAt: Date.now()
  };
  users.set(userId, user);
  
  res.json({
    success: true,
    user,
    token: `token_${userId}`
  });
});

// Discord OAuth - Step 1: Redirect to Discord
app.get('/api/auth/discord', (req, res) => {
  const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3333'}/api/auth/discord/callback`;
  const clientId = process.env.DISCORD_CLIENT_ID || '1419742988128616479';
  const scope = 'identify guilds';
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  
  console.log('Redirecting to Discord OAuth:', discordAuthUrl);
  res.redirect(discordAuthUrl);
});

// Discord OAuth - Step 2: Handle callback and exchange code for token
app.get('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('<h1>Error: No authorization code received</h1>');
  }

  try {
    const clientId = process.env.DISCORD_CLIENT_ID || '1419742988128616479';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:3333'}/api/auth/discord/callback`;

    if (!clientSecret) {
      throw new Error('DISCORD_CLIENT_SECRET not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Discord token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();
    console.log('Got Discord access token');

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Discord user info');
    }

    const discordUser = await userResponse.json();
    console.log('Discord user:', discordUser.username + '#' + discordUser.discriminator);

    const userId = `discord_${discordUser.id}`;
    
    // Save to database if Supabase is configured
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .upsert({ 
            id: userId,
            discord_id: discordUser.id,
            username: `${discordUser.username}#${discordUser.discriminator}`,
            tier: 'free'
          }, { onConflict: 'discord_id' })
          .select()
          .single();

        if (error) throw error;

        // Create vault if doesn't exist
        await supabase
          .from('vaults')
          .upsert({ user_id: userId, balance: 0, locked: false }, { onConflict: 'user_id' });

        console.log('Saved to database:', data);
      } catch (dbError) {
        console.error('Database error (continuing anyway):', dbError);
      }
    }
    
    // Fallback to in-memory
    const user = {
      id: userId,
      username: `${discordUser.username}#${discordUser.discriminator}`,
      discordId: discordUser.id,
      avatar: discordUser.avatar,
      tier: 'free',
      isGuest: false,
      createdAt: Date.now()
    };
    users.set(userId, user);

    // Send token back to extension
    const token = `token_${userId}`;
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Discord Login Success</title></head>
      <body>
        <h1>✅ Login Successful!</h1>
        <p>Authenticated as: <strong>${user.username}</strong></p>
        <p>This window will close automatically...</p>
        <script>
          // Send token to extension
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'discord-auth',
              token: '${token}',
              user: ${JSON.stringify(user)}
            }, '*');
          }
          // Close window after 2 seconds
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.status(500).send(`<h1>Authentication Error</h1><p>${error.message}</p>`);
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const userId = token.replace('token_', '');
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user });
});

// ==================== VAULT API ====================
app.get('/api/vault/:userId', (req, res) => {
  const { userId } = req.params;
  const vault = vaults.get(userId) || {
    userId,
    balance: 0,
    locked: false,
    unlockAt: null,
    transactions: []
  };
  
  res.json({ vault });
});

app.post('/api/vault/:userId/deposit', (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  
  let vault = vaults.get(userId) || {
    userId,
    balance: 0,
    locked: false,
    unlockAt: null,
    transactions: []
  };
  
  vault.balance += amount;
  vault.transactions.push({
    type: 'deposit',
    amount,
    timestamp: Date.now()
  });
  
  vaults.set(userId, vault);
  
  res.json({
    success: true,
    vault,
    message: `Deposited $${amount.toFixed(2)} to vault`
  });
});

app.post('/api/vault/:userId/withdraw', (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;
  
  let vault = vaults.get(userId);
  
  if (!vault) {
    return res.status(404).json({ error: 'Vault not found' });
  }
  
  if (vault.locked && vault.unlockAt && vault.unlockAt > Date.now()) {
    return res.status(403).json({ error: 'Vault is locked', unlockAt: vault.unlockAt });
  }
  
  if (amount > vault.balance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  vault.balance -= amount;
  vault.transactions.push({
    type: 'withdraw',
    amount,
    timestamp: Date.now()
  });
  
  vaults.set(userId, vault);
  
  res.json({
    success: true,
    vault,
    message: `Withdrew $${amount.toFixed(2)} from vault`
  });
});

app.post('/api/vault/:userId/lock', (req, res) => {
  const { userId } = req.params;
  const { duration } = req.body; // in hours
  
  let vault = vaults.get(userId) || {
    userId,
    balance: 0,
    locked: false,
    unlockAt: null,
    transactions: []
  };
  
  const unlockAt = Date.now() + (duration * 60 * 60 * 1000);
  vault.locked = true;
  vault.unlockAt = unlockAt;
  
  vaults.set(userId, vault);
  
  res.json({
    success: true,
    vault,
    message: `Vault locked for ${duration} hours`
  });
});

// ==================== WALLET API ====================
app.get('/api/wallet/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Demo wallet data
  res.json({
    wallets: [
      {
        id: 'wallet_1',
        provider: 'phantom',
        address: 'So1...abc',
        balance: 12.45,
        isPrimary: true
      }
    ]
  });
});

// ==================== DASHBOARD API ====================
app.get('/api/dashboard/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const vault = vaults.get(userId) || { balance: 0 };
  const userSessions = Array.from(sessions.values()).filter(s => s.userId === userId);
  
  res.json({
    user,
    stats: {
      totalSessions: userSessions.length,
      totalBets: userSessions.reduce((sum, s) => sum + (s.totalBets || 0), 0),
      totalWagered: userSessions.reduce((sum, s) => sum + (s.totalWagered || 0), 0),
      totalWins: userSessions.reduce((sum, s) => sum + (s.totalWins || 0), 0),
      vaultBalance: vault.balance,
      tiltScore: 25, // Demo value
      riskLevel: 'safe'
    },
    recentSessions: userSessions.slice(-5).reverse()
  });
});

// ==================== SESSION API ====================
app.post('/api/session', (req, res) => {
  const sessionId = `session_${Date.now()}`;
  const session = {
    id: sessionId,
    userId: req.body.userId,
    startTime: Date.now(),
    totalBets: 0,
    totalWagered: 0,
    totalWins: 0,
    currentBalance: 0,
    events: []
  };
  
  sessions.set(sessionId, session);
  
  res.json({
    success: true,
    session
  });
});

app.patch('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  let session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Update session stats
  session = { ...session, ...req.body };
  sessions.set(sessionId, session);
  
  res.json({
    success: true,
    session
  });
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ session });
});

// ==================== PREMIUM API ====================
app.get('/api/premium/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['Basic tilt monitoring', 'Session tracking', 'Manual vault']
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 9.99,
        features: ['AI insights', 'Auto-vault', 'Advanced analytics', 'Priority support']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 19.99,
        features: ['Everything in Premium', 'Custom alerts', 'API access', 'White-label options']
      }
    ]
  });
});

app.post('/api/premium/upgrade', (req, res) => {
  const { userId, plan } = req.body;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  user.tier = plan;
  users.set(userId, user);
  
  res.json({
    success: true,
    user,
    message: `Upgraded to ${plan} tier`
  });
});

// ==================== LICENSE API ====================
app.get('/api/license/verify', (req, res) => {
  const { domain } = req.query;
  
  // Demo license verification
  const trustedDomains = ['stake.com', 'bovada.lv', 'draftkings.com'];
  const isLegitimate = trustedDomains.some(d => domain?.includes(d));
  
  res.json({
    isLegitimate,
    domain,
    licenseInfo: isLegitimate ? {
      authority: 'Curaçao eGaming',
      number: 'CEG-001-2024',
      verified: true
    } : null,
    verdict: isLegitimate ? 'Licensed' : 'Unlicensed or Unknown'
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`\n🎰 TiltGuard API Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/:userId`);
  console.log(`🔒 Vault: http://localhost:${PORT}/api/vault/:userId`);
  console.log(`💰 Wallet: http://localhost:${PORT}/api/wallet/:userId`);
  console.log(`✨ Premium: http://localhost:${PORT}/api/premium/plans`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
