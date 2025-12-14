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
