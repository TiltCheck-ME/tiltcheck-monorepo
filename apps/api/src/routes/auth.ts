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
import { getJWTConfig } from '../middleware/auth.js';
import {
  getDiscordConfig,
  resolveDiscordRedirectUriForSource,
  getOAuthSource,
  getTrustedExtensionOrigin,
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
            "Casinos don't win because they're lucky. They win because they're open 24/7 and your calculator battery died at 2:17 a.m."
          </div>
        </div>
      </body>
    </html>
  `;
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
    const redirectUrl = req.query.redirect as string;
    if (redirectUrl) {
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
    const sourceFromCookie = req.cookies?.oauth_source;

    // Optional integrity check: if both exist, cookie source must match state source.
    if (sourceFromCookie && sourceFromState && sourceFromCookie !== sourceFromState) {
      res.status(400).json({ error: 'Invalid OAuth source' });
      return;
    }

    // Verify state CSRF token:
    // Query state MUST match the stored cookie value to prevent CSRF.
    // Fallback prefixes (ext_/web_) are removed as they are insecure.
    const stateValid = !!stateValue && stateValue === storedState;

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
                "Trust everybody, but cut the cards."
              </div>
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
                  setTimeout(() => window.close(), 1500);
                }
              } catch (err) {
                console.error('Auth handoff failed:', err);
                document.querySelector('.hint').innerHTML = ' \
                  <div style="margin-top:15px; padding:10px; border:1px solid rgba(255,255,255,0.1); border-radius:8px;"> \
                    <p style="color:#ef4444; font-weight:bold; margin-bottom:10px;">PostMessage Handshake Blocked</p> \
                    <button onclick="tryManualSync()" style="background:#6366f1; color:white; border:none; padding:8px 16px; border-radius:4px; font-weight:bold; cursor:pointer; width:100%;">SYNC HANDSHAKE NOW</button> \
                    <p style="margin-top:10px; font-size:11px;">If sync fails, ensure you are using <b>tiltcheck.me</b> and not a Cloud Run sandbox URL.</p> \
                  </div> \
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
