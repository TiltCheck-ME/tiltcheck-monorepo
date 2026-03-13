/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { Router } from 'express';
import { getPriceUsd } from '@tiltcheck/utils';

const router = Router();

// Get USD price for a single token
router.get('/:token', async (req, res) => {
    try {
        const token = req.params.token.toUpperCase();
        const price = await getPriceUsd(token);
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
        const results: Record<string, number> = {};
        // Use Promise.all for parallel fetching
        await Promise.all(tokens.map(async (t: string) => {
            try {
                const key = t.toUpperCase();
                results[key] = await getPriceUsd(key);
            } catch (err) {
                console.warn(`[API] Failed to fetch bulk price for ${t}:`, err);
            }
        }));

        res.json({ prices: results, updatedAt: Date.now() });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { router as pricingRouter };
