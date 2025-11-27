/**
 * Game Arena Server Configuration
 * Central configuration for the game arena service
 */

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3010', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Discord OAuth
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    callbackUrl: process.env.DISCORD_CALLBACK_URL || 'https://arena.tiltcheck.me/auth/discord/callback',
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    cookieName: 'tiltcheck.arena.sid',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Supabase (optional)
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
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

  if (!config.discord.clientId && !config.isDev) {
    errors.push('DISCORD_CLIENT_ID is required in production');
  }

  if (!config.discord.clientSecret && !config.isDev) {
    errors.push('DISCORD_CLIENT_SECRET is required in production');
  }

  if (config.session.secret === 'dev-secret-change-in-production' && !config.isDev) {
    errors.push('SESSION_SECRET must be set in production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}
