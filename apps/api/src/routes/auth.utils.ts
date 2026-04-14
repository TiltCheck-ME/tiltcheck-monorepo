/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Utility functions for the authentication routes.
 */

import type { DiscordOAuthConfig } from '@tiltcheck/auth';

export const DEFAULT_DISCORD_CLIENT_ID = '1445916179163250860';
export const DEFAULT_DISCORD_SCOPES = ['identify'];
export const DEFAULT_API_DISCORD_CALLBACK = 'https://api.tiltcheck.me/auth/discord/callback';
export type OAuthSource = 'extension' | 'web';

function sanitizeUrlEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const compact = value.replace(/\s+/g, '').trim();
  return compact.length > 0 ? compact : undefined;
}

export function normalizeOAuthSource(value: unknown): OAuthSource | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'extension' || normalized === 'ext') return 'extension';
  if (normalized === 'web' || normalized === 'discord-bot' || normalized === 'discord_bot') return 'web';

  return undefined;
}

/**
 * Constructs the Discord OAuth configuration from environment variables.
 */
export function getDiscordConfig(): DiscordOAuthConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const clientId =
    process.env.TILT_DISCORD_CLIENT_ID?.trim() ||
    process.env.DISCORD_CLIENT_ID?.trim() ||
    DEFAULT_DISCORD_CLIENT_ID;
  const clientSecret =
    process.env.TILT_DISCORD_CLIENT_SECRET?.trim() ||
    process.env.DISCORD_CLIENT_SECRET?.trim() ||
    (isProd ? (() => { throw new Error('DISCORD_CLIENT_SECRET is required in production'); })() : '');
  const redirectUri =
    sanitizeUrlEnv(process.env.TILT_DISCORD_REDIRECT_URI) ||
    sanitizeUrlEnv(process.env.DISCORD_REDIRECT_URI) ||
    sanitizeUrlEnv(process.env.DISCORD_CALLBACK_URL) ||
    DEFAULT_API_DISCORD_CALLBACK;

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: DEFAULT_DISCORD_SCOPES,
  };
}

/**
 * Resolves the correct Discord redirect URI based on the request source.
 */
export function resolveDiscordRedirectUriForSource(
  config: DiscordOAuthConfig,
  source: string | undefined,
  req: { hostname?: string }
): string {
  if (normalizeOAuthSource(source) !== 'extension') {
    return config.redirectUri;
  }

  const host = req.hostname || '';
  const isLocalDev =
    process.env.NODE_ENV !== 'production' && (host === 'localhost' || host === '127.0.0.1');

  // Extension OAuth must land on API callback in non-local environments.
  return isLocalDev ? config.redirectUri : DEFAULT_API_DISCORD_CALLBACK;
}

/**
 * Determines the source of the OAuth request from state or cookies.
 */
export function getOAuthSource(req: {
  query?: { state?: unknown };
  cookies?: { oauth_source?: unknown };
}): OAuthSource | undefined {
  const stateValue = typeof req.query?.state === 'string' ? req.query.state : '';
  const sourceFromState = stateValue.startsWith('ext_')
    ? 'extension'
    : stateValue.startsWith('web_')
      ? 'web'
      : undefined;
  if (sourceFromState) return sourceFromState;
  return normalizeOAuthSource(req.cookies?.oauth_source);
}

/**
 * Validates and returns a trusted `chrome-extension://` origin.
 */
export function getTrustedExtensionOrigin(value: unknown): string | undefined {
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
