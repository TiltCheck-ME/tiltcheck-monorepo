/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 */
/**
 * Chrome extension and internal clients: POST /ai/api/ai
 * Proxies to @tiltcheck/ai-client (multi-provider tilt-detection, moderation, etc.).
 *
 * Risk: authenticated relay to paid LLM providers — flexAuth required, body allowlist,
 * bounded context size. Rollback: remove app.use('/ai', aiGatewayRouter) and restore 410 stub.
 */

import { Router } from 'express';
import { z } from 'zod';
import { flexAuth } from '@tiltcheck/auth/middleware/express.js';
import { aiClient, type AIApplication } from '@tiltcheck/ai-client';
import { getJWTConfig } from '../middleware/auth.js';

const router = Router();

const ALLOWED_APPLICATIONS = [
  'tilt-detection',
  'moderation',
  'survey-matching',
  'card-generation',
  'nl-commands',
  'recommendations',
  'support',
  'onboarding',
] as const satisfies readonly AIApplication[];

const applicationSchema = z.enum(ALLOWED_APPLICATIONS);

const bodySchema = z.object({
  application: applicationSchema,
  prompt: z.string().max(8000).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const MAX_CONTEXT_KEYS = 40;
const MAX_CONTEXT_JSON_BYTES = 24_000;

function contextTooLarge(context: Record<string, unknown> | undefined): boolean {
  if (!context) return false;
  if (Object.keys(context).length > MAX_CONTEXT_KEYS) return true;
  try {
    return JSON.stringify(context).length > MAX_CONTEXT_JSON_BYTES;
  } catch {
    return true;
  }
}

const requireUser = flexAuth(getJWTConfig(), { required: true });

/**
 * POST /ai/api/ai
 * Bearer or session cookie (flexAuth). Returns AIResponse JSON shape.
 */
router.post('/api/ai', requireUser, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid request body',
      code: 'INVALID_BODY',
    });
    return;
  }

  const { application, prompt, context } = parsed.data;
  if (contextTooLarge(context)) {
    res.status(400).json({
      success: false,
      error: 'Context too large',
      code: 'CONTEXT_LIMIT',
    });
    return;
  }

  try {
    const result = await aiClient.request({
      application,
      prompt: prompt ?? '',
      context: context ?? {},
    });
    const status = result.success ? 200 : 502;
    res.status(status).json(result);
  } catch (err) {
    console.error('[ai-gateway] AI request failed:', err);
    res.status(500).json({
      success: false,
      error: 'Tilt check service hiccupped. Try again.',
      code: 'AI_GATEWAY_ERROR',
    });
  }
});

export { router as aiGatewayRouter };
