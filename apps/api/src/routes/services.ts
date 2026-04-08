/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// v0.1.0 — 2026-02-25
/**
 * Services Routes - /services/*
 * Internal service-to-service communication proxy
 */

import { Router } from 'express';
import { serviceAuth } from '@tiltcheck/auth/middleware/express';

const router = Router();

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
 * Reserved for future inter-service proxying — not implemented.
 */
router.post('/forward/:service', (_req, res) => {
  res.status(410).json({
    success: false,
    code: 'FORWARD_REMOVED',
    message: 'Service forwarding was removed. Use direct service URLs.',
  });
});

export { router as servicesRouter };
