/* Copyright (c) 2026 TiltCheck. All rights reserved. */
(() => {
  const statusEl = document.getElementById('status');
  const openBtn = document.getElementById('open-btn');
  const closeBtn = document.getElementById('close-btn');

  const params = new URLSearchParams(window.location.search);
  const authUrl = params.get('authUrl');
  const allowedOrigins = new Set(['https://api.tiltcheck.me', 'http://localhost', 'http://127.0.0.1']);
  const apiOrigin = (() => {
    try {
      const origin = new URL(authUrl || 'https://api.tiltcheck.me').origin;
      return allowedOrigins.has(origin) ? origin : 'https://api.tiltcheck.me';
    } catch {
      return 'https://api.tiltcheck.me';
    }
  })();

  let popupWindow = null;
  let authCompleted = false;

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function openAuthPopup() {
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
    if (!allowedOrigins.has(parsed.origin) || parsed.pathname !== '/auth/discord/login') {
      setStatus('Blocked unexpected auth URL. Retry from TiltCheck sidebar.');
      return;
    }

    // Inject extension ID if not already present
    if (!parsed.searchParams.has('ext_id') && chrome?.runtime?.id) {
      parsed.searchParams.set('ext_id', chrome.runtime.id);
    }

    // Always override opener_origin with the current page origin.
    // auth-bridge.html always runs inside the extension (chrome-extension://<id>),
    // so window.location.origin is the correct postMessage target for the API callback.
    // This recovers cases where the sidebar generated the URL before the runtime ID was available.
    parsed.searchParams.set('opener_origin', window.location.origin);

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
    if (data.type !== 'discord-auth' || typeof data.token !== 'string' || !data.user) return;

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
            }
          );
        });

        setStatus('Discord connected. You can return to your casino tab.');
        try {
          if (popupWindow && !popupWindow.closed) popupWindow.close();
        } catch {
          // noop
        }

        // Send ACK message back to parent window to signal storage write completed
        if (window.opener) {
          window.opener.postMessage({ type: 'auth-bridge-ack', success: true }, '*');
          console.log('[auth-bridge] ACK sent to parent');
        }

        // Close auth bridge window after brief delay to ensure ACK delivery
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
                  // Send ACK after retry success
                  if (window.opener) {
                    window.opener.postMessage({ type: 'auth-bridge-ack', success: true }, '*');
                  }
                  setTimeout(() => window.close(), 300);
                } else {
                  console.error('[auth-bridge] Retry failed:', chrome.runtime.lastError.message);
                  setStatus('Auth storage failed permanently. Retry Connect Discord.');
                }
              }
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


