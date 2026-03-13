/* Copyright (c) 2026 TiltCheck. All rights reserved. */

const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';
const CACHE_TTL_MS = 30_000; // 30 seconds

// Configurable fallback for SOL price on cold-start (before first fetch)
const DEFAULT_SOL_FALLBACK_USD = parseFloat(process.env.SOLANA_FALLBACK_PRICE_USD || '80');

interface PriceCacheEntry {
  price: number;
  cachedAt: number;
}

const priceCache = new Map<string, PriceCacheEntry>();

/**
 * Fetch USD price for a token from Jupiter Price API (keyless, Solana tokens only)
 */
export async function getPriceUsd(token: string): Promise<number> {
  const symbol = token.toUpperCase();
  const cached = priceCache.get(symbol);
  
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Jupiter API error: ${res.status}`);
    
    const data = await res.json() as any;
    const tokenData = data?.data?.[symbol];
    
    if (!tokenData) {
      if (cached) {
        const ageSeconds = Math.round((Date.now() - cached.cachedAt) / 1000);
        console.warn(`[Pricing] Price not found for ${symbol} in API response. Serving stale data (${ageSeconds}s old).`);
        return cached.price;
      }
      throw new Error(`Price not found for: ${symbol}`);
    }

    const price = parseFloat(tokenData.price);
    priceCache.set(symbol, { price, cachedAt: Date.now() });
    return price;
  } catch (error) {
    console.error(`[Pricing] Failed to fetch price for ${symbol}:`, error);
    if (cached) {
      const ageSeconds = Math.round((Date.now() - cached.cachedAt) / 1000);
      console.warn(`[Pricing] Serving stale ${symbol} price $${cached.price} (${ageSeconds}s old) due to fetch failure.`);
      return cached.price;
    }
    throw error;
  }
}

/**
 * Synchronous price getter (stale-while-revalidate or cold-start fallback).
 * Prefer getPriceUsd() for accuracy. This is used for in-path calculations where async isn't possible.
 * Always call getPriceUsd() during server startup to warm the cache.
 */
export function getUsdPriceSync(token: string): number {
  const symbol = token.toUpperCase();
  const cached = priceCache.get(symbol);

  if (!cached) {
    // Trigger background fetch to warm cache
    void getPriceUsd(symbol).catch(() => {});
    
    if (symbol === 'SOL') {
      console.warn(`[Pricing] SOL price not yet cached. Using fallback $${DEFAULT_SOL_FALLBACK_USD}. Call getPriceUsd('SOL') at startup to avoid this.`);
      return DEFAULT_SOL_FALLBACK_USD;
    }
    throw new Error(`Price for ${symbol} not yet cached. Call getPriceUsd('${symbol}') first.`);
  }
  
  // Background refresh if expired
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    const ageSeconds = Math.round((Date.now() - cached.cachedAt) / 1000);
    console.warn(`[Pricing] Serving stale ${symbol} price $${cached.price} (${ageSeconds}s old). Refreshing in background.`);
    void getPriceUsd(symbol).catch(() => {});
  }
  
  return cached.price;
}

/**
 * Manually set price in cache (primarily for testing)
 */
export function setUsdPrice(token: string, price: number): void {
  priceCache.set(token.toUpperCase(), { price, cachedAt: Date.now() });
}
