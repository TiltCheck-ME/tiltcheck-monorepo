/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * User Routes - /user/*
 * Handles user profile, onboarding status, and preferences
 */

import { Router, Response, Request, NextFunction } from 'express';
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
    removeBuddy,
    updateUser,
    getUserExclusions,
    addExclusion,
    removeExclusion,
} from '@tiltcheck/db';
import { ValidationError, InternalServerError } from '@tiltcheck/error-factory';
import { verifySolanaSignature } from '@tiltcheck/auth/solana';
import { invalidateExclusionCache, getForbiddenGamesProfile } from '../services/exclusion-cache.js';
import type { GameCategory } from '@tiltcheck/types';

const router: Router = Router();

/**
 * Resolve Discord ID from Solana wallet address.
 */
async function handleLookupByWallet(wallet: string, res: Response): Promise<boolean> {
    const user = await findUserByWallet(wallet);
    if (!user) {
        res.status(404).json({ error: 'User wallet not linked' });
        return false;
    }
    res.json({ discordId: user.discord_id });
    return true;
}

interface UserProfileData {
    id: string;
    discord_id?: string | null;
    discord_username?: string | null;
    discord_avatar?: string | null;
    wallet_address?: string | null;
    total_redeemed?: number | null;
    redeem_wins?: number | null;
    redeem_threshold?: number | null;
}

interface OnboardingData {
    total_redeemed?: number | null;
    redeem_wins?: number | null;
    daily_limit?: number | null;
    risk_level?: string | null;
    redeem_threshold?: number | null;
}

interface TrustSummaryData {
    signals_count?: number;
    total_score?: number;
}

function buildUserProfileResponse(user: UserProfileData, onboarding: OnboardingData | null, trustSummary: TrustSummaryData | null) {
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

router.get('/lookup/:wallet', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const wallet = req.params.wallet as string;
        await handleLookupByWallet(wallet, res);
    } catch (err) {
        next(err);
    }
});

/**
 * Upgrade user to Elite Tier.
 * Validates transaction signature on-chain (placeholder for full validation).
 */

router.post('/upgrade', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userPayload = (req as AuthRequest).user;
        const { signature, tier } = req.body;

        if (!userPayload?.id || !userPayload.walletAddress) {
            return next(new ValidationError('User session not found or wallet not linked'));
        }

        if (!signature || !tier) {
            return next(new ValidationError('Upgrade signature and target tier are required'));
        }

        const message = `Upgrade to ${tier} tier for user ${userPayload.id}`;
        const verification = await verifySolanaSignature({
            message,
            signature,
            publicKey: userPayload.walletAddress,
        });

        if (!verification.valid) {
            return next(new ValidationError('Invalid signature'));
        }
        
        const updated = await updateUser(userPayload.id, { tier });

        res.json({
            success: true,
            message: `User upgraded to ${tier} tier`,
            user: updated
        });
    } catch (err) {
        console.error('[User API] Upgrade error:', err);
        next(new InternalServerError('Failed to process upgrade'));
    }
});

/**
 * Resolve a wallet address from a Discord ID or generic identity string.
 * Used by the JustTheTip protocol.
 */
router.get('/resolve', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const identity = req.query.identity as string;
        if (!identity) {
            return next(new ValidationError('Identity query is required'));
        }

        // Try Discord ID first
        const user = await findUserByDiscordId(identity);
        
        // If not found, try searching by username (case-insensitive handle)
        if (!user) {
            // Placeholder: currently the @tiltcheck/db doesn't have findUserByUsername
            // But we can assume the user might pass the wallet directly.
            if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(identity)) {
                return res.json({ success: true, wallet: identity });
            }
            return res.status(404).json({ success: false, error: 'Recipient not found or not linked' });
        }

        if (!user.wallet_address) {
            return res.status(400).json({ success: false, error: 'Recipient has no wallet linked' });
        }

        res.json({
            success: true,
            wallet: user.wallet_address,
            username: user.discord_username
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Backward compatible alias for older clients.
 */
router.get('/lookup/:address', async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/onboarding', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/onboarding', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/:discordId/buddies', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/:discordId/buddies', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/:discordId/buddies/accept', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
router.delete('/:discordId/buddies/:buddyId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/:discordId/activities', async (req: Request, res: Response, next: NextFunction) => {
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
            activities: logs.rows.map((log) => ({
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
router.get('/:discordId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const discordId = Array.isArray(req.params.discordId) ? req.params.discordId[0] : req.params.discordId;
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

/**
 * GET /user/:id/elite
 * Returns Elite tier status and fees saved for a user.
 * Used by the Activity Tip tab to show 0% fee badge.
 */
router.get('/:id/elite', async (req: Request, res, next: NextFunction) => {
    try {
        const id = req.params['id'] as string;
        if (!id) {
            res.status(400).json({ error: 'Missing user id' });
            return;
        }

        const { justthetip } = await import('@tiltcheck/justthetip');
        const balance = await justthetip.credits.getBalance(id).catch(() => null);

        const totalFees = balance?.total_fees_lamports ?? 0;
        const feeSavedSol = 0; // populated once Elite tier is tracked in DB

        // Elite = subscribed user with 0% fee. Stub: treat as non-elite until
        // subscriptions table is wired. Update when Stripe Elite tier lands.
        res.json({
            isElite: false,
            feeSavedSol,
            totalFeesPaidSol: totalFees * 1e-9,
        });
    } catch (error) {
        next(error);
    }
});

// ─── Surgical Self-Exclusion Routes ──────────────────────────────────────────

/**
 * GET /user/:discordId/exclusions
 * Return the full ForbiddenGamesProfile (exclusion list + quick-lookup arrays).
 */
router.get('/:discordId/exclusions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { discordId } = req.params;
        const user = await findUserByDiscordId(discordId as string);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const profile = await getForbiddenGamesProfile(user.id);
        res.json({ success: true, data: profile });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /user/:discordId/exclusions
 * Add a surgical exclusion (game_id, category, or both).
 */
router.post('/:discordId/exclusions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { discordId } = req.params;
        const { gameId, category, reason } = req.body as {
            gameId?: string;
            category?: GameCategory;
            reason?: string;
        };

        if (!gameId && !category) {
            return next(new ValidationError('At least one of gameId or category is required'));
        }

        const user = await findUserByDiscordId(discordId as string);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const exclusion = await addExclusion({ userId: user.id, gameId, category, reason });
        await invalidateExclusionCache(user.id);

        res.status(201).json({ success: true, data: exclusion });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /user/:discordId/exclusions/:exclusionId
 * Remove a single exclusion entry.
 */
router.delete('/:discordId/exclusions/:exclusionId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { discordId, exclusionId } = req.params;

        const user = await findUserByDiscordId(discordId as string);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await removeExclusion(exclusionId as string, user.id);
        await invalidateExclusionCache(user.id);

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export { router as userRouter };
