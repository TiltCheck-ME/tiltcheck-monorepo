// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
import { EXT_CONFIG } from './config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExclusionItem {
  id: string;
  game_id: string | null;
  category: string | null;
  reason: string | null;
  created_at: string;
}

interface UserData {
  id: string;
  username?: string;
  discriminator?: string;
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
    const name = userData?.username ?? userId.slice(0, 10);
    $('stat-user').textContent = name;
  }
}

// ---------------------------------------------------------------------------
// Tilt / Session status
// ---------------------------------------------------------------------------

async function loadStatus() {
  if (!userId) return;

  try {
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${userId}/status`, {
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
  if (!userId) return;

  show('exclusion-loading');
  hide('exclusion-list-wrap');

  try {
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${userId}/exclusions`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    exclusions = data.exclusions ?? [];
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
    const label = ex.game_id
      ? ex.game_id
      : CATEGORY_LABELS[ex.category ?? ''] ?? ex.category ?? 'Unknown';
    const badgeClass = ex.game_id ? 'badge-gameid' : 'badge-category';
    const badgeLabel = ex.game_id ? 'Game ID' : 'Category';
    const date = new Date(ex.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
  if (!userId) { toast('Connect your account first.', true); return; }

  const mode = addMode;
  const category = ($<HTMLSelectElement>('input-category')).value || undefined;
  const gameId = ($<HTMLInputElement>('input-gameid')).value.trim() || undefined;
  const reason = ($<HTMLTextAreaElement>('input-reason')).value.trim() || undefined;

  if (mode === 'category' && !category) { toast('Pick a category.', true); return; }
  if (mode === 'gameid' && !gameId) { toast('Enter a game ID or slug.', true); return; }

  const payload: Record<string, string | undefined> = { reason };
  if (mode === 'category') payload.category = category;
  else payload.game_id = gameId;

  const btn = $<HTMLButtonElement>('btn-add-confirm');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';

  try {
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${userId}/exclusions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  if (!userId) return;

  try {
    await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${userId}/exclusions/${id}`, { method: 'DELETE' });
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

  if (userId) {
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
}

document.addEventListener('DOMContentLoaded', init);
