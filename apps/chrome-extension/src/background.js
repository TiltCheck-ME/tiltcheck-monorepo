/**
 * MV3 service worker.
 * Popup handles sidebar controls; background handles shared tab actions.
 */

const VAULT_URL_BASE = 'https://tiltcheck.me/vault';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TiltCheck] Extension installed');
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
  if (message.type === 'open_vault') {
    const url = buildVaultUrl(message.data?.suggestedAmount);
    chrome.tabs.create({ url });
    sendResponse({ success: true });
    return false;
  }

  return false;
});
