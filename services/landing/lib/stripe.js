/**
 * Stripe integration for TiltCheck subscriptions
 * 
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Stripe secret API key
 * - STRIPE_PUBLIC_KEY: Stripe publishable key (for frontend)
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret
 * - STRIPE_PRICE_ID: Price ID for the subscription product
 */

const fs = require('fs');
const path = require('path');

// Data directory for subscription storage
const DATA_DIR = path.join(__dirname, '../../../data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');

// Ensure data directory exists
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}

/**
 * Load subscriptions from disk
 */
function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('[Stripe] Error loading subscriptions:', error.message);
  }
  return {};
}

/**
 * Save subscriptions to disk
 */
function saveSubscriptions(subscriptions) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
  } catch (error) {
    console.error('[Stripe] Error saving subscriptions:', error.message);
  }
}

/**
 * Get subscription for a user
 */
function getSubscription(userId) {
  const subscriptions = loadSubscriptions();
  return subscriptions[userId] || null;
}

/**
 * Save/update subscription for a user
 */
function updateSubscription(userId, subscription) {
  const subscriptions = loadSubscriptions();
  subscriptions[userId] = {
    ...subscriptions[userId],
    ...subscription,
    updatedAt: new Date().toISOString()
  };
  saveSubscriptions(subscriptions);
  return subscriptions[userId];
}

/**
 * Get subscription by Stripe subscription ID
 */
function getSubscriptionByStripeId(stripeSubscriptionId) {
  const subscriptions = loadSubscriptions();
  for (const [userId, sub] of Object.entries(subscriptions)) {
    if (sub.stripeSubscriptionId === stripeSubscriptionId) {
      return { userId, subscription: sub };
    }
  }
  return null;
}

/**
 * Get subscription by Stripe customer ID
 */
function getSubscriptionByCustomerId(stripeCustomerId) {
  const subscriptions = loadSubscriptions();
  for (const [userId, sub] of Object.entries(subscriptions)) {
    if (sub.stripeCustomerId === stripeCustomerId) {
      return { userId, subscription: sub };
    }
  }
  return null;
}

/**
 * Create Stripe router with all endpoints
 */
function createStripeRouter(express) {
  const router = express.Router();

  // Check if Stripe is configured
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

  let stripe = null;
  if (STRIPE_SECRET_KEY) {
    try {
      stripe = require('stripe')(STRIPE_SECRET_KEY);
      console.log('[Stripe] Initialized successfully');
    } catch (error) {
      console.error('[Stripe] Failed to initialize:', error.message);
    }
  } else {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set - Stripe integration disabled');
  }

  /**
   * GET /api/stripe/config
   * Returns public Stripe configuration
   */
  router.get('/config', (_req, res) => {
    if (!STRIPE_PUBLIC_KEY) {
      return res.json({ ok: false, error: 'Stripe not configured' });
    }
    res.json({
      ok: true,
      publicKey: STRIPE_PUBLIC_KEY
    });
  });

  /**
   * GET /api/stripe/subscription-status
   * Get subscription status for a user
   */
  router.get('/subscription-status', (req, res) => {
    const userId = req.query.userId;
    const username = req.query.username;
    
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId is required' });
    }

    // Check if user is a founder (configurable via environment)
    const founderUsernames = (process.env.FOUNDER_USERNAMES || 'jmenichole').split(',').map(u => u.trim().toLowerCase());
    if (username && founderUsernames.includes(username.toLowerCase())) {
      return res.json({ 
        ok: true, 
        subscription: {
          status: 'founder',
          message: 'Lifetime premium access'
        }
      });
    }

    const subscription = getSubscription(userId);
    if (!subscription) {
      return res.json({ ok: true, subscription: null });
    }

    // Calculate days remaining if trial
    if (subscription.status === 'trial' && subscription.trialEnd) {
      const now = new Date();
      const end = new Date(subscription.trialEnd);
      const diffTime = end - now;
      subscription.daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      if (subscription.daysRemaining === 0) {
        subscription.status = 'expired';
        updateSubscription(userId, subscription);
      }
    }

    res.json({ ok: true, subscription });
  });

  /**
   * POST /api/stripe/create-checkout-session
   * Create a Stripe Checkout session for subscription
   */
  router.post('/create-checkout-session', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ ok: false, error: 'Stripe is not configured' });
    }

    if (!STRIPE_PRICE_ID) {
      return res.status(503).json({ ok: false, error: 'Subscription price not configured' });
    }

    const { userId, email, username } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId is required' });
    }

    try {
      // Check if user already has a customer ID
      let customerId = null;
      const existingSub = getSubscription(userId);
      if (existingSub && existingSub.stripeCustomerId) {
        customerId = existingSub.stripeCustomerId;
      }

      // Base URL for redirects
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

      const sessionParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PRICE_ID,
            quantity: 1
          }
        ],
        success_url: `${baseUrl}/chrome-extension-subscription.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/chrome-extension-subscription.html?cancelled=true`,
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            userId: userId,
            username: username || ''
          }
        },
        metadata: {
          userId: userId,
          username: username || ''
        }
      };

      // Add customer info if available
      if (customerId) {
        sessionParams.customer = customerId;
      } else if (email) {
        sessionParams.customer_email = email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      res.json({
        ok: true,
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('[Stripe] Checkout session error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/stripe/cancel-subscription
   * Cancel a user's subscription
   */
  router.post('/cancel-subscription', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ ok: false, error: 'Stripe is not configured' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId is required' });
    }

    try {
      const subscription = getSubscription(userId);
      if (!subscription || !subscription.stripeSubscriptionId) {
        return res.status(404).json({ ok: false, error: 'No active subscription found' });
      }

      // Cancel at period end (user keeps access until billing period ends)
      const cancelled = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      // Update local storage
      updateSubscription(userId, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelAtPeriodEnd: true
      });

      res.json({
        ok: true,
        message: 'Subscription will be cancelled at the end of the billing period',
        currentPeriodEnd: cancelled.current_period_end
          ? new Date(cancelled.current_period_end * 1000).toISOString()
          : null
      });
    } catch (error) {
      console.error('[Stripe] Cancel subscription error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/stripe/webhook
   * Handle Stripe webhooks for subscription updates
   * Note: Raw body parsing is configured in server.js for this route
   */
  router.post('/webhook', async (req, res) => {
    if (!stripe) {
      return res.status(503).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      if (STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } else {
        // For development without webhook secret verification
        // Only allow in non-production environments
        if (process.env.NODE_ENV === 'production') {
          console.error('[Stripe] Webhook secret not configured in production');
          return res.status(500).send('Webhook secret not configured');
        }
        event = JSON.parse(req.body.toString());
        console.warn('[Stripe] Webhook signature not verified (development mode)');
      }
    } catch (err) {
      console.error('[Stripe] Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('[Stripe] Webhook received:', event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = session.metadata?.userId;
          
          if (userId && session.subscription) {
            // Fetch the subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            
            updateSubscription(userId, {
              status: 'active',
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              currentPeriodStart: subscription.current_period_start
                ? new Date(subscription.current_period_start * 1000).toISOString()
                : null,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              activatedAt: new Date().toISOString()
            });
            console.log('[Stripe] Subscription activated for user:', userId);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const result = getSubscriptionByStripeId(subscription.id);
          
          if (result) {
            const { userId } = result;
            const update = {
              currentPeriodStart: subscription.current_period_start
                ? new Date(subscription.current_period_start * 1000).toISOString()
                : null,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null
            };

            if (subscription.cancel_at_period_end) {
              update.status = 'cancelled';
              update.cancelAtPeriodEnd = true;
            } else if (subscription.status === 'active') {
              update.status = 'active';
              update.cancelAtPeriodEnd = false;
            } else if (subscription.status === 'trialing') {
              update.status = 'trial';
              if (subscription.trial_end) {
                update.trialEnd = new Date(subscription.trial_end * 1000).toISOString();
              }
            }

            updateSubscription(userId, update);
            console.log('[Stripe] Subscription updated for user:', userId, update.status);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const result = getSubscriptionByStripeId(subscription.id);
          
          if (result) {
            const { userId } = result;
            updateSubscription(userId, {
              status: 'expired',
              expiredAt: new Date().toISOString()
            });
            console.log('[Stripe] Subscription expired for user:', userId);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const result = getSubscriptionByStripeId(invoice.subscription);
            if (result) {
              const { userId } = result;
              updateSubscription(userId, {
                status: 'active',
                lastPaymentAt: new Date().toISOString()
              });
              console.log('[Stripe] Payment succeeded for user:', userId);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const result = getSubscriptionByStripeId(invoice.subscription);
            if (result) {
              const { userId } = result;
              updateSubscription(userId, {
                status: 'past_due',
                lastPaymentFailedAt: new Date().toISOString()
              });
              console.log('[Stripe] Payment failed for user:', userId);
            }
          }
          break;
        }

        default:
          console.log('[Stripe] Unhandled event type:', event.type);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('[Stripe] Webhook handler error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = {
  createStripeRouter,
  getSubscription,
  updateSubscription,
  getSubscriptionByStripeId,
  getSubscriptionByCustomerId
};
