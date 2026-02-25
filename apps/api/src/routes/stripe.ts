/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * Payment Routes - /payments/*
 * PLACEHOLDER: Stripe integration removed. Payment processing is stubbed.
 * Replace with your preferred payment provider when ready.
 */

import { Router } from 'express';
import { findOneBy } from '@tiltcheck/db';

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
  res.json({
    success: true,
    provider: 'placeholder',
    publicKey: null,
    message: 'Payment processing is not yet configured.',
  });
});

/**
 * GET /payments/subscription-status
 * Get subscription status for a user.
 */
router.get('/subscription-status', async (req, res) => {
  const { userId, username } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ success: false, error: 'userId is required' });
    return;
  }

  // Founder check — lifetime access
  if (
    username &&
    typeof username === 'string' &&
    FOUNDER_USERNAMES.includes(username.toLowerCase())
  ) {
    res.json({
      success: true,
      subscription: {
        status: 'founder',
        message: 'Lifetime premium access',
      },
    });
    return;
  }

  try {
    const subscription = await findOneBy<Subscription>('subscriptions', 'user_id', userId);
    res.json({ success: true, subscription });
  } catch (err) {
    console.error('[Payments API] Status error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /payments/create-checkout-session
 * Placeholder — returns a not-implemented response.
 */
router.post('/create-checkout-session', (_req, res) => {
  res.status(501).json({
    success: false,
    error: 'Payment processing is not yet implemented.',
    message: 'Contact the team to arrange access.',
  });
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
