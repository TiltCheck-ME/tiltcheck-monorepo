/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Health Routes - /health/*
 * Health check endpoints
 */

import { Router } from 'express';
import { query } from '@tiltcheck/db';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness check
 */
router.get('/ready', async (_req, res) => {
  let dbConnected = false;
  try {
    const result = await query('SELECT 1 as connected');
    dbConnected = result.length > 0;
  } catch (err) {
    console.error('[Health] Database connection failed:', err);
  }

  const checks = {
    databaseConfigured: Boolean(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRESQL),
    databaseConnected: dbConnected,
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    notionConfigured: Boolean(process.env.NOTION_INTEGRATION_TOKEN),
  };

  const requiredChecks = [checks.databaseConnected, checks.jwtConfigured];
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
