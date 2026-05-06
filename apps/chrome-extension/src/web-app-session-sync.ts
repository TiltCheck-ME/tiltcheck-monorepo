/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 */
/**
 * Mirrors the extension JWT into the marketing site localStorage (`tc_token`),
 * matching `apps/web/src/lib/auth-session.ts` so tiltcheck.me shows the same
 * session as the extension after Discord OAuth. HttpOnly cookies from the API
 * may also apply; this path covers cases where partitioned or cross-site cookie
 * behavior would otherwise hide the session from fetchAuthSession.
 */
import { EXT_CONFIG } from './config.js';

/** Same key as fetchAuthSession in apps/web (default tokenStorageKey). */
export const WEB_TOKEN_STORAGE_KEY = 'tc_token';

function marketingSiteHosts(): string[] {
  try {
    const host = new URL(EXT_CONFIG.WEB_APP_URL).hostname.toLowerCase();
    const hosts = [host];
    if (!host.startsWith('www.')) {
      hosts.push(`www.${host}`);
    }
    return hosts;
  } catch {
    return ['tiltcheck.me', 'www.tiltcheck.me'];
  }
}

export function isTiltCheckMarketingSite(hostname: string): boolean {
  return marketingSiteHosts().includes(hostname.toLowerCase());
}

/**
 * Runs in page context so tokens land in site localStorage (isolated world cannot).
 */
function injectLocalStorageSet(key: string, value: string | null): void {
  const keyLit = JSON.stringify(key);
  const valLit = value === null ? 'null' : JSON.stringify(value);
  const script = document.createElement('script');
  script.textContent = `(function(){try{var k=${keyLit};var v=${valLit};if(v===null){localStorage.removeItem(k);}else{localStorage.setItem(k,v);}window.dispatchEvent(new CustomEvent("tiltcheck-ext-session-sync"));}catch(_){}})();`;
  (document.documentElement || document.head).appendChild(script);
  script.remove();
}

export function syncMarketingSiteTokenFromExtensionStorage(): void {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  if (!isTiltCheckMarketingSite(window.location.hostname)) return;

  chrome.storage.local.get(['authToken'], (data: { authToken?: string | null }) => {
    const token = typeof data.authToken === 'string' && data.authToken ? data.authToken : null;
    injectLocalStorageSet(WEB_TOKEN_STORAGE_KEY, token);
  });
}

export function attachMarketingSiteStorageListener(): void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
  if (!isTiltCheckMarketingSite(window.location.hostname)) return;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.authToken) return;
    const raw = changes.authToken.newValue;
    const token = typeof raw === 'string' && raw ? raw : null;
    injectLocalStorageSet(WEB_TOKEN_STORAGE_KEY, token);
  });
}
