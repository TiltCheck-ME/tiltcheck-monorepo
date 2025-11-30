import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.CONTROL_ROOM_PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'tiltcheck-control-room-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true in production with HTTPS
}));
app.use(express.static(path.join(__dirname, '../public')));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    req.session.user = 'admin';
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

// System monitoring routes
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

// Process management routes
app.post('/api/process/restart/:service', requireAuth, async (req, res) => {
  try {
    const { service } = req.params;
    const servicePath = path.join(__dirname, '../../', service);
    
    // Kill existing process
    await execAsync(`pkill -f "services/${service}" || true`);
    
    // Start new process
    await execAsync(`cd ${servicePath} && npm start &`);
    
    res.json({ success: true, message: `${service} restarted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/process/kill-all', requireAuth, async (req, res) => {
  try {
    await execAsync('pkill -f "services/" || true');
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
      res.json({ logs: logs.split('\n').slice(-100).join('\n') }); // Last 100 lines
    } catch {
      res.json({ logs: 'No logs available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Documentation routes
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

// AI Terminal route
app.post('/api/ai/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  
  // Mock AI response - integrate with AI Gateway in production
  res.json({
    response: `AI Terminal: I received your request: "${message}". This would be processed by the AI Gateway to generate code changes or execute commands.`,
    suggestions: [
      'Show system status',
      'Restart all services',
      'View error logs'
    ]
  });
});

// Command usage feed (SSE)
app.get('/api/feed/commands', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send periodic updates
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
wss.on('connection', (ws) => {
  console.log('Control room client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Echo back for now
      ws.send(JSON.stringify({ type: 'ack', data }));
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Control room client disconnected');
  });
});

// =============================================
// Analytics API Endpoints
// =============================================

// Analytics configuration constants
const CLICK_CLUSTER_TOLERANCE = 3; // Percentage tolerance for clustering nearby clicks
const MAX_ANALYTICS_EVENTS = 50000; // Maximum events to keep in memory

// In-memory analytics storage (would use database in production)
const analyticsEvents = [];
const betaSignups = [];
const sessions = new Map();
const heatmaps = new Map();

// Record analytics events
app.post('/api/analytics', (req, res) => {
  const { events, siteId } = req.body;
  
  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid events' });
  }
  
  events.forEach(event => {
    event.siteId = siteId || 'tiltcheck';
    event.receivedAt = Date.now();
    analyticsEvents.push(event);
    
    // Update session
    let session = sessions.get(event.sessionId);
    if (!session) {
      session = {
        id: event.sessionId,
        userId: event.userId,
        startTime: event.timestamp,
        pageViews: 0,
        events: 0,
        pages: [],
        isBeta: false
      };
      sessions.set(event.sessionId, session);
    }
    session.events++;
    session.endTime = event.timestamp;
    
    if (event.type === 'pageview') {
      session.pageViews++;
      if (event.data?.path && !session.pages.includes(event.data.path)) {
        session.pages.push(event.data.path);
      }
    }
    
    // Update heatmap for clicks
    if (event.type === 'click' && event.data) {
      const page = event.page || '/';
      let heatmap = heatmaps.get(page);
      if (!heatmap) {
        heatmap = { page, clicks: [], totalViews: 0 };
        heatmaps.set(page, heatmap);
      }
      
      const x = Math.round((event.data.x / event.data.viewportWidth) * 100);
      const y = Math.round((event.data.y / event.data.viewportHeight) * 100);
      
      const existing = heatmap.clicks.find(c => 
        Math.abs(c.x - x) < CLICK_CLUSTER_TOLERANCE && Math.abs(c.y - y) < CLICK_CLUSTER_TOLERANCE
      );
      
      if (existing) {
        existing.count++;
      } else {
        heatmap.clicks.push({ x, y, count: 1, element: event.data.element });
      }
    }
  });
  
  // Trim old events
  if (analyticsEvents.length > MAX_ANALYTICS_EVENTS) {
    analyticsEvents.splice(0, analyticsEvents.length - MAX_ANALYTICS_EVENTS);
  }
  
  res.json({ success: true, received: events.length });
});

// Get analytics summary
app.get('/api/analytics/summary', requireAuth, (req, res) => {
  const range = req.query.range || '24h';
  const now = Date.now();
  
  const ranges = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': now
  };
  
  const startTime = now - (ranges[range] || ranges['24h']);
  
  const relevantEvents = analyticsEvents.filter(e => e.timestamp >= startTime);
  const pageViews = relevantEvents.filter(e => e.type === 'pageview');
  const sessionIds = new Set(relevantEvents.map(e => e.sessionId));
  const userIds = new Set(relevantEvents.filter(e => e.userId).map(e => e.userId));
  
  // Top pages
  const pageCounts = {};
  pageViews.forEach(pv => {
    const path = pv.data?.path || pv.page || '/';
    pageCounts[path] = (pageCounts[path] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, views]) => ({ page, views }));
  
  // Events by type
  const eventsByType = {};
  relevantEvents.forEach(e => {
    eventsByType[e.type] = (eventsByType[e.type] || 0) + 1;
  });
  
  res.json({
    totalPageViews: pageViews.length,
    uniqueSessions: sessionIds.size,
    uniqueUsers: userIds.size,
    topPages,
    eventsByType,
    feedbackCount: relevantEvents.filter(e => e.type === 'feedback').length,
    betaUsers: betaSignups.length,
    range,
    timestamp: now
  });
});

// Get heatmap data
app.get('/api/analytics/heatmap/:page', requireAuth, (req, res) => {
  const page = '/' + (req.params.page || '');
  const heatmap = heatmaps.get(page);
  
  if (!heatmap) {
    return res.json({ page, clicks: [], totalViews: 0 });
  }
  
  res.json(heatmap);
});

// Get all heatmaps
app.get('/api/analytics/heatmaps', requireAuth, (req, res) => {
  res.json(Array.from(heatmaps.values()));
});

// Get feedback
app.get('/api/analytics/feedback', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const feedback = analyticsEvents
    .filter(e => e.type === 'feedback')
    .slice(-limit)
    .reverse();
  
  res.json(feedback);
});

// Get sessions
app.get('/api/analytics/sessions', requireAuth, (req, res) => {
  const activeCutoff = Date.now() - 30 * 60 * 1000; // 30 minutes
  const allSessions = Array.from(sessions.values());
  
  const active = allSessions.filter(s => (s.endTime || s.startTime) > activeCutoff);
  const recent = allSessions.slice(-100);
  
  res.json({
    total: allSessions.length,
    active: active.length,
    recent
  });
});

// =============================================
// Beta Signup API
// =============================================

app.post('/api/beta/signup', (req, res) => {
  const { email, discord, interests, experience, feedbackStyle, referrer, source } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Check for duplicate
  if (betaSignups.find(s => s.email === email)) {
    return res.status(409).json({ error: 'Already signed up' });
  }
  
  const signup = {
    id: `beta_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    email,
    discord,
    interests: interests || [],
    experience,
    feedbackStyle,
    referrer,
    source,
    createdAt: Date.now(),
    status: 'pending'
  };
  
  betaSignups.push(signup);
  
  // Track signup event
  analyticsEvents.push({
    id: `evt_${Date.now()}`,
    type: 'beta_signup',
    timestamp: Date.now(),
    sessionId: req.body.sessionId || 'unknown',
    page: '/beta',
    data: { email, interests, source }
  });
  
  console.log(`[Beta] New signup: ${email}`);
  
  res.json({ success: true, id: signup.id });
});

// Get beta signups (admin only)
app.get('/api/beta/signups', requireAuth, (req, res) => {
  res.json({
    total: betaSignups.length,
    signups: betaSignups.slice(-100).reverse()
  });
});

// Export analytics data
app.get('/api/analytics/export', requireAuth, (req, res) => {
  const data = {
    exportedAt: new Date().toISOString(),
    events: analyticsEvents.slice(-10000),
    sessions: Array.from(sessions.values()),
    heatmaps: Array.from(heatmaps.values()),
    betaSignups
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.json');
  res.json(data);
});

server.listen(PORT, () => {
  console.log(`🎛️  Control Room running on port ${PORT}`);
  console.log(`📊 Analytics dashboard: http://localhost:${PORT}/analytics.html`);
  console.log(`🔒 Admin password: ${ADMIN_PASSWORD}`);
});
