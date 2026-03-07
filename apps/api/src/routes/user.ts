/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
/**
 * User Routes - /user/*
 * Handles user profile, onboarding status, and preferences
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { findOnboardingByDiscordId, upsertOnboarding, findUserById } from '@tiltcheck/db';

const router = Router();

/**
 * GET /user/onboarding
 * Get onboarding status for the current user
 */
router.get('/onboarding', authMiddleware, async (req, res) => {
    try {
        const userPayload = (req as any).user;

        if (!userPayload?.discordId) {
            res.status(400).json({ error: 'User must be linked to Discord to check onboarding' });
            return;
        }

        const onboarding = await findOnboardingByDiscordId(userPayload.discordId);

        if (!onboarding) {
            res.json({
                isOnboarded: false,
                message: 'Onboarding data not found'
            });
            return;
        }

        res.json({
            isOnboarded: onboarding.is_onboarded,
            riskLevel: onboarding.risk_level,
            hasAcceptedTerms: onboarding.has_accepted_terms,
            preferences: {
                cooldownEnabled: onboarding.cooldown_enabled,
                dailyLimit: onboarding.daily_limit,
                notifications: {
                    tips: onboarding.notifications_tips,
                    trivia: onboarding.notifications_trivia,
                    promos: onboarding.notifications_promos
                }
            }
        });
    } catch (error) {
        console.error('[User API] Get onboarding error:', error);
        res.status(500).json({ error: 'Failed to get onboarding status' });
    }
});

/**
 * POST /user/onboarding
 * Update onboarding status and preferences
 */
router.post('/onboarding', authMiddleware, async (req, res) => {
    try {
        const userPayload = (req as any).user;
        const {
            isOnboarded,
            riskLevel,
            hasAcceptedTerms,
            preferences
        } = req.body;

        if (!userPayload?.discordId) {
            res.status(400).json({ error: 'User must be linked to Discord to update onboarding' });
            return;
        }

        const result = await upsertOnboarding({
            discord_id: userPayload.discordId,
            is_onboarded: isOnboarded,
            risk_level: riskLevel,
            has_accepted_terms: hasAcceptedTerms,
            cooldown_enabled: preferences?.cooldownEnabled,
            daily_limit: preferences?.dailyLimit,
            notifications_tips: preferences?.notifications?.tips,
            notifications_trivia: preferences?.notifications?.trivia,
            notifications_promos: preferences?.notifications?.promos,
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[User API] Update onboarding error:', error);
        res.status(500).json({ error: 'Failed to update onboarding status' });
    }
});

export { router as userRouter };
