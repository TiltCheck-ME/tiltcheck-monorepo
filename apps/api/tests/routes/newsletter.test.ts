/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { vi } from 'vitest';

vi.hoisted(() => {
    process.env.NEWSLETTER_SALT = 'test-salt-123';
});

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'node:crypto';
import { newsletterRouter } from '../../src/routes/newsletter.js';
import * as db from '@tiltcheck/db';

vi.mock('@tiltcheck/db', () => ({
    findOneBy: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/newsletter', newsletterRouter);

describe('Newsletter Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const getHash = (email: string) =>
        crypto.createHash('sha256').update('test-salt-123:' + email).digest('hex');

    describe('POST /newsletter/subscribe', () => {
        it('should return 400 if honeypot (website) is provided', async () => {
            const response = await request(app).post('/newsletter/subscribe').send({
                email: 'test@example.com',
                website: 'http://spam.com',
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Bot detected');
        });

        it('should return 400 for invalid emails', async () => {
            const invalidEmails = ['invalid', 'test@', '@test.com', 'test@domain'];
            for (const email of invalidEmails) {
                const response = await request(app).post('/newsletter/subscribe').send({ email });
                expect(response.status).toBe(400);
                expect(response.body.error).toBe('Invalid email address');
            }
        });

        it('should subscribe a new email successfully', async () => {
            vi.mocked(db.findOneBy).mockResolvedValueOnce(null as any);

            const response = await request(app).post('/newsletter/subscribe').send({
                email: '  New@Example.com  ',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Subscribed successfully');

            const expectedHash = getHash('new@example.com');
            expect(db.findOneBy).toHaveBeenCalledWith('newsletter_subscribers', 'email_hash', expectedHash);
            expect(db.insert).toHaveBeenCalledWith('newsletter_subscribers', {
                email_hash: expectedHash,
                subscribed_at: expect.any(Date),
            });
        });

        it('should return duplicate true if already subscribed', async () => {
            vi.mocked(db.findOneBy).mockResolvedValueOnce({
                email_hash: getHash('test@example.com'),
                unsubscribed_at: null,
            } as any);

            const response = await request(app).post('/newsletter/subscribe').send({
                email: 'test@example.com',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.duplicate).toBe(true);
            expect(response.body.message).toBe('Already subscribed');
            expect(db.insert).not.toHaveBeenCalled();
        });

        it('should re-subscribe an unsubscribed email', async () => {
            const hash = getHash('resubscribe@example.com');
            vi.mocked(db.findOneBy).mockResolvedValueOnce({
                email_hash: hash,
                unsubscribed_at: new Date('2023-01-01'),
            } as any);

            const response = await request(app).post('/newsletter/subscribe').send({
                email: 'resubscribe@example.com',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Re-subscribed successfully');

            expect(db.update).toHaveBeenCalledWith('newsletter_subscribers', hash, { unsubscribed_at: null }, 'email_hash');
            expect(db.insert).not.toHaveBeenCalled();
        });
    });

    describe('POST /newsletter/unsubscribe', () => {
        it('should return 400 if email is missing', async () => {
            const response = await request(app).post('/newsletter/unsubscribe').send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email is required');
        });

        it('should return 404 if email is not subscribed', async () => {
            vi.mocked(db.findOneBy).mockResolvedValueOnce(null as any);
            const response = await request(app).post('/newsletter/unsubscribe').send({
                email: 'unknown@example.com',
            });
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Subscription not found');
        });

        it('should unsubscribe an email successfully', async () => {
            const hash = getHash('unsubscribe@example.com');
            vi.mocked(db.findOneBy).mockResolvedValueOnce({
                email_hash: hash,
                unsubscribed_at: null,
            } as any);

            const response = await request(app).post('/newsletter/unsubscribe').send({
                email: 'unsubscribe@example.com',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Unsubscribed successfully');

            expect(db.update).toHaveBeenCalledWith('newsletter_subscribers', hash, { unsubscribed_at: expect.any(Date) }, 'email_hash');
        });
    });
});
