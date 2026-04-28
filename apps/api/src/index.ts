// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-15
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SentryMonitor } from '@tiltcheck/monitoring';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env'); // Path from apps/api/src to monorepo root .env
dotenv.config({ path: envPath });

// ============================================================================
// Startup env var validation — fail fast before any service initializes
// ============================================================================
const _REQUIRED_ENV_VARS = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'JWT_SECRET',
] as const;

for (const key of _REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(`[FATAL] Missing required env var: ${key}. Set it in .env or the deployment environment and restart.`);
  }
}
/**
 * @tiltcheck/api - Central API Gateway
 *
 * The single entry point for all TiltCheck API calls.
 * Handles authentication, session management, and request forwarding.
 */

// Initialize error tracking if DSN is configured
if (process.env.SENTRY_DSN) {
  SentryMonitor.init('api', process.env.SENTRY_DSN);
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import http from 'http';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from 'ws';
import { verifySessionCookie } from '@tiltcheck/auth';
import { getJWTConfig } from './middleware/auth.js';

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
import { pricingRouter } from './routes/pricing.js';
import { casinoRouter } from './routes/casino.js';
import { bonusRouter } from './routes/bonus.js';
import { bonusesRouter } from './routes/bonuses.js';
import { vaultRouter } from './routes/vault.js';
import { betaRouter } from './routes/beta.js';
import { collabRouter } from './routes/collab.js';
import { partnerRouter } from './routes/partner.js';
import { statsRouter } from './routes/stats.js';
import { blogRouter } from './routes/blog.js';
import { telemetryRouter } from './routes/telemetry.js';
import { startBlogGenerator } from './services/blog-generator.js';
import modRouter from './routes/mod.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import { csrfProtection } from './middleware/csrf.js';
import { geoComplianceMiddleware } from './middleware/compliance.js';
import { resolveApiPort } from './runtime-config.js';

const app = express();
app.set('trust proxy', 1); // Trust the first proxy

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
      'https://web-164294266634.us-central1.run.app',
      'https://tiltcheck-api-164294266634.us-central1.run.app',
      'https://tiltcheck-bot-164294266634.us-central1.run.app',
      'https://tiltcheck-user-dashboard-164294266634.us-central1.run.app',
      'https://tiltcheck-api-prod-164294266634.us-central1.run.app',
      'https://tiltcheck-api-gateway-164294266634.us-central1.run.app',
    ];

    // Allow requests with no origin (like mobile apps or curl) or opaque
    // origins. Chrome 147+ extension service workers can send Origin: null
    // (the literal string "null") rather than chrome-extension://<id> in
    // certain cross-site fetch contexts due to Storage Partitioning changes.
    if (!origin || origin === 'null') {
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
app.use(cookieParser());

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
  keyGenerator: (req) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    return ipKeyGenerator(ip);
  },
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

// JustTheTip tipping routes (also at /justthetip for Activity direct access)
app.use('/tip', tipRouter);
app.use('/justthetip', tipRouter);

// RGaaS (Responsible Gaming as a Service) routes
app.use('/rgaas', geoComplianceMiddleware, rgaasRouter);

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
app.use('/ai', (_req, res) => { res.status(410).json({ success: false, error: 'AI Gateway consolidated into discord-bot service.' }); });
app.use('/pricing', pricingRouter);
app.use('/casino', casinoRouter);
app.use('/bonus', bonusRouter);
app.use('/bonuses', bonusesRouter);
app.use('/vault', vaultRouter);
app.use('/beta', betaRouter);
app.use('/collab', collabRouter);
app.use('/stats', statsRouter);
app.use('/partner', partnerRouter);
app.use('/blog', blogRouter);
app.use('/telemetry', telemetryRouter);

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

const PORT = resolveApiPort(process.env);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

// ============================================================================
// WebSocket Server Setup
// ============================================================================

const wss = new WebSocketServer({ 
  server, 
  path: '/analyzer',
  // H6 Fix: Verify session before allowing connection (Supports cookies or token query param)
  verifyClient: async (info, callback) => {
    const cookieHeader = info.req.headers.cookie;
    const url = new URL(info.req.url || '', `http://${info.req.headers.host || 'localhost'}`);
    const queryToken = url.searchParams.get('token');
    
    const jwtConfig = getJWTConfig();
    try {
      // 1. Try Cookie first
      let result = await verifySessionCookie(cookieHeader, jwtConfig);
      
      // 2. Fallback to query token (Common for extensions/websockets)
      if (!result.valid && queryToken) {
          const { verifyToken } = await import('@tiltcheck/auth');
          try {
              const decoded = await verifyToken(queryToken, jwtConfig);
              if (decoded.valid && decoded.payload) {
                result = { 
                    valid: true, 
                    session: { 
                        userId: decoded.payload.sub, 
                        type: decoded.payload.type || 'user', 
                        roles: decoded.payload.roles || [],
                        createdAt: Date.now()
                    } 
                };
              }
          } catch (jwtErr) {
              console.warn('[Analyzer] Invalid query token:', jwtErr);
          }
      }

      if (result.valid) {
        (info.req as any).session = result.session;
        callback(true);
      } else {
        callback(false, 401, 'Unauthorized');
      }
    } catch (err) {
      console.error('[Analyzer] Session verification error:', err);
      callback(false, 500, 'Internal Server Error');
    }
  }
});

import { createAuditLog } from '@tiltcheck/db';

wss.on('connection', (ws, req) => {
  const session = (req as any).session;
  console.log(`[Analyzer] Client connected: ${session?.userId || 'unknown'}`);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
          break;

        case 'spin':
          // 1. Calculate REAL metrics
          const bet = Number(message.data?.bet) || 0;
          const payout = Number(message.data?.payout) || 0;
          const observedRTP = bet > 0 ? payout / bet : 0;
          
          // 2. Log to Database (The "Truth" Layer)
          if (session?.userId) {
            await createAuditLog({
              admin_id: session.userId, // Using user ID as logger for now
              action: 'VERIFY_SPIN',
              target_type: 'USER',
              target_id: session.userId,
              metadata: {
                bet,
                payout,
                rtp: observedRTP,
                game: message.data?.game || 'unknown',
                casino: message.data?.casino || 'unknown'
              }
            });
          }

          // 3. Return analysis
          ws.send(JSON.stringify({
            type: 'spin_ack',
            sessionId: message.data?.sessionId,
            analyzed: true,
            metrics: {
              expectedRTP: 0.96,
              observedRTP,
              anomalies: observedRTP > 5.0 ? ['HIGH_PAYOUT_DETECTED'] : []
            }
          }));
          break;

        case 'request_report':
          const { getAuditLogsByUser } = await import('@tiltcheck/db');
          
          let allLogs = [];
          let hasMore = true;
          let offset = 0;
          const limit = 100;

          while(hasMore) {
            const logs = await getAuditLogsByUser(session.userId, { limit, offset, action: 'VERIFY_SPIN' });
            allLogs.push(...logs.rows);
            hasMore = logs.hasMore;
            offset += limit;
          }

          const totalSpins = allLogs.length;
          const totalRTP = allLogs.reduce((acc, log) => acc + (log.metadata as any).rtp, 0);
          const averageRTP = totalSpins > 0 ? totalRTP / totalSpins : 0;
          const expectedRTP = 0.96;
          const fairnessScore = 100 - (Math.abs(expectedRTP - averageRTP) * 100);

          ws.send(JSON.stringify({
            type: 'report',
            sessionId: message.sessionId,
            report: {
              totalSpins,
              averageRTP,
              fairnessScore,
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
  
  // Start automated background services
  startBlogGenerator();
});

export default app;
export { server };
