// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
import { EXT_CONFIG, getDiscordLoginUrl } from './config.js';
import {
  addCustomSlug,
  clampRisk,
  loadGameBlockUiState,
  loadTouchGrassUiState,
  riskLabel,
  saveBlockedCategories,
  saveBlockedGames,
  saveGameBlockOptIn,
  toggleCategoryInList,
  saveRiskThreshold,
  saveTouchGrassOptIn,
  saveHourlyWage,
  saveRealityHudEnabled,
  saveDepositBarrierEnabled,
  saveReverseWithdrawalShieldEnabled,
  saveProfitLockEnabled,
  saveProfitLockTrailingPercent,
  saveCashoutGoalsEnabled,
  saveCashoutGoals,
  saveAudioAlertsEnabled,
  saveAudioAlertsVolume,
  toggleGoalInList,
  addGoalToList,
  removeGoalFromList,
  type CashoutGoal,
  saveBonusTrackerConfig,
  type BonusTrackerConfig,
  DEFAULT_BONUS_TRACKER_CONFIG,
  toggleSlugInList,
  saveCooldownWallet,
  saveAutoLockOnTilt,
  saveAutoLockThreshold,
  saveAutoLockDuration,
  saveOnboardingCompleted,
  loadOnboardingCompleted,
  saveDefaultBetBreakerEnabled,
  saveBaseStakeThreshold,
} from './popup-settings.js';
import { DEFAULT_CASHOUT_GOALS } from './profit-lock.js';
import { playAudioCue } from './audio-alerts.js';
import { GAME_EXCLUSION_CATEGORY_LABELS, type GameCategory } from './exclusion-taxonomy.js';
import {
  generateSparklineSvg,
  determineVelocityStatus,
  TILTCHECK_SESSION_PNL_KEY,
  type SessionPnlState,
  DEFAULT_SESSION_PNL_STATE,
} from './session-velocity.js';
import {
  calculateGoalsProgress,
  findRouteForHostname,
  buildCooldownVaultUrl,
  type CasinoCashoutRoute,
} from './cashout-router.js';
import {
  TILTCHECK_CASHOUT_GOALS_KEY,
  sanitizeCashoutGoals,
} from './profit-lock.js';
import {
  TILTCHECK_STREAK_VOLATILITY_KEY,
  DEFAULT_STREAK_VOLATILITY_STATE,
  type StreakVolatilityState,
} from './streak-volatility.js';
import {
  extensionSeedManager,
  normalizeSiteKey,
} from './seed-manager-extension.js';

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
      } else {
        userId = null;
        userData = null;
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
    checkOnboardingStatus();
  }
}

async function checkOnboardingStatus(): Promise<void> {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) return;

  try {
    const token = await getToken();
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/me/onboarding-status`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) return;
    const data = await res.json();

    if (!Array.isArray(data.completedSteps) || !data.completedSteps.includes('completed')) {
      const banner = document.getElementById('onboarding-banner');
      if (banner) {
        banner.style.display = '';
        const link = banner.querySelector('a');
        if (link) link.href = `${EXT_CONFIG.WEB_APP_URL}/onboarding`;
      }
    }
  } catch {
    // Silently fail — onboarding check is not critical for extension operation
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

function attachAuthStorageSync(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (!changes.authToken && !changes.userData) return;

    const hadDiscord = Boolean(userData?.discordId);
    void loadAuth().then(() => {
      renderAuthState();
      loadFeed();
      if (userData?.discordId) {
        loadStatus();
      }
      if (!hadDiscord && userData?.discordId) {
        toast('Discord sign-in complete.');
      }
    });
  });
}

async function performLogout(): Promise<void> {
  const token = await getToken();
  let serverLogoutFailed = false;
  try {
    const response = await fetch(`${EXT_CONFIG.API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      serverLogoutFailed = true;
    }
  } catch {
    serverLogoutFailed = true;
  }

  await new Promise<void>((resolve) => {
    chrome.storage.local.set(
      {
        authToken: null,
        userData: null,
        tiltguard_user_id: null,
      },
      () => resolve(),
    );
  });

  userId = null;
  userData = null;
  renderAuthState();
  loadFeed();
  toast(
    serverLogoutFailed
      ? 'Logged out locally. Shared session may still be active.'
      : 'Logged out.',
  );
}

function openDashboardTab(_tab: 'safety' | 'vault' | 'buddies' | 'profile' = 'profile') {
  chrome.tabs.create({ url: 'https://tiltcheck.me/dashboard/' });
}

// ---------------------------------------------------------------------------
// Tilt / Session status
// ---------------------------------------------------------------------------

async function updateSessionStatusPill(): Promise<void> {
  const pill = document.getElementById('session-pill');
  const pillText = document.getElementById('session-pill-text');
  if (!pill || !pillText) return;

  try {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
      const isStandaloneWindow = new URLSearchParams(window.location.search).get('mode') === 'window';
      if (isStandaloneWindow) {
        chrome.tabs.query({ active: true, lastFocusedWindow: false }, (allTabs) => {
          const candidate = allTabs?.find(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'));
          if (candidate) {
            resolve([candidate]);
          } else {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
          }
        });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      }
    });
    const activeTab = tabs[0];
    const tabUrl = activeTab?.url || '';

    const casinoMatch = tabUrl.match(
      /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(stake\.(?:com|us)|roobet\.com|bc\.game|rollbit\.com|shuffle\.com|gamdom\.com|csgoempire\.com|crowncoinscasino\.com|lonestarcasino\.com|realprize\.com|pulsz\.com|mcluck\.com|chumbacasino\.com|wowvegas\.com|high5casino\.com|fortunecoins\.com|zulacasino\.com|sportzino\.com)/i
    );
    const casinoDomain = casinoMatch ? casinoMatch[1] : null;

    const stored = await new Promise<PopupStorageSnapshot>((resolve) => {
      chrome.storage.local.get(
        [TILTCHECK_STREAK_VOLATILITY_KEY, TILTCHECK_SESSION_PNL_KEY],
        (res) => resolve(res as PopupStorageSnapshot)
      );
    });

    const streakState = stored[TILTCHECK_STREAK_VOLATILITY_KEY] as StreakVolatilityState | undefined;
    const pnlState = stored[TILTCHECK_SESSION_PNL_KEY] as SessionPnlState | undefined;

    const hasLiveSpins =
      (streakState && streakState.totalSpins > 0) ||
      (pnlState && Array.isArray(pnlState.samples) && pnlState.samples.length > 0);

    const isRecentlyActive =
      (pnlState && pnlState.lastUpdated > 0 && Date.now() - pnlState.lastUpdated < 15 * 60 * 1000) ||
      (streakState && streakState.lastUpdated > 0 && Date.now() - streakState.lastUpdated < 15 * 60 * 1000);

    if (casinoDomain) {
      let siteName = 'Casino';
      const clean = casinoDomain.toLowerCase();
      if (clean.includes('crowncoins')) siteName = 'Crown Coins';
      else if (clean.includes('lonestar')) siteName = 'LoneStar';
      else if (clean.includes('realprize')) siteName = 'Real Prize';
      else if (clean.includes('stake.us')) siteName = 'Stake.us';
      else if (clean.includes('stake.com')) siteName = 'Stake';
      else if (clean.includes('roobet')) siteName = 'Roobet';
      else if (clean.includes('bc.game')) siteName = 'BC.Game';
      else if (clean.includes('rollbit')) siteName = 'Rollbit';
      else if (clean.includes('shuffle')) siteName = 'Shuffle';
      else if (clean.includes('gamdom')) siteName = 'Gamdom';
      else if (clean.includes('csgoempire')) siteName = 'CSGOEmpire';
      else if (clean.includes('pulsz')) siteName = 'Pulsz';
      else if (clean.includes('mcluck')) siteName = 'McLuck';
      else if (clean.includes('chumba')) siteName = 'Chumba';
      else if (clean.includes('wowvegas')) siteName = 'WOW Vegas';
      else if (clean.includes('high5')) siteName = 'High 5';
      else if (clean.includes('fortunecoins')) siteName = 'Fortune Coins';
      else if (clean.includes('zula')) siteName = 'Zula';
      else if (clean.includes('sportzino')) siteName = 'Sportzino';
      else {
        const base = casinoDomain.replace(/\.(com|us|game|casino)$/i, '');
        siteName = base.charAt(0).toUpperCase() + base.slice(1);
      }
      pill.className = 'status-pill pill-active';
      if (hasLiveSpins || isRecentlyActive) {
        pillText.textContent = `Live (${siteName})`;
      } else {
        pillText.textContent = `Guards on (${siteName})`;
      }
      return;
    }

    if (hasLiveSpins && isRecentlyActive) {
      pill.className = 'status-pill pill-active';
      pillText.textContent = 'Live Session';
      return;
    }

    pill.className = 'status-pill pill-idle';
    pillText.textContent = 'Standby';
  } catch {
    pill.className = 'status-pill pill-idle';
    pillText.textContent = 'Standby';
  }
}

async function loadStatus() {
  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) {
    void updateSessionStatusPill();
    return;
  }

  try {
    const token = await getToken();
    const res = await fetch(`${EXT_CONFIG.API_BASE_URL}/user/${linkedDiscordId}/status`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      void updateSessionStatusPill();
      return;
    }
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
      void updateSessionStatusPill();
      $('stat-session').textContent = '--';
    }
  } catch {
    void updateSessionStatusPill();
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
// Session Net PnL & Velocity Radar
// ---------------------------------------------------------------------------

function formatPnl(val: number): string {
  if (val > 0) return `+$${val.toFixed(2)}`;
  if (val < 0) return `-$${Math.abs(val).toFixed(2)}`;
  return '$0.00';
}

function updateSessionRadarUI(state: SessionPnlState): void {
  const badge = document.getElementById('radar-badge');
  const pnlVal = document.getElementById('radar-pnl-val');
  const velVal = document.getElementById('radar-velocity-val');
  const sparkWrap = document.getElementById('radar-sparkline-wrap');
  const peakEl = document.getElementById('radar-stat-peak');
  const lowEl = document.getElementById('radar-stat-low');

  if (!badge || !pnlVal || !velVal || !sparkWrap) return;

  const statusInfo = determineVelocityStatus(state.velocityPerMin, state.netPnl);

  // Update status badge
  badge.className = `radar-badge radar-${statusInfo.status.toLowerCase()}`;
  badge.textContent = statusInfo.label;
  badge.title = statusInfo.reason;

  // Update Net PnL value & color
  pnlVal.textContent = formatPnl(state.netPnl);
  pnlVal.className = 'radar-pnl-val ' + (state.netPnl > 0 ? 'stat-pos' : state.netPnl < 0 ? 'stat-neg' : 'stat-neu');

  // Update velocity readout
  if (Math.abs(state.velocityPerMin) < 0.01) {
    velVal.textContent = '0.00/min';
    velVal.style.color = 'var(--muted)';
  } else if (state.velocityPerMin > 0) {
    velVal.textContent = `+$${state.velocityPerMin.toFixed(2)}/min`;
    velVal.style.color = '#17c3b2';
  } else {
    velVal.textContent = `-$${Math.abs(state.velocityPerMin).toFixed(2)}/min`;
    velVal.style.color = statusInfo.color;
  }

  // Update peak & low
  if (peakEl) peakEl.textContent = formatPnl(state.peakPnl);
  if (lowEl) lowEl.textContent = formatPnl(state.lowestPnl);

  // Render SVG sparkline
  sparkWrap.innerHTML = generateSparklineSvg(state.samples, 328, 70);
}

function loadSessionRadar(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'get_session_pnl_state' }, (res) => {
        const state = (res && typeof res === 'object' && 'samples' in res) ? (res as SessionPnlState) : (res?.state as SessionPnlState | undefined);
        if (!chrome.runtime.lastError && state && Array.isArray(state.samples)) {
          updateSessionRadarUI(state);
          return;
        }
        fallbackLoadSessionRadarFromStorage();
      });
    } else {
      fallbackLoadSessionRadarFromStorage();
    }
  });
}

function fallbackLoadSessionRadarFromStorage(): void {
  chrome.storage.local.get([TILTCHECK_SESSION_PNL_KEY], (res) => {
    const stored = res[TILTCHECK_SESSION_PNL_KEY] as SessionPnlState | undefined;
    if (stored && Array.isArray(stored.samples)) {
      updateSessionRadarUI(stored);
    } else {
      updateSessionRadarUI(DEFAULT_SESSION_PNL_STATE);
    }
  });
}

function initSessionRadarListeners(): void {
  const resetBtn = document.getElementById('btn-reset-radar');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'reset_session_pnl' }, () => {
          // tab might not be a casino tab, ignore error
        });
      }
      chrome.storage.local.remove([TILTCHECK_SESSION_PNL_KEY], () => {
        updateSessionRadarUI(DEFAULT_SESSION_PNL_STATE);
        toast('Session baseline reset.');
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Cashout Goals Progress & One-Click Cashout Router
// ---------------------------------------------------------------------------

let activeCashoutRoute: CasinoCashoutRoute | null = null;

function renderGoalsProgressUI(
  goals: readonly CashoutGoal[],
  balance: number | null,
  netPnl: number,
): void {
  const container = document.getElementById('cashout-goals-progress-list');
  if (!container) return;

  const items = calculateGoalsProgress(goals, balance, netPnl);
  container.innerHTML = '';

  if (items.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'color: var(--muted); font-size: 10px; padding: 6px 0;';
    emptyEl.textContent = 'No cashout goals active. Click Edit Goals to arm one.';
    container.appendChild(emptyEl);
    return;
  }

  for (const item of items) {
    const itemEl = document.createElement('div');
    itemEl.className = 'goal-progress-item' + (item.isAchieved ? ' goal-achieved' : '');

    const metricText = item.metric === 'profit' ? 'profit' : 'bal';
    const topRow = document.createElement('div');
    topRow.className = 'goal-row-top';
    topRow.innerHTML = `
      <span class="goal-name">${item.name}</span>
      <span class="goal-stats"><strong>$${item.currentAmount.toFixed(2)}</strong> / $${item.targetAmount.toFixed(2)} (${item.percent}%)</span>
    `;

    const track = document.createElement('div');
    track.className = 'goal-track';
    const fill = document.createElement('div');
    fill.className = 'goal-fill' + (item.isAchieved ? ' goal-fill-achieved' : '');
    fill.style.width = `${Math.min(100, item.percent)}%`;
    track.appendChild(fill);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'goal-row-bottom';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'goal-status-badge' + (item.isAchieved ? ' badge-achieved' : '');
    statusBadge.textContent = item.isAchieved ? '100% funded - cash out' : `${item.metric === 'profit' ? 'Profit target' : 'Balance target'}`;

    const actionWrap = document.createElement('div');
    actionWrap.style.cssText = 'display: flex; gap: 4px; align-items: center;';

    if (item.linkUrl) {
      const link = document.createElement('a');
      link.href = item.linkUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'goal-action-btn';
      link.textContent = 'Pay / Buy ->';
      actionWrap.appendChild(link);
    }

    if (item.isAchieved) {
      const vaultBtn = document.createElement('button');
      vaultBtn.type = 'button';
      vaultBtn.className = 'goal-action-btn';
      vaultBtn.style.background = '#fbbf24';
      vaultBtn.textContent = 'Vault ->';
      vaultBtn.title = 'Vault target funds into casino safe';
      vaultBtn.addEventListener('click', () => {
        triggerActiveTabAutoVault(item.targetAmount);
      });
      actionWrap.appendChild(vaultBtn);

      const lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.className = 'goal-action-btn';
      lockBtn.textContent = 'Cashier ->';
      lockBtn.title = 'Open cashier to lock in this goal';
      lockBtn.addEventListener('click', () => {
        triggerActiveTabCashout();
      });
      actionWrap.appendChild(lockBtn);

      const solanaLockBtn = document.createElement('button');
      solanaLockBtn.type = 'button';
      solanaLockBtn.className = 'goal-action-btn';
      solanaLockBtn.style.background = '#17c3b2';
      solanaLockBtn.style.color = '#000000';
      solanaLockBtn.textContent = 'Lock ->';
      solanaLockBtn.title = 'Lock goal funds on Solana devnet via Cooldown Vault';
      solanaLockBtn.addEventListener('click', () => {
        triggerActiveTabCooldownVault(item.targetAmount);
      });
      actionWrap.appendChild(solanaLockBtn);
    }

    bottomRow.appendChild(statusBadge);
    bottomRow.appendChild(actionWrap);

    itemEl.appendChild(topRow);
    itemEl.appendChild(track);
    itemEl.appendChild(bottomRow);

    container.appendChild(itemEl);
  }
}

function loadCashoutGoalsProgress(): void {
  chrome.storage.local.get(
    [TILTCHECK_CASHOUT_GOALS_KEY, TILTCHECK_SESSION_PNL_KEY],
    (stored) => {
      const goals = sanitizeCashoutGoals(stored[TILTCHECK_CASHOUT_GOALS_KEY]);
      const pnlState = stored[TILTCHECK_SESSION_PNL_KEY] as SessionPnlState | undefined;
      const balance = pnlState?.currentBalance ?? null;
      const netPnl = pnlState?.netPnl ?? 0;

      renderGoalsProgressUI(goals, balance, netPnl);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const labelEl = document.getElementById('quick-cashout-label');
        if (!labelEl) return;

        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'get_cashout_router_state' }, (res) => {
            if (!chrome.runtime.lastError && res && res.success && res.info) {
              const name = res.info.casinoName;
              if (name) {
                labelEl.textContent = `${res.info.buttonLabel} (${name}) ->`;
                return;
              }
            }

            if (tab?.url) {
              try {
                const parsedUrl = new URL(tab.url);
                const route = findRouteForHostname(parsedUrl.hostname);
                if (route) {
                  activeCashoutRoute = route;
                  labelEl.textContent = `${route.buttonLabel} (${route.name}) ->`;
                  return;
                }
              } catch {
                // Ignore URL parsing errors
              }
            }
            labelEl.textContent = 'One-Click Cashout ->';
          });
        }
      });
    }
  );
}

function triggerActiveTabCashout(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'trigger_cashout_navigation' }, (res) => {
        if (!chrome.runtime.lastError && res && res.navigated) {
          toast(`Navigating to cashier (${res.method})...`);
          return;
        }

        if (tab.url) {
          try {
            const parsed = new URL(tab.url);
            const route = findRouteForHostname(parsed.hostname);
            if (route?.cashierUrl) {
              chrome.tabs.update(tab.id, { url: route.cashierUrl });
              toast(`Redirecting to ${route.name} cashier...`);
              return;
            }
          } catch {
            // ignore
          }
        }
        toast('No active casino detected in current tab.', true);
      });
    }
  });
}

function triggerActiveTabAutoVault(amount: number): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'trigger_auto_vault', amount }, (res) => {
        if (!chrome.runtime.lastError && res && res.vaulted) {
          toast(`Vaulted $${amount.toFixed(2)} to ${res.casinoName} safe!`);
          loadSessionRadar();
          loadCashoutGoalsProgress();
          return;
        }

        toast(res?.error || 'Operator safe not detected. Opening cashier...', true);
        triggerActiveTabCashout();
      });
    }
  });
}

function triggerActiveTabCooldownVault(amount?: number): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    let casinoName = '';
    if (tab?.url) {
      try {
        const parsed = new URL(tab.url);
        const route = findRouteForHostname(parsed.hostname);
        casinoName = route?.name || parsed.hostname.replace(/^www\./, '');
      } catch {
        // ignore
      }
    }

    const targetUrl = buildCooldownVaultUrl({
      casino: casinoName || undefined,
      amount: typeof amount === 'number' && amount > 0 ? amount : undefined,
    });

    chrome.tabs.create({ url: targetUrl });
    toast('Opening on-chain Cooldown Vault...');
  });
}

function initCashoutRouterListeners(): void {
  const cashoutBtn = document.getElementById('btn-quick-cashout');
  if (cashoutBtn) {
    cashoutBtn.addEventListener('click', () => {
      triggerActiveTabCashout();
    });
  }

  const vaultLockBtn = document.getElementById('btn-vault-lock');
  if (vaultLockBtn) {
    vaultLockBtn.addEventListener('click', () => {
      chrome.storage.local.get([TILTCHECK_SESSION_PNL_KEY], (stored) => {
        const pnlState = stored[TILTCHECK_SESSION_PNL_KEY] as SessionPnlState | undefined;
        const amount = pnlState?.netPnl && pnlState.netPnl > 0 ? pnlState.netPnl : undefined;
        triggerActiveTabCooldownVault(amount);
      });
    });
  }

  const editGoalsBtn = document.getElementById('btn-config-goals');
  if (editGoalsBtn) {
    editGoalsBtn.addEventListener('click', () => {
      activateTab('block');
      const panel = document.getElementById('cashout-goals-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Session Win-Streak & Cold-Run Volatility Tracker
// ---------------------------------------------------------------------------

function updateStreakVolatilityUI(state: StreakVolatilityState): void {
  const badge = document.getElementById('streak-badge');
  const currentVal = document.getElementById('streak-current-val');
  const hitRateEl = document.getElementById('streak-hit-rate');
  const maxDeadEl = document.getElementById('streak-max-dead');
  const statusMsgEl = document.getElementById('streak-status-msg');

  if (!badge || !currentVal || !hitRateEl || !maxDeadEl) return;

  // Status badge & styling
  if (state.isDueTrapActive) {
    badge.className = 'streak-badge streak-trap';
    badge.textContent = 'FALLACY TRAP';
  } else if (state.streakAlertLevel === 'CRITICAL_COLD') {
    badge.className = 'streak-badge streak-trap';
    badge.textContent = 'EXTREME COLD';
  } else if (state.consecutiveDeadSpins >= 10 || state.currentStreakType === 'COLD') {
    badge.className = 'streak-badge streak-cold';
    badge.textContent = `${state.consecutiveDeadSpins} DEAD SPINS`;
  } else if (state.consecutiveWins >= 3 || state.currentStreakType === 'HOT') {
    badge.className = 'streak-badge streak-hot';
    badge.textContent = `HEATER (${state.consecutiveWins} W)`;
  } else {
    badge.className = 'streak-badge streak-neutral';
    badge.textContent = state.totalSpins > 0 ? 'Steady Pacing' : 'Tracking Active';
  }

  // Values
  if (state.currentStreakType === 'COLD') {
    currentVal.textContent = `${state.consecutiveDeadSpins} Dead Spins`;
    currentVal.style.color = '#f97316';
  } else if (state.currentStreakType === 'HOT') {
    currentVal.textContent = `${state.consecutiveWins} Wins`;
    currentVal.style.color = '#17c3b2';
  } else {
    currentVal.textContent = '0 Dead Spins';
    currentVal.style.color = 'var(--text)';
  }

  hitRateEl.textContent = `${state.hitRate.toFixed(1)}%`;
  maxDeadEl.textContent = `${state.maxDeadSpins} Spins`;

  if (statusMsgEl) {
    statusMsgEl.textContent = state.alertMessage || 'Pacing steady. Volatility telemetry normal.';
  }
}

function loadStreakVolatility(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'get_streak_volatility_state' }, (res) => {
        if (!chrome.runtime.lastError && res && typeof res.consecutiveDeadSpins === 'number') {
          updateStreakVolatilityUI(res);
          return;
        }
        fallbackLoadStreakVolatilityFromStorage();
      });
    } else {
      fallbackLoadStreakVolatilityFromStorage();
    }
  });
}

function fallbackLoadStreakVolatilityFromStorage(): void {
  chrome.storage.local.get([TILTCHECK_STREAK_VOLATILITY_KEY], (res) => {
    const stored = res[TILTCHECK_STREAK_VOLATILITY_KEY] as StreakVolatilityState | undefined;
    if (stored && typeof stored.consecutiveDeadSpins === 'number') {
      updateStreakVolatilityUI(stored);
    } else {
      updateStreakVolatilityUI(DEFAULT_STREAK_VOLATILITY_STATE);
    }
  });
}

function initStreakVolatilityListeners(): void {
  const resetBtn = document.getElementById('btn-reset-streak');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'reset_streak_volatility' }, () => {
          // tab might not be a casino tab, ignore error
        });
      }
      chrome.storage.local.remove([TILTCHECK_STREAK_VOLATILITY_KEY], () => {
        updateStreakVolatilityUI(DEFAULT_STREAK_VOLATILITY_STATE);
        toast('Streak baseline reset.');
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Client Seed Manager (Issue #539)
// ---------------------------------------------------------------------------

let currentSiteSeed = 'default';
let activeSeedValue = '';

async function detectActiveTabSite(): Promise<string> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url;
        if (url) {
          try {
            const host = new URL(url).hostname;
            resolve(normalizeSiteKey(host));
            return;
          } catch {
            // Ignore URL parse error
          }
        }
        resolve('stake');
      });
    } catch {
      resolve('stake');
    }
  });
}

async function loadSeedManagerState(): Promise<void> {
  const site = await detectActiveTabSite();
  currentSiteSeed = site;

  const siteBadge = document.getElementById('seed-site-badge');
  if (siteBadge) {
    siteBadge.textContent = site.toUpperCase();
  }

  const meta = await extensionSeedManager.getActiveSeed(site);
  activeSeedValue = meta.seed;

  const display = document.getElementById('active-client-seed-display') as HTMLInputElement | null;
  if (display) {
    display.value = meta.seed;
  }

  const hygieneBadge = document.getElementById('seed-hygiene-badge');
  if (hygieneBadge) {
    hygieneBadge.textContent = `${meta.hygieneStatus.charAt(0).toUpperCase() + meta.hygieneStatus.slice(1)} · ${meta.entropyBits} bits`;
    if (meta.hygieneStatus === 'strong') {
      hygieneBadge.style.color = '#34d399';
      hygieneBadge.style.background = 'rgba(52,211,153,0.15)';
    } else if (meta.hygieneStatus === 'acceptable') {
      hygieneBadge.style.color = '#fbbf24';
      hygieneBadge.style.background = 'rgba(251,191,36,0.15)';
    } else {
      hygieneBadge.style.color = '#ef4444';
      hygieneBadge.style.background = 'rgba(239,68,68,0.15)';
    }
  }

  const countLabel = document.getElementById('seed-rotation-count-label');
  if (countLabel) {
    countLabel.textContent = `${meta.rotationCount} rotations`;
  }
}

function initSeedManagerPanel(): void {
  const copyBtn = document.getElementById('btn-copy-client-seed');
  const rotateBtn = document.getElementById('btn-rotate-client-seed');
  const applyBtn = document.getElementById('btn-apply-seed-page');
  const confirmApplyBtn = document.getElementById('btn-confirm-apply-seed');
  const cancelApplyBtn = document.getElementById('btn-cancel-apply-seed');
  const confirmBox = document.getElementById('seed-apply-confirmation-box');
  const statusMsg = document.getElementById('seed-apply-status-msg');
  const toggleHistoryBtn = document.getElementById('btn-toggle-seed-history');
  const historyDrawer = document.getElementById('seed-history-drawer');
  const historyList = document.getElementById('seed-history-list');

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!activeSeedValue) return;
      try {
        await navigator.clipboard.writeText(activeSeedValue);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText || 'Copy Seed';
        }, 1500);
      } catch {
        toast('Failed to copy seed to clipboard', true);
      }
    });
  }

  if (rotateBtn) {
    rotateBtn.addEventListener('click', async () => {
      try {
        const { newSeed } = await extensionSeedManager.rotateSeed(currentSiteSeed, {
          format: 'alphanumeric',
          length: 32,
          reason: 'manual-rotation',
        });
        activeSeedValue = newSeed.seed;
        await loadSeedManagerState();
        toast('New client seed generated on-device');
      } catch {
        toast('Seed rotation failed', true);
      }
    });
  }

  if (applyBtn && confirmBox) {
    applyBtn.addEventListener('click', () => {
      confirmBox.style.display = 'block';
      if (statusMsg) statusMsg.style.display = 'none';
    });
  }

  if (cancelApplyBtn && confirmBox) {
    cancelApplyBtn.addEventListener('click', () => {
      confirmBox.style.display = 'none';
    });
  }

  if (confirmApplyBtn && confirmBox) {
    confirmApplyBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
          toast('No active browser tab found', true);
          confirmBox.style.display = 'none';
          return;
        }

        chrome.tabs.sendMessage(
          tabId,
          {
            type: 'apply_client_seed_to_page',
            seed: activeSeedValue,
            confirmed: true,
          },
          (res) => {
            confirmBox.style.display = 'none';
            if (statusMsg) {
              statusMsg.style.display = 'block';
              if (res && res.applied) {
                statusMsg.style.color = '#17c3b2';
                statusMsg.textContent = res.message || 'Seed applied to page input.';
                toast('Client seed applied to page.');
              } else {
                statusMsg.style.color = '#fbbf24';
                statusMsg.textContent = res?.message || 'Could not find client seed field on this page.';
              }
            }
          }
        );
      });
    });
  }

  if (toggleHistoryBtn && historyDrawer && historyList) {
    toggleHistoryBtn.addEventListener('click', async () => {
      const isVisible = historyDrawer.style.display === 'block';
      if (isVisible) {
        historyDrawer.style.display = 'none';
        toggleHistoryBtn.textContent = 'View Rotation History';
      } else {
        historyDrawer.style.display = 'block';
        toggleHistoryBtn.textContent = 'Hide Rotation History';

        const history = await extensionSeedManager.getHistory(currentSiteSeed);
        if (history.length === 0) {
          historyList.innerHTML = '<div style="padding:4px 0;">No previous rotations recorded.</div>';
        } else {
          historyList.innerHTML = history
            .slice(0, 10)
            .map(
              (item) => `
              <div style="padding:4px 0; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${item.seed}</span>
                <span style="color:#64748b; font-size:8px;">${new Date(item.retiredAt).toLocaleTimeString()}</span>
              </div>
            `
            )
            .join('');
        }
      }
    });
  }
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
// Guards settings (Touch Grass + strategic blocklist)
// ---------------------------------------------------------------------------

let guardSlugs: string[] = [];
let guardCategories: GameCategory[] = [];

function setTouchGrassControlsEnabled(enabled: boolean): void {
  const fieldset = document.getElementById('slider-controls') as HTMLFieldSetElement | null;
  if (fieldset) fieldset.disabled = !enabled;
}

function setGameBlockControlsEnabled(enabled: boolean): void {
  const container = $<HTMLDivElement>('game-block-controls-container');
  container.style.opacity = enabled ? '1' : '0.45';
  container.style.pointerEvents = enabled ? 'auto' : 'none';
}

function syncRiskSliderUi(value: number): void {
  const slider = document.getElementById('risk-threshold-slider') as HTMLInputElement | null;
  const label = document.getElementById('risk-threshold-label');
  const clamped = clampRisk(value);
  if (slider) slider.value = String(clamped);
  if (label) label.textContent = `${clamped} — ${riskLabel(clamped)}`;
}

function renderSlugRegistry(): void {
  const registry = $('slug-registry');
  if (guardSlugs.length === 0) {
    registry.innerHTML = '<span class="guard-note" style="margin:0">No slugs armed.</span>';
  } else {
    registry.innerHTML = guardSlugs
      .map(
        (slug) =>
          `<span class="registry-chip">${slug}<button type="button" data-remove-slug="${slug}" aria-label="Remove ${slug}">×</button></span>`
      )
      .join('');
  }

  document.querySelectorAll<HTMLButtonElement>('.slug-chip[data-slug]').forEach((btn) => {
    const slug = btn.dataset['slug'] ?? '';
    btn.classList.toggle('active', guardSlugs.includes(slug));
  });
  document.querySelectorAll<HTMLButtonElement>('.slug-chip[data-category]').forEach((btn) => {
    const category = btn.dataset['category'] ?? '';
    btn.classList.toggle('active', guardCategories.includes(category as GameCategory));
  });
}

let currentGoals: CashoutGoal[] = [];
let currentBonusConfig: BonusTrackerConfig = { ...DEFAULT_BONUS_TRACKER_CONFIG };

function renderGoalsList(): void {
  const container = document.getElementById('cashout-goals-list');
  if (!container) return;
  container.innerHTML = '';

  if (currentGoals.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = 'rgba(160, 175, 190, 0.6)';
    empty.style.fontSize = '11px';
    empty.textContent = 'No cashout goals set. Add one below.';
    container.appendChild(empty);
    return;
  }

  for (const goal of currentGoals) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 8px';
    row.style.background = 'rgba(255, 255, 255, 0.04)';
    row.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    row.style.borderRadius = '4px';
    row.style.fontSize = '12px';

    const left = document.createElement('label');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '6px';
    left.style.cursor = 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = goal.enabled;
    checkbox.addEventListener('change', async () => {
      currentGoals = toggleGoalInList(currentGoals, goal.id);
      await saveCashoutGoals(currentGoals);
      renderGoalsList();
    });

    const nameSpan = document.createElement('span');
    nameSpan.textContent = goal.name;
    if (!goal.enabled) {
      nameSpan.style.opacity = '0.4';
      nameSpan.style.textDecoration = 'line-through';
    }

    left.appendChild(checkbox);
    left.appendChild(nameSpan);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '8px';

    const badge = document.createElement('span');
    badge.style.fontFamily = 'var(--mono)';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = '700';
    badge.style.color = '#17c3b2';
    badge.textContent = goal.metric === 'profit' ? '+' + '$' + goal.targetAmount : '$' + goal.targetAmount;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'x';
    removeBtn.style.background = 'transparent';
    removeBtn.style.border = 'none';
    removeBtn.style.color = 'rgba(160, 175, 190, 0.6)';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.fontSize = '12px';
    removeBtn.style.padding = '0 4px';
    removeBtn.addEventListener('click', async () => {
      currentGoals = removeGoalFromList(currentGoals, goal.id);
      await saveCashoutGoals(currentGoals);
      renderGoalsList();
    });

    right.appendChild(badge);
    right.appendChild(removeBtn);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  }
}

async function refreshGuardSettingsUi(): Promise<void> {
  const touch = await loadTouchGrassUiState();
  $<HTMLInputElement>('opt-in-checkbox').checked = touch.optIn;
  setTouchGrassControlsEnabled(touch.optIn);
  syncRiskSliderUi(touch.riskThreshold);

  const wageInput = document.getElementById('hourly-wage-input') as HTMLInputElement | null;
  if (wageInput) {
    wageInput.value = String(touch.hourlyWage);
  }

  const realityToggle = document.getElementById('reality-hud-toggle') as HTMLInputElement | null;
  if (realityToggle) {
    realityToggle.checked = touch.realityHudEnabled;
  }

  const depositToggle = document.getElementById('deposit-barrier-toggle') as HTMLInputElement | null;
  if (depositToggle) {
    depositToggle.checked = touch.depositBarrierEnabled;
  }

  const reverseShieldToggle = document.getElementById('reverse-withdrawal-shield-toggle') as HTMLInputElement | null;
  if (reverseShieldToggle) {
    reverseShieldToggle.checked = touch.reverseWithdrawalShieldEnabled;
  }

  const profitLockToggle = document.getElementById('profit-lock-toggle') as HTMLInputElement | null;
  if (profitLockToggle) {
    profitLockToggle.checked = touch.profitLockEnabled;
  }

  const trailingSelect = document.getElementById('trailing-percent-select') as HTMLSelectElement | null;
  if (trailingSelect) {
    trailingSelect.value = String(touch.trailingPercent);
  }

  const goalsToggle = document.getElementById('cashout-goals-toggle') as HTMLInputElement | null;
  if (goalsToggle) {
    goalsToggle.checked = touch.goalsEnabled;
  }

  currentGoals = [...(touch.goals || [])];
  renderGoalsList();

  currentBonusConfig = touch.bonusConfig ? { ...touch.bonusConfig } : { ...DEFAULT_BONUS_TRACKER_CONFIG };
  const bonusToggle = document.getElementById('bonus-tracker-toggle') as HTMLInputElement | null;
  if (bonusToggle) {
    bonusToggle.checked = currentBonusConfig.active;
  }
  const bonusNameInput = document.getElementById('bonus-name-input') as HTMLInputElement | null;
  if (bonusNameInput) {
    bonusNameInput.value = currentBonusConfig.bonusName;
  }
  const bonusTargetInput = document.getElementById('bonus-target-wager') as HTMLInputElement | null;
  if (bonusTargetInput) {
    bonusTargetInput.value = String(currentBonusConfig.targetWager);
  }
  const bonusMaxBetInput = document.getElementById('bonus-max-bet') as HTMLInputElement | null;
  if (bonusMaxBetInput) {
    bonusMaxBetInput.value = String(currentBonusConfig.maxBetLimit);
  }
  const bonusBlockToggle = document.getElementById('bonus-block-exceeded-toggle') as HTMLInputElement | null;
  if (bonusBlockToggle) {
    bonusBlockToggle.checked = currentBonusConfig.blockExceededBets;
  }

  const cooldownStatus = document.getElementById('deposit-cooldown-status');
  if (cooldownStatus) {
    const isCooldown = touch.cooldownActiveUntil > Date.now();
    cooldownStatus.style.display = isCooldown ? 'block' : 'none';
    if (isCooldown) {
      const remainingMins = Math.max(1, Math.ceil((touch.cooldownActiveUntil - Date.now()) / 60000));
      cooldownStatus.textContent = `Voluntary lock engaged (${remainingMins}m remaining).`;
    }
  }

  const cooldownWalletInput = document.getElementById('cooldown-wallet-input') as HTMLInputElement | null;
  if (cooldownWalletInput && touch.cooldownWallet) {
    cooldownWalletInput.value = touch.cooldownWallet;
  }

  const defaultBetToggle = document.getElementById('default-bet-breaker-toggle') as HTMLInputElement | null;
  if (defaultBetToggle) {
    defaultBetToggle.checked = touch.defaultBetBreakerEnabled;
  }
  const baseStakeInput = document.getElementById('base-stake-threshold-input') as HTMLInputElement | null;
  if (baseStakeInput) {
    baseStakeInput.value = touch.baseStakeThreshold.toFixed(2);
  }
  const autoLockToggle = document.getElementById('auto-lock-on-tilt-toggle') as HTMLInputElement | null;
  if (autoLockToggle) {
    autoLockToggle.checked = touch.autoLockOnTilt;
  }

  const audioToggle = document.getElementById('audio-alerts-toggle') as HTMLInputElement | null;
  if (audioToggle) {
    audioToggle.checked = touch.audioAlertsEnabled;
  }

  const audioVolumeSelect = document.getElementById('audio-volume-select') as HTMLSelectElement | null;
  if (audioVolumeSelect) {
    const formatted = touch.audioAlertsVolume.toFixed(2);
    audioVolumeSelect.value = formatted;
    if (!audioVolumeSelect.value) {
      audioVolumeSelect.value = '0.25';
    }
  }

  const game = await loadGameBlockUiState();
  $<HTMLInputElement>('game-block-master-toggle').checked = game.optIn;
  guardSlugs = [...game.slugs];
  guardCategories = [...game.categories];
  setGameBlockControlsEnabled(game.optIn);
  renderSlugRegistry();
}

function initGuardSettingsPanel(): void {
  void refreshGuardSettingsUi();

  $<HTMLInputElement>('opt-in-checkbox').addEventListener('change', async (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    await saveTouchGrassOptIn(enabled);
    setTouchGrassControlsEnabled(enabled);
    toast(enabled ? 'Spin brake armed.' : 'Spin brake off.');
  });

  const defaultBetToggle = document.getElementById('default-bet-breaker-toggle') as HTMLInputElement | null;
  if (defaultBetToggle) {
    defaultBetToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveDefaultBetBreakerEnabled(enabled);
      toast(enabled ? 'Default bet breaker armed.' : 'Default bet breaker off.');
    });
  }

  const baseStakeInput = document.getElementById('base-stake-threshold-input') as HTMLInputElement | null;
  if (baseStakeInput) {
    const handleBaseStakeChange = async () => {
      const val = Number(baseStakeInput.value);
      if (val > 0) {
        await saveBaseStakeThreshold(val);
        toast(`Base stake threshold set to ${val.toFixed(2)}.`);
      }
    };
    baseStakeInput.addEventListener('change', handleBaseStakeChange);
    baseStakeInput.addEventListener('blur', handleBaseStakeChange);
  }

  const wageInput = document.getElementById('hourly-wage-input') as HTMLInputElement | null;
  if (wageInput) {
    const handleWageChange = async () => {
      const val = Number(wageInput.value);
      const saved = await saveHourlyWage(val);
      wageInput.value = String(saved);
      toast('Hourly wage saved.');
    };
    wageInput.addEventListener('change', handleWageChange);
  }

  const realityToggle = document.getElementById('reality-hud-toggle') as HTMLInputElement | null;
  if (realityToggle) {
    realityToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveRealityHudEnabled(enabled);
      toast(enabled ? 'Reality HUD enabled.' : 'Reality HUD disabled.');
    });
  }

  const depositToggle = document.getElementById('deposit-barrier-toggle') as HTMLInputElement | null;
  if (depositToggle) {
    depositToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveDepositBarrierEnabled(enabled);
      toast(enabled ? 'Deposit barrier enabled.' : 'Deposit barrier disabled.');
    });
  }

  const btnSyncCooldown = document.getElementById('btn-sync-cooldown');
  const cooldownWalletField = document.getElementById('cooldown-wallet-input') as HTMLInputElement | null;
  if (btnSyncCooldown && cooldownWalletField) {
    btnSyncCooldown.addEventListener('click', async () => {
      const wallet = cooldownWalletField.value.trim();
      if (!wallet || wallet.length < 32 || wallet.length > 44) {
        toast('Enter a valid Solana address (32-44 characters).');
        return;
      }
      btnSyncCooldown.textContent = 'Syncing...';
      try {
        await saveCooldownWallet(wallet);
        chrome.runtime?.sendMessage?.({ type: 'sync_cooldown_wallet', wallet }, () => {
          btnSyncCooldown.textContent = 'Synced';
          toast('On-chain cooldown lock synced.');
          setTimeout(() => {
            btnSyncCooldown.textContent = 'Sync';
          }, 2000);
        });
      } catch {
        btnSyncCooldown.textContent = 'Sync';
      }
    });
  }

  const autoLockToggleInput = document.getElementById('auto-lock-on-tilt-toggle') as HTMLInputElement | null;
  if (autoLockToggleInput) {
    autoLockToggleInput.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveAutoLockOnTilt(enabled);
      toast(enabled ? 'Tilt auto-lock armed.' : 'Tilt auto-lock disabled.');
    });
  }

  const reverseShieldToggle = document.getElementById('reverse-withdrawal-shield-toggle') as HTMLInputElement | null;
  if (reverseShieldToggle) {
    reverseShieldToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveReverseWithdrawalShieldEnabled(enabled);
      toast(enabled ? 'Reverse-withdrawal shield armed.' : 'Reverse-withdrawal shield disabled.');
    });
  }

  const profitLockToggle = document.getElementById('profit-lock-toggle') as HTMLInputElement | null;
  if (profitLockToggle) {
    profitLockToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveProfitLockEnabled(enabled);
      toast(enabled ? 'Profit-lock ratchet armed.' : 'Profit-lock ratchet disabled.');
    });
  }

  const trailingSelect = document.getElementById('trailing-percent-select') as HTMLSelectElement | null;
  if (trailingSelect) {
    trailingSelect.addEventListener('change', async (e) => {
      const val = Number((e.target as HTMLSelectElement).value);
      await saveProfitLockTrailingPercent(val);
      toast('Trailing floor set to ' + val + '% of peak profit.');
    });
  }

  const goalsToggle = document.getElementById('cashout-goals-toggle') as HTMLInputElement | null;
  if (goalsToggle) {
    goalsToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveCashoutGoalsEnabled(enabled);
      toast(enabled ? 'Reality cashout goals armed.' : 'Reality cashout goals disabled.');
    });
  }

  const addGoalBtn = document.getElementById('add-goal-btn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('new-goal-name') as HTMLInputElement | null;
      const amountInput = document.getElementById('new-goal-amount') as HTMLInputElement | null;
      const name = nameInput?.value.trim() || '';
      const amount = Number(amountInput?.value);

      if (!name) {
        toast('Enter a bill or item name.');
        return;
      }
      if (!amount || amount <= 0) {
        toast('Enter a valid dollar amount.');
        return;
      }

      const newGoal: CashoutGoal = {
        id: 'custom_' + Date.now(),
        name,
        targetAmount: Math.round(amount * 100) / 100,
        metric: 'balance',
        enabled: true,
      };

      currentGoals = addGoalToList(currentGoals, newGoal);
      await saveCashoutGoals(currentGoals);
      renderGoalsList();

      if (nameInput) nameInput.value = '';
      if (amountInput) amountInput.value = '';
      toast('Goal "' + name + '" added.');
    });
  }

  const bonusToggle = document.getElementById('bonus-tracker-toggle') as HTMLInputElement | null;
  if (bonusToggle) {
    bonusToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      currentBonusConfig.active = enabled;
      await saveBonusTrackerConfig(currentBonusConfig);
      toast(enabled ? 'Bonus playthrough tracker armed.' : 'Bonus playthrough tracker off.');
    });
  }

  const bonusSaveBtn = document.getElementById('bonus-save-btn');
  if (bonusSaveBtn) {
    bonusSaveBtn.addEventListener('click', async () => {
      const name = (document.getElementById('bonus-name-input') as HTMLInputElement)?.value.trim() || 'Deposit Bonus';
      const target = Number((document.getElementById('bonus-target-wager') as HTMLInputElement)?.value) || 1000;
      const maxBet = Number((document.getElementById('bonus-max-bet') as HTMLInputElement)?.value) || 5;
      const block = (document.getElementById('bonus-block-exceeded-toggle') as HTMLInputElement)?.checked ?? true;

      currentBonusConfig = {
        ...currentBonusConfig,
        active: true,
        bonusName: name,
        targetWager: Math.max(10, target),
        maxBetLimit: Math.max(0.5, maxBet),
        blockExceededBets: block,
      };

      if (bonusToggle) bonusToggle.checked = true;
      await saveBonusTrackerConfig(currentBonusConfig);
      toast('Bonus tracker armed (' + name + ').');
    });
  }

  const bonusResetBtn = document.getElementById('bonus-reset-btn');
  if (bonusResetBtn) {
    bonusResetBtn.addEventListener('click', async () => {
      currentBonusConfig.currentWagered = 0;
      await saveBonusTrackerConfig(currentBonusConfig);
      toast('Bonus wagering progress reset to $0.00.');
    });
  }

  const riskSlider = document.getElementById('risk-threshold-slider') as HTMLInputElement | null;
  if (riskSlider) {
    riskSlider.addEventListener('input', async (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      syncRiskSliderUi(value);
      await saveRiskThreshold(value);
    });
  }

  const audioToggle = document.getElementById('audio-alerts-toggle') as HTMLInputElement | null;
  if (audioToggle) {
    audioToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveAudioAlertsEnabled(enabled);
      if (enabled) {
        playAudioCue('click');
      }
      toast(enabled ? 'Spotter sound alerts enabled.' : 'Spotter sound alerts muted.');
    });
  }

  const audioVolumeSelect = document.getElementById('audio-volume-select') as HTMLSelectElement | null;
  if (audioVolumeSelect) {
    audioVolumeSelect.addEventListener('change', async (e) => {
      const vol = Number((e.target as HTMLSelectElement).value);
      await saveAudioAlertsVolume(vol);
      playAudioCue('heater_alert', vol);
      toast('Alert volume set to ' + Math.round(vol * 100) + '%.');
    });
  }

  const btnTestSound = document.getElementById('btn-test-sound');
  if (btnTestSound) {
    btnTestSound.addEventListener('click', () => {
      const vol = Number(audioVolumeSelect?.value ?? 0.25);
      playAudioCue('heater_alert', vol);
      toast('Playing test audio cue.');
    });
  }

  $<HTMLInputElement>('game-block-master-toggle').addEventListener('change', async (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    await saveGameBlockOptIn(enabled);
    setGameBlockControlsEnabled(enabled);
    toast(enabled ? 'Strategic filters armed.' : 'Strategic filters off.');
  });

  document.querySelectorAll<HTMLButtonElement>('.slug-chip[data-slug]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!$<HTMLInputElement>('game-block-master-toggle').checked) return;
      const slug = btn.dataset['slug'] ?? '';
      guardSlugs = toggleSlugInList(guardSlugs, slug);
      await saveBlockedGames(guardSlugs);
      renderSlugRegistry();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.slug-chip[data-category]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!$<HTMLInputElement>('game-block-master-toggle').checked) return;
      const category = btn.dataset['category'] ?? '';
      guardCategories = toggleCategoryInList(guardCategories, category);
      await saveBlockedCategories(guardCategories);
      renderSlugRegistry();
      const label = GAME_EXCLUSION_CATEGORY_LABELS[category as GameCategory] ?? category;
      toast(guardCategories.includes(category as GameCategory) ? `${label} blocked.` : `${label} unblocked.`);
    });
  });

  $('btn-add-slug').addEventListener('click', async () => {
    if (!$<HTMLInputElement>('game-block-master-toggle').checked) return;
    const input = $<HTMLInputElement>('custom-slug-input');
    const next = addCustomSlug(guardSlugs, input.value);
    if (next.length === guardSlugs.length) {
      toast('Invalid slug. Use letters and numbers only.', true);
      return;
    }
    guardSlugs = next;
    input.value = '';
    await saveBlockedGames(guardSlugs);
    renderSlugRegistry();
    toast('Slug added.');
  });

  $('slug-registry').addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const remove = target.closest<HTMLButtonElement>('[data-remove-slug]');
    if (!remove || !$<HTMLInputElement>('game-block-master-toggle').checked) return;
    const slug = remove.dataset['removeSlug'] ?? '';
    guardSlugs = guardSlugs.filter((s) => s !== slug);
    await saveBlockedGames(guardSlugs);
    renderSlugRegistry();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const keys = Object.keys(changes);
    if (
      keys.some((k) =>
        k.startsWith('tiltcheck_') && k !== 'activityFeed' && k !== TILTCHECK_SESSION_PNL_KEY
      )
    ) {
      void refreshGuardSettingsUi();
    }
    if (changes.activityFeed) {
      loadFeed();
    }
    if (changes[TILTCHECK_SESSION_PNL_KEY]) {
      const newVal = changes[TILTCHECK_SESSION_PNL_KEY].newValue as SessionPnlState | undefined;
      if (newVal) {
        updateSessionRadarUI(newVal);
      } else {
        updateSessionRadarUI(DEFAULT_SESSION_PNL_STATE);
      }
      loadCashoutGoalsProgress();
      void updateSessionStatusPill();
    }
    if (changes[TILTCHECK_CASHOUT_GOALS_KEY]) {
      loadCashoutGoalsProgress();
    }
    if (changes[TILTCHECK_STREAK_VOLATILITY_KEY]) {
      const newVal = changes[TILTCHECK_STREAK_VOLATILITY_KEY].newValue as StreakVolatilityState | undefined;
      if (newVal) {
        updateStreakVolatilityUI(newVal);
      } else {
        updateStreakVolatilityUI(DEFAULT_STREAK_VOLATILITY_STATE);
      }
      void updateSessionStatusPill();
    }
  });
}

// ---------------------------------------------------------------------------
// Onboarding Wizard
// ---------------------------------------------------------------------------

function initOnboardingWizard(): void {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  const btnTutorial = document.getElementById('btn-tutorial');
  const btnClose = document.getElementById('btn-close-onboarding');

  const stepDots = overlay.querySelectorAll('.step-dot');
  const stepPanels = [
    document.getElementById('onboarding-step-1'),
    document.getElementById('onboarding-step-2'),
    document.getElementById('onboarding-step-3'),
    document.getElementById('onboarding-step-4'),
  ];

  let currentStep = 1;

  function renderWizardGoals() {
    const container = document.getElementById('wizard-goal-list');
    if (!container) return;
    container.innerHTML = currentGoals.map(goal => `
      <label class="guard-opt-row" style="margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
        <span>
          <input type="checkbox" class="wizard-goal-toggle" data-id="${goal.id}" ${goal.enabled !== false ? 'checked' : ''} />
          <strong style="margin-left:6px;">${goal.name}</strong>
        </span>
        <span style="font-family:var(--mono); font-size:11px; color:#17c3b2;">${goal.targetAmount.toFixed(2)}</span>
      </label>
    `).join('');

    container.querySelectorAll('.wizard-goal-toggle').forEach(el => {
      el.addEventListener('change', async (e) => {
        const id = (e.target as HTMLElement).dataset['id'];
        if (id) {
          currentGoals = toggleGoalInList(currentGoals, id);
          await saveCashoutGoals(currentGoals);
          renderGoalsList();
        }
      });
    });
  }

  function showStep(stepNum: number) {
    currentStep = Math.max(1, Math.min(4, stepNum));
    stepPanels.forEach((panel, idx) => {
      if (panel) {
        panel.style.display = idx + 1 === currentStep ? 'block' : 'none';
      }
    });
    stepDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx + 1 === currentStep);
    });
    if (currentStep === 3) {
      renderWizardGoals();
    }
  }

  function openWizard(startStep = 1) {
    showStep(startStep);
    overlay.style.display = 'flex';
    document.body.classList.add('has-modal');
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    overlay.scrollTop = 0;
  }

  function closeWizard() {
    overlay.style.display = 'none';
    document.body.classList.remove('has-modal');
  }

  btnTutorial?.addEventListener('click', (e) => {
    e.preventDefault();
    openWizard(1);
  });

  btnClose?.addEventListener('click', (e) => {
    e.preventDefault();
    closeWizard();
  });

  stepDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => showStep(idx + 1));
  });

  // Step navigation
  document.getElementById('btn-step-1-next')?.addEventListener('click', () => showStep(2));
  document.getElementById('btn-step-2-back')?.addEventListener('click', () => showStep(1));
  document.getElementById('btn-step-2-next')?.addEventListener('click', () => showStep(3));
  document.getElementById('btn-step-3-back')?.addEventListener('click', () => showStep(2));
  document.getElementById('btn-step-3-next')?.addEventListener('click', () => showStep(4));
  document.getElementById('btn-step-4-back')?.addEventListener('click', () => showStep(3));

  // Goal master toggle in step 3
  const goalsEnabledToggle = document.getElementById('wizard-goals-enabled-toggle') as HTMLInputElement | null;
  if (goalsEnabledToggle) {
    goalsEnabledToggle.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await saveCashoutGoalsEnabled(enabled);
      toast(enabled ? 'Cashout goals enabled.' : 'Cashout goals off.');
    });
  }

  // Finish button in step 4
  document.getElementById('btn-finish-onboarding')?.addEventListener('click', async () => {
    const spinLock = (document.getElementById('wizard-spin-lock-toggle') as HTMLInputElement)?.checked ?? true;
    const realityHud = (document.getElementById('wizard-reality-hud-toggle') as HTMLInputElement)?.checked ?? true;
    const soundAlerts = (document.getElementById('wizard-sound-alerts-toggle') as HTMLInputElement)?.checked ?? true;
    const wage = Number((document.getElementById('wizard-hourly-wage-input') as HTMLInputElement)?.value) || 25;

    await saveTouchGrassOptIn(spinLock);
    await saveRealityHudEnabled(realityHud);
    await saveAudioAlertsEnabled(soundAlerts);
    await saveHourlyWage(wage);
    await saveOnboardingCompleted(true);

    void refreshGuardSettingsUi();
    closeWizard();
    toast('TiltCheck guardrails armed.');
  });

  // Auto-launch on first run if never completed
  void loadOnboardingCompleted().then((completed) => {
    if (!completed) {
      openWizard(1);
    }
  });
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function activateTab(id: string) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${id}"]`)!.classList.add('active');
  $(`panel-${id}`).classList.add('active');

  if (id === 'status') {
    loadSessionRadar();
    loadCashoutGoalsProgress();
    loadStreakVolatility();
  }
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
  attachAuthStorageSync();
  void updateSessionStatusPill();
  loadFeed();

  if (userId && userData?.discordId) {
    loadStatus();
  } else {
    void updateSessionStatusPill();
  }

  // Detach window listener
  const isStandaloneWindow = new URLSearchParams(window.location.search).get('mode') === 'window';
  if (isStandaloneWindow) {
    document.documentElement.classList.add('standalone-window');
    document.body.classList.add('standalone-window');
    const detachBtn = document.getElementById('btn-detach-window');
    if (detachBtn) detachBtn.style.display = 'none';
  }
  const detachBtn = document.getElementById('btn-detach-window');
  if (detachBtn) {
    detachBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = chrome.runtime.getURL('popup.html?mode=window');
      try {
        if (typeof chrome !== 'undefined' && chrome.windows?.create) {
          chrome.windows.create(
            {
              url,
              type: 'popup',
              width: 440,
              height: 720,
              focused: true,
            },
            (newWin) => {
              if (chrome.runtime.lastError || !newWin) {
                chrome.tabs.create({ url });
              }
              window.close();
            }
          );
        } else {
          chrome.tabs.create({ url });
          window.close();
        }
      } catch {
        chrome.tabs.create({ url });
        window.close();
      }
    });
  }

  initOnboardingWizard();
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab((tab as HTMLButtonElement).dataset['tab']!);
    });
  });

  $('btn-add-toggle').addEventListener('click', () => openDashboardTab('safety'));

  // Auth
  $('btn-login').addEventListener('click', () => {
    const authUrl = getDiscordLoginUrl('extension');
    const button = $<HTMLButtonElement>('btn-login');
    button.disabled = true;
    button.textContent = 'Connecting...';

    chrome.runtime.sendMessage({ type: 'open_auth_bridge', url: authUrl }, (response) => {
      button.disabled = false;
      button.textContent = 'Log in with Discord';
      if (chrome.runtime.lastError || !response?.success) {
        chrome.tabs.create({ url: 'https://tiltcheck.me/login' });
        toast('Opening TiltCheck login portal...');
      } else {
        toast('Discord sign-in tab opened.');
      }
    });
  });
  $('btn-magic-login').addEventListener('click', () => {
    const email = ($<HTMLInputElement>('magic-email')).value.trim();
    if (!email) {
      toast('Enter your email first.', true);
      return;
    }
    chrome.tabs.create({ url: `https://tiltcheck.me/login?email=${encodeURIComponent(email)}` });
    toast('Redirecting to TiltCheck web login...');
  });

  // Dashboard
  $('btn-open-dashboard').addEventListener('click', () => {
    openDashboardTab('profile');
  });

  $('btn-logout').addEventListener('click', () => {
    void performLogout();
  });

  // Activity refresh
  $('btn-refresh-feed').addEventListener('click', loadFeed);
  $('btn-clear-feed')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ activityFeed: [] });
    loadFeed();
    toast('Activity feed cleared.');
  });

  // Settings gear opens Guards tab (local circuit breaker + strategic filters)
  $('btn-settings').addEventListener('click', () => {
    activateTab('block');
  });

  initGuardSettingsPanel();
  initSessionRadarListeners();
  initCashoutRouterListeners();
  initStreakVolatilityListeners();
  initSeedManagerPanel();
  loadSeedManagerState();
  loadSessionRadar();
  loadCashoutGoalsProgress();
  loadStreakVolatility();

  // Vault listeners
  initVaultListeners();
  loadFeed();

  // Guests land on Guards (2s spin lock). Signed-in users get Status.
  activateTab(userId ? 'status' : 'block');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  void init();
}


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
  // Always load session total from storage
  chrome.storage.local.get(['vaultSessionTotal'], (d: PopupStorageSnapshot) => {
    vaultSessionTotal = d.vaultSessionTotal ?? 0;
    $('vault-session-total').textContent = `$${vaultSessionTotal.toFixed(2)}`;
  });

  const linkedDiscordId = getLinkedDiscordRouteId();
  if (!linkedDiscordId) {
    hide('vault-loading');
    show('vault-empty');
    return;
  }
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
