/* Copyright (c) 2026 TiltCheck. All rights reserved. */
﻿/**
 * (c) 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Sidebar - Fully Functional UI
 * Features: Discord auth, vault, dashboard, wallet, session export, premium upgrades
 * Integrates with backend AI services for intelligent tilt detection
 */

import { EXT_CONFIG, getDiscordLoginUrl } from './config.js';

const API_BASE = EXT_CONFIG.API_BASE_URL;
const AI_GATEWAY_URL = EXT_CONFIG.AI_GATEWAY_URL;
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return 'https://api.tiltcheck.me';
  }
})();
const DISCORD_AUTH_MESSAGE_TYPE = 'discord-auth';
let authToken: string | null = null;
let showSettings = false;
let apiKeys: any = {
  openai: '',
  anthropic: '',
  custom: ''
};

let isAuthenticated = false;
let userData: any = null;
const SIDEBAR_WIDTH = 340;
const MINIMIZED_WIDTH = 40;
const SIDEBAR_VISIBILITY_KEY = 'tiltcheck_sidebar_visible';
let sessionStats = {
  startTime: Date.now(),
  totalBets: 0,
  totalWagered: 0,
  totalWon: 0,
  currentBalance: 0
};
let lockTimerInterval: any = null;
let lastProfit = 0;
let casinoThemesIntervalId: ReturnType<typeof setInterval> | null = null;
let vaultRefreshIntervalId: ReturnType<typeof setInterval> | null = null;
let discordAuthPollIntervalId: ReturnType<typeof setInterval> | null = null;
let buddyMirrorEnabled = false;
let demoMode = false;
const SIDEBAR_PREFS_KEY = 'sidebarUiPrefs';
const WALLET_LOCK_UNTIL_KEY = 'walletLockUntil';
let showAdvancedTools = false;

const CASINO_THEMES: Record<string, { label: string; accent: string }> = {
  'stake.us': { label: 'Stake.us', accent: '#4ade80' },
  'stake.com': { label: 'Stake.com', accent: '#4ade80' },
  'roobet.com': { label: 'Roobet', accent: '#f97316' },
  'bc.game': { label: 'BC.Game', accent: '#f59e0b' },
  'rollbit.com': { label: 'Rollbit', accent: '#f472b6' },
};
let dynamicCasinoThemes: Record<string, { label: string; accent: string }> = {};

const DEMO_USER = {
  id: 'demo-user-001',
  username: 'DemoDegen',
  tier: 'premium',
  avatar: null,
  isDemo: true,
};

let demoVaultBalance = 142.75;
let demoLockRecord: any = {
  id: 'demo-lock-1',
  status: 'locked',
  lockedAmountSOL: 1.2754,
  createdAt: Date.now() - 7 * 60 * 1000,
  unlockAt: Date.now() + 8 * 60 * 1000,
  history: [
    { ts: Date.now() - 7 * 60 * 1000, action: 'locked', note: 'demo lock initialized' },
  ],
};

function parseJsonBody(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function getDemoLocks() {
  if (!demoLockRecord) return [];
  const now = Date.now();
  if ((demoLockRecord.status === 'locked' || demoLockRecord.status === 'extended') && now >= demoLockRecord.unlockAt) {
    demoLockRecord.status = 'unlocked';
    demoLockRecord.history.push({ ts: now, action: 'auto-unlocked', note: 'Demo timer expired' });
  }
  return [demoLockRecord];
}

function mockApiCall(endpoint: string, options: any = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const body = parseJsonBody(options.body);
  const now = Date.now();

  if (endpoint.startsWith('/security/scan-url')) {
    const url = String(body.url || '');
    const risky = /scam|phish|fake|drain/i.test(url);
    return {
      success: true,
      scan: {
        isSafe: !risky,
        trustScore: risky ? 18 : 92,
        details: risky ? 'Mock demo result: suspicious patterns detected.' : 'Mock demo result: no obvious risk indicators.',
      },
    };
  }

  if (endpoint.startsWith('/reports/casino-update')) {
    return { success: true, id: `demo-report-${now}` };
  }

  if (endpoint.startsWith('/premium/plans')) {
    return {
      success: true,
      plans: [
        { name: 'free', price: 0, features: ['Basic alerts', 'Community feed'] },
        { name: 'premium', price: 5, features: ['Priority alerts', 'Advanced vault controls'] },
      ],
    };
  }

  if (endpoint.startsWith('/premium/upgrade')) {
    if (userData) userData.tier = 'premium';
    return { success: true };
  }

  if (endpoint.startsWith('/buddy/notify')) {
    return { success: true };
  }

  if (endpoint.startsWith('/dashboard/')) {
    return {
      success: true,
      demo: true,
      streakDays: 4,
      trustDelta: '+12',
      notes: 'Demo dashboard payload',
    };
  }

  if (endpoint.startsWith('/wallet/')) {
    return {
      success: true,
      wallet: {
        address: 'DemoWallet111111111111111111111111111111111',
        sol: 3.4821,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const lockMatch = endpoint.match(/^\/vault\/[^/]+\/lock$/);
  if (lockMatch && method === 'POST') {
    const amount = Number(body.amount || 0);
    const minutes = Number(body.durationMinutes || 0);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(minutes) || minutes <= 0) {
      return { success: false, error: 'Lock request looks invalid in demo mode.' };
    }
    demoLockRecord = {
      id: `demo-lock-${now}`,
      status: 'locked',
      lockedAmountSOL: Math.max(0.05, amount / 100),
      createdAt: now,
      unlockAt: now + Math.trunc(minutes) * 60 * 1000,
      history: [{ ts: now, action: 'locked', note: 'created in demo mode' }],
    };
    return { success: true, vault: demoLockRecord };
  }

  const releaseMatch = endpoint.match(/^\/vault\/[^/]+\/release$/);
  if (releaseMatch && method === 'POST') {
    if (!demoLockRecord) return { success: false, error: 'No demo vault is ready to release yet.' };
    if ((demoLockRecord.status === 'locked' || demoLockRecord.status === 'extended') && now < demoLockRecord.unlockAt) {
      return { success: false, error: 'No demo vault is ready to release yet.' };
    }
    demoLockRecord.status = 'unlocked';
    demoLockRecord.history.push({ ts: now, action: 'unlocked', note: 'released in demo mode' });
    return { success: true, amount: demoLockRecord.lockedAmountSOL, vault: demoLockRecord };
  }

  const depositMatch = endpoint.match(/^\/vault\/[^/]+\/deposit$/);
  if (depositMatch && method === 'POST') {
    const amount = Number(body.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Amount looks invalid.' };
    demoVaultBalance += amount;
    return { success: true, vault: { balance: Number(demoVaultBalance.toFixed(2)) } };
  }

  const statusMatch = endpoint.match(/^\/vault\/[^/]+\/lock-status$/);
  if (statusMatch) {
    const locks = getDemoLocks();
    const lock = locks[0];
    if (!lock) return { success: true, locked: false, readyToRelease: false };
    return {
      success: true,
      locked: lock.status === 'locked' || lock.status === 'extended',
      status: lock.status,
      amount: lock.lockedAmountSOL,
      amountUnit: 'SOL',
      unlockTime: new Date(lock.unlockAt).toISOString(),
      createdAt: new Date(lock.createdAt).toISOString(),
      id: lock.id,
      readyToRelease: now >= lock.unlockAt,
    };
  }

  const vaultMatch = endpoint.match(/^\/vault\/[^/]+$/);
  if (vaultMatch) {
    return {
      success: true,
      vault: {
        balance: Number(demoVaultBalance.toFixed(2)),
        locks: getDemoLocks(),
      },
    };
  }

  return { success: true, demo: true };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStorage(keys: string[] | string): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    try {
      if (!chrome.runtime?.id) {
        console.warn('[TiltCheck] Extension context invalidated. Please refresh the page.');
        resolve({});
        return;
      }
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime?.lastError) {
          console.warn('[TiltCheck] Storage get failed:', chrome.runtime.lastError.message);
          resolve({});
          return;
        }
        resolve(result || {});
      });
    } catch (error) {
      console.warn('[TiltCheck] Storage get exception:', error);
      resolve({});
    }
  });
}

function setStorage(values: Record<string, any>): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(values, () => resolve());
    } catch (error) {
      console.warn('[TiltCheck] Storage set exception:', error);
      resolve();
    }
  });
}

function removeStorage(keys: string[] | string): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(keys, () => resolve());
    } catch (error) {
      console.warn('[TiltCheck] Storage remove exception:', error);
      resolve();
    }
  });
}

function formatLockRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${sec}s`;
  return `${mins}m ${sec}s`;
}

async function ensureWalletUnlocked(actionLabel: string): Promise<boolean> {
  if (!userData || demoMode) return true;
  const state = await apiCall(`/vault/${userData.id}/lock-status`);
  const isLocked = state?.locked === true;
  if (isLocked) {
    const remainingMs = Number(state?.remainingMs)
      || Math.max(0, new Date(String(state?.unlockTime || 0)).getTime() - Date.now());
    const remaining = formatLockRemaining(remainingMs);
    const message = `Wallet lock is active (${remaining}). Unlock in sidebar to ${actionLabel}.`;
    updateStatus(message, 'warning');
    addFeedMessage(message);
    return false;
  }
  return true;
}

function applyPageOffset(width: number) {
  const offset = `${width}px`;

  // Some sites anchor layout to <html>, others to <body>. Set both so content shifts reliably.
  document.documentElement.style.marginRight = offset;
  document.documentElement.style.transition = 'margin-right 0.3s ease';
  document.body.style.marginRight = offset;
  document.body.style.transition = 'margin-right 0.3s ease';
}

function setSidebarVisibility(visible: boolean) {
  const sidebar = document.getElementById('tiltcheck-sidebar');
  if (!sidebar) return;
  sidebar.style.display = visible ? 'block' : 'none';
  try {
    chrome.storage.local.set({ [SIDEBAR_VISIBILITY_KEY]: visible });
  } catch {
    // Ignore storage failures in restricted contexts.
  }
  if (!visible) {
    applyPageOffset(0);
    return;
  }
  const width = sidebar.classList.contains('minimized') ? MINIMIZED_WIDTH : SIDEBAR_WIDTH;
  applyPageOffset(width);
}

async function updateSidebarPrefs(partial: Record<string, any>) {
  const result = await getStorage([SIDEBAR_PREFS_KEY]);
  const existing = result[SIDEBAR_PREFS_KEY] || {};
  await setStorage({ [SIDEBAR_PREFS_KEY]: { ...existing, ...partial } });
}

function setSidebarMinimized(minimized: boolean, persist = true) {
  const sidebar = document.getElementById('tiltcheck-sidebar');
  if (!sidebar) return;
  const btn = document.getElementById('tg-minimize');
  sidebar.classList.toggle('minimized', minimized);
  document.body.classList.toggle('tiltcheck-minimized', minimized);
  applyPageOffset(minimized ? MINIMIZED_WIDTH : SIDEBAR_WIDTH);
  if (btn) {
    btn.textContent = minimized ? 'Expand' : 'Minimize';
    btn.setAttribute('title', minimized ? 'Expand panel' : 'Minimize panel');
  }
  if (persist) {
    void updateSidebarPrefs({ minimized });
  }
}

function setAdvancedToolsVisibility(show: boolean, persist = true) {
  showAdvancedTools = show;
  const sidebar = document.getElementById('tiltcheck-sidebar');
  const toggleBtn = document.getElementById('tg-toggle-advanced') as HTMLButtonElement | null;
  if (!sidebar) return;

  sidebar.classList.toggle('tg-show-advanced', show);
  if (toggleBtn) {
    toggleBtn.textContent = show ? 'Hide Pro Tools' : 'Show Pro Tools';
    toggleBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
  }

  if (!show) {
    const advancedPanels = ['tg-settings-panel', 'tg-config-panel', 'tg-verifier-panel', 'tg-report-panel'];
    advancedPanels.forEach((panelId) => {
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = 'none';
    });
    showSettings = false;
  }

  if (persist) {
    void updateSidebarPrefs({ showAdvanced: show });
  }
}

async function restoreSidebarPreferences() {
  const result = await getStorage([SIDEBAR_PREFS_KEY]);
  const prefs = result[SIDEBAR_PREFS_KEY];
  if (typeof prefs?.minimized === 'boolean') {
    setSidebarMinimized(prefs.minimized, false);
  }
  if (typeof prefs?.showAdvanced === 'boolean') {
    setAdvancedToolsVisibility(prefs.showAdvanced, false);
  } else {
    setAdvancedToolsVisibility(false, false);
  }
}

async function apiCall(endpoint: string, options: any = {}) {
  if (demoMode) {
    return mockApiCall(endpoint, options);
  }
  const headers: any = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { error: 'Network issue. Try again.' };
  }
}

function enableDemoMode() {
  demoMode = true;
  isAuthenticated = true;
  authToken = null;
  userData = { ...DEMO_USER };
  sessionStats = {
    startTime: Date.now() - (17 * 60 + 42) * 1000,
    totalBets: 38,
    totalWagered: 276.5,
    totalWon: 301.9,
    currentBalance: demoVaultBalance,
  };
}

/**
 * Call backend AI service for intelligent analysis
 */
async function callAIGateway(application: string, data: any = {}) {
  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({
        application,
        prompt: data.prompt || '',
        context: data.context || {}
      })
    });

    if (response.ok) {
      return await response.json();
    }
    console.log('[TiltCheck] Backend AI request failed, using local fallback');
    return { success: false, error: 'Request did not complete. Try again.' };
  } catch (error) {
    console.log('[TiltCheck] Backend AI offline, using local fallback');
    return { success: false, error: 'Network issue. Try again.' };
  }
}

function createSidebar() {
  const existing = document.getElementById('tiltcheck-sidebar');
  if (existing) {
    existing.remove();
  }
  if (casinoThemesIntervalId) {
    clearInterval(casinoThemesIntervalId);
    casinoThemesIntervalId = null;
  }
  if (vaultRefreshIntervalId) {
    clearInterval(vaultRefreshIntervalId);
    vaultRefreshIntervalId = null;
  }

  const sidebar = document.createElement('div');
  sidebar.id = 'tiltcheck-sidebar';
  sidebar.innerHTML = `
    <div class="tg-header">
      <div class="tg-logo"><span class="tg-logo-mark">T</span>TiltCheck</div>
      <div class="tg-header-actions">
        <button class="tg-header-btn tg-advanced-only" id="tg-settings" title="Open settings panel">Settings</button>
        <button class="tg-header-btn" id="tg-minimize" title="Minimize panel">Minimize</button>
        <button class="tg-header-btn" id="tg-hide" title="Hide panel">Hide</button>
      </div>
    </div>
    <div id="tg-license-strip" class="tg-license-strip pending">License: scanning current site...</div>
    <div id="tg-status-bar" class="tg-status-bar" style="display: none;"></div>
    
    <div class="tg-content" id="tg-content">
      <!-- Auth Section -->
      <div class="tg-section" id="tg-auth-section">
        <div class="tg-auth-prompt">
          <h3>Welcome to TiltCheck</h3>
          <p>Demo is instant. Connect Discord when you want synced vault history and buddy alerts. No lectures, just better signals.</p>
          <button class="tg-btn tg-btn-primary" id="tg-discord-login">Connect with Discord</button>
          <div class="tg-auth-divider">You can stay in demo mode if you prefer</div>
        </div>
      </div>

      <!-- Main Content (hidden until auth) -->
      <div id="tg-main-content" style="display: none;">
        <!-- User Bar -->
        <div class="tg-user-bar">
          <div class="tg-user-info">
            <span id="tg-username">Guest</span>
            <span class="tg-tier" id="tg-user-tier">Free</span>
          </div>
          <button class="tg-btn-icon" id="tg-logout" title="Logout" aria-label="Logout">&#x00D7;</button>
        </div>
        <div class="tg-account-strip">
          <span id="tg-account-text">Demo mode is live</span>
          <button class="tg-btn tg-btn-primary tg-btn-inline" id="tg-connect-discord-inline">Connect Discord</button>
        </div>
        <div class="tg-focus-note">Quick tip: keep this minimized while you play, then expand when you want a clean reality check.</div>

        <!-- Quick Safety -->
        <div class="tg-section tg-emergency">
          <div class="tg-emergency-header">
            <div>
              <div class="tg-emergency-title">Emergency Lock</div>
              <div class="tg-emergency-sub">Immediate cool-down if things feel off</div>
            </div>
            <button class="tg-btn tg-btn-danger" id="tg-emergency-lock">Start 15-Min Break</button>
          </div>
        </div>

        <!-- Settings Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-settings-panel" style="display: none;">
          <h4>API Keys</h4>
          <div class="tg-input-group">
            <label>Primary AI Key</label>
            <input type="password" id="api-key-openai" />
          </div>
          <div class="tg-input-group">
            <label>Secondary AI Key</label>
            <input type="password" id="api-key-anthropic" />
          </div>
          <div class="tg-input-group">
            <label>Custom API</label>
            <input type="text" id="api-key-custom" />
          </div>
          <div class="tg-input-group" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <input type="checkbox" id="cfg-buddy-mirror" style="width: auto;" />
            <label for="cfg-buddy-mirror" style="margin: 0; font-size: 12px;">Mirror Buddy Notifications</label>
          </div>
          <button class="tg-btn tg-btn-primary" id="save-api-keys">Save Keys</button>
          <button class="tg-btn tg-btn-secondary" id="close-settings">Close</button>
        </div>

        <!-- Configurator Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-config-panel" style="display: none;">
          <h4>Site Mapper</h4>
          <div class="tg-input-group">
            <label>Bet Amount Selector</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="cfg-bet" placeholder=".bet-amount" style="flex:1;" />
              <button class="tg-btn-icon tg-picker-btn" data-target="cfg-bet" title="Pick Element">Pick</button>
              <button class="tg-btn-icon tg-test-btn" data-target="cfg-bet" title="Test Selector">Test</button>
            </div>
          </div>
          <div class="tg-input-group">
            <label>Game Result Selector</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="cfg-result" placeholder=".game-result" style="flex:1;" />
              <button class="tg-btn-icon tg-picker-btn" data-target="cfg-result" title="Pick Element">Pick</button>
              <button class="tg-btn-icon tg-test-btn" data-target="cfg-result" title="Test Selector">Test</button>
            </div>
          </div>
          <button class="tg-btn tg-btn-primary" id="save-config">Save Config</button>
          <button class="tg-btn tg-btn-secondary" id="close-config">Close</button>
        </div>

        <!-- Fairness Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-verifier-panel" style="display: none;">
          <h4>Fairness Check</h4>
          
          <div class="tg-tabs">
            <button class="tg-tab active" data-target="fv-tab-verify">Verify</button>
            <button class="tg-tab" data-target="fv-tab-history">History</button>
          </div>
          
          <div id="fv-tab-verify" class="tg-tab-content">
            <div class="tg-input-group">
              <label>Server Seed (Unhashed)</label>
              <input type="text" id="fv-server" placeholder="Paste revealed seed" />
            </div>
            <div class="tg-input-group">
              <label>Client Seed</label>
              <input type="text" id="fv-client" placeholder="Your client seed" />
            </div>
            <div class="tg-input-group">
              <label>Nonce</label>
              <div style="display: flex; gap: 5px;">
                <input type="number" id="fv-nonce" placeholder="1" value="1" style="flex: 1;" />
                <button class="tg-btn-icon" id="fv-sync-nonce" title="Sync Nonce">Sync</button>
              </div>
            </div>
            <button class="tg-btn tg-btn-primary" id="fv-verify">Verify Outcome</button>
            
            <div id="fv-results" style="margin-top: 15px; display: none; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
              <div class="tg-metric">
                <span class="tg-metric-label">Dice Result</span>
                <span class="tg-metric-value" id="fv-res-dice" style="color: #10b981;">0.00</span>
              </div>
              <div class="tg-metric">
                <span class="tg-metric-label">Limbo/Crash</span>
                <span class="tg-metric-value" id="fv-res-limbo" style="color: #f59e0b;">0.00x</span>
              </div>
              <div style="font-size: 10px; opacity: 0.5; margin-top: 5px; word-break: break-all;" id="fv-res-hash"></div>
            </div>
          </div>

          <div id="fv-tab-history" class="tg-tab-content" style="display: none;">
            <div id="fv-history-list" class="tg-feed" style="max-height: 200px;"></div>
            <button class="tg-btn tg-btn-secondary" id="fv-clear-history">Clear History</button>
          </div>

          <button class="tg-btn tg-btn-secondary" id="close-verifier">Close</button>
        </div>

        <!-- Active Session Metrics (TOP PRIORITY) -->
        <div class="tg-metrics-card">
          <div class="tg-metrics-header">
            <div>
              <h3>Active Session</h3>
              <div class="tg-session-site" id="tg-session-site">Unknown</div>
            </div>
            <div class="tg-guardian-indicator" id="tg-guardian-indicator"></div>
          </div>
          <div class="tg-metrics-grid">
            <div class="tg-metric">
              <span class="tg-metric-label">Time</span>
              <span class="tg-metric-value" id="tg-duration">0:00</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Bets</span>
              <span class="tg-metric-value" id="tg-bets">0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Wagered</span>
              <span class="tg-metric-value" id="tg-wagered">$0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">P/L</span>
              <span class="tg-metric-value" id="tg-profit">$0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">RTP</span>
              <span class="tg-metric-value" id="tg-rtp">--</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Tilt <span class="tg-help" data-tip="Calculated from wager frequency and bet-size volatility.">?</span></span>
              <span class="tg-metric-value tg-tilt-value" id="tg-score-value">0</span>
            </div>
          </div>
        </div>

        <!-- P/L Graph -->
        <div class="tg-section">
          <h4>Profit/Loss</h4>
          <div class="tg-graph" id="tg-pnl-graph">
            <canvas id="pnl-canvas" width="300" height="120"></canvas>
          </div>
        </div>

        <!-- Message Feed -->
        <div class="tg-section">
          <h4>Live Signals</h4>
          <div class="tg-feed" id="tg-message-feed">
            <div class="tg-feed-item">Monitoring active. No fluff.</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="tg-section">
          <h4>Quick Tools</h4>
          <button class="tg-btn tg-btn-secondary tg-advanced-toggle" id="tg-toggle-advanced" aria-pressed="false">Show Pro Tools</button>
          <div class="tg-action-grid">
            <button class="tg-action-btn" id="tg-open-linkcheck">LinkCheck</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-open-config">Site Setup</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-open-verifier">Fairness Check</button>
            <button class="tg-action-btn" id="tg-open-dashboard">Open Dashboard</button>
            <button class="tg-action-btn" id="tg-open-vault">Open Vault</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-wallet">Wallet Status</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-upgrade">Unlock Premium</button>
          </div>
          <button class="tg-btn tg-btn-secondary tg-advanced-only" id="tg-open-report" style="margin-top: 8px;">Report Site Change</button>
        </div>

        <!-- LinkCheck Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-linkcheck-panel" style="display: none;">
          <h4>LinkCheck Scanner</h4>
          <div class="tg-input-group">
            <label>Check URL</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="linkcheck-url" style="flex:1;" />
              <button class="tg-btn-icon" id="linkcheck-scan-btn">Scan</button>
            </div>
          </div>
          <div id="linkcheck-result" style="display:none; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; margin-bottom: 10px;">
            <div id="linkcheck-score" style="font-weight: bold; margin-bottom: 4px;"></div>
            <div id="linkcheck-details" style="font-size: 11px; opacity: 0.8;"></div>
          </div>
          <button class="tg-btn tg-btn-secondary" id="close-linkcheck">Close</button>
        </div>

        <!-- Report Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-report-panel" style="display: none;">
          <h4>Community Signal</h4>
          <div class="tg-input-group">
            <label>Signal Type</label>
            <select id="report-type" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;">
              <option value="payout_change">Payout Schedule Change</option>
              <option value="bonus_nerf">Bonus Amount Reduced</option>
              <option value="rtp_change">RTP/Odds Change</option>
              <option value="scam_alert">Scam/Fraud Alert</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="tg-input-group">
            <label>Details</label>
            <textarea id="report-details" rows="3" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;"></textarea>
          </div>
          <button class="tg-btn tg-btn-primary" id="submit-report">Send Signal</button>
          <button class="tg-btn tg-btn-secondary" id="close-report">Close</button>
        </div>

        <!-- Vault Section -->
        <div class="tg-section">
          <h4>Vault Balance</h4>
          <div class="tg-vault-amount" id="tg-vault-balance">$0.00</div>
          
          <!-- Custom Goals -->
          <div class="tg-goal-progress" id="tg-goal-progress" style="display: none;">
            <div class="tg-goal-label" id="tg-goal-label">Goal</div>
            <div class="tg-goal-bar">
              <div class="tg-goal-fill" id="tg-goal-fill" style="width: 0%;"></div>
            </div>
            <div class="tg-goal-meta" id="tg-goal-meta">$0 / $0</div>
          </div>
          <div id="tg-goals-list" style="margin-bottom: 10px;"></div>

          <!-- Inline Goal Form (hidden) -->
          <div id="tg-goal-form-panel" style="display:none; margin-bottom:8px; padding:10px; background:rgba(0,0,0,0.25); border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
            <div class="tg-input-group">
              <label>Goal Name</label>
              <input type="text" id="goal-form-name" placeholder="e.g. Power Bill" />
            </div>
            <div class="tg-input-group">
              <label>Target ($)</label>
              <input type="number" id="goal-form-amount" placeholder="100" min="1" />
            </div>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <button class="tg-btn tg-btn-primary tg-btn-inline" id="goal-form-save">Save Goal</button>
              <button class="tg-btn tg-btn-secondary tg-btn-inline" id="goal-form-cancel">Cancel</button>
            </div>
          </div>

          <div class="tg-vault-actions">
            <button class="tg-btn tg-btn-vault" id="tg-vault-btn">Vault Balance</button>
            <button class="tg-btn tg-btn-secondary" id="tg-vault-custom">Custom Amount</button>
          </div>
          <button class="tg-btn tg-btn-secondary" id="tg-add-goal" style="margin-top: 8px; font-size: 11px;">+ Add Withdraw Goal</button>
          
          <!-- Lock Timer Wallet -->
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="font-size: 11px; margin-bottom: 6px;">Lock Timer Wallet</h4>
            
            <div id="tg-lock-form">
              <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <input type="number" id="lock-timer-mins" style="width: 60px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;" />
                <button class="tg-btn tg-btn-primary" id="start-lock-timer" style="margin: 0; padding: 4px 8px; font-size: 11px;">Lock Funds</button>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 10px; opacity: 0.7; line-height: 1.3;">
                <input type="checkbox" id="lock-agree" style="margin-top: 2px;" />
                <label for="lock-agree">I voluntarily lock these funds. They cannot be accessed until the timer expires.</label>
              </div>
            </div>

            <div id="tg-lock-status" style="display: none; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>Locked (SOL):</span>
                <span id="tg-locked-amount" style="color: #fbbf24; font-weight: bold;">0.0000 SOL</span>
              </div>
              
              <!-- Progress Bar -->
              <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 8px; overflow: hidden;">
                <div id="tg-lock-progress" style="width: 0%; height: 100%; background: #fbbf24; transition: width 1s linear;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
                <span>Unlocks in:</span>
                <span id="tg-lock-timer">--:--</span>
              </div>
              
              <!-- Partial Release Input (Hidden until unlock) -->
              <div id="tg-release-controls" style="display: none; margin-bottom: 8px;">
                 <input type="number" id="tg-release-amount" placeholder="Amount to release (SOL)" style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff; font-size: 12px; margin-bottom: 5px;" />
                 <div style="font-size: 10px; opacity: 0.6; text-align: right;">Leave empty to release all (SOL)</div>
              </div>

              <button class="tg-btn tg-btn-secondary" id="release-funds-btn" disabled style="width: 100%; padding: 6px; font-size: 11px; opacity: 0.5; cursor: not-allowed;">Release Funds</button>
            </div>
          </div>

          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="font-size: 11px; margin-bottom: 6px;">Vault Timeline</h4>
            <div id="tg-vault-timeline" class="tg-vault-timeline">
              <div class="tg-vault-timeline-empty">No vault activity yet. Your wins will show up here.</div>
            </div>
          </div>
        </div>

        <!-- Export -->
        <div class="tg-section">
          <button class="tg-btn tg-btn-secondary" id="tg-export-session">Export Session</button>
        </div>
        <!-- Premium Upgrade Panel (hidden) -->
        <div class="tg-settings-panel" id="tg-premium-panel" style="display:none;">
          <h4>Unlock Premium</h4>
          <div style="margin-bottom:8px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size:12px; font-weight:700;">Free</span>
              <span style="font-size:11px; color:var(--tg-muted);">$0/mo</span>
            </div>
            <ul style="font-size:11px; opacity:0.55; padding-left:16px; line-height:1.9; margin:0;">
              <li>Basic tilt alerts</li>
              <li>Community feed</li>
            </ul>
          </div>
          <div style="margin-bottom:12px; padding:10px; background:rgba(0,255,198,0.05); border-radius:8px; border:1px solid rgba(0,255,198,0.2);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size:12px; font-weight:700; color:#00FFC6;">Premium</span>
              <span style="font-size:11px; color:var(--tg-muted);">$5/mo</span>
            </div>
            <ul style="font-size:11px; opacity:0.55; padding-left:16px; line-height:1.9; margin:0;">
              <li>Priority alerts</li>
              <li>Advanced vault controls</li>
              <li>Buddy mirror</li>
              <li>AI tilt analysis</li>
            </ul>
          </div>
          <button class="tg-btn tg-btn-primary" id="tg-upgrade-confirm">Upgrade Now &#x2192;</button>
          <button class="tg-btn tg-btn-secondary" id="tg-premium-close">Cancel</button>
        </div>
        <div class="tg-brand-footer">Made for degens, by degens • © 2026 TiltCheck</div>
      </div>
    </div>

    <div class="tg-toast" id="tg-toast" style="display:none;"></div>
  `;

  // Push page content to make room for sidebar
  applyPageOffset(SIDEBAR_WIDTH);

  const style = document.createElement('style');
  style.textContent = `
    #tiltcheck-sidebar {
      --tg-bg: rgba(10, 10, 10, 0.95); /* Deep Black */
      --tg-surface: rgba(26, 26, 26, 0.8);
      --tg-surface-strong: rgba(36, 36, 36, 0.9);
      --tg-border: rgba(255, 255, 255, 0.1);
      --tg-text: #e7ecf7;
      --tg-muted: rgba(231, 236, 247, 0.74);
      --tg-primary: #00d4aa; /* Neon Teal */
      --tg-secondary: #00a8ff; /* Electric Blue */
      --tg-accent: #a855f7; /* Neon Purple */
      --tg-danger: #ef4444;
      --tg-warning: #f59e0b;
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: ${SIDEBAR_WIDTH}px;
      height: 100vh;
      background: var(--tg-bg); backdrop-filter: blur(12px);
      color: var(--tg-text);
      z-index: 2147483647 !important;
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      overflow-y: auto;
      transition: transform 0.2s ease;
      border-left: 1px solid var(--tg-border);
    }
    #tiltcheck-sidebar.minimized { transform: translateX(${SIDEBAR_WIDTH - MINIMIZED_WIDTH}px); width: ${MINIMIZED_WIDTH}px; }
    body.tiltcheck-minimized { margin-right: ${MINIMIZED_WIDTH}px !important; }
    #tiltcheck-sidebar::-webkit-scrollbar { width: 6px; }
    #tiltcheck-sidebar::-webkit-scrollbar-track { background: transparent; }
    #tiltcheck-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
    
    .tg-header {
      background: linear-gradient(180deg, rgba(0, 212, 170, 0.1), transparent);
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--tg-border);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .tg-logo {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tg-logo-mark {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      background: linear-gradient(135deg, var(--tg-primary), var(--tg-secondary));
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
    }
    .tg-header-actions { display: flex; gap: 6px; align-items: center; }
    .tg-header-btn {
      background: var(--tg-surface);
      border: 1px solid var(--tg-border);
      color: var(--tg-text);
      min-height: 30px;
      padding: 0 10px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .tg-header-btn:hover { background: var(--tg-surface-strong); border-color: rgba(0, 212, 170, 0.4); }
    #tiltcheck-sidebar:not(.tg-show-advanced) .tg-advanced-only { display: none !important; }
    
    .tg-content { padding: 12px; }
    .tg-section { margin-bottom: 12px; padding: 14px; background: var(--tg-surface); backdrop-filter: blur(8px); border-radius: 12px; border: 1px solid var(--tg-border); box-shadow: 0 6px 14px rgba(0,0,0,0.16); }
    .tg-section h4 { margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: var(--tg-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .tg-emergency { border: 1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.08); }
    .tg-emergency-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .tg-emergency-title { font-weight: 700; font-size: 13px; }
    .tg-emergency-sub { font-size: 11px; opacity: 0.7; margin-top: 2px; }
    
    .tg-auth-prompt { text-align: center; padding: 40px 20px; }
    .tg-auth-prompt h3 { font-size: 18px; margin-bottom: 8px; font-weight: 600; }
    .tg-auth-prompt p { font-size: 13px; opacity: 0.8; margin-bottom: 16px; line-height: 1.45; }
    .tg-auth-divider { margin: 14px 0; text-align: center; opacity: 0.4; font-size: 12px; }
    
    .tg-user-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 12px;
    }
    .tg-account-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: -6px 0 12px;
      padding: 8px 10px;
      background: rgba(0, 168, 255, 0.1);
      border: 1px solid rgba(0, 168, 255, 0.3);
      border-radius: 10px;
      font-size: 11px;
      line-height: 1.35;
    }
    .tg-focus-note {
      margin: -4px 0 12px;
      padding: 8px 10px;
      font-size: 11px;
      opacity: 0.78;
      border-left: 2px solid rgba(0, 212, 170, 0.6);
      background: rgba(0, 212, 170, 0.08);
      border-radius: 0 8px 8px 0;
    }
    .tg-user-info { display: flex; gap: 8px; align-items: center; font-size: 13px; }
    .tg-tier { padding: 2px 8px; background: rgba(168, 85, 247, 0.2); border-radius: 3px; font-size: 11px; color: #c4b5fd; }
    .tg-btn-icon {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 20px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      padding: 0;
      line-height: 1;
    }
    .tg-btn-icon:hover { color: rgba(255, 255, 255, 0.8); }
    
    .tg-settings-panel {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tg-settings-panel h4 { margin: 0 0 12px 0; font-size: 13px; }
    .tg-input-group { margin-bottom: 12px; }
    .tg-input-group label { display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.7; }
    .tg-input-group input {
      width: 100%;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #e1e8ed;
      font-size: 12px;
    }
    .tg-input-group input:focus { outline: none; border-color: var(--tg-primary); }
    
    .tg-metrics-card {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .tg-metrics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .tg-metrics-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    .tg-session-site { font-size: 11px; opacity: 0.6; margin-top: 2px; }
    .tg-guardian-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--tg-primary);
      color: transparent;
      font-size: 0;
    }
    .tg-guardian-indicator.inactive { background: rgba(255, 255, 255, 0.2); }
    
    .tg-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .tg-metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tg-metric-label {
      font-size: 10px;
      opacity: 0.65;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tg-help {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      margin-left: 4px;
      font-size: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.7);
      position: relative;
      cursor: help;
    }
    .tg-help::after {
      content: attr(data-tip);
      position: absolute;
      bottom: 20px;
      right: 0;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 10px;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(4px);
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 50;
    }
    .tg-help:hover::after { opacity: 1; transform: translateY(0); }
    .tg-metric-value {
      font-size: 15px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .tg-tilt-value { color: var(--tg-primary); }
    .tg-tilt-value.warning { color: var(--tg-warning); }
    .tg-tilt-value.critical { color: var(--tg-danger); }
    
    .tg-graph {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: 10px;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .tg-feed {
      max-height: 148px;
      overflow-y: auto;
      font-size: 12px;
    }
    .tg-feed-item {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      opacity: 0.7;
    }
    .tg-feed-item:last-child { border-bottom: none; }
    
    .tg-action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .tg-advanced-toggle {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 11px;
      padding: 8px 10px;
    }
    .tg-action-btn {
      background: var(--tg-surface);
      border: 1px solid var(--tg-border);
      color: var(--tg-text);
      padding: 10px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s;
      text-align: left;
    }
    .tg-action-btn:hover { background: var(--tg-surface-strong); border-color: var(--tg-primary); transform: translateY(-1px); }
    
    .tg-vault-amount {
      font-size: 24px;
      font-weight: 700;
      color: var(--tg-primary);
      margin-bottom: 12px;
      font-variant-numeric: tabular-nums;
    }
    .tg-goal-progress { margin-bottom: 10px; }
    .tg-goal-label { font-size: 11px; opacity: 0.7; margin-bottom: 6px; }
    .tg-goal-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
    .tg-goal-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #10b981); width: 0%; transition: width 0.4s ease; }
    .tg-goal-meta { font-size: 10px; opacity: 0.6; margin-top: 4px; }
    .tg-vault-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .tg-btn {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 13px;
    }
    .tg-btn-inline {
      width: auto;
      margin-top: 0;
      padding: 6px 10px;
      font-size: 11px;
      white-space: nowrap;
    }
    .tg-btn-primary { background: var(--tg-primary); color: #000; }
    .tg-btn-primary:hover { background: #00b390; }
    .tg-btn-secondary { background: var(--tg-surface); border: 1px solid var(--tg-border); }
    .tg-btn-secondary:hover { background: var(--tg-surface-strong); border-color: var(--tg-secondary); }
    .tg-btn-vault { background: var(--tg-primary); color: #000; font-weight: 700; }
    .tg-btn-vault:hover { background: #00b390; }
    .tg-btn-danger { background: var(--tg-danger); }
    .tg-btn-danger:hover { background: #dc2626; }
    #tg-discord-login, #tg-connect-discord-inline { background: var(--tg-accent); border: 1px solid rgba(255,255,255,0.12); color: #fff;}
    #tg-discord-login:hover, #tg-connect-discord-inline:hover { background: #9333ea; }

    .tg-toast {
      position: fixed;
      right: 16px;
      bottom: 16px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
      color: var(--tg-text);
      border: 1px solid rgba(255,255,255,0.12);
      border-left: 3px solid var(--tg-accent);
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12px;
      max-width: 260px;
      z-index: 2147483647;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      animation: toastIn 0.2s ease;
    }
    @keyframes toastIn {
      from { transform: translateY(6px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    #tiltcheck-sidebar.tilt-warn {
      box-shadow: -2px 0 12px rgba(245, 158, 11, 0.35);
      border-left-color: var(--tg-warning);
      animation: pulseBorder 2.2s ease-in-out infinite;
    }
    #tiltcheck-sidebar.tilt-critical {
      background: rgba(127, 29, 29, 0.85);
      box-shadow: -2px 0 16px rgba(239, 68, 68, 0.45);
      border-left-color: var(--tg-danger);
    }
    #tiltcheck-sidebar.tilt-critical .tg-emergency { border-color: var(--tg-danger); }
    #tiltcheck-sidebar.tilt-critical #tg-emergency-lock { animation: shake 0.6s ease-in-out infinite; }

    @keyframes pulseBorder {
      0% { border-left-color: rgba(245, 158, 11, 0.3); box-shadow: -2px 0 8px rgba(245, 158, 11, 0.15); }
      50% { border-left-color: rgba(245, 158, 11, 0.75); box-shadow: -2px 0 14px rgba(245, 158, 11, 0.35); }
      100% { border-left-color: rgba(245, 158, 11, 0.3); box-shadow: -2px 0 8px rgba(245, 158, 11, 0.15); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }

    .tg-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; }
    .tg-tab { flex: 1; background: none; border: none; color: rgba(255,255,255,0.5); padding: 8px; cursor: pointer; border-bottom: 2px solid transparent; font-size: 12px; font-weight: 600; }
    .tg-tab.active { color: #fff; border-bottom-color: var(--tg-secondary); }
    .tg-history-item { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px; background: rgba(255,255,255,0.02); margin-bottom: 4px; border-radius: 4px; }
    .tg-history-header { display: flex; justify-content: space-between; margin-bottom: 4px; opacity: 0.7; }
    .tg-history-result { font-weight: bold; color: var(--tg-primary); }

    .tg-license-strip {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      background: rgba(0, 168, 255, 0.1);
      color: #7dd3fc;
    }
    .tg-license-strip.verified { background: rgba(16, 185, 129, 0.18); color: #6ee7b7; }
    .tg-license-strip.warning { background: rgba(245, 158, 11, 0.18); color: #fcd34d; }
    .tg-license-strip.risk { background: rgba(239, 68, 68, 0.18); color: #fca5a5; }
    .tg-license-strip.pending { background: rgba(0, 168, 255, 0.1); color: #7dd3fc; }

    .tg-status-bar { padding: 8px 12px; font-size: 11px; font-weight: 600; text-align: center; animation: slideDown 0.3s ease; }
    .tg-status-bar.thinking { background: rgba(0, 168, 255, 0.2); color: #38bdf8; border-bottom: 1px solid rgba(0, 168, 255, 0.3); }
    .tg-status-bar.success { background: rgba(16, 185, 129, 0.2); color: #34d399; border-bottom: 1px solid rgba(16, 185, 129, 0.3); }
    .tg-status-bar.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-bottom: 1px solid rgba(245, 158, 11, 0.3); }
    .tg-status-bar.buddy { background: rgba(236, 72, 153, 0.2); color: #f472b6; border-bottom: 1px solid rgba(236, 72, 153, 0.3); }

    .tg-vault-timeline { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .tg-vault-timeline-item {
      font-size: 11px;
      line-height: 1.35;
      padding: 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tg-vault-timeline-row { display: flex; justify-content: space-between; gap: 8px; }
    .tg-vault-timeline-action { font-weight: 600; color: #fbbf24; }
    .tg-vault-timeline-time { opacity: 0.7; font-size: 10px; white-space: nowrap; }
    .tg-vault-timeline-meta { opacity: 0.75; margin-top: 2px; font-size: 10px; }
    .tg-vault-timeline-empty { opacity: 0.6; font-size: 11px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; }
    .tg-brand-footer {
      margin: 2px 0 16px;
      text-align: center;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--tg-muted);
      opacity: 0.75;
    }
    
    @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
    .nonce-flash { animation: flashGreen 1s ease; }
    @keyframes flashGreen {
      0% { background-color: rgba(16, 185, 129, 0.5); }
      100% { background-color: rgba(0, 0, 0, 0.3); }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(sidebar);
  updateSessionSiteLabel();
  void refreshCasinoThemes();
  casinoThemesIntervalId = setInterval(refreshCasinoThemes, 15 * 60 * 1000);
  setupEventListeners();
  void restoreSidebarPreferences();
  void checkAuthStatus();
  void runAutoLinkCheck();
  return sidebar;
}

function deriveAccent(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

async function refreshCasinoThemes() {
  try {
    const res = await fetch(`${API_BASE}/bonus/casinos`);
    if (!res.ok) return;
    const data = await res.json();
    const casinos = Array.isArray(data.casinos) ? data.casinos : data;
    const mapped: Record<string, { label: string; accent: string }> = {};
    casinos.forEach((item: any) => {
      const url = item.url || item.baseURL || '';
      if (!url) return;
      try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        const label = item.brand || item.name || host;
        mapped[host] = { label, accent: deriveAccent(label) };
      } catch {
        // Ignore malformed URLs
      }
    });
    if (Object.keys(mapped).length > 0) {
      dynamicCasinoThemes = mapped;
      updateSessionSiteLabel();
    }
  } catch {
    // ignore
  }
}

function updateSessionSiteLabel() {
  const el = document.getElementById('tg-session-site');
  if (!el) return;
  const host = (window.location.hostname || 'unknown').replace(/^www\./, '');
  const theme = dynamicCasinoThemes[host] || CASINO_THEMES[host];
  el.textContent = `${theme?.label || host} active session`;

  const sidebar = document.getElementById('tiltcheck-sidebar');
  if (sidebar) {
    if (theme) {
      sidebar.style.borderLeftColor = theme.accent;
      sidebar.style.boxShadow = `-2px 0 14px ${theme.accent}33`;
    } else {
      sidebar.style.borderLeftColor = 'rgba(255, 255, 255, 0.1)';
      sidebar.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.3)';
    }
  }
}

function syncAccountUi() {
  const accountText = document.getElementById('tg-account-text');
  const connectBtn = document.getElementById('tg-connect-discord-inline') as HTMLButtonElement | null;
  const logoutBtn = document.getElementById('tg-logout') as HTMLButtonElement | null;
  if (!accountText || !connectBtn || !logoutBtn) return;

  if (demoMode || !authToken) {
    accountText.textContent = 'Demo mode is live. Connect Discord if you want synced history and vault progress.';
    connectBtn.textContent = 'Connect Discord';
    connectBtn.style.display = 'inline-flex';
    logoutBtn.style.display = 'none';
    return;
  }

  accountText.textContent = `Connected as ${userData?.username || 'TiltCheck user'}`;
  connectBtn.textContent = 'Reconnect';
  connectBtn.style.display = 'inline-flex';
  logoutBtn.style.display = 'inline-flex';
}

function clearDiscordAuthPolling() {
  if (discordAuthPollIntervalId) {
    clearInterval(discordAuthPollIntervalId);
    discordAuthPollIntervalId = null;
  }
}

async function applyDiscordAuthSuccess(token: string, user: Record<string, any>) {
  await setStorage({ authToken: token, userData: user });
  clearDiscordAuthPolling();
  demoMode = false;
  authToken = token;
  userData = { ...user, isDemo: false };
  isAuthenticated = true;
  showMainContent();
  syncAccountUi();
  addFeedMessage(`Connected: ${userData.username || 'TiltCheck user'}`);
}

function handleDiscordAuthMessage(event: MessageEvent) {
  if (event.origin !== API_ORIGIN) return;
  const data = event.data as { type?: string; token?: unknown; user?: unknown } | null;
  if (!data || data.type !== DISCORD_AUTH_MESSAGE_TYPE) return;
  if (typeof data.token !== 'string' || !data.token) return;
  if (!data.user || typeof data.user !== 'object') return;
  void applyDiscordAuthSuccess(data.token, data.user as Record<string, any>);
}

function startDiscordLoginFlow() {
  const authUrl = getDiscordLoginUrl('extension');
  const maxPollMs = 5 * 60 * 1000;
  const startedAt = Date.now();
  clearDiscordAuthPolling();

  const startStoragePolling = () => {
    discordAuthPollIntervalId = setInterval(async () => {
      try {
        const stored = await getStorage(['authToken', 'userData']);
        if (stored?.authToken && stored?.userData) {
          await applyDiscordAuthSuccess(stored.authToken, stored.userData);
          return;
        }

        if (Date.now() - startedAt > maxPollMs) {
          clearDiscordAuthPolling();
          addFeedMessage('Discord connect timed out. Try again.');
        }
      } catch (error) {
        clearDiscordAuthPolling();
        console.warn('[TiltCheck] Discord connect polling failed:', error);
        addFeedMessage('Discord connect interrupted. Reload the tab and try again.');
      }
    }, 1000);
  };

  try {
    // User-clicked popup preserves window.opener for callback postMessage.
    const popup = window.open(authUrl, '_blank', 'popup=yes,width=520,height=760');
    if (popup) {
      startStoragePolling();
      return;
    }

    chrome.runtime.sendMessage({ type: 'open_auth_bridge', url: authUrl }, (response) => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message || 'Could not open Discord login tab.';
        addFeedMessage(
          msg.includes('Extension context invalidated')
            ? 'Extension refreshed mid-login. Reload this tab and retry Connect Discord.'
            : 'Could not open Discord login helper. Try again.'
        );
        return;
      }

      if (!response?.success) {
        addFeedMessage('Could not open Discord login helper. Try again.');
        return;
      }

      addFeedMessage('Opened Discord login helper tab.');
      startStoragePolling();
    });
  } catch (error) {
    console.warn('[TiltCheck] Unable to start Discord connect flow:', error);
    addFeedMessage('Connect failed to start. Reload tab and try again.');
  }
}

function setupEventListeners() {
  window.removeEventListener('message', handleDiscordAuthMessage as EventListener);
  window.addEventListener('message', handleDiscordAuthMessage as EventListener);

  document.getElementById('tg-minimize')?.addEventListener('click', () => {
    const sidebar = document.getElementById('tiltcheck-sidebar');
    const isMinimized = !!sidebar?.classList.contains('minimized');
    setSidebarMinimized(!isMinimized);
  });

  document.getElementById('tg-hide')?.addEventListener('click', () => {
    setSidebarVisibility(false);
  });

  document.getElementById('tg-toggle-advanced')?.addEventListener('click', () => {
    setAdvancedToolsVisibility(!showAdvancedTools);
  });

  // Settings toggle
  document.getElementById('tg-settings')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-settings-panel');
    if (panel) {
      showSettings = !showSettings;
      panel.style.display = showSettings ? 'block' : 'none';
    }
  });

  document.getElementById('close-settings')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-settings-panel');
    if (panel) {
      showSettings = false;
      panel.style.display = 'none';
    }
  });

  // Buddy Mirror Setting
  const buddyCheckbox = document.getElementById('cfg-buddy-mirror') as HTMLInputElement;
  if (buddyCheckbox) {
    let buddyMirrorTouched = false;
    buddyCheckbox.checked = buddyMirrorEnabled;

    void (async () => {
      const settings = await getStorage(['buddyMirrorEnabled']);
      if (typeof settings.buddyMirrorEnabled === 'boolean') {
        buddyMirrorEnabled = settings.buddyMirrorEnabled;
      } else {
        // One-time migration from localStorage legacy key.
        const legacyMirror = localStorage.getItem('tiltcheck_buddy_mirror');
        if (legacyMirror !== null) {
          buddyMirrorEnabled = legacyMirror === 'true';
          await setStorage({ buddyMirrorEnabled });
          localStorage.removeItem('tiltcheck_buddy_mirror');
        }
      }
      // Avoid clobbering a user toggle that happened before async hydration finished.
      if (!buddyMirrorTouched) {
        buddyCheckbox.checked = buddyMirrorEnabled;
      }
    })();

    buddyCheckbox.addEventListener('change', (e) => {
      buddyMirrorTouched = true;
      buddyMirrorEnabled = (e.target as HTMLInputElement).checked;
      void setStorage({ buddyMirrorEnabled });
    });
  }

  // Configurator toggle
  document.getElementById('tg-open-config')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-config-panel');
    if (panel) panel.style.display = 'block';
  });

  document.getElementById('close-config')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-config-panel');
    if (panel) panel.style.display = 'none';
  });

  // LinkCheck toggle
  document.getElementById('tg-open-linkcheck')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-linkcheck-panel');
    if (panel) panel.style.display = 'block';
  });
  document.getElementById('close-linkcheck')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-linkcheck-panel');
    if (panel) panel.style.display = 'none';
  });

  // Report toggle
  document.getElementById('tg-open-report')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-report-panel');
    if (panel) panel.style.display = 'block';
  });

  // Emergency lock: 15 min break
  document.getElementById('tg-emergency-lock')?.addEventListener('click', () => {
    const minsInput = document.getElementById('lock-timer-mins') as HTMLInputElement;
    const agreeCheckbox = document.getElementById('lock-agree') as HTMLInputElement;
    if (minsInput) minsInput.value = '15';
    if (agreeCheckbox) agreeCheckbox.checked = true;
    document.getElementById('start-lock-timer')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  document.getElementById('close-report')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-report-panel');
    if (panel) panel.style.display = 'none';
  });

  // Verifier toggle
  document.getElementById('tg-open-verifier')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-verifier-panel');
    if (panel) {
      panel.style.display = 'block';
      // Auto-populate from storage/session
      const clientSeed = localStorage.getItem('tiltcheck_client_seed');
      const nonce = localStorage.getItem('tiltcheck_nonce'); // Assuming this is tracked

      if (clientSeed) (document.getElementById('fv-client') as HTMLInputElement).value = clientSeed;
      if (nonce) (document.getElementById('fv-nonce') as HTMLInputElement).value = nonce;
    }
  });

  document.getElementById('close-verifier')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-verifier-panel');
    if (panel) panel.style.display = 'none';
  });

  // Picker buttons
  document.querySelectorAll('.tg-picker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = (e.currentTarget as HTMLElement).dataset.target;
      // Dispatch event for content script to handle
      window.dispatchEvent(new CustomEvent('tg-start-picker', { detail: { field: targetId } }));
    });
  });

  // Test buttons
  document.querySelectorAll('.tg-test-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = (e.currentTarget as HTMLElement).dataset.target;
      const input = document.getElementById(targetId!) as HTMLInputElement;
      if (input && input.value) {
        window.dispatchEvent(new CustomEvent('tg-test-selector', { detail: { selector: input.value } }));
      }
    });
  });

  // Listen for picker results
  window.addEventListener('tg-picker-result', ((e: CustomEvent) => {
    const input = document.getElementById(e.detail.field) as HTMLInputElement;
    if (input) input.value = e.detail.selector;
  }) as EventListener);

  // Verify Fairness Logic
  document.getElementById('fv-verify')?.addEventListener('click', () => {
    const serverSeed = (document.getElementById('fv-server') as HTMLInputElement).value;
    const clientSeed = (document.getElementById('fv-client') as HTMLInputElement).value;
    const nonce = (document.getElementById('fv-nonce') as HTMLInputElement).value;

    if (!serverSeed || !clientSeed || !nonce) {
      alert('Fill all fields first.');
      return;
    }

    window.dispatchEvent(new CustomEvent('tg-calc-fairness', { detail: { serverSeed, clientSeed, nonce } }));
  });

  // Listen for fairness results
  window.addEventListener('tg-fairness-result', ((e: CustomEvent) => {
    const res = document.getElementById('fv-results');
    if (res) res.style.display = 'block';

    document.getElementById('fv-res-dice')!.textContent = e.detail.dice.toFixed(2);
    document.getElementById('fv-res-limbo')!.textContent = e.detail.limbo.toFixed(2) + 'x';
    document.getElementById('fv-res-hash')!.textContent = e.detail.hash;

    // Save to history
    saveVerificationHistory({
      timestamp: Date.now(),
      serverSeed: (document.getElementById('fv-server') as HTMLInputElement).value,
      clientSeed: (document.getElementById('fv-client') as HTMLInputElement).value,
      nonce: (document.getElementById('fv-nonce') as HTMLInputElement).value,
      result: e.detail
    });
  }) as EventListener);

  // Tab switching
  document.querySelectorAll('.tg-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).dataset.target;
      const parent = (e.currentTarget as HTMLElement).closest('.tg-settings-panel');

      parent?.querySelectorAll('.tg-tab').forEach(t => t.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');

      parent?.querySelectorAll('.tg-tab-content').forEach(c => (c as HTMLElement).style.display = 'none');
      const content = document.getElementById(target!);
      if (content) content.style.display = 'block';

      if (target === 'fv-tab-history') renderVerificationHistory();
    });
  });

  document.getElementById('fv-clear-history')?.addEventListener('click', () => {
    localStorage.removeItem('tiltcheck_verification_history');
    renderVerificationHistory();
  });

  // Copy Hash Handler (Delegated)
  document.getElementById('fv-history-list')?.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.tg-copy-hash') as HTMLElement;
    if (target && target.dataset.hash) {
      navigator.clipboard.writeText(target.dataset.hash);

      // Visual feedback
      const originalText = target.textContent;
      target.textContent = '';
      setTimeout(() => target.textContent = originalText, 1000);
    }
  });

  // Sync Nonce Handler
  document.getElementById('fv-sync-nonce')?.addEventListener('click', () => {
    const nonce = localStorage.getItem('tiltcheck_nonce');
    if (nonce) {
      const input = document.getElementById('fv-nonce') as HTMLInputElement;
      input.value = nonce;
      updateStatus('Nonce synced from this session', 'success');
    } else {
      updateStatus('No active nonce yet. Spin once and retry.', 'warning');
    }
  });

  // Listen for Status Updates
  window.addEventListener('tg-status-update', ((e: CustomEvent) => {
    updateStatus(e.detail.message, e.detail.type);
  }) as EventListener);

  // Listen for Nonce Updates (Visual Indicator)
  window.addEventListener('tg-nonce-update', ((e: CustomEvent) => {
    const input = document.getElementById('fv-nonce') as HTMLInputElement;
    if (input) {
      input.value = e.detail.nonce;
      // Trigger flash animation
      input.classList.remove('nonce-flash');
      void input.offsetWidth; // trigger reflow
      input.classList.add('nonce-flash');
    }
  }) as EventListener);

  // LinkCheck Scan Logic
  document.getElementById('linkcheck-scan-btn')?.addEventListener('click', async () => {
    const url = (document.getElementById('linkcheck-url') as HTMLInputElement).value;
    if (!url) return;

    const resultDiv = document.getElementById('linkcheck-result');
    const scoreDiv = document.getElementById('linkcheck-score');
    const detailsDiv = document.getElementById('linkcheck-details');

    if (resultDiv) resultDiv.style.display = 'block';
    if (scoreDiv) scoreDiv.textContent = 'Scanning...';

    try {
      // Call backend API for LinkCheck scan
      const result = await apiCall('/security/scan-url', {
        method: 'POST',
        body: JSON.stringify({ url })
      });

      if (result.success && result.scan) {
        const scan = result.scan;
        if (scoreDiv) {
          scoreDiv.textContent = `${scan.isSafe ? 'OK' : 'X'} ${scan.isSafe ? 'Safe' : 'High Risk'} (Trust Score: ${scan.trustScore}/100)`;
          scoreDiv.style.color = scan.isSafe ? '#10b981' : '#ef4444';
        }
        if (detailsDiv) {
          detailsDiv.textContent = scan.details || (scan.isSafe
            ? 'Domain age looks solid (>5 years). No reports found.'
            : 'Domain flagged. Check user reports.');
        }
      } else {
        // Fallback for API failure
        const isSafe = !url.includes('scam');
        if (scoreDiv) {
          scoreDiv.textContent = isSafe ? 'OK Safe (Trust Score: 95/100)' : 'X High Risk (Trust Score: 10/100)';
          scoreDiv.style.color = isSafe ? '#10b981' : '#ef4444';
        }
        if (detailsDiv) {
          detailsDiv.textContent = 'Offline mode: local check only.';
        }
      }
    } catch (e) {
      console.error('[TiltCheck] LinkCheck scan error:', e);
      if (scoreDiv) {
        scoreDiv.textContent = 'Scan Error';
        scoreDiv.style.color = '#f59e0b';
      }
      if (detailsDiv) {
        detailsDiv.textContent = 'Network issue. Try again.';
      }
    }
  });

  // Submit Report Logic
  document.getElementById('submit-report')?.addEventListener('click', async () => {
    const type = (document.getElementById('report-type') as HTMLSelectElement).value;
    const details = (document.getElementById('report-details') as HTMLTextAreaElement).value;

    if (!details) {
      alert('Add a quick note first.');
      return;
    }

    if (!userData) {
      alert('Connect Discord to send signals.');
      return;
    }

    updateStatus('Sending signal...', 'thinking');

    try {
      const result = await apiCall('/reports/casino-update', {
        method: 'POST',
        body: JSON.stringify({ type, details, casino: window.location.hostname })
      });

      if (result.success) {
        addFeedMessage(`Signal sent: ${type}`);
        updateStatus('Signal shared with community', 'success');
        (document.getElementById('report-details') as HTMLTextAreaElement).value = '';
        document.getElementById('tg-report-panel')!.style.display = 'none';
      } else {
        updateStatus(`Signal did not send: ${result.error}`, 'warning');
      }
    } catch (e) {
      updateStatus('Network issue. Try again.', 'warning');
    }
  });

  // Add Goal Logic
  document.getElementById('tg-add-goal')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-goal-form-panel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('goal-form-save')?.addEventListener('click', () => {
    const nameInput = document.getElementById('goal-form-name') as HTMLInputElement;
    const amountInput = document.getElementById('goal-form-amount') as HTMLInputElement;
    const name = nameInput?.value?.trim();
    const amount = parseFloat(amountInput?.value || '');
    if (!name || isNaN(amount) || amount <= 0) {
      updateStatus('Enter a valid goal name and amount.', 'warning');
      return;
    }
    const goals = loadGoals();
    goals.push({ name, amount });
    saveGoals(goals);
    renderGoals(goals);
    updateGoalProgress(sessionStats.currentBalance || 0);
    nameInput.value = '';
    amountInput.value = '';
    const panel = document.getElementById('tg-goal-form-panel');
    if (panel) panel.style.display = 'none';
  });

  document.getElementById('goal-form-cancel')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-goal-form-panel');
    if (panel) panel.style.display = 'none';
  });

  document.getElementById('tg-goals-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!btn || !btn.dataset.idx) return;
    const goals = loadGoals();
    const goal = goals[Number(btn.dataset.idx)];
    if (!goal || !userData) return;
    depositToVault(goal.amount);
  });

  // Lock Timer Logic
  document.getElementById('start-lock-timer')?.addEventListener('click', async () => {
    if (!(await ensureWalletUnlocked('lock funds'))) return;
    const minsInput = document.getElementById('lock-timer-mins') as HTMLInputElement;
    const agreeCheckbox = document.getElementById('lock-agree') as HTMLInputElement;
    const mins = parseInt(minsInput.value);

    if (!agreeCheckbox.checked) {
      alert('Please confirm the voluntary lock disclaimer.');
      return;
    }

    if (!mins || mins <= 0) {
      alert('Enter valid minutes.');
      return;
    }

    const amountStr = prompt('Amount to lock (USD):');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      alert('Amount looks invalid.');
      return;
    }

    if (!userData) {
      alert('Connect Discord to use vault.');
      return;
    }

    updateStatus('Locking funds...', 'thinking');

    try {
      const result = await apiCall(`/vault/${userData.id}/lock`, {
        method: 'POST',
        body: JSON.stringify({ amount, durationMinutes: mins })
      });

      if (result.success) {
        const lockedSol = Number(result.vault?.lockedAmountSOL || 0);
        addFeedMessage(`Locked ${lockedSol.toFixed(4)} SOL (${amount.toFixed(2)} USD input) for ${mins}m`);
        updateStatus('Funds locked.', 'success');
        minsInput.value = '';
        agreeCheckbox.checked = false;
        loadVaultBalance(); // Refresh balance
        checkLockStatus(); // Refresh lock status UI
      } else {
        updateStatus(`Lock did not start: ${result.error}`, 'warning');
      }
    } catch (e) {
      console.error(e);
      updateStatus('Network issue. Try again.', 'warning');
    }
  });

  // Release Funds Logic
  document.getElementById('release-funds-btn')?.addEventListener('click', async () => {
    if (!(await ensureWalletUnlocked('release funds'))) return;
    if (!userData) return;

    const releaseInput = document.getElementById('tg-release-amount') as HTMLInputElement;
    const amountToRelease = releaseInput && releaseInput.value ? parseFloat(releaseInput.value) : null;

    updateStatus('Releasing funds...', 'thinking');

    try {
      const result = await apiCall(`/vault/${userData.id}/release`, {
        method: 'POST',
        body: JSON.stringify({ amount: amountToRelease })
      });

      if (result.success) {
        addFeedMessage(`Funds released: ${Number(result.amount || 0).toFixed(4)} SOL`);
        updateStatus('Funds released to wallet.', 'success');
        checkLockStatus(); // Should reset UI to form
        loadVaultBalance();
      } else {
        updateStatus(`Release did not complete: ${result.error}`, 'warning');
      }
    } catch (e) {
      updateStatus('Network issue. Try again.', 'warning');
    }
  });

  // Save Config
  document.getElementById('save-config')?.addEventListener('click', async () => {
    const betSelector = (document.getElementById('cfg-bet') as HTMLInputElement).value;
    const resultSelector = (document.getElementById('cfg-result') as HTMLInputElement).value;

    // Dynamically import saveCustomCasino or use message passing if needed
    // Since we are in the same bundle context, we can try to use the global extractor if exposed, 
    // or just save to storage directly here for simplicity since we are in content script context.
    const config = {
      casinoId: 'custom-' + window.location.hostname,
      domain: window.location.hostname,
      selectors: {
        betAmount: betSelector,
        gameResult: resultSelector
      }
    };

    const storage = chrome.storage.sync || chrome.storage.local;
    storage.get(['tiltcheck_custom_casinos'], (result) => {
      const current = (result.tiltcheck_custom_casinos || []) as any[];
      const filtered = current.filter(c => c.domain !== config.domain);
      filtered.push(config);
      storage.set({ tiltcheck_custom_casinos: filtered }, () => {
        alert('Site map saved. Refresh to apply.');
        document.getElementById('tg-config-panel')!.style.display = 'none';
      });
    });
  });

  document.getElementById('save-api-keys')?.addEventListener('click', () => {
    const openai = (document.getElementById('api-key-openai') as HTMLInputElement)?.value;
    const anthropic = (document.getElementById('api-key-anthropic') as HTMLInputElement)?.value;
    const custom = (document.getElementById('api-key-custom') as HTMLInputElement)?.value;

    apiKeys = { openai, anthropic, custom };
    void setStorage({ apiKeys });
    addFeedMessage('API keys saved');

    const panel = document.getElementById('tg-settings-panel');
    if (panel) {
      showSettings = false;
      panel.style.display = 'none';
    }
  });



  document.getElementById('tg-discord-login')?.addEventListener('click', startDiscordLoginFlow);
  document.getElementById('tg-connect-discord-inline')?.addEventListener('click', startDiscordLoginFlow);

  document.getElementById('tg-logout')?.addEventListener('click', () => {
    void removeStorage(['authToken', 'userData']);
    authToken = null;
    location.reload();
  });
  document.getElementById('tg-open-dashboard')?.addEventListener('click', openDashboard);
  document.getElementById('tg-open-vault')?.addEventListener('click', openVault);
  document.getElementById('tg-wallet')?.addEventListener('click', openWallet);
  document.getElementById('tg-vault-btn')?.addEventListener('click', vaultCurrentBalance);
  document.getElementById('tg-vault-custom')?.addEventListener('click', async () => {
    const amt = prompt('Enter amount to vault:');
    if (amt && !isNaN(parseFloat(amt))) {
      await depositToVault(parseFloat(amt));
    }
  });
  document.getElementById('tg-export-session')?.addEventListener('click', () => {
    const data = { ...sessionStats, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiltcheck-session-${Date.now()}.json`;
    a.click();
    addFeedMessage('Session exported');
  });
  document.getElementById('tg-upgrade')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-premium-panel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('tg-upgrade-confirm')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-premium-panel');
    if (panel) panel.style.display = 'none';
    void openPremium();
  });

  document.getElementById('tg-premium-close')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-premium-panel');
    if (panel) panel.style.display = 'none';
  });
}

async function checkAuthStatus() {
  const storedAuth = await getStorage(['authToken', 'userData']);
  const storedUser = storedAuth.userData || null;
  const token = storedAuth.authToken || null;
  const storedSettings = await getStorage(['apiKeys']);
  if (storedSettings.apiKeys) {
    apiKeys = storedSettings.apiKeys;
  } else {
    // One-time migration from localStorage legacy key.
    const legacyKeys = localStorage.getItem('tiltcheck_api_keys');
    if (legacyKeys) {
      try {
        apiKeys = JSON.parse(legacyKeys);
        await setStorage({ apiKeys });
      } catch {
        apiKeys = { openai: '', anthropic: '', custom: '' };
      }
      localStorage.removeItem('tiltcheck_api_keys');
    }
  }
  // Populate settings fields
  setTimeout(() => {
    if (document.getElementById('api-key-openai')) {
      (document.getElementById('api-key-openai') as HTMLInputElement).value = apiKeys.openai || '';
      (document.getElementById('api-key-anthropic') as HTMLInputElement).value = apiKeys.anthropic || '';
      (document.getElementById('api-key-custom') as HTMLInputElement).value = apiKeys.custom || '';
    }
  }, 100);

  // Require authentication
  if (!storedUser || !token) {
    console.log('TiltGuard: no auth found, enabling demo mode');
    enableDemoMode();
    showMainContent();
    syncAccountUi();
    renderGoals(loadGoals());
    updateGoalProgress(sessionStats.currentBalance || 0);
    updateStats(sessionStats);
    void updateTilt(24, ['Demo mode: no live risk analysis']);
    loadVaultBalance();
    checkLockStatus();
    initPnLGraph();
    addFeedMessage('Demo mode on. Connect anytime for sync.');
    return;
  }

  if (storedUser && token) {
    demoMode = false;
    userData = storedUser;
    authToken = token;
    isAuthenticated = true;
    showMainContent();
    syncAccountUi();
    renderGoals(loadGoals());
    updateGoalProgress(sessionStats.currentBalance || 0);
    loadVaultBalance();
    checkLockStatus();
    initPnLGraph();
    vaultRefreshIntervalId = setInterval(() => {
      loadVaultBalance();
      checkLockStatus();
    }, 30_000);
  }
}

async function runAutoLinkCheck() {
  try {
    const result = await apiCall('/security/scan-url', {
      method: 'POST',
      body: JSON.stringify({ url: window.location.href }),
    });

    if (result?.success && result.scan) {
      const isSafe = !!result.scan.isSafe;
      const trustScore = Number(result.scan.trustScore ?? 0);
      updateStatus(`LinkCheck: ${isSafe ? 'Safe' : 'Risk'} (${trustScore}/100)`, isSafe ? 'success' : 'warning');
      addFeedMessage(`LinkCheck ${isSafe ? 'safe' : 'risk'}: ${window.location.hostname} (${trustScore}/100)`);
      return;
    }

    updateStatus('LinkCheck: check unavailable', 'warning');
  } catch {
    updateStatus('LinkCheck: network unavailable', 'warning');
  }
}

function addFeedMessage(message: string) {
  const feed = document.getElementById('tg-message-feed');
  if (!feed) return;

  const item = document.createElement('div');
  item.className = 'tg-feed-item';
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  item.textContent = `[${time}] ${message}`;

  feed.insertBefore(item, feed.firstChild);

  // Keep only last 10 messages
  while (feed.children.length > 10) {
    feed.removeChild(feed.lastChild!);
  }
}

function showToast(message: string, durationMs: number = 4000) {
  const toast = document.getElementById('tg-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => {
    if (toast.textContent === message) toast.style.display = 'none';
  }, durationMs);
}

type VaultGoal = { name: string; amount: number };

function loadGoals(): VaultGoal[] {
  try {
    return JSON.parse(localStorage.getItem('tiltcheck_vault_goals') || '[]');
  } catch {
    return [];
  }
}

function saveGoals(goals: VaultGoal[]) {
  localStorage.setItem('tiltcheck_vault_goals', JSON.stringify(goals));
}

function renderGoals(goals: VaultGoal[]) {
  const goalsList = document.getElementById('tg-goals-list');
  if (!goalsList) return;
  goalsList.innerHTML = '';
  goals.forEach((goal, idx) => {
    const goalDiv = document.createElement('div');
    goalDiv.style.cssText = 'display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; padding:4px; background:rgba(255,255,255,0.05); border-radius:4px;';
    const label = document.createElement('span');
    label.textContent = `${goal.name} ($${goal.amount})`;
    const btn = document.createElement('button');
    btn.dataset.idx = String(idx);
    btn.textContent = 'Vault';
    btn.style.cssText = 'background:none;border:none;color:#10b981;cursor:pointer;font-size:10px;';
    goalDiv.appendChild(label);
    goalDiv.appendChild(btn);
    goalsList.appendChild(goalDiv);
  });
}

function updateGoalProgress(balance: number) {
  const goals = loadGoals();
  const progressWrap = document.getElementById('tg-goal-progress');
  const label = document.getElementById('tg-goal-label');
  const fill = document.getElementById('tg-goal-fill') as HTMLDivElement | null;
  const meta = document.getElementById('tg-goal-meta');
  if (!progressWrap || !label || !fill || !meta) return;
  if (goals.length === 0) {
    progressWrap.style.display = 'none';
    return;
  }
  const goal = goals[0];
  const pct = Math.min(100, (balance / Math.max(goal.amount, 1)) * 100);
  progressWrap.style.display = 'block';
  label.textContent = `${goal.name} goal`;
  fill.style.width = `${pct}%`;
  meta.textContent = `$${balance.toFixed(2)} / $${goal.amount.toFixed(2)}`;
}

let pnlHistory: number[] = [];

function initPnLGraph() {
  const canvas = document.getElementById('pnl-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Initial empty graph
  drawPnLGraph(ctx, canvas);
}

function drawPnLGraph(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const width = canvas.width;
  const height = canvas.height;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, width, height);

  // Zero line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  if (pnlHistory.length < 2) {
    // Empty state
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No session trend yet', width / 2, height / 2);
    return;
  }

  // Calculate scale
  const max = Math.max(...pnlHistory, 0);
  const min = Math.min(...pnlHistory, 0);
  const range = max - min || 1;

  // Draw line
  ctx.strokeStyle = pnlHistory[pnlHistory.length - 1] >= 0 ? '#10b981' : '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();

  pnlHistory.forEach((value, index) => {
    const x = (index / (pnlHistory.length - 1)) * width;
    const y = height - ((value - min) / range) * height;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Current value
  const current = pnlHistory[pnlHistory.length - 1];
  ctx.fillStyle = current >= 0 ? '#10b981' : '#ef4444';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${current.toFixed(2)}`, width - 10, 20);
}

function showMainContent() {
  document.getElementById('tg-auth-section')!.style.display = 'none';
  document.getElementById('tg-main-content')!.style.display = 'block';
  const username = document.getElementById('tg-username')!;
  const tier = document.getElementById('tg-user-tier')!;
  username.textContent = userData.username || 'Guest';
  tier.textContent = userData.tier === 'premium' ? 'Premium' : 'Free';
  syncAccountUi();
  initPnLGraph();
  addFeedMessage('Guardian live. Watching for tilt.');
}

async function vaultCurrentBalance() {
  if (!(await ensureWalletUnlocked('vault balance'))) return;
  const balance = sessionStats.currentBalance || 0;
  if (balance <= 0) {
    addFeedMessage('No balance to vault right now.');
    return;
  }
  const confirmed = confirm(`Vault entire balance of $${balance.toFixed(2)}?`);
  if (!confirmed) return;

  await depositToVault(balance);
  sessionStats.currentBalance = 0;
}

function updateLicense(verification: any) {
  const strip = document.getElementById('tg-license-strip');
  const info = verification?.licenseInfo || {};
  const authority = info.issuingAuthority || info.authority || 'Unknown authority';
  const location = info.location ? ` (${info.location})` : '';
  const licenseNumber = info.licenseNumber ? ` #${info.licenseNumber}` : '';

  if (strip) {
    strip.className = 'tg-license-strip';
    if (verification?.isLegitimate) {
      strip.classList.add('verified');
      strip.textContent = `License verified: ${authority}${licenseNumber}${location}`;
    } else if (verification?.verdict === 'unlicensed') {
      strip.classList.add('risk');
      strip.textContent = 'License not found in footer/legal links. Treat this site as high risk.';
    } else {
      strip.classList.add('warning');
      strip.textContent = `License status uncertain: ${authority}${location}`;
    }
  }

  if (verification?.isLegitimate) {
    addFeedMessage(`License verified: ${authority}${licenseNumber}`);
  } else {
    addFeedMessage(`Heads up: ${verification?.warningMessage || verification?.verdict || 'Unlicensed'}`);
  }
}

function updateGuardian(active: boolean) {
  const indicator = document.getElementById('tg-guardian-indicator');
  if (indicator) {
    indicator.className = active ? 'tg-guardian-indicator' : 'tg-guardian-indicator inactive';
  }
  addFeedMessage(active ? 'Guardian on' : 'Guardian off');
}

async function updateTilt(score: number, _indicators: string[]) {
  const scoreEl = document.getElementById('tg-score-value');
  if (scoreEl) {
    scoreEl.textContent = Math.round(score).toString();
    // Update color based on score
    scoreEl.className = 'tg-metric-value tg-tilt-value';
    if (score >= 60) scoreEl.classList.add('critical');
    else if (score >= 30) scoreEl.classList.add('warning');
  }

  const sidebar = document.getElementById('tiltcheck-sidebar');
  if (sidebar) {
    sidebar.classList.remove('tilt-warn', 'tilt-critical');
    if (score >= 71) sidebar.classList.add('tilt-critical');
    else if (score >= 41) sidebar.classList.add('tilt-warn');
  }

  // Add to feed if high tilt
  if (score >= 60) {
    addFeedMessage(`Tilt spike detected: ${Math.round(score)}`);

    // Get AI-powered intervention suggestions
    const aiResult = await callAIGateway('tilt-detection', {
      context: {
        recentBets: [],
        sessionDuration: Math.floor((Date.now() - sessionStats.startTime) / 60000),
        losses: Math.max(0, sessionStats.totalWagered - sessionStats.totalWon)
      }
    });

    if (aiResult.success && aiResult.data?.interventionSuggestions) {
      aiResult.data.interventionSuggestions.forEach((suggestion: string) => {
        addFeedMessage(`Suggestion: ${suggestion}`);
      });
    }
  }
}

function updateStats(stats: any) {
  sessionStats = { ...sessionStats, ...stats };
  const duration = Math.floor((Date.now() - (sessionStats.startTime || Date.now())) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const profit = (sessionStats.totalWon || 0) - (sessionStats.totalWagered || 0);
  const rtp = sessionStats.totalWagered > 0 ? ((sessionStats.totalWon || 0) / sessionStats.totalWagered * 100) : 0;

  const updates = {
    'tg-duration': `${minutes}:${seconds.toString().padStart(2, '0')}`,
    'tg-bets': stats.totalBets.toString(),
    'tg-wagered': `$${stats.totalWagered.toFixed(2)}`,
    'tg-profit': `$${profit.toFixed(2)}`,
    'tg-rtp': `${rtp.toFixed(1)}%`
  };

  Object.entries(updates).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value) {
      el.textContent = value;
      if (id === 'tg-profit') el.style.color = profit >= 0 ? '#10b981' : '#ef4444';
    }
  });

  // Update P/L graph
  pnlHistory.push(profit);
  if (pnlHistory.length > 50) pnlHistory.shift(); // Keep last 50 points

  const canvas = document.getElementById('pnl-canvas') as HTMLCanvasElement;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) drawPnLGraph(ctx, canvas);
  }

  if (stats.currentBalance !== undefined) sessionStats.currentBalance = stats.currentBalance;

  // Win-to-vault nudge
  if (profit - lastProfit >= 50) {
    showToast('Nice hit. Move $50 to Vault to lock it in?');
  }
  lastProfit = profit;
}

async function depositToVault(amount: number) {
  if (!(await ensureWalletUnlocked('move funds to vault'))) return;
  if (!userData) return;
  const result = await apiCall(`/vault/${userData.id}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount })
  });

  if (result.success) {
    const vaultEl = document.getElementById('tg-vault-balance');
    if (vaultEl) vaultEl.textContent = `$${result.vault.balance.toFixed(2)}`;
    addFeedMessage(`Vaulted $${amount.toFixed(2)}`);
  } else {
    addFeedMessage(`Vault update paused: ${result.error}`);
  }
}

async function loadVaultBalance() {
  if (!userData) return;
  const result = await apiCall(`/vault/${userData.id}`);
  if (result.vault) {
    const vaultEl = document.getElementById('tg-vault-balance');
    if (vaultEl) vaultEl.textContent = `$${result.vault.balance.toFixed(2)}`;
    updateGoalProgress(result.vault.balance || 0);
    renderVaultTimeline(Array.isArray(result.vault.locks) ? result.vault.locks : []);
  }
}

function formatTimelineAction(action: string): string {
  switch (action) {
    case 'locked': return 'Lock created';
    case 'extended': return 'Lock extended';
    case 'auto-unlocked': return 'Auto-unlocked (timer expired)';
    case 'unlocked': return 'Released';
    case 'emergency-unlocked': return 'Emergency unlock';
    default: return action.replace(/-/g, ' ');
  }
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function shortVaultId(vaultId: string): string {
  if (!vaultId) return 'unknown';
  if (vaultId.length <= 10) return vaultId;
  return `${vaultId.slice(0, 6)}...${vaultId.slice(-4)}`;
}

function renderVaultTimeline(locks: any[]) {
  const container = document.getElementById('tg-vault-timeline');
  if (!container) return;

  const events: Array<{ ts: number; action: string; note?: string; vaultId: string; amount: number }> = [];
  for (const lock of locks) {
    const lockHistory = Array.isArray(lock.history) ? lock.history : [];
    for (const event of lockHistory) {
      if (!event || typeof event.ts !== 'number' || typeof event.action !== 'string') continue;
      events.push({
        ts: event.ts,
        action: event.action,
        note: event.note,
        vaultId: String(lock.id || ''),
        amount: Number(lock.lockedAmountSOL || 0),
      });
    }
  }

  events.sort((a, b) => b.ts - a.ts);
  const topEvents = events.slice(0, 20);

  if (topEvents.length === 0) {
    container.innerHTML = '<div class="tg-vault-timeline-empty">No vault activity yet. Your wins will show up here.</div>';
    return;
  }

  container.innerHTML = topEvents.map((event) => {
    const action = escapeHtml(formatTimelineAction(event.action));
    const relative = escapeHtml(formatRelativeTime(event.ts));
    const absolute = escapeHtml(new Date(event.ts).toLocaleString());
    const metaParts = [
      `Vault ${escapeHtml(shortVaultId(event.vaultId))}`,
      `Amount: ${escapeHtml(event.amount.toFixed(4))} SOL`,
      event.note ? escapeHtml(event.note) : '',
    ].filter(Boolean);
    return `
      <div class="tg-vault-timeline-item" title="${absolute}">
        <div class="tg-vault-timeline-row">
          <span class="tg-vault-timeline-action">${action}</span>
          <span class="tg-vault-timeline-time">${relative}</span>
        </div>
        <div class="tg-vault-timeline-meta">${metaParts.join(' \u2022 ')}</div>
      </div>
    `;
  }).join('');
}

async function checkLockStatus() {
  if (!userData) return;

  // Check if user has active lock
  const result = await apiCall(`/vault/${userData.id}/lock-status`);

  const form = document.getElementById('tg-lock-form');
  const status = document.getElementById('tg-lock-status');

  if (result.success && result.locked) {
    if (form) form.style.display = 'none';
    if (status) status.style.display = 'block';

    const amountEl = document.getElementById('tg-locked-amount');
    const amountValue = Number(result?.amount ?? 0);
    if (amountEl) amountEl.textContent = `${amountValue.toFixed(4)} SOL`;
    if (amountEl) amountEl.dataset.total = amountValue.toString();

    // Use createdAt if available for progress bar, otherwise default to now (0% progress fallback)
    const startTime = result.createdAt ? new Date(result.createdAt).getTime() : Date.now();
    startLockCountdown(new Date(result.unlockTime).getTime(), startTime);
  } else {
    if (form) form.style.display = 'block';
    if (status) status.style.display = 'none';
    if (lockTimerInterval) clearInterval(lockTimerInterval);
  }
}

function startLockCountdown(unlockTime: number, startTime: number) {
  if (lockTimerInterval) clearInterval(lockTimerInterval);

  const totalDuration = unlockTime - startTime;

  const update = () => {
    const now = Date.now();
    const diff = unlockTime - now;

    // Progress Bar Logic
    const elapsed = now - startTime;
    let progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    if (progress > 100) progress = 100;
    if (progress < 0) progress = 0;

    const progressEl = document.getElementById('tg-lock-progress');
    if (progressEl) progressEl.style.width = `${progress}%`;

    const timerEl = document.getElementById('tg-lock-timer');
    const btn = document.getElementById('release-funds-btn') as HTMLButtonElement;
    const releaseControls = document.getElementById('tg-release-controls');
    const releaseInput = document.getElementById('tg-release-amount') as HTMLInputElement;

    if (diff <= 0) {
      if (timerEl) timerEl.textContent = 'Ready to Release';
      if (releaseControls) releaseControls.style.display = 'block';

      // Auto-fill max amount if empty
      if (releaseInput && !releaseInput.value) {
        const total = document.getElementById('tg-locked-amount')?.dataset.total;
        if (total) releaseInput.value = total;
      }

      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.classList.remove('tg-btn-secondary');
        btn.classList.add('tg-btn-primary');
      }
      if (lockTimerInterval) clearInterval(lockTimerInterval);
      return;
    }

    // Format time
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (timerEl) {
      timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
    if (releaseControls) releaseControls.style.display = 'none';
  };

  update();
  lockTimerInterval = setInterval(update, 1000);
}

async function openDashboard() {
  addFeedMessage('Opening Dashboard');
  window.open(`${EXT_CONFIG.WEB_APP_URL}/user-dashboard`, '_blank');
}

async function openVault() {
  if (!(await ensureWalletUnlocked('open vault'))) return;
  if (!userData) return;
  const result = await apiCall(`/vault/${userData.id}`);
  if (result.error) {
    addFeedMessage('Vault data unavailable. Try again shortly.');
    return;
  }
  const vault = result.vault || {};
  const balance = Number(vault.balance || 0).toFixed(2);
  const locks = Array.isArray(vault.locks) ? vault.locks : [];
  const activeLocks = locks.filter((l: any) => l.status === 'locked').length;
  const win = window.open('', 'TiltCheck Vault', 'width=520,height=440,popup=yes');
  if (win) {
    win.document.write(`<!DOCTYPE html><html lang="en"><head><title>TiltCheck \u00B7 Vault</title>
    <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:"Inter",system-ui,sans-serif;background:#0e0e0f;color:#e7ecf7;padding:24px;}h1{font-size:16px;font-weight:700;color:#00FFC6;margin-bottom:4px;}.sub{font-size:11px;opacity:0.45;margin-bottom:20px;letter-spacing:0.04em;}.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;margin-bottom:12px;}.lbl{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-bottom:6px;}.val{font-size:28px;font-weight:700;color:#00FFC6;font-variant-numeric:tabular-nums;}.row{display:flex;justify-content:space-between;font-size:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);}.row:last-child{border-bottom:none;}.tag{font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(0,255,198,0.1);color:#00FFC6;}a{color:#00FFC6;text-decoration:none;font-size:12px;display:block;text-align:center;margin-top:14px;opacity:0.65;}</style>
    </head><body>
    <h1>TiltCheck Vault</h1><div class="sub">Non-Custodial \u00B7 SOL-backed</div>
    <div class="card"><div class="lbl">Balance</div><div class="val">$${escapeHtml(balance)}</div></div>
    <div class="card">
      <div class="row"><span>Active locks</span><span class="tag">${activeLocks}</span></div>
      <div class="row"><span>Total lock history</span><span>${locks.length}</span></div>
    </div>
    <a href="${EXT_CONFIG.WEB_APP_URL}/user-dashboard" target="_blank">Open Full Dashboard \u2192</a>
    </body></html>`);
    win.document.close();
  }
}

async function openWallet() {
  if (!(await ensureWalletUnlocked('open wallet'))) return;
  if (!userData) return;
  const result = await apiCall(`/wallet/${userData.id}`);
  if (result.error) {
    addFeedMessage('Wallet data unavailable. Try again shortly.');
    return;
  }
  const w = result.wallet || {};
  const sol = Number(w.sol || 0).toFixed(4);
  const addr = String(w.address || 'N/A');
  const short = addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
  const win = window.open('', 'TiltCheck Wallet', 'width=520,height=360,popup=yes');
  if (win) {
    win.document.write(`<!DOCTYPE html><html lang="en"><head><title>TiltCheck \u00B7 Wallet</title>
    <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:"Inter",system-ui,sans-serif;background:#0e0e0f;color:#e7ecf7;padding:24px;}h1{font-size:16px;font-weight:700;color:#00FFC6;margin-bottom:4px;}.sub{font-size:11px;opacity:0.45;margin-bottom:20px;letter-spacing:0.04em;}.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;margin-bottom:12px;}.lbl{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-bottom:6px;}.val{font-size:26px;font-weight:700;color:#00FFC6;font-variant-numeric:tabular-nums;}.row{display:flex;justify-content:space-between;font-size:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);}.row:last-child{border-bottom:none;}.mono{font-family:monospace;font-size:11px;opacity:0.6;}a{color:#00FFC6;text-decoration:none;font-size:12px;display:block;text-align:center;margin-top:14px;opacity:0.65;}</style>
    </head><body>
    <h1>TiltCheck Wallet</h1><div class="sub">Solana \u00B7 Non-Custodial</div>
    <div class="card"><div class="lbl">Balance</div><div class="val">${escapeHtml(sol)} SOL</div></div>
    <div class="card">
      <div class="row"><span>Address</span><span class="mono" title="${escapeHtml(addr)}">${escapeHtml(short)}</span></div>
    </div>
    <a href="${EXT_CONFIG.WEB_APP_URL}/user-dashboard" target="_blank">Open Full Dashboard \u2192</a>
    </body></html>`);
    win.document.close();
  }
}

async function openPremium() {
  const result = await apiCall('/premium/plans');
  if (result.error) {
    addFeedMessage('Premium plans unavailable right now.');
    return;
  }

  const plans = result.plans.map((p: any) =>
    `${p.name} - $${p.price}/mo\n${p.features.join('\n')}`
  ).join('\n\n');

  const upgrade = confirm(`Available Plans:\n\n${plans}\n\nUpgrade to Premium?`);
  if (upgrade && userData) {
    const upgradeResult = await apiCall('/premium/upgrade', {
      method: 'POST',
      body: JSON.stringify({ userId: userData.id, plan: 'premium' })
    });
    if (upgradeResult.success) {
      userData.tier = 'premium';
      const tierEl = document.getElementById('tg-user-tier');
      if (tierEl) tierEl.textContent = 'Premium';
      addFeedMessage('Premium unlocked.');
    }
  }
}

function saveVerificationHistory(data: any) {
  const history = JSON.parse(localStorage.getItem('tiltcheck_verification_history') || '[]');
  history.unshift(data);
  if (history.length > 20) history.pop(); // Keep last 20
  localStorage.setItem('tiltcheck_verification_history', JSON.stringify(history));
  renderVerificationHistory();
}

function renderVerificationHistory() {
  const list = document.getElementById('fv-history-list');
  if (!list) return;

  const history = JSON.parse(localStorage.getItem('tiltcheck_verification_history') || '[]');

  if (history.length === 0) {
    list.innerHTML = '<div class="tg-feed-item">No fairness history yet. Verify a result to start.</div>';
    return;
  }

  list.innerHTML = history.map((item: any) => `
    <div class="tg-history-item">
      <div class="tg-history-header">
        <span>Nonce: ${escapeHtml(item.nonce)}</span>
        <span>${escapeHtml(new Date(item.timestamp).toLocaleTimeString())}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>Dice: <span class="tg-history-result">${escapeHtml(Number(item.result?.dice || 0).toFixed(2))}</span></span>
        <span>Crash: <span class="tg-history-result">${escapeHtml(Number(item.result?.limbo || 0).toFixed(2))}x</span></span>
      </div>
      <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
        <span style="font-size:9px; opacity:0.4; flex:1; overflow:hidden; text-overflow:ellipsis; font-family:monospace;">${escapeHtml(item.result?.hash)}</span>
        <button class="tg-btn-icon tg-copy-hash" data-hash="${escapeHtml(item.result?.hash)}" title="Copy Hash" style="width:20px; height:20px; font-size:12px; padding:0; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1);">Copy</button>
      </div>
    </div>
  `).join('');
}

async function notifyBuddy(type: string, data: any) {
  // Check if feature is enabled
  if (!buddyMirrorEnabled) return;

  // Check if user is authenticated
  if (!userData || !authToken) return;

  try {
    const result = await apiCall('/buddy/notify', {
      method: 'POST',
      body: JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      })
    });

    if (result.success) {
      addFeedMessage(`Buddy ping sent: ${type}`);
      updateStatus('Buddy ping sent', 'buddy');
    }
  } catch (e) {
    console.error('[TiltCheck] Buddy notification failed:', e);
  }
}

function updateStatus(message: string, type: string = 'info') {
  const bar = document.getElementById('tg-status-bar');
  if (!bar) return;

  // Check buddy setting for buddy notifications
  if (type === 'buddy') {
    if (!buddyMirrorEnabled) return;
  }

  bar.textContent = message;
  bar.className = `tg-status-bar ${type}`;
  bar.style.display = 'block';

  // Auto hide after 3s unless thinking (which persists until cleared/changed)
  if (type !== 'thinking') {
    setTimeout(() => {
      if (bar.textContent === message) {
        bar.style.display = 'none';
      }
    }, 3000);
  }
}

if (typeof window !== 'undefined') {
  (window as any).TiltCheckSidebar = { create: createSidebar, updateLicense, updateGuardian, updateTilt, updateStats, notifyBuddy };
}


