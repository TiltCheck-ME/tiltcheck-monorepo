/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */

const PROD_API_URL = 'https://api.tiltcheck.me';
const PROD_SITE_URL = 'https://tiltcheck.me';
const DEV_API_URL = 'http://localhost:8080';
const DEV_SITE_URL = 'http://localhost:3000';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getFallbackApiUrl(): string {
  return process.env.NODE_ENV === 'production' ? PROD_API_URL : DEV_API_URL;
}

function getFallbackSiteUrl(): string {
  return process.env.NODE_ENV === 'production' ? PROD_SITE_URL : DEV_SITE_URL;
}

export function getDiscordLoginApiBase(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredApiUrl && /^https?:\/\//i.test(configuredApiUrl)) {
    return trimTrailingSlash(configuredApiUrl);
  }

  return getFallbackApiUrl();
}

export function getAbsoluteAuthRedirect(redirectTo: string): string {
  const target = redirectTo.trim();
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : getFallbackSiteUrl();
  const normalizedTarget = target.startsWith('/') ? target : `/${target}`;

  return new URL(normalizedTarget, base).toString();
}

export function getDiscordLoginUrl(redirectTo: string): string {
  const loginUrl = new URL('/auth/discord/login', `${getDiscordLoginApiBase()}/`);
  loginUrl.searchParams.set('source', 'web');
  loginUrl.searchParams.set('redirect', getAbsoluteAuthRedirect(redirectTo));
  return loginUrl.toString();
}
