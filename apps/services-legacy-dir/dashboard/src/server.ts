import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  } catch (_err) { /* optional file */ }
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
  // Static dashboard front-end
  // Try services/dashboard/public relative to CWD first (monorepo context)
  // Then try public relative to this file's location (standalone context)
  const possiblePaths = [
    path.join(process.cwd(), 'services', 'dashboard', 'public'),
    path.join(process.cwd(), 'public'),
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
  ];
  const DASHBOARD_PUBLIC_DIR = possiblePaths.find(p => fs.existsSync(p));
  
  if (DASHBOARD_PUBLIC_DIR) {
    app.use('/dashboard', express.static(DASHBOARD_PUBLIC_DIR, {}));
    app.get('/dashboard', (_req, res) => {
      res.sendFile(path.join(DASHBOARD_PUBLIC_DIR, 'index.html'));
    });
  }
  // Gauge config file path (publicly served static copy + API mutation capability)
  const GAUGE_CONFIG_PATH = path.join(process.cwd(), 'services', 'dashboard', 'public', 'config', 'gauge-config.json');
  function readGaugeConfig(){
    try {
      if(fs.existsSync(GAUGE_CONFIG_PATH)){
        return JSON.parse(fs.readFileSync(GAUGE_CONFIG_PATH,'utf-8'));
      }
    } catch(_err){ /* ignore */ }
    return {
      volatilityInvertMax: 100,
      midSeverityPenalty: 1,
      highSeverityPenalty: 1,
      refreshMs: 15000
    };
  }
  function writeGaugeConfig(patch: any){
    const current = readGaugeConfig();
    const allowedKeys = ['volatilityInvertMax','midSeverityPenalty','highSeverityPenalty','refreshMs'];
    const next: any = { ...current };
    allowedKeys.forEach(k => {
      if(Object.prototype.hasOwnProperty.call(patch,k)){
        const v = patch[k];
        if(typeof v === 'number' && isFinite(v)){
          // basic bounds
          if(k === 'refreshMs') next[k] = Math.max(3000, Math.min(600000, v));
          else next[k] = Math.max(0, Math.min(100000, v));
        }
      }
    });
    try {
      fs.mkdirSync(path.dirname(GAUGE_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(GAUGE_CONFIG_PATH, JSON.stringify(next, null, 2));
      return next;
    } catch(_err){ return current; }
  }

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

  // Gauge config exposure (runtime introspection)
  app.get('/api/config/gauges', (_req: any, res: any) => {
    res.json({ config: readGaugeConfig() });
  });
  app.patch('/api/config/gauges', (req: any, res: any) => {
    // Simple token gating (future multi-tenant role system placeholder)
    const token = process.env.GAUGE_ADMIN_TOKEN || '';
    if(token){
      const provided = (req.headers['x-admin-token'] || '').toString();
      if(provided !== token){
        return res.status(403).json({ ok:false, error:'forbidden' });
      }
    }
    const updated = writeGaugeConfig(req.body || {});
    res.json({ ok:true, config: updated });
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

  /**
   * Region-aware (stub) legal rights evaluation endpoint.
   * Returns mock triggers derived from current casino rollup + risk alerts.
   * IMPORTANT: This is NOT legal advice; only transparency signals.
   * Query params:
   *   region = ISO country/region code (e.g. CA, US, EU)
   *   casino = casino identifier present in rollups
   */
  app.get('/api/legal-rights/evaluate', (req: any, res: any) => {
    const region = (req.query.region || 'unknown').toString().toUpperCase();
    const casinoId = (req.query.casino || '').toString();
    const casinoMap: any = latestRollup?.casino?.casinos || {};
    const casinoData = casinoId ? casinoMap[casinoId] : undefined;

    const triggers: Array<{ code: string; evidenceCount: number; severity: number; detail?: string }> = [];

    // Simple heuristic stubs
    if (casinoData) {
      const delta = casinoData.totalDelta || 0;
      const score = casinoData.lastScore || 0;
      // Payout delay suspicion (negative performance spikes)
      if (delta < -15) {
        triggers.push({ code: 'PAYOUT_DELAY', evidenceCount: Math.min(Math.abs(Math.round(delta / 5)), 5), severity: delta < -30 ? 3 : 2, detail: `Recent totalDelta ${delta}` });
      }
      // Fairness / audit anomaly (low score)
      if (score < 40) {
        triggers.push({ code: 'FAIRNESS_ANOMALY', evidenceCount: 1, severity: 3, detail: `Score below threshold (${score})` });
      }
    }

    // Derive from existing risk alerts
    const relatedAlerts = dashboardState.riskAlerts.filter(a => a.entity === casinoId);
    if (relatedAlerts.length) {
      triggers.push({ code: 'RECENT_CRITICAL_ALERT', evidenceCount: relatedAlerts.length, severity: 3 });
    }

    // Region-specific placeholder (future rule expansion)
    if (region === 'CA') { // Example: highlight consumer protection angle
      triggers.push({ code: 'REGION_CONSUMER_PROTECTION', evidenceCount: 1, severity: 1 });
    }
    if (region === 'EU') {
      triggers.push({ code: 'REGION_KYC_COMPLIANCE', evidenceCount: 1, severity: 1 });
    }

    const advisoryBase = 'Pattern may violate consumer payout or fairness expectations; retain logs and evidence chain.';
    const disclaimer = 'This is not legal advice. It is an automated transparency signal based on public heuristic rules.';

    res.json({
      region,
      casino: casinoId || null,
      triggers,
      advisory: triggers.length ? advisoryBase : 'No notable rights triggers at this time.',
      disclaimer,
      generatedAt: new Date().toISOString()
    });
  });

  /**
   * Evidence package endpoint (stub).
   * Aggregates recent alerts, rollup deltas, severity buckets, and optional legal triggers.
   * Query params:
   *   casino (optional) - filter alerts and rollup entry
   *   region (optional) - passed to legal rights evaluation for contextual triggers
   */
  app.get('/api/evidence/package', (req: any, res: any) => {
    const casinoId = (req.query.casino || '').toString();
    const region = (req.query.region || 'unknown').toString();
    const casinoMap: any = latestRollup?.casino?.casinos || {};
    const chosenCasino = casinoId ? casinoMap[casinoId] : undefined;
    const alerts = dashboardState.riskAlerts.filter(a => !casinoId || a.entity === casinoId);
    const severityBuckets = dashboardState.severityBuckets;
    // Reuse legal rights logic via internal call (simulate)
    const legalResp: any = {};
    try {
      // direct function invocation rather than HTTP (avoid nesting express)
      const casinoData = casinoId ? casinoMap[casinoId] : undefined;
      const triggers: any[] = [];
      if (casinoData) {
        const delta = casinoData.totalDelta || 0;
        const score = casinoData.lastScore || 0;
        if (delta < -15) triggers.push({ code:'PAYOUT_DELAY', evidenceCount:Math.min(Math.abs(Math.round(delta/5)),5), severity: delta < -30 ? 3 : 2 });
        if (score < 40) triggers.push({ code:'FAIRNESS_ANOMALY', evidenceCount:1, severity:3 });
      }
      const relatedAlerts = alerts.filter(a => a.entity === casinoId);
      if (relatedAlerts.length) triggers.push({ code:'RECENT_CRITICAL_ALERT', evidenceCount: relatedAlerts.length, severity:3 });
      if (region.toUpperCase() === 'CA') triggers.push({ code:'REGION_CONSUMER_PROTECTION', evidenceCount:1, severity:1 });
      if (region.toUpperCase() === 'EU') triggers.push({ code:'REGION_KYC_COMPLIANCE', evidenceCount:1, severity:1 });
      legalResp.region = region.toUpperCase();
      legalResp.casino = casinoId || null;
      legalResp.triggers = triggers;
    } catch (_e) {
      legalResp.error = 'legal_rights_stub_failed';
    }
    const evidence = {
      generatedAt: new Date().toISOString(),
      region: region.toUpperCase(),
      casino: casinoId || null,
      rollup: chosenCasino ? { totalDelta: chosenCasino.totalDelta, lastScore: chosenCasino.lastScore } : null,
      alerts,
      severityBuckets,
      legalRights: legalResp,
      advisory: 'This package is an automated transparency artifact; preserve original logs for any formal dispute.'
    };
    res.json(evidence);
  });

  // Persist evidence packages (POST) and list/retrieve endpoints
  const EVIDENCE_DIR = path.join(SNAPSHOT_DIR, 'evidence-packages');
  function ensureEvidenceDir(){ if(!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true }); }
  const EVIDENCE_RETENTION_DAYS = parseInt(process.env.EVIDENCE_RETENTION_DAYS || '14', 10);
  const EVIDENCE_MAX_COUNT = parseInt(process.env.EVIDENCE_MAX_COUNT || '150', 10);

  function pruneEvidencePackages(){
    try {
      ensureEvidenceDir();
      const files = fs.readdirSync(EVIDENCE_DIR).filter(f=>f.endsWith('.json'));
      const now = Date.now();
      const retentionMs = EVIDENCE_RETENTION_DAYS * 86400000;
      const parsed = files.map(f => {
        // id format: <epoch>-<rand>
        const tsPart = parseInt(f.split('-')[0], 10);
        const ts = Number.isFinite(tsPart) ? tsPart : fs.statSync(path.join(EVIDENCE_DIR, f)).mtime.getTime();
        return { file: f, ts };
      });
      // Age-based pruning
      parsed.filter(p => (now - p.ts) > retentionMs).forEach(p => {
        try { fs.unlinkSync(path.join(EVIDENCE_DIR, p.file)); } catch(_err){ /* ignore */ }
      });
      // Count-based pruning
      const remaining = fs.readdirSync(EVIDENCE_DIR).filter(f=>f.endsWith('.json'));
      if(remaining.length > EVIDENCE_MAX_COUNT){
        const again = remaining.map(f => {
          const tsPart = parseInt(f.split('-')[0], 10);
          const ts = Number.isFinite(tsPart) ? tsPart : fs.statSync(path.join(EVIDENCE_DIR, f)).mtime.getTime();
          return { file: f, ts };
        }).sort((a,b)=>a.ts - b.ts); // oldest first
        const toRemove = again.slice(0, again.length - EVIDENCE_MAX_COUNT);
        toRemove.forEach(p => { try { fs.unlinkSync(path.join(EVIDENCE_DIR, p.file)); } catch(_err){ /* ignore */ } });
      }
    } catch(_err){ /* silent prune errors */ }
  }

  app.post('/api/evidence/package', (req: any, res: any) => {
    const { casino, region } = req.body || {};
    const now = Date.now();
    // Reuse generation logic by simulating internal call
    const casinoId = (casino || '').toString();
    const regionCode = (region || 'unknown').toString();
    const casinoMap: any = latestRollup?.casino?.casinos || {};
    const chosenCasino = casinoId ? casinoMap[casinoId] : undefined;
    const alerts = dashboardState.riskAlerts.filter(a => !casinoId || a.entity === casinoId);
    const severityBuckets = dashboardState.severityBuckets;
    const triggers: any[] = [];
    if (chosenCasino) {
      const delta = chosenCasino.totalDelta || 0;
      const score = chosenCasino.lastScore || 0;
      if (delta < -15) triggers.push({ code:'PAYOUT_DELAY', evidenceCount:Math.min(Math.abs(Math.round(delta/5)),5), severity: delta < -30 ? 3 : 2 });
      if (score < 40) triggers.push({ code:'FAIRNESS_ANOMALY', evidenceCount:1, severity:3 });
    }
    const relatedAlerts = alerts.filter(a => a.entity === casinoId);
    if (relatedAlerts.length) triggers.push({ code:'RECENT_CRITICAL_ALERT', evidenceCount: relatedAlerts.length, severity:3 });
    if (regionCode.toUpperCase() === 'CA') triggers.push({ code:'REGION_CONSUMER_PROTECTION', evidenceCount:1, severity:1 });
    if (regionCode.toUpperCase() === 'EU') triggers.push({ code:'REGION_KYC_COMPLIANCE', evidenceCount:1, severity:1 });
    const pkg = {
      id: `${now}-${Math.random().toString(36).slice(2,8)}`,
      generatedAt: new Date(now).toISOString(),
      region: regionCode.toUpperCase(),
      casino: casinoId || null,
      rollup: chosenCasino ? { totalDelta: chosenCasino.totalDelta, lastScore: chosenCasino.lastScore } : null,
      alerts,
      severityBuckets,
      legalRights: { region: regionCode.toUpperCase(), casino: casinoId || null, triggers },
      advisory: 'Stored transparency evidence snapshot. Preserve original third-party logs for formal disputes.'
    };
    try {
      ensureEvidenceDir();
      fs.writeFileSync(path.join(EVIDENCE_DIR, `${pkg.id}.json`), JSON.stringify(pkg, null, 2));
      pruneEvidencePackages();
      res.json({ ok:true, id: pkg.id, triggersCount: triggers.length, retentionDays: EVIDENCE_RETENTION_DAYS });
    } catch (_err) {
      res.status(500).json({ ok:false, error:'persist_failed' });
    }
  });

  app.get('/api/evidence/packages', (_req: any, res: any) => {
    try {
      ensureEvidenceDir();
      pruneEvidencePackages();
      const files = fs.readdirSync(EVIDENCE_DIR).filter(f=>f.endsWith('.json'));
      const list = files.map(f => ({ id: f.replace('.json','') })).sort((a,b)=> (a.id < b.id ? 1 : -1)).slice(0, EVIDENCE_MAX_COUNT);
      res.json({ packages: list, retentionDays: EVIDENCE_RETENTION_DAYS, maxCount: EVIDENCE_MAX_COUNT });
    } catch (_err) {
      res.status(500).json({ packages: [], error:'list_failed' });
    }
  });

  app.get('/api/evidence/package/:id', (req: any, res: any) => {
    try {
      ensureEvidenceDir();
      const target = path.join(EVIDENCE_DIR, `${req.params.id}.json`);
      if(!fs.existsSync(target)) return res.status(404).json({ error:'not_found' });
      res.type('application/json').send(fs.readFileSync(target,'utf-8'));
    } catch (_err) {
      res.status(500).json({ error:'read_failed' });
    }
  });

  // CSV export for persisted evidence package
  app.get('/api/evidence/package/:id.csv', (req: any, res: any) => {
    try {
      ensureEvidenceDir();
      const target = path.join(EVIDENCE_DIR, `${req.params.id}.json`);
      if(!fs.existsSync(target)) return res.status(404).send('error,not_found');
      const pkg = JSON.parse(fs.readFileSync(target,'utf-8'));
      const lines: string[] = [];
      lines.push('field,value');
      lines.push(`id,${pkg.id}`);
      lines.push(`generatedAt,${pkg.generatedAt}`);
      lines.push(`region,${pkg.region}`);
      lines.push(`casino,${pkg.casino??''}`);
      if(pkg.rollup){
        lines.push(`rollup_totalDelta,${pkg.rollup.totalDelta}`);
        lines.push(`rollup_lastScore,${pkg.rollup.lastScore}`);
      }
      // Severity buckets
      Object.entries(pkg.severityBuckets||{}).forEach(([sev,count]: any)=>{
        lines.push(`severity_${sev},${count}`);
      });
      // Alerts count + detail
      lines.push(`alerts_count,${(pkg.alerts||[]).length}`);
      (pkg.alerts||[]).forEach((a: any, i: number)=>{
        lines.push(`alert_${i}_kind,${a.kind}`);
        lines.push(`alert_${i}_entity,${a.entity}`);
        if(a.totalDelta!==undefined) lines.push(`alert_${i}_totalDelta,${a.totalDelta}`);
        if(a.severity!==undefined) lines.push(`alert_${i}_severity,${a.severity}`);
      });
      // Legal triggers
      const triggers = pkg.legalRights?.triggers||[];
      lines.push(`legal_triggers_count,${triggers.length}`);
      triggers.forEach((t: any, i: number)=>{
        lines.push(`trigger_${i}_code,${t.code}`);
        lines.push(`trigger_${i}_severity,${t.severity}`);
        lines.push(`trigger_${i}_evidenceCount,${t.evidenceCount}`);
      });
      res.type('text/csv').send(lines.join('\n'));
    } catch(_err){ res.status(500).send('error,export_failed'); }
  });

  // CSV transient export (no persistence) using query params similar to GET JSON endpoint
  app.get('/api/evidence/package.csv', (req: any, res: any) => {
    try {
      const casinoId = (req.query.casino || '').toString();
      const regionCode = (req.query.region || 'unknown').toString().toUpperCase();
      const casinoMap: any = latestRollup?.casino?.casinos || {};
      const chosenCasino = casinoId ? casinoMap[casinoId] : undefined;
      const alerts = dashboardState.riskAlerts.filter(a => !casinoId || a.entity === casinoId);
      const severityBuckets = dashboardState.severityBuckets;
      const triggers: any[] = [];
      if (chosenCasino) {
        const delta = chosenCasino.totalDelta || 0;
        const score = chosenCasino.lastScore || 0;
        if (delta < -15) triggers.push({ code:'PAYOUT_DELAY', evidenceCount:Math.min(Math.abs(Math.round(delta/5)),5), severity: delta < -30 ? 3 : 2 });
        if (score < 40) triggers.push({ code:'FAIRNESS_ANOMALY', evidenceCount:1, severity:3 });
      }
      const relatedAlerts = alerts.filter(a => a.entity === casinoId);
      if (relatedAlerts.length) triggers.push({ code:'RECENT_CRITICAL_ALERT', evidenceCount: relatedAlerts.length, severity:3 });
      if (regionCode === 'CA') triggers.push({ code:'REGION_CONSUMER_PROTECTION', evidenceCount:1, severity:1 });
      if (regionCode === 'EU') triggers.push({ code:'REGION_KYC_COMPLIANCE', evidenceCount:1, severity:1 });
      const lines: string[] = [];
      lines.push('field,value');
      lines.push(`generatedAt,${new Date().toISOString()}`);
      lines.push(`region,${regionCode}`);
      lines.push(`casino,${casinoId}`);
      if(chosenCasino){
        lines.push(`rollup_totalDelta,${chosenCasino.totalDelta}`);
        lines.push(`rollup_lastScore,${chosenCasino.lastScore}`);
      }
      Object.entries(severityBuckets||{}).forEach(([sev,count]: any)=>{ lines.push(`severity_${sev},${count}`); });
      lines.push(`alerts_count,${alerts.length}`);
      alerts.forEach((a: any, i: number)=>{
        lines.push(`alert_${i}_kind,${a.kind}`);
        lines.push(`alert_${i}_entity,${a.entity}`);
        if(a.totalDelta!==undefined) lines.push(`alert_${i}_totalDelta,${a.totalDelta}`);
        if(a.severity!==undefined) lines.push(`alert_${i}_severity,${a.severity}`);
      });
      lines.push(`legal_triggers_count,${triggers.length}`);
      triggers.forEach((t: any, i: number)=>{
        lines.push(`trigger_${i}_code,${t.code}`);
        lines.push(`trigger_${i}_severity,${t.severity}`);
        lines.push(`trigger_${i}_evidenceCount,${t.evidenceCount}`);
      });
      res.type('text/csv').send(lines.join('\n'));
    } catch(_err){ res.status(500).send('error,export_failed'); }
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
