/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 */
(() => {
  const statusEl = document.getElementById('status');
  const openBtn = document.getElementById('open-btn');
  const closeBtn = document.getElementById('close-btn');

  const params = new URLSearchParams(window.location.search);
  const authUrl = params.get('authUrl');

  function isAllowedApiOrigin(origin) {
    if (origin === 'https://api.tiltcheck.me') return true;
    try {
      const u = new URL(origin);
      if (u.protocol === 'https:' && u.hostname.endsWith('.a.run.app')) return true;
    } catch {
      // ignore
    }
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    if (origin === 'http://localhost' || origin === 'http://127.0.0.1') return true;
    return false;
  }

  const apiOrigin = (() => {
    try {
      const origin = new URL(authUrl || 'https://api.tiltcheck.me').origin;
      return isAllowedApiOrigin(origin) ? origin : 'https://api.tiltcheck.me';
    } catch {
      return 'https://api.tiltcheck.me';
    }
  })();

  const HANDSHAKE_STORAGE_KEY = 'tiltcheck_ext_oauth_hs';

  let popupWindow = null;
  let authCompleted = false;

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function clearOauthErrorMarkers() {
    try {
      chrome.storage.local.remove(
        ['discord_oauth_error', 'discord_oauth_error_code', 'discord_oauth_error_ts'],
        () => {},
      );
    } catch {
      // noop
    }
  }

  function generateExtensionHandshake() {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function openAuthPopup() {
    authCompleted = false;
    clearOauthErrorMarkers();
    if (!authUrl) {
      setStatus('Missing auth URL. Close this tab and retry from TiltCheck sidebar.');
      return;
    }
    let parsed;
    try {
      parsed = new URL(authUrl);
    } catch {
      setStatus('Invalid auth URL. Close this tab and retry from TiltCheck sidebar.');
      return;
    }
    const originOk =
      parsed.origin === 'https://api.tiltcheck.me' ||
      parsed.origin.endsWith('.a.run.app') ||
      (parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'));
    if (!originOk || parsed.pathname !== '/auth/discord/login') {
      setStatus('Blocked unexpected auth URL. Retry from TiltCheck sidebar.');
      return;
    }

    if (!parsed.searchParams.has('ext_id') && chrome?.runtime?.id) {
      parsed.searchParams.set('ext_id', chrome.runtime.id);
    }

    parsed.searchParams.set('opener_origin', window.location.origin);

    // Bind this tab to the API callback: server echoes extHandshake in postMessage only for this value.
    try {
      const handshake = generateExtensionHandshake();
      sessionStorage.setItem(HANDSHAKE_STORAGE_KEY, handshake);
      parsed.searchParams.set('extension_handshake', handshake);
    } catch (e) {
      console.warn('[auth-bridge] handshake init failed', e);
      setStatus('Could not start secure sign-in. Reload this tab and retry.');
      return;
    }

    popupWindow = window.open(parsed.toString(), '_blank', 'popup=yes,width=520,height=760');
    if (!popupWindow) {
      setStatus('Popup blocked. Click "Open Discord Auth" and allow popups for this extension page.');
      return;
    }

    setStatus('Waiting for Discord auth confirmation...');
  }

  window.addEventListener('message', (event) => {
    if (authCompleted) return;
    if (event.origin !== apiOrigin) return;
    const data = event.data || {};

    if (data.type === 'discord-auth-error') {
      authCompleted = true;
      const msg =
        typeof data.message === 'string' && data.message.trim()
          ? data.message.trim().slice(0, 500)
          : 'Discord sign-in did not complete.';
      void new Promise((resolve, reject) => {
        chrome.storage.local.set(
          {
            discord_oauth_error: msg,
            discord_oauth_error_code: typeof data.code === 'string' ? data.code.slice(0, 64) : 'auth_failed',
            discord_oauth_error_ts: Date.now(),
          },
          () => {
            if (chrome.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message || 'Storage error'));
            } else {
              resolve();
            }
          },
        );
      })
        .then(() => {
          setStatus(msg);
          try {
            if (popupWindow && !popupWindow.closed) popupWindow.close();
          } catch {
            // noop
          }
        })
        .catch((error) => {
          console.error('[auth-bridge] OAuth error storage failed:', error);
          setStatus(msg);
        });
      return;
    }

    if (data.type !== 'discord-auth' || typeof data.token !== 'string' || !data.user) return;

    let expectedHandshake = null;
    try {
      expectedHandshake = sessionStorage.getItem(HANDSHAKE_STORAGE_KEY);
    } catch {
      expectedHandshake = null;
    }
    if (expectedHandshake) {
      if (typeof data.extHandshake !== 'string' || data.extHandshake !== expectedHandshake) {
        setStatus(
          'Sign-in handshake mismatch or this helper tab is stale. Close it and click Connect Discord again from the TiltCheck sidebar.'
        );
        return;
      }
      try {
        sessionStorage.removeItem(HANDSHAKE_STORAGE_KEY);
      } catch {
        // noop
      }
    }

    authCompleted = true;

    // Wrap chrome.storage.local.set in Promise and wait for completion before closing
    (async () => {
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set(
            {
              authToken: data.token,
              userData: data.user,
            },
            () => {
              if (chrome.runtime?.lastError) {
                reject(new Error(chrome.runtime.lastError.message || 'Storage error'));
              } else {
                resolve();
              }
            },
          );
        });

        clearOauthErrorMarkers();

        setStatus('Discord connected. You can return to your casino tab.');
        try {
          if (popupWindow && !popupWindow.closed) popupWindow.close();
        } catch {
          // noop
        }

        if (window.opener) {
          window.opener.postMessage({ type: 'auth-bridge-ack', success: true }, '*');
          console.log('[auth-bridge] ACK sent to parent');
        }

        setTimeout(() => window.close(), 300);
      } catch (error) {
        console.error('[auth-bridge] Storage write failed:', error);
        setStatus('Auth received but could not save session. Retry Connect Discord.');

        // Retry once after 100ms delay
        setTimeout(() => {
          try {
            chrome.storage.local.set(
              {
                authToken: data.token,
                userData: data.user,
              },
              () => {
                if (!chrome.runtime?.lastError) {
                  console.log('[auth-bridge] Retry succeeded');
                  clearOauthErrorMarkers();
                  if (window.opener) {
                    window.opener.postMessage({ type: 'auth-bridge-ack', success: true }, '*');
                  }
                  setTimeout(() => window.close(), 300);
                } else {
                  console.error('[auth-bridge] Retry failed:', chrome.runtime.lastError.message);
                  setStatus('Auth storage failed permanently. Retry Connect Discord.');
                }
              },
            );
          } catch (retryError) {
            console.error('[auth-bridge] Retry exception:', retryError);
          }
        }, 100);
      }
    })();
  });

  openBtn?.addEventListener('click', openAuthPopup);
  closeBtn?.addEventListener('click', () => window.close());

  openAuthPopup();
})();
