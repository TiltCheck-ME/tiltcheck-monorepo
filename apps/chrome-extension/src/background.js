/**
 * Minimal MV3 service worker for extension lifecycle hooks.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TiltCheck] Extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'open_vault') {
    const amount = message.data?.suggestedAmount || 0;
    const url = `https://tiltcheck.me/vault?amount=${amount}`;
    chrome.tabs.create({ url });
    sendResponse({ success: true });
  }
  return true;
});

