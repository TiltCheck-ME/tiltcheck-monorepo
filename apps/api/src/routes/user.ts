/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * User Routes - /user/*
 * Handles user profile, onboarding status, and preferences
 */

import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { 
    findOnboardingByDiscordId, 
    upsertOnboarding,
    findUserByDiscordId,
    getUserBuddies,
    getPendingBuddyRequests,
    sendBuddyRequest,
    acceptBuddyRequest,
    removeBuddy,
    updateBuddyThresholds
} from '@tiltcheck/db';
import { ValidationError, InternalServerError } from '@tiltcheck/error-factory';

const router: Router = Router();

/**
 * GET /user/onboarding
 * Get onboarding status for the current user
 */
router.get('/onboarding', authMiddleware, async (req, res, next) => {
    try {
        const userPayload = (req as AuthRequest).user;

        if (!userPayload?.discordId) {
            return next(new ValidationError('User must be linked to Discord to check onboarding'));
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
        return next(new InternalServerError('Failed to get onboarding status'));
    }
});

/**
 * POST /user/onboarding
 * Update onboarding status and preferences
 */
router.post('/onboarding', authMiddleware, async (req, res, next) => {
    try {
        const userPayload = (req as AuthRequest).user;
        const {
            isOnboarded,
            riskLevel,
            hasAcceptedTerms,
            preferences
        } = req.body;

        if (!userPayload?.discordId) {
            return next(new ValidationError('User must be linked to Discord to update onboarding'));
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
        return next(new InternalServerError('Failed to update onboarding status'));
    }
});

/**
 * GET /user/:discordId
 * Get user profile and analytics by Discord ID (used by Dashboard)
 */
router.get('/:discordId', authMiddleware, async (req, res, next) => {
    try {
        const { discordId } = req.params;
        const authUser = (req as AuthRequest).user;

        // Security check: Only allow users to see their own profile or admin
        if (authUser?.discordId !== discordId && !authUser?.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden: Access denied to this profile' });
        }

        const user = await findUserByDiscordId(discordId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const onboarding = await findOnboardingByDiscordId(discordId);

        res.json({
            id: user.id,
            discordId: user.discord_id,
            username: user.discord_username,
            avatar: user.discord_avatar,
            trustScore: 78, // TODO: Pull from trust engine
            analytics: {
                totalJuice: 14.5, // TODO: Pull from real telemetry
                totalTipsCaught: 2.1,
                eventCount: 42,
                redeemWins: user.redeem_wins || 0,
                totalRedeemed: user.total_redeemed || 0
            },
            redeemThreshold: user.redeem_threshold || onboarding?.daily_limit || 500,
            degenIdentity: {
                primary_external_address: user.wallet_address || 'Not linked'
            }
        });
    } catch (error) {
        console.error('[User API] Get profile error:', error);
        return next(new InternalServerError('Failed to get user profile'));
    }
});

/**
 * GET /user/:discordId/buddies
 * Get all accepted buddies and pending requests
 */
router.get('/:discordId/buddies', authMiddleware, async (req, res, next) => {
    try {
        const { discordId } = req.params;
        
        const [buddies, pending] = await Promise.all([
            getUserBuddies(discordId),
            getPendingBuddyRequests(discordId)
        ]);

        res.json({
            success: true,
            buddies,
            pending
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /user/:discordId/buddies
 * Send a buddy request to another user
 */
router.post('/:discordId/buddies', authMiddleware, async (req, res, next) => {
    try {
        const { discordId } = req.params;
        const { buddyId, thresholds } = req.body;

        if (!buddyId) {
            return next(new ValidationError('buddyId is required'));
        }

        const request = await sendBuddyRequest(discordId, buddyId, thresholds);

        res.json({
            success: true,
            request
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /user/:discordId/buddies/accept
 * Accept a pending buddy request
 */
router.post('/:discordId/buddies/accept', authMiddleware, async (req, res, next) => {
    try {
        const { requestId } = req.body;

        if (!requestId) {
            return next(new ValidationError('requestId is required'));
        }

        const buddy = await acceptBuddyRequest(requestId);

        res.json({
            success: true,
            buddy
        });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /user/:discordId/buddies/:buddyId
 * Remove a buddy relationship
 */
router.delete('/:discordId/buddies/:buddyId', authMiddleware, async (req, res, next) => {
    try {
        const { discordId, buddyId } = req.params;

        await removeBuddy(discordId, buddyId);

        res.json({
            success: true
        });
    } catch (err) {
        next(err);
    }
});

export { router as userRouter };
