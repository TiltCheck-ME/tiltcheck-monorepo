/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
// v0.1.0 — 2026-02-25
/**
 * Services Routes - /services/*
 * Internal service-to-service communication proxy
 */

import { Router } from 'express';
import { serviceAuth } from '@tiltcheck/auth/middleware/express';
import { randomUUID } from 'crypto';

const router = Router();

function getServiceForwardTargets(): Record<string, string> {
  const raw = process.env.SERVICE_FORWARD_TARGETS;
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([name, target]) => typeof name === 'string' && typeof target === 'string' && /^https?:\/\//.test(target)
      )
    );
  } catch {
    return {};
  }
}

// All routes require service authentication
router.use(serviceAuth());

/**
 * POST /services/internal
 * Generic internal service endpoint
 */
router.post('/internal', (req, res) => {
  // The service context is attached by serviceAuth middleware
  const service = (req as any).service;
  
  res.json({
    success: true,
    message: 'Internal service request received',
    callerService: service?.id,
    context: service?.context,
  });
});

/**
 * GET /services/health
 * Internal health check for services
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /services/forward/:service
 * Forward authenticated request to another service
 */
router.post('/forward/:service', async (req, res) => {
  const { service: targetService } = req.params;
  const callerService = (req as any).service;
  const targets = getServiceForwardTargets();
  const targetBase = targets[targetService];
  const traceId = (req.headers['x-trace-id'] as string | undefined) || randomUUID();

  if (!targetBase) {
    res.status(400).json({
      success: false,
      code: 'FORWARD_TARGET_NOT_ALLOWED',
      message: 'Target service is not allowlisted for forwarding',
      caller: callerService?.id,
      target: targetService,
      traceId,
    });
    return;
  }

  const [requestPath = '', requestQuery = ''] = req.url.split('?');
  const forwardedPath = requestPath.replace(/^\/forward\/[^/]+/, '') || '/';
  const normalizedBase = targetBase.endsWith('/') ? targetBase : `${targetBase}/`;
  const targetUrl = new URL(forwardedPath.replace(/^\//, ''), normalizedBase);
  if (requestQuery) {
    targetUrl.search = requestQuery;
  }
  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-by-service': callerService?.id || 'unknown',
        'x-trace-id': traceId,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const responseText = await response.text();
    let payload: unknown;
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { raw: responseText };
    }

    res.status(response.status).json({
      success: response.ok,
      forwarded: true,
      caller: callerService?.id,
      target: targetService,
      traceId,
      response: payload,
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      code: 'FORWARD_FAILED',
      message: 'Failed to forward request to target service',
      caller: callerService?.id,
      target: targetService,
      traceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as servicesRouter };
