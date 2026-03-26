/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Beta Routes - /beta/*
 * Handles beta program signups from tiltcheck.me/beta.html
 */

import { Router } from 'express';
import { findOneBy, insert } from '@tiltcheck/db';

const router = Router();

type BetaSignupRow = {
  email: string;
  discord_username: string | null;
  interests: string[] | null;
  experience_level: string | null;
  feedback_preference: string | null;
  referral_source: string | null;
  created_at?: Date;
};

function parseInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0)
    .slice(0, 12);
}

/**
 * POST /beta/signup
 * Public beta signup endpoint (duplicate-safe by email).
 */
router.post('/signup', async (req, res) => {
  const { email, discord_username, interests, experience_level, feedback_preference, referral_source, website } =
    req.body ?? {};

  // Honeypot check
  if (website) {
    res.status(400).json({ success: false, error: 'Bot detected' });
    return;
  }

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    res.status(400).json({ success: false, error: 'Invalid email address' });
    return;
  }

  const row: BetaSignupRow = {
    email: cleanEmail,
    discord_username: typeof discord_username === 'string' && discord_username.trim()
      ? discord_username.trim()
      : null,
    interests: parseInterests(interests),
    experience_level: typeof experience_level === 'string' && experience_level.trim()
      ? experience_level.trim()
      : null,
    feedback_preference: typeof feedback_preference === 'string' && feedback_preference.trim()
      ? feedback_preference.trim()
      : null,
    referral_source: typeof referral_source === 'string' && referral_source.trim()
      ? referral_source.trim().slice(0, 120)
      : 'direct',
    created_at: new Date(),
  };

  try {
    const existing = await findOneBy('beta_signups', 'email', cleanEmail);
    if (existing) {
      res.json({ success: true, duplicate: true, message: 'Already signed up' });
      return;
    }

    await insert('beta_signups', row);
    res.json({ success: true, message: 'Signed up successfully' });
  } catch (error: unknown) {
    // Race-safe duplicate handling if another request inserted first.
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

    if (code === '23505') {
      res.json({ success: true, duplicate: true, message: 'Already signed up' });
      return;
    }

    console.error('[Beta API] Signup error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export { router as betaRouter };
