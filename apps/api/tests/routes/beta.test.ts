/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { betaRouter } from '../../src/routes/beta.js';
import * as db from '@tiltcheck/db';

vi.mock('@tiltcheck/db', () => ({
  findOneBy: vi.fn(),
  insert: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/beta', betaRouter);

describe('Beta Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /beta/signup', () => {
    it('returns 400 for honeypot submissions', async () => {
      const response = await request(app).post('/beta/signup').send({
        email: 'test@example.com',
        website: 'https://spam.example',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bot detected');
    });

    it('returns 400 for invalid email', async () => {
      const response = await request(app).post('/beta/signup').send({
        email: 'not-an-email',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email address');
    });

    it('returns duplicate success if email already exists', async () => {
      vi.mocked(db.findOneBy).mockResolvedValueOnce({ email: 'test@example.com' } as never);

      const response = await request(app).post('/beta/signup').send({
        email: 'test@example.com',
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
        email: '  NEW@Example.com  ',
        discord_username: '  demo#1234 ',
        interests: ['extension', 'tilt-detection', '', 42],
        experience_level: 'experienced',
        feedback_preference: 'discord',
        referral_source: 'campaign-abc',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Signed up successfully');
      expect(db.findOneBy).toHaveBeenCalledWith('beta_signups', 'email', 'new@example.com');
      expect(db.insert).toHaveBeenCalledWith(
        'beta_signups',
        expect.objectContaining({
          email: 'new@example.com',
          discord_username: 'demo#1234',
          interests: ['extension', 'tilt-detection'],
          experience_level: 'experienced',
          feedback_preference: 'discord',
          referral_source: 'campaign-abc',
          created_at: expect.any(Date),
        }),
      );
    });

    it('treats DB unique constraint as duplicate success', async () => {
      vi.mocked(db.findOneBy).mockResolvedValueOnce(null as never);
      vi.mocked(db.insert).mockRejectedValueOnce({ code: '23505' } as never);

      const response = await request(app).post('/beta/signup').send({
        email: 'new@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.duplicate).toBe(true);
    });
  });
});
