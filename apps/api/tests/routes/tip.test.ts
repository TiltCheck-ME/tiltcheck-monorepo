/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { tipRouter } from '../../src/routes/tip.js';
import * as db from '@tiltcheck/db';
import * as auth from '@tiltcheck/auth';

// Mock auth middleware
let mockAuthUser: any = null;
vi.mock('@tiltcheck/auth/middleware/express', () => ({
    sessionAuth: vi.fn(() => (req: Request, res: Response, next: NextFunction) => {
        (req as any).auth = mockAuthUser;
        next();
    }),
}));

vi.mock('@tiltcheck/auth', () => ({
    verifySolanaSignature: vi.fn(),
    verifySessionCookie: vi.fn(),
}));

vi.mock('@tiltcheck/db', () => ({
    createTip: vi.fn(),
    findTipById: vi.fn(),
    updateTipStatus: vi.fn(),
    findUserByDiscordId: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/tip', tipRouter);

describe('Tip Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthUser = {
            userId: 'mock-user-1',
            discordId: 'discord-1',
            walletAddress: 'wallet-1',
        };
    });

    describe('POST /tip/verify', () => {
        it('should return 401 if not authenticated', async () => {
            mockAuthUser = null;
            const response = await request(app).post('/tip/verify').send({ recipientDiscordId: 'd2', amount: 10, currency: 'USDC' });
            expect(response.status).toBe(401);
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app).post('/tip/verify').send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing required fields');
        });

        it('should return 400 if wallet signature is invalid', async () => {
            vi.mocked(auth.verifySolanaSignature).mockResolvedValueOnce({ valid: false, error: 'Bad sig' });
            const response = await request(app)
                .post('/tip/verify')
                .send({ recipientDiscordId: 'd2', amount: 10, currency: 'USDC', signature: 'sig', message: 'msg', publicKey: 'wallet-1' });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid wallet signature');
        });

        it('should return 400 if wallet address mismatches auth wallet', async () => {
            vi.mocked(auth.verifySolanaSignature).mockResolvedValueOnce({ valid: true });
            const response = await request(app)
                .post('/tip/verify')
                .send({ recipientDiscordId: 'd2', amount: 10, currency: 'USDC', signature: 'sig', message: 'msg', publicKey: 'different-wallet' });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Wallet address mismatch');
        });

        it('should return full verification details object on success', async () => {
            vi.mocked(db.findUserByDiscordId).mockResolvedValueOnce({ id: 'user-2', discord_id: 'discord-2', wallet_address: 'wallet-2' } as any);
            const response = await request(app)
                .post('/tip/verify')
                .send({ recipientDiscordId: 'discord-2', amount: 10, currency: 'USDC' });

            expect(response.status).toBe(200);
            expect(response.body.valid).toBe(true);
            expect(response.body.recipient.walletAddress).toBe('wallet-2');
        });
    });

    describe('POST /tip/create', () => {
        it('should return 401 if not authenticated', async () => {
            mockAuthUser = null;
            const response = await request(app).post('/tip/create').send({ recipientDiscordId: 'd2', amount: 10, currency: 'USDC' });
            expect(response.status).toBe(401);
        });

        it('should return 400 if fields are missing', async () => {
            const response = await request(app).post('/tip/create').send({});
            expect(response.status).toBe(400);
        });

        it('should return 500 if tip creation fails', async () => {
            vi.mocked(db.createTip).mockResolvedValueOnce(null as any);
            const response = await request(app)
                .post('/tip/create')
                .send({ recipientDiscordId: 'discord-2', amount: 10, currency: 'USDC' });
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to create tip');
        });

        it('should create tip and return info', async () => {
            const tipData = { id: 'evt-1', status: 'pending', amount: '10', currency: 'USDC', recipient_discord_id: 'd2', created_at: new Date().toISOString() };
            vi.mocked(db.createTip).mockResolvedValueOnce(tipData as any);

            const response = await request(app)
                .post('/tip/create')
                .send({ recipientDiscordId: 'discord-2', amount: 10, currency: 'USDC' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.tip.id).toBe('evt-1');
        });
    });

    describe('POST /tip/:id/complete', () => {
        it('should return 401 if not authenticated', async () => {
            mockAuthUser = null;
            const response = await request(app).post('/tip/t1/complete').send({});
            expect(response.status).toBe(401);
        });

        it('should return 404 if tip not found', async () => {
            vi.mocked(db.findTipById).mockResolvedValueOnce(null as any);
            const response = await request(app).post('/tip/t1/complete').send({});
            expect(response.status).toBe(404);
        });

        it('should return 403 if sender does not own the tip', async () => {
            vi.mocked(db.findTipById).mockResolvedValueOnce({ sender_id: 'other-user' } as any);
            const response = await request(app).post('/tip/t1/complete').send({});
            expect(response.status).toBe(403);
        });

        it('should complete tip', async () => {
            vi.mocked(db.findTipById).mockResolvedValueOnce({ sender_id: 'mock-user-1' } as any);
            vi.mocked(db.updateTipStatus).mockResolvedValueOnce({ id: 't1', status: 'completed' } as any);

            const response = await request(app).post('/tip/t1/complete').send({ txSignature: 'sig1' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.tip.status).toBe('completed');
        });
    });

    describe('GET /tip/:id', () => {
        it('should return 404 if tip not found', async () => {
            vi.mocked(db.findTipById).mockResolvedValueOnce(null as any);
            const response = await request(app).get('/tip/t1');
            expect(response.status).toBe(404);
        });

        it('should return limited info for non-participants', async () => {
            mockAuthUser = null; // Unauthenticated
            vi.mocked(db.findTipById).mockResolvedValueOnce({
                id: 't1', status: 'completed', amount: '10', currency: 'USDC', created_at: new Date().toISOString()
            } as any);
            const response = await request(app).get('/tip/t1');
            expect(response.status).toBe(200);
            expect(response.body.tip.status).toBe('completed');
            expect(response.body.tip).not.toHaveProperty('sender_id');
        });

        it('should return full info for sender/recipient', async () => {
            // we mock auth user is sender
            vi.mocked(db.findTipById).mockResolvedValueOnce({
                id: 't1', sender_id: 'mock-user-1', status: 'completed', amount: '10', currency: 'USDC', message: 'test'
            } as any);
            const response = await request(app).get('/tip/t1');
            expect(response.status).toBe(200);
            expect(response.body.tip.message).toBe('test'); // Private data is included
        });
    });
});
