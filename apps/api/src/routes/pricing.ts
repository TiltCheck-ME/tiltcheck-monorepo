/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Pricing routes — Jupiter Price API inline (pricing-oracle merged into api).
 */
import { Router } from 'express';

const router = Router();

const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';
const CACHE_TTL_MS = 30_000; // 30 seconds

// Simple in-memory price cache
const priceCache = new Map<string, { price: number; cachedAt: number }>();

async function getJupiterPrice(token: string): Promise<number> {
    const key = token.toUpperCase();
    const cached = priceCache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached.price;
    }

    const res = await fetch(`${JUPITER_PRICE_API}?ids=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(`Jupiter API error: ${res.status}`);
    const data = await res.json() as any;
    const tokenData = data?.data?.[key];
    if (!tokenData) throw new Error(`Price not found for: ${token}`);

    priceCache.set(key, { price: tokenData.price, cachedAt: Date.now() });
    return tokenData.price;
}

async function getJupiterPrices(tokens: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const uncached: string[] = [];

    for (const t of tokens) {
        const key = t.toUpperCase();
        const cached = priceCache.get(key);
        if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
            result[key] = cached.price;
        } else {
            uncached.push(key);
        }
    }

    if (uncached.length > 0) {
        const ids = uncached.map(s => encodeURIComponent(s)).join(',');
        const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`);
        if (!res.ok) throw new Error(`Jupiter API error: ${res.status}`);
        const data = await res.json() as any;
        for (const k of uncached) {
            const td = data?.data?.[k];
            if (td) {
                result[k] = td.price;
                priceCache.set(k, { price: td.price, cachedAt: Date.now() });
            }
        }
    }

    return result;
}

// Get USD price for a token via Jupiter
router.get('/:token', async (req, res) => {
    try {
        const token = req.params.token.toUpperCase();
        const price = await getJupiterPrice(token);
        res.json({ token, price, updatedAt: Date.now() });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

// Bulk price check
router.post('/bulk', async (req, res) => {
    const { tokens } = req.body;
    if (!Array.isArray(tokens)) return res.status(400).json({ error: 'tokens must be an array' });
    try {
        const prices = await getJupiterPrices(tokens);
        res.json({ prices, updatedAt: Date.now() });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { router as pricingRouter };
