/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * TiltCheck Control Room — Frontend
 */
'use strict';

// ── State ──────────────────────────────────────────────────────────────────────
let currentTab = 'containers';
let selectedContainer = null;
let liveLogSource = null;
let ws = null;
let allServices = [];

// ── Init ───────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  startClock();
  const { data } = await api('/api/auth/status');
  if (data && data.authenticated) showApp();
  document.getElementById('login-form').addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('password').value;
  const { ok, data } = await api('/api/auth/login', 'POST', { password: pw });
  if (ok) {
    showApp();
  } else {
    document.getElementById('login-error').textContent = (data && data.error) || 'Invalid password';
  }
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initTabs();
  connectWS();
  refreshAll();
  setInterval(refreshAll, 15000);
}

window.logout = async function () {
  await api('/api/auth/logout', 'POST');
  location.reload();
};

// ── API Helper ─────────────────────────────────────────────────────────────────
async function api(url, method, body) {
  method = method || 'GET';
  try {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch(url, opts);
    var data = await res.json().catch(function() { return {}; });
    return { ok: res.ok, status: res.status, data: data };
  } catch (err) {
    return { ok: false, data: { error: err.message } };
  }
}

// ── Clock ──────────────────────────────────────────────────────────────────────
function startClock() {
  var el = document.getElementById('clock');
  function tick() { if (el) el.textContent = new Date().toLocaleTimeString(); }
  tick();
  setInterval(tick, 1000);
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
var TAB_TITLES = { containers: 'Containers', logs: 'Logs', metrics: 'Metrics', compose: 'Compose' };

function initTabs() {
  document.querySelectorAll('.nav-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-link').forEach(function(l) {
    l.classList.toggle('active', l.dataset.tab === tab);
  });
  document.querySelectorAll('.tab').forEach(function(s) {
    s.classList.toggle('active', s.id === 'tab-' + tab);
    s.classList.toggle('hidden', s.id !== 'tab-' + tab);
  });
  document.getElementById('tab-title').textContent = TAB_TITLES[tab] || tab;
  if (tab === 'metrics') loadMetrics();
  if (tab === 'logs') buildLogsSidebar();
}

// ── Refresh ────────────────────────────────────────────────────────────────────
window.refreshAll = async function () {
  await loadContainers();
  var el = document.getElementById('last-updated');
  if (el) el.textContent = 'Updated ' + new Date().toLocaleTimeString();
};

// ── Containers ─────────────────────────────────────────────────────────────────
async function loadContainers() {
  var result = await api('/api/system/status');
  if (!result.ok) return;
  allServices = (result.data && result.data.services) || [];
  renderContainerGrid(allServices);
  updateSummary(allServices);
  if (currentTab === 'logs') buildLogsSidebar();
}

function updateSummary(services) {
  var running = services.filter(function(s) { return s.status === 'running'; }).length;
  var stopped = services.filter(function(s) { return s.status === 'stopped'; }).length;
  var missing = services.filter(function(s) { return s.status === 'missing'; }).length;
  document.getElementById('sum-running').textContent = running;
  document.getElementById('sum-stopped').textContent = stopped;
  document.getElementById('sum-missing').textContent = missing;
}

function statusClass(s) {
  if (s === 'running') return 'status-running';
  if (s === 'stopped') return 'status-stopped';
  return 'status-missing';
}

function renderContainerGrid(services) {
  var grid = document.getElementById('container-grid');
  if (!services.length) { grid.innerHTML = '<div class="loading-msg">No containers found.</div>'; return; }

  grid.innerHTML = services.map(function(s) {
    var statsHtml = (s.cpu || s.mem) ? (
      '<div class="cc-stats">' +
      (s.cpu ? '<span title="CPU">&#x26A1; ' + escHtml(s.cpu) + '</span>' : '') +
      (s.mem ? '<span title="Memory">&#x1F9E0; ' + escHtml(s.mem) + '</span>' : '') +
      (s.net ? '<span title="Network">&#x1F310; ' + escHtml(s.net) + '</span>' : '') +
      '</div>'
    ) : '';
    var actionsHtml = s.status === 'running' ? (
      '<button class="btn btn-xs btn-warning" onclick="containerAction(\'restart\',\'' + s.name + '\')">&#x21BA; Restart</button>' +
      '<button class="btn btn-xs btn-danger" onclick="containerAction(\'stop\',\'' + s.name + '\')">&#9632; Stop</button>' +
      '<button class="btn btn-xs btn-ghost" onclick="openLogs(\'' + s.name + '\')">&#x1F4CB; Logs</button>'
    ) : (
      '<button class="btn btn-xs btn-primary" onclick="containerAction(\'start\',\'' + s.name + '\')">&#9654; Start</button>' +
      '<button class="btn btn-xs btn-ghost" onclick="openLogs(\'' + s.name + '\')">&#x1F4CB; Logs</button>'
    );
    return '<div class="container-card ' + statusClass(s.status) + '">' +
      '<div class="cc-header">' +
        '<span class="cc-icon">' + (s.icon || '&#x1F4E6;') + '</span>' +
        '<div class="cc-title">' +
          '<div class="cc-name">' + escHtml(s.label) + '</div>' +
          '<div class="cc-id muted">' + escHtml(s.id || s.name) + '</div>' +
        '</div>' +
        '<span class="status-pill ' + statusClass(s.status) + '">' + s.status + '</span>' +
      '</div>' +
      statsHtml +
      (s.statusText ? '<div class="cc-uptime muted">' + escHtml(s.statusText) + '</div>' : '') +
      (s.ports ? '<div class="cc-ports muted">' + escHtml(s.ports) + '</div>' : '') +
      '<div class="cc-actions">' + actionsHtml + '</div>' +
    '</div>';
  }).join('');
}

window.containerAction = async function (action, name) {
  var labels = { restart: 'Restarting', stop: 'Stopping', start: 'Starting', kill: 'Killing' };
  toast((labels[action] || action) + ' ' + name + '...');
  var result = await api('/api/container/' + action + '/' + name, 'POST');
  if (result.ok) {
    toast('Done: ' + name + ' ' + action + 'ed');
    setTimeout(loadContainers, 1500);
  } else {
    toast('Error: ' + ((result.data && result.data.error) || 'unknown'), 'error');
  }
};

window.restartAll = async function () {
  if (!confirm('Restart ALL known containers?')) return;
  toast('Restarting all containers...');
  var result = await api('/api/containers/restart-all', 'POST');
  if (result.ok) {
    toast('All containers restarted');
    setTimeout(loadContainers, 3000);
  } else {
    toast('Error: ' + ((result.data && result.data.error) || 'unknown'), 'error');
  }
};

// ── Logs ───────────────────────────────────────────────────────────────────────
function buildLogsSidebar() {
  var list = document.getElementById('logs-container-list');
  if (!list || !allServices.length) return;
  list.innerHTML = allServices.map(function(s) {
    return '<div class="logs-item ' + (s.name === selectedContainer ? 'active' : '') + ' ' + statusClass(s.status) + '" onclick="openLogs(\'' + s.name + '\')">' +
      '<span>' + (s.icon || '&#x1F4E6;') + '</span>' +
      '<span class="logs-item-name">' + escHtml(s.label) + '</span>' +
      '<span class="logs-item-dot ' + statusClass(s.status) + '"></span>' +
    '</div>';
  }).join('');
}

window.openLogs = function (name) {
  selectedContainer = name;
  if (currentTab !== 'logs') switchTab('logs');
  buildLogsSidebar();
  document.getElementById('logs-container-name').textContent = name;
  fetchLogs();
};

window.fetchLogs = async function () {
  if (!selectedContainer) return;
  stopLiveTail();
  var lines = document.getElementById('logs-lines').value;
  var out = document.getElementById('log-output');
  out.innerHTML = '<div class="log-placeholder">Loading...</div>';
  var result = await api('/api/logs/' + selectedContainer + '?lines=' + lines);
  if (result.ok) {
    renderLogs((result.data && result.data.logs) || '');
  } else {
    out.innerHTML = '<div class="log-placeholder error-msg">' + escHtml((result.data && result.data.error) || 'Error') + '</div>';
  }
  if (document.getElementById('live-toggle').checked) startLiveTail();
};

function renderLogs(text) {
  var out = document.getElementById('log-output');
  var lines = text.split('\n');
  out.innerHTML = lines.map(function(line) {
    return '<div class="log-line">' + colorLog(escHtml(line)) + '</div>';
  }).join('');
  out.scrollTop = out.scrollHeight;
}

function startLiveTail() {
  stopLiveTail();
  if (!selectedContainer) return;
  var out = document.getElementById('log-output');
  liveLogSource = new EventSource('/api/logs/' + selectedContainer + '/stream');
  liveLogSource.onmessage = function(e) {
    var parsed = JSON.parse(e.data);
    var div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = colorLog(escHtml(parsed.line));
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
    while (out.children.length > 1000) out.removeChild(out.firstChild);
  };
  liveLogSource.onerror = function() { stopLiveTail(); };
}

function stopLiveTail() {
  if (liveLogSource) { liveLogSource.close(); liveLogSource = null; }
}

document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'live-toggle') {
    if (e.target.checked) startLiveTail();
    else stopLiveTail();
  }
});

window.clearLogs = function () {
  stopLiveTail();
  document.getElementById('log-output').innerHTML = '<div class="log-placeholder">Cleared.</div>';
};

function colorLog(line) {
  if (/error|fail|fatal|exception/i.test(line)) return '<span class="log-error">' + line + '</span>';
  if (/warn/i.test(line)) return '<span class="log-warn">' + line + '</span>';
  if (/info|started|running|ready|listening/i.test(line)) return '<span class="log-info">' + line + '</span>';
  if (/debug/i.test(line)) return '<span class="log-debug">' + line + '</span>';
  return line;
}

// ── Metrics ────────────────────────────────────────────────────────────────────
async function loadMetrics() {
  var results = await Promise.all([api('/api/system/metrics'), api('/api/system/status')]);
  var m = results[0].data;
  var s = results[1].data;

  if (m) {
    document.getElementById('m-uptime').textContent = m.uptime || '—';
    document.getElementById('m-load').textContent = m.loadAverage || '—';
    document.getElementById('m-mem').textContent = m.memory || '—';
    document.getElementById('m-disk').textContent = m.disk || '—';
    document.getElementById('m-docker').textContent = m.dockerVersion || '—';
    var c = m.containers || {};
    document.getElementById('m-containers').textContent =
      (c.running || 0) + ' running / ' + (c.stopped || 0) + ' stopped / ' + (c.total || 0) + ' total';
  }

  if (s && s.services) {
    renderStatsTable(s.services);
    var upEl = document.getElementById('stats-updated');
    if (upEl) upEl.textContent = 'Updated ' + new Date().toLocaleTimeString();
  }
}

function renderStatsTable(services) {
  var wrap = document.getElementById('per-container-stats');
  var withStats = services.filter(function(s) { return s.cpu || s.mem; });
  if (!withStats.length) {
    wrap.innerHTML = '<div class="muted" style="padding:1rem">No stats available (containers may not be running)</div>';
    return;
  }
  wrap.innerHTML = '<table class="stats-table"><thead><tr>' +
    '<th>Container</th><th>Status</th><th>CPU</th><th>Memory</th><th>Mem %</th><th>Network I/O</th>' +
    '</tr></thead><tbody>' +
    services.map(function(s) {
      return '<tr>' +
        '<td>' + (s.icon || '&#x1F4E6;') + ' ' + escHtml(s.label) + '</td>' +
        '<td><span class="status-pill ' + statusClass(s.status) + '">' + s.status + '</span></td>' +
        '<td>' + (s.cpu ? escHtml(s.cpu) : '—') + '</td>' +
        '<td>' + (s.mem ? escHtml(s.mem) : '—') + '</td>' +
        '<td>' + (s.memPerc ? escHtml(s.memPerc) : '—') + '</td>' +
        '<td>' + (s.net ? escHtml(s.net) : '—') + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

// ── Compose ────────────────────────────────────────────────────────────────────
window.composeAction = async function (action) {
  var warnings = {
    down: 'This will STOP ALL containers. Are you sure?',
    pull: 'Pull latest images for all services?',
    up: 'Deploy / start all containers?',
  };
  if (warnings[action] && !confirm(warnings[action])) return;

  var out = document.getElementById('compose-output');
  out.textContent = 'Running docker compose ' + action + '...';

  var result = await api('/api/compose/' + action, 'POST');
  out.textContent = result.ok
    ? ((result.data && result.data.output) || 'Done.')
    : 'Error: ' + ((result.data && result.data.error) || 'Unknown error');

  if (result.ok && (action === 'up' || action === 'down')) {
    setTimeout(loadContainers, 3000);
  }
};

window.clearComposeOutput = function () {
  document.getElementById('compose-output').textContent = 'No output yet.';
};

// ── WebSocket ──────────────────────────────────────────────────────────────────
function connectWS() {
  var proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host);

  ws.onopen = function() { setWsIndicator(true); };
  ws.onclose = function() { setWsIndicator(false); setTimeout(connectWS, 5000); };
  ws.onerror = function() { setWsIndicator(false); };

  ws.onmessage = function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'stats' && currentTab === 'containers') {
        // Patch live CPU/mem stats into existing cards
        Object.keys(msg.stats || {}).forEach(function(name) {
          var stats = msg.stats[name];
          var cards = document.querySelectorAll('.container-card');
          cards.forEach(function(card) {
            var idEl = card.querySelector('.cc-id');
            var nameEl = card.querySelector('.cc-name');
            if ((idEl && idEl.textContent.trim() === name) ||
                (nameEl && nameEl.textContent.trim() === name)) {
              var statsEl = card.querySelector('.cc-stats');
              if (!statsEl) {
                statsEl = document.createElement('div');
                statsEl.className = 'cc-stats';
                card.querySelector('.cc-header').after(statsEl);
              }
              statsEl.innerHTML =
                (stats.cpu ? '<span title="CPU">&#x26A1; ' + escHtml(stats.cpu) + '</span>' : '') +
                (stats.mem ? '<span title="Memory">&#x1F9E0; ' + escHtml(stats.mem) + '</span>' : '') +
                (stats.net ? '<span title="Network">&#x1F310; ' + escHtml(stats.net) + '</span>' : '');
            }
          });
        });
      }
    } catch (err) { /* ignore */ }
  };
}

function setWsIndicator(connected) {
  var el = document.getElementById('ws-indicator');
  if (!el) return;
  el.innerHTML = connected
    ? '<span class="dot dot-on"></span> Live'
    : '<span class="dot dot-off"></span> Disconnected';
}

// ── Toast ──────────────────────────────────────────────────────────────────────
var toastTimer = null;
function toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast toast-' + (type || 'info');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.classList.add('hidden'); }, 3500);
}

// ── Utils ──────────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
