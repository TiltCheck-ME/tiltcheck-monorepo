/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { rgaasRouter } from '../../src/routes/rgaas.js';
import * as eventTypes from '@tiltcheck/event-types';
import * as safetyLib from '../../src/lib/safety.js';
import * as liveFeedData from '../../src/lib/live-feed-data.js';
import { trustEngines } from '@tiltcheck/trust-engines';
import { suslink } from '@tiltcheck/suslink';
import * as tiltcheckCore from '@tiltcheck/tiltcheck-core';
import { eventRouter } from '@tiltcheck/event-router';

vi.mock('@tiltcheck/event-types', () => ({
    createEvent: vi.fn(),
}));

vi.mock('../../src/lib/safety.js', () => ({
    evaluateBreathalyzer: vi.fn(),
    evaluateSentiment: vi.fn(),
    evaluateSentimentV2: vi.fn(),
}));

vi.mock('../../src/lib/live-feed-data.js', () => ({
    loadDomainBlacklist: vi.fn(),
}));

vi.mock('../../src/middleware/auth.js', () => ({
    authMiddleware: (req: any, _res: unknown, next: (err?: unknown) => void) => {
        req.user = {
            id: req.params?.id || req.params?.userId || req.body?.userId || 'u1',
            email: 'test@tiltcheck.me',
            roles: [],
        };
        next();
    },
    optionalAuthMiddleware: (_req: any, _res: unknown, next: (err?: unknown) => void) => {
        next();
    },
}));

vi.mock('@tiltcheck/trust-engines', () => ({
    trustEngines: {
        getCasinoScore: vi.fn(),
        getCasinoBreakdown: vi.fn(),
        getCasinoScores: vi.fn(),
        explainCasinoScore: vi.fn(),
        getDegenScore: vi.fn(),
        getDegenBreakdown: vi.fn(),
        explainDegenScore: vi.fn(),
    }
}));

vi.mock('@tiltcheck/event-router', () => ({
    eventRouter: {
        publish: vi.fn(),
    },
}));

vi.mock('@tiltcheck/suslink', () => ({
    suslink: {
        scanUrl: vi.fn(),
    }
}));

vi.mock('@tiltcheck/tiltcheck-core', () => ({
    getUserTiltStatus: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/rgaas', rgaasRouter);

const TEST_EMAIL_BONUS_FEED_PATH = path.join(process.cwd(), 'data', 'test-email-bonus-feed-rgaas.json');
const TEST_TRUST_SIGNALS_LOG_PATH = path.join(process.cwd(), 'data', 'test-trust-signals-rgaas.jsonl');

describe('RGaaS Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.EMAIL_BONUS_FEED_PATH = TEST_EMAIL_BONUS_FEED_PATH;
        process.env.TRUST_SIGNALS_LOG_PATH = TEST_TRUST_SIGNALS_LOG_PATH;
        if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
        if (existsSync(TEST_TRUST_SIGNALS_LOG_PATH)) rmSync(TEST_TRUST_SIGNALS_LOG_PATH);
        vi.mocked(liveFeedData.loadDomainBlacklist).mockResolvedValue({
            availability: 'available',
            domains: ['hyperbet-bonus.net'],
            source: 'domain_blacklist.json',
        });
        vi.mocked(trustEngines.getCasinoScores).mockReturnValue({});
    });

    afterEach(() => {
        delete process.env.EMAIL_BONUS_FEED_PATH;
        delete process.env.TRUST_SIGNALS_LOG_PATH;
        if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
        if (existsSync(TEST_TRUST_SIGNALS_LOG_PATH)) rmSync(TEST_TRUST_SIGNALS_LOG_PATH);
    });

    describe('POST /rgaas/breathalyzer/evaluate', () => {
        it('should return 400 if userId is missing', async () => {
            const response = await request(app).post('/rgaas/breathalyzer/evaluate').send({ eventsInWindow: 10, windowMinutes: 60 });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('userId is required');
        });

        it('should return 400 if eventsInWindow or windowMinutes is missing/invalid', async () => {
            const response = await request(app).post('/rgaas/breathalyzer/evaluate').send({ userId: 'u1', windowMinutes: 60 });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('eventsInWindow and windowMinutes must be numbers');
        });

        it('should evaluate breathalyzer successfully', async () => {
            vi.mocked(safetyLib.evaluateBreathalyzer).mockReturnValueOnce({
                riskScore: 80,
                riskTier: 'high',
                recommendedCooldownMinutes: 120,
            } as any);

            vi.mocked(eventTypes.createEvent).mockReturnValueOnce({ id: 'evt-1' } as any);

            const response = await request(app)
                .post('/rgaas/breathalyzer/evaluate')
                .send({ userId: 'u1', eventsInWindow: 10, windowMinutes: 60 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result.riskScore).toBe(80);

            expect(safetyLib.evaluateBreathalyzer).toHaveBeenCalledWith({
                userId: 'u1',
                eventsInWindow: 10,
                windowMinutes: 60,
                lossAmountWindow: undefined,
                streakLosses: undefined,
            });
        });
    });

    describe('POST /rgaas/anti-tilt/evaluate', () => {
        it('should return 400 for missing userId', async () => {
            const response = await request(app).post('/rgaas/anti-tilt/evaluate').send({ message: 'hello' });
            expect(response.status).toBe(400);
        });

        it('should return 400 for missing message', async () => {
            const response = await request(app).post('/rgaas/anti-tilt/evaluate').send({ userId: 'u1' });
            expect(response.status).toBe(400);
        });

        it('should evaluate sentiment successfully', async () => {
            vi.mocked(safetyLib.evaluateSentimentV2).mockResolvedValueOnce({
                score: 95,
                severity: 'critical',
                matchedSignals: ['lost it all'],
            } as any);

            vi.mocked(eventTypes.createEvent).mockReturnValueOnce({ id: 'evt-2' } as any);

            const response = await request(app)
                .post('/rgaas/anti-tilt/evaluate')
                .send({ userId: 'u1', message: 'I lost it all' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result.severity).toBe('critical');

            expect(safetyLib.evaluateSentimentV2).toHaveBeenCalledWith({
                userId: 'u1',
                message: 'I lost it all',
                distressSignals: undefined,
            });
        });
    });

    describe('GET /rgaas/trust/casino/:name', () => {
        it('should return casino trust score', async () => {
            vi.mocked(trustEngines.getCasinoScore).mockReturnValueOnce(90);
            vi.mocked(trustEngines.getCasinoBreakdown).mockReturnValueOnce({ fairness: 90 } as any);
            vi.mocked(trustEngines.explainCasinoScore).mockReturnValueOnce(['Highly trusted']);

            const response = await request(app).get('/rgaas/trust/casino/TestCasino');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.casino).toBe('TestCasino');
            expect(response.body.score).toBe(90);
        });
    });

    describe('GET /rgaas/trust/user/:id', () => {
        it('should return user trust profile', async () => {
            vi.mocked(trustEngines.getDegenScore).mockReturnValueOnce(50);
            vi.mocked(trustEngines.getDegenBreakdown).mockReturnValueOnce({ activity: 50 } as any);
            vi.mocked(trustEngines.explainDegenScore).mockReturnValueOnce(['Average degen']);

            const response = await request(app).get('/rgaas/trust/user/u123');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.userId).toBe('u123');
            expect(response.body.level).toBe(50);
        });
    });

    describe('POST /rgaas/scan', () => {
        it('should return 400 for missing url', async () => {
            const response = await request(app).post('/rgaas/scan').send({});
            expect(response.status).toBe(400);
        });

        it('should trigger suslink scan successfully', async () => {
            const mockScanResult = { isSus: false, confidence: 99 };
            vi.mocked(suslink.scanUrl).mockResolvedValueOnce(mockScanResult as any);

            const response = await request(app)
                .post('/rgaas/scan')
                .send({ url: 'https://legit.com', userId: 'usr-1' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result).toEqual(mockScanResult);
            expect(suslink.scanUrl).toHaveBeenCalledWith('https://legit.com', 'usr-1');
        });

        it('should handle internal errors gracefully', async () => {
            vi.mocked(suslink.scanUrl).mockRejectedValueOnce(new Error('Network Error'));

            const response = await request(app).post('/rgaas/scan').send({ url: 'https://err.com' });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Network Error');
        });
    });

    describe('GET /rgaas/profile/:userId', () => {
        it('should return unified user risk profile', async () => {
            vi.mocked(trustEngines.getDegenScore).mockReturnValueOnce(60);
            vi.mocked(trustEngines.getDegenBreakdown).mockReturnValueOnce({ score: 60 } as any);
            vi.mocked(tiltcheckCore.getUserTiltStatus).mockReturnValueOnce({
                onCooldown: false,
                lossStreak: 2,
                recentSignals: [],
            } as any);

            const response = await request(app).get('/rgaas/profile/u123');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.profile.riskScore).toBe(40); // 100 - 60
            expect(response.body.profile.recommendation).toBe('NORMAL_PLAY');
        });
    });

    describe('GET /rgaas/scam-domains', () => {
        it('returns repository blacklist entries without fake metadata', async () => {
            vi.mocked(liveFeedData.loadDomainBlacklist).mockResolvedValueOnce({
                availability: 'available',
                domains: ['hyperbet-bonus.net', 'stake-free-claim.com'],
                source: 'domain_blacklist.json',
            });

            const response = await request(app).get('/rgaas/scam-domains');

            expect(response.status).toBe(200);
            expect(response.body.live).toBe(true);
            expect(response.body.availability).toBe('available');
            expect(response.body.scams).toEqual([
                {
                    domain: 'hyperbet-bonus.net',
                    source: 'domain_blacklist',
                    classification: 'repository blacklist match',
                },
                {
                    domain: 'stake-free-claim.com',
                    source: 'domain_blacklist',
                    classification: 'repository blacklist match',
                },
            ]);
        });

        it('reports empty blacklist state explicitly', async () => {
            vi.mocked(liveFeedData.loadDomainBlacklist).mockResolvedValueOnce({
                availability: 'empty',
                domains: [],
                source: 'domain_blacklist.json',
            });

            const response = await request(app).get('/rgaas/scam-domains');

            expect(response.status).toBe(200);
            expect(response.body.live).toBe(false);
            expect(response.body.availability).toBe('empty');
            expect(response.body.message).toContain('zero domains');
            expect(response.body.scams).toEqual([]);
        });
    });

    describe('GET /rgaas/shadow-bans', () => {
        it('returns only supported trust-engine events', async () => {
            const now = Date.now();
            vi.mocked(trustEngines.getCasinoScores).mockReturnValue({
                stake: {} as any,
                roobet: {} as any,
            });
            vi.mocked(trustEngines.getCasinoBreakdown)
                .mockImplementationOnce(() => ({
                    history: [
                        {
                            timestamp: now,
                            delta: -15,
                            reason: 'Vault: Withdrawal speed update (96h)',
                            category: 'financial',
                        },
                        {
                            timestamp: now,
                            delta: -5,
                            reason: 'Community intel (discord): rough vibes only',
                            category: 'community',
                        },
                    ],
                } as any))
                .mockImplementationOnce(() => ({
                    history: [
                        {
                            timestamp: now - 1000,
                            delta: -10,
                            reason: 'Watcher: Terms of Service Volatility: withdrawal rules changed',
                            category: 'fairness',
                        },
                    ],
                } as any));

            const response = await request(app).get('/rgaas/shadow-bans');

            expect(response.status).toBe(200);
            expect(response.body.live).toBe(true);
            expect(response.body.coverage).toBe('partial');
            expect(response.body.supportedSignals).toContain('Withdrawal and payout trust-engine events');
            expect(response.body.unavailableSignals).toContain('Account restriction reports');
            expect(response.body.flags).toHaveLength(2);
            expect(response.body.flags[0]).toMatchObject({
                source: 'trust_engine_history',
            });
        });

        it('returns an explicit empty state instead of fallback sample data', async () => {
            vi.mocked(trustEngines.getCasinoScores).mockReturnValue({
                stake: {} as any,
            });
            vi.mocked(trustEngines.getCasinoBreakdown).mockReturnValue({
                history: [],
            } as any);

            const response = await request(app).get('/rgaas/shadow-bans');

            expect(response.status).toBe(200);
            expect(response.body.flags).toEqual([]);
            expect(response.body.message).toContain('does not cover account restrictions');
        });
    });

    describe('POST /rgaas/email-ingest', () => {
        it('persists inbox bonuses, appends trust signals, and publishes bonus alerts', async () => {
            vi.mocked(suslink.scanUrl)
                .mockResolvedValueOnce({ riskLevel: 'low', reason: 'sender clean' } as any)
                .mockResolvedValueOnce({ riskLevel: 'low', reason: 'claim link clean' } as any);

            const response = await request(app)
                .post('/rgaas/email-ingest')
                .send({
                    raw_email: [
                        'From: promos@mcluck.com',
                        'Date: Thu, 16 Apr 2026 12:00:00 +0000',
                        'Subject: Match bonus drop',
                        '',
                        'Get a 100% match bonus up to $500 expires in 2 days.',
                        'Use code DROP500 at https://mcluck.com/promos/claim',
                        '<img src="https://cdn.discordapp.com/ephemeral-attachments/1234/5678/bad.png" />',
                        '<img src="https://mcluck.com/assets/promo-banner.png" />',
                        'Unsubscribe: https://mcluck.com/unsubscribe',
                    ].join('\n'),
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.bonusFeed.detected).toBe(1);
            expect(response.body.bonusFeed.added).toBe(1);
            expect(response.body.bonusFeed.publishedEvents).toBe(1);

            expect(vi.mocked(eventRouter.publish)).toHaveBeenCalledWith(
                'bonus.discovered',
                'rgaas-api',
                expect.objectContaining({
                    casino_name: 'McLuck',
                    bonus_type: 'Match',
                    value: '100% USD',
                    code: 'DROP500',
                    bonus_url: 'https://mcluck.com/promos/claim',
                    image_url: 'https://mcluck.com/assets/promo-banner.png',
                    source: 'email-inbox',
                }),
                undefined,
                expect.objectContaining({
                    discoveredVia: 'email-ingest',
                    senderDomain: 'mcluck.com',
                })
            );

            const persistedFeed = JSON.parse(readFileSync(TEST_EMAIL_BONUS_FEED_PATH, 'utf8')) as {
                bonuses: Array<Record<string, unknown>>;
            };
            expect(persistedFeed.bonuses).toHaveLength(1);
            expect(persistedFeed.bonuses[0]).toMatchObject({
                brand: 'McLuck',
                code: 'DROP500',
                imageUrl: 'https://mcluck.com/assets/promo-banner.png',
                url: 'https://mcluck.com/promos/claim',
                source: 'email-inbox',
                lastPublishedAt: expect.any(String),
            });

            const trustSignalsLog = readFileSync(TEST_TRUST_SIGNALS_LOG_PATH, 'utf8').trim().split('\n');
            expect(trustSignalsLog).toHaveLength(1);
            expect(JSON.parse(trustSignalsLog[0])).toMatchObject({
                senderDomain: 'mcluck.com',
                casinoBrand: 'McLuck',
                source: 'email-ingest',
            });
        });

        it('does not publish expired inbox bonuses', async () => {
            vi.mocked(suslink.scanUrl)
                .mockResolvedValueOnce({ riskLevel: 'low', reason: 'sender clean' } as any)
                .mockResolvedValueOnce({ riskLevel: 'low', reason: 'claim link clean' } as any);

            const response = await request(app)
                .post('/rgaas/email-ingest')
                .send({
                    raw_email: [
                        'From: promos@mcluck.com',
                        'Date: Thu, 01 Jan 2026 12:00:00 +0000',
                        'Subject: Old match bonus',
                        '',
                        'Get a 100% match bonus up to $500 expires in 1 day.',
                        'Use code OLD500 at https://mcluck.com/promos/expired',
                    ].join('\n'),
                });

            expect(response.status).toBe(200);
            expect(response.body.bonusFeed.detected).toBe(1);
            expect(response.body.bonusFeed.publishedEvents).toBe(0);
            expect(vi.mocked(eventRouter.publish)).not.toHaveBeenCalled();

            const persistedFeed = JSON.parse(readFileSync(TEST_EMAIL_BONUS_FEED_PATH, 'utf8')) as {
                bonuses: Array<Record<string, unknown>>;
            };
            expect(persistedFeed.bonuses[0]).toMatchObject({
                isExpired: true,
                code: 'OLD500',
            });
        });
    });
});
