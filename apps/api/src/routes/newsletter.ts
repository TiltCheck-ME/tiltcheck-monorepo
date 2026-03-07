/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Newsletter Routes - /newsletter/*
 * Handles subscriptions and unsubscriptions with hashed emails for privacy.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { query, insert, update, findOneBy } from '@tiltcheck/db';

const router = Router();

// Salt for email hashing (should be in env)
const NEWSLETTER_SALT = process.env.NEWSLETTER_SALT || 'tiltcheck-default-salt';

/**
 * POST /newsletter/subscribe
 * Subscribe an email to the newsletter.
 */
router.post('/subscribe', async (req, res) => {
  const { email, website } = req.body ?? {};

  // Honeypot check
  if (website) {
    res.status(400).json({ success: false, error: 'Bot detected' });
    return;
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    res.status(400).json({ success: false, error: 'Invalid email address' });
    return;
  }

  try {
    const emailHash = crypto
      .createHash('sha256')
      .update(NEWSLETTER_SALT + ':' + cleanEmail)
      .digest('hex');

    const existing = await findOneBy('newsletter_subscribers', 'email_hash', emailHash);

    if (existing) {
      if (existing.unsubscribed_at) {
        // Re-subscribe
        await update('newsletter_subscribers', emailHash, { unsubscribed_at: null }, 'email_hash');
        res.json({ success: true, message: 'Re-subscribed successfully' });
      } else {
        res.json({ success: true, message: 'Already subscribed', duplicate: true });
      }
      return;
    }

    await insert('newsletter_subscribers', {
      email_hash: emailHash,
      subscribed_at: new Date(),
    });

    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('[Newsletter API] Subscribe error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /newsletter/unsubscribe
 * Unsubscribe an email from the newsletter.
 */
router.post('/unsubscribe', async (req, res) => {
  const { email } = req.body ?? {};

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }

  try {
    const emailHash = crypto
      .createHash('sha256')
      .update(NEWSLETTER_SALT + ':' + cleanEmail)
      .digest('hex');

    const existing = await findOneBy('newsletter_subscribers', 'email_hash', emailHash);

    if (!existing || existing.unsubscribed_at) {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }

    await update('newsletter_subscribers', emailHash, { unsubscribed_at: new Date() }, 'email_hash');

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('[Newsletter API] Unsubscribe error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export { router as newsletterRouter };
