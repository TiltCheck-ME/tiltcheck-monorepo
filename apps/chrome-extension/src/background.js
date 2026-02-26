/**
 * Minimal MV3 service worker for extension lifecycle hooks.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TiltCheck] Extension installed');
});

