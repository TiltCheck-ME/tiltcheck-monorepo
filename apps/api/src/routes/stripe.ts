/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Stripe Routes - /stripe/*
 * Handles subscriptions, checkout sessions, and webhooks.
 */

import { Router } from 'express';
import Stripe from 'stripe';
import { findOneBy, insert, update } from '@tiltcheck/db';

const router = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any,
}) : null;

interface Subscription {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end?: boolean;
}

/**
 * GET /stripe/config
 * Returns public Stripe configuration.
 */
router.get('/config', (_req, res) => {
  res.json({
    success: true,
    publicKey: STRIPE_PUBLIC_KEY || null,
  });
});

/**
 * GET /stripe/subscription-status
 * Get subscription status for a user.
 */
router.get('/subscription-status', async (req, res) => {
  const { userId, username } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ success: false, error: 'userId is required' });
    return;
  }

  // Founder check
  const founderUsernames = (process.env.FOUNDER_USERNAMES || 'jmenichole').split(',').map(u => u.trim().toLowerCase());
  if (username && typeof username === 'string' && founderUsernames.includes(username.toLowerCase())) {
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
    console.error('[Stripe API] Status error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /stripe/create-checkout-session
 * Create a Stripe Checkout session.
 */
router.post('/create-checkout-session', async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID) {
    res.status(503).json({ success: false, error: 'Stripe is not configured' });
    return;
  }

  const { userId, email, username } = req.body ?? {};
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId is required' });
    return;
  }

  try {
    const existingSub = await findOneBy<Subscription>('subscriptions', 'user_id', userId);
    const customerId = existingSub?.stripe_customer_id;

    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://tiltcheck.me';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/chrome-extension-subscription.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/chrome-extension-subscription.html?cancelled=true`,
      customer: customerId as string,
      customer_email: customerId ? undefined : email,
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId, username: username || '' },
      },
      metadata: { userId, username: username || '' },
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error('[Stripe API] Checkout error:', err);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

/**
 * Webhook handler (exported to be used in index.ts with raw body)
 */
export async function handleStripeWebhook(req: any, res: any) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    res.status(503).send('Stripe not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subId = session.subscription as string;

        if (userId && subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          const data = {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
          };

          const existing = await findOneBy<Subscription>('subscriptions', 'user_id', userId);
          if (existing) {
            await update('subscriptions', userId, data, 'user_id');
          } else {
            await insert('subscriptions', data);
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;
        
        const existing = await findOneBy<Subscription>('subscriptions', 'stripe_subscription_id', subId);
        if (existing) {
          await update('subscriptions', existing.user_id, {
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, 'user_id');
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err);
    res.status(500).send('Internal server error');
  }
}

export { router as stripeRouter };
