/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Utility functions for the authentication routes.
 */

import type { Request } from 'express';
import type { DiscordOAuthConfig } from '@tiltcheck/auth';

export const DEFAULT_DISCORD_CLIENT_ID = '1445916179163250860';
export const DEFAULT_DISCORD_SCOPES = ['identify'];
export const DEFAULT_API_DISCORD_CALLBACK = 'https://api.tiltcheck.me/auth/discord/callback';

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
    process.env.TILT_DISCORD_REDIRECT_URI?.trim() ||
    process.env.DISCORD_REDIRECT_URI?.trim() ||
    process.env.DISCORD_CALLBACK_URL?.trim() ||
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
  if (source !== 'extension') {
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