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
        it('should return 501 not implemented', async () => {
            const response = await request(app).post('/services/forward/auth-service').send();
            expect(response.status).toBe(501);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('FORWARD_NOT_IMPLEMENTED');
            expect(response.body.message).toBe('Service forwarding is not implemented for beta');
            expect(response.body.caller).toBe('mock-service');
            expect(response.body.target).toBe('auth-service');
        });
    });
});
