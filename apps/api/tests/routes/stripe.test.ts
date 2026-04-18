/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

import { stripeRouter, handleStripeWebhook } from '../../src/routes/stripe.js';
import * as db from '@tiltcheck/db';

vi.mock('@tiltcheck/db', () => ({
    findOneBy: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/payments', stripeRouter);
app.post('/webhook', (req, res) => handleStripeWebhook(req, res));

describe('Payment Routes (Gated)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /payments/config', () => {
        it('should return a disabled payments contract', async () => {
            const response = await request(app).get('/payments/config');
            expect(response.status).toBe(503);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('PAYMENTS_UNAVAILABLE');
            expect(response.body.paymentsEnabled).toBe(false);
            expect(response.body.upgradesEnabled).toBe(false);
        });
    });

    describe('GET /payments/subscription-status', () => {
        it('should return a disabled payments contract even when queried directly', async () => {
            const response = await request(app).get('/payments/subscription-status');
            expect(response.status).toBe(503);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('PAYMENTS_UNAVAILABLE');
            expect(vi.mocked(db.findOneBy)).not.toHaveBeenCalled();
        });
    });

    describe('POST /payments/create-checkout-session', () => {
        it('should return 503 while checkout is gated', async () => {
            const response = await request(app)
                .post('/payments/create-checkout-session')
                .send({ userId: 'user-123' });
            expect(response.status).toBe(503);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('PAYMENTS_UNAVAILABLE');
        });
    });

    describe('POST /webhook', () => {
        it('should return the disabled payments contract', async () => {
            const response = await request(app).post('/webhook').send({ type: 'any.event' });
            expect(response.status).toBe(503);
            expect(response.body.code).toBe('PAYMENTS_UNAVAILABLE');
        });
    });

    describe('handleStripeWebhook', () => {
        it('should return the disabled payments contract', async () => {
            const response = await request(app).post('/webhook').send({ type: 'stripe.event' });
            expect(response.status).toBe(503);
            expect(response.body.code).toBe('PAYMENTS_UNAVAILABLE');
        });
    });
});
