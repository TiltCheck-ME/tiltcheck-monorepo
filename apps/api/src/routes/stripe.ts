/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * Payment Routes - /payments/*
 * Uses Stripe when configured; returns explicit unavailable responses otherwise.
 */

import { Router } from 'express';
import { findOneBy } from '@tiltcheck/db';
import Stripe from 'stripe';

const router = Router();


interface Subscription {
  user_id: string;
  status: string;
  plan: string;
  current_period_end: Date;
}

/**
 * GET /payments/config
 * Returns public payment configuration (placeholder).
 */
router.get('/config', (_req, res) => {
  const stripePublicKey = process.env.STRIPE_PUBLIC_KEY || null;
  const provider = stripePublicKey ? 'stripe' : 'placeholder';
  res.json({
    success: true,
    ok: true,
    provider,
    publicKey: stripePublicKey,
    message: stripePublicKey
      ? 'Stripe is configured.'
      : 'Payment processing is not yet configured.',
  });
});

/**
 * GET /payments/subscription-status
 * Get subscription status for a user.
 */
router.get('/subscription-status', async (req, res) => {
  const { userId, username } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ success: false, ok: false, error: 'userId is required' });
    return;
  }

  const FOUNDER_USERNAMES = (process.env.FOUNDER_USERNAMES || 'jmenichole')
    .split(',')
    .map((u) => u.trim().toLowerCase());

  // Founder check — lifetime access
  if (
    username &&
    typeof username === 'string' &&
    FOUNDER_USERNAMES.includes(username.toLowerCase())
  ) {
    res.json({
      success: true,
      ok: true,
      subscription: {
        status: 'founder',
        message: 'Lifetime premium access',
      },
    });
    return;
  }

  try {
    const subscription = await findOneBy<Subscription>('subscriptions', 'user_id', userId);
    res.json({ success: true, ok: true, subscription });
  } catch (err) {
    console.error('[Payments API] Status error:', err);
    res.status(500).json({ success: false, ok: false, error: 'Internal server error' });
  }
});

/**
 * POST /payments/create-checkout-session
 * Create a Stripe checkout session when Stripe env vars are configured.
 */
router.post('/create-checkout-session', async (req, res) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID;
  const appBaseUrl = process.env.WEB_BASE_URL || 'https://tiltcheck.me';
  const { userId, email, username } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({
      success: false,
      ok: false,
      code: 'USER_ID_REQUIRED',
      error: 'userId is required',
    });
    return;
  }

  if (!stripeSecretKey || !stripePriceId) {
    res.status(503).json({
      success: false,
      ok: false,
      code: 'PAYMENTS_NOT_CONFIGURED',
      error: 'Payment processing is not yet configured.',
      message: 'Contact the team to arrange access.',
    });
    return;
  }

  try {
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appBaseUrl}/chrome-extension-subscription.html?success=true`,
      cancel_url: `${appBaseUrl}/chrome-extension-subscription.html?cancelled=true`,
      client_reference_id: userId,
      customer_email: typeof email === 'string' ? email : undefined,
      metadata: {
        userId,
        username: typeof username === 'string' ? username : '',
      },
    });

    res.json({
      success: true,
      ok: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error('[Payments API] Checkout session error:', err);
    res.status(500).json({
      success: false,
      ok: false,
      code: 'CHECKOUT_SESSION_FAILED',
      error: 'Failed to create checkout session',
    });
  }
});

/**
 * POST /payments/webhook
 * Placeholder webhook — always returns 200 so external callers don't retry.
 */
router.post('/webhook', (_req, res) => {
  console.log('[Payments Webhook] Received (placeholder — no-op)');
  res.json({ received: true });
});

// Export named alias for compatibility and the webhook handler as a no-op
export async function handleStripeWebhook(_req: any, res: any) {
  res.json({ received: true });
}

export { router as stripeRouter };
