/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { vi } from 'vitest';

vi.hoisted(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_PUBLIC_KEY = 'pk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
    process.env.STRIPE_PRICE_ID = 'price_mock';
    process.env.FOUNDER_USERNAMES = 'founder1,founder2';
});

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { stripeRouter, handleStripeWebhook } from '../../src/routes/stripe.js';
import * as db from '@tiltcheck/db';

vi.mock('@tiltcheck/db', () => ({
    findOneBy: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
}));

const mockStripe = {
    webhooks: {
        constructEvent: vi.fn(),
    },
    checkout: {
        sessions: {
            create: vi.fn(),
        },
    },
    subscriptions: {
        retrieve: vi.fn(),
    }
};

vi.mock('stripe', () => {
    return {
        default: vi.fn().mockImplementation(() => mockStripe)
    };
});

const app = express();
app.use(express.json());
app.use('/stripe', stripeRouter);
// We mount webhook handler separately in the actual app, mocking here for testing
app.post('/webhook', (req, res) => handleStripeWebhook(req, res));

describe('Stripe Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /stripe/config', () => {
        it('should return the public key', async () => {
            const response = await request(app).get('/stripe/config');
            expect(response.status).toBe(200);
            expect(response.body.publicKey).toBe('pk_test_mock');
        });
    });

    describe('GET /stripe/subscription-status', () => {
        it('should require a userId', async () => {
            const response = await request(app).get('/stripe/subscription-status');
            expect(response.status).toBe(400);
        });

        it('should return founder status for founders', async () => {
            const response = await request(app).get('/stripe/subscription-status?userId=user1&username=founder1');
            expect(response.status).toBe(200);
            expect(response.body.subscription.status).toBe('founder');
        });

        it('should return DB subscription state for normal users', async () => {
            vi.mocked(db.findOneBy).mockResolvedValueOnce({ status: 'active' } as any);

            const response = await request(app).get('/stripe/subscription-status?userId=user1');
            expect(response.status).toBe(200);
            expect(response.body.subscription.status).toBe('active');
        });
    });

    describe('POST /stripe/create-checkout-session', () => {
        it('should fail if no userId provided', async () => {
            const response = await request(app).post('/stripe/create-checkout-session').send({});
            expect(response.status).toBe(400);
        });

        it('should create checkout session', async () => {
            vi.mocked(db.findOneBy).mockResolvedValueOnce(null as any);
            mockStripe.checkout.sessions.create.mockResolvedValueOnce({
                id: 'sess_123',
                url: 'https://checkout.stripe.com/pay/123'
            });

            const response = await request(app)
                .post('/stripe/create-checkout-session')
                .send({ userId: 'user-123' });

            expect(response.status).toBe(200);
            expect(response.body.sessionId).toBe('sess_123');
            expect(response.body.url).toBe('https://checkout.stripe.com/pay/123');
        });
    });

    describe('Webhook Handler', () => {
        it('should reject invalid signatures', async () => {
            mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
                throw new Error('Invalid signature');
            });

            const response = await request(app)
                .post('/webhook')
                .set('stripe-signature', 'bad-sig')
                .send({});

            expect(response.status).toBe(400);
        });

        it('should handle checkout.session.completed', async () => {
            const mockEvent = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        customer: 'cus_123',
                        subscription: 'sub_123',
                        metadata: { userId: 'user-123' }
                    }
                }
            };

            mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);
            mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
                status: 'active',
                current_period_start: 1000,
                current_period_end: 2000
            });
            vi.mocked(db.findOneBy).mockResolvedValueOnce(null as any); // Simulate insert

            const response = await request(app)
                .post('/webhook')
                .set('stripe-signature', 'valid-sig')
                .send({});

            expect(response.status).toBe(200);
            expect(db.insert).toHaveBeenCalled();
        });

        it('should handle customer.subscription.updated', async () => {
            const mockEvent = {
                type: 'customer.subscription.updated',
                data: {
                    object: {
                        id: 'sub_123',
                        status: 'canceled',
                        cancel_at_period_end: true,
                        current_period_start: 1000,
                        current_period_end: 2000
                    }
                }
            };

            mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);
            vi.mocked(db.findOneBy).mockResolvedValueOnce({ user_id: 'user-123' } as any); // Simulate found

            const response = await request(app)
                .post('/webhook')
                .set('stripe-signature', 'valid-sig')
                .send({});

            expect(response.status).toBe(200);
            expect(db.update).toHaveBeenCalled();
        });
    });
});
