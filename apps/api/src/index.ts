/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// v1.1.0 — 2026-02-26
/**
 * @tiltcheck/api - Central API Gateway
 *
 * The single entry point for all TiltCheck API calls.
 * Handles authentication, session management, and request forwarding.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { WebSocketServer } from 'ws';

import { authRouter } from './routes/auth.js';
import { servicesRouter } from './routes/services.js';
import { tipRouter } from './routes/tip.js';
import { healthRouter } from './routes/health.js';
import { rgaasRouter } from './routes/rgaas.js';
import { affiliateRouter } from './routes/affiliate.js';
import { safetyRouter } from './routes/safety.js';
import { newsletterRouter } from './routes/newsletter.js';
import { stripeRouter, handleStripeWebhook } from './routes/stripe.js';
import { userRouter } from './routes/user.js';
import { aiRouter } from './routes/ai.js';
import { pricingRouter } from './routes/pricing.js';
import { casinoRouter } from './routes/casino.js';
import { bonusRouter } from './routes/bonus.js';
import { vaultRouter } from './routes/vault.js';
import { betaRouter } from './routes/beta.js';
import { statsRouter } from './routes/stats.js';
import modRouter from './routes/mod.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();

// ============================================================================
// Stripe Webhook (MUST be before body parsers)
// ============================================================================
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// ============================================================================
// Global Middleware
// ============================================================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Handled by individual services
}));

// CORS configuration for subdomain cookies
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from provisioned production domains and Chrome Extension
    const allowedOrigins = [
      'https://tiltcheck.me',
      'https://dashboard.tiltcheck.me',
      'https://api.tiltcheck.me',
      'https://bot.tiltcheck.me',
      'https://tiltcheck-web-164294266634.us-central1.run.app',
      'https://tiltcheck-api-164294266634.us-central1.run.app',
      'https://tiltcheck-bot-164294266634.us-central1.run.app',
      'https://tiltcheck-user-dashboard-164294266634.us-central1.run.app',
    ];

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://');

    if (isAllowed) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // Allow local development origins
      const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      callback(null, isLocal);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// CSRF protection for non-GET requests
app.use(csrfProtection);

// Rate limiting (global fallback)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
});
app.use(globalLimiter);

// ============================================================================
// Routes
// ============================================================================

// Health check (no auth required)
app.use('/health', healthRouter);

// Authentication routes
app.use('/auth', authRouter);

// Internal services proxy (requires service token)
app.use('/services', servicesRouter);

// JustTheTip tipping routes
app.use('/tip', tipRouter);

// RGaaS (Responsible Gaming as a Service) routes
app.use('/rgaas', rgaasRouter);

// Safety routes
app.use('/safety', safetyRouter);

// Affiliate trust routes
app.use('/affiliate', affiliateRouter);

// Newsletter routes
app.use('/newsletter', newsletterRouter);

// Stripe billing routes
app.use('/stripe', stripeRouter);

// User and onboarding routes
app.use('/user', userRouter);

// Consolidated Utility Routes
app.use('/ai', aiRouter);
app.use('/pricing', pricingRouter);
app.use('/casino', casinoRouter);
app.use('/bonus', bonusRouter);
app.use('/vault', vaultRouter);
app.use('/beta', betaRouter);
app.use('/stats', statsRouter);

// Moderation routes
app.use('/mod', modRouter);

// ============================================================================
// Error Handling
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

// ============================================================================
// WebSocket Server Setup
// ============================================================================

const wss = new WebSocketServer({ server, path: '/analyzer' });

wss.on('connection', (ws) => {
  console.log('[Analyzer] Client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
          break;

        case 'spin':
          // Process spin data
          // TODO: Validate spin data structure
          // TODO: Calculate fairness metrics
          // TODO: Store in database if needed
          // TODO: Return analysis
          ws.send(JSON.stringify({
            type: 'spin_ack',
            sessionId: message.data?.sessionId,
            analyzed: true,
            metrics: {
              expectedRTP: 0.96,
              observedRTP: message.data?.payout / message.data?.bet || 0,
              anomalies: []
            }
          }));
          break;

        case 'request_report':
          // Generate fairness report for session
          // TODO: Pull historical data for sessionId
          // TODO: Calculate aggregated metrics
          ws.send(JSON.stringify({
            type: 'report',
            sessionId: message.sessionId,
            report: {
              totalSpins: 0,
              averageRTP: 0.96,
              fairnessScore: 100,
              concerns: []
            }
          }));
          break;

        default:
          console.warn('[Analyzer] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Analyzer] Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  });

  ws.on('close', () => {
    console.log('[Analyzer] Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('[Analyzer] WebSocket error:', error);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[API Gateway] Running on http://${HOST}:${PORT}`);
  console.log(`[API Gateway] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Analyzer] WebSocket listening on ws://${HOST}:${PORT}/analyzer`);
});

export default app;
export { server };
