/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { tipRouter } from '../../src/routes/tip.js';
import * as db from '@tiltcheck/db';

// Mock dependencies
vi.mock('@tiltcheck/db', () => ({
    createTip: vi.fn(),
    findTipById: vi.fn(),
    updateTipStatus: vi.fn(),
    findUserByDiscordId: vi.fn(),
}));

vi.mock('@tiltcheck/auth', async () => ({
    verifySolanaSignature: vi.fn().mockResolvedValue({ valid: true }),
    verifySessionCookie: vi.fn(),
}));

// We'll mock the express middleware directly for testing auth behavior
vi.mock('@tiltcheck/auth/middleware/express', () => ({
    sessionAuth: vi.fn().mockImplementation((_opts, routeOpts) => {
        return (req: any, res: any, next: any) => {
            // Simulate auth state based on headers for testing
            if (req.headers.authorization === 'Bearer valid-token') {
                req.auth = {
                    userId: 'user-123',
                    discordId: 'discord-123',
                    walletAddress: '0x123',
                };
            } else if (routeOpts?.required === false) {
                req.auth = null;
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            next();
        };
    })
}));

const app = express();
app.use(express.json());
app.use('/tip', tipRouter);

describe('Tip Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /tip/create', () => {
        it('should reject unauthenticated requests', async () => {
            const response = await request(app)
                .post('/tip/create')
                .send({});

            expect(response.status).toBe(401);
        });

        it('should reject requests missing required fields', async () => {
            const response = await request(app)
                .post('/tip/create')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    amount: 100 // Missing recipientDiscordId and currency
                });

            expect(response.status).toBe(400);
        });

        it('should create a tip for valid requests', async () => {
            const mockTip = {
                id: 'tip-123',
                status: 'pending',
                amount: '100',
                currency: 'SOL',
                recipient_discord_id: 'discord-456',
                created_at: new Date()
            };

            vi.mocked(db.createTip).mockResolvedValueOnce(mockTip as any);

            const response = await request(app)
                .post('/tip/create')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    recipientDiscordId: 'discord-456',
                    amount: 100,
                    currency: 'SOL'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.tip.id).toBe('tip-123');
        });
    });

    describe('GET /tip/:id', () => {
        it('should return limited info for unauthenticated users', async () => {
            const mockTip = {
                id: 'tip-123',
                sender_id: 'other-user',
                recipient_discord_id: 'other-discord',
                amount: '100',
                currency: 'SOL',
                status: 'completed',
                created_at: new Date()
            };

            vi.mocked(db.findTipById).mockResolvedValueOnce(mockTip as any);

            const response = await request(app)
                .get('/tip/tip-123');

            expect(response.status).toBe(200);
            // Should not include sender_id or recipient_discord_id
            expect(response.body.tip.sender_id).toBeUndefined();
            expect(response.body.tip.id).toBe('tip-123');
        });

        it('should return full info for participants', async () => {
            const mockTip = {
                id: 'tip-123',
                sender_id: 'user-123', // Matches auth mock
                recipient_discord_id: 'target-discord',
                amount: '100',
                currency: 'SOL',
                status: 'completed',
                created_at: new Date()
            };

            vi.mocked(db.findTipById).mockResolvedValueOnce(mockTip as any);

            const response = await request(app)
                .get('/tip/tip-123')
                .set('Authorization', 'Bearer valid-token');

            expect(response.status).toBe(200);
            expect(response.body.tip.sender_id).toBe('user-123');
        });
    });
});
