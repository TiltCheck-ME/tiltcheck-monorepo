/**
 * MV3 service worker.
 * Sidebar-first controls and shared tab actions.
 */

const VAULT_URL_BASE = 'https://tiltcheck.me/vault';

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
  if (message.type === 'open_auth_tab') {
    const url = typeof message.url === 'string' ? message.url : null;
    if (!url) {
      sendResponse({ success: false, error: 'Missing auth URL' });
      return false;
    }
    chrome.tabs.create({ url }, () => {
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
