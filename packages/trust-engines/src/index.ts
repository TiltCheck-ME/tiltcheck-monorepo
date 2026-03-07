/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Trust Engines Service
 * Implements Casino Trust Engine and Degen Trust Engine
 * 
 * Casino Trust Scoring (0-100):
 * - 30% Fairness consistency
 * - 20% Payout reliability
 * - 15% Bonus stability
 * - 15% User weighted reports
 * - 10% FreeSpinScan validation
 * - 5% Regulatory compliance
 * - 5% Support quality
 * 
 * Degen Trust Scoring (0-100):
 * - Very High: 95-100
 * - High: 80-94
 * - Neutral: 60-79
 * - Low: 40-59
 * - High Risk: <40
 */

import { eventRouter } from '@tiltcheck/event-router';
import { db } from '@tiltcheck/database';
import type { TiltCheckEvent, TrustCasinoUpdateEvent } from '@tiltcheck/types';
import fs from 'fs';
import path from 'path';
import { computeSeverity, penaltyForSeverity } from '@tiltcheck/config';

export interface TrustEnginesConfig {
  startingCasinoScore: number;
  startingUserScore: number;
  autoSubscribe?: boolean;
  severityScale?: number[];
  logger?: TrustLogger;
  persistDir?: string;
  logDir?: string;
  maxLogSizeBytes?: number;
  maxLogFiles?: number;
  recoveryRatePerHour?: number; // Natural trust recovery rate
}

export interface TrustLogger {
  debug?(msg: string, meta?: any): void;
  info?(msg: string, meta?: any): void;
  warn?(msg: string, meta?: any): void;
  error?(msg: string, meta?: any): void;
}

export interface CasinoTrustRecord {
  score: number;
  fairnessScore: number; // 30%
  payoutScore: number; // 20%
  bonusScore: number; // 15%
  userReportScore: number; // 15%
  freespinScore: number; // 10%
  complianceScore: number; // 5%
  supportScore: number; // 5%
  history: TrustEvent[];
  lastUpdated: number;
}

export interface DegenTrustRecord {
  score: number;
  tiltIndicators: number; // Temporary drops
  behaviorScore: number;
  scamFlags: number;
  accountabilityBonus: number;
  communityReports: number;
  history: TrustEvent[];
  lastUpdated: number;
  recoveryScheduledAt?: number;
}

export interface TrustEvent {
  timestamp: number;
  delta: number;
  reason: string;
  severity?: number;
  category: string;
}

export type TrustLevel = 'very-high' | 'high' | 'neutral' | 'low' | 'high-risk';

const defaultConfig: TrustEnginesConfig = {
  startingCasinoScore: 75,
  startingUserScore: 70,
  autoSubscribe: true,
  severityScale: [2, 4, 6, 8, 12],
  logger: undefined,
  persistDir: process.env.TRUST_ENGINES_PERSIST_DIR || './data',
  logDir: process.env.TRUST_ENGINES_LOG_DIR,
  maxLogSizeBytes: 256 * 1024,
  maxLogFiles: 3,
  recoveryRatePerHour: 0.5, // Scores recover 0.5 points/hour naturally
};

export class TrustEnginesService {
  private casinoRecords = new Map<string, CasinoTrustRecord>();
  private degenRecords = new Map<string, DegenTrustRecord>();
  private cfg: TrustEnginesConfig;
  private recoveryInterval?: NodeJS.Timeout;

  constructor(config?: Partial<TrustEnginesConfig>) {
    this.cfg = { ...defaultConfig, ...(config || {}) };
    if (!this.cfg.logger && process.env.TRUST_ENGINES_LOG_ERRORS === '1') {
      this.cfg.logger = console;
    }
    
    this.loadPersisted();
    this.startRecoveryScheduler();

    if (this.cfg.autoSubscribe) {
      this.subscribeToEvents();
    }
  }

  private subscribeToEvents() {
    // Casino trust events
    eventRouter.subscribe('link.flagged', this.onLinkFlagged.bind(this), 'trust-engine-casino');
    eventRouter.subscribe('bonus.nerf.detected', this.onBonusNerf.bind(this), 'trust-engine-casino');
    eventRouter.subscribe('trust.casino.rollup', this.onCasinoRollup.bind(this), 'trust-engine-casino');
    eventRouter.subscribe('trust.domain.rollup', this.onDomainRollup.bind(this), 'trust-engine-casino');
    
    // Degen trust events
    eventRouter.subscribe('tip.completed', this.onTipCompleted.bind(this), 'trust-engine-degen');
    eventRouter.subscribe('tilt.detected', this.onTiltDetected.bind(this), 'trust-engine-degen');
    eventRouter.subscribe('cooldown.violated', this.onCooldownViolated.bind(this), 'trust-engine-degen');
    eventRouter.subscribe('scam.reported', this.onScamReported.bind(this), 'trust-engine-degen');
    eventRouter.subscribe('accountability.success', this.onAccountabilitySuccess.bind(this), 'trust-engine-degen');
  }

  // ============================================
  // CASINO TRUST ENGINE
  // ============================================

  private getCasinoRecord(casinoName: string): CasinoTrustRecord {
    if (!this.casinoRecords.has(casinoName)) {
      this.casinoRecords.set(casinoName, {
        score: this.cfg.startingCasinoScore,
        fairnessScore: 75,
        payoutScore: 75,
        bonusScore: 75,
        userReportScore: 75,
        freespinScore: 75,
        complianceScore: 75,
        supportScore: 75,
        history: [],
        lastUpdated: Date.now(),
      });
    }
    return this.casinoRecords.get(casinoName)!;
  }

  private updateCasinoScore(
    casinoName: string,
    category: keyof Omit<CasinoTrustRecord, 'score' | 'history' | 'lastUpdated'>,
    delta: number,
    reason: string,
    severity?: number
  ) {
    const record = this.getCasinoRecord(casinoName);
    const previousScore = record.score;

    // Update category score
    const currentCategoryScore = record[category] as number;
    const newCategoryScore = Math.max(0, Math.min(100, currentCategoryScore + delta));
    (record[category] as number) = newCategoryScore;

    // Recalculate weighted total score
    record.score = Math.round(
      record.fairnessScore * 0.30 +
      record.payoutScore * 0.20 +
      record.bonusScore * 0.15 +
      record.userReportScore * 0.15 +
      record.freespinScore * 0.10 +
      record.complianceScore * 0.05 +
      record.supportScore * 0.05
    );

    // Add to history
    record.history.push({
      timestamp: Date.now(),
      delta: record.score - previousScore,
      reason,
      severity,
      category,
    });

    // Keep last 100 events
    if (record.history.length > 100) {
      record.history = record.history.slice(-100);
    }

    record.lastUpdated = Date.now();

    // Publish trust update event
    const trustEvt: TrustCasinoUpdateEvent = {
      casinoName,
      previousScore,
      newScore: record.score,
      delta: record.score - previousScore,
      severity,
      reason,
      source: 'trust-engine-casino',
    };
    
    void eventRouter.publish('trust.casino.updated', 'trust-engine-casino', trustEvt);
    this.log('info', `Casino ${casinoName} score: ${previousScore} → ${record.score} (${category}: ${reason})`, trustEvt);
    this.persist();
  }

  private async onLinkFlagged(event: TiltCheckEvent) {
    const { url, riskLevel } = event.data as any;
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const delta = riskLevel === 'critical' ? -10 : -5;
      const severity = riskLevel === 'critical' ? 4 : 2;
      this.updateCasinoScore(hostname, 'freespinScore', delta, `Suspicious link flagged (${riskLevel})`, severity);
    } catch {
      this.log('warn', 'Invalid URL in link.flagged event', { url });
    }
  }

  private async onBonusNerf(event: TiltCheckEvent) {
    const { casinoName, percentDrop } = event.data as any;
    if (!casinoName || typeof percentDrop !== 'number') return;
    
    const severity = computeSeverity(Math.abs(percentDrop));
    const scale = this.cfg.severityScale || defaultConfig.severityScale!;
    const delta = penaltyForSeverity(severity, scale);
    
    this.updateCasinoScore(
      casinoName,
      'bonusScore',
      delta,
      `Bonus nerf detected (-${(Math.abs(percentDrop) * 100).toFixed(1)}%)`,
      severity
    );
  }

  private async onCasinoRollup(event: TiltCheckEvent) {
    const { casinos, source } = event.data as any;
    if (!casinos) return;

    // Process hourly aggregated casino trust events
    for (const [casinoName, agg] of Object.entries(casinos as Record<string, any>)) {
      const { totalDelta, events: eventCount, externalData } = agg;
      if (eventCount === 0 && !externalData) continue;

      // If this is from external verification, apply detailed deltas
      if (source === 'external-verification' && externalData) {
        if (externalData.fairnessDelta) {
          this.updateCasinoScore(
            casinoName,
            'fairnessScore',
            externalData.fairnessDelta,
            'External RTP/fairness verification'
          );
        }
        if (externalData.payoutDelta) {
          this.updateCasinoScore(
            casinoName,
            'payoutScore',
            externalData.payoutDelta,
            'External payout speed verification'
          );
        }
        if (externalData.bonusDelta) {
          this.updateCasinoScore(
            casinoName,
            'bonusScore',
            externalData.bonusDelta,
            'External bonus terms verification'
          );
        }
        if (externalData.complianceDelta) {
          this.updateCasinoScore(
            casinoName,
            'complianceScore',
            externalData.complianceDelta,
            'External compliance verification'
          );
        }
        if (externalData.supportDelta) {
          this.updateCasinoScore(
            casinoName,
            'supportScore',
            externalData.supportDelta,
            'External support quality verification'
          );
        }
      } else if (eventCount > 0) {
        // Standard rollup from internal events
        const avgDelta = totalDelta / eventCount;
        const delta = Math.max(-5, Math.min(5, avgDelta / 2)); // Dampened rollup impact
        
        this.updateCasinoScore(
          casinoName,
          'bonusScore',
          delta,
          `Hourly rollup: ${eventCount} events, avg Δ${avgDelta.toFixed(1)}`
        );
      }
    }
  }

  private async onDomainRollup(event: TiltCheckEvent) {
    const { domains } = event.data as any;
    if (!domains) return;

    // Process hourly aggregated domain trust events from SusLink
    for (const [domain, agg] of Object.entries(domains as Record<string, any>)) {
      const { totalDelta, events: eventCount, lastSeverity } = agg;
      if (eventCount === 0) continue;

      const avgDelta = totalDelta / eventCount;
      const delta = Math.max(-8, Math.min(3, avgDelta / 3)); // Domains have stronger negative impact
      
      this.updateCasinoScore(
        domain,
        'complianceScore',
        delta,
        `Domain rollup: ${eventCount} events, avg Δ${avgDelta.toFixed(1)}`,
        lastSeverity
      );
    }
  }

  // ============================================
  // DEGEN TRUST ENGINE
  // ============================================

  private getDegenRecord(userId: string): DegenTrustRecord {
    if (!this.degenRecords.has(userId)) {
      this.degenRecords.set(userId, {
        score: this.cfg.startingUserScore,
        tiltIndicators: 0,
        behaviorScore: 70,
        scamFlags: 0,
        accountabilityBonus: 0,
        communityReports: 0,
        history: [],
        lastUpdated: Date.now(),
      });
    }
    return this.degenRecords.get(userId)!;
  }

  private updateDegenScore(
    userId: string,
    delta: number,
    reason: string,
    category: 'tilt' | 'behavior' | 'scam' | 'accountability' | 'community',
    severity?: number
  ) {
    const record = this.getDegenRecord(userId);
    const previousScore = record.score;

    // Apply delta based on category
    switch (category) {
      case 'tilt':
        record.tiltIndicators = Math.max(0, record.tiltIndicators + delta);
        break;
      case 'behavior':
        record.behaviorScore = Math.max(0, Math.min(100, record.behaviorScore + delta));
        break;
      case 'scam':
        // Scam category: increment flag count (delta is ignored for this category)
        record.scamFlags = Math.max(0, record.scamFlags + 1);
        break;
      case 'accountability':
        record.accountabilityBonus = Math.max(0, Math.min(20, record.accountabilityBonus + delta));
        break;
      case 'community':
        record.communityReports = Math.max(-20, Math.min(10, record.communityReports + delta));
        break;
    }

    // Recalculate overall score
    const tiltPenalty = Math.min(30, record.tiltIndicators * 5); // Max -30 from tilt
    const scamPenalty = record.scamFlags * 15; // -15 per confirmed scam
    
    record.score = Math.max(0, Math.min(100,
      record.behaviorScore +
      record.accountabilityBonus +
      record.communityReports -
      tiltPenalty -
      scamPenalty
    ));

    // Add to history
    record.history.push({
      timestamp: Date.now(),
      delta: record.score - previousScore,
      reason,
      severity,
      category,
    });

    if (record.history.length > 100) {
      record.history = record.history.slice(-100);
    }

    record.lastUpdated = Date.now();

    // Publish degen trust update
    void eventRouter.publish(
      'trust.degen.updated',
      'trust-engine-degen',
      {
        userId,
        previousScore,
        newScore: record.score,
        delta: record.score - previousScore,
        level: this.getTrustLevel(record.score),
        reason,
      },
      userId
    );

    this.log('info', `Degen ${userId} score: ${previousScore} → ${record.score} (${category}: ${reason})`);
    
    // Persist to database
    void db.updateTrustScore(userId, record.score);
    
    this.persist();
  }

  private async onTipCompleted(event: TiltCheckEvent) {
    const { fromUserId, toUserId, amount } = event.data as any;
    if (!fromUserId || !toUserId) return;

    // Positive trust for completing tips
    this.updateDegenScore(fromUserId, +1, 'Completed tip transaction', 'behavior');
    this.updateDegenScore(toUserId, +0.5, 'Received tip', 'behavior');

    // Generosity bonus for large tips
    if (amount > 100) {
      this.updateDegenScore(fromUserId, +2, `Large tip: $${amount}`, 'accountability');
    }
  }

  private async onTiltDetected(event: TiltCheckEvent) {
    const { userId, severity } = event.data as any;
    if (!userId) return;

    // Tilt is temporary - increases tilt indicators
    const delta = severity || 1;
    this.updateDegenScore(userId, delta, 'Tilt behavior detected', 'tilt', severity);

    // Schedule recovery
    const record = this.getDegenRecord(userId);
    record.recoveryScheduledAt = Date.now() + (3600000 * 4); // 4 hours
  }

  private async onCooldownViolated(event: TiltCheckEvent) {
    const { userId, severity } = event.data as any;
    if (!userId) return;

    const delta = -(severity || 2) * 2; // -4 to -10
    this.updateDegenScore(userId, delta, 'Violated cooldown', 'behavior', severity);
  }

  private async onScamReported(event: TiltCheckEvent) {
    const { reporterId, accusedId, verified, falseReport } = event.data as any;
    
    if (verified && accusedId) {
      // Confirmed scam - heavy penalty
      this.updateDegenScore(accusedId, 0, 'Confirmed scam report', 'scam', 5);
    } else if (falseReport && reporterId) {
      // False accusation - both lose trust
      this.updateDegenScore(reporterId, -10, 'False scam accusation', 'behavior', 3);
      this.updateDegenScore(accusedId, -3, 'Involved in false scam accusation', 'community');
    }
  }

  private async onAccountabilitySuccess(event: TiltCheckEvent) {
    const { userId, action } = event.data as any;
    if (!userId) return;

    const bonuses: Record<string, number> = {
      'cooldown-accepted': 2,
      'vault-used': 3,
      'phone-a-friend': 2,
      'smart-withdrawal': 4,
    };

    const bonus = bonuses[action] || 1;
    this.updateDegenScore(userId, bonus, `Accountability: ${action}`, 'accountability');
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getCasinoScore(casinoName: string): number {
    return this.getCasinoRecord(casinoName).score;
  }

  getCasinoBreakdown(casinoName: string): CasinoTrustRecord {
    return { ...this.getCasinoRecord(casinoName) };
  }

  getDegenScore(userId: string): number {
    return this.getDegenRecord(userId).score;
  }

  getDegenBreakdown(userId: string): DegenTrustRecord {
    return { ...this.getDegenRecord(userId) };
  }

  getTrustLevel(score: number): TrustLevel {
    if (score >= 95) return 'very-high';
    if (score >= 80) return 'high';
    if (score >= 60) return 'neutral';
    if (score >= 40) return 'low';
    return 'high-risk';
  }

  explainCasinoScore(casinoName: string): string[] {
    const record = this.getCasinoRecord(casinoName);
    const explanations: string[] = [];

    if (record.bonusScore < 60) {
      explanations.push('⚠️ Frequent bonus nerfs detected');
    }
    if (record.fairnessScore < 60) {
      explanations.push('⚠️ Fairness concerns reported');
    }
    if (record.payoutScore < 60) {
      explanations.push('⚠️ Payout delays or issues');
    }
    if (record.freespinScore < 60) {
      explanations.push('⚠️ Suspicious promotional links');
    }
    if (record.supportScore < 60) {
      explanations.push('⚠️ Poor support quality');
    }

    if (explanations.length === 0) {
      explanations.push('✅ No major trust issues detected');
    }

    // Add recent significant events
    const recentEvents = record.history.slice(-5);
    recentEvents.forEach(evt => {
      if (Math.abs(evt.delta) >= 3) {
        explanations.push(`${evt.delta > 0 ? '📈' : '📉'} ${evt.reason}`);
      }
    });

    return explanations;
  }

  explainDegenScore(userId: string): string[] {
    const record = this.getDegenRecord(userId);
    const explanations: string[] = [];
    const level = this.getTrustLevel(record.score);

    explanations.push(`Trust Level: ${level.toUpperCase().replace('-', ' ')}`);

    if (record.tiltIndicators > 3) {
      explanations.push('⚠️ Recent tilt behavior detected');
    }
    if (record.scamFlags > 0) {
      explanations.push(`🚨 ${record.scamFlags} confirmed scam report(s)`);
    }
    if (record.accountabilityBonus > 10) {
      explanations.push('✅ Strong accountability tool usage');
    }
    if (record.behaviorScore > 85) {
      explanations.push('✅ Excellent community behavior');
    }
    if (record.communityReports < -10) {
      explanations.push('⚠️ Multiple negative community reports');
    }

    // Recent events
    const recentEvents = record.history.slice(-3);
    recentEvents.forEach(evt => {
      if (Math.abs(evt.delta) >= 5) {
        explanations.push(`${evt.delta > 0 ? '📈' : '📉'} ${evt.reason}`);
      }
    });

    return explanations;
  }

  // ============================================
  // PERSISTENCE & RECOVERY
  // ============================================

  private persist() {
    if (!this.cfg.persistDir) return;
    
    try {
      if (!fs.existsSync(this.cfg.persistDir)) {
        fs.mkdirSync(this.cfg.persistDir, { recursive: true });
      }

      const casinoPath = path.join(this.cfg.persistDir, 'casino-trust.json');
      const degenPath = path.join(this.cfg.persistDir, 'degen-trust.json');

      fs.writeFileSync(
        casinoPath,
        JSON.stringify(Array.from(this.casinoRecords.entries()), null, 2)
      );

      fs.writeFileSync(
        degenPath,
        JSON.stringify(Array.from(this.degenRecords.entries()), null, 2)
      );
    } catch (err) {
      this.log('error', 'Failed to persist trust data', err);
    }
  }

  private loadPersisted() {
    if (!this.cfg.persistDir) return;

    try {
      const casinoPath = path.join(this.cfg.persistDir, 'casino-trust.json');
      const degenPath = path.join(this.cfg.persistDir, 'degen-trust.json');

      if (fs.existsSync(casinoPath)) {
        const data = JSON.parse(fs.readFileSync(casinoPath, 'utf-8'));
        this.casinoRecords = new Map(data);
        this.log('info', `Loaded ${this.casinoRecords.size} casino trust records`);
      }

      if (fs.existsSync(degenPath)) {
        const data = JSON.parse(fs.readFileSync(degenPath, 'utf-8'));
        this.degenRecords = new Map(data);
        this.log('info', `Loaded ${this.degenRecords.size} degen trust records`);
      }
    } catch (err) {
      this.log('warn', 'Failed to load persisted trust data', err);
    }
  }

  private startRecoveryScheduler() {
    // Run recovery every hour
    this.recoveryInterval = setInterval(() => {
      this.runRecovery();
    }, 3600000); // 1 hour
  }

  private runRecovery() {
    const now = Date.now();
    const rate = this.cfg.recoveryRatePerHour || 0.5;

    // Recover tilt indicators for degen trust
    for (const [userId, record] of this.degenRecords.entries()) {
      if (record.tiltIndicators > 0) {
        const hoursElapsed = (now - record.lastUpdated) / 3600000;
        const recovery = Math.min(record.tiltIndicators, rate * hoursElapsed);
        
        if (recovery > 0) {
          this.updateDegenScore(userId, -recovery, 'Natural tilt recovery', 'tilt');
        }
      }
    }

    this.log('debug', 'Trust recovery cycle complete');
  }

  shutdown() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    this.persist();
  }

  // Test utility - clear all state
  clearState() {
    this.casinoRecords.clear();
    this.degenRecords.clear();
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
