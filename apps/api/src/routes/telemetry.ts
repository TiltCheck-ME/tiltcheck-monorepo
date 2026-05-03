/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * Telemetry Routes - /telemetry/*
 * Handles behavioral telemetry, win securing, and nudge efficacy tracking.
 */

import { Router } from 'express';
import { z } from 'zod';
import { findUserByDiscordId, findUserById, updateUser } from '@tiltcheck/db';
import { InternalServerError, ValidationError } from '@tiltcheck/error-factory';
import { getUserDataConsentState } from '../lib/data-consent.js';

const router: Router = Router();

const roundTelemetrySchema = z.object({
    userId: z.string().trim().min(1, 'userId is required'),
    bet: z.number().finite().min(0, 'bet must be a non-negative number'),
    win: z.number().finite().min(0, 'win must be a non-negative number'),
});

const winSecureSchema = z.object({
    userId: z.string().trim().min(1, 'userId is required'),
    amount: z.number().finite(),
});

interface ResolvedUser {
    id: string;
    discord_id?: string | null;
    discord_username?: string | null;
    redeem_wins?: number | null;
    total_redeemed?: number | null;
}

async function resolveUser(userId: string): Promise<ResolvedUser | null> {
    const byDiscordId = await findUserByDiscordId(userId);
    if (byDiscordId) {
        return byDiscordId;
    }

    const byUserId = await findUserById(userId);
    return byUserId || null;
}

/**
 * POST /telemetry/round
 * Accept extension round telemetry on the canonical API host.
 */
router.post('/round', async (req, res, next) => {
    try {
        const parsed = roundTelemetrySchema.safeParse(req.body);
        if (!parsed.success) {
            return next(new ValidationError(parsed.error.issues[0]?.message || 'Invalid round telemetry payload'));
        }

        const { userId, bet, win } = parsed.data;
        const user = await resolveUser(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const consentState = await getUserDataConsentState(user.discord_id || userId);
        if (!consentState.sessionTelemetry || !consentState.financialData) {
            return res.json({
                success: true,
                accepted: false,
                skipped: true,
                reason: 'telemetry_consent_required',
            });
        }

        res.status(202).json({
            success: true,
            accepted: true,
            telemetry: {
                userId: user.discord_id || user.id,
                bet,
                win,
            },
        });
    } catch (error) {
        console.error('[Telemetry API] Round ingest error:', error);
        return next(new InternalServerError('Failed to accept round telemetry'));
    }
});

/**
 * POST /telemetry/win-secure
 * Log a successful profit-securing event (user followed a redeem nudge).
 */
router.post('/win-secure', async (req, res, next) => {
    try {
        const parsed = winSecureSchema.safeParse(req.body);
        if (!parsed.success) {
            return next(new ValidationError(parsed.error.issues[0]?.message || 'Invalid win secure payload'));
        }

        const { amount, userId } = parsed.data;
        const user = await resolveUser(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const consentState = await getUserDataConsentState(user.discord_id || userId);
        if (!consentState.financialData) {
            return res.json({
                success: true,
                skipped: true,
                reason: 'financial_data_consent_required',
            });
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
