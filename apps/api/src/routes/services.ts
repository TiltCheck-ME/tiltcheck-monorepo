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
 * Forward authenticated request to another service
 */
router.post('/forward/:service', async (req, res) => {
  const { service: targetService } = req.params;
  const callerService = (req as any).service;
  
  // In a real implementation, this would forward to the target service
  // with the caller's credentials and add X-User-Id, X-Roles headers
  
  res.json({
    success: true,
    message: `Request would be forwarded to ${targetService}`,
    caller: callerService?.id,
    target: targetService,
    body: req.body,
  });
});

export { router as servicesRouter };
