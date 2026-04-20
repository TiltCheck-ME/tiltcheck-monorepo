// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20

const DEFAULT_ACTIVITY_URL = 'https://activity.tiltcheck.me';
const DEFAULT_API_URL = 'https://api.tiltcheck.me';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function getCurrentOrigin(): string | null {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return null;
  }

  const origin = window.location.origin;
  if (!/^https?:\/\//.test(origin)) {
    return null;
  }

  return normalizeBaseUrl(origin);
}

function dedupeUrls(urls: Array<string | null | undefined>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)).map((url) => normalizeBaseUrl(url)))];
}

export const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1445916179163250860';
export const DASHBOARD_URL = normalizeBaseUrl(import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard.tiltcheck.me/dashboard');
export const HUB_URL = normalizeBaseUrl(import.meta.env.VITE_HUB_URL || getCurrentOrigin() || DEFAULT_ACTIVITY_URL);

export function getApiBaseCandidates(): string[] {
  return dedupeUrls([
    getCurrentOrigin() ? `${getCurrentOrigin()}/api` : null,
    import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  ]);
}

export function getApiEndpointCandidates(pathname: string): string[] {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return getApiBaseCandidates().map((baseUrl) => `${baseUrl}${normalizedPath}`);
}
