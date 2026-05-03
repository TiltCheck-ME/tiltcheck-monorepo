/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * Me Routes - /me/*
 * Canonical onboarding status endpoints shared by web and Discord bot.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
    createUser,
    deleteRow,
    findOnboardingByDiscordId,
    findUserByDiscordId,
    upsertOnboarding,
    type UserOnboarding,
} from '@tiltcheck/db';
import { ApplicationError, InternalServerError, ValidationError } from '@tiltcheck/error-factory';
import { optionalAuthMiddleware, type AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router: Router = Router();

const ONBOARDING_STEPS = ['terms', 'quiz', 'preferences', 'completed'] as const;
type OnboardingStep = typeof ONBOARDING_STEPS[number];
type RiskLevel = 'conservative' | 'moderate' | 'degen';

const onboardingStepSchema = z.enum(ONBOARDING_STEPS);
const onboardingStatusUpdateSchema = z.object({
    discordId: z.string().trim().min(1).optional(),
    step: onboardingStepSchema,
    hasAcceptedTerms: z.boolean().optional(),
    riskLevel: z.enum(['conservative', 'moderate', 'degen']).optional(),
    quizScores: z.record(z.string(), z.number().finite()).optional(),
    preferences: z.object({
        cooldownEnabled: z.boolean().optional(),
        voiceInterventionEnabled: z.boolean().optional(),
        dailyLimit: z.number().finite().nullable().optional(),
        redeemThreshold: z.number().finite().nullable().optional(),
        notifyNftIdentityReady: z.boolean().optional(),
        complianceBypass: z.boolean().optional(),
        dataSharing: z.object({
            messageContents: z.boolean().optional(),
            financialData: z.boolean().optional(),
            sessionTelemetry: z.boolean().optional(),
        }).optional(),
        notifications: z.object({
            tips: z.boolean().optional(),
            trivia: z.boolean().optional(),
            promos: z.boolean().optional(),
        }).optional(),
    }).optional(),
});

interface SerializedQuizState {
    answers: Record<string, number>;
    completedSteps: OnboardingStep[];
}

function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
}

function hasInternalServiceAccess(req: Request): boolean {
    const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
    if (!internalSecret) {
        return false;
    }

    const bearerToken = extractBearerToken(req.headers.authorization);
    const headerSecret = typeof req.headers['x-internal-secret'] === 'string'
        ? req.headers['x-internal-secret'].trim()
        : '';

    return bearerToken === internalSecret || headerSecret === internalSecret;
}

function onboardingAccessMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (hasInternalServiceAccess(req)) {
        next();
        return;
    }

    optionalAuthMiddleware(req, res, (err) => {
        if (err) {
            next(err);
            return;
        }

        const authUser = (req as AuthRequest).user;
        if (!authUser?.id) {
            next(new ApplicationError('Unauthorized', 401, 'UNAUTHORIZED'));
            return;
        }

        next();
    });
}

function normalizeStepList(input: unknown): OnboardingStep[] {
    if (!Array.isArray(input)) {
        return [];
    }

    const normalized = input.filter((value): value is OnboardingStep => {
        return typeof value === 'string' && ONBOARDING_STEPS.includes(value as OnboardingStep);
    });

    return Array.from(new Set(normalized));
}

function parseStoredQuizState(rawValue: string | null): SerializedQuizState {
    if (!rawValue) {
        return { answers: {}, completedSteps: [] };
    }

    try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { answers: {}, completedSteps: [] };
        }

        const parsedRecord = parsed as Record<string, unknown>;
        const answersSource = parsedRecord.answers && typeof parsedRecord.answers === 'object' && !Array.isArray(parsedRecord.answers)
            ? parsedRecord.answers as Record<string, unknown>
            : parsedRecord;

        const answers = Object.fromEntries(
            Object.entries(answersSource).flatMap(([key, value]) => {
                if (key === 'completedSteps' || key === 'answers') {
                    return [];
                }

                return typeof value === 'number' && Number.isFinite(value)
                    ? [[key, value]]
                    : [];
            })
        );

        return {
            answers,
            completedSteps: normalizeStepList(parsedRecord.completedSteps),
        };
    } catch {
        return { answers: {}, completedSteps: [] };
    }
}

function serializeQuizState(state: SerializedQuizState): string | null {
    const completedSteps = normalizeStepList(state.completedSteps);
    const answers = Object.fromEntries(
        Object.entries(state.answers).flatMap(([key, value]) => {
            return typeof value === 'number' && Number.isFinite(value)
                ? [[key, value]]
                : [];
        })
    );

    if (Object.keys(answers).length === 0 && completedSteps.length === 0) {
        return null;
    }

    return JSON.stringify({
        answers,
        completedSteps,
    });
}

function buildFallbackCompletedSteps(onboarding: UserOnboarding | null, quizState: SerializedQuizState): OnboardingStep[] {
    const completedSteps = new Set<OnboardingStep>(quizState.completedSteps);

    if (!onboarding) {
        return ONBOARDING_STEPS.filter((step) => completedSteps.has(step));
    }

    if (onboarding.has_accepted_terms) {
        completedSteps.add('terms');
    }

    if (Object.keys(quizState.answers).length > 0) {
        completedSteps.add('quiz');
    }

    if (
        onboarding.is_onboarded
        || onboarding.tutorial_completed
        || onboarding.voice_intervention_enabled
        || onboarding.daily_limit !== null
        || onboarding.redeem_threshold !== null
        || onboarding.notifications_promos
    ) {
        completedSteps.add('preferences');
    }

    if (onboarding.is_onboarded || onboarding.tutorial_completed) {
        completedSteps.add('completed');
    }

    return ONBOARDING_STEPS.filter((step) => completedSteps.has(step));
}

function toIsoDate(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    const normalized = value instanceof Date ? value : new Date(value);
    return Number.isNaN(normalized.getTime()) ? null : normalized.toISOString();
}

function toOnboardingStatusResponse(onboarding: UserOnboarding | null) {
    if (!onboarding) {
        return {
            completedSteps: [] as OnboardingStep[],
            completedAt: null,
            hasAcceptedTerms: false,
            riskLevel: null as RiskLevel | null,
            quizScores: {} as Record<string, number>,
            preferences: {
                cooldownEnabled: true,
                voiceInterventionEnabled: false,
                dailyLimit: null as number | null,
                redeemThreshold: null as number | null,
                notifyNftIdentityReady: false,
                complianceBypass: false,
                dataSharing: {
                    messageContents: false,
                    financialData: false,
                    sessionTelemetry: false,
                },
                notifications: {
                    tips: true,
                    trivia: true,
                    promos: false,
                },
            },
        };
    }

    const quizState = parseStoredQuizState(onboarding.quiz_scores);
    const completedSteps = buildFallbackCompletedSteps(onboarding, quizState);
    const completedAt = completedSteps.includes('completed')
        ? toIsoDate(onboarding.joined_at) ?? toIsoDate(onboarding.updated_at)
        : null;

    return {
        completedSteps,
        completedAt,
        hasAcceptedTerms: onboarding.has_accepted_terms,
        riskLevel: onboarding.risk_level,
        quizScores: quizState.answers,
        preferences: {
            cooldownEnabled: onboarding.cooldown_enabled,
            voiceInterventionEnabled: onboarding.voice_intervention_enabled,
            dailyLimit: onboarding.daily_limit,
            redeemThreshold: onboarding.redeem_threshold,
            notifyNftIdentityReady: onboarding.notify_nft_identity_ready,
            complianceBypass: onboarding.compliance_bypass,
            dataSharing: {
                messageContents: onboarding.share_message_contents,
                financialData: onboarding.share_financial_data,
                sessionTelemetry: onboarding.share_session_telemetry,
            },
            notifications: {
                tips: onboarding.notifications_tips,
                trivia: onboarding.notifications_trivia,
                promos: onboarding.notifications_promos,
            },
        },
    };
}

function resolveDiscordId(req: Request, bodyDiscordId?: unknown): string {
    if (hasInternalServiceAccess(req)) {
        const queryDiscordId = typeof req.query.discordId === 'string' ? req.query.discordId.trim() : '';
        const resolvedDiscordId = typeof bodyDiscordId === 'string' && bodyDiscordId.trim().length > 0
            ? bodyDiscordId.trim()
            : queryDiscordId;

        if (!resolvedDiscordId) {
            throw new ValidationError('discordId is required for internal onboarding requests');
        }

        return resolvedDiscordId;
    }

    const authUser = (req as AuthRequest).user;
    if (!authUser?.discordId?.trim()) {
        throw new ValidationError('User must be linked to Discord to manage onboarding');
    }

    return authUser.discordId.trim();
}

async function ensureOnboardingUser(discordId: string): Promise<void> {
    const existingUser = await findUserByDiscordId(discordId);
    if (existingUser) {
        return;
    }

    await createUser({
        discord_id: discordId,
    });
}

function buildUpdatedCompletedSteps(
    currentSteps: OnboardingStep[],
    step: OnboardingStep,
    hasQuizAnswers: boolean,
): OnboardingStep[] {
    const nextSteps = new Set<OnboardingStep>(currentSteps);

    if (step === 'terms') {
        nextSteps.add('terms');
    }

    if (step === 'quiz') {
        nextSteps.add('terms');
        nextSteps.add('quiz');
    }

    if (step === 'preferences') {
        nextSteps.add('terms');
        nextSteps.add('preferences');
    }

    if (step === 'completed') {
        nextSteps.add('terms');
        nextSteps.add('preferences');
        nextSteps.add('completed');
        if (hasQuizAnswers) {
            nextSteps.add('quiz');
        }
    }

    return ONBOARDING_STEPS.filter((candidate) => nextSteps.has(candidate));
}

router.get('/onboarding-status', onboardingAccessMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const discordId = resolveDiscordId(req);
        const onboarding = await findOnboardingByDiscordId(discordId);
        res.json(toOnboardingStatusResponse(onboarding));
    } catch (error) {
        if (error instanceof ApplicationError || error instanceof ValidationError) {
            next(error);
            return;
        }

        console.error('[Me API] Get onboarding status error:', error);
        next(new InternalServerError('Failed to get onboarding status'));
    }
});

router.post('/onboarding-status', onboardingAccessMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsedBody = onboardingStatusUpdateSchema.safeParse(req.body);
        if (!parsedBody.success) {
            const firstIssue = parsedBody.error.issues[0];
            return next(new ValidationError(firstIssue?.message || 'Invalid onboarding payload'));
        }

        const discordId = resolveDiscordId(req, parsedBody.data.discordId);
        await ensureOnboardingUser(discordId);
        const existingOnboarding = await findOnboardingByDiscordId(discordId);
        const existingQuizState = parseStoredQuizState(existingOnboarding?.quiz_scores ?? null);
        const nextQuizAnswers = parsedBody.data.quizScores ?? existingQuizState.answers;
        const completedSteps = buildUpdatedCompletedSteps(
            buildFallbackCompletedSteps(existingOnboarding, existingQuizState),
            parsedBody.data.step,
            Object.keys(nextQuizAnswers).length > 0,
        );
        const tutorialCompleted = parsedBody.data.step === 'completed'
            ? true
            : existingOnboarding?.tutorial_completed;

        await upsertOnboarding({
            discord_id: discordId,
            is_onboarded: parsedBody.data.step === 'completed' ? true : undefined,
            has_accepted_terms: parsedBody.data.hasAcceptedTerms
                ?? (parsedBody.data.step === 'terms' || parsedBody.data.step === 'quiz' || parsedBody.data.step === 'preferences' || parsedBody.data.step === 'completed'
                    ? true
                    : existingOnboarding?.has_accepted_terms),
            risk_level: parsedBody.data.riskLevel,
            cooldown_enabled: parsedBody.data.preferences?.cooldownEnabled,
            voice_intervention_enabled: parsedBody.data.preferences?.voiceInterventionEnabled,
            share_message_contents: parsedBody.data.preferences?.dataSharing?.messageContents,
            share_financial_data: parsedBody.data.preferences?.dataSharing?.financialData,
            share_session_telemetry: parsedBody.data.preferences?.dataSharing?.sessionTelemetry,
            notify_nft_identity_ready: parsedBody.data.preferences?.notifyNftIdentityReady,
            daily_limit: parsedBody.data.preferences?.dailyLimit,
            redeem_threshold: parsedBody.data.preferences?.redeemThreshold,
            quiz_scores: serializeQuizState({
                answers: nextQuizAnswers,
                completedSteps,
            }),
            tutorial_completed: tutorialCompleted,
            notifications_tips: parsedBody.data.preferences?.notifications?.tips,
            notifications_trivia: parsedBody.data.preferences?.notifications?.trivia,
            notifications_promos: parsedBody.data.preferences?.notifications?.promos,
            compliance_bypass: parsedBody.data.preferences?.complianceBypass,
            joined_at: existingOnboarding?.joined_at ?? new Date(),
        });

        const updatedOnboarding = await findOnboardingByDiscordId(discordId);
        res.json(toOnboardingStatusResponse(updatedOnboarding));
    } catch (error) {
        if (error instanceof ApplicationError || error instanceof ValidationError) {
            next(error);
            return;
        }

        console.error('[Me API] Update onboarding status error:', error);
        next(new InternalServerError('Failed to update onboarding status'));
    }
});

router.delete('/onboarding-status', onboardingAccessMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const discordId = resolveDiscordId(req);
        await deleteRow('user_onboarding', discordId, 'discord_id');
        res.json({ success: true });
    } catch (error) {
        if (error instanceof ApplicationError || error instanceof ValidationError) {
            next(error);
            return;
        }

        console.error('[Me API] Reset onboarding status error:', error);
        next(new InternalServerError('Failed to reset onboarding status'));
    }
});

export {
    buildFallbackCompletedSteps,
    resolveDiscordId,
    toOnboardingStatusResponse,
    router as meRouter,
};
