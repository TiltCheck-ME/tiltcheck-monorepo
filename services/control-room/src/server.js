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

server.listen(PORT, () => {
  console.log(`🎛️  Control Room running on port ${PORT}`);
  console.log(`🔒 Admin password: ${ADMIN_PASSWORD}`);
});
