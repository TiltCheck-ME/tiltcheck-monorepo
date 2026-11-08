// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19

const FALLBACK_DASHBOARD_BASE_URL = 'https://dashboard.tiltcheck.me';

function normalizeDashboardBaseUrl(configuredUrl: string | undefined): string {
  if (!configuredUrl) {
    return FALLBACK_DASHBOARD_BASE_URL;
  }

  try {
    const parsed = new URL(configuredUrl);

    if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname) && process.env.NODE_ENV === 'production') {
      return FALLBACK_DASHBOARD_BASE_URL;
    }

    if (parsed.hostname.toLowerCase() === 'hub.tiltcheck.me') {
      parsed.hostname = 'dashboard.tiltcheck.me';
    }

    parsed.pathname = '/';
    parsed.search = '';
    parsed.hash = '';

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return FALLBACK_DASHBOARD_BASE_URL;
  }
}

export function getDashboardBaseUrl(): string {
  return normalizeDashboardBaseUrl(process.env.DASHBOARD_URL?.trim());
}

export function getDashboardAppUrl(options: { tab?: string; userId?: string } = {}): string {
  const url = new URL('/dashboard', `${getDashboardBaseUrl()}/`);

  if (options.tab) {
    url.searchParams.set('tab', options.tab);
  }

  if (options.userId) {
    url.searchParams.set('userId', options.userId);
  }

  return url.toString();
}
