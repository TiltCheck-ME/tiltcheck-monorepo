import { describe, it, expect, beforeEach } from 'vitest';
import { CollectClockService } from '../src/index.js';
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
    // collectclock emits one; trust-engine will emit another asynchronously
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
    expect(pred.confidence).toBeCloseTo(0.4); // 2/5
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
    expect(contents.length).toBe(3); // pruned to maxHistoryEntries
    // Oldest entries removed; latest three amounts should be 6.0, 6.5, 7.0
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
