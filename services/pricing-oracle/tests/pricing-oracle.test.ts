import { describe, it, expect } from 'vitest';
import { pricingOracle } from '../src';
import { eventRouter } from '@tiltcheck/event-router';

describe('PricingOracle', () => {
  it('returns default SOL price', () => {
    expect(pricingOracle.getUsdPrice('SOL')).toBeGreaterThan(0);
  });

  it('sets and retrieves a custom price', () => {
    pricingOracle.setUsdPrice('SOL', 205);
    expect(pricingOracle.getUsdPrice('SOL')).toBe(205);
  });

  it('bulk sets multiple prices', () => {
    pricingOracle.bulkSet({ SOL: 210, USDC: 1, BONK: 0.000001 });
    expect(pricingOracle.getUsdPrice('SOL')).toBe(210);
    expect(pricingOracle.getUsdPrice('USDC')).toBe(1);
  });

  it('emits price.updated event with old and new price', () => {
    eventRouter.clearHistory();
    const old = pricingOracle.getUsdPrice('SOL');
    pricingOracle.setUsdPrice('SOL', old + 5);
    const events = eventRouter.getHistory({ eventType: 'price.updated' });
    expect(events.length).toBeGreaterThan(0);
    const evt = events[0].data;
    expect(evt.token).toBe('SOL');
    expect(evt.oldPrice).toBe(old);
    expect(evt.newPrice).toBe(old + 5);
    expect(evt.stale).toBe(false);
  });

  it('marks price as stale after TTL expiry', async () => {
    // Set very short TTL
    // Cast to access setTTL on underlying implementation (interface includes it)
    (pricingOracle as any).setTTL(10); // 10ms
    pricingOracle.setUsdPrice('USDC', 1.01, false); // disable event to reduce noise
    expect(pricingOracle.isStale('USDC')).toBe(false);
    await new Promise(r => setTimeout(r, 25));
    expect(pricingOracle.isStale('USDC')).toBe(true);
  });

  it('refreshPrice fetcher updates and emits event', async () => {
    eventRouter.clearHistory();
    const prev = pricingOracle.getUsdPrice('SOL');
    const fetched = await (pricingOracle as any).refreshPrice('SOL', async () => prev + 3);
    expect(fetched).toBe(prev + 3);
    expect(pricingOracle.getUsdPrice('SOL')).toBe(prev + 3);
    const events = eventRouter.getHistory({ eventType: 'price.updated' });
    expect(events.length).toBeGreaterThan(0);
    const last = events[events.length - 1].data;
    expect(last.newPrice).toBe(prev + 3);
  });

  it('throws on unknown token', () => {
    expect(() => pricingOracle.getUsdPrice('UNKNOWN')).toThrow('Price not available');
  });
});
