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

type AuthUser = { username?: string } | null;
let authToken: string | null = null;
let userData: AuthUser = null;
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

function openVault() {
  chrome.tabs.create({ url: `${WEB_APP_URL}/vault` });
}

function openDashboard() {
  chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
}

async function initAuth() {
  const result = await chrome.storage.local.get(['authToken', 'userData']);
  authToken = (result.authToken as string) || null;
  userData = (result.userData as AuthUser) || null;
  renderAuthStatus();
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

void initAuth();
void refreshSidebarStatus();
