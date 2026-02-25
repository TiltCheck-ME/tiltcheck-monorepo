/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
// v0.1.0 — 2026-02-25
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

import { authRouter } from './routes/auth.js';
import { servicesRouter } from './routes/services.js';
import { tipRouter } from './routes/tip.js';
import { healthRouter } from './routes/health.js';
import { rgaasRouter } from './routes/rgaas.js';
import { affiliateRouter } from './routes/affiliate.js';
import { safetyRouter } from './routes/safety.js';
import { newsletterRouter } from './routes/newsletter.js';
import { stripeRouter, handleStripeWebhook } from './routes/stripe.js';
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
    // Allow requests from tiltcheck.me subdomains
    const allowedOrigins = [
      'https://tiltcheck.me',
      'https://dashboard.tiltcheck.me',
      'https://justthetip.tiltcheck.me',
      'https://bot.tiltcheck.me',
      /^https:\/\/.*\.tiltcheck\.me$/,
    ];
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // Allow localhost in development
      callback(null, true);
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

app.listen(PORT, HOST, () => {
  console.log(`[API Gateway] Running on http://${HOST}:${PORT}`);
  console.log(`[API Gateway] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
