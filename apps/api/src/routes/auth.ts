/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-27 */
/**
 * Auth Routes - /auth/*
 * Handles Discord OAuth, JWT auth, session management, and user info
 */

import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { Magic } from '@magic-sdk/admin';
import {
  getDiscordAuthUrl,
  verifyDiscordOAuth,
  exchangeDiscordCode,
  createSession,
  destroySession,
  verifySessionCookie,
  generateOAuthState,
  createToken,
  verifyToken,
  type DiscordOAuthConfig,
  type JWTConfig,
} from '@tiltcheck/auth';
import {
  findOrCreateUserByDiscord,
  findUserByDiscordId,
  findUserByEmail,
  createUser,
  updateUser,
  findUserById,
} from '@tiltcheck/db';
import { 
  ValidationError, 
  ConflictError, 
  InternalServerError, 
  NotFoundError 
} from '@tiltcheck/error-factory';
import { getJWTConfig } from '../middleware/auth.js';
import {
  getDiscordConfig,
  resolveDiscordRedirectUriForSource,
  getOAuthSource,
  getTrustedExtensionOrigin,
  normalizeOAuthSource,
} from './auth.utils.js';


const router = Router();

// ============================================================================
// Configuration
// ============================================================================

function renderExtensionAuthErrorPage(message: string): string {
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>TiltCheck - Discord Connect</title>
        <style>
          body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; background:#0a0a0a; color:#e6e6e6; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
          .card { max-width: 460px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 28px 32px; }
          .title { font-weight: 800; letter-spacing: 0.3px; margin-bottom: 10px; }
          .msg { font-size: 14px; opacity: 0.9; line-height: 1.45; }
          .hint { margin-top: 12px; font-size: 12px; opacity: 0.65; }
          .footer { margin-top: 24px; font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">TiltCheck Connect Issue</div>
          <div class="msg">${safeMessage}</div>
          <div class="hint">Return to your casino tab, then click Connect Discord again.</div>
           <div class="footer">
             Made for Degens. By Degens.
           </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// Server-side OAuth State Registry
// Fallback for cookie-based CSRF state validation.
// Chrome 147+ may drop SameSite=None cookies set during extension popup OAuth
// flows due to storage partitioning changes. States are single-use and expire
// after 10 minutes to mirror the cookie maxAge.
// ============================================================================

interface OAuthStateEntry {
  createdAt: number;
  redirectUrl?: string; // post-auth redirect URL, if set at login time
}

const pendingOAuthStates = new Map<string, OAuthStateEntry>(); // state → entry
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OAUTH_STATE_CLEANUP_THRESHOLD = 200;

function registerOAuthState(state: string, redirectUrl?: string): void {
  const now = Date.now();
  pendingOAuthStates.set(state, { createdAt: now, redirectUrl });
  if (pendingOAuthStates.size > OAUTH_STATE_CLEANUP_THRESHOLD) {
    for (const [key, entry] of pendingOAuthStates.entries()) {
      if (now - entry.createdAt > OAUTH_STATE_TTL_MS) {
        pendingOAuthStates.delete(key);
      }
    }
  }
}

/**
 * Consume the state entry (single-use). Returns the entry if valid, null if absent/expired.
 */
function consumeOAuthState(state: string): OAuthStateEntry | null {
  const entry = pendingOAuthStates.get(state);
  if (entry === undefined) return null;
  pendingOAuthStates.delete(state);
  return Date.now() - entry.createdAt <= OAUTH_STATE_TTL_MS ? entry : null;
}

// ============================================================================
// Rate Limiting
// ============================================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts', code: 'RATE_LIMIT_EXCEEDED' },
});

const activityTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many activity auth attempts', code: 'RATE_LIMIT_EXCEEDED' },
});

function getMagicAdmin(): Magic | null {
  const secret = process.env.MAGIC_SECRET_KEY?.trim();
  if (!secret) {
    return null;
  }

  return new Magic(secret);
}

function getMagicPublishableKey(): string | null {
  return process.env.MAGIC_PUBLISHABLE_KEY?.trim() || null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

function getDisplayName(email: string, discordUsername?: string | null): string {
  if (discordUsername?.trim()) {
    return discordUsername.trim();
  }

  return email.split('@')[0] || email;
}

function normalizeActivationMetadata(metadata: Record<string, unknown>): Record<string, string> | null {
  const entries = Object.entries(metadata)
    .map(([key, value]) => {
      if (value === undefined || value === null) {
        return null;
      }

      const normalizedValue = String(value).trim();
      if (!normalizedValue) {
        return null;
      }

      return [key, normalizedValue] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function logActivationMilestone(
  req: Request,
  step: string,
  source: string,
  userId: string,
  metadata: Record<string, unknown> = {}
): void {
  console.info(
    '[TiltCheck Funnel]',
    JSON.stringify({
      type: 'milestone',
      step,
      source,
      path: req.path,
      userId,
      metadata: normalizeActivationMetadata(metadata),
      receivedAt: new Date().toISOString(),
      userAgent: req.headers['user-agent'] ?? null,
    }),
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate JWT token for user
 */
async function generateJWT(userId: string, email: string, roles: string[]): Promise<string> {
  const jwtConfig = getJWTConfig();
  
  const token = await createToken(
    { 
      sub: userId, 
      email, 
      roles,
      userId, // Keep for backward compatibility
      type: 'user'
    },
    jwtConfig
  );

  return token;
}

async function resolveAuthenticatedUser(req: {
  headers?: {
    authorization?: string;
    cookie?: string;
  };
}): Promise<Awaited<ReturnType<typeof findUserById>> | null> {
  const jwtConfig = getJWTConfig();
  const authHeader = req.headers?.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const result = await verifyToken(token, jwtConfig);
      if (result.valid && result.payload) {
        const userId = result.payload.sub || (result.payload as { userId?: string }).userId;
        if (typeof userId === 'string' && userId.trim()) {
          const user = await findUserById(userId);
          if (user) {
            return user;
          }
        }
      }
    } catch (jwtError) {
      console.warn(
        '[Auth] Failed to resolve bearer-authenticated user:',
        jwtError instanceof Error ? jwtError.message : String(jwtError),
      );
    }
  }

  const sessionResult = await verifySessionCookie(req.headers?.cookie, jwtConfig);
  if (!sessionResult?.valid || !sessionResult.session?.userId) {
    return null;
  }

  return findUserById(sessionResult.session.userId);
}

function isAllowedActivityRedirectUri(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();

    const isHttpsTiltcheck =
      parsed.protocol === 'https:' &&
      (host === 'tiltcheck.me' || host === 'www.tiltcheck.me' || host.endsWith('.tiltcheck.me'));
    // Discord Activity proxy domain — required for embedded SDK OAuth code exchange
    const isDiscordProxy =
      parsed.protocol === 'https:' && host.endsWith('.discordsays.com');
    const isLocalDev =
      process.env.NODE_ENV !== 'production' &&
      (host === 'localhost' || host === '127.0.0.1');

    return isHttpsTiltcheck || isDiscordProxy || isLocalDev;
  } catch {
    return false;
  }
}

function isAllowedPostAuthRedirect(value: string): boolean {
  if (!value) return false;

  // Relative path redirects are constrained to this host.
  if (value.startsWith('/')) return true;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isHttpsTiltcheck =
      parsed.protocol === 'https:' &&
      (host === 'tiltcheck.me' || host === 'www.tiltcheck.me' || host.endsWith('.tiltcheck.me'));
    const isLocalDev =
      process.env.NODE_ENV !== 'production' &&
      parsed.protocol === 'http:' &&
      (host === 'localhost' || host === '127.0.0.1');
    return isHttpsTiltcheck || isLocalDev;
  } catch {
    return false;
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /auth/register
 * Register a new user with email and password
 */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return next(new ValidationError('Email and password are required', 'email'));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ValidationError('Invalid email format', 'email'));
    }

    // Validate password length
    if (password.length < 6) {
      return next(new ValidationError('Password must be at least 6 characters', 'password'));
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return next(new ConflictError('User with this email already exists'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      email,
      hashed_password: hashedPassword,
      roles: ['user'],
    });

    if (!user) {
      return next(new InternalServerError('Failed to create user'));
    }

    // Generate JWT
    const token = await generateJWT(user.id, user.email!, user.roles);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return next(new InternalServerError('Registration failed'));
  }
});

/**
 * POST /auth/login
 * Login with email and password, returns JWT token
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user || !user.hashed_password) {
      res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashed_password);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Update last login
    await updateUser(user.id, { last_login_at: new Date() });

    // Generate JWT
    const token = await generateJWT(user.id, user.email!, user.roles);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /auth/magic/config
 * Returns whether Magic auth is enabled and the publishable client key.
 */
router.get('/magic/config', (_req, res) => {
  const publishableKey = getMagicPublishableKey();
  const enabled = Boolean(getMagicAdmin() && publishableKey);

  res.json({
    enabled,
    publishableKey: enabled ? publishableKey : null,
  });
});

/**
 * POST /auth/magic/login
 * Verify a Magic DID token and issue the standard TiltCheck JWT/session.
 */
router.post('/magic/login', authLimiter, async (req, res) => {
  const didToken = typeof req.body?.didToken === 'string' ? req.body.didToken.trim() : '';
  if (!didToken) {
    res.status(400).json({ error: 'Magic DID token is required', code: 'MISSING_DID_TOKEN' });
    return;
  }

  const magicAdmin = getMagicAdmin();
  if (!magicAdmin) {
    res.status(503).json({ error: 'Magic auth is not configured', code: 'SERVICE_UNAVAILABLE' });
    return;
  }

  try {
    const metadata = await magicAdmin.users.getMetadataByToken(didToken);
    const email = normalizeEmail(metadata.email);

    if (!email) {
      res.status(400).json({ error: 'Magic identity must include an email', code: 'INVALID_MAGIC_IDENTITY' });
      return;
    }

    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({
        email,
        roles: ['user'],
      });
    }

    if (!user) {
      res.status(500).json({ error: 'Failed to provision user', code: 'USER_PROVISION_FAILED' });
      return;
    }

    await updateUser(user.id, { last_login_at: new Date() });

    const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ['user'];
    const token = await generateJWT(user.id, user.email || email, roles);
    const jwtConfig = getJWTConfig();
    const { cookie } = await createSession(user.id, jwtConfig, {
      type: 'user',
      roles,
      discordId: user.discord_id || undefined,
      discordUsername: user.discord_username || undefined,
      walletAddress: user.wallet_address || undefined,
    });

    res.setHeader('Set-Cookie', cookie);
    logActivationMilestone(req, 'auth_success', 'api-magic-login', user.id, {
      authMethod: 'magic',
      hasDiscordLinked: Boolean(user.discord_id),
    });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email || email,
        roles,
        discordId: user.discord_id || null,
        discordUsername: user.discord_username || null,
        displayName: getDisplayName(user.email || email, user.discord_username),
      },
    });
  } catch (error) {
    console.error('[Auth] Magic login error:', error);
    res.status(400).json({ error: 'Invalid Magic token', code: 'INVALID_MAGIC_TOKEN' });
  }
});

/**
 * POST /auth/guest
 * Start a guest session without full authentication
 */
router.post('/guest', async (req, res) => {
  try {
    const { username } = req.body;
    const guestUsername = username || `Guest_${Math.floor(Math.random() * 10000)}`;
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate a guest JWT
    const jwtConfig = getJWTConfig();
    const token = await createToken(
      { 
        sub: guestId, 
        username: guestUsername, 
        roles: ['guest'], 
        isGuest: true,
        type: 'user'
      },
      { ...jwtConfig, expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: guestId,
        username: guestUsername,
        roles: ['guest'],
        isGuest: true,
      },
    });
  } catch (error) {
    console.error('[Auth] Guest login error:', error);
    res.status(500).json({ error: 'Failed to start guest session' });
  }
});

/**
 * GET /auth/discord/login
 * Initiates Discord OAuth flow
 */
router.get('/discord/login', authLimiter, (req, res) => {
  try {
    const baseConfig = getDiscordConfig();
    const source = normalizeOAuthSource(req.query.source) || 'web';
    const config: DiscordOAuthConfig = {
      ...baseConfig,
      redirectUri: resolveDiscordRedirectUriForSource(baseConfig, source, req),
    };

    if (!config.clientId) {
      res.status(500).json({ error: 'Discord OAuth not configured' });
      return;
    }

    // Compatibility bridge:
    // If Discord is configured to redirect to /discord/login, forward code/state to callback.
    const callbackCode = typeof req.query.code === 'string' ? req.query.code : undefined;
    const callbackState = typeof req.query.state === 'string' ? req.query.state : undefined;
    if (callbackCode || callbackState || typeof req.query.error === 'string') {
      const callbackParams = new URLSearchParams();
      if (callbackCode) callbackParams.set('code', callbackCode);
      if (callbackState) callbackParams.set('state', callbackState);
      if (typeof req.query.error === 'string') callbackParams.set('error', req.query.error);
      if (typeof req.query.error_description === 'string') {
        callbackParams.set('error_description', req.query.error_description);
      }
      const suffix = callbackParams.toString();
      res.redirect(`/auth/discord/callback${suffix ? `?${suffix}` : ''}`);
      return;
    }

    // Generate state for CSRF protection. Prefix helps recover source in callback if cookies are blocked.
    // For extensions, we also encode the opener origin to recover it if the cookie is lost.
    const openerOrigin = getTrustedExtensionOrigin(req.query.opener_origin);
    const originSuffix = (source === 'extension' && openerOrigin) 
        ? `_${Buffer.from(openerOrigin).toString('base64').replace(/=/g, '')}` 
        : '';
    const statePrefix = source === 'extension' ? 'ext' : 'web';
    const state = `${statePrefix}${originSuffix}_${generateOAuthState()}`;

    const isSecure = process.env.NODE_ENV === 'production' || req.hostname === 'localhost';

    // Store state in a short-lived cookie
    // NOTE: No domain parameter = same-site only. This allows extension OAuth to work in production
    // since extension content scripts cannot access domain-scoped cookies (e.g., domain: .tiltcheck.me).
    // The callback validates: (1) state matches cookie if present, OR (2) state prefix is valid (ext_/web_).
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    // Store redirect URL if provided
    const redirectUrl = typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '';
    if (redirectUrl) {
      if (!isAllowedPostAuthRedirect(redirectUrl)) {
        res.status(400).json({ error: 'Invalid redirect URL', code: 'INVALID_REDIRECT' });
        return;
      }
      res.cookie('oauth_redirect', redirectUrl, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    // Store source if provided (e.g., 'extension')
    if (source) {
      res.cookie('oauth_source', source, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    // Optional extension opener origin for stricter postMessage targeting.
    if (openerOrigin) {
      res.cookie('oauth_opener_origin', openerOrigin, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    // Store extension ID for validation in callback (extension origin verification)
    const extId = req.query.ext_id as string | undefined;
    if (source === 'extension' && extId) {
      res.cookie('oauth_extension_id', extId, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    const authUrl = getDiscordAuthUrl(config, state);
    // Register state server-side as a fallback for cookie loss in Chrome 147+.
    // Also stores the redirect URL so post-auth redirect works even if the
    // oauth_redirect cookie is dropped (same SameSite=None partitioning issue).
    registerOAuthState(state, redirectUrl || undefined);
    res.redirect(authUrl);
  } catch (error) {
    console.error('[Auth] Discord login error:', error);
    res.status(500).json({ error: 'Failed to initiate Discord login' });
  }
});

/**
 * GET /auth/discord/callback
 * Handles Discord OAuth callback
 */
router.get('/discord/callback', authLimiter, async (req, res) => {
  const source = getOAuthSource(req);
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.warn('[Auth] Discord returned error:', error, error_description);
      const errorMsg = typeof error_description === 'string' ? error_description : `Discord error: ${error}`;
      if (source === 'extension') {
        res.status(400).send(renderExtensionAuthErrorPage(errorMsg));
      } else {
        res.status(400).json({ error: errorMsg });
      }
      return;
    }

    const storedState = req.cookies?.oauth_state;
    const stateValue = typeof state === 'string' ? state : '';
    const sourceFromState = stateValue.startsWith('ext_')
      ? 'extension'
      : stateValue.startsWith('web_')
        ? 'web'
        : undefined;
    const sourceFromCookie = normalizeOAuthSource(req.cookies?.oauth_source);

    // Optional integrity check: if both exist, cookie source must match state source.
    if (sourceFromCookie && sourceFromState && sourceFromCookie !== sourceFromState) {
      res.status(400).json({ error: 'Invalid OAuth source' });
      return;
    }

    // Verify state CSRF token.
    // Primary: compare against the cookie value (set at login time).
    // Fallback: check the server-side state registry for cases where the
    // oauth_state cookie is dropped by Chrome 147+ Storage Partitioning in
    // extension popup OAuth flows (SameSite=None cookies can be lost when the
    // popup navigates from discord.com back to api.tiltcheck.me).
    // States in the registry are single-use and expire after 10 minutes.
    // The registry also stores the redirect URL so it can be recovered when
    // the oauth_redirect cookie is lost by the same mechanism.
    let stateValid = false;
    let registryEntry: OAuthStateEntry | null = null;
    if (stateValue) {
      if (stateValue === storedState) {
        stateValid = true;
        registryEntry = consumeOAuthState(stateValue); // keep registry in sync; grab redirect
      } else {
        registryEntry = consumeOAuthState(stateValue);
        stateValid = registryEntry !== null;
        if (stateValid) {
          console.log('[Auth] OAuth state validated via server-side registry (cookie was absent).');
        }
      }
    }

    if (!stateValid) {
      console.warn('[Auth] OAuth state mismatch or missing cookie. Potential CSRF blocked.');
      res.status(400).json({ error: 'Invalid OAuth state or expired session' });
      return;
    }

    // Clear state cookie
    res.clearCookie('oauth_state');

    if (!code || typeof code !== 'string') {
      if (source === 'extension') {
        res.status(400).send(renderExtensionAuthErrorPage('Missing authorization code from Discord. Please retry.'));
        return;
      }
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    const baseDiscordConfig = getDiscordConfig();
    const discordConfig: DiscordOAuthConfig = {
      ...baseDiscordConfig,
      redirectUri: resolveDiscordRedirectUriForSource(baseDiscordConfig, source, req),
    };
    const jwtConfig = getJWTConfig();

    // Exchange code for tokens and get user info
    const result = await verifyDiscordOAuth(code, discordConfig);

    if (!result.valid || !result.user) {
      if (source === 'extension') {
        res
          .status(401)
          .send(renderExtensionAuthErrorPage(result.error || 'Discord authentication failed. Please retry.'));
        return;
      }
      res.status(401).json({ error: result.error || 'Discord authentication failed' });
      return;
    }

    const authenticatedUser = await resolveAuthenticatedUser(req);
    const existingDiscordUser = await findUserByDiscordId(result.user.id);

    let user;
    if (authenticatedUser) {
      if (authenticatedUser.discord_id && authenticatedUser.discord_id !== result.user.id) {
        const message = 'This TiltCheck account is already linked to a different Discord account.';
        if (source === 'extension') {
          res.status(409).send(renderExtensionAuthErrorPage(message));
        } else {
          res.status(409).json({ error: message, code: 'DISCORD_ALREADY_LINKED' });
        }
        return;
      }

      if (existingDiscordUser && existingDiscordUser.id !== authenticatedUser.id) {
        const message = 'This Discord account is already linked to another TiltCheck account.';
        if (source === 'extension') {
          res.status(409).send(renderExtensionAuthErrorPage(message));
        } else {
          res.status(409).json({ error: message, code: 'DISCORD_LINK_CONFLICT' });
        }
        return;
      }

      user = await updateUser(authenticatedUser.id, {
        discord_id: result.user.id,
        discord_username: result.user.username,
        discord_avatar: result.user.avatar || undefined,
        last_login_at: new Date(),
      });

      if (!user) {
        throw new Error('Failed to link Discord account');
      }
    } else {
      user = await findOrCreateUserByDiscord(
        result.user.id,
        result.user.username,
        result.user.avatar || undefined
      );
    }

    // Create session
    const { cookie } = await createSession(user.id, jwtConfig, {
      type: 'user',
      discordId: user.discord_id || result.user.id,
      discordUsername: user.discord_username || result.user.username,
      walletAddress: user.wallet_address || undefined,
      roles: user.roles,
    });

    // Set session cookie
    res.setHeader('Set-Cookie', cookie);
    logActivationMilestone(req, 'auth_success', 'api-discord-callback', user.id, {
      authMethod: 'discord',
      source,
      hasWalletLinked: Boolean(user.wallet_address),
    });

    // Check if source was extension
    res.clearCookie('oauth_source');
    const openerOriginCookie = req.cookies?.oauth_opener_origin;
    res.clearCookie('oauth_opener_origin');
    const storedExtensionId = req.cookies?.oauth_extension_id;
    res.clearCookie('oauth_extension_id');
    // Final fallback for the opener origin (needed for the final postMessage)
    // Preference: 1. Cookie (most secure) 2. State (resilient for popups)
    let postMessageTarget = getTrustedExtensionOrigin(openerOriginCookie);
    
    if (!postMessageTarget && source === 'extension' && typeof state === 'string') {
        const stateParts = state.split('_');
        if (stateParts.length >= 3 && stateParts[0] === 'ext') {
            try {
                const encodedOrigin = stateParts[1];
                // Manually add back padding if needed for b64
                const paddingNeeded = (4 - (encodedOrigin.length % 4)) % 4;
                const padded = encodedOrigin + '='.repeat(paddingNeeded);
                const decodedOrigin = Buffer.from(padded, 'base64').toString('utf8');
                postMessageTarget = getTrustedExtensionOrigin(decodedOrigin);
                if (postMessageTarget) {
                    console.log('[Auth] Recovered extension origin from state:', postMessageTarget);
                }
            } catch (err) {
                console.warn('[Auth] Failed to decode origin from state', err);
            }
        }
    }

    if (source === 'extension') {
      // Validate extension runtime ID if extension is making the request
      const incomingExtId = req.query.ext_id as string | undefined;
      if (storedExtensionId && incomingExtId && storedExtensionId !== incomingExtId) {
        res
          .status(400)
          .send(
            renderExtensionAuthErrorPage(
              'Extension runtime ID mismatch. This may indicate an unauthorized extension. Close this window and restart Connect Discord from the original extension.'
            )
          );
        return;
      }

      if (!postMessageTarget) {
        res
          .status(400)
          .send(
            renderExtensionAuthErrorPage(
              'Missing trusted extension origin. Close this window and restart Connect Discord from the extension.'
            )
          );
        return;
      }
      // Generate JWT for the user to pass back directly
      const token = await generateJWT(user.id, user.email || `${user.id}@discord.com`, user.roles);

      // Branded callback page that posts message to opener
      res.send(`
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>TiltCheck - Authenticating</title>
            <style>
              body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; background:#0a0a0a; color:#e6e6e6; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
              .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 28px 32px; text-align:center; }
              .logo { font-weight: 800; letter-spacing: 0.4px; margin-bottom: 8px; }
              .spinner { width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #6366f1; border-radius: 50%; margin: 12px auto; animation: spin 1s linear infinite; }
              @keyframes spin { to { transform: rotate(360deg); } }
              .hint { font-size: 12px; opacity: 0.6; }
              .footer { margin-top: 20px; font-size: 9px; opacity: 0.4; text-transform: uppercase; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">TiltCheck</div>
              <div>Authenticating...</div>
              <div class="spinner"></div>
              <div class="hint">This window will close automatically.</div>
               <div class="footer">
                 Made for Degens. By Degens.
               </div>
            </div>
            <script>
              const userData = ${JSON.stringify({
                id: user.id,
                username: user.discord_username || result.user.username,
                discordId: user.discord_id || result.user.id,
                discordUsername: user.discord_username || result.user.username,
                avatar: user.discord_avatar,
                email: user.email,
                walletAddress: user.wallet_address,
              })};
              const targetOrigin = ${JSON.stringify(postMessageTarget)};
              try {
                if (!window.opener || typeof window.opener.postMessage !== 'function') {
                  document.querySelector('.hint').textContent = 'Return to your extension tab and retry Connect Discord.';
                } else {
                  window.opener.postMessage({
                    type: 'discord-auth',
                    token: '${token}',
                    user: userData
                  }, targetOrigin);
                  setTimeout(() => window.close(), 1500);
                }
              } catch (err) {
                console.error('Auth handoff failed:', err);
                document.querySelector('.hint').innerHTML = ' \\
                  <div style="margin-top:15px; padding:10px; border:1px solid rgba(255,255,255,0.1); border-radius:8px;"> \\
                    <p style="color:#ef4444; font-weight:bold; margin-bottom:10px;">PostMessage Handshake Blocked</p> \\
                    <button onclick="tryManualSync()" style="background:#6366f1; color:white; border:none; padding:8px 16px; border-radius:4px; font-weight:bold; cursor:pointer; width:100%;">SYNC HANDSHAKE NOW</button> \\
                    <p style="margin-top:10px; font-size:11px;">If sync fails, ensure you are using <b>tiltcheck.me</b> and not a Cloud Run sandbox URL.</p> \\
                  </div> \\
                ';
              }

              function tryManualSync() {
                try {
                  if (window.opener) {
                    window.opener.postMessage({ type: 'discord-auth', token: '${token}', user: userData }, targetOrigin);
                    setTimeout(() => window.close(), 1000);
                  }
                } catch (e) {
                  alert('Verification failed. Use https://tiltcheck.me');
                }
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    // Redirect to stored URL or default.
    // Resolution order:
    // 1. oauth_redirect cookie (set at login, may be lost by Chrome 147 partitioning)
    // 2. redirect URL stored in the server-side state registry (recovers cookie loss)
    // 3. canonical post-auth default
    // Each candidate is validated by isAllowedPostAuthRedirect before use.
    const redirectCookie = typeof req.cookies?.oauth_redirect === 'string' ? req.cookies.oauth_redirect : '';
    const registryRedirect = registryEntry?.redirectUrl ?? '';

    let resolvedRedirect: string;
    if (isAllowedPostAuthRedirect(redirectCookie)) {
      resolvedRedirect = redirectCookie;
    } else if (isAllowedPostAuthRedirect(registryRedirect)) {
      resolvedRedirect = registryRedirect;
      console.log('[Auth] Post-auth redirect recovered from state registry (oauth_redirect cookie was absent).');
    } else {
      resolvedRedirect = 'https://tiltcheck.me/play/profile.html';
    }

    res.clearCookie('oauth_redirect');
    // Defense-in-depth: re-validate immediately before the redirect so CodeQL
    // can trace that no user-controlled value ever reaches res.redirect()
    // without passing the allow-list check.
    if (!isAllowedPostAuthRedirect(resolvedRedirect)) {
      resolvedRedirect = 'https://tiltcheck.me/play/profile.html';
    }
    res.redirect(resolvedRedirect);
  } catch (error) {
    console.error('[Auth] Discord callback error:', error);
    if (source === 'extension') {
      const detail =
        error instanceof Error
          ? error.message.slice(0, 120)
          : 'Unknown error';
      res
        .status(500)
        .send(renderExtensionAuthErrorPage(`Discord sign-in failed: ${detail}. Check Railway logs and retry.`));
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /auth/discord/activity/token
 * Exchange Discord Activity OAuth code for access token.
 */
router.post('/discord/activity/token', activityTokenLimiter, async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const redirectUriInput =
      typeof req.body?.redirectUri === 'string' ? req.body.redirectUri.trim() : '';

    if (!code || code.length < 8 || code.length > 2048) {
      res.status(400).json({ error: 'Invalid authorization code', code: 'INVALID_CODE' });
      return;
    }

    if (redirectUriInput && !isAllowedActivityRedirectUri(redirectUriInput)) {
      res.status(400).json({ error: 'Invalid redirect URI', code: 'INVALID_REDIRECT_URI' });
      return;
    }

    const discordConfig = getDiscordConfig();
    if (!discordConfig.clientId || !discordConfig.clientSecret) {
      res.status(503).json({ error: 'Discord activity auth unavailable', code: 'NOT_CONFIGURED' });
      return;
    }

    // Discord Activities OAuth code exchange must use the discordsays proxy URI —
    // NOT the regular web/extension callback URI. The embedded SDK's authorize()
    // command always uses https://<CLIENT_ID>.discordsays.com as the redirect.
    const activityRedirectUri =
      redirectUriInput || `https://${discordConfig.clientId}.discordsays.com`;

    const exchangeConfig: DiscordOAuthConfig = {
      ...discordConfig,
      redirectUri: activityRedirectUri,
    };

    // Timeout fallback keeps this endpoint responsive if Discord is degraded.
    const exchangeResult = await Promise.race([
      exchangeDiscordCode(code, exchangeConfig),
      new Promise<{ success: false; error: string }>((resolve) => {
        setTimeout(() => resolve({ success: false, error: 'Discord token exchange timeout' }), 8000);
      }),
    ]);

    if (!exchangeResult.success || !exchangeResult.tokens) {
      res.status(401).json({ error: 'Discord token exchange failed', code: 'DISCORD_EXCHANGE_FAILED' });
      return;
    }

    res.json({
      access_token: exchangeResult.tokens.accessToken,
      token_type: exchangeResult.tokens.tokenType,
      expires_in: exchangeResult.tokens.expiresIn,
      scope: exchangeResult.tokens.scope,
    });
  } catch (error) {
    console.error('[Auth] Discord activity token exchange error:', error);
    res.status(500).json({ error: 'Activity authentication failed', code: 'ACTIVITY_AUTH_FAILED' });
  }
});

/**
 * GET /auth/me
 * Returns current user info from JWT token or session cookie
 */
router.get('/me', async (req, res) => {
  try {
    // Try JWT token first (from Authorization header)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtConfig = getJWTConfig();

      try {
        const result = await verifyToken(token, jwtConfig);
        if (result.valid && result.payload) {
          const userId = result.payload.sub || (result.payload as any).userId;
          const user = await findUserById(userId);

          if (user) {
            res.json({
              userId: user.id,
              email: user.email,
              discordId: user.discord_id,
              discordUsername: user.discord_username,
              walletAddress: user.wallet_address,
              roles: user.roles,
              type: 'user',
              isAdmin: user.roles.includes('admin'),
            });
            return;
          }
        }
      } catch (jwtError) {
        console.warn('[Auth] Me JWT verification failed:', jwtError instanceof Error ? jwtError.message : String(jwtError));
        // Token invalid, try session cookie
      }
    }

    // Fallback to session cookie (Discord OAuth)
    const jwtConfig = getJWTConfig();
    const cookieHeader = req.headers.cookie;

    const result = await verifySessionCookie(cookieHeader, jwtConfig);

    if (!result.valid || !result.session) {
      res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
      return;
    }

    const session = result.session;
    const user = await findUserById(session.userId);

    if (user) {
      res.json({
        userId: user.id,
        email: user.email,
        discordId: user.discord_id,
        discordUsername: user.discord_username,
        walletAddress: user.wallet_address,
        roles: user.roles,
        type: session.type,
        isAdmin: user.roles.includes('admin') || session.type === 'admin',
      });
      return;
    }

    res.json({
      userId: session.userId,
      type: session.type,
      discordId: session.discordId,
      discordUsername: session.discordUsername,
      walletAddress: session.walletAddress,
      roles: session.roles,
      isAdmin: session.type === 'admin',
    });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/logout
 * Destroys the current session
 */
router.post('/logout', (_req, res) => {
  try {
    const cookie = destroySession();
    res.setHeader('Set-Cookie', cookie);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

/**
 * GET /auth/logout
 * Alternative logout via GET (for links)
 */
router.get('/logout', (_req, res) => {
  try {
    const cookie = destroySession();
    res.setHeader('Set-Cookie', cookie);
    res.redirect('https://tiltcheck.me');
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.redirect('https://tiltcheck.me');
  }
});

export { router as authRouter };
