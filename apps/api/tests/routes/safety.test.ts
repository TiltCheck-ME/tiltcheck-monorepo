/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { safetyRouter } from '../../src/routes/safety.js';
import * as eventTypes from '@tiltcheck/event-types';
import * as safetyLib from '../../src/lib/safety.js';

// Need to mock LinkScanner class
const mockScan = vi.hoisted(() => vi.fn());
vi.mock('@tiltcheck/suslink', () => {
    return {
        LinkScanner: class {
            scan = mockScan;
        }
    };
});

vi.mock('@tiltcheck/event-types', () => ({
    createEvent: vi.fn(),
}));

vi.mock('../../src/lib/safety.js', () => ({
    evaluateBreathalyzer: vi.fn(),
    evaluateSentiment: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/safety', safetyRouter);

describe('Safety Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /safety/breathalyzer/evaluate', () => {
        it('should return 400 if userId is missing', async () => {
            const response = await request(app).post('/safety/breathalyzer/evaluate').send({ eventsInWindow: 10, windowMinutes: 60 });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('userId is required');
        });

        it('should return 400 if eventsInWindow or windowMinutes is invalid', async () => {
            const response = await request(app).post('/safety/breathalyzer/evaluate').send({ userId: 'u1', windowMinutes: 60 });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('eventsInWindow and windowMinutes must be numbers');
        });

        it('should successfully evaluate breathalyzer', async () => {
            vi.mocked(safetyLib.evaluateBreathalyzer).mockReturnValueOnce({
                riskScore: 75,
                riskTier: 'high',
                recommendedCooldownMinutes: 120,
            } as any);

            vi.mocked(eventTypes.createEvent).mockReturnValueOnce({ id: 'evt-1' } as any);

            const response = await request(app)
                .post('/safety/breathalyzer/evaluate')
                .send({ userId: 'u1', eventsInWindow: 10, windowMinutes: 60 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result.riskScore).toBe(75);
        });
    });

    describe('POST /safety/anti-tilt/evaluate', () => {
        it('should return 400 for missing userId', async () => {
            const response = await request(app).post('/safety/anti-tilt/evaluate').send({ message: 'hello' });
            expect(response.status).toBe(400);
        });

        it('should return 400 for missing message', async () => {
            const response = await request(app).post('/safety/anti-tilt/evaluate').send({ userId: 'u1' });
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
                .post('/safety/anti-tilt/evaluate')
                .send({ userId: 'u1', message: 'I lost it all' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result.severity).toBe('critical');
        });
    });

    describe('POST /safety/suslink/scan', () => {
        it('should return 400 for missing url', async () => {
            const response = await request(app).post('/safety/suslink/scan').send({});
            expect(response.status).toBe(400);
            expect(response.body.code).toBe('INVALID_URL');
        });

        it('should return 400 for invalid url protocol', async () => {
            const response = await request(app).post('/safety/suslink/scan').send({ url: 'ftp://example.com' });
            expect(response.status).toBe(400);
            expect(response.body.code).toBe('INVALID_PROTOCOL');
        });

        it('should return 400 for invalid url format', async () => {
            const response = await request(app).post('/safety/suslink/scan').send({ url: 'not-a-url' });
            expect(response.status).toBe(400);
            expect(response.body.code).toBe('INVALID_URL_FORMAT');
        });

        it('should evaluate url successfully', async () => {
            mockScan.mockResolvedValueOnce({
                url: 'https://example.com',
                riskLevel: 'low',
                reason: 'Clean',
                scannedAt: new Date().toISOString()
            });

            const response = await request(app)
                .post('/safety/suslink/scan')
                .send({ url: 'https://example.com' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result.riskLevel).toBe('low');
        });

        it('should handle internal errors gracefully', async () => {
            mockScan.mockRejectedValueOnce(new Error('Network error'));

            const response = await request(app)
                .post('/safety/suslink/scan')
                .send({ url: 'https://example.com' });

            expect(response.status).toBe(500);
            expect(response.body.code).toBe('SCAN_FAILED');
        });
    });
});
