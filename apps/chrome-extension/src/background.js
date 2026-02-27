/**
 * Minimal MV3 service worker for extension lifecycle hooks.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TiltCheck] Extension installed');
});

// Toggle sidebar on action icon click (only works when no default_popup is set)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'toggle_sidebar' });
  } catch (error) {
    console.log('[TiltCheck] Could not toggle sidebar on this tab:', error);
  }
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
