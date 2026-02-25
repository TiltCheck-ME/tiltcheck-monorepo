/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { eventRouter } from '@tiltcheck/event-router';
import type { PriceUpdateEvent } from '@tiltcheck/types';

const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';

export interface JupiterPriceResponse {
  data: {
    [key: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: number;
    };
  };
  timeTaken: number;
}

/**
 * Fetch the current USD price for a token from Jupiter Price API
 * @param tokenSymbol - Token symbol (e.g., 'SOL', 'BONK')
 * @returns The current USD price
 */
export async function fetchJupiterPrice(tokenSymbol: string): Promise<number> {
  const url = `${JUPITER_PRICE_API}?ids=${encodeURIComponent(tokenSymbol)}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Jupiter API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = (await response.json()) as JupiterPriceResponse;
  const tokenData = data.data[tokenSymbol];
  
  if (!tokenData) {
    throw new Error(`Price not found for token: ${tokenSymbol}`);
  }
  
  return tokenData.price;
}

/**
 * Fetch multiple token prices from Jupiter Price API
 * @param tokenSymbols - Array of token symbols
 * @returns Map of token symbol to USD price. Tokens not found on Jupiter are excluded from the result.
 *          Check result keys to determine which tokens were successfully fetched.
 */
export async function fetchJupiterPrices(tokenSymbols: string[]): Promise<Record<string, number>> {
  const ids = tokenSymbols.map(s => encodeURIComponent(s)).join(',');
  const url = `${JUPITER_PRICE_API}?ids=${ids}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Jupiter API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = (await response.json()) as JupiterPriceResponse;
  const prices: Record<string, number> = {};
  
  for (const symbol of tokenSymbols) {
    const tokenData = data.data[symbol];
    if (tokenData) {
      prices[symbol] = tokenData.price;
    }
  }
  
  return prices;
}

export interface PriceOracle {
  getUsdPrice(token: string): number;
  setUsdPrice(token: string, price: number, publishEvent?: boolean): void;
  bulkSet(prices: Record<string, number>, publishEvents?: boolean): void;
  isStale(token: string): boolean;
  setTTL(ms: number): void;
  refreshPrice(token: string, fetcher: () => Promise<number>): Promise<number>;
  refreshFromJupiter(token: string): Promise<number>;
  refreshAllFromJupiter(tokens?: string[]): Promise<Record<string, number>>;
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

  async refreshFromJupiter(token: string): Promise<number> {
    const price = await fetchJupiterPrice(token.toUpperCase());
    this.setUsdPrice(token, price, true);
    return price;
  }

  async refreshAllFromJupiter(tokens?: string[]): Promise<Record<string, number>> {
    const tokenList = tokens ?? Array.from(this.prices.keys());
    const prices = await fetchJupiterPrices(tokenList);
    this.bulkSet(prices, true);
    return prices;
  }
}

export const pricingOracle: PriceOracle = new InMemoryPriceOracle();
