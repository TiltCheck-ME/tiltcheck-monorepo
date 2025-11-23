import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.CONTROL_ROOM_PORT || 3001;

// Trust System Configuration
// const TRUST_NFT_COLLECTION = process.env.TRUST_NFT_COLLECTION || 'your_nft_collection_address';
const REQUIRED_TRUST_LEVEL = process.env.REQUIRED_TRUST_LEVEL || 'admin'; // admin, moderator, viewer
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Mock trust database (replace with real DB)
const trustedUsers = new Map();
const walletRegistry = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'tiltcheck-control-room-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../public')));

// Discord OAuth Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || 'your-client-secret',
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3001/auth/discord/callback',
    scope: ['identify', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user has trust credentials
      const trustData = await checkUserTrust(profile.id);
      
      if (!trustData.isTrusted) {
        return done(null, false, { message: 'Insufficient trust level for Control Room access' });
      }
      
      const user = {
        id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        email: profile.email,
        trustLevel: trustData.level,
        walletAddress: trustData.walletAddress,
        nftBadge: trustData.nftBadge
      };
      
      trustedUsers.set(profile.id, user);
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = trustedUsers.get(id);
  done(null, user || null);
});

// Trust verification system
async function checkUserTrust(discordId) {
  // Step 1: Check if user has registered wallet
  const walletInfo = walletRegistry.get(discordId);
  
  if (!walletInfo) {
    return { isTrusted: false, reason: 'No wallet registered' };
  }
  
  // Step 2: Verify wallet ownership (signature must be valid)
  if (!walletInfo.verified) {
    return { isTrusted: false, reason: 'Wallet not verified' };
  }
  
  // Step 3: Check for NFT badge (Trust System Badge)
  const nftBadge = await checkNFTOwnership(walletInfo.address);
  
  if (!nftBadge) {
    return { isTrusted: false, reason: 'No Trust System Badge NFT found' };
  }
  
  // Step 4: Determine trust level from NFT metadata
  const trustLevel = nftBadge.attributes?.find(attr => attr.trait_type === 'role')?.value || 'viewer';
  
  // Step 5: Check if trust level meets requirement
  const levelHierarchy = { viewer: 1, moderator: 2, admin: 3 };
  const userLevel = levelHierarchy[trustLevel] || 0;
  const requiredLevel = levelHierarchy[REQUIRED_TRUST_LEVEL] || 3;
  
  if (userLevel < requiredLevel) {
    return { 
      isTrusted: false, 
      reason: `Insufficient trust level (have: ${trustLevel}, need: ${REQUIRED_TRUST_LEVEL})`
    };
  }
  
  return {
    isTrusted: true,
    level: trustLevel,
    walletAddress: walletInfo.address,
    nftBadge: nftBadge
  };
}

async function checkNFTOwnership(walletAddress) {
  try {
    // Query Solana for NFTs owned by wallet in Trust NFT Collection
    // This is a simplified version - production should use Metaplex or similar
    
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' }
        ]
      })
    });
    
    await response.json();
    
    // Check if any token accounts match our Trust NFT Collection
    // Production version should verify collection address and metadata
    
    // For now, return mock badge for testing
    if (process.env.NODE_ENV === 'development') {
      return {
        mint: 'mock-nft-mint',
        attributes: [
          { trait_type: 'role', value: 'admin' },
          { trait_type: 'trust_score', value: 100 }
        ]
      };
    }
    
    // Production: Parse actual NFT data
    return null;
  } catch (error) {
    console.error('NFT check error:', error);
    return null;
  }
}

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/access-denied' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/access-denied', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Denied</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; background: #0d1117; color: #c9d1d9; }
        .error { background: #161b22; padding: 2rem; border-radius: 8px; max-width: 500px; margin: 0 auto; }
        h1 { color: #f85149; }
        a { color: #58a6ff; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="error">
        <h1>🚫 Access Denied</h1>
        <p>You do not have sufficient trust credentials to access the Control Room.</p>
        <p><strong>Requirements:</strong></p>
        <ul style="text-align: left; max-width: 300px; margin: 1rem auto;">
          <li>✅ Discord account</li>
          <li>✅ Registered JustTheTip wallet</li>
          <li>✅ Verified wallet signature</li>
          <li>✅ Trust System Badge NFT (${REQUIRED_TRUST_LEVEL} level)</li>
        </ul>
        <p><a href="/">← Back to login</a></p>
      </div>
    </body>
    </html>
  `);
});

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({ 
    user: req.user,
    authenticated: true 
  });
});

// Wallet registration endpoint
app.post('/api/wallet/register', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { walletAddress, signature, message } = req.body;
  
  try {
    // Verify signature
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'base64');
    const publicKey = new PublicKey(walletAddress);
    
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Register wallet
    walletRegistry.set(req.user.id, {
      address: walletAddress,
      verified: true,
      registeredAt: new Date().toISOString()
    });
    
    // Re-check trust status
    const trustData = await checkUserTrust(req.user.id);
    
    res.json({
      success: true,
      wallet: walletAddress,
      trustStatus: trustData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth middleware for protected routes
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

const requireTrustLevel = (level) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const levelHierarchy = { viewer: 1, moderator: 2, admin: 3 };
    const userLevel = levelHierarchy[req.user.trustLevel] || 0;
    const requiredLevel = levelHierarchy[level] || 3;
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Insufficient trust level',
        have: req.user.trustLevel,
        need: level
      });
    }
    
    next();
  };
};

// System monitoring routes (require auth)
app.get('/api/system/status', requireAuth, async (req, res) => {
  try {
    const services = [
      'event-router', 'trust-engines', 'logging', 'pricing-oracle',
      'trust-rollup', 'reverse-proxy', 'landing', 'dashboard',
      'qualifyfirst', 'ai-gateway', 'collectclock', 'control-room', 'user-dashboard'
    ];
    
    const status = await Promise.all(services.map(async (service) => {
      try {
        const { stdout } = await execAsync(`pgrep -f "services/${service}" || echo "0"`);
        const pid = stdout.trim();
        return {
          name: service,
          status: pid !== '0' ? 'running' : 'stopped',
          pid: pid !== '0' ? pid : null
        };
      } catch {
        return { name: service, status: 'unknown', pid: null };
      }
    }));
    
    res.json({ services: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system/metrics', requireAuth, async (req, res) => {
  try {
    const { stdout: loadAvg } = await execAsync('uptime');
    const { stdout: memInfo } = await execAsync('free -m');
    const { stdout: diskInfo } = await execAsync('df -h /');
    
    res.json({
      loadAverage: loadAvg.match(/load average: (.+)/)?.[1] || 'N/A',
      memory: memInfo,
      disk: diskInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process management routes (require admin)
app.post('/api/process/restart/:service', requireTrustLevel('admin'), async (req, res) => {
  try {
    const { service } = req.params;
    const servicePath = path.join(__dirname, '../../', service);
    
    // Kill existing process
    await execAsync(`pkill -f "services/${service}" || true`);
    
    // Start new process
    await execAsync(`cd ${servicePath} && npm start &`);
    
    // Log admin action
    console.log(`[ADMIN ACTION] ${req.user.username} restarted ${service}`);
    
    res.json({ success: true, message: `${service} restarted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/process/kill-all', requireTrustLevel('admin'), async (req, res) => {
  try {
    await execAsync('pkill -f "services/" || true');
    
    // Log admin action
    console.log(`[ADMIN ACTION] ${req.user.username} killed all services`);
    
    res.json({ success: true, message: 'All services killed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/process/logs/:service', requireAuth, async (req, res) => {
  try {
    const { service } = req.params;
    const logPath = path.join(__dirname, '../../', service, 'logs', 'app.log');
    
    try {
      const logs = await fs.readFile(logPath, 'utf-8');
      res.json({ logs: logs.split('\n').slice(-100).join('\n') });
    } catch {
      res.json({ logs: 'No logs available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Documentation routes (require auth)
app.get('/api/docs/list', requireAuth, async (req, res) => {
  try {
    const docsPath = path.join(__dirname, '../../../docs');
    const files = await fs.readdir(docsPath);
    const docs = files.filter(f => f.endsWith('.md'));
    res.json({ documents: docs });
  } catch (error) {
    res.status(500).json({ error: error.message, documents: [] });
  }
});

app.get('/api/docs/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const docPath = path.join(__dirname, '../../../docs', filename);
    const content = await fs.readFile(docPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'Document not found' });
  }
});

// AI Terminal route (require moderator+)
app.post('/api/ai/chat', requireTrustLevel('moderator'), async (req, res) => {
  const { message } = req.body;
  
  // Log moderator action
  console.log(`[AI TERMINAL] ${req.user.username}: ${message}`);
  
  res.json({
    response: `AI Terminal: I received your request: "${message}". This would be processed by the AI Gateway to generate code changes or execute commands.`,
    suggestions: [
      'Show system status',
      'Restart all services',
      'View error logs'
    ]
  });
});

// Command usage feed (SSE) - require auth
app.get('/api/feed/commands', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    const data = {
      timestamp: new Date().toISOString(),
      command: ['/tip', '/qualify', '/play', '/scan'][Math.floor(Math.random() * 4)],
      user: `user${Math.floor(Math.random() * 100)}`,
      module: ['justthetip', 'qualifyfirst', 'dad', 'suslink'][Math.floor(Math.random() * 4)]
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 5000);
  
  req.on('close', () => {
    clearInterval(interval);
  });
});

// WebSocket for real-time updates
wss.on('connection', (ws, req) => {
  // Only allow authenticated WebSocket connections
  // In production, verify session/token here
  console.log('Control room client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      ws.send(JSON.stringify({ type: 'ack', data }));
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Control room client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🎛️  Control Room running on port ${PORT}`);
  console.log(`🔒 Trust System Auth: Discord + Wallet + NFT Badge`);
  console.log(`📛 Required Trust Level: ${REQUIRED_TRUST_LEVEL}`);
});
