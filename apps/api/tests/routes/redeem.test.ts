/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@tiltcheck/db', () => ({
  findPartnerByAppId: vi.fn(),
  incrementPartnerDailyQuotaUsage: vi.fn(),
}));

vi.mock('../../src/lib/live-feed-data.js', () => ({
  loadDomainBlacklist: vi.fn(async () => ({
    availability: 'available',
    domains: ['known-scam-casino.com', 'stake-free-claim.com'],
    source: 'domain_blacklist.json',
  })),
}));

vi.mock('@tiltcheck/event-router', () => ({
  eventRouter: {
    publish: vi.fn(async () => ({ id: 'evt-1' })),
  },
}));

vi.mock('@tiltcheck/trust-engines', () => ({
  INSTANT_REDEEM_PAYOUT_DELTA: 5,
  trustEngines: {
    getCasinoBreakdown: vi.fn(),
  },
}));

import { findPartnerByAppId, incrementPartnerDailyQuotaUsage } from '@tiltcheck/db';
import { eventRouter } from '@tiltcheck/event-router';
import { trustEngines } from '@tiltcheck/trust-engines';
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
    process.env.INSTANT_REDEEM_REGISTRY_PATH = `/tmp/tiltcheck-instant-redeem-registry-${process.pid}.json`;
    __resetRedeemSandboxStateForTests();
    vi.clearAllMocks();
    vi.mocked(findPartnerByAppId).mockResolvedValue(makePartner() as any);
    vi.mocked(incrementPartnerDailyQuotaUsage).mockImplementation(async () =>
      makePartner({
        daily_quota_used: 1,
        quota_window_started_at: new Date('2026-07-28T00:00:00.000Z'),
      }) as any,
    );
    vi.mocked(trustEngines.getCasinoBreakdown).mockReturnValue({
      score: 75,
      financialPayouts: 75,
      fairnessTransparency: 75,
      promotionalHonesty: 75,
      operationalSupport: 75,
      communityReputation: 75,
      history: [],
      lastUpdated: Date.now(),
    } as any);
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
    expect(response.body.casinoTrustBoost.enabled).toBe(false);
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

  it('enables Instant Redeem and publishes casino trust boost', async () => {
    const baseline = {
      score: 75,
      financialPayouts: 75,
      fairnessTransparency: 75,
      promotionalHonesty: 75,
      operationalSupport: 75,
      communityReputation: 75,
      history: [],
      lastUpdated: Date.now(),
    };
    const boosted = {
      ...baseline,
      score: 77,
      financialPayouts: 80,
    };
    // First call: scam gate. Second: before boost. Rest: after boost.
    vi.mocked(trustEngines.getCasinoBreakdown)
      .mockReturnValueOnce(baseline as any)
      .mockReturnValueOnce(baseline as any)
      .mockReturnValue(boosted as any);

    const response = await request(app)
      .post('/v1/redeem/enable')
      .set(AUTH)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.casinoName).toBe('acme.example');
    expect(response.body.trustBoost.delta).toBe(5);
    expect(response.body.trustBoost.pillar).toBe('financialPayouts');
    expect(response.body.trustBoost.applied).toBe(true);
    expect(vi.mocked(eventRouter.publish)).toHaveBeenCalledWith(
      'trust.casino.feature.enabled',
      'rgaas-api',
      expect.objectContaining({
        casinoName: 'acme.example',
        feature: 'instant_redeem',
      }),
    );

    const capabilities = await request(app).get('/v1/redeem/capabilities');
    expect(capabilities.status).toBe(200);
    expect(capabilities.body.count).toBe(1);
    expect(capabilities.body.capabilities[0].domain).toBe('acme.example');
    expect(capabilities.body.capabilities[0].instantRedeemAvailable).toBe(true);

    const quote = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_abc',
        amount: 40,
        currency: 'USD',
        destination: { rail: 'ach', accountRef: 'acct_****1234' },
      });

    expect(quote.body.casinoTrustBoost.enabled).toBe(true);
    expect(quote.body.casinoTrustBoost.delta).toBe(5);
  });

  it('lets a processor partner enable many casino domains in one shot', async () => {
    vi.mocked(trustEngines.getCasinoBreakdown).mockReturnValue({
      score: 77,
      financialPayouts: 80,
      fairnessTransparency: 75,
      promotionalHonesty: 75,
      operationalSupport: 75,
      communityReputation: 75,
      history: [],
      lastUpdated: Date.now(),
    } as any);

    const response = await request(app)
      .post('/v1/redeem/enable')
      .set(AUTH)
      .send({
        partnerType: 'processor',
        coveredDomains: ['alpha.casino', 'https://beta.casino/cashier'],
      });

    expect(response.status).toBe(200);
    expect(response.body.partnerType).toBe('processor');
    expect(response.body.domains).toEqual(expect.arrayContaining(['acme.example', 'alpha.casino', 'beta.casino']));
    expect(response.body.domains).toHaveLength(3);

    const alpha = await request(app).get('/v1/redeem/capabilities/alpha.casino');
    expect(alpha.body.instantRedeemAvailable).toBe(true);
    expect(alpha.body.capability.partnerType).toBe('processor');
  });

  it('refuses Instant Redeem enable and quote for scam casinos', async () => {
    const enable = await request(app)
      .post('/v1/redeem/enable')
      .set(AUTH)
      .send({
        partnerType: 'processor',
        coveredDomains: ['known-scam-casino.com', 'scam-payouts.example'],
      });

    // partner casino_domain acme.example is still clear — partial or only clear domains
    // If only scam domains were requested without acme, all blocked. Include only scams:
    const enableScamOnly = await request(app)
      .post('/v1/redeem/enable')
      .set(AUTH)
      .send({
        partnerType: 'processor',
        casinoName: 'known-scam-casino.com',
        coveredDomains: ['scam-payouts.example'],
      });

    expect(enableScamOnly.status).toBe(403);
    expect(enableScamOnly.body.code).toBe('REDEEM_SCAM_CASINO_BLOCKED');

    // Mixed book: clear + scam — only clear domains enabled
    expect(enable.status).toBe(200);
    expect(enable.body.domains).toContain('acme.example');
    expect(enable.body.domains).not.toContain('known-scam-casino.com');
    expect(enable.body.rejectedDomains.length).toBeGreaterThan(0);

    const quote = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_abc',
        amount: 100,
        currency: 'USD',
        casinoDomain: 'known-scam-casino.com',
        destination: { rail: 'ach', accountRef: 'acct_****1234' },
      });

    expect(quote.status).toBe(403);
    expect(quote.body.code).toBe('REDEEM_SCAM_CASINO_BLOCKED');
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

  it('arms a post-redeem rebuy cooloff and blocks deposits on the same rail', async () => {
    const quote = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_heater',
        amount: 200,
        currency: 'USD',
        destination: { rail: 'ach', accountRef: 'acct_****2222' },
      });

    const execute = await request(app)
      .post('/v1/redeem/execute')
      .set(AUTH)
      .send({
        quoteId: quote.body.quoteId,
        playerRef: 'player_heater',
        idempotencyKey: 'idem_rebuy_001',
        rebuyCooldownMinutes: 60,
      });

    expect(execute.status).toBe(201);
    expect(execute.body.status).toBe('settled');
    expect(execute.body.rebuyLock).toBeTruthy();
    expect(execute.body.rebuyLock.reason).toBe('post_instant_redeem');
    expect(execute.body.rebuyLock.remainingMs).toBeGreaterThan(0);

    const check = await request(app)
      .post('/v1/redeem/deposit-check')
      .set(AUTH)
      .send({ playerRef: 'player_heater', amount: 50, currency: 'USD' });

    expect(check.status).toBe(200);
    expect(check.body.allowed).toBe(false);
    expect(check.body.code).toBe('REBUY_COOLDOWN');

    const deposit = await request(app)
      .post('/v1/redeem/deposit')
      .set(AUTH)
      .send({ playerRef: 'player_heater', amount: 50, currency: 'USD' });

    expect(deposit.status).toBe(423);
    expect(deposit.body.code).toBe('REBUY_COOLDOWN');
  });

  it('allows deposits when no post-redeem cooloff is active', async () => {
    const deposit = await request(app)
      .post('/v1/redeem/deposit')
      .set(AUTH)
      .send({ playerRef: 'player_fresh', amount: 25, currency: 'USD' });

    expect(deposit.status).toBe(201);
    expect(deposit.body.code).toBe('DEPOSIT_ACCEPTED');
    expect(deposit.body.depositId).toMatch(/^dp_/);
  });

  it('does not arm a rebuy cooloff when Instant Redeem is RG-blocked', async () => {
    const quote = await request(app)
      .post('/v1/redeem/quote')
      .set(AUTH)
      .send({
        playerRef: 'player_tilt_hot',
        amount: 80,
        currency: 'USD',
        destination: { rail: 'card', accountRef: 'card_****9999' },
      });

    await request(app)
      .post('/v1/redeem/execute')
      .set(AUTH)
      .send({
        quoteId: quote.body.quoteId,
        playerRef: 'player_tilt_hot',
        idempotencyKey: 'idem_block_rebuy_001',
      });

    const check = await request(app)
      .post('/v1/redeem/deposit-check')
      .set(AUTH)
      .send({ playerRef: 'player_tilt_hot', amount: 10 });

    expect(check.body.allowed).toBe(true);
    expect(check.body.code).toBe('DEPOSIT_ALLOWED');
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
