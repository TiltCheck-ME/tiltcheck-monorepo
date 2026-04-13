/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13 */
/**
 * Beta Routes - /beta/*
 * Handles data contributor signups from tiltcheck.me/beta-tester
 */

import { Router } from 'express';
import { verifySessionCookie } from '@tiltcheck/auth';
import { findOneBy, insert } from '@tiltcheck/db';
import { z } from 'zod';
import { getJWTConfig } from '../middleware/auth.js';

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

const betaSignupSchema = z.object({
  casinos: z.string().optional(),
  style: z.string().optional(),
  aspects: z.array(z.string()).optional(),
  setup: z.string().optional(),
  proof: z.string().optional(),
  website: z.string().optional(),
});

function parseList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
    .slice(0, 20);
}

function parseCommaSeparatedList(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, 20);
}

/**
 * POST /beta/signup
 * Linked beta signup — deduped by authenticated Discord identity.
 */
router.post('/signup', async (req, res) => {
  const parsedBody = betaSignupSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ success: false, error: 'Invalid beta application payload' });
    return;
  }

  const { casinos, style, aspects, setup, proof, website } = parsedBody.data;

  // Honeypot
  if (website) {
    res.status(400).json({ success: false, error: 'Bot detected' });
    return;
  }

  const authResult = await verifySessionCookie(req.headers.cookie, getJWTConfig());
  if (!authResult.valid || !authResult.session?.discordId) {
    res.status(401).json({ success: false, error: 'Link Discord before applying', code: 'DISCORD_LINK_REQUIRED' });
    return;
  }

  const discordId = authResult.session.discordId;
  const discordUsername = authResult.session.discordUsername?.trim() || discordId;
  const stableEmail = `${discordId}@discord.tiltcheck.placeholder`;
  const casinoList = parseCommaSeparatedList(casinos);
  const requestedTools = parseList(aspects);
  const reviewerNotes = [
    typeof setup === 'string' && setup.trim() ? `Setup: ${setup.trim()}` : '',
    typeof proof === 'string' && proof.trim() ? `Trust requirement: ${proof.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 500);

  // Map new fields onto existing DB schema columns
  const row: BetaSignupRow = {
    email: stableEmail,
    discord_username: discordUsername,
    interests: casinoList,
    experience_level: typeof style === 'string' ? style.trim() : null,
    feedback_preference: requestedTools.join(', ') || null,
    referral_source: reviewerNotes || 'direct',
    created_at: new Date(),
  };

  try {
    const existing = await findOneBy('beta_signups', 'email', stableEmail);
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
              { name: 'Discord ID', value: discordId, inline: true },
              { name: 'Tester Type', value: row.experience_level || 'Not specified', inline: true },
              { name: 'Casinos', value: (row.interests || []).join(', ') || 'None listed', inline: false },
              { name: 'Wants to Test', value: row.feedback_preference || 'Not specified', inline: false },
              { name: 'Notes', value: (row.referral_source || '').slice(0, 200) || 'None', inline: false },
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
