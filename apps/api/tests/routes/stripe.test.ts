/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * Tests for placeholder payment routes (/payments/*)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Set env before route module loads
process.env.FOUNDER_USERNAMES = 'founder1,founder2';

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

describe('Payment Routes (Placeholder)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /payments/config', () => {
        it('should indicate payment processing is not yet configured', async () => {
            const response = await request(app).get('/payments/config');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.publicKey).toBeNull();
            expect(response.body.provider).toBe('placeholder');
        });
    });

    describe('GET /payments/subscription-status', () => {
        it('should return 400 when userId is missing', async () => {
            const response = await request(app).get('/payments/subscription-status');
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return founder status for a recognised founder username', async () => {
            const response = await request(app)
                .get('/payments/subscription-status?userId=user1&username=founder1');
            expect(response.status).toBe(200);
            expect(response.body.subscription.status).toBe('founder');
        });

        it('should be case-insensitive for founder check', async () => {
            const response = await request(app)
                .get('/payments/subscription-status?userId=user1&username=FOUNDER2');
            expect(response.status).toBe(200);
            expect(response.body.subscription.status).toBe('founder');
        });

        it('should fetch subscription from DB for non-founders', async () => {
            vi.mocked(db.findOneBy).mockResolvedValueOnce({ status: 'active', plan: 'pro' } as any);
            const response = await request(app)
                .get('/payments/subscription-status?userId=user-123');
            expect(response.status).toBe(200);
            expect(response.body.subscription.status).toBe('active');
        });

        it('should return null subscription when user has no subscription', async () => {
            vi.mocked(db.findOneBy).mockResolvedValueOnce(null as any);
            const response = await request(app)
                .get('/payments/subscription-status?userId=unknown-user');
            expect(response.status).toBe(200);
            expect(response.body.subscription).toBeNull();
        });
    });

    describe('POST /payments/create-checkout-session', () => {
        it('should return 501 not implemented', async () => {
            const response = await request(app)
                .post('/payments/create-checkout-session')
                .send({ userId: 'user-123' });
            expect(response.status).toBe(501);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /webhook (no-op placeholder)', () => {
        it('should always return received: true', async () => {
            const response = await request(app).post('/webhook').send({ type: 'any.event' });
            expect(response.status).toBe(200);
            expect(response.body.received).toBe(true);
        });
    });
});
