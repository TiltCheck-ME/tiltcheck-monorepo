import { WebSocketServer } from 'ws';
import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { ulid } from 'ulid';
import { gradeEngine, SpinRecord as EngineSpinRecord, CasinoData } from '@tiltcheck/grading-engine';
import { eventRouter } from '@tiltcheck/event-router';
import * as DB from './db.js';
import { startApiServer } from './api.js';
import { adapterRegistry, stakeAdapter, rollbitAdapter, type CasinoAdapter, type SpinRecordNormalized as AdapterSpinRecord } from './adapters/index.js';
import { detectPump, detectVolatilityCompression, detectWinClustering, computeAnomalyScore } from './detection.js';
import { insertAnomaly } from './db.js';
import { AlertManager } from './alerts.js';
import http from 'http';

interface SpinRecordRawCSV {
  spin_id?: string;
  ts?: string; // ISO or epoch
  bet: string; // numeric string
  win: string; // numeric string
  outcome?: string; // optional symbol string or encoded grid
}

export interface SpinRecordNormalized {
  id: string;
  ts: number; // epoch ms
  bet: number;
  win: number;
  outcome?: string;
}

// Basic in-memory store for MVP (can be replaced by better storage later)
const spins: AdapterSpinRecord[] = [];
const spinIdSet = new Set<string>(); // duplicate detection
let lastGradeAtCount = 0;
const GRADE_INTERVAL = parseInt(process.env.GRADE_INTERVAL || '500', 10); // spins per grading snapshot
const RTP_WINDOW_SIZE = parseInt(process.env.RTP_WINDOW_SIZE || '400', 10); // rolling window for RTP drift broadcast
const CASINO_ID = process.env.CASINO_ID || 'stake-us'; // placeholder casino id
const EXPECTED_RTP = parseFloat(process.env.EXPECTED_RTP || '-0.02'); // mock theoretical mean netWin per spin
const SEED_FILE_PATH = `data/seeds/${CASINO_ID}.json`;

interface SeedSubmissionEntry { seed: string; submittedBy: string; ts: number; casinoId: string; }
const seedRotations: { ts: number }[] = []; // minimal for engine; appended when seeds submitted
let activeAdapter: CasinoAdapter | undefined;

// Initialize alert manager
const alertManager = new AlertManager();
const DETECTION_WINDOW = parseInt(process.env.DETECTION_WINDOW || '100', 10);
const DETECTION_INTERVAL = parseInt(process.env.DETECTION_INTERVAL || '200', 10); // spins between detection runs
let lastDetectionAtCount = 0;

function detectDelimiter(line: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map(d => ({ d, count: line.split(d).length }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].d;
}

async function loadHistoricSeeds() {
  try {
    // First try DB
    const dbSeeds = DB.getSeedRotations(CASINO_ID);
    if (dbSeeds.length > 0) {
      for (const s of dbSeeds) seedRotations.push({ ts: s.ts });
      console.log(`[GameplayAnalyzer] Loaded ${seedRotations.length} seeds from DB for ${CASINO_ID}`);
      return;
    }
    
    // Fallback to file
    const raw = await fs.readFile(SEED_FILE_PATH, 'utf-8');
    const entries: SeedSubmissionEntry[] = JSON.parse(raw);
    for (const e of entries) {
      if (e.casinoId === CASINO_ID) {
        seedRotations.push({ ts: e.ts });
        // Migrate to DB
        DB.insertSeed({ casino_id: e.casinoId, seed: e.seed, submitted_by: e.submittedBy, ts: e.ts });
      }
    }
    console.log(`[GameplayAnalyzer] Loaded ${seedRotations.length} historic seeds for ${CASINO_ID}`);
  } catch (_) {
    // no file yet
  }
}

function parseNumber(n: string | undefined, fallback = 0): number {
  if (!n) return fallback;
  const v = Number(n.trim());
  return Number.isFinite(v) ? v : fallback;
}

function parseTimestamp(ts: string | undefined): number {
  if (!ts) return Date.now();
  const tNum = Number(ts);
  if (Number.isFinite(tNum)) {
    // treat as seconds if it looks like epoch seconds
    if (tNum < 1e12) return tNum * 1000;
    return tNum; // already ms
  }
  // try Date parse
  const d = Date.parse(ts);
  return isNaN(d) ? Date.now() : d;
}

export function normalizeSpin(raw: SpinRecordRawCSV): SpinRecordNormalized {
  const normalized = {
    id: raw.spin_id?.trim() || ulid(),
    ts: parseTimestamp(raw.ts),
    bet: parseNumber(raw.bet),
    win: parseNumber(raw.win),
    outcome: raw.outcome?.trim() || undefined
  };
  
  // Persist to DB
  DB.insertSpin({
    id: normalized.id,
    casino_id: CASINO_ID,
    ts: normalized.ts,
    bet: normalized.bet,
    win: normalized.win,
    net_win: normalized.win - normalized.bet,
    outcome: normalized.outcome
  });
  
  return normalized;
}

// Simple RTP computation for current batch
function computeBatchMetrics(batch: SpinRecordNormalized[]) {
  const totalBet = batch.reduce((a, s) => a + s.bet, 0);
  const totalWin = batch.reduce((a, s) => a + s.win, 0);
  const rtp = totalBet > 0 ? totalWin / totalBet : 0;
  return { count: batch.length, totalBet, totalWin, rtp };
}

function computeRtpWindow(windowSize: number) {
  if (spins.length === 0) return { size: 0, meanNetWin: 0, deviationRatio: 0 };
  const slice = spins.slice(-windowSize);
  const engineSlice = slice.map(s => s.win - s.bet);
  const meanNetWin = engineSlice.reduce((a, b) => a + b, 0) / engineSlice.length;
  const deviationRatio = Math.abs(meanNetWin - EXPECTED_RTP) / Math.max(Math.abs(EXPECTED_RTP), 1e-9);
  return { size: engineSlice.length, meanNetWin, deviationRatio };
}

function computeSeedStats() {
  if (seedRotations.length < 2) return { count: seedRotations.length, lastTs: seedRotations[seedRotations.length - 1]?.ts || null, avgIntervalMs: null };
  const sorted = seedRotations.slice().sort((a, b) => a.ts - b.ts);
  const intervals = [] as number[];
  for (let i = 1; i < sorted.length; i++) intervals.push(sorted[i].ts - sorted[i - 1].ts);
  const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return { count: seedRotations.length, lastTs: sorted[sorted.length - 1].ts, avgIntervalMs };
}

function convertToEngineSpins(src: SpinRecordNormalized[]): EngineSpinRecord[] {
  return src.map(s => ({
    ts: s.ts,
    netWin: s.win - s.bet,
  }));
}

async function maybeGrade() {
  if (spins.length - lastGradeAtCount < GRADE_INTERVAL) return;
  lastGradeAtCount = spins.length;
  const engineSpins = convertToEngineSpins(spins);
  const data: CasinoData = {
    casino: CASINO_ID,
    spins: engineSpins,
    seedRotations: seedRotations,
  };
  const grading = gradeEngine(data);
  await eventRouter.publish('trust.casino.updated', 'gameplay-analyzer', {
    casinoId: CASINO_ID,
    trustScore: grading.compositeScore / 100,
    metadata: { source: 'gameplay', grading }
  });
  detectRtpDrift(engineSpins);
  broadcastMetrics(); // include latest after grading
  console.log(`[GameplayAnalyzer] Published grading snapshot spins=${spins.length} composite=${grading.compositeScore}`);
  
  // Run anomaly detection
  await detectAndAlert();
}

function detectRtpDrift(engineSpins: EngineSpinRecord[]) {
  if (engineSpins.length < GRADE_INTERVAL) return; // require minimum sample
  const observedMean = engineSpins.reduce((a, s) => a + s.netWin, 0) / engineSpins.length;
  const deviationRatio = Math.abs(observedMean - EXPECTED_RTP) / Math.max(Math.abs(EXPECTED_RTP), 1e-9);
  const threshold = parseFloat(process.env.RTP_DRIFT_THRESHOLD || '0.5');
  if (deviationRatio >= threshold) {
    void eventRouter.publish('trust.casino.alert', 'gameplay-analyzer', {
      casinoId: CASINO_ID,
      alertType: 'rtp-drift',
      severity: deviationRatio > threshold * 2 ? 'critical' : 'warning',
      deviationRatio,
      observedMean,
      expectedMean: EXPECTED_RTP,
      sampleSize: engineSpins.length,
    });
    console.warn(`[GameplayAnalyzer] RTP drift alert deviationRatio=${deviationRatio.toFixed(2)} observed=${observedMean.toFixed(4)} expected=${EXPECTED_RTP}`);
  }
}

function detectAnomalies() {
  if (spins.length < DETECTION_WINDOW) return;
  
  // Convert to format expected by detectors
  const recentSpins = spins.slice(-DETECTION_WINDOW).map(s => ({
    ts: s.ts,
    bet: s.bet,
    win: s.win
  }));
  
  // Run detectors
  const pumpResult = detectPump(recentSpins);
  const compressionResult = detectVolatilityCompression(recentSpins);
  const clusterResult = detectWinClustering(recentSpins);
  
  // Compute composite score
  const anomalyScore = computeAnomalyScore({
    pump: pumpResult,
    compression: compressionResult,
    clustering: clusterResult
  });
  
  // Emit alerts via alert manager (throttled) + trust events
  if (pumpResult.detected) {
    const alert = alertManager.emit({
      casinoId: CASINO_ID,
      type: 'pump',
      severity: pumpResult.severity,
      confidence: pumpResult.confidence,
      timestamp: Date.now(),
      metadata: pumpResult.metadata,
      message: pumpResult.reason
    });
    
    if (alert) {
      const tsNow = Date.now();
      void eventRouter.publish('fairness.pump.detected', 'gameplay-analyzer', {
        userId: undefined, // Can add sessionId->userId mapping later
        casinoId: CASINO_ID,
        anomalyType: 'pump' as const,
        severity: pumpResult.severity,
        confidence: pumpResult.confidence,
        metadata: pumpResult.metadata,
        reason: pumpResult.reason,
        timestamp: tsNow
      });
      console.warn(`[GameplayAnalyzer] Pump detected: ${pumpResult.reason}`);
      recentAnomalies.push({ type: 'pump', severity: pumpResult.severity, confidence: pumpResult.confidence, timestamp: tsNow, reason: pumpResult.reason });
      insertAnomaly({ id: `an-${tsNow}-pump-${Math.random().toString(16).slice(2,8)}`, casino_id: CASINO_ID, anomaly_type: 'pump', severity: pumpResult.severity, confidence: pumpResult.confidence, reason: pumpResult.reason, metadata: pumpResult.metadata, ts: tsNow });
      if (recentAnomalies.length > MAX_ANOMALIES) recentAnomalies.splice(0, recentAnomalies.length - MAX_ANOMALIES);
    }
  }
  
  if (compressionResult.detected) {
    const alert = alertManager.emit({
      casinoId: CASINO_ID,
      type: 'compression',
      severity: compressionResult.severity,
      confidence: compressionResult.confidence,
      timestamp: Date.now(),
      metadata: compressionResult.metadata,
      message: compressionResult.reason
    });
    
    if (alert) {
      const tsNow = Date.now();
      void eventRouter.publish('fairness.compression.detected', 'gameplay-analyzer', {
        userId: undefined,
        casinoId: CASINO_ID,
        anomalyType: 'volatility_compression' as const,
        severity: compressionResult.severity,
        confidence: compressionResult.confidence,
        metadata: compressionResult.metadata,
        reason: compressionResult.reason,
        timestamp: tsNow
      });
      console.warn(`[GameplayAnalyzer] Volatility compression detected: ${compressionResult.reason}`);
      recentAnomalies.push({ type: 'compression', severity: compressionResult.severity, confidence: compressionResult.confidence, timestamp: tsNow, reason: compressionResult.reason });
      insertAnomaly({ id: `an-${tsNow}-compression-${Math.random().toString(16).slice(2,8)}`, casino_id: CASINO_ID, anomaly_type: 'compression', severity: compressionResult.severity, confidence: compressionResult.confidence, reason: compressionResult.reason, metadata: compressionResult.metadata, ts: tsNow });
      if (recentAnomalies.length > MAX_ANOMALIES) recentAnomalies.splice(0, recentAnomalies.length - MAX_ANOMALIES);
    }
  }
  
  if (clusterResult.detected) {
    const alert = alertManager.emit({
      casinoId: CASINO_ID,
      type: 'clustering',
      severity: clusterResult.severity,
      confidence: clusterResult.confidence,
      timestamp: Date.now(),
      metadata: clusterResult.metadata,
      message: clusterResult.reason
    });
    
    if (alert) {
      const tsNow = Date.now();
      void eventRouter.publish('fairness.cluster.detected', 'gameplay-analyzer', {
        userId: undefined,
        casinoId: CASINO_ID,
        anomalyType: 'win_clustering' as const,
        severity: clusterResult.severity,
        confidence: clusterResult.confidence,
        metadata: clusterResult.metadata,
        reason: clusterResult.reason,
        timestamp: tsNow
      });
      console.warn(`[GameplayAnalyzer] Win clustering detected: ${clusterResult.reason}`);
      recentAnomalies.push({ type: 'clustering', severity: clusterResult.severity, confidence: clusterResult.confidence, timestamp: tsNow, reason: clusterResult.reason });
      insertAnomaly({ id: `an-${tsNow}-cluster-${Math.random().toString(16).slice(2,8)}`, casino_id: CASINO_ID, anomaly_type: 'clustering', severity: clusterResult.severity, confidence: clusterResult.confidence, reason: clusterResult.reason, metadata: clusterResult.metadata, ts: tsNow });
      if (recentAnomalies.length > MAX_ANOMALIES) recentAnomalies.splice(0, recentAnomalies.length - MAX_ANOMALIES);
    }
  }
  
  // Escalation check for composite anomalies
  if (anomalyScore.score > 0) {
    const shouldEscalate = alertManager.shouldEscalate(CASINO_ID, {
      id: `composite-${Date.now()}`,
      casinoId: CASINO_ID,
      type: 'composite',
      severity: anomalyScore.severity,
      confidence: anomalyScore.score,
      timestamp: Date.now(),
      metadata: { flags: anomalyScore.flags },
      message: `Multiple anomalies detected: ${anomalyScore.flags.join(', ')}`
    });
    
    if (shouldEscalate) {
      void eventRouter.publish('fairness.rtp.anomaly', 'gameplay-analyzer', {
        casinoId: CASINO_ID,
        severity: 'critical',
        anomalyScore: anomalyScore.score,
        flags: anomalyScore.flags,
        message: 'Escalated: Multiple fairness anomalies detected',
        recentAlerts: alertManager.getRecentAlerts(CASINO_ID, 5)
      });
      console.error(`[GameplayAnalyzer] ESCALATED: Composite anomaly score=${anomalyScore.score.toFixed(2)} flags=${anomalyScore.flags.join(',')}`);
      const tsNow = Date.now();
      recentAnomalies.push({ type: 'composite', severity: 'critical', confidence: anomalyScore.score, timestamp: tsNow, reason: `Composite escalation (${anomalyScore.flags.join(',')})` });
      insertAnomaly({ id: `an-${tsNow}-composite-${Math.random().toString(16).slice(2,8)}`, casino_id: CASINO_ID, anomaly_type: 'composite', severity: 'critical', confidence: anomalyScore.score, reason: `Composite escalation (${anomalyScore.flags.join(',')})`, metadata: { flags: anomalyScore.flags }, ts: tsNow });
      if (recentAnomalies.length > MAX_ANOMALIES) recentAnomalies.splice(0, recentAnomalies.length - MAX_ANOMALIES);
    }
  }
}

async function detectAndAlert() {
  detectAnomalies();
  
  // Periodic alert summary
  if (spins.length - lastDetectionAtCount >= DETECTION_INTERVAL) {
    lastDetectionAtCount = spins.length;
    const criticalAlerts = alertManager.getCriticalAlerts();
    if (criticalAlerts.length > 0) {
      void eventRouter.publish('fairness.volatility.shift', 'gameplay-analyzer', {
        casinoId: CASINO_ID,
        alerts: criticalAlerts,
        count: criticalAlerts.length
      });
      console.log(`[GameplayAnalyzer] Published ${criticalAlerts.length} critical alerts`);
    }
  }
}

// CSV Ingest with adapter auto-detection
export async function ingestCSV(path: string): Promise<{ imported: number; skipped: number; duplicates: number; metrics: ReturnType<typeof computeBatchMetrics>; }> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: createReadStream(path) });
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    let headers: string[] = [];
    let delimiter = ',';
    let isFirstLine = true;
    
    rl.on('line', (line) => {
      if (!line.trim() || line.startsWith('#')) return;
      
      if (isFirstLine) {
        delimiter = detectDelimiter(line);
        headers = line.split(delimiter).map(h => h.trim());
        
        // Auto-detect adapter if not set
        if (!activeAdapter) {
          activeAdapter = adapterRegistry.detect(headers) || adapterRegistry.get(CASINO_ID);
          if (!activeAdapter) {
            console.warn('[CSV Ingest] No adapter found, using generic parsing');
          }
        }
        
        isFirstLine = false;
        return;
      }
      
      const parts = line.split(delimiter).map(p => p.trim());
      if (parts.length !== headers.length) {
        skipped++;
        return;
      }
      
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = parts[i]; });
      
      // Use adapter or fallback
      if (activeAdapter) {
        if (activeAdapter.validate && !activeAdapter.validate(row)) {
          skipped++;
          return;
        }
        
        const normalized = activeAdapter.parse(row);
        
        // Duplicate check
        if (spinIdSet.has(normalized.id)) {
          duplicates++;
          return;
        }
        
        spinIdSet.add(normalized.id);
        spins.push(normalized);
        
        // Persist
        DB.insertSpin({
          id: normalized.id,
          casino_id: CASINO_ID,
          ts: normalized.ts,
          bet: normalized.bet,
          win: normalized.win,
          net_win: normalized.win - normalized.bet,
          outcome: normalized.outcome
        });
        
        imported++;
        void maybeGrade();
      } else {
        skipped++;
      }
    });
    
    rl.on('close', () => {
      resolve({ imported, skipped, duplicates, metrics: computeBatchMetrics(spins) });
    });
    rl.on('error', reject);
  });
}

// WebSocket broadcast of incremental metrics (placeholder for integration events)
let wss: WebSocketServer | undefined;
// Recent anomaly events for summary broadcasting (FIFO capped)
interface AnomalySummaryItem { type: string; severity: string; confidence: number; timestamp: number; reason: string; }
const recentAnomalies: AnomalySummaryItem[] = [];
const MAX_ANOMALIES = 40;
function ensureWSS() {
  if (wss) return wss;
  const chainEnv = process.env.WSS_PORT_CHAIN || '7071,7073,7074';
  const ports = chainEnv.split(',').map(s => s.trim()).filter(Boolean);
  for (const p of ports) {
    try {
      const portNum = parseInt(p, 10);
      const server = new WebSocketServer({ port: portNum });
      server.on('connection', (ws) => {
        ws.send(JSON.stringify({ type: 'welcome', spins: spins.length }));
      });
      wss = server;
      console.log(`[GameplayAnalyzer] WebSocket server listening on ${portNum}`);
      break;
    } catch (e: any) {
      if (e && e.code === 'EADDRINUSE') {
        console.warn(`[GameplayAnalyzer] WebSocket port ${p} in use; trying next`);
        continue;
      }
      console.error('[GameplayAnalyzer] WebSocket server error:', e?.message || e);
    }
  }
  if (!wss) {
    console.error('[GameplayAnalyzer] No WebSocket port available; continuing without WSS');
  }
  return wss;
}

function broadcastMetrics() {
  if (!wss) return;
  const metrics = computeBatchMetrics(spins);
  const rtpWindow = computeRtpWindow(RTP_WINDOW_SIZE);
  const seeds = computeSeedStats();
  const payload = JSON.stringify({ type: 'metrics', metrics, rtpWindow, seeds });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(payload); });
  // Broadcast anomaly summary separately to allow client gating
  if (recentAnomalies.length) {
    const latest = recentAnomalies.slice(-10); // last 10 detailed
    const counts = recentAnomalies.reduce((acc, a) => { acc[a.type] = (acc[a.type]||0)+1; return acc; }, {} as Record<string, number>);
    const summaryPayload = JSON.stringify({ type: 'anomalySummary', latest, counts: {
      pump: counts['pump']||0,
      compression: counts['compression']||0,
      clustering: counts['clustering']||0,
      composite: counts['composite']||0
    }});
    wss.clients.forEach(c => { if (c.readyState === 1) c.send(summaryPayload); });
  }
}

// Periodic broadcast
setInterval(() => {
  broadcastMetrics();
}, 5000);

// Health & metrics server
let anomalyEventCount = 0;
let gradingEventCount = 0;

function startHealthServer() {
  const portChain = [
    process.env.GAMEPLAY_ANALYZER_PORT,
    process.env.GAMEPLAY_ANALYZER_HEALTH_PORT,
    '8111'
  ].filter(Boolean);

  let serverStarted = false;
  let retryCount = 0;
  const maxRetries = portChain.length;

  const tryPort = (portIndex: number) => {
    if (portIndex >= portChain.length || serverStarted) {
      if (!serverStarted) {
        console.error('[GameplayAnalyzer] All health server ports exhausted');
      }
      return;
    }

    const port = portChain[portIndex];
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      
      if (req.url === '/health') {
        const memUsage = process.memoryUsage();
        res.writeHead(200);
        res.end(JSON.stringify({
          service: 'gameplay-analyzer',
          status: 'healthy',
          spins: spins.length,
          seedRotations: seedRotations.length,
          anomalyEvents: anomalyEventCount,
          gradingEvents: gradingEventCount,
          memory: {
            rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
            heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
            heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2)
          },
          uptimeSeconds: Math.floor(process.uptime()),
          port: port
        }));
      } else if (req.url === '/ready') {
        const ready = spins.length >= 0; // Always ready once started
        res.writeHead(ready ? 200 : 503);
        res.end(JSON.stringify({ ready }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        retryCount++;
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.warn(`[GameplayAnalyzer] Port ${port} in use, trying next port after ${backoffMs}ms...`);
        setTimeout(() => tryPort(portIndex + 1), backoffMs);
      } else {
        console.error('[GameplayAnalyzer] Health server error:', err);
      }
    });

    server.listen(Number(port), () => {
      serverStarted = true;
      console.log(`[GameplayAnalyzer] Health server: http://localhost:${port}/health`);
    });
  };

  tryPort(0);
}

// Track anomaly & grading events
const originalPublish = eventRouter.publish.bind(eventRouter);
eventRouter.publish = async function(type: string, source: string, data: any) {
  if (source === 'gameplay-analyzer') {
    if (type.startsWith('fairness.')) anomalyEventCount++;
    if (type === 'trust.casino.updated') gradingEventCount++;
  }
  return originalPublish(type, source, data);
} as typeof eventRouter.publish;

// Minimal CLI usage for MVP
async function main() {
  // Register adapters
  adapterRegistry.register(stakeAdapter);
  adapterRegistry.register(rollbitAdapter);
  console.log(`[Analyzer] Registered ${adapterRegistry.list().length} adapters`);
  
  const csvArgIndex = process.argv.indexOf('--csv');
  if (csvArgIndex !== -1) {
    const file = process.argv[csvArgIndex + 1];
    if (!file) {
      console.error('Missing file after --csv');
      process.exit(1);
    }
    console.log(`Ingesting CSV: ${file}`);
    const { imported, skipped, duplicates, metrics } = await ingestCSV(file);
    console.log(`Imported: ${imported}, Skipped: ${skipped}, Duplicates: ${duplicates}`);
    console.log('Metrics:', metrics);
  }
  // Subscribe to seed submissions
  eventRouter.subscribe('seed.submitted', (evt) => {
    try {
      const data = evt.data as any;
      if (data.casinoId === CASINO_ID) {
        const ts = data.ts || Date.now();
        seedRotations.push({ ts });
        // Persist
        DB.insertSeed({ casino_id: data.casinoId, seed: data.seed, submitted_by: data.submittedBy, ts });
        console.log(`[GameplayAnalyzer] Seed rotation recorded. total=${seedRotations.length}`);
      }
    } catch (e) {
      console.error('[GameplayAnalyzer] Seed event handling error', e);
    }
  }, 'gameplay-analyzer');

  await loadHistoricSeeds();
  ensureWSS();
  startApiServer(CASINO_ID);
  startHealthServer();
  console.log('Gameplay analyzer running. WebSocket port 7071');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
