// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
import { EXT_CONFIG } from './config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExclusionItem {
  id: string;
  gameId: string | null;
  category: string | null;
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

type BlockMode = 'category' | 'gameid';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let userId: string | null = null;
let userData: UserData | null = null;
let exclusions: ExclusionItem[] = [];
let addMode: BlockMode = 'category';
let addFormOpen = false;

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
    chrome.storage.local.get(['userData', 'authToken', 'tiltguard_user_id'], data => {
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
    $('tilt-score').textContent = '--';
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
    const scoreEl = $('tilt-score');

    scoreEl.textContent = String(score);
    scoreEl.className = 'tilt-score ' + (score < 40 ? 'score-low' : score < 70 ? 'score-mid' : 'score-high');
    fill.style.width = `${score}%`;
    fill.style.background = score < 40 ? 'var(--teal)' : score < 70 ? 'var(--yellow)' : 'var(--red)';

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
  slots: 'Slots',
  live_dealer: 'Live Dealer',
  table_games: 'Table Games',
  poker: 'Poker',
  sports_betting: 'Sports Betting',
  crash: 'Crash',
  dice: 'Dice',
  provably_fair: 'Provably Fair',
  other: 'Other',
};

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
      : CATEGORY_LABELS[ex.category ?? ''] ?? ex.category ?? 'Unknown';
    const badgeClass = ex.gameId ? 'badge-gameid' : 'badge-category';
    const badgeLabel = ex.gameId ? 'Game ID' : 'Category';
    const date = new Date(ex.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const item = document.createElement('div');
    item.className = 'exclusion-item';
    item.innerHTML = `
      <div class="exclusion-info">
        <span class="exclusion-name">${label}</span>
        <span class="exclusion-meta">Blocked ${date}${ex.reason ? ' — ' + ex.reason : ''}</span>
      </div>
      <span class="exclusion-badge ${badgeClass}">${badgeLabel}</span>
      <button class="btn btn-danger-ghost" data-id="${ex.id}" title="Remove block">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="12" height="12">
          <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
        </svg>
      </button>
    `;

    item.querySelector('button')!.addEventListener('click', () => removeExclusion(ex.id));
    list.appendChild(item);
  }
}

async function addExclusion() {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) { toast('Connect Discord first.', true); return; }

  const mode = addMode;
  const category = ($<HTMLSelectElement>('input-category')).value || undefined;
  const gameId = ($<HTMLInputElement>('input-gameid')).value.trim() || undefined;
  const reason = ($<HTMLTextAreaElement>('input-reason')).value.trim() || undefined;

  if (mode === 'category' && !category) { toast('Pick a category.', true); return; }
  if (mode === 'gameid' && !gameId) { toast('Enter a game ID or slug.', true); return; }

  const payload: Record<string, string | undefined> = { reason };
  if (mode === 'category') payload.category = category;
  else payload.gameId = gameId;

  const btn = $<HTMLButtonElement>('btn-add-confirm');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';

  try {
    const token = await getToken();
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/exclusions`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('failed');
    toast('Blocked. The extension will enforce it immediately.');
    closeAddForm();
    await loadExclusions();
  } catch {
    toast('Failed to add block.', true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13">
        <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
      </svg>
      Add block`;
  }
}

async function removeExclusion(id: string) {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;

  try {
    const token = await getToken();
    await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/exclusions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    toast('Block removed.');
    await loadExclusions();
  } catch {
    toast('Could not remove block.', true);
  }
}

// ---------------------------------------------------------------------------
// Add form
// ---------------------------------------------------------------------------

function openAddForm() {
  addFormOpen = true;
  $('add-form').classList.add('open');
  $('btn-add-toggle').textContent = '';
  $('btn-add-toggle').innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13">
      <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
    </svg>
    Close`;
}

function closeAddForm() {
  addFormOpen = false;
  $('add-form').classList.remove('open');
  $('btn-add-toggle').innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13">
      <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
    </svg>
    Block game`;
  ($<HTMLSelectElement>('input-category')).value = '';
  ($<HTMLInputElement>('input-gameid')).value = '';
  ($<HTMLTextAreaElement>('input-reason')).value = '';
}

function setAddMode(mode: BlockMode) {
  addMode = mode;
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    (btn as HTMLButtonElement).classList.toggle('active', (btn as HTMLButtonElement).dataset['mode'] === mode);
  });
  if (mode === 'category') {
    show('field-category');
    hide('field-gameid');
  } else {
    hide('field-category');
    show('field-gameid');
    $<HTMLInputElement>('input-gameid').focus();
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
  chrome.storage.local.get(['activityFeed'], data => {
    const events: Array<{ msg: string; type?: string; ts?: number }> = data.activityFeed ?? [];
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

  // Add form toggle
  $('btn-add-toggle').addEventListener('click', () => {
    if (addFormOpen) closeAddForm(); else openAddForm();
  });
  $('btn-add-cancel').addEventListener('click', closeAddForm);
  $('btn-add-confirm').addEventListener('click', addExclusion);

  // Mode toggles
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setAddMode((btn as HTMLButtonElement).dataset['mode'] as BlockMode));
  });

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
    chrome.tabs.create({ url: EXT_CONFIG.HUB_URL });
  });

  // Activity refresh
  $('btn-refresh-feed').addEventListener('click', loadFeed);

  // Settings (open options page if it exists, else dashboard)
  $('btn-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: `${EXT_CONFIG.HUB_URL}/settings` });
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
let vaultAddFormOpen = false;
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
  chrome.storage.local.get(['vaultSessionTotal'], d => {
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
          <label class="toggle-switch">
            <input type="checkbox" class="vault-toggle" data-id="${r.id}" ${r.enabled ? 'checked' : ''} />
            <span class="toggle-track"></span>
            <span class="toggle-thumb"></span>
          </label>
          <button class="btn btn-danger-ghost vault-delete" data-id="${r.id}" style="padding:3px 8px; font-size:10px;">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="11" height="11">
              <polyline points="3,4 13,4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
              <path d="M6 7v5M10 7v5M4 4l.667 9.333A1 1 0 0 0 5.663 14h4.674a1 1 0 0 0 .996-.667L12 4"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="vault-rule-desc">${describeVaultRule(r)}</div>
    </div>
  `).join('');

  list.querySelectorAll('.vault-toggle').forEach(el => {
    el.addEventListener('change', async (e) => {
      const id = (e.target as HTMLInputElement).dataset['id']!;
      const enabled = (e.target as HTMLInputElement).checked;
      await patchVaultRule(id, { enabled });
    });
  });

  list.querySelectorAll('.vault-delete').forEach(el => {
    el.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset['id']!;
      await deleteVaultRuleUI(id);
    });
  });
}

async function getToken(): Promise<string> {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken'], d => resolve(d.authToken ?? ''));
  });
}

async function patchVaultRule(id: string, patch: Partial<VaultRule>) {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;
  try {
    const token = await getToken();
    await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/vault-rules/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    const rule = vaultRules.find(r => r.id === id);
    if (rule) Object.assign(rule, patch);
    renderVaultRules();
  } catch {
    toast('Failed to update rule', true);
  }
}

async function deleteVaultRuleUI(id: string) {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;
  try {
    const token = await getToken();
    await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/vault-rules/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
    vaultRules = vaultRules.filter(r => r.id !== id);
    renderVaultRules();
    toast('Rule removed');
  } catch {
    toast('Failed to delete rule', true);
  }
}

function openVaultAddForm() {
  vaultAddFormOpen = true;
  $('vault-add-form').classList.add('open');
  switchVaultFieldGroup('percent_of_win');
}

function closeVaultAddForm() {
  vaultAddFormOpen = false;
  $('vault-add-form').classList.remove('open');
  ($<HTMLSelectElement>('vault-type-select')).value = 'percent_of_win';
  ($<HTMLInputElement>('vault-percent')).value = '';
  ($<HTMLInputElement>('vault-fixed-amount')).value = '';
  ($<HTMLInputElement>('vault-threshold')).value = '';
  ($<HTMLInputElement>('vault-ceiling')).value = '';
  ($<HTMLInputElement>('vault-profit-target')).value = '';
  ($<HTMLInputElement>('vault-min-win')).value = '';
  ($<HTMLInputElement>('vault-label')).value = '';
  switchVaultFieldGroup('percent_of_win');
}

function switchVaultFieldGroup(type: string) {
  const groups: Record<string, string> = {
    percent_of_win: 'vfg-percent',
    fixed_per_threshold: 'vfg-fixed',
    balance_ceiling: 'vfg-ceiling',
    session_profit_lock: 'vfg-profit',
  };
  Object.values(groups).forEach(id => $<HTMLDivElement>(id).classList.remove('active'));
  if (groups[type]) $<HTMLDivElement>(groups[type]).classList.add('active');
}

async function submitVaultRule() {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;
  const type = ($<HTMLSelectElement>('vault-type-select')).value;
  const casino = ($<HTMLSelectElement>('vault-casino')).value || 'all';
  const minWin = parseFloat(($<HTMLInputElement>('vault-min-win')).value) || undefined;
  const label = ($<HTMLInputElement>('vault-label')).value.trim() || undefined;

  const payload: Record<string, unknown> = { type, casino, min_win_amount: minWin, label };

  switch (type) {
    case 'percent_of_win':
      payload.percent = parseFloat(($<HTMLInputElement>('vault-percent')).value);
      if (!payload.percent) { toast('Enter a percent', true); return; }
      break;
    case 'fixed_per_threshold':
      payload.fixed_amount = parseFloat(($<HTMLInputElement>('vault-fixed-amount')).value);
      payload.threshold_amount = parseFloat(($<HTMLInputElement>('vault-threshold')).value);
      if (!payload.fixed_amount || !payload.threshold_amount) { toast('Fill in fixed + threshold', true); return; }
      break;
    case 'balance_ceiling':
      payload.ceiling_amount = parseFloat(($<HTMLInputElement>('vault-ceiling')).value);
      if (!payload.ceiling_amount) { toast('Enter a ceiling amount', true); return; }
      break;
    case 'session_profit_lock':
      payload.profit_target = parseFloat(($<HTMLInputElement>('vault-profit-target')).value);
      if (!payload.profit_target) { toast('Enter a profit target', true); return; }
      break;
  }

  try {
    const token = await getToken();
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/vault-rules`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Save failed');
    const data = await res.json();
    vaultRules.push(data.rule);
    closeVaultAddForm();
    renderVaultRules();
    toast('Vault rule saved');
  } catch {
    toast('Failed to save rule', true);
  }
}

function initVaultListeners() {
  $('btn-vault-add-toggle').addEventListener('click', () => {
    vaultAddFormOpen ? closeVaultAddForm() : openVaultAddForm();
  });
  $('btn-vault-add-cancel').addEventListener('click', closeVaultAddForm);
  $('btn-vault-add-confirm').addEventListener('click', submitVaultRule);
  $<HTMLSelectElement>('vault-type-select').addEventListener('change', (e) => {
    switchVaultFieldGroup((e.target as HTMLSelectElement).value);
  });
}
