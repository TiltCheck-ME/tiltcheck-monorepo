/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */

import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();
const PAYMENTS_UNAVAILABLE_MESSAGE =
  'Payments and premium upgrades are temporarily unavailable until live billing validation is implemented.';
const PAYMENTS_UNAVAILABLE_CODE = 'PAYMENTS_UNAVAILABLE';

function sendPaymentsUnavailable(res: Response) {
  return res.status(503).json({
    success: false,
    code: PAYMENTS_UNAVAILABLE_CODE,
    status: 'disabled',
    provider: null,
    paymentsEnabled: false,
    upgradesEnabled: false,
    message: PAYMENTS_UNAVAILABLE_MESSAGE,
    error: PAYMENTS_UNAVAILABLE_MESSAGE,
  });
}

/**
 * GET /payments/config
 * Returns the current gated payments status.
 */
router.get('/config', (_req, res) => {
  return sendPaymentsUnavailable(res);
});

/**
 * GET /payments/subscription-status
 * Payments are gated until live validation exists.
 */
router.get('/subscription-status', (_req, res) => {
  return sendPaymentsUnavailable(res);
});

/**
 * POST /payments/create-checkout-session
 * Checkout remains disabled until Stripe validation is implemented.
 */
router.post('/create-checkout-session', (_req, res) => {
  return sendPaymentsUnavailable(res);
});

/**
 * POST /payments/webhook
 * Webhooks are disabled until Stripe is live.
 */
router.post('/webhook', (_req, res) => {
  return sendPaymentsUnavailable(res);
});

// Export named alias for compatibility with the gated webhook contract.
export async function handleStripeWebhook(_req: Request, res: Response) {
  return sendPaymentsUnavailable(res);
}

export { router as stripeRouter };
