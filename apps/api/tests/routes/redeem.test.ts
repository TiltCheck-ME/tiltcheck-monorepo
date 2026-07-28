/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@tiltcheck/db', () => ({
  findPartnerByAppId: vi.fn(),
  incrementPartnerDailyQuotaUsage: vi.fn(),
}));

import { findPartnerByAppId, incrementPartnerDailyQuotaUsage } from '@tiltcheck/db';
import { redeemRouter, __resetRedeemSandboxStateForTests } from '../../src/routes/redeem.js';

const app = express();
app.use(express.json());
app.use('/v1/redeem', redeemRouter);

function makePartner(overrides: Record<string, unknown> = {}) {
  return {
    id: 'partner-1',
    name: 'Acme Casino',
    website_url: 'https://acme.example',
    contact_email: 'operator@example.com',
    casino_domain: 'acme.example',
    intended_use_case: 'Instant Redeem cashier integration.',
    app_id: 'sandbox_acme_deadbeef',
    secret_key: 'sk_sandbox_secret',
    mode: 'sandbox',
    registered_via: 'sandbox_self_serve',
    email_verified_at: new Date('2026-07-28T00:00:00.000Z'),
    verification_token_jti: null,
    verification_token_expires_at: null,
    verification_token_consumed_at: null,
    daily_quota_limit: 1000,
    daily_quota_used: 0,
    quota_window_started_at: null,
    last_production_access_requested_at: null,
    is_active: true,
    created_at: new Date('2026-07-28T00:00:00.000Z'),
    updated_at: new Date('2026-07-28T00:00:00.000Z'),
    ...overrides,
  };
}

const AUTH = {
  'X-TiltCheck-App-Id': 'sandbox_acme_deadbeef',
  'X-TiltCheck-Secret-Key': 'sk_sandbox_secret',
  'X-Requested-With': 'TiltCheckPartner',
};

describe('Instant Redeem sandbox routes', () => {
  beforeEach(() => {
    __resetRedeemSandboxStateForTests();
    vi.clearAllMocks();
    vi.mocked(findPartnerByAppId).mockResolvedValue(makePartner() as any);
    vi.mocked(incrementPartnerDailyQuotaUsage).mockImplementation(async () =>
      makePartner({
        daily_quota_used: 1,
        quota_window_started_at: new Date('2026-07-28T00:00:00.000Z'),
      }) as any,
    );
  });

  it('quotes an Instant Redeem with fee and RG gate metadata', async () => {
    const response = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_abc',
        amount: 100,
        currency: 'USD',
        destination: { rail: 'ach', accountRef: 'acct_****1234' },
        jurisdiction: 'CA',
      });

    expect(response.status).toBe(200);
    expect(response.headers['x-mode']).toBe('sandbox');
    expect(response.body.quoteId).toMatch(/^qr_/);
    expect(response.body.feeBps).toBe(150);
    expect(response.body.feeAmount).toBe(1.5);
    expect(response.body.amountNet).toBe(98.5);
    expect(response.body.rg.allowed).toBe(true);
    expect(response.body.note).toContain('soon™');
  });

  it('rejects invalid quote payloads', async () => {
    const response = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'x',
        amount: -5,
        destination: { rail: 'fax', accountRef: 'nope' },
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('REDEEM_QUOTE_INVALID');
  });

  it('executes a quote to settled and returns the same result on idempotent replay', async () => {
    const quote = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_abc',
        amount: 50,
        currency: 'USD',
        destination: { rail: 'interac', accountRef: 'email@example.com' },
      });

    const execute = await request(app)
      .post('/v1/redeem/execute')
      .set(AUTH)
      .send({
        quoteId: quote.body.quoteId,
        playerRef: 'player_abc',
        idempotencyKey: 'idem_batch_001',
      });

    expect(execute.status).toBe(201);
    expect(execute.body.status).toBe('settled');
    expect(execute.body.redeemId).toMatch(/^rd_/);
    expect(execute.body.feeAmount).toBe(0.75);
    expect(execute.body.amountNet).toBe(49.25);

    const replay = await request(app)
      .post('/v1/redeem/execute')
      .set(AUTH)
      .send({
        quoteId: quote.body.quoteId,
        playerRef: 'player_abc',
        idempotencyKey: 'idem_batch_001',
      });

    expect(replay.status).toBe(200);
    expect(replay.body.idempotentReplay).toBe(true);
    expect(replay.body.redeemId).toBe(execute.body.redeemId);

    const status = await request(app)
      .get(`/v1/redeem/${execute.body.redeemId}`)
      .set(AUTH);

    expect(status.status).toBe(200);
    expect(status.body.status).toBe('settled');
  });

  it('blocks Instant Redeem when RG gates fire on tilt markers', async () => {
    const quote = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_tilt_hot',
        amount: 80,
        currency: 'USD',
        destination: { rail: 'card', accountRef: 'card_****9999' },
      });

    expect(quote.body.rg.allowed).toBe(false);
    expect(quote.body.rg.gates).toContain('TILT_VELOCITY');

    const execute = await request(app)
      .post('/v1/redeem/execute')
      .set(AUTH)
      .send({
        quoteId: quote.body.quoteId,
        playerRef: 'player_tilt_hot',
        idempotencyKey: 'idem_block_001',
      });

    expect(execute.status).toBe(200);
    expect(execute.body.success).toBe(false);
    expect(execute.body.status).toBe('blocked');
  });

  it('marks high-amount executes as pending review', async () => {
    const quote = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_whale',
        amount: 7500,
        currency: 'USD',
        destination: { rail: 'ach', accountRef: 'acct_****7777' },
      });

    expect(quote.body.rg.gates).toContain('HIGH_AMOUNT_REVIEW');

    const execute = await request(app)
      .post('/v1/redeem/execute')
      .set(AUTH)
      .send({
        quoteId: quote.body.quoteId,
        playerRef: 'player_whale',
        idempotencyKey: 'idem_whale_001',
      });

    expect(execute.status).toBe(201);
    expect(execute.body.status).toBe('pending');
  });

  it('rejects production-mode partners for Instant Redeem', async () => {
    vi.mocked(findPartnerByAppId).mockResolvedValueOnce(
      makePartner({ mode: 'production', app_id: 'prod_acme', secret_key: 'sk_prod_secret' }) as any,
    );

    const response = await request(app)
      .post('/v1/redeem/quote')
      .set({
        'X-TiltCheck-App-Id': 'prod_acme',
        'X-TiltCheck-Secret-Key': 'sk_prod_secret',
        'X-Requested-With': 'TiltCheckPartner',
      })
      .send({
        playerRef: 'player_abc',
        amount: 25,
        currency: 'USD',
        destination: { rail: 'wallet', accountRef: 'wallet_ref_1' },
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('REDEEM_SANDBOX_ONLY');
  });
});
