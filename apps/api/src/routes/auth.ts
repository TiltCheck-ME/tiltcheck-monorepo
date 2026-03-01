/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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
  createSession,
  destroySession,
  verifySessionCookie,
  getDiscordAvatarUrl,
  generateOAuthState,
  type JWTConfig,
  type DiscordOAuthConfig,
} from '@tiltcheck/auth';
import {
  findOrCreateUserByDiscord,
  findUserByEmail,
  createUser,
  updateUser,
  findUserById,
} from '@tiltcheck/db';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// Configuration
// ============================================================================

function getJWTConfig(): JWTConfig {
  return {
    secret: process.env.JWT_SECRET || '',
    issuer: process.env.JWT_ISSUER || 'tiltcheck.me',
    audience: process.env.JWT_AUDIENCE || 'tiltcheck.me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}

function getDiscordConfig(): DiscordOAuthConfig {
  return {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'https://api.tiltcheck.me/auth/discord/callback',
    scopes: ['identify', 'email'],
  };
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
    const config = getDiscordConfig();

    if (!config.clientId) {
      res.status(500).json({ error: 'Discord OAuth not configured' });
      return;
    }

    // Generate state for CSRF protection. Prefix helps recover source in callback if cookies are blocked.
    const source = req.query.source as string | undefined;
    const statePrefix = source === 'extension' ? 'ext_' : 'web_';
    const state = `${statePrefix}${generateOAuthState()}`;

    // Store state in a short-lived cookie
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
  try {
    const { code, state } = req.query;
    const storedState = req.cookies?.oauth_state;
    const stateValue = typeof state === 'string' ? state : '';
    const sourceFromState = stateValue.startsWith('ext_') ? 'extension' : undefined;
    const sourceFromCookie = req.cookies?.oauth_source;
    const source = sourceFromCookie || sourceFromState;
    const isLocalDev =
      process.env.NODE_ENV !== 'production' &&
      (req.hostname === 'localhost' || req.hostname === '127.0.0.1');

    // Verify state:
    // - normal: query state must match cookie
    // - local extension fallback: allow if state cookie is missing but state indicates extension source
    const stateValid =
      !!stateValue &&
      (stateValue === storedState || (!storedState && isLocalDev && source === 'extension'));

    if (!stateValid) {
      res.status(400).json({ error: 'Invalid OAuth state' });
      return;
    }

    // Clear state cookie
    res.clearCookie('oauth_state');

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    const discordConfig = getDiscordConfig();
    const jwtConfig = getJWTConfig();

    // Exchange code for tokens and get user info
    const result = await verifyDiscordOAuth(code, discordConfig);

    if (!result.valid || !result.user) {
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

    if (source === 'extension') {
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
              window.opener.postMessage({ 
                type: 'discord-auth', 
                token: '${token}',
                user: userData
              }, '*');
              setTimeout(() => window.close(), 1000);
            </script>
          </body>
        </html>
      `);
      return;
    }

    // Redirect to stored URL or default
    const redirectUrl = req.cookies?.oauth_redirect || 'https://justthetip.tiltcheck.me';
    res.clearCookie('oauth_redirect');

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[Auth] Discord callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
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
