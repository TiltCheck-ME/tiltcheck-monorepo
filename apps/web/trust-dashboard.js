/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
// Casino Trust Dashboard Client (SSE + fallback)
const API_BASE = location.origin.replace(/:\d+$/, ':' + (window.TRUST_ROLLUP_PORT || '8082'));
const STREAM_URL = API_BASE + '/api/trust/stream';
const SNAPSHOT_URL = API_BASE + '/api/trust/casinos';

const bodyEl = document.getElementById('trustBody');
const statusEl = document.getElementById('status');
const filterScoreEl = document.getElementById('filterScore');
const filterRiskEl = document.getElementById('filterRisk');
const refreshBtn = document.getElementById('refreshBtn');

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
  return (v * 100).toFixed(0) + '%';
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
    if (snap.currentScore < minScore) continue;
    if (riskFilter && snap.riskLevel !== riskFilter) continue;
    const deltaClass = snap.scoreDelta > 0 ? 'delta-pos' : snap.scoreDelta < 0 ? 'delta-neg' : '';
    const reasons = (snap.lastReasons || []).map(r => r.replace(/"/g,'')).slice(-3).join(' • ');
    const actionBtn = (['high','critical','elevated'].includes(snap.riskLevel))
      ? `<button type="button" class="cta-btn" aria-label="Lock temptation for ${snap.casinoName}" data-casino="${snap.casinoName}" data-risk="${snap.riskLevel}">Lock Vault</button>`
      : '';
    rows.push(`<tr class="risk-${snap.riskLevel}">
      <td>${snap.casinoName}</td>
      <td>${snap.currentScore}</td>
      <td class="${deltaClass}">${snap.scoreDelta ?? ''}</td>
      <td>${riskBadge(snap.riskLevel)}</td>
      <td>${formatVolatility(snap.volatility24h)}</td>
      <td>${snap.nerfs24h}</td>
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