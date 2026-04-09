/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
/**
 * Collab Routes - /collab/*
 * Handles partner, integration, and collab applications from tiltcheck.me/collab.
 * Submissions are routed to the BETA_APPLICATIONS Discord channel.
 */

import { Router } from 'express';
import { findOneBy, insert } from '@tiltcheck/db';

const router = Router();

type CollabApplicationRow = {
  email: string;
  name: string;
  organization: string | null;
  collab_type: string;
  description: string;
  website: string | null;
  discord_username: string | null;
  referral_source: string | null;
  created_at?: Date;
};

/**
 * POST /collab/apply
 * Public collab/partner application endpoint.
 */
router.post('/apply', async (req, res) => {
  const {
    email,
    name,
    organization,
    collab_type,
    description,
    url: urlField,
    discord_username,
    referral_source,
    honeypot,
  } = req.body ?? {};

  if (honeypot) {
    res.status(400).json({ success: false, error: 'Bot detected' });
    return;
  }

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    res.status(400).json({ success: false, error: 'Valid email required.' });
    return;
  }

  const cleanName = typeof name === 'string' ? name.trim().slice(0, 120) : '';
  if (!cleanName) {
    res.status(400).json({ success: false, error: 'Name required.' });
    return;
  }

  const cleanType = typeof collab_type === 'string' ? collab_type.trim() : '';
  if (!cleanType) {
    res.status(400).json({ success: false, error: 'Collaboration type required.' });
    return;
  }

  const cleanDesc = typeof description === 'string' ? description.trim().slice(0, 1000) : '';
  if (cleanDesc.length < 20) {
    res.status(400).json({ success: false, error: 'Description too short — give us something to work with.' });
    return;
  }

  const row: CollabApplicationRow = {
    email: cleanEmail,
    name: cleanName,
    organization: typeof organization === 'string' && organization.trim() ? organization.trim().slice(0, 200) : null,
    collab_type: cleanType,
    description: cleanDesc,
    website: typeof urlField === 'string' && urlField.trim() ? urlField.trim().slice(0, 500) : null,
    discord_username: typeof discord_username === 'string' && discord_username.trim()
      ? discord_username.trim().slice(0, 80)
      : null,
    referral_source: typeof referral_source === 'string' && referral_source.trim()
      ? referral_source.trim().slice(0, 120)
      : 'direct',
    created_at: new Date(),
  };

  try {
    const existing = await findOneBy('collab_applications', 'email', cleanEmail);
    if (existing) {
      res.json({ success: true, duplicate: true, message: 'Already applied. We have your info.' });
      return;
    }

    await insert('collab_applications', row);

    // Send to the same BETA_APPLICATIONS Discord channel (id: 1488256033502793930)
    const webhookUrl = process.env.DISCORD_BETA_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'TiltCheck Collab Gate',
          embeds: [{
            title: 'New Partner / Collab Application',
            color: 0x6c47ff,
            fields: [
              { name: 'Name', value: row.name, inline: true },
              { name: 'Email', value: row.email, inline: true },
              { name: 'Organization', value: row.organization || 'Not provided', inline: true },
              { name: 'Type', value: row.collab_type, inline: true },
              { name: 'Discord', value: row.discord_username || 'Not provided', inline: true },
              { name: 'Website', value: row.website || 'Not provided', inline: true },
              { name: 'Pitch', value: row.description, inline: false },
              { name: 'Referral', value: row.referral_source || 'direct', inline: true },
            ],
            footer: { text: 'From tiltcheck.me/collab' },
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch((err: unknown) => console.error('[Collab API] Webhook post failed:', err));
    }

    res.json({ success: true, message: 'Application received.' });
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

    if (code === '23505') {
      res.json({ success: true, duplicate: true, message: 'Already applied. We have your info.' });
      return;
    }

    console.error('[Collab API] Application error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export { router as collabRouter };
