// Relaxed event-router import to avoid Docker build failures
// eslint-disable-next-line @typescript-eslint/no-var-requires
const eventRouter: any = (require('@tiltcheck/event-router') as any).eventRouter || (globalThis as any).eventRouter || {};
import fs from 'fs';
import path from 'path';
import type {
  BonusUpdateEvent,
  BonusClaimEvent,
  BonusNerfDetectedEvent,
  BonusPredictionGeneratedEvent,
  TrustCasinoUpdateEvent
} from '@tiltcheck/types';
import { computeSeverity } from '@tiltcheck/config';
void crypto; // Silence TS6133 unused warning
import crypto from 'crypto';

interface CasinoBonusState {
  casinoName: string;
  currentAmount: number; // e.g., bonus size (e.g., 1SC or $ value)
  lastUpdated: number;
  history: { amount: number; updatedAt: number }[];
  cooldownMs: number; // claim cooldown
  claims: Map<string, number>; // userId -> lastClaimTimestamp
}

export interface CollectClockConfig {
  defaultCooldownMs: number;
  nerfThresholdPercent: number; // percent drop to classify nerf (e.g., 0.25 = 25%)
  predictionWindow: number; // number of history points for averaging
  persistenceDir?: string; // optional directory for external JSON history persistence
  maxHistoryEntries?: number; // prune oldest beyond this count
  severityScale?: number[]; // mapping severity(1-5) -> score penalty
  atomicPersistence?: boolean; // use temp file + rename
  logger?: CollectClockLogger; // optional logger
  persistenceLogDir?: string; // directory for persistence logs
  maxPersistenceLogSizeBytes?: number; // rotate threshold
  maxPersistenceLogFiles?: number; // number of rotated files to keep
}

export interface CollectClockLogger {
  debug?(msg: string, meta?: any): void;
  info?(msg: string, meta?: any): void;
  warn?(msg: string, meta?: any): void;
  error?(msg: string, meta?: any): void;
}

const defaultConfig: CollectClockConfig = {
  defaultCooldownMs: 24 * 60 * 60 * 1000, // 24h
  nerfThresholdPercent: 0.15, // 15% drop triggers nerf detection
  predictionWindow: 5,
  persistenceDir: undefined,
  maxHistoryEntries: undefined,
  severityScale: [2,4,6,8,12],
  atomicPersistence: true,
  persistenceLogDir: process.env.COLLECTCLOCK_LOG_DIR,
  maxPersistenceLogSizeBytes: 256 * 1024,
  maxPersistenceLogFiles: 3,
};

export class CollectClockService {
  private casinos: Map<string, CasinoBonusState> = new Map();
  private cfg: CollectClockConfig;

  constructor(config?: Partial<CollectClockConfig>) {
    this.cfg = { ...defaultConfig, ...(config || {}) };
    if (!this.cfg.logger && process.env.COLLECTCLOCK_LOG_ERRORS === '1') {
      this.cfg.logger = console;
    }
  }

  registerCasino(casinoName: string, initialAmount: number, cooldownMs?: number) {
    if (this.casinos.has(casinoName)) {
      throw new Error('Casino already registered');
    }
    const state: CasinoBonusState = {
      casinoName,
      currentAmount: initialAmount,
      lastUpdated: Date.now(),
      history: [{ amount: initialAmount, updatedAt: Date.now() }],
      cooldownMs: cooldownMs ?? this.cfg.defaultCooldownMs,
      claims: new Map(),
    };
    this.casinos.set(casinoName, state);
    // Persist initial state if configured
    if (this.cfg.persistenceDir) {
      try {
        if (!fs.existsSync(this.cfg.persistenceDir)) fs.mkdirSync(this.cfg.persistenceDir, { recursive: true });
        const filePath = path.join(this.cfg.persistenceDir, `${casinoName}.json`);
        const initial = [{ amount: initialAmount, updatedAt: state.lastUpdated }];
        this.writePersistent(filePath, initial);
      } catch {}
    }
    const evt: BonusUpdateEvent = {
      casinoName,
      oldAmount: undefined,
      newAmount: initialAmount,
      updatedAt: state.lastUpdated,
    };
    eventRouter.publish('bonus.updated', 'collectclock', evt);
  }

  updateBonus(casinoName: string, newAmount: number) {
    const state = this.casinos.get(casinoName);
    if (!state) throw new Error('Casino not registered');
    const oldAmount = state.currentAmount;
    state.currentAmount = newAmount;
    state.lastUpdated = Date.now();
    state.history.push({ amount: newAmount, updatedAt: state.lastUpdated });

    // External persistence if configured
    if (this.cfg.persistenceDir) {
      try {
        if (!fs.existsSync(this.cfg.persistenceDir)) fs.mkdirSync(this.cfg.persistenceDir, { recursive: true });
        const filePath = path.join(this.cfg.persistenceDir, `${casinoName}.json`);
        const existing: any[] = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
        existing.push({ amount: newAmount, updatedAt: state.lastUpdated });
        // Prune oldest if exceeding max
        if (this.cfg.maxHistoryEntries && existing.length > this.cfg.maxHistoryEntries) {
          const excess = existing.length - this.cfg.maxHistoryEntries;
          existing.splice(0, excess);
        }
        this.writePersistent(filePath, existing);
      } catch {}
    }

    const updateEvt: BonusUpdateEvent = {
      casinoName,
      oldAmount,
      newAmount,
      updatedAt: state.lastUpdated,
    };
    eventRouter.publish('bonus.updated', 'collectclock', updateEvt);

    // Nerf detection
    if (newAmount < oldAmount) {
      const drop = oldAmount - newAmount;
      const percentDrop = drop / oldAmount;
      if (percentDrop >= this.cfg.nerfThresholdPercent) {
        const nerfEvt: BonusNerfDetectedEvent = {
          casinoName,
          previousAmount: oldAmount,
          newAmount,
          delta: -drop,
          percentDrop,
          detectedAt: Date.now(),
        };
        eventRouter.publish('bonus.nerf.detected', 'collectclock', nerfEvt);
        // Publish trust impact event (severity scaled 1-5)
        const severity = computeSeverity(percentDrop); // shared logic
        const trustEvt: TrustCasinoUpdateEvent = {
          casinoName,
          severity,
          reason: `Bonus nerf detected: -${(percentDrop * 100).toFixed(1)}%`,
          source: 'collectclock'
        };
        eventRouter.publish('trust.casino.updated', 'collectclock', trustEvt);
      }
    }
  }

  claimBonus(casinoName: string, userId: string): BonusClaimEvent {
    const state = this.casinos.get(casinoName);
    if (!state) throw new Error('Casino not registered');
    const now = Date.now();
    const lastClaim = state.claims.get(userId) || 0;
    if (now - lastClaim < state.cooldownMs) {
      throw new Error('Cooldown active for user');
    }
    state.claims.set(userId, now);
    const next = now + state.cooldownMs;
    const evt: BonusClaimEvent = {
      casinoName,
      userId,
      amount: state.currentAmount,
      claimedAt: now,
      nextEligibleAt: next,
    };
    eventRouter.publish('bonus.claimed', 'collectclock', evt, userId);
    return evt;
  }

  predictNext(casinoName: string): BonusPredictionGeneratedEvent {
    const state = this.casinos.get(casinoName);
    if (!state) throw new Error('Casino not registered');
    const window = this.cfg.predictionWindow;
    const slice = state.history.slice(-window);
    const basisSampleSize = slice.length;
    const avg = slice.reduce((sum, h) => sum + h.amount, 0) / basisSampleSize;
    const confidence = Math.min(1, basisSampleSize / window);
    const variance = slice.reduce((acc, h) => acc + Math.pow(h.amount - avg, 2), 0) / Math.max(1, basisSampleSize);
    const stdDev = Math.sqrt(variance);
    const volatilityScore = avg > 0 ? Math.min(1, stdDev / avg) : 0;
    const evt: BonusPredictionGeneratedEvent = {
      casinoName,
      predictedAmount: avg,
      confidence,
      basisSampleSize,
      generatedAt: Date.now(),
      volatility: stdDev,
      volatilityScore,
    };
    eventRouter.publish('bonus.prediction.generated', 'collectclock', evt);
    return evt;
  }

  getCasinoState(casinoName: string): CasinoBonusState | undefined {
    return this.casinos.get(casinoName);
  }

  getPersistedHistory(casinoName: string): { amount: number; updatedAt: number }[] {
    if (!this.cfg.persistenceDir) return [];
    const filePath = path.join(this.cfg.persistenceDir, `${casinoName}.json`);
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return [];
    }
  }

  private writePersistent(filePath: string, data: any[]) {
    const serialized = JSON.stringify(data, null, 2);
    if (this.cfg.atomicPersistence) {
      const tmp = filePath + '.tmp';
      try {
        fs.writeFileSync(tmp, serialized);
        fs.renameSync(tmp, filePath);
      } catch (err) {
        this.log('error', 'CollectClock persistence (atomic) failed', { filePath, err });
      }
    } else {
      try {
        fs.writeFileSync(filePath, serialized);
      } catch (err) {
        this.log('error', 'CollectClock persistence failed', { filePath, err });
      }
    }
  }

  private log(level: 'debug'|'info'|'warn'|'error', msg: string, meta?: any) {
    const logger = this.cfg.logger;
    if (logger && logger[level]) {
      try { (logger as any)[level](msg, meta); } catch {}
    }
    if (!this.cfg.persistenceLogDir) return;
    try {
      if (!fs.existsSync(this.cfg.persistenceLogDir)) fs.mkdirSync(this.cfg.persistenceLogDir, { recursive: true });
      const base = path.join(this.cfg.persistenceLogDir, 'collectclock-persistence.log');
      const line = JSON.stringify({ ts: Date.now(), level, msg, meta }, null, 0) + '\n';
      fs.appendFileSync(base, line);
      this.rotateLogs(base);
    } catch {}
  }

  private rotateLogs(baseFile: string) {
    try {
      const size = fs.statSync(baseFile).size;
      if (size <= (this.cfg.maxPersistenceLogSizeBytes || 0)) return;
      const maxFiles = this.cfg.maxPersistenceLogFiles || 1;
      // Rotate existing
      for (let i = maxFiles - 1; i >= 0; i--) {
        const src = i === 0 ? baseFile : `${baseFile}.${i}`;
        if (fs.existsSync(src)) {
          const dest = `${baseFile}.${i+1}`;
          if (i + 1 > maxFiles) {
            fs.rmSync(src, { force: true });
          } else {
            fs.renameSync(src, dest);
          }
        }
      }
      // New empty base file
      fs.writeFileSync(baseFile, '');
    } catch {}
  }
}

export const collectclock = new CollectClockService();
