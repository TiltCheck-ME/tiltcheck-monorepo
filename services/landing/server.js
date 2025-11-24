// Modular landing server refactored for clarity.
const express = require('express');
const path = require('path');
const { loadConfig } = require('./lib/config');
const { buildAdminIPs, ipAllowlistMiddleware, initLogging } = require('@tiltcheck/express-utils');
const { getLatestCasinoCSVPath } = require('./lib/data-latest');
const { buildServiceStatus, buildSiteMap } = require('./lib/meta');
const { rateLimitMiddleware, initRateLimiter, closeRateLimiter } = require('./lib/rate-limiter');

const cfg = loadConfig();
const PORT = cfg.PORT;
const LOG_PATH = cfg.LANDING_LOG_PATH;
const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data & log paths exist early to avoid ENOENT on first requests
try { require('fs').mkdirSync(DATA_DIR, { recursive: true }); } catch {}
try { require('fs').mkdirSync(path.dirname(LOG_PATH), { recursive: true }); } catch {}
try { const fs = require('fs'); if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, ''); } catch (e) { console.warn('Log file init failed:', e.message); }

const ADMIN_IPS = buildAdminIPs(cfg);
console.log('Admin IP Allowlist configured:', ADMIN_IPS);
const ipAllowlist = ipAllowlistMiddleware(ADMIN_IPS);
const { requestLogger, adminLogger, buildMetrics, pathCounters } = initLogging(LOG_PATH);

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// Serve shared asset library (images, logos) under /assets without copying into public.
app.use('/assets', express.static(path.resolve(__dirname, '../../assets'), {
  immutable: true,
  maxAge: '7d'
}));

app.get('/data/casino_data_latest.csv', (_req, res) => {
  const latest = getLatestCasinoCSVPath(DATA_DIR);
  if (!latest) return res.status(404).send('No casino CSV found');
  res.sendFile(latest);
});

// Serve redesigned landing as root (index-v2.html replaces legacy index.html)
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index-v2.html'));
});
// Content pages
app.get('/about', (_req, res) => {
  res.sendFile(path.join(publicDir, 'about.html'));
});

// Newsletter unsubscribe endpoint (hashed)
app.post('/api/newsletter/unsubscribe', rateLimitMiddleware, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }
  const fs = require('fs');
  const crypto = require('node:crypto');
  const salt = process.env.NEWSLETTER_SALT || 'tiltcheck-salt';
  const filePath = path.join(DATA_DIR, 'newsletter-subscribers.json');
  let list = [];
  try { list = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { list = []; }
  let emailHash;
  try {
    emailHash = crypto.createHash('sha256').update(salt + ':' + email).digest('hex');
  } catch {
    if (globalThis.crypto && globalThis.crypto.subtle) {
      const enc = new TextEncoder().encode(salt + ':' + email);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', enc);
      emailHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    } else {
      return res.status(500).json({ ok:false, error:'Hash unavailable' });
    }
  }
  const before = list.length;
  list = list.filter(e => e.hash !== emailHash && e.email !== email);
  if (list.length === before) {
    return res.status(404).json({ ok: false, error: 'Not subscribed' });
  }
  try {
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Persist failed' });
  }
});

app.get('/how-it-works', (_req, res) => {
  res.sendFile(path.join(publicDir, 'how-it-works.html'));
});

app.get('/trust-explained', (_req, res) => {
  res.sendFile(path.join(publicDir, 'trust-explained.html'));
});

app.get('/contact', (_req, res) => {
  res.sendFile(path.join(publicDir, 'contact.html'));
});

app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});

app.get('/terms', (_req, res) => {
  res.sendFile(path.join(publicDir, 'terms.html'));
});

app.get('/faq', (_req, res) => {
  res.sendFile(path.join(publicDir, 'faq.html'));
});

app.get('/site-map', (_req, res) => {
  res.sendFile(path.join(publicDir, 'site-map.html'));
});

app.get('/search', (_req, res) => {
  res.sendFile(path.join(publicDir, 'search.html'));
});

app.get('/press-kit', (_req, res) => {
  res.sendFile(path.join(publicDir, 'press-kit.html'));
});

app.get('/newsletter', (_req, res) => {
  res.sendFile(path.join(publicDir, 'newsletter.html'));
});

app.get('/testimonials', (_req, res) => {
  res.sendFile(path.join(publicDir, 'testimonials.html'));
});

// Admin-only status page (ecosystem status & completion tracking)
app.get('/admin/ecosystem-status', ipAllowlist, (req, res) => {
  adminLogger(req);
  res.sendFile(path.join(publicDir, 'admin-status.html'));
});

// Admin analytics page
app.get('/admin/analytics', ipAllowlist, (req, res) => {
  adminLogger(req);
  res.sendFile(path.join(publicDir, 'admin-analytics.html'));
});

// Newsletter subscribe endpoint (hashed storage + migration)
app.post('/api/newsletter/subscribe', rateLimitMiddleware, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const honeypot = (req.body.website || '').trim();
  if (honeypot) return res.status(400).json({ ok: false, error: 'Bot detected' });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }
  const fs = require('fs');
  const crypto = require('node:crypto');
  const salt = process.env.NEWSLETTER_SALT || 'tiltcheck-salt';
  const filePath = path.join(DATA_DIR, 'newsletter-subscribers.json');
  let list = [];
  try { list = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { list = []; }
  // migrate legacy plain email entries
  let migrated = false;
  list = list.map(entry => {
    if (entry.email && !entry.hash) {
      try {
        const h = crypto.createHash('sha256').update(salt + ':' + entry.email.toLowerCase()).digest('hex');
        migrated = true;
        return { hash: h, ts: entry.ts || Date.now() };
      } catch { return entry; }
    }
    return entry;
  });
  // compute hash (fallback to WebCrypto)
  let emailHash;
  try {
    emailHash = crypto.createHash('sha256').update(salt + ':' + email).digest('hex');
  } catch {
    if (globalThis.crypto && globalThis.crypto.subtle) {
      const enc = new TextEncoder().encode(salt + ':' + email);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', enc);
      emailHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    } else {
      return res.status(500).json({ ok:false, error:'Hash unavailable' });
    }
  }
  if (list.some(e => e.hash === emailHash)) {
    return res.json({ ok: true, duplicate: true, migrated });
  }
  list.push({ hash: emailHash, ts: Date.now() });
  try {
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
    return res.json({ ok: true, migrated });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Persist failed' });
  }
});

// Sitemap XML (public) derived from buildSiteMap
app.get('/sitemap.xml', (_req, res) => {
  const fs = require('fs');
  const siteMap = buildSiteMap();
  const entries = [];
  const baseUrl = cfg.PUBLIC_BASE_URL || 'https://tiltcheck.example';
  const collect = (obj) => {
    Object.entries(obj).forEach(([key, val]) => {
      if (key.startsWith('/')) {
        // Try to derive mtime from file if it exists
        const filePath = path.join(publicDir, key === '/' ? 'index-v2.html' : key.replace(/^\//, ''));
        let lastmodIso = new Date(val.lastChecked).toISOString();
        try {
          const stat = fs.statSync(filePath);
          lastmodIso = stat.mtime.toISOString();
        } catch {/* ignore missing */}
        entries.push({ loc: baseUrl + key, lastmod: lastmodIso, changefreq: 'daily', priority: '0.7' });
      } else if (typeof val === 'object' && !val.loc && !val.title) {
        collect(val);
      }
    });
  };
  collect(siteMap);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(e => `<url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

app.get('/health', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'landing',
    ready: true,
    ts: Date.now(),
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMB: (mem.rss / 1024 / 1024).toFixed(2),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2)
    }
  });
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

// Admin logs endpoint - stream recent log entries
app.get('/admin/logs', ipAllowlist, (req, res) => {
  const fs = require('fs');
  const tail = parseInt(req.query.tail) || 100;
  
  try {
    const logData = fs.readFileSync(LOG_PATH, 'utf8');
    const lines = logData.trim().split('\n').filter(Boolean);
    const recentLines = lines.slice(-tail);
    const parsedLogs = recentLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
    res.json({ logs: parsedLogs, count: parsedLogs.length, tail });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({ logs: [], count: 0, message: 'Log file not yet created' });
    } else {
      res.status(500).json({ error: 'Failed to read logs', message: err.message });
    }
  }
});

// Custom 404 page for HTML requests; JSON fallback for API
app.use((req, res) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return res.status(404).sendFile(path.join(publicDir, '404.html'));
  }
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Initialize Redis rate limiter
initRateLimiter().catch(err => {
  console.warn('[Server] Rate limiter init failed, using in-memory fallback:', err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, closing connections...');
  await closeRateLimiter();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, closing connections...');
  await closeRateLimiter();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Landing service listening on port ${PORT}`);
});
