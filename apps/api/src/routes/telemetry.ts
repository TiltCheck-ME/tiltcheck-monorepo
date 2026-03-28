/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Telemetry Routes - /telemetry/*
 * Handles behavioral telemetry, win securing, and nudge efficacy tracking.
 */

import { Router } from 'express';
import { findUserByDiscordId, updateUser } from '@tiltcheck/db';
import { InternalServerError } from '@tiltcheck/error-factory';

const router: Router = Router();

/**
 * POST /telemetry/win-secure
 * Log a successful profit-securing event (user followed a redeem nudge).
 */
router.post('/win-secure', async (req, res, next) => {
    try {
        const { amount, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Find user by Discord ID (extension sends discordId as userId usually, or we can check both)
        let user = await findUserByDiscordId(userId);
        
        if (!user) {
            // Try by ID if not found by Discord ID
            const { findUserById } = await import('@tiltcheck/db');
            user = await findUserById(userId);
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Increment redeem wins and total redeemed
        const newWins = (user.redeem_wins || 0) + 1;
        const newTotal = (user.total_redeemed || 0) + (Number(amount) || 0);

        await updateUser(user.id, {
            redeem_wins: newWins,
            total_redeemed: newTotal,
            updated_at: new Date()
        });

        console.log(`[Telemetry] User ${user.discord_username || user.id} secured a bag: $${amount}`);

        res.json({
            success: true,
            stats: {
                wins: newWins,
                total: newTotal
            }
        });
    } catch (error) {
        console.error('[Telemetry API] Win secure error:', error);
        return next(new InternalServerError('Failed to log win secure event'));
    }
});

export { router as telemetryRouter };
