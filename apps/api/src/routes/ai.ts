/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * AI routes — gateway consolidated into discord-bot TiltAgent.
 * These HTTP endpoints are no longer active.
 */
import { Router } from 'express';

const router = Router();

// AI processing is now handled directly inside the discord-bot's TiltAgent.
// These routes are stubbed out and return a helpful message instead of crashing.
router.all('/*', (_req, res) => {
    res.status(410).json({
        success: false,
        error: 'AI Gateway has been consolidated into the discord-bot service.',
        message: 'Use the Discord bot commands for AI-powered features.',
    });
});

export { router as aiRouter };
