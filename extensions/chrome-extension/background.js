// TiltCheck Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('TiltCheck extension installed');
  
  chrome.storage.local.set({
    sessionStats: { scanned: 0, blocked: 0 },
    detectedLinks: []
  });
});

// Load API helpers (defer until needed)
importScripts('api.js');

// Start auto flush of gameplay events if logged in
chrome.storage.local.get(['supabaseSession'], data => {
  if (data.supabaseSession) {
    window.TiltAPI?.startAutoFlush();
  }
});

// Listen for login completion to start flushing
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.action === 'supabaseLoggedIn') {
    window.TiltAPI?.startAutoFlush();
  }
});

// Listen for tab updates to auto-scan
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Auto-scan page in background
    scanURL(tab.url).then(result => {
      if (result.score < 40) {
        // Show warning badge
        chrome.action.setBadgeText({ text: '!', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#ff4444', tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
      }
    });
  }
});

// Scan URL function
async function scanURL(url) {
  // TODO: Replace with actual TiltCheck API
  const domain = new URL(url).hostname;
  
  // Mock scoring
  if (domain.includes('stake') || domain.includes('casino')) {
    return { score: 85, status: 'safe' };
  } else if (domain.includes('scam') || domain.includes('phishing')) {
    return { score: 15, status: 'danger' };
  } else {
    return { score: 60, status: 'warning' };
  }
}

// Message listener (extended)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanURL') {
    scanURL(request.url).then(sendResponse);
    return true; // Async response
  }
  if (request.action === 'enqueueGameplayEvent') {
    window.TiltAPI?.enqueueEvent(request.event).then(() => sendResponse({ queued: true }));
    return true;
  }
});
