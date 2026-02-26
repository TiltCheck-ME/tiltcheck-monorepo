/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { rgaasRouter } from '../../src/routes/rgaas.js';
import * as eventTypes from '@tiltcheck/event-types';
import * as safetyLib from '../../src/lib/safety.js';
import { trustEngines } from '@tiltcheck/trust-engines';
import { suslink } from '@tiltcheck/suslink';
import * as tiltcheckCore from '@tiltcheck/tiltcheck-core';

vi.mock('@tiltcheck/event-types', () => ({
    createEvent: vi.fn(),
}));

vi.mock('../../src/lib/safety.js', () => ({
    evaluateBreathalyzer: vi.fn(),
    evaluateSentiment: vi.fn(),
}));

vi.mock('@tiltcheck/trust-engines', () => ({
    trustEngines: {
        getCasinoScore: vi.fn(),
        getCasinoBreakdown: vi.fn(),
        explainCasinoScore: vi.fn(),
        getDegenScore: vi.fn(),
        getDegenBreakdown: vi.fn(),
        explainDegenScore: vi.fn(),
    }
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

describe('RGaaS Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
            vi.mocked(safetyLib.evaluateSentiment).mockReturnValueOnce({
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

            expect(safetyLib.evaluateSentiment).toHaveBeenCalledWith({
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
});
