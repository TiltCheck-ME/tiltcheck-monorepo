/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { betaRouter } from '../../src/routes/beta.js';
import * as db from '@tiltcheck/db';
import { verifySessionCookie } from '@tiltcheck/auth';

vi.mock('@tiltcheck/db', () => ({
  findOneBy: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@tiltcheck/auth', () => ({
  verifySessionCookie: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/beta', betaRouter);

describe('Beta Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifySessionCookie).mockResolvedValue({
      valid: true,
      session: {
        discordId: '1234567890',
        discordUsername: 'demo-user',
      },
    } as never);
  });

  describe('POST /beta/signup', () => {
    it('returns 400 for honeypot submissions', async () => {
      const response = await request(app).post('/beta/signup').send({
        website: 'https://spam.example',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bot detected');
    });

    it('returns 401 when Discord is not linked', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);

      const response = await request(app).post('/beta/signup').send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Link Discord before applying');
    });

    it('returns duplicate success if Discord identity already exists', async () => {
      vi.mocked(db.findOneBy).mockResolvedValueOnce({ email: '1234567890@discord.tiltcheck.placeholder' } as never);

      const response = await request(app).post('/beta/signup').send({
        casinos: 'Stake, Roobet',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.duplicate).toBe(true);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('creates signup with normalized payload', async () => {
      vi.mocked(db.findOneBy).mockResolvedValueOnce(null as never);
      vi.mocked(db.insert).mockResolvedValueOnce({ id: '1' } as never);

      const response = await request(app).post('/beta/signup').send({
        casinos: 'Stake, Roobet,  Pulsz ',
        style: 'breaker',
        aspects: ['delta', 'bot'],
        setup: 'chrome',
        proof: 'The data has to match what I see in session.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Signed up successfully');
      expect(db.findOneBy).toHaveBeenCalledWith('beta_signups', 'email', '1234567890@discord.tiltcheck.placeholder');
      expect(db.insert).toHaveBeenCalledWith(
        'beta_signups',
        expect.objectContaining({
          email: '1234567890@discord.tiltcheck.placeholder',
          discord_username: 'demo-user',
          interests: ['Stake', 'Roobet', 'Pulsz'],
          experience_level: 'breaker',
          feedback_preference: 'delta, bot',
          referral_source: 'Setup: chrome\nTrust requirement: The data has to match what I see in session.',
          created_at: expect.any(Date),
        }),
      );
    });

    it('treats DB unique constraint as duplicate success', async () => {
      vi.mocked(db.findOneBy).mockResolvedValueOnce(null as never);
      vi.mocked(db.insert).mockRejectedValueOnce({ code: '23505' } as never);

      const response = await request(app).post('/beta/signup').send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.duplicate).toBe(true);
    });
  });
});
