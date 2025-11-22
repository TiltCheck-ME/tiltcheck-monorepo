import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.resolve('data/gameplay.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Spins table
db.exec(`
  CREATE TABLE IF NOT EXISTS spins (
    id TEXT PRIMARY KEY,
    casino_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    bet REAL NOT NULL,
    win REAL NOT NULL,
    net_win REAL NOT NULL,
    outcome TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );
  CREATE INDEX IF NOT EXISTS idx_spins_casino_ts ON spins(casino_id, ts);
  CREATE INDEX IF NOT EXISTS idx_spins_ts ON spins(ts);
`);

// Seeds table
db.exec(`
  CREATE TABLE IF NOT EXISTS seeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    casino_id TEXT NOT NULL,
    seed TEXT NOT NULL,
    submitted_by TEXT,
    ts INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );
  CREATE INDEX IF NOT EXISTS idx_seeds_casino_ts ON seeds(casino_id, ts);
`);

// Aggregated metrics snapshots (hourly rollups)
db.exec(`
  CREATE TABLE IF NOT EXISTS metric_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    casino_id TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    window_end INTEGER NOT NULL,
    spin_count INTEGER NOT NULL,
    total_bet REAL NOT NULL,
    total_win REAL NOT NULL,
    rtp REAL NOT NULL,
    mean_net_win REAL NOT NULL,
    volatility REAL NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(casino_id, window_start)
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_casino_window ON metric_snapshots(casino_id, window_start);
`);

// Fairness anomalies persistence
db.exec(`
  CREATE TABLE IF NOT EXISTS fairness_anomalies (
    id TEXT PRIMARY KEY,
    casino_id TEXT NOT NULL,
    anomaly_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence REAL NOT NULL,
    reason TEXT,
    metadata_json TEXT,
    ts INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );
  CREATE INDEX IF NOT EXISTS idx_anoms_casino_ts ON fairness_anomalies(casino_id, ts);
`);

export interface SpinRow {
  id: string;
  casino_id: string;
  ts: number;
  bet: number;
  win: number;
  net_win: number;
  outcome?: string;
}

export interface SeedRow {
  id?: number;
  casino_id: string;
  seed: string;
  submitted_by?: string;
  ts: number;
}

export function insertSpin(spin: SpinRow) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO spins (id, casino_id, ts, bet, win, net_win, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(spin.id, spin.casino_id, spin.ts, spin.bet, spin.win, spin.net_win, spin.outcome || null);
}

export function insertSpinBatch(spins: SpinRow[]) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO spins (id, casino_id, ts, bet, win, net_win, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((batch: SpinRow[]) => {
    for (const s of batch) stmt.run(s.id, s.casino_id, s.ts, s.bet, s.win, s.net_win, s.outcome || null);
  });
  insertMany(spins);
}

export function insertSeed(seed: SeedRow) {
  const stmt = db.prepare(`
    INSERT INTO seeds (casino_id, seed, submitted_by, ts)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(seed.casino_id, seed.seed, seed.submitted_by || null, seed.ts);
}

export function getSpinCount(casinoId: string): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM spins WHERE casino_id = ?');
  return (stmt.get(casinoId) as any).count;
}

export function getRecentSpins(casinoId: string, limit = 1000): SpinRow[] {
  const stmt = db.prepare(`
    SELECT id, casino_id, ts, bet, win, net_win, outcome
    FROM spins
    WHERE casino_id = ?
    ORDER BY ts DESC
    LIMIT ?
  `);
  return stmt.all(casinoId, limit) as SpinRow[];
}

export function getSeedRotations(casinoId: string): SeedRow[] {
  const stmt = db.prepare(`
    SELECT id, casino_id, seed, submitted_by, ts
    FROM seeds
    WHERE casino_id = ?
    ORDER BY ts ASC
  `);
  return stmt.all(casinoId) as SeedRow[];
}

export function getSpinsByTimeRange(casinoId: string, startTs: number, endTs: number): SpinRow[] {
  const stmt = db.prepare(`
    SELECT id, casino_id, ts, bet, win, net_win, outcome
    FROM spins
    WHERE casino_id = ? AND ts >= ? AND ts <= ?
    ORDER BY ts ASC
  `);
  return stmt.all(casinoId, startTs, endTs) as SpinRow[];
}

export function closeDb() {
  db.close();
}

export function insertAnomaly(a: { id: string; casino_id: string; anomaly_type: string; severity: string; confidence: number; reason: string; metadata?: any; ts: number }) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO fairness_anomalies (id, casino_id, anomaly_type, severity, confidence, reason, metadata_json, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(a.id, a.casino_id, a.anomaly_type, a.severity, a.confidence, a.reason, a.metadata ? JSON.stringify(a.metadata) : null, a.ts);
}

export function getRecentAnomalies(casinoId: string, limit = 100): any[] {
  const stmt = db.prepare(`
    SELECT id, casino_id, anomaly_type, severity, confidence, reason, metadata_json, ts
    FROM fairness_anomalies
    WHERE casino_id = ?
    ORDER BY ts DESC
    LIMIT ?
  `);
  return stmt.all(casinoId, limit).map((r: any) => ({
    ...r,
    metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null
  }));
}
