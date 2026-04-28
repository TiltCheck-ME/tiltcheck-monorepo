// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-15
import { EXT_CONFIG } from './config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExclusionItem {
  id: string;
  gameId: string | null;
  category: string | null;
  provider: string | null;
  casino: string | null;
  reason: string | null;
  createdAt: string;
}

interface UserData {
  id: string;
  username?: string;
  discriminator?: string;
  email?: string | null;
  discordId?: string | null;
}

interface PopupStorageSnapshot {
  userData?: UserData | null;
  tiltguard_user_id?: string | null;
  authToken?: string | null;
  activityFeed?: Array<{ msg: string; type?: string; ts?: number }>;
  vaultSessionTotal?: number;
}

// ---------------------------------------------------------------------------
// Tilt Gauge
// ---------------------------------------------------------------------------

interface TiltGaugeState {
  label: string;
  cssClass: string;
  color: string;
  score10: number;
}

function getTiltGaugeState(score: number): TiltGaugeState {
  // score is 0-100 from the API; display normalized to 0-10 scale
  const score10 = Math.min(10, Math.round(score / 10));
  if (score <= 20) return { label: 'ICE COLD',        cssClass: 'tilt-ice',    color: '#60a5fa', score10 };
  if (score <= 40) return { label: 'WARMING UP',      cssClass: 'tilt-warm',   color: '#34d399', score10 };
  if (score <= 60) return { label: 'RUNNING HOT',     cssClass: 'tilt-hot',    color: '#fbbf24', score10 };
  if (score <= 80) return { label: 'DANGER ZONE',     cssClass: 'tilt-danger', color: '#f97316', score10 };
  return              { label: 'ATOMIC MELTDOWN', cssClass: 'tilt-atomic', color: '#ef4444', score10 };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let userId: string | null = null;
let userData: UserData | null = null;
let exclusions: ExclusionItem[] = [];

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function show(id: string) { $(id).style.display = ''; }
function hide(id: string) { $(id).style.display = 'none'; }

function toast(msg: string, isError = false) {
  const el = $('toast');
  el.textContent = msg;
  el.className = isError ? 'error' : '';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function loadAuth(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.get(['userData', 'authToken', 'tiltguard_user_id'], (data: PopupStorageSnapshot) => {
      if (data.userData?.id) {
        userId = data.userData.id;
        userData = data.userData;
      } else if (data.tiltguard_user_id) {
        userId = data.tiltguard_user_id;
      }
      resolve();
    });
  });
}

function renderAuthState() {
  if (!userId) {
    hide('status-content');
    show('auth-gate');
  } else {
    show('status-content');
    hide('auth-gate');
    const name = userData?.username ?? userData?.email ?? userId.slice(0, 10);
    $('stat-user').textContent = name;
    syncCapabilityState();
  }
}

function syncCapabilityState() {
  const hasDiscordLinked = Boolean(userData?.discordId);
  const blockTab = document.querySelector<HTMLButtonElement>('.tab[data-tab="block"]');
  const vaultTab = document.querySelector<HTMLButtonElement>('.tab[data-tab="vault"]');

  if (!blockTab || !vaultTab) {
    return;
  }

  if (userId && !hasDiscordLinked) {
    blockTab.style.display = 'none';
    vaultTab.style.display = 'none';
    show('limited-auth-note');
    $('session-pill').className = 'status-pill pill-warn';
    $('session-pill-text').textContent = 'Site beta';
    const gaugeEl = $('tilt-gauge');
    gaugeEl.textContent = '--';
    gaugeEl.className = 'tilt-gauge tilt-ice';
    $('tilt-fill').style.width = '0%';
    $('stat-pl').textContent = '--';
    $('stat-session').textContent = '--';
    $('stat-blocked').textContent = 'Site';

    const activeHiddenPanel = document.querySelector('.tab.active[data-tab="block"], .tab.active[data-tab="vault"]');
    if (activeHiddenPanel) {
      activateTab('status');
    }

    return;
  }

  blockTab.style.display = '';
  vaultTab.style.display = '';
  hide('limited-auth-note');
}

function getLinkedDiscordRouteId(): string | null {
  return userData?.discordId ?? null;
}

function openDashboardTab(tab: 'safety' | 'vault' | 'buddies' | 'profile' = 'profile') {
  const dashboardUrl = new URL(EXT_CONFIG.DASHBOARD_URL);
  if (tab !== 'profile') {
    dashboardUrl.searchParams.set('tab', tab);
  }
  chrome.tabs.create({ url: dashboardUrl.toString() });
}

// ---------------------------------------------------------------------------
// Tilt / Session status
// ---------------------------------------------------------------------------

async function loadStatus() {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;

  try {
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/status`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return;
    const data = await res.json();

    const score: number = data.tiltScore ?? 0;
    const fill = $<HTMLDivElement>('tilt-fill');
    const gauge = getTiltGaugeState(score);
    const gaugeEl = $('tilt-gauge');
    gaugeEl.textContent = `${gauge.label} (${gauge.score10}/10)`;
    gaugeEl.className = `tilt-gauge ${gauge.cssClass}`;
    fill.style.width = `${score}%`;
    fill.style.background = gauge.color;

    const pl: number = data.plToday ?? 0;
    const plEl = $('stat-pl');
    plEl.textContent = (pl >= 0 ? '+' : '') + pl.toFixed(2);
    plEl.className = 'stat-value ' + (pl > 0 ? 'stat-pos' : pl < 0 ? 'stat-neg' : 'stat-neu');

    const pill = $('session-pill');
    const pillText = $('session-pill-text');
    if (data.activeSession) {
      pill.className = 'status-pill pill-active';
      pillText.textContent = 'Live';
      $('stat-session').textContent = formatDuration(data.sessionStart);
    } else {
      pill.className = 'status-pill pill-idle';
      pillText.textContent = 'No session';
      $('stat-session').textContent = '--';
    }
  } catch {
    // Status unavailable — not fatal
  }
}

function formatDuration(startMs: number): string {
  if (!startMs) return '--';
  const diff = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

async function loadExclusions() {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;

  show('exclusion-loading');
  hide('exclusion-list-wrap');

  try {
    const token = await getToken();
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/exclusions`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    exclusions = data.data?.exclusions ?? [];
  } catch {
    exclusions = [];
    toast('Could not load exclusions.', true);
  }

  hide('exclusion-loading');
  show('exclusion-list-wrap');
  renderExclusions();
  $('stat-blocked').textContent = String(exclusions.length);
}

const CATEGORY_LABELS: Record<string, string> = {
  chicken_mines: 'Chicken / Mines',
  bonus_buy: 'Bonus Buy',
  slots: 'Slots',
  live_dealer: 'Live Dealer',
  table_games: 'Table Games',
  crash: 'Crash',
};

function humanizeSlug(value: string | null | undefined): string {
  return String(value ?? '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderExclusions() {
  const list = $('exclusion-list');
  const empty = $('exclusion-empty');
  list.innerHTML = '';

  if (exclusions.length === 0) {
    show('exclusion-empty');
    list.style.display = 'none';
    return;
  }

  hide('exclusion-empty');
  list.style.display = '';

  for (const ex of exclusions) {
    const label = ex.gameId
      ? ex.gameId
      : ex.category
        ? CATEGORY_LABELS[ex.category] ?? humanizeSlug(ex.category)
        : ex.provider
          ? humanizeSlug(ex.provider)
          : ex.casino
            ? humanizeSlug(ex.casino)
            : 'Unknown';
    const badgeClass = ex.gameId ? 'badge-gameid' : 'badge-category';
    const badgeLabel = ex.gameId
      ? 'Game ID'
      : ex.category
        ? 'Category'
        : ex.provider
          ? 'Provider'
          : 'Casino';
    const date = new Date(ex.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const item = document.createElement('div');
    item.className = 'exclusion-item';
    item.innerHTML = `
      <div class="exclusion-info">
        <span class="exclusion-name">${label}</span>
        <span class="exclusion-meta">Blocked ${date}${ex.reason ? ' — ' + ex.reason : ''}</span>
      </div>
      <span class="exclusion-badge ${badgeClass}">${badgeLabel}</span>
      <span class="exclusion-meta">Dashboard-owned</span>
    `;
    list.appendChild(item);
  }
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function activateTab(id: string) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${id}"]`)!.classList.add('active');
  $(`panel-${id}`).classList.add('active');

  if (id === 'block') loadExclusions();
  if (id === 'vault') loadVaultRules();
}

// ---------------------------------------------------------------------------
// Activity feed (pulls from chrome.storage populated by content/background)
// ---------------------------------------------------------------------------

function loadFeed() {
  chrome.storage.local.get(['activityFeed'], (data: PopupStorageSnapshot) => {
    const events = data.activityFeed ?? [];
    const feed = $('feed');
    if (events.length === 0) {
      feed.innerHTML = '<div class="feed-item">No activity recorded this session.</div>';
      return;
    }
    feed.innerHTML = events
      .slice(-20)
      .reverse()
      .map(e => {
        const t = e.ts ? new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const cls = e.type === 'danger' ? 'danger' : e.type === 'warn' ? 'warn' : 'info';
        return `<div class="feed-item ${cls}"><span class="feed-time">${t}</span> ${e.msg}</div>`;
      })
      .join('');
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  await loadAuth();
  renderAuthState();

  if (userId && userData?.discordId) {
    loadStatus();
  }

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab((tab as HTMLButtonElement).dataset['tab']!);
    });
  });

  $('btn-add-toggle').addEventListener('click', () => openDashboardTab('safety'));

  // Auth
  $('btn-login').addEventListener('click', () => {
    chrome.tabs.create({ url: `${EXT_CONFIG.API_BASE_URL}/auth/discord/login?source=extension` });
  });
  $('btn-magic-login').addEventListener('click', async () => {
    const email = ($<HTMLInputElement>('magic-email')).value.trim();
    if (!email) {
      toast('Enter your email first.', true);
      return;
    }

    const button = $<HTMLButtonElement>('btn-magic-login');
    button.disabled = true;
    button.innerHTML = '<div class="spinner"></div>';

    try {
      const configResponse = await fetch(`${EXT_CONFIG.API_BASE_URL}/auth/magic/config`);
      const config = await configResponse.json().catch(() => null) as { enabled?: boolean; publishableKey?: string | null } | null;
      if (!configResponse.ok || !config?.enabled || !config.publishableKey) {
        throw new Error('Magic sign-in is not configured.');
      }

      const { Magic } = await import('magic-sdk');
      const magic = new Magic(config.publishableKey);
      const didToken = await magic.auth.loginWithMagicLink({ email });
      const response = await fetch(`${EXT_CONFIG.API_BASE_URL}/auth/magic/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ didToken }),
      });
      const payload = await response.json().catch(() => null) as {
        token?: string;
        user?: {
          id: string;
          email?: string | null;
          discordId?: string | null;
          displayName?: string | null;
        };
        error?: string;
      } | null;

      if (!response.ok || !payload?.token || !payload.user?.id) {
        throw new Error(payload?.error || 'Magic sign-in failed.');
      }

      const nextUser: UserData = {
        id: payload.user.id,
        username: payload.user.displayName || payload.user.email || payload.user.id.slice(0, 10),
        email: payload.user.email || null,
        discordId: payload.user.discordId || null,
      };

      await chrome.storage.local.set({
        authToken: payload.token,
        tiltguard_user_id: payload.user.id,
        userData: nextUser,
      });

      userId = payload.user.id;
      userData = nextUser;
      renderAuthState();
      loadFeed();
      toast(payload.user.discordId ? 'Signed in.' : 'Signed in. Discord-only tools stay hidden on site accounts.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Magic sign-in failed.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Connect with Email';
    }
  });

  // Dashboard
  $('btn-open-dashboard').addEventListener('click', () => {
    openDashboardTab('profile');
  });

  // Activity refresh
  $('btn-refresh-feed').addEventListener('click', loadFeed);

  // Settings (open options page if it exists, else dashboard)
  $('btn-settings').addEventListener('click', () => {
    openDashboardTab('profile');
  });

  // Vault listeners
  initVaultListeners();
  loadFeed();
}

document.addEventListener('DOMContentLoaded', init);


// ---------------------------------------------------------------------------
// Vault Rules
// ---------------------------------------------------------------------------

interface VaultRule {
  id: string;
  type: string;
  enabled: boolean;
  casino: string;
  percent?: number | null;
  fixed_amount?: number | null;
  threshold_amount?: number | null;
  ceiling_amount?: number | null;
  profit_target?: number | null;
  min_win_amount?: number | null;
  label?: string | null;
}

let vaultRules: VaultRule[] = [];
let vaultSessionTotal = 0;

function describeVaultRule(r: VaultRule): string {
  switch (r.type) {
    case 'percent_of_win':    return `Vault ${r.percent}% of each win`;
    case 'fixed_per_threshold': return `Vault $${r.fixed_amount} per $${r.threshold_amount} won`;
    case 'balance_ceiling':   return `Keep balance under $${r.ceiling_amount}`;
    case 'session_profit_lock': return `Lock profit at $${r.profit_target}`;
    default: return r.type;
  }
}

async function loadVaultRules() {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;
  show('vault-loading');
  hide('vault-rule-list');
  try {
    const token = await getToken();
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/vault-rules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load vault rules');
    const data = await res.json();
    vaultRules = data.rules ?? [];
    renderVaultRules();
  } catch {
    toast('Could not load vault rules', true);
  } finally {
    hide('vault-loading');
    show('vault-rule-list');
  }

  // Load session total from storage
  chrome.storage.local.get(['vaultSessionTotal'], (d: PopupStorageSnapshot) => {
    vaultSessionTotal = d.vaultSessionTotal ?? 0;
    $('vault-session-total').textContent = `$${vaultSessionTotal.toFixed(2)}`;
  });
}

function renderVaultRules() {
  const list = $('vault-rule-list');
  if (vaultRules.length === 0) {
    list.innerHTML = '';
    show('vault-empty');
    return;
  }
  hide('vault-empty');
  list.innerHTML = vaultRules.map(r => `
    <div class="vault-rule-item" data-id="${r.id}">
      <div class="vault-rule-header">
        <span class="vault-rule-label">${r.label || describeVaultRule(r)}</span>
        <div class="vault-rule-actions">
          <span class="vault-rule-casino">${r.casino}</span>
          <span class="vault-rule-casino">${r.enabled ? 'ON' : 'OFF'}</span>
        </div>
      </div>
      <div class="vault-rule-desc">${describeVaultRule(r)}</div>
    </div>
  `).join('');
}

async function getToken(): Promise<string> {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken'], (d: PopupStorageSnapshot) => resolve(d.authToken ?? ''));
  });
}

function initVaultListeners() {
  $('btn-vault-add-toggle').addEventListener('click', () => openDashboardTab('vault'));
}
