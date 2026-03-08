/**
 * Landing page KPI strip data loader (/api/stats).
 */
(function () {
  const communitiesEl = document.getElementById('stat-communities');
  const scansEl = document.getElementById('stat-scans');
  const blockedEl = document.getElementById('stat-blocked');
  const statusEl = document.getElementById('api-stats-status');

  // If the strip is not present on this page variant, exit silently.
  if (!communitiesEl || !scansEl || !blockedEl || !statusEl) return;

  function setFallback(message) {
    statusEl.textContent = message;
  }

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  fetch('/api/stats', { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((payload) => {
      const stats = payload?.stats || {};
      communitiesEl.textContent = safeNumber(stats.communitiesProtected).toLocaleString();
      scansEl.textContent = safeNumber(stats.scansLast24h).toLocaleString();
      blockedEl.textContent = safeNumber(stats.highRiskBlocked).toLocaleString();
      statusEl.textContent = 'Live stats';
    })
    .catch(() => {
      setFallback('Live stats temporarily unavailable — showing static launch view.');
    });
})();
