/**
 * Health Routes - /health/*
 * Health check endpoints
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness check (for Kubernetes)
 */
router.get('/ready', (_req, res) => {
  const checks = {
    databaseConfigured: Boolean(process.env.NEON_DATABASE_URL),
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    redisConfigured: process.env.REDIS_URL ? true : null,
  };
  
  const requiredChecks = [checks.databaseConfigured, checks.jwtConfigured];
  const allHealthy = requiredChecks.every(Boolean);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live
 * Liveness check (for Kubernetes)
 */
router.get('/live', (_req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
