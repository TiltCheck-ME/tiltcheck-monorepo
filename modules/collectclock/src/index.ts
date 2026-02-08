import { eventRouter } from '@tiltcheck/event-router';
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

interface CasinoBonusState {
  casinoName: string;
  currentAmount: number;
  lastUpdated: number;
  history: { amount: number; updatedAt: number }[];
  cooldownMs: number;
  claims: Map<string, number>;
}

// User-defined custom bonus categories
export interface CustomBonusCategory {
  id: string;
  userId: string;
  casinoName: string;
  categoryName: string; // e.g., "Daily SC", "Streak Bonus", "Deposit Match"
  cooldownMs: number;
  lastClaimed?: number;
  notes?: string;
  createdAt: number;
}

// Notification subscription for bonus alerts
export interface BonusNotificationSubscription {
  userId: string;
  casinoName: string;
  notifyOnReady: boolean;
  notifyOnNerf: boolean;
  discordDM: boolean;
  createdAt: number;
}

// User bonus claim history entry
export interface UserBonusHistoryEntry {
  userId: string;
  casinoName: string;
  amount: number;
  claimedAt: number;
  categoryId?: string;
}

// Timer info returned to users
export interface BonusTimer {
  casinoName: string;
  categoryName?: string;
  nextEligibleAt: number;
  remainingMs: number;
  isReady: boolean;
  currentAmount: number;
}

export interface TrustGatingConfig {
  enabled: boolean;
  minTrustScore: number;
  trustBandLimits: {
    RED: number;
    YELLOW: number;
    GREEN: number;
    PLATINUM: number;
  };
}

export interface CollectClockConfig {
  defaultCooldownMs: number;
  nerfThresholdPercent: number;
  predictionWindow: number;
  persistenceDir?: string;
  maxHistoryEntries?: number;
  severityScale?: number[];
  atomicPersistence?: boolean;
  logger?: CollectClockLogger;
  persistenceLogDir?: string;
  maxPersistenceLogSizeBytes?: number;
  maxPersistenceLogFiles?: number;
  trustGating?: TrustGatingConfig;
  notificationWindowMs?: number; // Window for "just became ready" notifications
  maxUserHistoryEntries?: number; // Max history entries per user
}

export interface CollectClockLogger {
  debug?(msg: string, meta?: any): void;
  info?(msg: string, meta?: any): void;
  warn?(msg: string, meta?: any): void;
  error?(msg: string, meta?: any): void;
}

const defaultConfig: CollectClockConfig = {
  defaultCooldownMs: 24 * 60 * 60 * 1000,
  nerfThresholdPercent: 0.15,
  predictionWindow: 5,
  persistenceDir: undefined,
  maxHistoryEntries: undefined,
  severityScale: [2,4,6,8,12],
  atomicPersistence: true,
  persistenceLogDir: process.env.COLLECTCLOCK_LOG_DIR,
  maxPersistenceLogSizeBytes: 256 * 1024,
  maxPersistenceLogFiles: 3,
  notificationWindowMs: 60000, // 1 minute window for "just became ready" notifications
  maxUserHistoryEntries: 1000, // Max history entries per user
};

export interface StaticBonusData {
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
}

export interface StaticDropData {
  lastUpdated: string;
  drops: Array<{
    date: string;
    time: string;
    amount: number | null;
  }>;
}

export class CollectClockService {
  private casinos: Map<string, CasinoBonusState> = new Map();
  private cfg: CollectClockConfig;
  
  // New: User-specific data stores
  private customCategories: Map<string, CustomBonusCategory> = new Map(); // key: `${userId}:${casinoName}:${categoryName}`
  private notifications: Map<string, BonusNotificationSubscription> = new Map(); // key: `${userId}:${casinoName}`
  private userHistory: UserBonusHistoryEntry[] = [];

  constructor(config?: Partial<CollectClockConfig>) {
    this.cfg = { ...defaultConfig, ...(config || {}) };
    if (!this.cfg.logger && process.env.COLLECTCLOCK_LOG_ERRORS === '1') {
      this.cfg.logger = console;
    }
  }

  /**
   * Initialize casinos from static JSON data files
   */
  initializeFromStaticData(bonusData: StaticBonusData[], dropData?: StaticDropData) {
    for (const data of bonusData) {
      // Try to parse amount from bonus string if possible, otherwise default to 1
      let amount = 1;
      const amountMatch = data.bonus.match(/(\d+(?:\.\d+)?)\s*(?:SC|Sweeps|Cash)/i);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1]);
      }

      // Check if already registered
      if (!this.casinos.has(data.brand)) {
        this.registerCasino(data.brand, amount);
      } else {
        this.updateBonus(data.brand, amount);
      }
    }

    // Drops data could be used to populate history or predictions
    if (dropData) {
      // For now we just log it or could use it to refine prediction basis
      this.cfg.logger?.info?.(`Loaded ${dropData.drops.length} historical drops for analysis`);
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

    if (this.cfg.persistenceDir) {
      try {
        if (!fs.existsSync(this.cfg.persistenceDir)) fs.mkdirSync(this.cfg.persistenceDir, { recursive: true });
        const filePath = path.join(this.cfg.persistenceDir, `${casinoName}.json`);
        const existing: any[] = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
        existing.push({ amount: newAmount, updatedAt: state.lastUpdated });
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
        const severity = computeSeverity(percentDrop);
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

  claimBonus(casinoName: string, userId: string, trustScore?: number, _trustBand?: string): BonusClaimEvent {
    const state = this.casinos.get(casinoName);
    if (!state) throw new Error('Casino not registered');
    
    // Trust gating check
    if (this.cfg.trustGating?.enabled) {
      if (trustScore === undefined) {
        throw new Error('Trust score required when trust gating is enabled');
      }
      if (trustScore < this.cfg.trustGating.minTrustScore) {
        throw new Error('Trust score too low to claim bonus');
      }
    }
    
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
    
    // Record to user history
    this.recordUserClaim(userId, casinoName, state.currentAmount);
    
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

  /**
   * Get all registered casino names
   */
  getCasinos(): string[] {
    return Array.from(this.casinos.keys());
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

  // =============================================
  // User Timer Management
  // =============================================

  /**
   * Get all bonus timers for a user across all registered casinos
   */
  getUserTimers(userId: string): BonusTimer[] {
    const now = Date.now();
    const timers: BonusTimer[] = [];

    for (const [casinoName, state] of this.casinos) {
      const lastClaim = state.claims.get(userId) || 0;
      const nextEligibleAt = lastClaim + state.cooldownMs;
      const remainingMs = Math.max(0, nextEligibleAt - now);
      
      timers.push({
        casinoName,
        nextEligibleAt: lastClaim === 0 ? now : nextEligibleAt,
        remainingMs: lastClaim === 0 ? 0 : remainingMs,
        isReady: lastClaim === 0 || remainingMs === 0,
        currentAmount: state.currentAmount,
      });
    }

    // Also include custom category timers
    for (const [, category] of this.customCategories) {
      if (category.userId !== userId) continue;
      const lastClaim = category.lastClaimed || 0;
      const nextEligibleAt = lastClaim + category.cooldownMs;
      const remainingMs = Math.max(0, nextEligibleAt - now);
      
      timers.push({
        casinoName: category.casinoName,
        categoryName: category.categoryName,
        nextEligibleAt: lastClaim === 0 ? now : nextEligibleAt,
        remainingMs: lastClaim === 0 ? 0 : remainingMs,
        isReady: lastClaim === 0 || remainingMs === 0,
        currentAmount: 0, // Custom categories don't track amounts
      });
    }

    return timers;
  }

  /**
   * Get timer for a specific casino for a user
   */
  getUserTimer(userId: string, casinoName: string): BonusTimer | undefined {
    const state = this.casinos.get(casinoName);
    if (!state) return undefined;

    const now = Date.now();
    const lastClaim = state.claims.get(userId) || 0;
    const nextEligibleAt = lastClaim + state.cooldownMs;
    const remainingMs = Math.max(0, nextEligibleAt - now);

    return {
      casinoName,
      nextEligibleAt: lastClaim === 0 ? now : nextEligibleAt,
      remainingMs: lastClaim === 0 ? 0 : remainingMs,
      isReady: lastClaim === 0 || remainingMs === 0,
      currentAmount: state.currentAmount,
    };
  }

  /**
   * Get all ready timers for a user (bonuses that can be claimed now)
   */
  getReadyTimers(userId: string): BonusTimer[] {
    return this.getUserTimers(userId).filter(t => t.isReady);
  }

  // =============================================
  // Custom Bonus Categories
  // =============================================

  /**
   * Create a custom bonus category for a user (e.g., "Daily SC", "Streak Bonus")
   */
  createCustomCategory(
    userId: string,
    casinoName: string,
    categoryName: string,
    cooldownMs: number,
    notes?: string
  ): CustomBonusCategory {
    const key = `${userId}:${casinoName}:${categoryName}`;
    if (this.customCategories.has(key)) {
      throw new Error('Category already exists');
    }

    const category: CustomBonusCategory = {
      id: key,
      userId,
      casinoName,
      categoryName,
      cooldownMs,
      notes,
      createdAt: Date.now(),
    };

    this.customCategories.set(key, category);
    return category;
  }

  /**
   * Claim a custom category bonus
   */
  claimCustomCategory(userId: string, casinoName: string, categoryName: string): BonusTimer {
    const key = `${userId}:${casinoName}:${categoryName}`;
    const category = this.customCategories.get(key);
    if (!category) {
      throw new Error('Category not found');
    }

    const now = Date.now();
    const lastClaim = category.lastClaimed || 0;
    if (lastClaim > 0 && now - lastClaim < category.cooldownMs) {
      throw new Error('Cooldown active for custom category');
    }

    category.lastClaimed = now;

    const nextEligibleAt = now + category.cooldownMs;
    return {
      casinoName,
      categoryName,
      nextEligibleAt,
      remainingMs: category.cooldownMs,
      isReady: false,
      currentAmount: 0,
    };
  }

  /**
   * Get all custom categories for a user
   */
  getUserCustomCategories(userId: string): CustomBonusCategory[] {
    return Array.from(this.customCategories.values()).filter(c => c.userId === userId);
  }

  /**
   * Delete a custom category
   */
  deleteCustomCategory(userId: string, casinoName: string, categoryName: string): boolean {
    const key = `${userId}:${casinoName}:${categoryName}`;
    return this.customCategories.delete(key);
  }

  // =============================================
  // Notification Subscriptions
  // =============================================

  /**
   * Subscribe to bonus notifications for a casino
   */
  subscribeNotifications(
    userId: string,
    casinoName: string,
    options: { notifyOnReady?: boolean; notifyOnNerf?: boolean; discordDM?: boolean } = {}
  ): BonusNotificationSubscription {
    const key = `${userId}:${casinoName}`;
    
    const subscription: BonusNotificationSubscription = {
      userId,
      casinoName,
      notifyOnReady: options.notifyOnReady ?? true,
      notifyOnNerf: options.notifyOnNerf ?? true,
      discordDM: options.discordDM ?? true,
      createdAt: Date.now(),
    };

    this.notifications.set(key, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from bonus notifications
   */
  unsubscribeNotifications(userId: string, casinoName: string): boolean {
    const key = `${userId}:${casinoName}`;
    return this.notifications.delete(key);
  }

  /**
   * Get all notification subscriptions for a user
   */
  getUserNotifications(userId: string): BonusNotificationSubscription[] {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  /**
   * Get users subscribed to a casino's notifications
   */
  getCasinoSubscribers(casinoName: string): BonusNotificationSubscription[] {
    return Array.from(this.notifications.values()).filter(n => n.casinoName === casinoName);
  }

  /**
   * Check pending notifications and return users who need to be notified
   * This should be called periodically by a scheduler
   */
  checkPendingNotifications(): Array<{ subscription: BonusNotificationSubscription; type: 'ready' | 'nerf'; details: any }> {
    const pending: Array<{ subscription: BonusNotificationSubscription; type: 'ready' | 'nerf'; details: any }> = [];
    const now = Date.now();

    for (const [, subscription] of this.notifications) {
      if (!subscription.notifyOnReady) continue;

      const state = this.casinos.get(subscription.casinoName);
      if (!state) continue;

      const lastClaim = state.claims.get(subscription.userId) || 0;
      const nextEligibleAt = lastClaim + state.cooldownMs;
      const notificationWindow = this.cfg.notificationWindowMs ?? 60000;
      
      // If bonus just became ready (within notification window)
      if (lastClaim > 0 && nextEligibleAt <= now && nextEligibleAt > now - notificationWindow) {
        pending.push({
          subscription,
          type: 'ready',
          details: {
            casinoName: subscription.casinoName,
            amount: state.currentAmount,
            readyAt: nextEligibleAt,
          },
        });
      }
    }

    return pending;
  }

  // =============================================
  // User Bonus History
  // =============================================

  /**
   * Get bonus claim history for a user
   */
  getUserBonusHistory(userId: string, options?: { casinoName?: string; limit?: number }): UserBonusHistoryEntry[] {
    let history = this.userHistory.filter(h => h.userId === userId);
    
    if (options?.casinoName) {
      history = history.filter(h => h.casinoName === options.casinoName);
    }
    
    // Sort by most recent first
    history.sort((a, b) => b.claimedAt - a.claimedAt);
    
    if (options?.limit) {
      history = history.slice(0, options.limit);
    }
    
    return history;
  }

  /**
   * Get bonus claim statistics for a user
   */
  getUserBonusStats(userId: string): { 
    totalClaims: number; 
    totalAmount: number; 
    casinoBreakdown: Record<string, { claims: number; amount: number }>;
  } {
    const userClaims = this.userHistory.filter(h => h.userId === userId);
    const casinoBreakdown: Record<string, { claims: number; amount: number }> = {};

    for (const claim of userClaims) {
      if (!casinoBreakdown[claim.casinoName]) {
        casinoBreakdown[claim.casinoName] = { claims: 0, amount: 0 };
      }
      casinoBreakdown[claim.casinoName].claims++;
      casinoBreakdown[claim.casinoName].amount += claim.amount;
    }

    return {
      totalClaims: userClaims.length,
      totalAmount: userClaims.reduce((sum, c) => sum + c.amount, 0),
      casinoBreakdown,
    };
  }

  /**
   * Record a bonus claim to user history
   * This is called internally when claimBonus succeeds
   */
  private recordUserClaim(userId: string, casinoName: string, amount: number, categoryId?: string): void {
    this.userHistory.push({
      userId,
      casinoName,
      amount,
      claimedAt: Date.now(),
      categoryId,
    });

    // Trim history per user to prevent memory bloat (more efficient single-pass)
    const maxEntries = this.cfg.maxUserHistoryEntries ?? 1000;
    let userCount = 0;
    
    // Count user entries efficiently
    for (const h of this.userHistory) {
      if (h.userId === userId) userCount++;
    }
    
    if (userCount > maxEntries) {
      const toRemove = userCount - maxEntries;
      let removed = 0;
      // Remove oldest entries first (they're at the beginning since we push new ones)
      this.userHistory = this.userHistory.filter(h => {
        if (h.userId === userId && removed < toRemove) {
          removed++;
          return false;
        }
        return true;
      });
    }
  }

  // =============================================
  // Nerf Tracking Enhancements
  // =============================================

  /**
   * Get nerf history for a casino
   */
  getNerfHistory(casinoName: string): { previousAmount: number; newAmount: number; percentDrop: number; detectedAt: number }[] {
    const state = this.casinos.get(casinoName);
    if (!state) return [];

    const nerfs: { previousAmount: number; newAmount: number; percentDrop: number; detectedAt: number }[] = [];
    const history = state.history;

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      if (curr.amount < prev.amount) {
        const drop = prev.amount - curr.amount;
        const percentDrop = drop / prev.amount;
        if (percentDrop >= this.cfg.nerfThresholdPercent) {
          nerfs.push({
            previousAmount: prev.amount,
            newAmount: curr.amount,
            percentDrop,
            detectedAt: curr.updatedAt,
          });
        }
      }
    }

    return nerfs;
  }

  /**
   * Get all casinos that have been nerfed
   */
  getAllNerfedCasinos(): { casinoName: string; nerfCount: number; lastNerf?: { percentDrop: number; detectedAt: number } }[] {
    const result: { casinoName: string; nerfCount: number; lastNerf?: { percentDrop: number; detectedAt: number } }[] = [];

    for (const [casinoName] of this.casinos) {
      const nerfs = this.getNerfHistory(casinoName);
      if (nerfs.length > 0) {
        result.push({
          casinoName,
          nerfCount: nerfs.length,
          lastNerf: nerfs[nerfs.length - 1],
        });
      }
    }

    return result;
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

export const collectclock = new CollectClockService();
