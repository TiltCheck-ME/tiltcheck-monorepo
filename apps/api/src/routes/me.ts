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
    getUserSettingsRow,
    upsertOnboarding,
    upsertUserSettingsRow,
    type UserOnboarding,
} from '@tiltcheck/db';
import { ApplicationError, InternalServerError, ValidationError } from '@tiltcheck/error-factory';
import { optionalAuthMiddleware, type AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import etag from 'etag';

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

const SETTINGS_VERSION = 1 as const;

const userSettingsPatchSchema = z.object({
    settingsVersion: z.literal(SETTINGS_VERSION).optional(),
    limits: z.object({
        cooldownEnabled: z.boolean().optional(),
        dailyLimitUsd: z.number().finite().nullable().optional(),
        redeemThresholdUsd: z.number().finite().nullable().optional(),
    }).optional(),
    notifications: z.object({
        tips: z.boolean().optional(),
        trivia: z.boolean().optional(),
        promos: z.boolean().optional(),
    }).optional(),
    dataSharing: z.object({
        sessionTelemetry: z.boolean().optional(),
        messageContents: z.boolean().optional(),
        financialData: z.boolean().optional(),
    }).optional(),
    featureFlags: z.record(z.string(), z.boolean()).optional(),
    surfaces: z.object({
        mobile: z.record(z.string(), z.unknown()).optional(),
        extension: z.record(z.string(), z.unknown()).optional(),
        activity: z.record(z.string(), z.unknown()).optional(),
    }).optional(),
}).strict();

type UserSettingsDoc = z.infer<typeof userSettingsPatchSchema> & { settingsVersion: typeof SETTINGS_VERSION; updatedAt: string };

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

function settingsAccessMiddleware(req: Request, res: Response, next: NextFunction): void {
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

function defaultSettingsDoc(now = new Date(0)): UserSettingsDoc {
    return {
        settingsVersion: SETTINGS_VERSION,
        updatedAt: now.toISOString(),
        limits: {
            cooldownEnabled: true,
            dailyLimitUsd: null,
            redeemThresholdUsd: null,
        },
        notifications: {
            tips: true,
            trivia: true,
            promos: false,
        },
        dataSharing: {
            sessionTelemetry: false,
            messageContents: false,
            financialData: false,
        },
        featureFlags: {},
        surfaces: {},
    };
}

function parseStoredSettingsDoc(raw: unknown, fallbackUpdatedAt: Date): UserSettingsDoc {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return defaultSettingsDoc(fallbackUpdatedAt);
    }

    const record = raw as Record<string, unknown>;
    const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : fallbackUpdatedAt.toISOString();

    return mergeSettingsPatch(defaultSettingsDoc(new Date(updatedAt)), record as any, updatedAt);
}

function mergeSettingsPatch(current: UserSettingsDoc, patch: z.infer<typeof userSettingsPatchSchema>, updatedAt: string): UserSettingsDoc {
    return {
        ...current,
        settingsVersion: SETTINGS_VERSION,
        updatedAt,
        limits: {
            ...current.limits,
            ...(patch.limits ?? {}),
        },
        notifications: {
            ...current.notifications,
            ...(patch.notifications ?? {}),
        },
        dataSharing: {
            ...current.dataSharing,
            ...(patch.dataSharing ?? {}),
        },
        featureFlags: patch.featureFlags ? { ...current.featureFlags, ...patch.featureFlags } : current.featureFlags,
        surfaces: patch.surfaces ? { ...current.surfaces, ...patch.surfaces } : current.surfaces,
    };
}

function buildSettingsEtag(doc: UserSettingsDoc): string {
    return etag(JSON.stringify(doc), { weak: true });
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

router.get('/settings', settingsAccessMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authUser = (req as AuthRequest).user;
        if (!authUser?.id) {
            next(new ApplicationError('Unauthorized', 401, 'UNAUTHORIZED'));
            return;
        }

        const row = await getUserSettingsRow(authUser.id);
        const updatedAt = row?.updated_at ?? new Date(0);
        const settings = parseStoredSettingsDoc(row?.settings ?? null, updatedAt);

        const computedEtag = buildSettingsEtag(settings);
        res.setHeader('ETag', computedEtag);
        res.json({
            userId: authUser.id,
            etag: computedEtag,
            settings,
        });
    } catch (error) {
        if (error instanceof ApplicationError || error instanceof ValidationError) {
            next(error);
            return;
        }

        console.error('[Me API] Get settings error:', error);
        next(new InternalServerError('Failed to get settings'));
    }
});

router.put('/settings', settingsAccessMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authUser = (req as AuthRequest).user;
        if (!authUser?.id) {
            next(new ApplicationError('Unauthorized', 401, 'UNAUTHORIZED'));
            return;
        }

        const parsedBody = userSettingsPatchSchema.safeParse(req.body);
        if (!parsedBody.success) {
            const firstIssue = parsedBody.error.issues[0];
            next(new ValidationError(firstIssue?.message || 'Invalid settings payload'));
            return;
        }

        const existingRow = await getUserSettingsRow(authUser.id);
        const existingUpdatedAt = existingRow?.updated_at ?? new Date(0);
        const existingSettings = parseStoredSettingsDoc(existingRow?.settings ?? null, existingUpdatedAt);

        const existingEtag = buildSettingsEtag(existingSettings);
        const ifMatch = typeof req.headers['if-match'] === 'string' ? req.headers['if-match'] : undefined;
        if (ifMatch && ifMatch !== existingEtag) {
            res.setHeader('ETag', existingEtag);
            res.status(412).json({
                error: 'Settings version conflict',
                code: 'SETTINGS_CONFLICT',
            });
            return;
        }

        const updatedAt = new Date().toISOString();
        const nextSettings = mergeSettingsPatch(existingSettings, parsedBody.data, updatedAt);

        const persisted = await upsertUserSettingsRow({
            userId: authUser.id,
            settingsVersion: SETTINGS_VERSION,
            settings: nextSettings,
        });

        if (!persisted) {
            next(new InternalServerError('Failed to persist settings'));
            return;
        }

        const computedEtag = buildSettingsEtag(nextSettings);
        res.setHeader('ETag', computedEtag);
        res.json({
            userId: authUser.id,
            etag: computedEtag,
            settings: nextSettings,
        });
    } catch (error) {
        if (error instanceof ApplicationError || error instanceof ValidationError) {
            next(error);
            return;
        }

        console.error('[Me API] Update settings error:', error);
        next(new InternalServerError('Failed to update settings'));
    }
});

export {
    buildFallbackCompletedSteps,
    resolveDiscordId,
    toOnboardingStatusResponse,
    router as meRouter,
};
