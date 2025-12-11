import { describe, it, expect, beforeEach } from 'vitest';
import { CollectClockService } from '../src/index';
import fs from 'fs';
import path from 'path';
import { eventRouter } from '@tiltcheck/event-router';

let service: CollectClockService;

describe('CollectClockService', () => {
  beforeEach(() => {
    service = new CollectClockService({ defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    service.registerCasino('CasinoA', 1.0, 1000); // 1 second cooldown for test
  });

  it('registers casino and publishes bonus.updated', () => {
    const events = eventRouter.getHistory({ eventType: 'bonus.updated' });
    expect(events.length).toBe(1);
    expect(events[0].data.newAmount).toBe(1.0);
  });

  it('updates bonus and publishes bonus.updated', () => {
    service.updateBonus('CasinoA', 1.2);
    const events = eventRouter.getHistory({ eventType: 'bonus.updated' });
    expect(events.length).toBe(2);
    expect(events[1].data.newAmount).toBe(1.2);
  });

  it('detects nerf on drop exceeding threshold and publishes bonus.nerf.detected + trust event', () => {
    service.updateBonus('CasinoA', 0.75); // 25% drop -> threshold 10%
    const nerfEvents = eventRouter.getHistory({ eventType: 'bonus.nerf.detected' });
    expect(nerfEvents.length).toBe(1);
    expect(nerfEvents[0].data.percentDrop).toBeGreaterThanOrEqual(0.25);
    const trustEvents = eventRouter.getHistory({ eventType: 'trust.casino.updated' });
    expect(trustEvents.length).toBeGreaterThanOrEqual(1);
    const ccEvent = trustEvents.find((e: any) => e.source === 'collectclock' || e.data.source === 'collectclock');
    expect(ccEvent).toBeDefined();
  });

  it('claims bonus enforcing cooldown', async () => {
    const claim = service.claimBonus('CasinoA', 'user123');
    expect(claim.amount).toBe(1.0);
    const claimEvents = eventRouter.getHistory({ eventType: 'bonus.claimed' });
    expect(claimEvents.length).toBe(1);
    expect(claimEvents[0].data.userId).toBe('user123');

    await new Promise(r => setTimeout(r, 1100));
    const claim2 = service.claimBonus('CasinoA', 'user123');
    expect(claim2.claimedAt).toBeGreaterThan(claim.claimedAt);
    const claimEvents2 = eventRouter.getHistory({ eventType: 'bonus.claimed' });
    expect(claimEvents2.length).toBe(2);
  });

  it('blocks claim during cooldown', () => {
    service.claimBonus('CasinoA', 'userCool');
    expect(() => service.claimBonus('CasinoA', 'userCool')).toThrow('Cooldown active');
  });

  it('generates prediction with volatility fields', () => {
    service.updateBonus('CasinoA', 1.1);
    service.updateBonus('CasinoA', 1.3);
    const pred = service.predictNext('CasinoA');
    expect(pred.predictedAmount).toBeCloseTo((1.0 + 1.1 + 1.3) / 3);
    const predEvents = eventRouter.getHistory({ eventType: 'bonus.prediction.generated' });
    expect(predEvents.length).toBe(1);
    expect(predEvents[0].data.casinoName).toBe('CasinoA');
    expect(pred.volatility).toBeDefined();
    expect(pred.volatilityScore).toBeGreaterThanOrEqual(0);
  });

  it('prediction handles short history with reduced confidence', () => {
    const shortSvc = new CollectClockService({ defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 5 });
    eventRouter.clearHistory();
    shortSvc.registerCasino('ShortCasino', 2.0, 1000);
    shortSvc.updateBonus('ShortCasino', 3.0);
    const pred = shortSvc.predictNext('ShortCasino');
    expect(pred.basisSampleSize).toBe(2);
    expect(pred.confidence).toBeCloseTo(0.4);
  });

  it('prunes persisted history beyond maxHistoryEntries', () => {
    const tmpDir = path.join(__dirname, 'tmpdata_pruned');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    const prunedSvc = new CollectClockService({ persistenceDir: tmpDir, maxHistoryEntries: 3, defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    prunedSvc.registerCasino('CasinoPrune', 5.0, 1000);
    prunedSvc.updateBonus('CasinoPrune', 5.5);
    prunedSvc.updateBonus('CasinoPrune', 6.0);
    prunedSvc.updateBonus('CasinoPrune', 6.5);
    prunedSvc.updateBonus('CasinoPrune', 7.0);
    const filePath = path.join(tmpDir, 'CasinoPrune.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const contents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(contents.length).toBe(3);
    const amounts = contents.map((c:any) => c.amount);
    expect(amounts).toEqual([6.0, 6.5, 7.0]);
  });

  it('persists history externally when configured', () => {
    const tmpDir = path.join(__dirname, 'tmpdata');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    const svc = new CollectClockService({ persistenceDir: tmpDir, defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    svc.registerCasino('CasinoPersist', 2.0, 1000);
    svc.updateBonus('CasinoPersist', 2.1);
    const filePath = path.join(tmpDir, 'CasinoPersist.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const contents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(contents.length).toBe(2);
    expect(contents[0].amount).toBe(2.0);
    expect(contents[1].amount).toBe(2.1);
  });
});

// =============================================
// User Timer Tests
// =============================================

describe('CollectClockService - User Timers', () => {
  let service: CollectClockService;

  beforeEach(() => {
    service = new CollectClockService({ defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    service.registerCasino('CasinoA', 1.0, 1000);
    service.registerCasino('CasinoB', 2.0, 2000);
  });

  it('returns all timers for a user with unclaimed bonuses ready', () => {
    const timers = service.getUserTimers('user1');
    expect(timers.length).toBe(2);
    expect(timers.every(t => t.isReady)).toBe(true);
    expect(timers.every(t => t.remainingMs === 0)).toBe(true);
  });

  it('returns timer showing cooldown after claim', () => {
    service.claimBonus('CasinoA', 'user1');
    const timers = service.getUserTimers('user1');
    const timerA = timers.find(t => t.casinoName === 'CasinoA');
    const timerB = timers.find(t => t.casinoName === 'CasinoB');

    expect(timerA?.isReady).toBe(false);
    expect(timerA?.remainingMs).toBeGreaterThan(0);
    expect(timerB?.isReady).toBe(true);
  });

  it('returns specific timer for a casino', () => {
    service.claimBonus('CasinoA', 'user1');
    const timer = service.getUserTimer('user1', 'CasinoA');
    
    expect(timer).toBeDefined();
    expect(timer?.casinoName).toBe('CasinoA');
    expect(timer?.isReady).toBe(false);
    expect(timer?.currentAmount).toBe(1.0);
  });

  it('returns only ready timers', () => {
    service.claimBonus('CasinoA', 'user1');
    const ready = service.getReadyTimers('user1');
    
    expect(ready.length).toBe(1);
    expect(ready[0].casinoName).toBe('CasinoB');
  });

  it('returns undefined for non-existent casino timer', () => {
    const timer = service.getUserTimer('user1', 'NonExistent');
    expect(timer).toBeUndefined();
  });
});

// =============================================
// Custom Category Tests
// =============================================

describe('CollectClockService - Custom Categories', () => {
  let service: CollectClockService;

  beforeEach(() => {
    service = new CollectClockService({ defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    service.registerCasino('CasinoA', 1.0, 1000);
  });

  it('creates custom bonus category', () => {
    const category = service.createCustomCategory('user1', 'CasinoA', 'Streak Bonus', 86400000, 'Daily streak');
    
    expect(category.userId).toBe('user1');
    expect(category.casinoName).toBe('CasinoA');
    expect(category.categoryName).toBe('Streak Bonus');
    expect(category.cooldownMs).toBe(86400000);
    expect(category.notes).toBe('Daily streak');
  });

  it('throws when creating duplicate category', () => {
    service.createCustomCategory('user1', 'CasinoA', 'Streak Bonus', 86400000);
    expect(() => service.createCustomCategory('user1', 'CasinoA', 'Streak Bonus', 86400000)).toThrow('Category already exists');
  });

  it('claims custom category and enforces cooldown', () => {
    service.createCustomCategory('user1', 'CasinoA', 'Streak Bonus', 1000);
    
    const timer = service.claimCustomCategory('user1', 'CasinoA', 'Streak Bonus');
    expect(timer.isReady).toBe(false);
    expect(timer.categoryName).toBe('Streak Bonus');

    // Should throw during cooldown
    expect(() => service.claimCustomCategory('user1', 'CasinoA', 'Streak Bonus')).toThrow('Cooldown active for custom category');
  });

  it('throws when claiming non-existent category', () => {
    expect(() => service.claimCustomCategory('user1', 'CasinoA', 'NonExistent')).toThrow('Category not found');
  });

  it('gets all user custom categories', () => {
    service.createCustomCategory('user1', 'CasinoA', 'Streak Bonus', 86400000);
    service.createCustomCategory('user1', 'CasinoA', 'Weekly Bonus', 604800000);
    service.createCustomCategory('user2', 'CasinoA', 'Streak Bonus', 86400000);

    const user1Categories = service.getUserCustomCategories('user1');
    expect(user1Categories.length).toBe(2);
    expect(user1Categories.every(c => c.userId === 'user1')).toBe(true);
  });

  it('deletes custom category', () => {
    service.createCustomCategory('user1', 'CasinoA', 'Streak Bonus', 86400000);
    const deleted = service.deleteCustomCategory('user1', 'CasinoA', 'Streak Bonus');
    
    expect(deleted).toBe(true);
    expect(service.getUserCustomCategories('user1').length).toBe(0);
  });

  it('custom category timers appear in getUserTimers', () => {
    service.createCustomCategory('user1', 'CasinoA', 'Streak Bonus', 1000);
    const timers = service.getUserTimers('user1');
    
    const customTimer = timers.find(t => t.categoryName === 'Streak Bonus');
    expect(customTimer).toBeDefined();
    expect(customTimer?.isReady).toBe(true);
  });
});

// =============================================
// Notification Subscription Tests
// =============================================

describe('CollectClockService - Notifications', () => {
  let service: CollectClockService;

  beforeEach(() => {
    service = new CollectClockService({ defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    service.registerCasino('CasinoA', 1.0, 1000);
  });

  it('subscribes to notifications', () => {
    const sub = service.subscribeNotifications('user1', 'CasinoA', { notifyOnReady: true, notifyOnNerf: true });
    
    expect(sub.userId).toBe('user1');
    expect(sub.casinoName).toBe('CasinoA');
    expect(sub.notifyOnReady).toBe(true);
    expect(sub.notifyOnNerf).toBe(true);
    expect(sub.discordDM).toBe(true);
  });

  it('uses default notification options', () => {
    const sub = service.subscribeNotifications('user1', 'CasinoA');
    
    expect(sub.notifyOnReady).toBe(true);
    expect(sub.notifyOnNerf).toBe(true);
    expect(sub.discordDM).toBe(true);
  });

  it('unsubscribes from notifications', () => {
    service.subscribeNotifications('user1', 'CasinoA');
    const result = service.unsubscribeNotifications('user1', 'CasinoA');
    
    expect(result).toBe(true);
    expect(service.getUserNotifications('user1').length).toBe(0);
  });

  it('gets all user notifications', () => {
    service.registerCasino('CasinoB', 2.0, 2000);
    service.subscribeNotifications('user1', 'CasinoA');
    service.subscribeNotifications('user1', 'CasinoB');
    service.subscribeNotifications('user2', 'CasinoA');

    const user1Subs = service.getUserNotifications('user1');
    expect(user1Subs.length).toBe(2);
  });

  it('gets casino subscribers', () => {
    service.subscribeNotifications('user1', 'CasinoA');
    service.subscribeNotifications('user2', 'CasinoA');

    const subs = service.getCasinoSubscribers('CasinoA');
    expect(subs.length).toBe(2);
  });
});

// =============================================
// User History Tests
// =============================================

describe('CollectClockService - User History', () => {
  let service: CollectClockService;

  beforeEach(() => {
    service = new CollectClockService({ defaultCooldownMs: 100, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    service.registerCasino('CasinoA', 1.0, 100);
    service.registerCasino('CasinoB', 2.0, 100);
  });

  it('records claim to user history', async () => {
    service.claimBonus('CasinoA', 'user1');
    
    const history = service.getUserBonusHistory('user1');
    expect(history.length).toBe(1);
    expect(history[0].casinoName).toBe('CasinoA');
    expect(history[0].amount).toBe(1.0);
  });

  it('filters history by casino', async () => {
    service.claimBonus('CasinoA', 'user1');
    await new Promise(r => setTimeout(r, 150));
    service.claimBonus('CasinoB', 'user1');

    const casinoAHistory = service.getUserBonusHistory('user1', { casinoName: 'CasinoA' });
    expect(casinoAHistory.length).toBe(1);
    expect(casinoAHistory[0].casinoName).toBe('CasinoA');
  });

  it('limits history results', async () => {
    service.claimBonus('CasinoA', 'user1');
    await new Promise(r => setTimeout(r, 150));
    service.claimBonus('CasinoA', 'user1');
    await new Promise(r => setTimeout(r, 150));
    service.claimBonus('CasinoA', 'user1');

    const limited = service.getUserBonusHistory('user1', { limit: 2 });
    expect(limited.length).toBe(2);
  });

  it('returns history sorted by most recent', async () => {
    service.claimBonus('CasinoA', 'user1');
    await new Promise(r => setTimeout(r, 150));
    service.claimBonus('CasinoB', 'user1');

    const history = service.getUserBonusHistory('user1');
    expect(history[0].casinoName).toBe('CasinoB'); // Most recent first
    expect(history[1].casinoName).toBe('CasinoA');
  });

  it('calculates user bonus stats', async () => {
    service.claimBonus('CasinoA', 'user1');
    await new Promise(r => setTimeout(r, 150));
    service.claimBonus('CasinoA', 'user1');
    await new Promise(r => setTimeout(r, 150));
    service.claimBonus('CasinoB', 'user1');

    const stats = service.getUserBonusStats('user1');
    expect(stats.totalClaims).toBe(3);
    expect(stats.totalAmount).toBe(4.0); // 1.0 + 1.0 + 2.0
    expect(stats.casinoBreakdown['CasinoA'].claims).toBe(2);
    expect(stats.casinoBreakdown['CasinoB'].claims).toBe(1);
  });
});

// =============================================
// Nerf Tracking Tests
// =============================================

describe('CollectClockService - Nerf Tracking', () => {
  let service: CollectClockService;

  beforeEach(() => {
    service = new CollectClockService({ defaultCooldownMs: 1000, nerfThresholdPercent: 0.10, predictionWindow: 3 });
    eventRouter.clearHistory();
    service.registerCasino('CasinoA', 1.0, 1000);
    service.registerCasino('CasinoB', 2.0, 1000);
  });

  it('tracks nerf history for casino', () => {
    service.updateBonus('CasinoA', 0.8); // 20% drop
    service.updateBonus('CasinoA', 0.6); // 25% drop
    
    const nerfs = service.getNerfHistory('CasinoA');
    expect(nerfs.length).toBe(2);
    expect(nerfs[0].previousAmount).toBe(1.0);
    expect(nerfs[0].newAmount).toBe(0.8);
  });

  it('ignores small drops below threshold', () => {
    service.updateBonus('CasinoA', 0.95); // 5% drop (below 10% threshold)
    
    const nerfs = service.getNerfHistory('CasinoA');
    expect(nerfs.length).toBe(0);
  });

  it('gets all nerfed casinos', () => {
    service.updateBonus('CasinoA', 0.8); // 20% drop
    // CasinoB has no nerfs

    const nerfed = service.getAllNerfedCasinos();
    expect(nerfed.length).toBe(1);
    expect(nerfed[0].casinoName).toBe('CasinoA');
    expect(nerfed[0].nerfCount).toBe(1);
  });

  it('returns empty for non-nerfed casino', () => {
    const nerfs = service.getNerfHistory('CasinoA');
    expect(nerfs.length).toBe(0);
  });

  it('returns empty for non-existent casino nerf history', () => {
    const nerfs = service.getNerfHistory('NonExistent');
    expect(nerfs.length).toBe(0);
  });
});