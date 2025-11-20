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

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Landing service listening on port ${PORT}`);
});
