/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.USER_DASHBOARD_PORT || 3002;

// Mock data stores (replace with database in production)
const users = new Map();
const wallets = new Map();
const transactions = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'tiltcheck-user-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true in production with HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../public')));

// Discord OAuth setup
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || 'your-client-secret',
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3002/auth/discord/callback',
    scope: ['identify', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    // Save or update user
    users.set(profile.id, {
      id: profile.id,
      username: profile.username,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
      email: profile.email
    });
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.get(id);
  done(null, user || null);
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Profile routes
app.get('/api/profile', requireAuth, (req, res) => {
  const userId = req.user.id;
  const profile = {
    discord: req.user,
    qualifyfirst: {
      traits: { ageRange: '25-34', hasPets: true },
      earningsUSD: 127.50,
      completedSurveys: 15
    },
    wallets: Array.from(wallets.values()).filter(w => w.userId === userId),
    stats: {
      tipsSent: 23,
      tipsReceived: 18,
      surveysCompleted: 15,
      gamesPlayed: 7
    }
  };
  res.json(profile);
});

app.patch('/api/profile', requireAuth, (req, res) => {
  // Update profile
  res.json({ success: true, message: 'Profile updated' });
});

// Wallet routes
app.get('/api/wallets', requireAuth, (req, res) => {
  const userId = req.user.id;
  const userWallets = Array.from(wallets.values()).filter(w => w.userId === userId);
  res.json({ wallets: userWallets });
});

app.post('/api/wallets', requireAuth, (req, res) => {
  const { address, provider, signature } = req.body;
  const userId = req.user.id;
  
  const walletId = `${userId}-${Date.now()}`;
  const wallet = {
    id: walletId,
    userId,
    address,
    provider,
    verified: !!signature,
    isPrimary: wallets.size === 0,
    createdAt: new Date().toISOString()
  };
  
  wallets.set(walletId, wallet);
  res.json({ success: true, wallet });
});

app.patch('/api/wallets/:walletId/primary', requireAuth, (req, res) => {
  const { walletId } = req.params;
  const userId = req.user.id;
  
  // Set all wallets to non-primary
  wallets.forEach(w => {
    if (w.userId === userId) {
      w.isPrimary = false;
    }
  });
  
  // Set this wallet as primary
  const wallet = wallets.get(walletId);
  if (wallet && wallet.userId === userId) {
    wallet.isPrimary = true;
    wallets.set(walletId, wallet);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Wallet not found' });
  }
});

// Transaction history routes
app.get('/api/transactions', requireAuth, (req, res) => {
  // req.user.id available from requireAuth middleware
  const userTransactions = [
    {
      id: 'tx1',
      type: 'tip',
      direction: 'sent',
      amount: 10.00,
      token: 'SOL',
      to: 'user123',
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'tx2',
      type: 'withdrawal',
      direction: 'received',
      amount: 50.00,
      token: 'USDC',
      from: 'treasury',
      timestamp: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'tx3',
      type: 'tip',
      direction: 'received',
      amount: 5.00,
      token: 'SOL',
      from: 'user456',
      timestamp: new Date(Date.now() - 259200000).toISOString()
    }
  ];
  
  res.json({ transactions: userTransactions });
});

// Activity feed routes
app.get('/api/activity', requireAuth, (req, res) => {
  // req.user.id available from requireAuth middleware
  const activities = [
    {
      id: 'act1',
      type: 'survey_completed',
      module: 'qualifyfirst',
      description: 'Completed survey: Tech Product Preferences',
      earned: 3.50,
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'act2',
      type: 'tip_sent',
      module: 'justthetip',
      description: 'Tipped @DegenKing 10 SOL',
      timestamp: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'act3',
      type: 'game_played',
      module: 'dad',
      description: 'Played DA&D - Won round 3',
      points: 1,
      timestamp: new Date(Date.now() - 10800000).toISOString()
    }
  ];
  
  res.json({ activities });
});

// Preferences routes
app.get('/api/preferences', requireAuth, (req, res) => {
  res.json({
    notifications: {
      tipReceived: true,
      surveyMatch: true,
      gameInvite: false
    },
    privacy: {
      showProfile: true,
      showWallets: false,
      showActivity: true
    },
    display: {
      theme: 'dark',
      language: 'en'
    }
  });
});

app.patch('/api/preferences', requireAuth, (req, res) => {
  // Update preferences
  res.json({ success: true, message: 'Preferences updated' });
});

// QualifyFirst integration routes
app.get('/api/qualifyfirst/profile', requireAuth, (req, res) => {
  res.json({
    traits: {
      ageRange: '25-34',
      gender: 'male',
      income: '50k-75k',
      hasPets: true,
      occupation: 'software-engineer'
    },
    earningsUSD: 127.50,
    completedSurveys: 15,
    screenOuts: 3,
    matchConfidence: 0.82
  });
});

app.post('/api/qualifyfirst/withdraw', requireAuth, (req, res) => {
  const { amount } = req.body;
  
  if (amount < 5.00) {
    return res.status(400).json({ error: 'Minimum withdrawal is $5.00' });
  }
  
  // Emit withdrawal request event to JustTheTip
  res.json({
    success: true,
    message: 'Withdrawal request submitted',
    processingTime: '24 hours'
  });
});

// Server-Sent Events for real-time updates
app.get('/api/events', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    const event = {
      type: 'activity',
      data: {
        message: 'New activity detected',
        timestamp: new Date().toISOString()
      }
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }, 30000); // Every 30 seconds
  
  req.on('close', () => {
    clearInterval(interval);
  });
});

app.listen(PORT, () => {
  console.log(`👤 User Dashboard running on port ${PORT}`);
  console.log(`🔗 Discord OAuth: ${process.env.DISCORD_CALLBACK_URL || 'Not configured'}`);
});
