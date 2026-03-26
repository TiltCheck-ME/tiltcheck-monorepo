/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Partner Routes - /partner/*
 * Handles partner registration, API key management, and webhooks.
 */

import { Router } from 'express';
import { createPartner, createWebhook, findPartnerByAppId, findPartnerById } from '@tiltcheck/db';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { partnerAuthMiddleware, PartnerRequest } from '../middleware/partner.js';

const router = Router();

/**
 * POST /partner/register
 * Admin only: Register a new partner in the ecosystem.
 */
router.post('/register', authMiddleware, async (req, res) => {
    try {
        const userPayload = (req as AuthRequest).user;
        if (!userPayload?.roles.includes('admin')) {
            res.status(403).json({ error: 'Admin privileges required' });
            return;
        }

        const { name, appId, websiteUrl, secretKey } = req.body;

        if (!name || !appId || !secretKey) {
            res.status(400).json({ error: 'Name, appId, and secretKey are required' });
            return;
        }

        // Check for existing AppId
        const existing = await findPartnerByAppId(appId);
        if (existing) {
            res.status(409).json({ error: 'AppId already registered' });
            return;
        }

        const partner = await createPartner({
            name,
            app_id: appId,
            website_url: websiteUrl,
            secret_key: secretKey, // In prod, this should be generated securely
        });

        res.status(201).json({
            success: true,
            partner: {
                id: partner?.id,
                name: partner?.name,
                appId: partner?.app_id,
            }
        });
    } catch (error) {
        console.error('[Partner Router] Registration error:', error);
        res.status(500).json({ error: 'Failed to register partner' });
    }
});

/**
 * POST /partner/webhooks
 * Partner auth: Register a new webhook for integration events.
 */
router.post('/webhooks', partnerAuthMiddleware, async (req, res) => {
    try {
        const partner = (req as PartnerRequest).partner;
        const { targetUrl, events } = req.body;

        if (!targetUrl || !Array.isArray(events)) {
            res.status(400).json({ error: 'targetUrl and events (array) are required' });
            return;
        }

        // Validate event types if necessary
        const webhook = await createWebhook({
            partner_id: partner!.id,
            target_url: targetUrl,
            events,
        });

        res.status(201).json({
            success: true,
            webhook,
        });
    } catch (error) {
        console.error('[Partner Router] Webhook creation error:', error);
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});

/**
 * GET /partner/me
 * Partner auth: Get current partner info.
 */
router.get('/me', partnerAuthMiddleware, async (req, res) => {
    try {
        const partner = (req as PartnerRequest).partner;
        res.json({
            success: true,
            partner,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get partner info' });
    }
});

export { router as partnerRouter };
