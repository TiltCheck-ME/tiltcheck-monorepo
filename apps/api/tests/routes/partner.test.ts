/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@tiltcheck/auth', () => ({
  createToken: vi.fn(async () => 'sandbox-verification-token'),
  verifyToken: vi.fn(),
}));

vi.mock('@tiltcheck/db', () => ({
  consumePartnerVerificationToken: vi.fn(),
  createPartner: vi.fn(),
  createWebhook: vi.fn(),
  findLatestPartnerByContactEmail: vi.fn(),
  findPartnerByAppId: vi.fn(),
  findPartnerById: vi.fn(),
  findUserById: vi.fn(),
  incrementPartnerDailyQuotaUsage: vi.fn(),
  listPartnersByContactEmail: vi.fn(),
  markPartnerProductionAccessRequested: vi.fn(),
  updatePartner: vi.fn(),
}));

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  getJWTConfig: vi.fn(() => ({
    secret: 'test-secret',
    issuer: 'test',
    audience: 'test',
    expiresIn: '7d',
  })),
  verifySessionCookie: vi.fn(),
}));

import { createToken, verifyToken } from '@tiltcheck/auth';
import {
  consumePartnerVerificationToken,
  createPartner,
  findPartnerByAppId,
  findPartnerById,
  findUserById,
  incrementPartnerDailyQuotaUsage,
  listPartnersByContactEmail,
  markPartnerProductionAccessRequested,
} from '@tiltcheck/db';
import { verifySessionCookie } from '../../src/middleware/auth.js';
import { partnerRouter } from '../../src/routes/partner.js';

const app = express();
app.use(express.json());
app.use('/partner', partnerRouter);

function makePartner(overrides: Record<string, unknown> = {}) {
  return {
    id: 'partner-1',
    name: 'Acme Casino',
    website_url: 'https://acme.example',
    contact_email: 'operator@example.com',
    casino_domain: 'acme.example',
    intended_use_case: 'Test trust scoring in cashier flows.',
    app_id: 'sandbox_acme_deadbeef',
    secret_key: 'sk_sandbox_secret',
    mode: 'sandbox',
    registered_via: 'sandbox_self_serve',
    email_verified_at: new Date('2026-05-03T00:00:00.000Z'),
    verification_token_jti: 'verify-jti',
    verification_token_expires_at: new Date('2026-05-04T00:00:00.000Z'),
    verification_token_consumed_at: null,
    daily_quota_limit: 1000,
    daily_quota_used: 0,
    quota_window_started_at: null,
    last_production_access_requested_at: null,
    is_active: true,
    created_at: new Date('2026-05-03T00:00:00.000Z'),
    updated_at: new Date('2026-05-03T00:00:00.000Z'),
    ...overrides,
  };
}

describe('Partner sandbox routes', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.SITE_URL = 'https://tiltcheck.test';
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    vi.clearAllMocks();
  });

  it('creates a pending sandbox registration and sends verification flow', async () => {
    vi.mocked(createPartner).mockResolvedValueOnce(makePartner({
      email_verified_at: null,
      is_active: false,
    }) as any);

    const response = await request(app)
      .post('/partner/register-sandbox')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        email: 'operator@example.com',
        companyName: 'Acme Casino',
        casinoDomain: 'acme.example',
        intendedUseCase: 'We want trust scores and intervention hooks in staging cashiers.',
        recaptchaToken: 'dev-recaptcha-pass',
      });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('pending_verification');
    expect(vi.mocked(createToken)).toHaveBeenCalled();
    expect(vi.mocked(createPartner)).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_email: 'operator@example.com',
        mode: 'sandbox',
        is_active: false,
      }),
    );
  });

  it('consumes verification token once and returns the sandbox secret', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      valid: true,
      payload: {
        sub: 'operator@example.com',
        type: 'service',
        roles: ['partner_sandbox'],
        iat: 1,
        exp: 2,
        iss: 'test',
        aud: 'partner-sandbox',
        jti: 'verify-jti',
        email: 'operator@example.com',
      },
    } as any);
    vi.mocked(consumePartnerVerificationToken).mockResolvedValueOnce(makePartner() as any);

    const response = await request(app)
      .post('/partner/verify-sandbox')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ token: 'sandbox-verification-token' });

    expect(response.status).toBe(200);
    expect(response.body.partner.secretKey).toBe('sk_sandbox_secret');
    expect(vi.mocked(consumePartnerVerificationToken)).toHaveBeenCalledWith('verify-jti');
  });

  it('rejects replayed or expired verification tokens', async () => {
    vi.mocked(verifyToken).mockResolvedValueOnce({
      valid: true,
      payload: {
        sub: 'operator@example.com',
        type: 'service',
        roles: ['partner_sandbox'],
        iat: 1,
        exp: 2,
        iss: 'test',
        aud: 'partner-sandbox',
        jti: 'verify-jti',
        email: 'operator@example.com',
      },
    } as any);
    vi.mocked(consumePartnerVerificationToken).mockResolvedValueOnce(null as any);

    const response = await request(app)
      .post('/partner/verify-sandbox')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ token: 'sandbox-verification-token' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('VERIFICATION_ALREADY_CONSUMED');
  });

  it('returns sandbox keys for authenticated operator email', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce({
      valid: true,
      session: { userId: 'user-1', type: 'user', roles: ['user'], createdAt: 1 },
    } as any);
    vi.mocked(findUserById).mockResolvedValueOnce({
      id: 'user-1',
      email: 'operator@example.com',
      roles: ['user'],
    } as any);
    vi.mocked(listPartnersByContactEmail).mockResolvedValueOnce([makePartner()] as any);

    const response = await request(app)
      .get('/partner/operators/keys')
      .set('Cookie', ['tc_session=mock']);

    expect(response.status).toBe(200);
    expect(response.body.operatorEmail).toBe('operator@example.com');
    expect(response.body.partners[0].secretKey).toBe('sk_sandbox_secret');
  });

  it('records a production access request for the owning operator', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce({
      valid: true,
      session: { userId: 'user-1', type: 'user', roles: ['user'], createdAt: 1 },
    } as any);
    vi.mocked(findUserById).mockResolvedValueOnce({
      id: 'user-1',
      email: 'operator@example.com',
      roles: ['user'],
    } as any);
    vi.mocked(findPartnerById).mockResolvedValueOnce(makePartner() as any);
    vi.mocked(markPartnerProductionAccessRequested).mockResolvedValueOnce(
      makePartner({ last_production_access_requested_at: new Date('2026-05-03T01:00:00.000Z') }) as any,
    );

    const response = await request(app)
      .post('/partner/operators/request-production')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Cookie', ['tc_session=mock'])
      .send({ partnerId: 'partner-1' });

    expect(response.status).toBe(200);
    expect(response.body.partner.lastProductionAccessRequestedAt).toBeTruthy();
  });

  it('returns mocked sandbox response with quota tracking', async () => {
    vi.mocked(findPartnerByAppId).mockResolvedValueOnce(makePartner() as any);
    vi.mocked(incrementPartnerDailyQuotaUsage).mockResolvedValueOnce(
      makePartner({
        daily_quota_used: 1,
        quota_window_started_at: new Date('2026-05-03T00:00:00.000Z'),
      }) as any,
    );

    const response = await request(app)
      .get('/partner/sandbox/mock')
      .set('X-TiltCheck-App-Id', 'sandbox_acme_deadbeef')
      .set('X-TiltCheck-Secret-Key', 'sk_sandbox_secret');

    expect(response.status).toBe(200);
    expect(response.headers['x-mode']).toBe('sandbox');
    expect(response.body.mock.note).toContain('No trust-rollup writes happened');
    expect(response.body.quota.used).toBe(1);
  });
});
