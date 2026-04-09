/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
/**
 * Beta Routes - /beta/*
 * Handles data contributor signups from tiltcheck.me/beta-tester
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

function parseList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
    .slice(0, 20);
}

/**
 * POST /beta/signup
 * Data contributor signup — deduped by discord_username.
 */
router.post('/signup', async (req, res) => {
  const { discord_username, casinos, play_frequency, verify_types, experience, website } =
    req.body ?? {};

  // Honeypot
  if (website) {
    res.status(400).json({ success: false, error: 'Bot detected' });
    return;
  }

  const cleanDiscord = typeof discord_username === 'string' ? discord_username.trim() : '';
  if (!cleanDiscord) {
    res.status(400).json({ success: false, error: 'Discord username required' });
    return;
  }

  // Map new fields onto existing DB schema columns
  const row: BetaSignupRow = {
    email: `${cleanDiscord.toLowerCase().replace(/[^a-z0-9]/g, '')}@discord.tiltcheck.placeholder`,
    discord_username: cleanDiscord,
    interests: parseList(casinos),                          // casinos they actively play
    experience_level: typeof play_frequency === 'string' ? play_frequency.trim() : null,
    feedback_preference: parseList(verify_types).join(', ') || null, // what they'll verify
    referral_source: typeof experience === 'string' ? experience.trim().slice(0, 500) : 'direct',
    created_at: new Date(),
  };

  try {
    const existing = await findOneBy('beta_signups', 'discord_username', cleanDiscord);
    if (existing) {
      res.json({ success: true, duplicate: true, message: 'Already signed up' });
      return;
    }

    await insert('beta_signups', row);

    const webhookUrl = process.env.DISCORD_BETA_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'TiltCheck Beta Gate',
          embeds: [{
            title: 'New Data Contributor Application',
            color: 0x17c3b2,
            fields: [
              { name: 'Discord', value: row.discord_username || 'Unknown', inline: true },
              { name: 'Plays Frequency', value: row.experience_level || 'Not specified', inline: true },
              { name: 'Casinos', value: (row.interests || []).join(', ') || 'None listed', inline: false },
              { name: 'Will Verify', value: row.feedback_preference || 'Not specified', inline: false },
              { name: 'Their Experience', value: (row.referral_source || '').slice(0, 200) || 'None', inline: false },
            ],
            footer: { text: 'From tiltcheck.me/beta-tester' },
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(err => console.error('[Beta API] Webhook post failed:', err));
    }

    res.json({ success: true, message: 'Signed up successfully' });
  } catch (error: unknown) {
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
