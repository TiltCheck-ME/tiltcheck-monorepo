/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { Router } from 'express';
import { pricingOracle } from '@tiltcheck/pricing-oracle';

const router = Router();

// Get USD price for a token
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const price = pricingOracle.getUsdPrice(token);
        res.json({ token: token.toUpperCase(), price, updatedAt: Date.now() });
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
});

// Bulk price check
router.post('/bulk', async (req, res) => {
    const { tokens } = req.body;
    if (!Array.isArray(tokens)) return res.status(400).json({ error: 'Tokens must be an array' });

    const results: Record<string, number> = {};
    for (const token of tokens) {
        try { results[token.toUpperCase()] = pricingOracle.getUsdPrice(token); } catch { /* ignore */ }
    }
    res.json({ prices: results, updatedAt: Date.now() });
});

export { router as pricingRouter };
