/**
 * @tiltcheck/auth - Type Definitions
 * Core types for authentication across the TiltCheck ecosystem
 */

// ============================================================================
// JWT Types
// ============================================================================

/**
 * JWT Payload for user sessions
 */
export interface JWTPayload {
  /** Subject - User ID */
  sub: string;
  /** Issued At timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** Issuer */
  iss: string;
  /** Audience */
  aud: string | string[];
  /** JWT ID for revocation tracking */
  jti?: string;
  /** Session type */
  type: SessionType;
  /** User roles */
  roles?: string[];
  /** Additional custom claims */
  [key: string]: unknown;
}

/**
 * Session types supported by the auth system
 */
export type SessionType = 'user' | 'admin' | 'service';

/**
 * JWT configuration options
 */
export interface JWTConfig {
  /** Secret key for signing (HS256) or private key (RS256/ES256) */
  secret: string;
  /** Token issuer */
  issuer: string;
  /** Token audience */
  audience: string;
  /** Token expiration time (e.g., '7d', '1h', '30m') */
  expiresIn: string;
  /** Algorithm to use */
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256';
}

/**
 * Result of JWT verification
 */
export interface JWTVerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

// ============================================================================
// Cookie Types
// ============================================================================

/**
 * Cookie configuration for subdomain-wide sessions
 */
export interface CookieConfig {
  /** Cookie name */
  name: string;
  /** Cookie domain (e.g., '.tiltcheck.me') */
  domain: string;
  /** Path */
  path: string;
  /** Secure flag (HTTPS only) */
  secure: boolean;
  /** HttpOnly flag */
  httpOnly: boolean;
  /** SameSite attribute */
  sameSite: 'strict' | 'lax' | 'none';
  /** Max age in seconds */
  maxAge: number;
}

/**
 * Session cookie data (stored in JWT)
 */
export interface SessionData {
  /** User ID */
  userId: string;
  /** Session type */
  type: SessionType;
  /** Discord user ID (if linked) */
  discordId?: string;
  /** Discord username */
  discordUsername?: string;
  /** Wallet address (if linked) */
  walletAddress?: string;
  /** User roles */
  roles?: string[];
  /** Created at timestamp */
  createdAt: number;
}

/**
 * Cookie options for setting/clearing
 */
export interface CookieOptions {
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  expires?: Date;
}

// ============================================================================
// Discord OAuth Types
// ============================================================================

/**
 * Discord OAuth configuration
 */
export interface DiscordOAuthConfig {
  /** Discord application client ID */
  clientId: string;
  /** Discord application client secret */
  clientSecret: string;
  /** OAuth redirect URI */
  redirectUri: string;
  /** OAuth scopes */
  scopes: string[];
}

/**
 * Discord user data from OAuth
 */
export interface DiscordUser {
  /** Discord user ID */
  id: string;
  /** Username */
  username: string;
  /** Discriminator (legacy) */
  discriminator: string;
  /** Global display name */
  globalName?: string;
  /** Avatar hash */
  avatar?: string;
  /** Email (if email scope granted) */
  email?: string;
  /** Email verified status */
  verified?: boolean;
  /** User flags */
  flags?: number;
  /** Premium type */
  premiumType?: number;
}

/**
 * Discord OAuth tokens
 */
export interface DiscordTokens {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Token type */
  tokenType: string;
  /** Expiration in seconds */
  expiresIn: number;
  /** Granted scopes */
  scope: string;
}

/**
 * Discord OAuth verification result
 */
export interface DiscordVerifyResult {
  valid: boolean;
  user?: DiscordUser;
  tokens?: DiscordTokens;
  error?: string;
}

// ============================================================================
// Solana Signature Types
// ============================================================================

/**
 * Solana signature verification request
 */
export interface SolanaSignatureRequest {
  /** The message that was signed */
  message: string;
  /** Base58 encoded signature */
  signature: string;
  /** Base58 encoded public key (wallet address) */
  publicKey: string;
}

/**
 * Solana signature verification result
 */
export interface SolanaVerifyResult {
  valid: boolean;
  publicKey?: string;
  error?: string;
}

/**
 * Solana sign-in message template
 */
export interface SolanaSignInMessage {
  /** Domain requesting sign-in */
  domain: string;
  /** Wallet address */
  address: string;
  /** Statement to sign */
  statement: string;
  /** Unique nonce */
  nonce: string;
  /** Issued at timestamp */
  issuedAt: string;
  /** Expiration timestamp */
  expirationTime?: string;
  /** Request ID */
  requestId?: string;
  /** Chain ID */
  chainId?: string;
  /** Resources URIs */
  resources?: string[];
}

// ============================================================================
// Service-to-Service Types
// ============================================================================

/**
 * Service token configuration
 */
export interface ServiceTokenConfig {
  /** Shared secret for service tokens */
  secret: string;
  /** Service identifier */
  serviceId: string;
  /** Allowed services to communicate with */
  allowedServices: string[];
  /** Token expiration time */
  expiresIn: string;
}

/**
 * Service token payload
 */
export interface ServiceTokenPayload {
  /** Service ID */
  serviceId: string;
  /** Target service */
  targetService: string;
  /** Issued at */
  iat: number;
  /** Expiration */
  exp: number;
  /** Token type */
  type: 'service';
  /** Request context (optional) */
  context?: Record<string, unknown>;
}

/**
 * Service token verification result
 */
export interface ServiceVerifyResult {
  valid: boolean;
  serviceId?: string;
  targetService?: string;
  context?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Admin Session Types
// ============================================================================

/**
 * Admin session data
 */
export interface AdminSession {
  /** Admin user ID */
  adminId: string;
  /** Admin email */
  email: string;
  /** Admin roles */
  roles: string[];
  /** Permissions */
  permissions: string[];
  /** Session created at */
  createdAt: number;
  /** Last activity */
  lastActivity: number;
}

/**
 * Admin authentication method
 */
export type AdminAuthMethod = 'magic_link' | 'admin_token';

/**
 * Magic link request
 */
export interface MagicLinkRequest {
  /** Admin email */
  email: string;
  /** Redirect URL after verification */
  redirectUrl?: string;
}

/**
 * Magic link verification result
 */
export interface MagicLinkVerifyResult {
  valid: boolean;
  adminId?: string;
  email?: string;
  error?: string;
}

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Authenticated request context
 */
export interface AuthContext {
  /** User ID */
  userId: string;
  /** Session type */
  sessionType: SessionType;
  /** Discord ID (if linked) */
  discordId?: string;
  /** Wallet address (if linked) */
  walletAddress?: string;
  /** User roles */
  roles: string[];
  /** Is admin */
  isAdmin: boolean;
  /** Session data */
  session: SessionData;
}

/**
 * Middleware options
 */
export interface AuthMiddlewareOptions {
  /** Require authentication (default: true) */
  required?: boolean;
  /** Required roles (any of) */
  roles?: string[];
  /** Required session type */
  sessionType?: SessionType;
  /** Custom cookie name */
  cookieName?: string;
  /** Custom unauthorized handler */
  onUnauthorized?: (error: AuthError) => void;
}

/**
 * Authentication error
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  status: number;
}

/**
 * Authentication error codes
 */
export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SESSION_NOT_FOUND'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_SIGNATURE'
  | 'OAUTH_ERROR'
  | 'SERVICE_ERROR';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic result type for auth operations
 */
export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Window size in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  maxRequests: number;
  /** Key generator function */
  keyGenerator?: (req: unknown) => string;
}
