/**
 * MV3 service worker.
 * Sidebar-first controls and shared tab actions.
 */

const VAULT_URL_BASE = 'https://tiltcheck.me/vault';
const ALLOWED_AUTH_ORIGINS = new Set(['https://api.tiltcheck.me', 'http://localhost', 'http://127.0.0.1']);

function isAllowedAuthUrl(value) {
  try {
    const parsed = new URL(value);
    if (!ALLOWED_AUTH_ORIGINS.has(parsed.origin)) return false;
    return parsed.pathname === '/auth/discord/login';
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
