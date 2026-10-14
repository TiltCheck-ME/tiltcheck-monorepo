// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

/**
 * Touch Grass overlay/embed routes use /nuts-style minimal chrome.
 * `mode === undefined` means search params are not readable yet (SSR / Suspense
 * fallback). Fallback must hide chrome for `/touch-grass` so pause overlays
 * never flash Header, Footer, Bonuses, or 1-800-GAMBLER. After hydration,
 * only `mode === 'pause'` stays minimal; public `/touch-grass` gets full chrome.
 */
export function isTouchGrassEmbedPath(pathname: string, mode?: string | null): boolean {
  if (pathname === '/touch-grass/trivia' || pathname === '/touch-grass/dad') {
    return true;
  }
  if (pathname !== '/touch-grass') {
    return false;
  }
  if (mode === undefined) {
    return true;
  }
  return mode === 'pause';
}
