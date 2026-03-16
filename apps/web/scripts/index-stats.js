/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Landing page KPI strip data loader (/api/stats).
 */
(function () {
  const communitiesEl = document.getElementById('stat-communities');
  const scansEl = document.getElementById('stat-scans');
  const blockedEl = document.getElementById('stat-blocked');
  const statusEl = document.getElementById('api-stats-status'); // optional

  // If the strip is not present on this page variant, exit silently.
  if (!communitiesEl || !scansEl || !blockedEl) return;

  // Add loading skeleton class while fetching
  [communitiesEl, scansEl, blockedEl].forEach((el) => el.classList.add('loading'));

  function setFallback(message) {
    [communitiesEl, scansEl, blockedEl].forEach((el) => el.classList.remove('loading'));
    if (statusEl) statusEl.textContent = message;
  }

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const API_BASE = isLocal ? 'http://localhost:3001' : 'https://api.tiltcheck.me';

  fetch(`${API_BASE}/stats`, { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((payload) => {
      const stats = payload?.stats || {};
      [communitiesEl, scansEl, blockedEl].forEach((el) => el.classList.remove('loading'));
      communitiesEl.textContent = safeNumber(stats.communitiesProtected).toLocaleString();
      scansEl.textContent = safeNumber(stats.scansLast24h).toLocaleString();
      blockedEl.textContent = safeNumber(stats.highRiskBlocked).toLocaleString();
      if (statusEl) statusEl.textContent = 'Live stats';
    })
    .catch(() => {
      setFallback('Live stats temporarily unavailable — showing static launch view.');
    });
})();
