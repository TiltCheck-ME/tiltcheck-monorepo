/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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

  res.status(501).json({
    success: false,
    code: 'FORWARD_NOT_IMPLEMENTED',
    message: 'Service forwarding is not implemented for beta',
    caller: callerService?.id,
    target: targetService,
  });
});

export { router as servicesRouter };
