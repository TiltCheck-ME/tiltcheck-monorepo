/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
/**
 * Utility functions for the authentication routes.
 */

import type { DiscordOAuthConfig } from '@tiltcheck/auth';

export const DEFAULT_DISCORD_CLIENT_ID = '1445916179163250860';
export const DEFAULT_DISCORD_SCOPES = ['identify'];
export const DEFAULT_DISCORD_CALLBACK_PATH = '/auth/discord/callback';
export const DEFAULT_API_DISCORD_CALLBACK = `https://api.tiltcheck.me${DEFAULT_DISCORD_CALLBACK_PATH}`;
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

type RedirectRequest = {
  get?: (name: string) => string | undefined;
  headers?: Record<string, string | string[] | undefined>;
  hostname?: string;
  protocol?: string;
  query?: {
    redirect?: unknown;
  };
};

function readRequestHeader(req: RedirectRequest, name: string): string | undefined {
  const fromGetter = req.get?.(name);
  if (typeof fromGetter === 'string' && fromGetter.trim()) {
    return fromGetter.trim();
  }

  const fromHeaders = req.headers?.[name.toLowerCase()];
  if (Array.isArray(fromHeaders)) {
    return fromHeaders[0]?.trim();
  }

  return typeof fromHeaders === 'string' && fromHeaders.trim() ? fromHeaders.trim() : undefined;
}

function getPublicRequestProtocol(req: RedirectRequest): string | undefined {
  const forwardedProto = readRequestHeader(req, 'x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim().replace(/:$/, '') || undefined;
  }

  return req.protocol?.trim().replace(/:$/, '') || undefined;
}

function getPublicRequestHost(req: RedirectRequest): string | undefined {
  const forwardedHost = readRequestHeader(req, 'x-forwarded-host');
  if (forwardedHost) {
    return forwardedHost.split(',')[0]?.trim() || undefined;
  }

  const hostHeader = readRequestHeader(req, 'host');
  if (hostHeader) {
    return hostHeader.split(',')[0]?.trim() || undefined;
  }

  return req.hostname?.trim() || undefined;
}

function getPreferredWebRedirectOrigin(req: RedirectRequest): { protocol: string; host: string } | undefined {
  const redirectValue = typeof req.query?.redirect === 'string' ? req.query.redirect.trim() : '';
  if (!redirectValue || redirectValue.startsWith('/')) {
    return undefined;
  }

  try {
    const parsed = new URL(redirectValue);
    const host = parsed.host.trim();
    const hostname = parsed.hostname.toLowerCase();
    const isTiltcheckWebHost =
      parsed.protocol === 'https:' &&
      (hostname === 'tiltcheck.me' || hostname === 'www.tiltcheck.me' || hostname.endsWith('.tiltcheck.me')) &&
      hostname !== 'api.tiltcheck.me';
    const isLocalDev =
      process.env.NODE_ENV !== 'production' &&
      parsed.protocol === 'http:' &&
      (hostname === 'localhost' || hostname === '127.0.0.1');

    if (!host || (!isTiltcheckWebHost && !isLocalDev)) {
      return undefined;
    }

    return {
      protocol: parsed.protocol.replace(/:$/, ''),
      host,
    };
  } catch {
    return undefined;
  }
}

function getHostname(host: string): string {
  try {
    return new URL(`https://${host}`).hostname.toLowerCase();
  } catch {
    return host.split(':')[0]?.toLowerCase() || '';
  }
}

function getPublicWebRedirectPath(config: DiscordOAuthConfig, publicHost: string): string {
  const configuredCallback = new URL(config.redirectUri);
  const callbackPath = `${configuredCallback.pathname}${configuredCallback.search}`;
  const normalizedHost = getHostname(publicHost);
  const configuredHost = configuredCallback.hostname.toLowerCase();
  const isDirectApiHost =
    normalizedHost === configuredHost ||
    normalizedHost === 'api.tiltcheck.me' ||
    publicHost === 'localhost:8080' ||
    publicHost === '127.0.0.1:8080' ||
    normalizedHost.includes('tiltcheck-api') ||
    normalizedHost.includes('api-gateway');

  if (isDirectApiHost || callbackPath.startsWith('/api/')) {
    return callbackPath;
  }

  return `/api${callbackPath}`;
}

/**
 * Resolves the correct Discord redirect URI based on the request source.
 */
export function resolveDiscordRedirectUriForSource(
  config: DiscordOAuthConfig,
  source: string | undefined,
  req: RedirectRequest
): string {
  if (normalizeOAuthSource(source) !== 'extension') {
    const preferredOrigin = getPreferredWebRedirectOrigin(req);
    const publicHost = preferredOrigin?.host || getPublicRequestHost(req);
    const publicProtocol = preferredOrigin?.protocol || getPublicRequestProtocol(req);
    if (!publicHost || !publicProtocol) {
      return config.redirectUri;
    }

    return new URL(getPublicWebRedirectPath(config, publicHost), `${publicProtocol}://${publicHost}`).toString();
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
