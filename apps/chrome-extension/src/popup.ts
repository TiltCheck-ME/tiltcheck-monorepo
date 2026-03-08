/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * Popup is intentionally minimal:
 * - quick sidebar toggle
 * - account connect/status
 * - deep links to web vault/dashboard
 */

import { EXT_CONFIG, getDiscordLoginUrl } from './config.js';

const WEB_APP_URL = EXT_CONFIG.WEB_APP_URL;

const sidebarStatus = document.getElementById('sidebarStatus') as HTMLElement;
const authStatus = document.getElementById('authStatus') as HTMLElement;
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn') as HTMLButtonElement;
const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
const vaultBtn = document.getElementById('vaultBtn') as HTMLButtonElement;
const dashboardBtn = document.getElementById('dashboardBtn') as HTMLButtonElement;
const walletLockStatus = document.getElementById('walletLockStatus') as HTMLElement;
const walletLockMins = document.getElementById('walletLockMins') as HTMLInputElement;
const lockWalletBtn = document.getElementById('lockWalletBtn') as HTMLButtonElement;
const unlockWalletBtn = document.getElementById('unlockWalletBtn') as HTMLButtonElement;

type AuthUser = { username?: string; isDemo?: boolean } | null;
let authToken: string | null = null;
let userData: AuthUser = null;
const DEMO_USER: AuthUser = { username: 'Demo Mode', isDemo: true };
const WALLET_LOCK_UNTIL_KEY = 'walletLockUntil';
let walletLockUntil = 0;
const trustedAuthOrigin = (() => {
  try {
    return new URL(getDiscordLoginUrl('extension')).origin;
  } catch {
    return null;
  }
})();

function sendToActiveTab(message: any): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        resolve({ error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response ?? { error: 'No response from content script' });
      });
    });
  });
}

function renderAuthStatus() {
  if (!authStatus || !loginBtn) return;
  if (authToken && userData) {
    const username = userData.username || 'connected';
    authStatus.textContent = `Account: ${username}`;
    loginBtn.textContent = 'Reconnect Discord';
  } else if (userData?.isDemo) {
    authStatus.textContent = 'Account: demo mode';
    loginBtn.textContent = 'Connect Discord (Optional)';
  } else {
    authStatus.textContent = 'Account: not connected';
    loginBtn.textContent = 'Connect Discord';
  }
}

async function refreshSidebarStatus() {
  if (!sidebarStatus || !toggleSidebarBtn) return;
  const state = await sendToActiveTab({ type: 'get_sidebar_state' });
  if (state?.error) {
    sidebarStatus.classList.add('warn');
    sidebarStatus.textContent = 'Sidebar: unavailable on this tab';
    toggleSidebarBtn.textContent = 'Open supported site first';
    return;
  }
  const visible = !!state.visible;
  sidebarStatus.classList.remove('warn');
  sidebarStatus.textContent = `Sidebar: ${visible ? 'visible' : 'hidden'}`;
  toggleSidebarBtn.textContent = visible ? 'Hide In-Page Sidebar' : 'Show In-Page Sidebar';
}

async function toggleSidebar() {
  const result = await sendToActiveTab({ type: 'toggle_sidebar' });
  if (result?.error) {
    sidebarStatus.classList.add('warn');
    sidebarStatus.textContent = 'Sidebar: unavailable on this tab';
    return;
  }
  await refreshSidebarStatus();
}

function startDiscordLogin() {
  const loginUrl = getDiscordLoginUrl('extension');
  window.open(loginUrl, 'TiltCheck Login', 'width=500,height=700');
}

function formatRemainingMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${sec}s`;
  return `${mins}m ${sec}s`;
}

function isWalletLocked(): boolean {
  return walletLockUntil > Date.now();
}

function renderWalletLockStatus() {
  if (!walletLockStatus) return;
  const locked = isWalletLocked();
  if (locked) {
    const remaining = formatRemainingMs(walletLockUntil - Date.now());
    walletLockStatus.innerHTML = `Wallet Lock: <strong>locked (${remaining})</strong>`;
  } else {
    walletLockStatus.innerHTML = 'Wallet Lock: <strong>unlocked</strong>';
  }

  if (vaultBtn) {
    vaultBtn.disabled = locked;
    vaultBtn.textContent = locked ? 'Vault Locked' : 'Open Web Vault';
    vaultBtn.style.opacity = locked ? '0.65' : '1';
    vaultBtn.style.cursor = locked ? 'not-allowed' : 'pointer';
  }
  if (lockWalletBtn) lockWalletBtn.disabled = locked;
  if (unlockWalletBtn) unlockWalletBtn.disabled = !locked;
}

async function lockWallet() {
  const mins = parseInt(walletLockMins?.value || '0', 10);
  if (!Number.isFinite(mins) || mins <= 0) {
    window.alert('Enter a valid lock duration in minutes.');
    return;
  }
  walletLockUntil = Date.now() + mins * 60 * 1000;
  await chrome.storage.local.set({ [WALLET_LOCK_UNTIL_KEY]: walletLockUntil });
  renderWalletLockStatus();
}

async function unlockWallet() {
  walletLockUntil = 0;
  await chrome.storage.local.remove(WALLET_LOCK_UNTIL_KEY);
  renderWalletLockStatus();
}

function openVault() {
  if (isWalletLocked()) {
    window.alert('Wallet is locked. Unlock it first in the extension popup.');
    return;
  }
  chrome.tabs.create({ url: `${WEB_APP_URL}/vault` });
}

function openDashboard() {
  chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
}

async function initAuth() {
  const result = await chrome.storage.local.get(['authToken', 'userData', WALLET_LOCK_UNTIL_KEY]);
  authToken = (result.authToken as string) || null;
  userData = (result.userData as AuthUser) || DEMO_USER;
  walletLockUntil = Number(result[WALLET_LOCK_UNTIL_KEY] || 0);
  renderAuthStatus();
  renderWalletLockStatus();
}

window.addEventListener('message', (event) => {
  if (!trustedAuthOrigin || event.origin !== trustedAuthOrigin) return;
  if (event.data?.type === 'discord-auth' && event.data?.token) {
    authToken = event.data.token;
    userData = event.data.user || null;
    chrome.storage.local.set({ authToken, userData }, () => {
      renderAuthStatus();
    });
  }
});

if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
if (loginBtn) loginBtn.addEventListener('click', startDiscordLogin);
if (vaultBtn) vaultBtn.addEventListener('click', openVault);
if (dashboardBtn) dashboardBtn.addEventListener('click', openDashboard);
if (lockWalletBtn) lockWalletBtn.addEventListener('click', () => { void lockWallet(); });
if (unlockWalletBtn) unlockWalletBtn.addEventListener('click', () => { void unlockWallet(); });

void initAuth();
void refreshSidebarStatus();
setInterval(() => {
  if (isWalletLocked()) renderWalletLockStatus();
}, 1000);
