/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { servicesRouter } from '../../src/routes/services.js';
import * as authMiddleware from '@tiltcheck/auth/middleware/express';

// Mock serviceAuth middleware
vi.mock('@tiltcheck/auth/middleware/express', () => ({
    serviceAuth: vi.fn(() => (req: Request, res: Response, next: NextFunction) => {
        // Inject mock service data
        (req as any).service = { id: 'mock-service', context: 'test' };
        next();
    }),
}));

const app = express();
app.use(express.json());
app.use('/services', servicesRouter);

describe('Services Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
        process.env.SERVICE_FORWARD_TARGETS = JSON.stringify({
            'auth-service': 'https://auth.internal.tiltcheck.me'
        });
    });

    describe('POST /services/internal', () => {
        it('should return internal service response', async () => {
            const response = await request(app).post('/services/internal').send();
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Internal service request received');
            expect(response.body.callerService).toBe('mock-service');
            expect(response.body.context).toBe('test');
        });
    });

    describe('GET /services/health', () => {
        it('should return health status', async () => {
            const response = await request(app).get('/services/health');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body.service).toBe('api-gateway');
            expect(response.body.timestamp).toBeDefined();
        });
    });

    describe('POST /services/forward/:service', () => {
        it('should forward request to allowlisted target service', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ ok: true, from: 'auth-service' })
            });
            vi.stubGlobal('fetch', fetchMock);

            const response = await request(app)
                .post('/services/forward/auth-service')
                .send({ ping: true });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.forwarded).toBe(true);
            expect(response.body.caller).toBe('mock-service');
            expect(response.body.target).toBe('auth-service');
            expect(response.body.response).toEqual({ ok: true, from: 'auth-service' });
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0]?.[0]).toBe('https://auth.internal.tiltcheck.me/');
        });

        it('should preserve query string when forwarding', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ ok: true })
            });
            vi.stubGlobal('fetch', fetchMock);

            const response = await request(app)
                .post('/services/forward/auth-service?mode=sync&attempt=1')
                .send({ ping: true });

            expect(response.status).toBe(200);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0]?.[0]).toBe('https://auth.internal.tiltcheck.me/?mode=sync&attempt=1');
        });

        it('should reject non-allowlisted target service', async () => {
            const response = await request(app).post('/services/forward/unknown-service').send();
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('FORWARD_TARGET_NOT_ALLOWED');
            expect(response.body.caller).toBe('mock-service');
            expect(response.body.target).toBe('unknown-service');
        });
    });
});
