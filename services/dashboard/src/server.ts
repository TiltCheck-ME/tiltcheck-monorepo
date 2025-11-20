import express from 'express';
import fs from 'fs';
import path from 'path';
import { dashboardState, pushEvent, addRiskAlert, getSparklineData } from './state.js';
import { createDailyEventWriter } from './rotation.js';
import { createDiscordNotifier } from './discord-notifier.js';

const POLL_INTERVAL_MS = parseInt(process.env.DASHBOARD_POLL_MS || '30000', 10);
const SNAPSHOT_DIR = path.join(process.cwd(), 'data');
const ROLLUP_FILE = path.join(SNAPSHOT_DIR, 'trust-rollups.json');
const DOMAIN_FILE = path.join(SNAPSHOT_DIR, 'domain-trust-scores.json');
const DEGEN_FILE = path.join(SNAPSHOT_DIR, 'justthetip-user-trust.json');
const DAILY_EVENTS_DIR = path.join(SNAPSHOT_DIR, 'events');
const KEEP_DAYS = parseInt(process.env.DASHBOARD_EVENTS_KEEP_DAYS || '7', 10);
const THROTTLE_WINDOW_MS = 5000; // mirror trust-rollup throttle

interface RollupsSnapshotFile { batches: any[] }

let latestRollup: any | undefined;
let domainScores: { domain: string; score: number }[] = [];
let degenScores: { userId: string; score: number }[] = [];

function evaluateRollupAlerts() {
  if (!latestRollup) return;
  const domain = latestRollup.domain?.domains || {};
  const casino = latestRollup.casino?.casinos || {};
  Object.entries(domain).forEach(([d, v]: any) => {
    if (v.totalDelta <= -40) {
      const alert = { kind: 'domain-delta' as const, entity: d, totalDelta: v.totalDelta, firstSeenTs: Date.now() };
      addRiskAlert(alert);
      discordNotifier.sendAlert(alert).catch(console.error);
    }
  });
  Object.entries(casino).forEach(([c, v]: any) => {
    if (v.totalDelta <= -25) {
      const alert = { kind: 'casino-delta' as const, entity: c, totalDelta: v.totalDelta, firstSeenTs: Date.now() };
      addRiskAlert(alert);
      discordNotifier.sendAlert(alert).catch(console.error);
    }
  });
}

function loadFiles() {
  try {
    if (fs.existsSync(ROLLUP_FILE)) {
      const raw = JSON.parse(fs.readFileSync(ROLLUP_FILE, 'utf-8')) as RollupsSnapshotFile;
      latestRollup = raw.batches[raw.batches.length - 1];
      dashboardState.windowStart = latestRollup?.domain?.windowStart;
      evaluateRollupAlerts();
    }
  } catch (err) { console.error('[Dashboard] Failed reading rollups', err); }
  try {
    if (fs.existsSync(DOMAIN_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DOMAIN_FILE, 'utf-8'));
      domainScores = raw.domains || [];
    }
  } catch (err) { console.error('[Dashboard] Failed reading domain scores', err); }
  try {
    if (fs.existsSync(DEGEN_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DEGEN_FILE, 'utf-8'));
      degenScores = raw.users || raw.userScores || [];
    }
  } catch (err) { /* optional file */ }
}

setInterval(loadFiles, POLL_INTERVAL_MS);
loadFiles();
const dailyWriter = createDailyEventWriter(DAILY_EVENTS_DIR, KEEP_DAYS);
const discordNotifier = createDiscordNotifier();
// Expose notifier to state module for anomaly alerts
(globalThis as any).__discordNotifier = discordNotifier;

// Load event router dynamically
let eventRouter: any = {};
async function initEventRouter() {
  try {
    const module: any = await import('@tiltcheck/event-router');
    eventRouter = module.eventRouter || module.default?.eventRouter || module.default || {};
  } catch (err) {
    console.warn('[Dashboard] Failed to load event-router:', err);
    eventRouter = (globalThis as any).eventRouter || {};
  }
  setupEventSubscriptions();
}

function setupEventSubscriptions() {
// Track snapshot requests/throttle heuristic
eventRouter.subscribe('trust.state.requested' as any, () => {
  if (dashboardState.lastSnapshotTs && Date.now() - dashboardState.lastSnapshotTs < THROTTLE_WINDOW_MS) {
    dashboardState.throttledCount += 1;
  }
}, 'dashboard');

eventRouter.subscribe('trust.state.snapshot' as any, () => {
  dashboardState.lastSnapshotTs = Date.now();
}, 'dashboard');

// Trust events subscription
['trust.domain.updated','trust.casino.updated','trust.degen.updated'].forEach(t => {
  eventRouter.subscribe(t as any, (evt: any) => {
    pushEvent(evt);
    // Append to daily log (store condensed form)
    const latest = dashboardState.events[dashboardState.events.length - 1];
    if (latest) {
      const payloadAny: any = (evt as any).data || {};
      dailyWriter.append({
        ts: latest.ts,
        type: latest.type,
        entity: latest.entity,
        delta: latest.delta,
        severity: latest.severity,
        reason: latest.reason,
        source: latest.source,
        eventId: (evt as any).id,
        category: payloadAny.category
      });
    }
    if (evt.type === 'trust.domain.updated') {
      const payload: any = evt.data;
      if (payload.severity >= 5 && payload.category !== 'malicious' && (payload.delta || 0) < 0) {
        const alert = { kind: 'critical-severity' as const, entity: payload.domain, severity: payload.severity, firstSeenTs: Date.now() };
        addRiskAlert(alert);
        discordNotifier.sendAlert(alert).catch(console.error);
      }
    }
  }, 'dashboard');
});
}

// Initialize event router asynchronously
initEventRouter().catch(console.error);

export function createServer(): any {
  const app = express();
  app.use(express.json());

  // SSE endpoint
  app.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('retry: 5000\n\n');

    // Send existing buffer snapshot immediately
    const snapshotPayload = JSON.stringify({ events: dashboardState.events });
    res.write(`event: init\n`);
    res.write(`data: ${snapshotPayload}\n\n`);

    // Flush heartbeat only (event streaming handled by client polling latest buffer)
    const interval = setInterval(() => {
      // heartbeat
      res.write(':heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // REST endpoints
  app.get('/api/rollups/latest', (_req, res) => {
    res.json(latestRollup || {});
  });

  app.get('/api/domains', (_req, res) => {
    res.json({ domains: domainScores });
  });

  app.get('/api/degens', (_req, res) => {
    res.json({ users: degenScores });
  });

  app.get('/api/health', (_req, res) => {
    const age = dashboardState.lastSnapshotTs ? Date.now() - dashboardState.lastSnapshotTs : null;
    res.json({
      lastSnapshotTs: dashboardState.lastSnapshotTs || null,
      snapshotAgeMs: age,
      throttledCount: dashboardState.throttledCount,
      eventBufferSize: dashboardState.events.length,
      windowStart: dashboardState.windowStart || null,
      retentionDays: KEEP_DAYS
    });
  });

  app.get('/api/config', (_req: any, res: any) => {
    res.json({
      pollIntervalMs: POLL_INTERVAL_MS,
      retentionDays: KEEP_DAYS,
      throttleWindowMs: THROTTLE_WINDOW_MS,
      snapshotDir: SNAPSHOT_DIR
    });
  });

  app.get('/api/severity', (_req, res) => {
    res.json({
      pollIntervalMs: POLL_INTERVAL_MS,
      retentionDays: KEEP_DAYS,
      throttleWindowMs: THROTTLE_WINDOW_MS,
      snapshotDir: SNAPSHOT_DIR
    });
  });

  app.get('/api/severity', (_req: any, res: any) => {
    res.json({ buckets: dashboardState.severityBuckets });
  });

  app.get('/api/alerts', (_req: any, res: any) => {
    res.json({ alerts: dashboardState.riskAlerts });
  });

  app.get('/api/sparklines', (_req: any, res: any) => {
    res.json(getSparklineData());
  });

  app.post('/api/request-snapshot', (_req: any, res: any) => {
    eventRouter.publish('trust.state.requested', 'dashboard', { reason: 'dashboard-request' }).catch(console.error);
    res.json({ ok: true });
  });

  // Persist event buffer periodically (simple overwrite; rotation by day can be added later)
  setInterval(() => {
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      const outPath = path.join(SNAPSHOT_DIR, 'trust-events-buffer.json');
      fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), events: dashboardState.events }, null, 2));
    } catch (err) {
      console.error('[Dashboard] Failed writing events buffer', err);
    }
  }, 60000);

  return app;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = parseInt(process.env.PORT || '5055', 10);
  const app = createServer();
  app.listen(port, () => console.log(`[Dashboard] Listening on ${port}`));
}
