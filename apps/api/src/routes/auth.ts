/**
 * Auth Routes - /auth/*
 * Handles Discord OAuth, session management, and user info
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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
import { findOrCreateUserByDiscord } from '@tiltcheck/db';

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
// Routes
// ============================================================================

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
    
    // Generate state for CSRF protection
    const state = generateOAuthState();
    
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
    
    // Verify state
    if (!state || state !== storedState) {
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
 * Returns current user info from session
 */
router.get('/me', async (req, res) => {
  try {
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
