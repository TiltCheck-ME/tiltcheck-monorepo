// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
/**
 * MV3 service worker.
 * Sidebar-first controls, shared tab actions, and real-time on-chain cooldown sync.
 */

const VAULT_URL_BASE = 'https://tiltcheck.me/autovault';
const ALLOWED_AUTH_ORIGINS = new Set([
  'https://api.tiltcheck.me',
  'https://collectclock-api.j-chapman7.workers.dev',
  'https://discord.com',
]);
const API_BASE = 'https://api.tiltcheck.me';

const TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY = 'tiltcheck_cooldown_active_until';
const TILTCHECK_COOLDOWN_WALLET_KEY = 'tiltcheck_cooldown_wallet';
const TILTCHECK_COOLDOWN_SOURCE_KEY = 'tiltcheck_cooldown_source';
const ALARM_COOLDOWN_SYNC = 'tiltcheck_cooldown_sync';

let currentStreamAbortController = null;
let activeCooldownWallet = null;
let streamReconnectTimer = null;

function clearStreamReconnectTimer() {
  if (streamReconnectTimer) {
    clearTimeout(streamReconnectTimer);
    streamReconnectTimer = null;
  }
}

function isAllowedAuthUrl(value) {
  try {
    const parsed = new URL(value);
    const origin = parsed.origin;
    if (ALLOWED_AUTH_ORIGINS.has(origin)) return true;
    if (origin.endsWith('.a.run.app')) return true;
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      parsed.pathname === '/auth/discord/login'
    ) {
      return true;
    }
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

// ── On-Chain Cooldown Verification & Real-Time SSE Stream ────────────────────

async function syncCooldownStatus(wallet) {
  if (!wallet || typeof wallet !== 'string' || wallet.length < 32) return;
  try {
    const res = await fetch(`${API_BASE}/cooldown/check?wallet=${encodeURIComponent(wallet)}&verbose=true`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.locked && typeof data.endTime === 'number') {
      const endTimeMs = data.endTime * 1000;
      if (endTimeMs > Date.now()) {
        chrome.storage?.local?.set?.({ [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: endTimeMs });
        console.log('[TiltCheck] Synced active cooldown lock until:', new Date(endTimeMs).toISOString());
      }
    } else if (data && data.locked === false) {
      chrome.storage?.local?.get?.([TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY], (result) => {
        const until = result?.[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY];
        if (typeof until === 'number' && until <= Date.now()) {
          chrome.storage?.local?.set?.({ [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: 0 });
        }
      });
    }
  } catch (err) {
    console.warn('[TiltCheck] Failed to sync cooldown status:', err);
  }
}

function scheduleStreamReconnect(wallet, delayMs = 15000) {
  clearStreamReconnectTimer();
  streamReconnectTimer = setTimeout(() => {
    streamReconnectTimer = null;
    if (activeCooldownWallet === wallet && (!currentStreamAbortController || currentStreamAbortController.signal.aborted)) {
      startCooldownStream(wallet);
    }
  }, delayMs);
}

function handleSseMessageBlock(block) {
  const lines = block.split('\n');
  let eventType = 'message';
  let dataStr = '';

  for (const line of lines) {
    if (line.startsWith(':')) {
      // Heartbeat comment
      continue;
    }
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataStr += line.slice(5).trim();
    }
  }

  if (!dataStr) return;

  try {
    const payload = JSON.parse(dataStr);
    if (eventType === 'connected' || eventType === 'lock_update') {
      const lock = payload.lock || payload.status;
      if (lock && lock.locked && typeof lock.endTime === 'number') {
        const endTimeMs = lock.endTime * 1000;
        if (endTimeMs > Date.now()) {
          chrome.storage?.local?.set?.({ [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: endTimeMs });
          console.log('[TiltCheck] Real-time lock update received. Lock active until:', new Date(endTimeMs).toISOString());
        }
      } else if (lock && lock.locked === false) {
        chrome.storage?.local?.get?.([TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY], (result) => {
          const until = result?.[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY];
          if (typeof until === 'number' && until <= Date.now()) {
            chrome.storage?.local?.set?.({ [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: 0 });
          }
        });
      }
    }
  } catch (e) {
    console.warn('[TiltCheck] Failed to parse SSE payload:', e);
  }
}

async function startCooldownStream(wallet) {
  if (!wallet || typeof wallet !== 'string' || wallet.length < 32) return;
  if (activeCooldownWallet === wallet && currentStreamAbortController && !currentStreamAbortController.signal.aborted) {
    return;
  }

  clearStreamReconnectTimer();
  if (currentStreamAbortController) {
    currentStreamAbortController.abort();
    currentStreamAbortController = null;
  }

  activeCooldownWallet = wallet;
  const abortController = new AbortController();
  currentStreamAbortController = abortController;

  try {
    const streamUrl = `${API_BASE}/cooldown/stream?wallet=${encodeURIComponent(wallet)}`;
    const response = await fetch(streamUrl, {
      signal: abortController.signal,
      headers: {
        Accept: 'text/event-stream',
      },
    });

    if (!response.ok || !response.body) {
      console.warn('[TiltCheck] Cooldown stream connection error:', response.status);
      scheduleStreamReconnect(wallet, 15000);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (!abortController.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const block of parts) {
        handleSseMessageBlock(block);
      }
    }
  } catch (err) {
    if (abortController.signal.aborted) return;
    console.warn('[TiltCheck] Cooldown SSE stream disconnected:', err?.message || err);
    scheduleStreamReconnect(wallet, 15000);
  } finally {
    if (currentStreamAbortController === abortController) {
      currentStreamAbortController = null;
    }
  }
}

function initCooldownSync() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

  chrome.storage.local.get([TILTCHECK_COOLDOWN_WALLET_KEY], (result) => {
    const wallet = result?.[TILTCHECK_COOLDOWN_WALLET_KEY];
    if (typeof wallet === 'string' && wallet.trim().length >= 32) {
      syncCooldownStatus(wallet.trim());
      startCooldownStream(wallet.trim());
    }
  });

  if (chrome.alarms?.create) {
    try {
      chrome.alarms.create(ALARM_COOLDOWN_SYNC, { periodInMinutes: 5 });
    } catch {
      // Ignore
    }
  }
}

if (typeof chrome !== 'undefined') {
  if (chrome.alarms?.onAlarm?.addListener) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM_COOLDOWN_SYNC) {
        chrome.storage?.local?.get?.([TILTCHECK_COOLDOWN_WALLET_KEY], (result) => {
          const wallet = result?.[TILTCHECK_COOLDOWN_WALLET_KEY];
          if (typeof wallet === 'string' && wallet.trim().length >= 32) {
            syncCooldownStatus(wallet.trim());
            if (!currentStreamAbortController || currentStreamAbortController.signal.aborted) {
              startCooldownStream(wallet.trim());
            }
          }
        });
      }
    });
  }

  if (chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[TILTCHECK_COOLDOWN_WALLET_KEY]) {
        const newWallet = changes[TILTCHECK_COOLDOWN_WALLET_KEY].newValue;
        if (typeof newWallet === 'string' && newWallet.trim().length >= 32) {
          syncCooldownStatus(newWallet.trim());
          startCooldownStream(newWallet.trim());
        } else if (!newWallet && currentStreamAbortController) {
          currentStreamAbortController.abort();
          currentStreamAbortController = null;
          activeCooldownWallet = null;
        }
      }
    });
  }
}

initCooldownSync();

// ── Handle extension-wide actions requested from content scripts ─────────────
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

  if (message.type === 'sync_cooldown_wallet') {
    const wallet = typeof message.wallet === 'string' ? message.wallet.trim() : null;
    if (wallet && wallet.length >= 32) {
      chrome.storage?.local?.set?.({ [TILTCHECK_COOLDOWN_WALLET_KEY]: wallet });
      syncCooldownStatus(wallet);
      startCooldownStream(wallet);
      sendResponse({ success: true, wallet });
      return true;
    }
    sendResponse({ success: false, error: 'Invalid wallet address' });
    return false;
  }

  if (message.type === 'cooldown_lock_updated') {
    const { wallet, endTime } = message;
    if (typeof endTime === 'number' && endTime > 0) {
      const endTimeMs = endTime * 1000;
      const updates = { [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: endTimeMs };
      if (typeof wallet === 'string' && wallet.trim().length >= 32) {
        updates[TILTCHECK_COOLDOWN_WALLET_KEY] = wallet.trim();
      }
      chrome.storage?.local?.set?.(updates);
      if (wallet && typeof wallet === 'string' && wallet.trim().length >= 32) {
        syncCooldownStatus(wallet.trim());
      }
      sendResponse({ success: true, activeUntil: endTimeMs });
      return true;
    }
    sendResponse({ success: false, error: 'Invalid endTime' });
    return false;
  }

  if (message.type === 'trigger_tilt_auto_lock') {
    const wallet = typeof message.wallet === 'string' && message.wallet.trim().length >= 32 ? message.wallet.trim() : null;
    const duration = typeof message.duration === 'number' && message.duration > 0 ? message.duration : 86400;
    const tiltRisk = typeof message.tiltRisk === 'number' ? message.tiltRisk : 75;
    const indicators = Array.isArray(message.indicators) ? message.indicators : [];
    const endTimeMs = Date.now() + duration * 1000;

    const updates = {
      [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: endTimeMs,
      [TILTCHECK_COOLDOWN_SOURCE_KEY]: 'auto_tilt',
      tiltcheck_last_auto_lock: {
        timestamp: Date.now(),
        tiltRisk,
        indicators,
        duration,
        wallet,
      },
    };
    if (wallet) {
      updates[TILTCHECK_COOLDOWN_WALLET_KEY] = wallet;
    }
    chrome.storage?.local?.set?.(updates);

    if (message.openPrompt !== false) {
      const query = new URLSearchParams();
      if (wallet) query.set('wallet', wallet);
      query.set('scope', 'all');
      query.set('duration', String(duration));
      query.set('source', 'auto_tilt');
      const targetUrl = `https://tiltcheck.me/cooldown?${query.toString()}`;
      chrome.tabs?.create?.({ url: targetUrl });
    }

    sendResponse({ success: true, activeUntil: endTimeMs, wallet });
    return true;
  }

  if (message.type === 'get_cooldown_sync_state') {
    chrome.storage?.local?.get?.(
      [TILTCHECK_COOLDOWN_WALLET_KEY, TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY],
      (res) => {
        sendResponse({
          wallet: res?.[TILTCHECK_COOLDOWN_WALLET_KEY] || null,
          cooldownActiveUntil: res?.[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY] || 0,
          isStreaming: Boolean(currentStreamAbortController && !currentStreamAbortController.signal.aborted),
        });
      }
    );
    return true;
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
  if (
    url.startsWith('chrome://') ||
    url.startsWith('https://tiltcheck.me') ||
    url.startsWith('https://api.tiltcheck.me')
  ) {
    return;
  }

  // CASINO FOCUS: Only scan if the URL looks like gambling activity
  const casinoPatterns = /stake|roobet|bc\.game|duelbits|rollbit|bet|casino|slot|gamble|poker|win|bonus/i;
  if (!casinoPatterns.test(url)) return;

  try {
    const response = await fetch(`${API_BASE}/safety/suslink/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result.riskLevel === 'critical') {
        console.log(`[TiltCheck] [AUDIT] Blocked critical risk: ${url}`);
        const warningUrl = chrome.runtime.getURL(`warning.html?target=${encodeURIComponent(url)}`);
        chrome.tabs.update(details.tabId, { url: warningUrl });
      }
    }
  } catch (e) {
    // Fail-safe: Skip blocking if API is down
    console.error('[TiltCheck] Safety API check failed:', e);
  }
});

// ── Discord OAuth Callback Interceptor ───────────────────────────────────────────
if (typeof chrome !== 'undefined' && chrome.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab?.url;
  if (!url) return;

  if (
    url.includes("collectclock-api.j-chapman7.workers.dev/auth/callback") &&
    url.includes("access_token=")
  ) {
    void (async () => {
      try {
        const hash = url.split("#")[1] || "";
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        if (!accessToken) return;

        console.log("[TiltCheck] OAuth token received, fetching Discord user profile");

        const res = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const discordUser = await res.json();
          const userObj = {
            id: String(discordUser.id),
            username: discordUser.global_name || discordUser.username,
            discriminator: discordUser.discriminator,
            discordId: String(discordUser.id),
            avatar: discordUser.avatar
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
          };

          await chrome.storage.local.set({
            authToken: accessToken,
            userData: userObj,
            tiltguard_user_id: String(discordUser.id),
          });

          console.log("[TiltCheck] Discord auth synced:", userObj.username);

          setTimeout(() => {
            chrome.tabs.remove(tabId).catch(() => {});
          }, 800);
        }
      } catch (err) {
        console.error("[TiltCheck] OAuth handler error:", err);
      }
    })();
  }
  });
}
