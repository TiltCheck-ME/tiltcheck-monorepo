/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * Extension popup. Three things only:
 *   1. Discord sign-in (same flow as tiltcheck.me)
 *   2. One on/off switch
 *   3. "Open Dashboard" (every other setting lives at tiltcheck.me/dashboard/)
 */

import { getSiteDiscordLoginUrl } from './config.js';
import { TILTCHECK_ENABLED_KEY, TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY } from './core-options.js';
import {
  SETTINGS_SYNC_STATUS_KEY,
  setExtensionEnabled,
  type SyncStatus,
} from './settings-sync.js';

export const DASHBOARD_URL = 'https://tiltcheck.me/dashboard/';

interface PopupUser {
  id?: string;
  discordId?: string;
  username?: string;
  avatar?: string | null;
}

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function timeAgo(ms: number, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - ms) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`;
}

export function syncStatusText(status: SyncStatus | null | undefined, now = Date.now()): string {
  if (!status) return 'Checking your settings...';
  switch (status.state) {
    case 'synced':
      return `Settings synced ${timeAgo(status.at, now)}`;
    case 'cached':
      return 'Offline. Using your last saved settings.';
    case 'defaults':
      return "Can't reach your settings. Running the defaults.";
    case 'expired':
      return 'Discord sign-in ran out. Sign in again to sync.';
    case 'signed_out':
    default:
      return 'Running the defaults.';
  }
}

function renderSwitch(enabled: boolean, lockUntil: number): void {
  const sw = el<HTMLButtonElement>('master-switch');
  const label = el('switch-label');
  const hint = el('switch-hint');
  if (sw) sw.setAttribute('aria-checked', enabled ? 'true' : 'false');
  if (label) label.textContent = enabled ? 'TiltCheck is on' : 'TiltCheck is off';
  if (hint) {
    const lockRunning = lockUntil > Date.now();
    if (enabled) {
      hint.textContent = 'Checks run on casino tabs.';
    } else if (lockRunning) {
      hint.textContent = 'Paused. Your break still runs until it ends. Nice try, though.';
    } else {
      hint.textContent = 'Paused. Nothing runs on casino tabs until you flip it back.';
    }
  }
}

function renderAuth(user: PopupUser | null, status: SyncStatus | null): void {
  const signedIn = Boolean(user && (user.discordId || user.id)) && status?.state !== 'expired';
  const out = el('signed-out');
  const inn = el('signed-in');
  if (out) out.hidden = signedIn;
  if (inn) inn.hidden = !signedIn;
  if (signedIn && user) {
    const name = el('who-name');
    if (name) name.textContent = `@${user.username || 'you'}`;
    const avatar = el<HTMLImageElement>('who-avatar');
    if (avatar) {
      if (user.avatar) avatar.src = user.avatar;
      else avatar.removeAttribute('src');
    }
  }
  const sync = el('sync-status');
  if (sync) sync.textContent = syncStatusText(status);
  if (!signedIn && status?.state === 'expired') {
    const title = el('signin-title');
    if (title) title.textContent = 'Discord sign-in ran out.';
  }
}

async function refresh(): Promise<void> {
  const stored = await chrome.storage.local.get([
    'userData',
    'authToken',
    TILTCHECK_ENABLED_KEY,
    TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
    SETTINGS_SYNC_STATUS_KEY,
  ]);
  const user = stored.authToken ? ((stored.userData as PopupUser | null) ?? null) : null;
  const status = (stored[SETTINGS_SYNC_STATUS_KEY] as SyncStatus | undefined) ?? null;
  renderAuth(user, status);
  renderSwitch(stored[TILTCHECK_ENABLED_KEY] !== false, Number(stored[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]) || 0);
}

async function signOut(): Promise<void> {
  await chrome.storage.local.set({ authToken: null, userData: null, tiltguard_user_id: null });
  // background settings sync sees authToken change and falls back to defaults
  await refresh();
}

export async function initPopup(): Promise<void> {
  el('btn-signin')?.addEventListener('click', () => {
    const btn = el<HTMLButtonElement>('btn-signin');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Opening Discord...';
    }
    chrome.tabs.create({ url: getSiteDiscordLoginUrl() }, () => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign in with Discord';
      }
    });
  });

  el('btn-signout')?.addEventListener('click', () => void signOut());

  el('master-switch')?.addEventListener('click', async () => {
    const sw = el<HTMLButtonElement>('master-switch');
    const next = sw?.getAttribute('aria-checked') !== 'true';
    const stored = await chrome.storage.local.get([TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]);
    renderSwitch(next, Number(stored[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]) || 0);
    await setExtensionEnabled(next);
  });

  // Quiet footer links (the Ko-fi tagline) open in a normal tab.
  document.querySelectorAll<HTMLAnchorElement>('a[data-open-tab]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: a.href });
    });
  });

  el('btn-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: DASHBOARD_URL });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (
      'authToken' in changes ||
      'userData' in changes ||
      TILTCHECK_ENABLED_KEY in changes ||
      SETTINGS_SYNC_STATUS_KEY in changes
    ) {
      void refresh();
    }
  });

  await refresh();
  // Pull fresh settings whenever the popup opens (cheap, and the alarm covers the rest).
  try {
    chrome.runtime.sendMessage({ type: 'pull_player_settings' }, () => void chrome.runtime.lastError);
  } catch {
    // Background asleep or unavailable
  }
}

if (typeof document !== 'undefined' && document.getElementById('master-switch')) {
  void initPopup();
}
