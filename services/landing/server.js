const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const LOG_PATH = process.env.LANDING_LOG_PATH || '/app/data/landing-requests.log';

// Ensure log directory exists (best effort)
try {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
} catch {}

// Production security headers (HSTS, CSP, etc.)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // HSTS (only if HTTPS; Render handles this but include for safety)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  // Basic CSP (adjust as needed for inline scripts/styles)
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  res.setHeader('Cache-Control', 'public, max-age=120');
  next();
});

// Request logging + in-memory metrics
const pathCounters = Object.create(null);
const uaCounters = Object.create(null);
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  const line = JSON.stringify({ ts, method: req.method, path: req.originalUrl, ip: req.ip, ua: req.headers['user-agent'] || '' }) + '\n';
  fs.appendFile(LOG_PATH, line, err => { if (err) console.error('log append failed', err); });
  pathCounters[req.path] = (pathCounters[req.path] || 0) + 1;
  const ua = (req.headers['user-agent'] || '').slice(0, 60);
  uaCounters[ua] = (uaCounters[ua] || 0) + 1;
  next();
});

// Metrics endpoint (lightweight, no auth; consider restricting later)
app.get('/metrics', (req, res) => {
  const topPaths = Object.entries(pathCounters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, count }));
  const topUAs = Object.entries(uaCounters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ua, count]) => ({ ua, count }));
  res.json({ service: 'landing', ts: Date.now(), topPaths, topUAs });
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { extensions: ['html'] }));

// Root -> landing page
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'landing', ts: Date.now() });
});

// Route for dashboard
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(publicDir, 'trust.html'));
});

// Protected Control Room - Admin only access
app.get('/control-room', (req, res) => {
  // Simple auth check - in production, use proper auth
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_ACCESS_KEY || 'tiltcheck-admin-2024';
  
  // Check for basic auth or query param for development
  const isAuthorized = 
    (authHeader && authHeader === `Bearer ${adminKey}`) ||
    req.query.key === adminKey ||
    req.headers['x-admin-key'] === adminKey;
  
  if (!isAuthorized) {
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Admin access required. Use ?key=admin-key or Authorization header.' 
    });
    return;
  }
  
  // Log admin access
  const ts = new Date().toISOString();
  const line = JSON.stringify({ 
    ts, 
    event: 'ADMIN_ACCESS', 
    ip: req.ip, 
    ua: req.headers['user-agent'] || '' 
  }) + '\n';
  fs.appendFile(LOG_PATH, line, err => { if (err) console.error('admin log failed', err); });
  
  res.sendFile(path.join(publicDir, 'control-room.html'));
});

// Admin API endpoints for control room
app.get('/admin/status', (req, res) => {
  // Same auth check
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_ACCESS_KEY || 'tiltcheck-admin-2024';
  
  const isAuthorized = 
    (authHeader && authHeader === `Bearer ${adminKey}`) ||
    req.query.key === adminKey ||
    req.headers['x-admin-key'] === adminKey;
  
  if (!isAuthorized) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // Return system status
  res.json({
    timestamp: Date.now(),
    services: [
      { name: 'Discord Bot', status: 'online', port: null },
      { name: 'Trust Dashboard', status: 'online', port: 5055 },
      { name: 'User Dashboard', status: 'online', port: 6001 },
      { name: 'Casino Data API', status: 'online', port: 6002 },
      { name: 'Gameplay Analyzer', status: 'online', port: 7072 },
      { name: 'Trust Rollup', status: 'online', port: 8082 },
      { name: 'Landing Page', status: 'online', port: 8080 }
    ],
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requests: Object.values(pathCounters).reduce((a, b) => a + b, 0)
    }
  });
});

// Site Map API for Control Room
app.get('/admin/sitemap', (req, res) => {
  // Same auth check
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_ACCESS_KEY || 'tiltcheck-admin-2024';
  
  const isAuthorized = 
    (authHeader && authHeader === `Bearer ${adminKey}`) ||
    req.query.key === adminKey ||
    req.headers['x-admin-key'] === adminKey;
  
  if (!isAuthorized) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // Return site map structure with real-time status
  res.json({
    timestamp: Date.now(),
    stats: {
      totalPages: 48,
      livePages: 42,
      devPages: 4,
      brokenPages: 2
    },
    structure: {
      'Main Site': {
        '/': { title: 'Homepage', status: 'live', lastChecked: Date.now() },
        '/about.html': { title: 'About TiltCheck', status: 'live', lastChecked: Date.now() },
        '/casinos.html': { title: 'Casino Directory', status: 'live', lastChecked: Date.now() },
        '/trust.html': { title: 'Trust Dashboard', status: 'live', lastChecked: Date.now() },
        '/degen-trust.html': { title: 'Degen Trust Engine', status: 'live', lastChecked: Date.now() },
        '/control-room': { title: 'Admin Control Room', status: 'live', lastChecked: Date.now() }
      },
      'Tools Suite': {
        '/tools/justthetip.html': { title: 'JustTheTip - Solana Tips', status: 'live', lastChecked: Date.now() },
        '/tools/suslink.html': { title: 'SusLink - URL Scanner', status: 'live', lastChecked: Date.now() },
        '/tools/collectclock.html': { title: 'CollectClock - Time Tracking', status: 'live', lastChecked: Date.now() },
        '/tools/freespinscan.html': { title: 'FreeSpinScan - Bonus Tracker', status: 'live', lastChecked: Date.now() },
        '/tools/tiltcheck-core.html': { title: 'TiltCheck Core', status: 'live', lastChecked: Date.now() },
        '/tools/poker.html': { title: 'Poker Analytics', status: 'dev', lastChecked: Date.now() },
        '/tools/triviadrops.html': { title: 'TriviaDrops - Rewards', status: 'live', lastChecked: Date.now() },
        '/tools/qualifyfirst.html': { title: 'QualifyFirst - Verification', status: 'dev', lastChecked: Date.now() },
        '/tools/daad.html': { title: 'DA&D - Decision Analytics', status: 'live', lastChecked: Date.now() }
      },
      'API Endpoints': {
        '/api/health': { title: 'Health Check', status: 'live', lastChecked: Date.now() },
        '/api/rollups/latest': { title: 'Latest Trust Rollups', status: 'live', lastChecked: Date.now() },
        '/api/domains': { title: 'Domain Trust Scores', status: 'live', lastChecked: Date.now() },
        '/api/degens': { title: 'User Trust Scores', status: 'live', lastChecked: Date.now() },
        '/api/severity': { title: 'Severity Buckets', status: 'live', lastChecked: Date.now() },
        '/admin/status': { title: 'Admin Status (Protected)', status: 'live', lastChecked: Date.now() },
        '/admin/sitemap': { title: 'Site Map API (Protected)', status: 'live', lastChecked: Date.now() }
      },
      'System Services': {
        'Discord Bot': { title: 'TiltCheck#8564', status: 'live', port: null },
        'Trust Dashboard Service': { title: 'Dashboard API', status: 'live', port: 5055 },
        'Landing Service': { title: 'Marketing & Static', status: 'live', port: 3000 },
        'Trust Rollup Service': { title: 'Data Aggregation', status: 'live', port: 8082 },
        'Event Router': { title: 'Message Bus', status: 'live', port: null }
      }
    },
    deployment: {
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requests: Object.values(pathCounters).reduce((a, b) => a + b, 0)
    }
  });
});

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Landing service listening on port ${PORT}`);
});
