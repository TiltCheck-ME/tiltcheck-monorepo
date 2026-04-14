/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { betaRouter } from '../../src/routes/beta.js';
import * as db from '@tiltcheck/db';
import { verifySessionCookie, verifyToken } from '@tiltcheck/auth';

vi.mock('@tiltcheck/db', () => ({
  findBetaSignupById: vi.fn(),
  findLatestBetaSignupByEmail: vi.fn(),
  findLatestBetaSignupByUserId: vi.fn(),
  findLatestBetaSignupByDiscordId: vi.fn(),
  createBetaSignup: vi.fn(),
  listBetaSignupsByStatus: vi.fn(),
  updateBetaSignup: vi.fn(),
}));

vi.mock('@tiltcheck/auth', () => ({
  verifySessionCookie: vi.fn(),
  verifyToken: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/beta', betaRouter);

describe('Beta Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })) as unknown as typeof fetch);
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    vi.stubEnv('DISCORD_BOT_INTERNAL_URL', 'http://bot.internal');
    vi.mocked(verifySessionCookie).mockResolvedValue({
      valid: true,
      session: {
        userId: 'user-123',
        discordId: '1234567890',
        discordUsername: 'demo-user',
      },
    } as never);
    vi.mocked(verifyToken).mockResolvedValue({ valid: false } as never);
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

    it('accepts a site application with email and no linked Discord', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);
      vi.mocked(db.findLatestBetaSignupByEmail).mockResolvedValueOnce(null as never);
      vi.mocked(db.createBetaSignup).mockResolvedValueOnce({ id: 'site-1' } as never);

      const response = await request(app).post('/beta/signup').send({
        applicationPath: 'site',
        email: 'tester@example.com',
        casinos: 'Stake, Roobet',
        aspects: ['delta', 'extension'],
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.delivery.reviewQueue).toBe('sent');
      expect(db.findLatestBetaSignupByEmail).toHaveBeenCalledWith('tester@example.com');
      expect(db.createBetaSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          email: 'tester@example.com',
          application_path: 'site',
          contact_method: 'email',
          discord_id: null,
          discord_username: null,
          notification_email: 'tester@example.com',
          notification_discord_id: null,
          interests: ['Stake', 'Roobet'],
          feedback_preference: 'delta, extension',
        }),
      );
      expect(fetch).toHaveBeenCalledWith(
        'http://bot.internal/internal/beta-signups',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-internal-secret',
          }),
          body: JSON.stringify({
            signupId: 'site-1',
            eventType: 'submitted',
            previousStatus: undefined,
          }),
        }),
      );
    });

    it('requires email for site applications', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);

      const response = await request(app).post('/beta/signup').send({
        applicationPath: 'site',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email is required for non-Discord beta access');
    });

    it('anchors site applications to a bearer-authenticated user when present', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);
      vi.mocked(verifyToken).mockResolvedValueOnce({
        valid: true,
        payload: {
          sub: 'user-789',
        },
      } as never);
      vi.mocked(db.findLatestBetaSignupByEmail).mockResolvedValueOnce(null as never);
      vi.mocked(db.createBetaSignup).mockResolvedValueOnce({ id: 'site-2' } as never);

      const response = await request(app)
        .post('/beta/signup')
        .set('Authorization', 'Bearer test-token')
        .send({
          applicationPath: 'site',
          email: 'linked@example.com',
        });

      expect(response.status).toBe(200);
      expect(db.createBetaSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-789',
          email: 'linked@example.com',
          application_path: 'site',
        }),
      );
    });

    it('returns duplicate success if Discord identity already exists', async () => {
      vi.mocked(db.findLatestBetaSignupByEmail).mockResolvedValueOnce({ email: '1234567890@discord.tiltcheck.placeholder' } as never);

      const response = await request(app).post('/beta/signup').send({
        casinos: 'Stake, Roobet',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.duplicate).toBe(true);
      expect(db.createBetaSignup).not.toHaveBeenCalled();
    });

    it('creates signup with normalized payload', async () => {
      vi.mocked(db.findLatestBetaSignupByEmail).mockResolvedValueOnce(null as never);
      vi.mocked(db.createBetaSignup).mockResolvedValueOnce({ id: '1' } as never);

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
      expect(response.body.delivery.reviewQueue).toBe('sent');
      expect(db.findLatestBetaSignupByEmail).toHaveBeenCalledWith('1234567890@discord.tiltcheck.placeholder');
      expect(db.createBetaSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          email: '1234567890@discord.tiltcheck.placeholder',
          application_path: 'discord',
          contact_method: 'discord',
          status: 'pending',
          discord_id: '1234567890',
          discord_username: 'demo-user',
          notification_discord_id: '1234567890',
          interests: ['Stake', 'Roobet', 'Pulsz'],
          experience_level: 'breaker',
          feedback_preference: 'delta, bot',
          referral_source: 'Setup: chrome\nTrust requirement: The data has to match what I see in session.',
          beta_access_web: false,
          beta_access_dashboard: false,
          beta_access_extension: false,
        }),
      );
    });

    it('treats DB unique constraint as duplicate success', async () => {
      vi.mocked(db.findLatestBetaSignupByEmail).mockResolvedValueOnce(null as never);
      vi.mocked(db.createBetaSignup).mockRejectedValueOnce({ code: '23505' } as never);

      const response = await request(app).post('/beta/signup').send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.duplicate).toBe(true);
    });
  });

  describe('GET /beta/inbox', () => {
    it('returns inbox details for an authenticated site user', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);
      vi.mocked(verifyToken).mockResolvedValueOnce({
        valid: true,
        payload: {
          sub: 'user-321',
          email: 'approved@example.com',
          roles: ['user'],
        },
      } as never);
      vi.mocked(db.findLatestBetaSignupByUserId).mockResolvedValueOnce({
        id: 'beta-1',
        status: 'approved',
        application_path: 'site',
        contact_method: 'email',
        approved_at: new Date(),
        rejected_at: null,
        reviewer_notes: 'You are clear. Hit the dashboard and extension.',
        beta_access_web: true,
        beta_access_dashboard: true,
        beta_access_extension: true,
        beta_access_discord: false,
        beta_access_community: false,
      } as never);

      const response = await request(app)
        .get('/beta/inbox')
        .set('Authorization', 'Bearer inbox-token');

      expect(response.status).toBe(200);
      expect(response.body.application.status).toBe('approved');
      expect(response.body.messages[0].title).toBe('Beta access approved');
    });

    it('returns 401 when there is no auth context', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);

      const response = await request(app).get('/beta/inbox');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /beta/:id/review', () => {
    it('approves a site signup and reports email delivery', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);
      vi.mocked(verifyToken).mockResolvedValueOnce({
        valid: true,
        payload: {
          sub: 'admin-1',
          roles: ['admin'],
          email: 'admin@example.com',
        },
      } as never);
      vi.mocked(db.findBetaSignupById).mockResolvedValueOnce({
        id: 'beta-2',
        status: 'pending',
        application_path: 'site',
        contact_method: 'email',
        notification_email: 'tester@example.com',
        discord_id: null,
      } as never);
      vi.mocked(db.updateBetaSignup).mockResolvedValueOnce({
        id: 'beta-2',
        status: 'approved',
        application_path: 'site',
        contact_method: 'email',
        notification_email: 'tester@example.com',
        reviewer_notes: 'Approved for site beta.',
        beta_access_web: true,
        beta_access_dashboard: true,
        beta_access_extension: true,
        beta_access_discord: false,
        beta_access_community: false,
      } as never);
      vi.stubEnv('BETA_EMAIL_WEBHOOK_URL', 'https://example.test/email');

      const response = await request(app)
        .post('/beta/beta-2/review')
        .set('Authorization', 'Bearer admin-token')
        .send({
          status: 'approved',
          reviewerNotes: 'Approved for site beta.',
        });

      expect(response.status).toBe(200);
      expect(db.updateBetaSignup).toHaveBeenCalledWith(
        'beta-2',
        expect.objectContaining({
          status: 'approved',
          beta_access_web: true,
          beta_access_dashboard: true,
          beta_access_extension: true,
        }),
      );
      expect(response.body.delivery.email).toBe('sent');
      expect(response.body.delivery.reviewQueue).toBe('sent');
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'http://bot.internal/internal/beta-signups',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-internal-secret',
          }),
          body: JSON.stringify({
            signupId: 'beta-2',
            eventType: 'reviewed',
            previousStatus: 'pending',
          }),
        }),
      );
    });

    it('allows an internal service review without admin JWT', async () => {
      vi.mocked(verifySessionCookie).mockResolvedValueOnce({ valid: false } as never);
      vi.mocked(verifyToken).mockResolvedValueOnce({ valid: false } as never);
      vi.mocked(db.findBetaSignupById).mockResolvedValueOnce({
        id: 'beta-3',
        status: 'pending',
        application_path: 'discord',
        contact_method: 'discord',
        notification_email: null,
        discord_id: '1234567890',
      } as never);
      vi.mocked(db.updateBetaSignup).mockResolvedValueOnce({
        id: 'beta-3',
        status: 'approved',
        application_path: 'discord',
        contact_method: 'discord',
        notification_email: null,
        discord_id: '1234567890',
        beta_access_web: true,
        beta_access_dashboard: true,
        beta_access_extension: true,
        beta_access_discord: true,
        beta_access_community: true,
      } as never);

      const response = await request(app)
        .post('/beta/beta-3/review')
        .set('Authorization', 'Bearer test-internal-secret')
        .send({
          status: 'approved',
          reviewerNotes: 'Approved from bot review queue.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.delivery.reviewQueue).toBe('sent');
    });
  });
});
