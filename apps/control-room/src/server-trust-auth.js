/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.CONTROL_ROOM_PORT || process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProd ? (() => { throw new Error('ADMIN_PASSWORD is required in production'); })() : 'admin123');
const SESSION_SECRET = process.env.SESSION_SECRET || (isProd ? (() => { throw new Error('SESSION_SECRET is required in production'); })() : 'tiltcheck-control-room-secret');

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

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(express.static(path.join(__dirname, '../public')));

const requireAuth = (req, res, next) => {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ─── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
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

// ─── Container Actions ─────────────────────────────────────────────────────────
app.post('/api/container/:action/:name', requireAuth, async (req, res) => {
  const { action, name } = req.params;
  const safe = sanitizeContainer(name);
  if (!safe) return res.status(400).json({ error: 'Invalid container name' });

  const allowed = ['restart', 'stop', 'start', 'kill'];
  if (!allowed.includes(action)) return res.status(400).json({ error: 'Invalid action' });

  try {
    const { stdout, stderr } = await execAsync(`docker ${action} ${safe}`);
    console.log(`[CONTROL ROOM] docker ${action} ${safe}`);
    res.json({ success: true, output: (stdout + stderr).trim() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/containers/restart-all', requireAuth, async (req, res) => {
  try {
    const names = KNOWN_CONTAINERS.map(c => c.name).join(' ');
    const { stdout } = await execAsync(`docker restart ${names} 2>&1`);
    res.json({ success: true, output: stdout.trim() });
  } catch (error) {
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
    res.json({ success: true, output: stdout.trim() });
  } catch (error) {
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

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  server.listen(PORT, () => {
    console.log(`🎛️  Control Room running on port ${PORT}`);
    console.log(`🐳 Docker-aware monitoring enabled`);
    console.log(`🔒 Set ADMIN_PASSWORD env var (default: admin123 — change this!)`);
  });
}

export { app, server, sanitizeContainer };
