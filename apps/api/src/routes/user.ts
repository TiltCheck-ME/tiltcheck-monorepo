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
    findUserByWallet,
    getAggregatedTrustByDiscordId,
    getUserBuddies,
    getPendingBuddyRequests,
    sendBuddyRequest,
    acceptBuddyRequest,
    removeBuddy
} from '@tiltcheck/db';
import { ValidationError, InternalServerError } from '@tiltcheck/error-factory';

const router: Router = Router();

/**
 * Resolve Discord ID from Solana wallet address.
 */
async function handleLookupByWallet(wallet: string, res: any): Promise<boolean> {
    const user = await findUserByWallet(wallet);
    if (!user) {
        res.status(404).json({ error: 'User wallet not linked' });
        return false;
    }
    res.json({ discordId: user.discord_id });
    return true;
}

function buildUserProfileResponse(user: any, onboarding: any, trustSummary: any) {
    const analytics = {
        totalJuice: user.total_redeemed ?? onboarding?.total_redeemed ?? 0,
        totalTipsCaught: 0,
        eventCount: trustSummary?.signals_count || 0,
        redeemWins: user.redeem_wins ?? onboarding?.redeem_wins ?? 0,
        totalRedeemed: user.total_redeemed ?? onboarding?.total_redeemed ?? 0,
        trustScore: trustSummary?.total_score || 0,
    };

    return {
        success: true,
        id: user.id,
        discordId: user.discord_id,
        username: user.discord_username,
        avatar: user.discord_avatar,
        trustScore: trustSummary?.total_score || 0,
        analytics,
        redeemThreshold: user.redeem_threshold || onboarding?.daily_limit || 500,
        degenIdentity: {
            primary_external_address: user.wallet_address || 'Not linked',
        },
        user: {
            id: user.id,
            discordId: user.discord_id,
            walletAddress: user.wallet_address,
            total_redeemed: onboarding?.total_redeemed || user.total_redeemed || 0,
            redeem_threshold: onboarding?.redeem_threshold || user.redeem_threshold || 250,
            risk_level: onboarding?.risk_level || 'moderate',
        },
    };
}

router.get('/lookup/:wallet', async (req, res, next) => {
    try {
        const wallet = req.params.wallet as string;
        await handleLookupByWallet(wallet, res);
    } catch (err) {
        next(err);
    }
});

/**
 * Backward compatible alias for older clients.
 */
router.get('/lookup/:address', async (req, res, next) => {
    try {
        const address = req.params.address as string;
        await handleLookupByWallet(address, res);
    } catch (err) {
        next(err);
    }
});

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
                },
                complianceBypass: onboarding.compliance_bypass
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
            compliance_bypass: preferences?.complianceBypass
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
 * GET /user/:discordId/buddies
 * Get all accepted buddies and pending requests
 */
router.get('/:discordId/buddies', authMiddleware, async (req, res, next) => {
    try {
        const { discordId } = req.params;
        
        const [buddies, pending] = await Promise.all([
            getUserBuddies(discordId as string),
            getPendingBuddyRequests(discordId as string)
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

        const request = await sendBuddyRequest(discordId as string, buddyId, thresholds);

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

        await removeBuddy(discordId as string, buddyId as string);

        res.json({
            success: true
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /user/:discordId/activities
 * Get recent audit logs for a user (Activity Feed)
 */
router.get('/:discordId/activities', async (req, res, next) => {
    try {
        const discordId = req.params.discordId as string;
        const user = await findUserByDiscordId(discordId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { getAuditLogsByUser } = await import('@tiltcheck/db');
        const logs = await getAuditLogsByUser(user.id, { limit: 10 });

        res.json({
            success: true,
            activities: logs.rows.map((log: any) => ({
                id: log.id,
                type: log.action === 'VERIFY_SPIN' ? 'audit' : 'win',
                message: log.action === 'VERIFY_SPIN' ? 'Audit: Spin Verified' : 'System Event',
                meta: `${(log.metadata as any)?.casino || 'Casino'} // RTP: ${(((log.metadata as any)?.rtp || 0) * 100).toFixed(1)}%`,
                timestamp: log.created_at
            }))
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /user/:discordId
 * Get user profile and analytics by Discord ID (used by Dashboard)
 */
router.get('/:discordId', async (req, res, next) => {
    try {
        const { discordId } = req.params;
        // NOTE: Auth temporarily disabled for dogfooding ease (will re-enable once identity works)
        const user = await findUserByDiscordId(discordId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [onboarding, trustSummary] = await Promise.all([
            findOnboardingByDiscordId(discordId),
            getAggregatedTrustByDiscordId(discordId)
        ]);

        res.json(buildUserProfileResponse(user, onboarding, trustSummary));
    } catch (error) {
        next(error);
    }
});

export { router as userRouter };
