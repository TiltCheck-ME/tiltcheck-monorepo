/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { fileURLToPath, pathToFileURL } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import {
  createJob,
  getJobById,
  getJobList,
  getReportConfig,
  startReportWorker,
} from './report-requests.js';
import { registerDirectorRoutes } from './trivia-director.js';

// Payout admin package (file-backed ledger + simple worker)
import * as payout from '@tiltcheck/prize-payout';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
app.set('trust proxy', true);

const PORT = process.env.CONTROL_ROOM_PORT || process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const DISCORD_CLIENT_ID = process.env.TILT_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.TILT_DISCORD_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET;
const DISCORD_AUTH_ENABLED = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);
const CONTROL_ROOM_ALLOWED_IPS = (process.env.CONTROL_ROOM_ALLOWED_IPS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);
const API_BASE_URL = (
  process.env.CONTROL_ROOM_API_URL
  || process.env.API_BASE_URL
  || 'http://localhost:8080'
).replace(/\/$/, '');

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  throw new Error('[control-room] ADMIN_PASSWORD and SESSION_SECRET env vars are required');
}

// Admin whitelist — set ADMIN_DISCORD_IDS as comma-separated Discord user IDs
const ADMIN_WHITE_LIST = (process.env.ADMIN_DISCORD_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

function normalizeIpAddress(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }
  return trimmed;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return normalizeIpAddress(forwarded.split(',')[0]);
  }

  return normalizeIpAddress(req.socket?.remoteAddress || req.ip || '');
}

function sendIpForbidden(req, res) {
  const message = 'Forbidden: Control Room IP allowlist rejected this request';
  if ((req.headers.accept || '').includes('text/html')) {
    res.status(403).send(message);
    return;
  }

  res.status(403).json({ error: message });
}

// Known containers in the TiltCheck stack
const KNOWN_CONTAINERS = [
  { name: 'discord-bot', label: 'Discord Bot', icon: '🤖' },
  { name: 'api', label: 'API', icon: '🔌' },
  { name: 'dashboard', label: 'Dashboard', icon: '📊' },
  { name: 'user-dashboard', label: 'User Dashboard', icon: '👤' },
  { name: 'control-room', label: 'Control Room', icon: '🎛️' },
  { name: 'game-arena', label: 'Game Arena', icon: '🎮' },
  { name: 'trust-rollup', label: 'Trust Rollup', icon: '🔒' },
  { name: 'landing', label: 'Landing Page', icon: '🌐' },
  { name: 'reverse-proxy', label: 'Reverse Proxy', icon: '🔀' },
  { name: 'redis', label: 'Redis', icon: '🗄️' },
];

// ─── Passport Configuration ────────────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (DISCORD_AUTH_ENABLED) {
  passport.use(new DiscordStrategy({
      clientID: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3001/auth/discord/callback',
      scope: ['identify', 'guilds', 'guilds.members.read']
  }, (accessToken, refreshToken, profile, done) => {
      const isWhitelisted = ADMIN_WHITE_LIST.includes(profile.id);

      if (isWhitelisted) {
          return done(null, profile);
      }

      return done(null, false, { message: 'Unauthorized: Discord ID not in whitelist.' });
  }));
} else {
  console.warn('[control-room] Discord OAuth disabled because client credentials are missing');
}

// ─── Middleware ────────────────────────────────────────────────────────────────

// Block common vulnerability scans
app.use((req, res, next) => {
  if (req.path === '/xmlrpc.php') {
    return res.status(404).send('Not Found');
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'control-room.sid',
  secret: SESSION_SECRET,
  proxy: true,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd ? 'auto' : false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (req.path === '/health' || CONTROL_ROOM_ALLOWED_IPS.length === 0) {
    next();
    return;
  }

  const clientIp = getClientIp(req);
  if (CONTROL_ROOM_ALLOWED_IPS.includes(clientIp)) {
    next();
    return;
  }

  console.warn(`[control-room] Rejected request from IP ${clientIp || 'unknown'} for ${req.method} ${req.path}`);
  sendIpForbidden(req, res);
});

app.use(express.static(path.join(__dirname, '../public')));

const requireAuth = (req, res, next) => {
  // Support both session auth (legacy) and passport auth
  if (req.session.authenticated || req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized: Clearance Level 2 Required' });
};

function redirectAuthFailure(res, reason = 'unauthorized') {
  res.redirect(`/?error=${encodeURIComponent(reason)}`);
}

function getPrivilegedActor(req) {
  const ipAddress = getClientIp(req) || null;

  if (req.user) {
    return {
      actorId: String(req.user.id || 'discord-admin'),
      actorLabel: req.user.username || 'discord-admin',
      authMode: 'discord-oauth',
      ipAddress,
    };
  }

  if (req.session?.authenticated) {
    return {
      actorId: ipAddress ? `password:${ipAddress}` : 'password-session',
      actorLabel: 'admin-password',
      authMode: 'admin-password',
      ipAddress,
    };
  }

  return {
    actorId: ipAddress ? `anonymous:${ipAddress}` : 'anonymous',
    actorLabel: 'anonymous',
    authMode: 'anonymous',
    ipAddress,
  };
}

function auditPrivilegedAction(req, action, metadata = {}) {
  const actor = getPrivilegedActor(req);
  console.info('[control-room][audit]', {
    action,
    actorId: actor.actorId,
    actorLabel: actor.actorLabel,
    authMode: actor.authMode,
    ipAddress: actor.ipAddress,
    method: req.method,
    path: req.path,
    ...metadata,
  });
}

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.get('/auth/discord', (req, res, next) => {
  if (!DISCORD_AUTH_ENABLED) {
    res.status(503).json({ error: 'Discord OAuth is not configured for Control Room' });
    return;
  }

  req.session.oauthStateRequestedAt = Date.now();
  req.session.save((error) => {
    if (error) {
      console.error('[control-room] Failed to persist OAuth session before redirect:', error);
      redirectAuthFailure(res, 'oauth_session');
      return;
    }

    passport.authenticate('discord')(req, res, next);
  });
});

app.get('/auth/discord/callback', (req, res, next) => {
  if (!DISCORD_AUTH_ENABLED) {
    res.status(503).json({ error: 'Discord OAuth is not configured for Control Room' });
    return;
  }

  passport.authenticate('discord', (error, user, info) => {
    if (error) {
      console.error('[control-room] Discord OAuth callback failed:', error);
      redirectAuthFailure(res, 'oauth_state');
      return;
    }

    if (!user) {
      const reason = info?.message === 'Unauthorized: Discord ID not in whitelist.'
        ? 'unauthorized'
        : 'oauth_state';
      redirectAuthFailure(res, reason);
      return;
    }

    req.logIn(user, (loginError) => {
      if (loginError) {
        console.error('[control-room] Discord login session failed:', loginError);
        redirectAuthFailure(res, 'oauth_session');
        return;
      }

      res.redirect('/');
    });
  })(req, res, next);
});

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    auditPrivilegedAction(req, 'auth.login', { outcome: 'success' });
    res.json({ success: true });
  } else {
    auditPrivilegedAction(req, 'auth.login', { outcome: 'denied' });
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
      if (err) {
        auditPrivilegedAction(req, 'auth.logout', { outcome: 'error', error: err.message });
        res.status(500).json({ error: 'Logout failed' });
        return;
      }
      auditPrivilegedAction(req, 'auth.logout', { outcome: 'success' });
      req.session.destroy();
      res.json({ success: true });
   });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ 
      authenticated: !!req.session.authenticated || req.isAuthenticated(),
      user: req.user ? { id: req.user.id, username: req.user.username } : null,
      discordAuthEnabled: DISCORD_AUTH_ENABLED,
   });
});

// ─── Channel Report Requests ─────────────────────────────────────────────────────
app.get('/api/report-requests/config', requireAuth, (req, res) => {
  res.json({
    ...getReportConfig(),
    authMode: {
      discordWhitelistEnabled: ADMIN_WHITE_LIST.length > 0,
      discordOAuthEnabled: DISCORD_AUTH_ENABLED,
      passwordEnabled: Boolean(ADMIN_PASSWORD),
      ipAllowlistEnabled: CONTROL_ROOM_ALLOWED_IPS.length > 0,
    },
  });
});

app.get('/api/report-requests', requireAuth, (req, res) => {
  res.json({ jobs: getJobList() });
});

app.get('/api/report-requests/:id', requireAuth, (req, res) => {
  const job = getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Report job not found' });
    return;
  }

  res.json({ job });
});

app.post('/api/report-requests', requireAuth, (req, res) => {
  try {
    const createdBy = req.user?.username || 'admin-password';
    const job = createJob({ ...req.body, createdBy });
    auditPrivilegedAction(req, 'report-request.create', {
      outcome: 'success',
      jobId: job.id,
      createdBy,
    });
    res.status(202).json({ job });
  } catch (error) {
    auditPrivilegedAction(req, 'report-request.create', {
      outcome: 'error',
      error: error.message,
    });
    res.status(400).json({ error: error.message });
  }
});

// ─── Prize Payout Admin Endpoints ─────────────────────────────────────────────

app.get('/api/payouts', requireAuth, (req, res) => {
  try {
    auditPrivilegedAction(req, 'payouts.list');
    const list = payout.listPayouts({ dir: process.env.CONTROL_ROOM_DATA_DIR });
    res.json({ payouts: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payouts/:id', requireAuth, (req, res) => {
  try {
    auditPrivilegedAction(req, 'payouts.get', { payoutId: req.params.id });
    const p = payout.getPayout(req.params.id, { dir: process.env.CONTROL_ROOM_DATA_DIR });
    if (!p) return res.status(404).json({ error: 'Payout not found' });
    res.json({ payout: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payouts/:id/retry', requireAuth, (req, res) => {
  try {
    auditPrivilegedAction(req, 'payouts.retry', { payoutId: req.params.id });
    const p = payout.retryPayout(req.params.id, { dir: process.env.CONTROL_ROOM_DATA_DIR });
    res.json({ payout: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payouts/reconcile', requireAuth, (req, res) => {
  try {
    auditPrivilegedAction(req, 'payouts.reconcile');
    const result = payout.reconcilePayouts({ dir: process.env.CONTROL_ROOM_DATA_DIR });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── Docker Helpers ───────────────────────────────────────────────────────────
// Trivia moderation endpoints (internal + UI)
import {
  listCandidates as _listCandidates,
  getCandidate as _getCandidate,
  createCandidate as _createCandidate,
  publishCandidate as _publishCandidate,
} from './trivia-moderation.js';

// Internal submission endpoint: accepts x-internal-secret header or requireAuth
app.post('/api/internal/trivia-candidates', async (req, res) => {
  const secret = process.env.INTERNAL_API_SECRET || '';
  const provided = req.headers['x-internal-secret'] || '';
  if (!req.session.authenticated && !req.isAuthenticated() && secret) {
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized: invalid internal secret' });
    }
  }

  try {
    const { candidate } = req.body || {};
    if (!candidate || typeof candidate !== 'object') return res.status(400).json({ error: 'candidate required' });
    const created = _createCandidate(candidate);
    auditPrivilegedAction(req, 'trivia.create', { outcome: 'success', id: created.id, generatedBy: created.generatedBy });
    res.status(201).json({ created });
  } catch (error) {
    auditPrivilegedAction(req, 'trivia.create', { outcome: 'error', error: error.message });
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/trivia-candidates', requireAuth, (req, res) => {
  try {
    const list = _listCandidates();
    res.json({ candidates: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trivia-candidates/:id', requireAuth, (req, res) => {
  try {
    const job = _getCandidate(req.params.id);
    if (!job) return res.status(404).json({ error: 'candidate not found' });
    res.json({ candidate: job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trivia-candidates/:id/publish', requireAuth, (req, res) => {
  try {
    const published = _publishCandidate(req.params.id, req.user?.username || req.session?.authenticated ? 'admin' : 'moderator');
    auditPrivilegedAction(req, 'trivia.publish', { outcome: 'success', id: published.id });
    res.json({ published });
  } catch (error) {
    auditPrivilegedAction(req, 'trivia.publish', { outcome: 'error', error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// ─── Docker Helpers ────────────────────────────────────────────────────────────
function sanitizeContainer(name) {
  if (typeof name !== 'string') return null;
  return /^[a-zA-Z0-9_-]+$/.test(name) ? name : null;
}

async function getDockerContainers() {
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}|{{.ID}}"'
    );
    const map = new Map();
    stdout.trim().split('\n').filter(Boolean).forEach(line => {
      const [name, status, image, ports, id] = line.split('|');
      map.set(name, { name, status, image, ports, id });
    });
    return map;
  } catch {
    return new Map();
  }
}

async function getDockerStats() {
  try {
    const { stdout } = await execAsync(
      'docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}"'
    );
    const map = new Map();
    stdout.trim().split('\n').filter(Boolean).forEach(line => {
      const [name, cpu, mem, memPerc, net, block] = line.split('|');
      map.set(name, { cpu, mem, memPerc, net, block });
    });
    return map;
  } catch {
    return new Map();
  }
}

// ─── System Status ─────────────────────────────────────────────────────────────
app.get('/api/system/status', requireAuth, async (req, res) => {
  try {
    const [containers, statsMap] = await Promise.all([
      getDockerContainers(),
      getDockerStats(),
    ]);

    const known = new Set(KNOWN_CONTAINERS.map(c => c.name));
    const services = KNOWN_CONTAINERS.map(({ name, label, icon }) => {
      const info = containers.get(name);
      const stats = statsMap.get(name);
      const isRunning = info?.status?.toLowerCase().startsWith('up');
      return {
        name, label, icon,
        status: info ? (isRunning ? 'running' : 'stopped') : 'missing',
        statusText: info?.status || 'not found',
        image: info?.image || null,
        ports: info?.ports || null,
        id: info?.id ? info.id.substring(0, 12) : null,
        cpu: stats?.cpu || null,
        mem: stats?.mem || null,
        memPerc: stats?.memPerc || null,
        net: stats?.net || null,
        block: stats?.block || null,
      };
    });

    // Include extra unlisted containers
    containers.forEach((info, name) => {
      if (!known.has(name)) {
        const stats = statsMap.get(name);
        const isRunning = info.status?.toLowerCase().startsWith('up');
        services.push({
          name, label: name, icon: '📦',
          status: isRunning ? 'running' : 'stopped',
          statusText: info.status,
          image: info.image,
          ports: info.ports,
          id: info.id ? info.id.substring(0, 12) : null,
          cpu: stats?.cpu || null,
          mem: stats?.mem || null,
          memPerc: stats?.memPerc || null,
          net: stats?.net || null,
          block: stats?.block || null,
        });
      }
    });

    res.json({ services, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── System Metrics ────────────────────────────────────────────────────────────
app.get('/api/system/metrics', requireAuth, async (req, res) => {
  try {
    const results = await Promise.allSettled([
      execAsync('uptime -p 2>/dev/null || uptime'),
      execAsync('cat /proc/loadavg 2>/dev/null || sysctl -n vm.loadavg'),
      execAsync("free -m 2>/dev/null | awk 'NR==2{printf \"%sMB / %sMB (%.0f%%)\", $3,$2,$3*100/$2}'"),
      execAsync("df -h / | awk 'NR==2{print $3\"/\"$2\" (\"$5\")'"),
      execAsync('docker version --format "{{.Server.Version}}" 2>/dev/null'),
    ]);

    const val = (r) => r.status === 'fulfilled' ? r.value.stdout?.trim() : 'N/A';

    let running = 0, stopped = 0, total = 0;
    try {
      const { stdout } = await execAsync('docker ps -a --format "{{.Status}}"');
      const lines = stdout.trim().split('\n').filter(Boolean);
      total = lines.length;
      running = lines.filter(s => s.toLowerCase().startsWith('up')).length;
      stopped = total - running;
    } catch { /* ignore */ }

    res.json({
      uptime: val(results[0]),
      loadAverage: val(results[1]),
      memory: val(results[2]),
      disk: val(results[3]),
      dockerVersion: val(results[4]),
      containers: { total, running, stopped },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ai/status', requireAuth, async (_req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/health/ai`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      res.status(response.status).json({
        error: `AI status upstream returned ${response.status}`,
        details: body.slice(0, 300),
      });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach API AI status endpoint',
      details: error.message,
      upstream: `${API_BASE_URL}/health/ai`,
    });
  }
});

// ─── Container Actions ─────────────────────────────────────────────────────────
app.post('/api/container/:action/:name', requireAuth, async (req, res) => {
  const { action, name } = req.params;
  const safeName = sanitizeContainer(name);
  if (!safeName) return res.status(400).json({ error: 'Invalid container name' });

  let command;
  switch (action) {
    case 'restart':
      command = `docker restart ${safeName}`;
      break;
    case 'stop':
      command = `docker stop ${safeName}`;
      break;
    case 'start':
      command = `docker start ${safeName}`;
      break;
    case 'kill':
      command = `docker kill ${safeName}`;
      break;
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const { stdout, stderr } = await execAsync(command);
    auditPrivilegedAction(req, `container.${action}`, {
      outcome: 'success',
      target: safeName,
    });
    res.json({ success: true, output: (stdout + stderr).trim() });
  } catch (error) {
    auditPrivilegedAction(req, `container.${action}`, {
      outcome: 'error',
      target: safeName,
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/restart-all', requireAuth, async (req, res) => {
  try {
    const names = KNOWN_CONTAINERS.map(c => c.name).join(' ');
    const { stdout } = await execAsync(`docker restart ${names} 2>&1`);
    auditPrivilegedAction(req, 'containers.restart-all', {
      outcome: 'success',
      targets: KNOWN_CONTAINERS.map(c => c.name),
    });
    res.json({ success: true, output: stdout.trim() });
  } catch (error) {
    auditPrivilegedAction(req, 'containers.restart-all', {
      outcome: 'error',
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

// ─── Container Logs (REST) ─────────────────────────────────────────────────────
app.get('/api/logs/:name', requireAuth, async (req, res) => {
  const safe = sanitizeContainer(req.params.name);
  if (!safe) return res.status(400).json({ error: 'Invalid container name' });

  const lines = Math.min(parseInt(req.query.lines) || 150, 500);
  try {
    const { stdout } = await execAsync(`docker logs --tail ${lines} --timestamps ${safe} 2>&1`);
    res.json({ logs: stdout.trim(), container: safe });
  } catch (error) {
    res.status(500).json({ error: error.message, logs: '' });
  }
});

// ─── Live Log Stream (SSE) ─────────────────────────────────────────────────────
app.get('/api/logs/:name/stream', requireAuth, (req, res) => {
  const safe = sanitizeContainer(req.params.name);
  if (!safe) return res.status(400).json({ error: 'Invalid container name' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const child = spawn('docker', ['logs', '--follow', '--tail', '50', '--timestamps', safe], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const send = (chunk) => {
    chunk.toString().split('\n').filter(Boolean).forEach(line => {
      res.write(`data: ${JSON.stringify({ line })}\n\n`);
    });
  };

  child.stdout.on('data', send);
  child.stderr.on('data', send);
  child.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ line: `[error] ${err.message}` })}\n\n`);
  });

  req.on('close', () => child.kill());
});

// ─── Docker Compose Actions ────────────────────────────────────────────────────
app.post('/api/compose/:action', requireAuth, async (req, res) => {
  const { action } = req.params;
  const allowed = ['up', 'down', 'ps', 'pull'];
  if (!allowed.includes(action)) return res.status(400).json({ error: 'Invalid action' });

  const composeDir = process.env.COMPOSE_DIR || '/app';
  try {
    const cmd = action === 'up'
      ? `cd ${composeDir} && docker compose up -d 2>&1`
      : `cd ${composeDir} && docker compose ${action} 2>&1`;
    const { stdout } = await execAsync(cmd);
    auditPrivilegedAction(req, `compose.${action}`, {
      outcome: 'success',
      composeDir,
    });
    res.json({ success: true, output: stdout.trim() });
  } catch (error) {
    auditPrivilegedAction(req, `compose.${action}`, {
      outcome: 'error',
      composeDir,
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

// ─── WebSocket — live stats broadcast every 5s ─────────────────────────────────
let statsInterval = null;

function startStatsBroadcast() {
  if (statsInterval) return;
  statsInterval = setInterval(async () => {
    if (wss.clients.size === 0) return;
    try {
      const [containers, statsMap] = await Promise.all([getDockerContainers(), getDockerStats()]);
      const payload = JSON.stringify({
        type: 'stats',
        containers: Object.fromEntries(containers),
        stats: Object.fromEntries(statsMap),
        ts: Date.now(),
      });
      wss.clients.forEach(ws => { if (ws.readyState === 1) ws.send(payload); });
    } catch { /* ignore */ }
  }, 5000);
}

wss.on('connection', (ws) => {
  startStatsBroadcast();
  ws.on('close', () => {
    if (wss.clients.size === 0 && statsInterval) {
      clearInterval(statsInterval);
      statsInterval = null;
    }
  });
});

// ─── Director's Booth (Live Trivia HQ) ─────────────────────────────────────────
registerDirectorRoutes(app, requireAuth);

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));

startReportWorker();

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  server.listen(PORT, () => {
    console.log(`🎛️  Control Room running on port ${PORT}`);
    console.log(`🐳 Docker-aware monitoring enabled`);
    
  });
}

export { app, server, sanitizeContainer, normalizeIpAddress, getPrivilegedActor, auditPrivilegedAction };
