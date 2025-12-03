/**
 * @tiltcheck/auth
 * 
 * Shared authentication package for the TiltCheck ecosystem.
 * Provides JWT-based sessions, Discord OAuth, Solana signature verification,
 * and middleware for Express, Next.js, and vanilla Node.js.
 * 
 * All session cookies use: Secure, HttpOnly, SameSite=Lax, Domain=.tiltcheck.me
 * 
 * @example
 * ```typescript
 * // Create a session
 * import { createSession, verifySessionCookie } from '@tiltcheck/auth';
 * 
 * const { cookie, token, sessionData } = await createSession(userId, jwtConfig, {
 *   type: 'user',
 *   discordId: 'discord-id',
 *   roles: ['user'],
 * });
 * 
 * // Verify a session
 * const result = await verifySessionCookie(cookieHeader, jwtConfig);
 * if (result.valid) {
 *   console.log('User:', result.session.userId);
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Express middleware
 * import { sessionAuth } from '@tiltcheck/auth/middleware/express';
 * 
 * app.use('/api', sessionAuth());
 * app.get('/api/me', (req, res) => {
 *   res.json({ user: req.auth });
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Next.js middleware
 * import { createAuthMiddleware } from '@tiltcheck/auth/middleware/next';
 * 
 * export default createAuthMiddleware({
 *   publicPaths: ['/login', '/api/health'],
 * });
 * ```
 */

// Core JWT functions
export {
  createToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenTTL,
  createSessionToken,
  createAdminToken,
} from './jwt.js';

// Cookie session functions
export {
  DEFAULT_COOKIE_CONFIG,
  DEV_COOKIE_CONFIG,
  getCookieConfig,
  serializeCookie,
  parseCookies,
  createSession,
  destroySession,
  verifySessionCookie,
  extractSessionToken,
  refreshSession,
} from './cookies.js';

// Discord OAuth functions
export {
  DEFAULT_SCOPES as DISCORD_DEFAULT_SCOPES,
  getAuthorizationUrl as getDiscordAuthUrl,
  exchangeCode as exchangeDiscordCode,
  refreshTokens as refreshDiscordTokens,
  getDiscordUser,
  verifyDiscordOAuth,
  revokeToken as revokeDiscordToken,
  getAvatarUrl as getDiscordAvatarUrl,
  generateState as generateOAuthState,
} from './discord.js';

// Solana signature functions
export {
  verifySolanaSignature,
  createSignInMessage as createSolanaSignInMessage,
  formatSignInMessage as formatSolanaMessage,
  parseSignInMessage as parseSolanaMessage,
  validateSignInMessage as validateSolanaMessage,
  generateNonce,
  verifySolanaSignIn,
} from './solana.js';

// Service-to-service functions
export {
  createServiceToken,
  verifyServiceToken,
  createServiceAuthHeader,
  extractServiceToken,
  verifyServiceAuthHeader,
  SERVICES,
  createServiceConfigFromEnv,
} from './service.js';

// Type exports
export type {
  // JWT types
  JWTPayload,
  JWTConfig,
  JWTVerifyResult,
  SessionType,
  
  // Cookie types
  CookieConfig,
  CookieOptions,
  SessionData,
  
  // Discord types
  DiscordOAuthConfig,
  DiscordUser,
  DiscordTokens,
  DiscordVerifyResult,
  
  // Solana types
  SolanaSignatureRequest,
  SolanaVerifyResult,
  SolanaSignInMessage,
  
  // Service types
  ServiceTokenConfig,
  ServiceTokenPayload,
  ServiceVerifyResult,
  
  // Admin types
  AdminSession,
  AdminAuthMethod,
  MagicLinkRequest,
  MagicLinkVerifyResult,
  
  // Middleware types
  AuthContext,
  AuthMiddlewareOptions,
  AuthError,
  AuthErrorCode,
  AuthResult,
  RateLimitConfig,
} from './types.js';

export type { ServiceName } from './service.js';
