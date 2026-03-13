/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Auth Routes - /auth/*
 * Handles Discord OAuth, JWT auth, session management, and user info
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  getDiscordAuthUrl,
  verifyDiscordOAuth,
  exchangeDiscordCode,
  createSession,
  destroySession,
  verifySessionCookie,
  getDiscordAvatarUrl,
  generateOAuthState,
  type DiscordOAuthConfig,
} from '@tiltcheck/auth';
import {
  findOrCreateUserByDiscord,
  findUserByEmail,
  createUser,
  updateUser,
  findUserById,
} from '@tiltcheck/db';
import { authMiddleware, getJWTConfig } from '../middleware/auth.js';

const router = Router();
const DEFAULT_DISCORD_CLIENT_ID = '1445916179163250860';
const DEFAULT_DISCORD_SCOPES = ['identify'];
const DEFAULT_API_DISCORD_CALLBACK = 'https://api.tiltcheck.me/auth/discord/callback';

// ============================================================================
// Configuration
// ============================================================================

function getDiscordConfig(): DiscordOAuthConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const clientId =
    process.env.TILT_DISCORD_CLIENT_ID ||
    process.env.DISCORD_CLIENT_ID ||
    DEFAULT_DISCORD_CLIENT_ID;
  const clientSecret =
    process.env.TILT_DISCORD_CLIENT_SECRET ||
    process.env.DISCORD_CLIENT_SECRET ||
    (isProd ? (() => { throw new Error('DISCORD_CLIENT_SECRET is required in production'); })() : '');
  const redirectUri =
    process.env.TILT_DISCORD_REDIRECT_URI ||
    process.env.DISCORD_REDIRECT_URI ||
    process.env.DISCORD_CALLBACK_URL ||
    DEFAULT_API_DISCORD_CALLBACK;

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: DEFAULT_DISCORD_SCOPES,
  };
}

function resolveDiscordRedirectUriForSource(
  config: DiscordOAuthConfig,
  source: string | undefined,
  req: { hostname?: string }
): string {
  if (source !== 'extension') {
    return config.redirectUri;
  }

  const host = req.hostname || '';
  const isLocalDev =
    process.env.NODE_ENV !== 'production' && (host === 'localhost' || host === '127.0.0.1');

  // Extension OAuth must land on API callback in non-local environments.
  return isLocalDev ? config.redirectUri : DEFAULT_API_DISCORD_CALLBACK;
}

function getOAuthSource(req: {
  query?: { state?: unknown };
  cookies?: { oauth_source?: unknown };
}): 'extension' | 'web' | undefined {
  const stateValue = typeof req.query?.state === 'string' ? req.query.state : '';
  const sourceFromState = stateValue.startsWith('ext_')
    ? 'extension'
    : stateValue.startsWith('web_')
      ? 'web'
      : undefined;
  if (sourceFromState) return sourceFromState;
  const cookieSource = req.cookies?.oauth_source;
  return cookieSource === 'extension' || cookieSource === 'web' ? cookieSource : undefined;
}

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
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">TiltCheck Connect Issue</div>
          <div class="msg">${safeMessage}</div>
          <div class="hint">Return to your casino tab, then click Connect Discord again.</div>
        </div>
      </body>
    </html>
  `;
}

function getTrustedExtensionOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'chrome-extension:') {
      return parsed.origin;
    }
  } catch {
    // Ignore invalid input; value is optional and best-effort.
  }

  return undefined;
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get JWT secret from environment
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

/**
 * Generate JWT token for user
 */
function generateJWT(userId: string, email: string, roles: string[]): string {
  const secret = getJWTSecret();

  const token = jwt.sign(
    { userId, email, roles },
    secret,
    { expiresIn: '7d' }
  );

  return token;
}

function isAllowedActivityRedirectUri(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();

    const isHttpsTiltcheck =
      parsed.protocol === 'https:' &&
      (host === 'tiltcheck.me' || host === 'www.tiltcheck.me' || host.endsWith('.tiltcheck.me'));
    const isLocalDev =
      process.env.NODE_ENV !== 'production' &&
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
router.post('/register', authLimiter, async (req, res) => {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(400).json({
        error: 'Password must be at least 6 characters',
        code: 'INVALID_PASSWORD'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
      return;
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
      res.status(500).json({
        error: 'Failed to create user',
        code: 'CREATE_FAILED'
      });
      return;
    }

    // Generate JWT
    const token = generateJWT(user.id, user.email!, user.roles);

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
    res.status(500).json({ error: 'Registration failed' });
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
    const token = generateJWT(user.id, user.email!, user.roles);

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
 * POST /auth/guest
 * Start a guest session without full authentication
 */
router.post('/guest', async (req, res) => {
  try {
    const { username } = req.body;
    const guestUsername = username || `Guest_${Math.floor(Math.random() * 10000)}`;
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate a guest JWT
    const secret = getJWTSecret();
    const token = jwt.sign(
      { userId: guestId, username: guestUsername, roles: ['guest'], isGuest: true },
      secret,
      { expiresIn: '1d' }
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
    const source = req.query.source as string | undefined;
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
    const statePrefix = source === 'extension' ? 'ext_' : 'web_';
    const state = `${statePrefix}${generateOAuthState()}`;

    // Store state in a short-lived cookie
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Allow cross-domain redirects
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    // Store redirect URL if provided
    const redirectUrl = req.query.redirect as string;
    if (redirectUrl) {
      res.cookie('oauth_redirect', redirectUrl, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    // Store source if provided (e.g., 'extension')
    if (source) {
      res.cookie('oauth_source', source, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    // Optional extension opener origin for stricter postMessage targeting.
    const openerOrigin = getTrustedExtensionOrigin(req.query.opener_origin);
    if (openerOrigin) {
      res.cookie('oauth_opener_origin', openerOrigin, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    const authUrl = getDiscordAuthUrl(config, state);
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
    const { code, state } = req.query;
    const storedState = req.cookies?.oauth_state;
    const stateValue = typeof state === 'string' ? state : '';
    const sourceFromState = stateValue.startsWith('ext_')
      ? 'extension'
      : stateValue.startsWith('web_')
        ? 'web'
        : undefined;
    const sourceFromCookie = req.cookies?.oauth_source;
    const isLocalDev =
      process.env.NODE_ENV !== 'production' &&
      (req.hostname === 'localhost' || req.hostname === '127.0.0.1');

    console.log('[Auth Debug] Callback received:', {
      query: req.query,
      cookies: req.cookies,
      sourceFromState,
      isLocalDev,
    });

    // Optional integrity check: if both exist, cookie source must match state source.
    if (sourceFromCookie && sourceFromState && sourceFromCookie !== sourceFromState) {
      console.log('[Auth Debug] State source mismatch:', { sourceFromCookie, sourceFromState });
      res.status(400).json({ error: 'Invalid OAuth source' });
      return;
    }

    // Verify state:
    // - normal: query state must match cookie
    // - local extension fallback: allow if state cookie is missing and state itself indicates extension source
    const stateValid =
      !!stateValue &&
      (stateValue === storedState || (!storedState && isLocalDev && sourceFromState === 'extension'));

    if (!stateValid) {
      console.log('[Auth Debug] Invalid state:', { stateValue, storedState });
      res.status(400).json({ error: 'Invalid OAuth state' });
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

    // Find or create user in database
    const user = await findOrCreateUserByDiscord(
      result.user.id,
      result.user.username,
      result.user.avatar || undefined
    );

    // Create session
    const { cookie } = await createSession(user.id, jwtConfig, {
      type: 'user',
      discordId: result.user.id,
      discordUsername: result.user.username,
      roles: user.roles,
    });

    // Set session cookie
    res.setHeader('Set-Cookie', cookie);

    // Check if source was extension
    res.clearCookie('oauth_source');
    const openerOriginCookie = req.cookies?.oauth_opener_origin;
    res.clearCookie('oauth_opener_origin');
    const postMessageTarget = getTrustedExtensionOrigin(openerOriginCookie);

    if (source === 'extension') {
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
      const token = generateJWT(user.id, user.email || `${user.id}@discord.com`, user.roles);

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
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">TiltCheck</div>
              <div>Authenticating...</div>
              <div class="spinner"></div>
              <div class="hint">This window will close automatically.</div>
            </div>
            <script>
              const userData = ${JSON.stringify({ id: user.id, username: user.discord_username, avatar: user.discord_avatar })};
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
                  setTimeout(() => window.close(), 1000);
                }
              } catch (_error) {
                document.querySelector('.hint').textContent = 'Auth handoff failed. Close this window and retry.';
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    // Redirect to stored URL or default
    const redirectUrl = req.cookies?.oauth_redirect || 'https://tiltcheck.me/play/profile.html';
    res.clearCookie('oauth_redirect');

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[Auth] Discord callback error:', error);
    if (source === 'extension') {
      res
        .status(500)
        .send(renderExtensionAuthErrorPage('Discord sign-in failed unexpectedly. Please retry in a few seconds.'));
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /auth/discord/activity/token
 * Exchange Discord Activity OAuth code for access token.
 *
 * Threat/risk notes:
 * - Redirect URI is validated against trusted hosts.
 * - Discord client secret is only used server-side.
 * - Errors are sanitized for clients.
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

    const exchangeConfig: DiscordOAuthConfig = {
      ...discordConfig,
      redirectUri: redirectUriInput || discordConfig.redirectUri,
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
      const secret = getJWTSecret();

      try {
        const payload = jwt.verify(token, secret) as { userId: string; email: string; roles: string[] };
        const user = await findUserById(payload.userId);

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
      } catch (jwtError) {
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
