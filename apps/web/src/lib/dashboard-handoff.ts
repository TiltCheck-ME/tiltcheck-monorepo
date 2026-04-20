/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */

export type DashboardLane =
  | 'profile'
  | 'analytics'
  | 'safety'
  | 'vault'
  | 'buddies'
  | 'bonuses'
  | 'agent';

const PROD_DASHBOARD_URL = 'https://dashboard.tiltcheck.me';
const DEV_DASHBOARD_URL = 'http://localhost:6001';

const DASHBOARD_ROUTE_TABS: Record<string, DashboardLane> = {
  '/dashboard': 'profile',
  '/tools/auto-vault': 'vault',
  '/tools/buddy-system': 'buddies',
};

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeDashboardBaseUrl(value: string): string {
  try {
    const parsed = new URL(value);

    if (parsed.hostname.toLowerCase() === 'hub.tiltcheck.me') {
      parsed.hostname = 'dashboard.tiltcheck.me';
    }

    parsed.search = '';
    parsed.hash = '';

    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(value);
  }
}

function normalizeDashboardAbsoluteUrl(value: string): string {
  try {
    const parsed = new URL(value);

    if (parsed.hostname.toLowerCase() === 'hub.tiltcheck.me') {
      parsed.hostname = 'dashboard.tiltcheck.me';
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

function normalizeDashboardLane(value: string | null): DashboardLane | null {
  switch (value) {
    case 'profile':
    case 'analytics':
    case 'safety':
    case 'vault':
    case 'buddies':
    case 'bonuses':
    case 'agent':
      return value;
    default:
      return null;
  }
}

function getRequestedLane(path: string): DashboardLane {
  const parsed = new URL(path.startsWith('/') ? path : `/${path}`, 'https://tiltcheck.local');
  return normalizeDashboardLane(parsed.searchParams.get('tab')) ?? DASHBOARD_ROUTE_TABS[parsed.pathname] ?? 'profile';
}

export function getDashboardBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();
  const fallbackUrl = process.env.NODE_ENV === 'production' ? PROD_DASHBOARD_URL : DEV_DASHBOARD_URL;
  return normalizeDashboardBaseUrl(configuredUrl && /^https?:\/\//i.test(configuredUrl) ? configuredUrl : fallbackUrl);
}

export function getDashboardHandoffUrl(path = '/dashboard'): string {
  if (/^https?:\/\//i.test(path)) {
    return normalizeDashboardAbsoluteUrl(path);
  }

  const lane = getRequestedLane(path);
  const dashboardUrl = new URL('/dashboard', `${getDashboardBaseUrl()}/`);

  if (lane !== 'profile') {
    dashboardUrl.searchParams.set('tab', lane);
  }

  return dashboardUrl.toString();
}

export function getDashboardLaneLabel(path = '/dashboard'): string {
  switch (getRequestedLane(path)) {
    case 'vault':
      return 'Vault Controls';
    case 'buddies':
      return 'Buddy System';
    case 'safety':
      return 'Safety Controls';
    case 'analytics':
      return 'Analytics';
    case 'bonuses':
      return 'Bonus Inbox';
    case 'agent':
      return 'AI Agent';
    default:
      return 'Dashboard';
  }
}

export function getWebLoginRedirect(path = '/dashboard'): string {
  return `/login?redirect=${encodeURIComponent(path)}`;
}
