/**
 * Backend Server Configuration
 * Central configuration for the backend WebSocket + API service
 * 
 * Now uses Supabase Discord OAuth for authentication
 */

export const config = {
  // Server - uses PORT env var (Railway sets 8080)
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // API and WebSocket URLs (configurable via environment)
  apiUrl: process.env.API_URL || 'https://tiltcheck.me/api',
  wsUrl: process.env.WS_URL || 'wss://tiltcheck.me/ws',

  // MongoDB Configuration (optional - for persistent storage)
  mongodb: {
    uri: process.env.MONGODB_URI || '',
  },

  // Supabase Auth Configuration (required)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },

  // OAuth Redirect URLs
  auth: {
    // Redirect URL after successful Discord OAuth via Supabase
    redirectUrl: process.env.AUTH_REDIRECT_URL || 'https://tiltcheck.me/arena/auth/callback',
    // URL for failed auth
    failureUrl: process.env.AUTH_FAILURE_URL || '/?error=auth_failed',
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    cookieName: 'tiltcheck.arena.sid',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Redis (optional)
  redis: {
    url: process.env.REDIS_URL,
  },

  // Game settings
  game: {
    maxGamesPerChannel: 5,
    gameTimeout: 60 * 60 * 1000, // 1 hour
    maxPlayersPerGame: 10,
  },
};

// Validate required config
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.supabase.url) {
    if (!config.isDev) {
      errors.push('SUPABASE_URL is required in production');
    } else {
      console.warn('⚠️  SUPABASE_URL not set - authentication will not work');
    }
  }

  if (!config.supabase.anonKey) {
    if (!config.isDev) {
      errors.push('SUPABASE_ANON_KEY is required in production');
    } else {
      console.warn('⚠️  SUPABASE_ANON_KEY not set - authentication will not work');
    }
  }

  if (config.session.secret === 'dev-secret-change-in-production' && !config.isDev) {
    errors.push('SESSION_SECRET must be set in production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}
