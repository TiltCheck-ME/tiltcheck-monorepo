import { describe, it, expect, vi } from 'vitest';
import { pricingOracle, fetchJupiterPrice, fetchJupiterPrices } from '../src/index.js';
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

describe('Jupiter Price API', () => {
  it('fetchJupiterPrice returns a number for valid token', async () => {
    const mockResponse = {
      data: {
        SOL: {
          id: 'So11111111111111111111111111111111111111112',
          mintSymbol: 'SOL',
          vsToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          vsTokenSymbol: 'USDC',
          price: 150.25
        }
      },
      timeTaken: 0.5
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    }));

    const price = await fetchJupiterPrice('SOL');
    expect(price).toBe(150.25);
    expect(fetch).toHaveBeenCalledWith('https://price.jup.ag/v4/price?ids=SOL');

    vi.unstubAllGlobals();
  });

  it('fetchJupiterPrice throws on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    }));

    await expect(fetchJupiterPrice('SOL')).rejects.toThrow('Jupiter API request failed');

    vi.unstubAllGlobals();
  });

  it('fetchJupiterPrice throws when token not found', async () => {
    const mockResponse = {
      data: {},
      timeTaken: 0.5
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    }));

    await expect(fetchJupiterPrice('UNKNOWN')).rejects.toThrow('Price not found for token');

    vi.unstubAllGlobals();
  });

  it('fetchJupiterPrices returns prices for multiple tokens', async () => {
    const mockResponse = {
      data: {
        SOL: {
          id: 'So11111111111111111111111111111111111111112',
          mintSymbol: 'SOL',
          vsToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          vsTokenSymbol: 'USDC',
          price: 150.25
        },
        BONK: {
          id: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          mintSymbol: 'BONK',
          vsToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          vsTokenSymbol: 'USDC',
          price: 0.00002
        }
      },
      timeTaken: 0.5
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    }));

    const prices = await fetchJupiterPrices(['SOL', 'BONK']);
    expect(prices.SOL).toBe(150.25);
    expect(prices.BONK).toBe(0.00002);
    expect(fetch).toHaveBeenCalledWith('https://price.jup.ag/v4/price?ids=SOL,BONK');

    vi.unstubAllGlobals();
  });

  it('fetchJupiterPrices excludes tokens not found in API response', async () => {
    const mockResponse = {
      data: {
        SOL: {
          id: 'So11111111111111111111111111111111111111112',
          mintSymbol: 'SOL',
          vsToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          vsTokenSymbol: 'USDC',
          price: 150.25
        }
        // UNKNOWN token is not in response
      },
      timeTaken: 0.5
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    }));

    const prices = await fetchJupiterPrices(['SOL', 'UNKNOWN']);
    expect(prices.SOL).toBe(150.25);
    expect(prices.UNKNOWN).toBeUndefined();
    expect(Object.keys(prices)).toHaveLength(1);

    vi.unstubAllGlobals();
  });

  it('refreshFromJupiter updates oracle and emits event', async () => {
    const mockResponse = {
      data: {
        SOL: {
          id: 'So11111111111111111111111111111111111111112',
          mintSymbol: 'SOL',
          vsToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          vsTokenSymbol: 'USDC',
          price: 175.50
        }
      },
      timeTaken: 0.5
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    }));

    eventRouter.clearHistory();
    const price = await pricingOracle.refreshFromJupiter('SOL');
    expect(price).toBe(175.50);
    expect(pricingOracle.getUsdPrice('SOL')).toBe(175.50);
    
    const events = eventRouter.getHistory({ eventType: 'price.updated' });
    expect(events.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
