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

    popupWindow = window.open(authUrl, '_blank', 'popup=yes,width=520,height=760');
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
    chrome.storage.local.set(
      {
        authToken: data.token,
        userData: data.user,
      },
      () => {
        if (chrome.runtime?.lastError) {
          setStatus('Auth received but could not save session. Retry Connect Discord.');
          return;
        }

        setStatus('Discord connected. You can return to your casino tab.');
        try {
          if (popupWindow && !popupWindow.closed) popupWindow.close();
        } catch {
          // noop
        }
        setTimeout(() => window.close(), 1200);
      }
    );
  });

  openBtn?.addEventListener('click', openAuthPopup);
  closeBtn?.addEventListener('click', () => window.close());

  openAuthPopup();
})();


