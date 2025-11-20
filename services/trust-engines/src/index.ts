import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent, TrustCasinoUpdateEvent } from '@tiltcheck/types';
import fs from 'fs';
import path from 'path';
import { computeSeverity, penaltyForSeverity } from '@tiltcheck/config';

export interface TrustEnginesConfig {
  startingCasinoScore: number;
  startingUserScore: number;
  autoSubscribe?: boolean; // allow test instances without duplicate subscriptions
  severityScale?: number[]; // severity(1..5) -> penalty magnitude (positive numbers, applied negative)
  logger?: TrustLogger;
  logDir?: string; // directory for JSON line logs
  maxLogSizeBytes?: number; // rotation threshold
  maxLogFiles?: number; // number of rotated files retained
}

export interface TrustLogger {
  debug?(msg: string, meta?: any): void;
  info?(msg: string, meta?: any): void;
  warn?(msg: string, meta?: any): void;
  error?(msg: string, meta?: any): void;
}

const defaultConfig: TrustEnginesConfig = {
  startingCasinoScore: 75,
  startingUserScore: 70,
  autoSubscribe: true,
  severityScale: [2,4,6,8,12],
  logger: undefined,
  logDir: process.env.TRUST_ENGINES_LOG_DIR,
  maxLogSizeBytes: 256 * 1024,
  maxLogFiles: 3,
};

export class TrustEnginesService {
  private casinoScores = new Map<string, number>();
  private userScores = new Map<string, number>();
  private cfg: TrustEnginesConfig;

  constructor(config?: Partial<TrustEnginesConfig>) {
    this.cfg = { ...defaultConfig, ...(config || {}) };
    if (!this.cfg.logger && process.env.TRUST_ENGINES_LOG_ERRORS === '1') {
      this.cfg.logger = console;
    }
    if (this.cfg.autoSubscribe) {
      eventRouter.subscribe('link.flagged', this.onLinkFlagged.bind(this), 'trust-engine-casino');
      eventRouter.subscribe('tip.completed', this.onTipCompleted.bind(this), 'trust-engine-degen');
      eventRouter.subscribe('bonus.nerf.detected', this.onBonusNerf.bind(this), 'trust-engine-casino');
    }
  }

  private adjustCasinoScore(casinoName: string, delta: number, reason: string, severity?: number) {
    const current = this.casinoScores.get(casinoName) ?? this.cfg.startingCasinoScore;
    const next = Math.max(0, Math.min(100, current + delta));
    this.casinoScores.set(casinoName, next);
    const trustEvt: TrustCasinoUpdateEvent = {
      casinoName,
      previousScore: current,
      newScore: next,
      delta: next - current,
      severity,
      reason,
      source: 'trust-engine-casino'
    };
    eventRouter.publish('trust.casino.updated', 'trust-engine-casino', trustEvt);
    this.log('info', 'casino score adjusted', trustEvt);
  }

  private adjustUserScore(userId: string, delta: number) {
    const current = this.userScores.get(userId) ?? this.cfg.startingUserScore;
    const next = Math.max(0, Math.min(100, current + delta));
    this.userScores.set(userId, next);
    eventRouter.publish('trust.degen.updated', 'trust-engine-degen', { userId, score: next }, userId);
  }

  private async onLinkFlagged(event: TiltCheckEvent) {
    const { url, riskLevel } = event.data as any;
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const penalty = riskLevel === 'critical' ? -10 : -5;
      this.adjustCasinoScore(hostname, penalty, `Link flagged (${riskLevel})`, riskLevel === 'critical' ? 4 : 2);
    } catch {}
  }

  private async onTipCompleted(event: TiltCheckEvent) {
    const { fromUserId, toUserId, amount } = event.data as any;
    // Simple heuristic: positive trust reinforcement for completing tips
    this.adjustUserScore(fromUserId, +1);
    this.adjustUserScore(toUserId, +2);
    if (amount > 100) this.adjustUserScore(fromUserId, +3); // generosity bonus
  }

  private async onBonusNerf(event: TiltCheckEvent) {
    const { casinoName, percentDrop } = event.data as any;
    if (!casinoName || typeof percentDrop !== 'number') return;
    // Severity already computed by CollectClock event; fetch latest severity from trust.casino.updated event history if desired.
    const severity = computeSeverity(percentDrop);
    // Penalty mapping
    const scale = this.cfg.severityScale || defaultConfig.severityScale!;
    const delta = penaltyForSeverity(severity, scale);
    this.adjustCasinoScore(casinoName, delta, `Bonus nerf impact (-${(percentDrop*100).toFixed(1)}%)`, severity);
  }

  getCasinoScore(casinoName: string): number {
    return this.casinoScores.get(casinoName) ?? this.cfg.startingCasinoScore;
  }

  private log(level: 'debug'|'info'|'warn'|'error', msg: string, meta?: any) {
    const logger = this.cfg.logger;
    if (logger && logger[level]) {
      try { (logger as any)[level](msg, meta); } catch {}
    }
    if (!this.cfg.logDir) return;
    try {
      if (!fs.existsSync(this.cfg.logDir)) fs.mkdirSync(this.cfg.logDir, { recursive: true });
      const base = path.join(this.cfg.logDir, 'trust-engines.log');
      const line = JSON.stringify({ ts: Date.now(), level, msg, meta }, null, 0) + '\n';
      fs.appendFileSync(base, line);
      this.rotateLogs(base);
    } catch {}
  }

  private rotateLogs(baseFile: string) {
    try {
      const size = fs.statSync(baseFile).size;
      if (size <= (this.cfg.maxLogSizeBytes || 0)) return;
      const maxFiles = this.cfg.maxLogFiles || 1;
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
      fs.writeFileSync(baseFile, '');
    } catch {}
  }
}

export const trustEngines = new TrustEnginesService();
