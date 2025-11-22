// Modular landing server refactored for clarity.
const express = require('express');
const path = require('path');
const { loadConfig } = require('./lib/config');
const { buildAdminIPs, ipAllowlistMiddleware } = require('./lib/security');
const { initLogging } = require('./lib/logging');
const { getLatestCasinoCSVPath } = require('./lib/data-latest');
const { buildServiceStatus, buildSiteMap } = require('./lib/meta');

const cfg = loadConfig();
const PORT = cfg.PORT;
const LOG_PATH = cfg.LANDING_LOG_PATH;
const DATA_DIR = path.join(__dirname, '../../data');

const ADMIN_IPS = buildAdminIPs(cfg);
console.log('Admin IP Allowlist configured:', ADMIN_IPS);
const ipAllowlist = ipAllowlistMiddleware(ADMIN_IPS);
const { requestLogger, adminLogger, buildMetrics, pathCounters } = initLogging(LOG_PATH);

const app = express();
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (req.secure || req.headers['x-forwarded-for'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  res.setHeader('Cache-Control', 'public, max-age=120');
  next();
});

app.use(requestLogger);

app.get('/metrics', (_req, res) => {
  const m = buildMetrics();
  res.json({ service: 'landing', ts: Date.now(), topPaths: m.topPaths, topUAs: m.topUAs });
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('/data/casino_data_latest.csv', (_req, res) => {
  const latest = getLatestCasinoCSVPath(DATA_DIR);
  if (!latest) return res.status(404).send('No casino CSV found');
  res.sendFile(latest);
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'landing', ts: Date.now() });
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(publicDir, 'trust.html'));
});

app.get('/control-room', ipAllowlist, (req, res) => {
  adminLogger(req);
  res.sendFile(path.join(publicDir, 'control-room.html'));
});

app.get('/admin/status', ipAllowlist, (_req, res) => {
  res.json({
    timestamp: Date.now(),
    services: buildServiceStatus(),
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requests: Object.values(pathCounters).reduce((a, b) => a + b, 0)
    }
  });
});

app.get('/admin/sitemap', ipAllowlist, (_req, res) => {
  res.json({
    timestamp: Date.now(),
    stats: {
      totalPages: 48,
      livePages: 42,
      devPages: 4,
      brokenPages: 2
    },
    structure: buildSiteMap(),
    deployment: {
      environment: cfg.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requests: Object.values(pathCounters).reduce((a, b) => a + b, 0)
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Landing service listening on port ${PORT}`);
});
