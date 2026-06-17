/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { tipRouter } from '../../src/routes/tip.js';
import { justthetip } from '@tiltcheck/justthetip';

let mockAuthUser: {
  userId: string;
  discordId: string;
  walletAddress: string;
} | null = null;

vi.mock('@tiltcheck/auth/middleware/express', () => ({
  sessionAuth: vi.fn((_jwtConfig?: unknown, options?: { required?: boolean }) => (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const required = options?.required !== false;
    if (!mockAuthUser) {
      if (required) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }
      next();
      return;
    }
    (req as Request & { auth?: typeof mockAuthUser }).auth = mockAuthUser;
    next();
  }),
}));

vi.mock('@tiltcheck/justthetip', () => ({
  FLAT_FEE_LAMPORTS: 0,
  justthetip: {
    verifyTipRequest: vi.fn(),
    createNewTip: vi.fn(),
    completeTipTransaction: vi.fn(),
    getTipDetails: vi.fn(),
  },
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
      vi.mocked(justthetip.verifyTipRequest).mockResolvedValueOnce({
        valid: false,
        error: 'Invalid wallet signature',
      });
      const response = await request(app)
        .post('/tip/verify')
        .send({ recipientDiscordId: 'd2', amount: 10, currency: 'USDC', signature: 'sig', message: 'msg', publicKey: 'wallet-1' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid wallet signature');
    });

    it('should return 400 if wallet address mismatches auth wallet', async () => {
      vi.mocked(justthetip.verifyTipRequest).mockResolvedValueOnce({
        valid: false,
        error: 'Wallet address mismatch',
      });
      const response = await request(app)
        .post('/tip/verify')
        .send({ recipientDiscordId: 'd2', amount: 10, currency: 'USDC', signature: 'sig', message: 'msg', publicKey: 'different-wallet' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Wallet address mismatch');
    });

    it('should return full verification details object on success', async () => {
      vi.mocked(justthetip.verifyTipRequest).mockResolvedValueOnce({
        valid: true,
        recipient: { walletAddress: 'wallet-2' },
      });
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
      vi.mocked(justthetip.createNewTip).mockResolvedValueOnce(null);
      const response = await request(app)
        .post('/tip/create')
        .send({ recipientDiscordId: 'discord-2', amount: 10, currency: 'USDC' });
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create tip');
    });

    it('should create tip and return info', async () => {
      const tipData = {
        id: 'evt-1',
        status: 'pending',
        amount: '10',
        currency: 'USDC',
        recipient_discord_id: 'd2',
        created_at: new Date().toISOString(),
      };
      vi.mocked(justthetip.createNewTip).mockResolvedValueOnce(tipData);

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
      const response = await request(app).post('/tip/t1/complete').send({ txSignature: 'sig1' });
      expect(response.status).toBe(401);
    });

    it('should return 404 if tip not found', async () => {
      vi.mocked(justthetip.completeTipTransaction).mockResolvedValueOnce({
        success: false,
        error: 'Tip not found',
      });
      const response = await request(app).post('/tip/t1/complete').send({ txSignature: 'sig1' });
      expect(response.status).toBe(404);
    });

    it('should return 403 if sender does not own the tip', async () => {
      vi.mocked(justthetip.completeTipTransaction).mockResolvedValueOnce({
        success: false,
        error: 'Forbidden',
      });
      const response = await request(app).post('/tip/t1/complete').send({ txSignature: 'sig1' });
      expect(response.status).toBe(403);
    });

    it('should complete tip', async () => {
      vi.mocked(justthetip.completeTipTransaction).mockResolvedValueOnce({
        success: true,
        tip: { id: 't1', status: 'completed' },
      });

      const response = await request(app).post('/tip/t1/complete').send({ txSignature: 'sig1' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tip.status).toBe('completed');
    });
  });

  describe('GET /tip/:id', () => {
    it('should return 404 if tip not found', async () => {
      vi.mocked(justthetip.getTipDetails).mockResolvedValueOnce(null);
      const response = await request(app).get('/tip/t1');
      expect(response.status).toBe(404);
    });

    it('should return limited info for non-participants', async () => {
      mockAuthUser = null;
      vi.mocked(justthetip.getTipDetails).mockResolvedValueOnce({
        id: 't1',
        status: 'completed',
        amount: '10',
        currency: 'USDC',
        created_at: new Date().toISOString(),
        sender_id: 'other-user',
        recipient_discord_id: 'discord-2',
      });

      const response = await request(app).get('/tip/t1');
      expect(response.status).toBe(200);
      expect(response.body.tip.status).toBe('completed');
      expect(response.body.tip).not.toHaveProperty('sender_id');
    });

    it('should return full info for sender/recipient', async () => {
      vi.mocked(justthetip.getTipDetails).mockResolvedValueOnce({
        id: 't1',
        sender_id: 'mock-user-1',
        status: 'completed',
        amount: '10',
        currency: 'USDC',
        message: 'test',
        recipient_discord_id: 'discord-2',
        created_at: new Date().toISOString(),
      });
      const response = await request(app).get('/tip/t1');
      expect(response.status).toBe(200);
      expect(response.body.tip.message).toBe('test');
    });
  });

  describe('POST /tip/send', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuthUser = null;
      const response = await request(app)
        .post('/tip/send')
        .send({ toUsername: 'peer', amountSol: 1, channelId: 'ch-1' });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /tip/claim', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuthUser = null;
      const response = await request(app)
        .post('/tip/claim')
        .send({ rainId: 'rain-1', channelId: 'ch-1' });
      expect(response.status).toBe(401);
    });
  });
});
