/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * MV3 service worker.
 * Sidebar-first controls and shared tab actions.
 */

const VAULT_URL_BASE = 'https://tiltcheck.me/vault';
const ALLOWED_AUTH_ORIGINS = new Set(['https://api.tiltcheck.me', 'http://localhost', 'http://127.0.0.1']);
const API_BASE = 'https://api.tiltcheck.me';

function isAllowedAuthUrl(value) {
  try {
    const parsed = new URL(value);
    const origin = parsed.origin;
    if (ALLOWED_AUTH_ORIGINS.has(origin)) return true;
    if (origin.endsWith('.a.run.app')) return true;
    return false;
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TiltCheck] Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'toggle_sidebar' }, () => {
    if (chrome.runtime.lastError) {
      console.log('[TiltCheck] Sidebar unavailable on this tab:', chrome.runtime.lastError.message);
    }
  });
});

function buildVaultUrl(suggestedAmount) {
  const amount = Number(suggestedAmount);
  if (Number.isFinite(amount) && amount > 0) {
    return `${VAULT_URL_BASE}?amount=${amount}`;
  }
  return VAULT_URL_BASE;
}

// Handle extension-wide actions requested from content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'open_auth_bridge') {
    const authUrl = typeof message.url === 'string' ? message.url : null;
    if (!authUrl || !isAllowedAuthUrl(authUrl)) {
      sendResponse({ success: false, error: 'Invalid auth URL' });
      return false;
    }
    const bridgeUrl = chrome.runtime.getURL(`auth-bridge.html?authUrl=${encodeURIComponent(authUrl)}`);
    const createOptions = { url: bridgeUrl, active: true };
    if (typeof sender?.tab?.windowId === 'number') {
      createOptions.windowId = sender.tab.windowId;
      if (typeof sender.tab.index === 'number') {
        createOptions.index = sender.tab.index + 1;
      }
    }
    chrome.tabs.create(createOptions, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'open_auth_tab') {
    const url = typeof message.url === 'string' ? message.url : null;
    if (!url) {
      sendResponse({ success: false, error: 'Missing auth URL' });
      return false;
    }
    const createOptions = { url, active: true };
    if (typeof sender?.tab?.windowId === 'number') {
      createOptions.windowId = sender.tab.windowId;
      if (typeof sender.tab.index === 'number') {
        createOptions.index = sender.tab.index + 1;
      }
    }
    chrome.tabs.create(createOptions, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'open_vault') {
    const url = buildVaultUrl(message.data?.suggestedAmount);
    chrome.tabs.create({ url });
    sendResponse({ success: true });
    return false;
  }

  return false;
});

/**
 * Real-time Phishing & Scam Block Logic
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  const url = details.url;
  
  // Skip safe origins
  if (url.startsWith('chrome://') || 
      url.startsWith('https://tiltcheck.me') || 
      url.startsWith('https://api.tiltcheck.me') ||
      url.startsWith('http://localhost')) return;

  // CASINO FOCUS: Only scan if the URL looks like gambling activity
  const casinoPatterns = /stake|roobet|bc\.game|duelbits|rollbit|bet|casino|slot|gamble|poker|win|bonus/i;
  if (!casinoPatterns.test(url)) return;

  try {
    const response = await fetch(`${API_BASE}/safety/suslink/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result.riskLevel === 'critical') {
        console.log(`[TiltCheck] 🛡️  Blocked critical risk: ${url}`);
        const warningUrl = chrome.runtime.getURL(`warning.html?target=${encodeURIComponent(url)}`);
        chrome.tabs.update(details.tabId, { url: warningUrl });
      }
    }
  } catch (e) {
    // Fail-safe: Skip blocking if API is down
    console.error('[TiltCheck] Safety API check failed:', e);
  }
});
