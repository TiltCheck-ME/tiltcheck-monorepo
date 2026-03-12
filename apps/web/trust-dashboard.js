/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// Casino Trust Dashboard Client (SSE + fallback)
const API_BASE = location.origin.replace(/:\d+$/, ':' + (window.TRUST_ROLLUP_PORT || '8082'));
const STREAM_URL = API_BASE + '/api/trust/stream';
const SNAPSHOT_URL = API_BASE + '/api/trust/casinos';

const bodyEl = document.getElementById('trustBody');
const statusEl = document.getElementById('status');
const filterScoreEl = document.getElementById('filterScore');
const filterRiskEl = document.getElementById('filterRisk');
const refreshBtn = document.getElementById('refreshBtn');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function riskBadge(risk) {
  const map = {
    critical: 'b-critical',
    high: 'b-high',
    elevated: 'b-elevated',
    watch: 'b-watch',
    low: 'b-low'
  };
  return `<span class="badge ${map[risk] || 'b-low'}" aria-label="Risk ${risk}">${risk}</span>`;
}

function formatVolatility(v) {
  const value = Number(v);
  if (!Number.isFinite(value)) return '0%';
  return (value * 100).toFixed(0) + '%';
}

function copyLockCommand(casino, risk) {
  // Suggest 12h for critical/high, 6h elevated, 3h watch
  const duration = risk === 'critical' || risk === 'high' ? '12h' : risk === 'elevated' ? '6h' : '3h';
  const cmd = `/vault lock all ${duration} reason:"${casino} volatility"`;
  navigator.clipboard.writeText(cmd).catch(()=>{});
  statusEl.textContent = `Copied lock suggestion for ${casino}`;
}

function renderRows(data) {
  const minScore = parseInt(filterScoreEl.value || '0', 10);
  const riskFilter = filterRiskEl.value;
  const rows = [];
  for (const snap of data) {
    const riskLevel = ['critical', 'high', 'elevated', 'watch', 'low'].includes(snap.riskLevel)
      ? snap.riskLevel
      : 'low';
    if (snap.currentScore < minScore) continue;
    if (riskFilter && riskLevel !== riskFilter) continue;
    const deltaClass = snap.scoreDelta > 0 ? 'delta-pos' : snap.scoreDelta < 0 ? 'delta-neg' : '';
    const casinoName = escapeHtml(snap.casinoName);
    const reasons = (snap.lastReasons || []).map(r => escapeHtml(r)).slice(-3).join(' • ');
    const actionBtn = (['high','critical','elevated'].includes(riskLevel))
      ? `<button type="button" class="cta-btn" aria-label="Lock temptation for ${casinoName}" data-casino="${casinoName}" data-risk="${riskLevel}">Lock Vault</button>`
      : '';
    const scoreDelta = Number(snap.scoreDelta);
    const nerfs24h = Number(snap.nerfs24h);
    rows.push(`<tr class="risk-${riskLevel}">
      <td>${casinoName}</td>
      <td>${Number.isFinite(Number(snap.currentScore)) ? Number(snap.currentScore) : ''}</td>
      <td class="${deltaClass}">${Number.isFinite(scoreDelta) ? scoreDelta : ''}</td>
      <td>${riskBadge(riskLevel)}</td>
      <td>${formatVolatility(snap.volatility24h)}</td>
      <td>${Number.isFinite(nerfs24h) ? nerfs24h : ''}</td>
      <td>${reasons}</td>
      <td>${actionBtn}</td>
    </tr>`);
  }
  bodyEl.innerHTML = rows.join('');
  bodyEl.querySelectorAll('button.cta-btn').forEach(btn => {
    btn.addEventListener('click', () => copyLockCommand(btn.dataset.casino, btn.dataset.risk));
  });
}

async function fetchSnapshot() {
  try {
    const res = await fetch(SNAPSHOT_URL);
    if (!res.ok) throw new Error('Bad response');
    const json = await res.json();
    renderRows(json.data || []);
    statusEl.textContent = 'Snapshot loaded';
  } catch (err) {
    statusEl.textContent = 'Snapshot fetch failed';
  }
}

function initSSE() {
  const es = new EventSource(STREAM_URL);
  es.onopen = () => { statusEl.textContent = 'Live stream connected'; };
  es.onerror = () => { statusEl.textContent = 'Stream error; falling back to polling'; es.close(); startPolling(); };
  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      renderRows(data);
      statusEl.textContent = 'Live update received';
    } catch {}
  };
}

let pollHandle;
function startPolling() {
  clearInterval(pollHandle);
  fetchSnapshot();
  pollHandle = setInterval(fetchSnapshot, 15000);
}

// Filters trigger re-render using last cached data
filterScoreEl.addEventListener('input', fetchSnapshot);
filterRiskEl.addEventListener('change', fetchSnapshot);
refreshBtn.addEventListener('click', fetchSnapshot);

// Kick off
initSSE();
// Fallback safety: ensure at least one snapshot if stream not ready in 3s
setTimeout(() => { if (!bodyEl.children.length) fetchSnapshot(); }, 3000);