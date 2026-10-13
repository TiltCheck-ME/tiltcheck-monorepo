// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04

export type PublicRouteDecision =
  | { action: 'next' }
  | { action: 'redirect'; status: 307; destination: '/' };

const STAY_EXACT = new Set([
  '/',
  '/privacy',
  '/terms',
  '/legal',
  '/login',
  '/dashboard',
  '/touch-grass',
  '/sitemap.xml',
  '/robots.txt',
]);

export function normalizePublicPath(pathname: string): string {
  const withoutSuffix = pathname.split('?')[0]?.split('#')[0] ?? '/';
  if (withoutSuffix === '/') return '/';
  const trimmed = withoutSuffix.endsWith('/') ? withoutSuffix.slice(0, -1) : withoutSuffix;
  return trimmed.length > 0 ? trimmed : '/';
}

function hasFileExtension(pathname: string): boolean {
  const last = pathname.split('/').pop() ?? '';
  return last.includes('.');
}

export function decidePublicRoute(pathname: string): PublicRouteDecision {
  const path = normalizePublicPath(pathname);
  if (STAY_EXACT.has(path)) return { action: 'next' };
  if (path === '/api' || path.startsWith('/api/')) return { action: 'next' };
  if (path === '/ask/v' || path.startsWith('/ask/v/')) return { action: 'next' };
  if (path === '/downloads' || path.startsWith('/downloads/')) return { action: 'next' };
  if (path === '/_next' || path.startsWith('/_next/')) return { action: 'next' };
  if (hasFileExtension(path)) return { action: 'next' };
  return { action: 'redirect', status: 307, destination: '/' };
}
