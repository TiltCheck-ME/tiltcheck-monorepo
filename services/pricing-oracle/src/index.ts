import { eventRouter } from '@tiltcheck/event-router';
import type { PriceUpdateEvent } from '@tiltcheck/types';

export interface PriceOracle {
  getUsdPrice(token: string): number;
  setUsdPrice(token: string, price: number, publishEvent?: boolean): void;
  bulkSet(prices: Record<string, number>, publishEvents?: boolean): void;
  isStale(token: string): boolean;
  setTTL(ms: number): void;
  refreshPrice(token: string, fetcher: () => Promise<number>): Promise<number>;
}

class InMemoryPriceOracle implements PriceOracle {
  private prices: Map<string, { price: number; updatedAt: number }> = new Map([
    ['SOL', { price: 200, updatedAt: Date.now() }],
    ['USDC', { price: 1, updatedAt: Date.now() }],
    ['BONK', { price: 0.000002, updatedAt: Date.now() }],
    ['WBTC', { price: 65000, updatedAt: Date.now() }]
  ]);
  private ttlMs = 5 * 60 * 1000; // 5 minutes default

  getUsdPrice(token: string): number {
    const entry = this.prices.get(token.toUpperCase());
    if (!entry) {
      throw new Error(`Price not available for token: ${token}`);
    }
    return entry.price;
  }

  setUsdPrice(token: string, price: number, publishEvent: boolean = true): void {
    const key = token.toUpperCase();
    const old = this.prices.get(key)?.price;
    this.prices.set(key, { price, updatedAt: Date.now() });
    if (publishEvent) {
      const evt: PriceUpdateEvent = {
        token: key,
        oldPrice: old,
        newPrice: price,
        updatedAt: Date.now(),
        stale: false
      };
      void eventRouter.publish('price.updated', 'pricing-oracle', evt);
    }
  }

  bulkSet(prices: Record<string, number>, publishEvents: boolean = true): void {
    for (const [k,v] of Object.entries(prices)) {
      this.setUsdPrice(k, v, publishEvents);
    }
  }

  isStale(token: string): boolean {
    const entry = this.prices.get(token.toUpperCase());
    if (!entry) return true;
    return Date.now() - entry.updatedAt > this.ttlMs;
  }

  setTTL(ms: number): void {
    this.ttlMs = ms;
  }

  async refreshPrice(token: string, fetcher: () => Promise<number>): Promise<number> {
    const newPrice = await fetcher();
    this.setUsdPrice(token, newPrice, true);
    return newPrice;
  }
}

export const pricingOracle: PriceOracle = new InMemoryPriceOracle();
