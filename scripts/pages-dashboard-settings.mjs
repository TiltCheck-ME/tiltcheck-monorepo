/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * Dashboard Settings section for tiltcheck.me/dashboard/.
 *
 * Every setting that used to live in the extension popup and its gear/Guards panels.
 * Saved per Discord user by the CollectClock worker: GET/PUT `${API_URL}/settings`
 * with the site's Discord token (localStorage tc_token) as the Bearer.
 * The extension pulls the same object on sign-in and every ~15 minutes.
 */

import { lockConfirmDialogHtml, LOCK_CONFIRM_SCRIPT } from './pages-lock-confirm.mjs';

export const GAME_CATEGORIES = Object.freeze([
  ['chicken_mines', 'Chicken / Mines'],
  ['bonus_buy', 'Bonus Buy'],
  ['live_dealer', 'Live Dealer'],
  ['slots', 'Slots'],
  ['crash', 'Crash'],
  ['table_games', 'Table Games'],
]);

/** Plain-language groups. Keys match PLAYER_SETTINGS_DEFAULTS. */
export const SETTINGS_GROUPS = Object.freeze([
  {
    legend: 'On or off',
    hint: 'Off means the extension sits on its hands on casino tabs. A break you already locked still runs.',
    rows: [{ key: 'enabled', type: 'toggle', label: 'TiltCheck is on' }],
  },
  {
    legend: 'ClickCheck',
    hint: 'A two-second pause between spins, plus a timeout when you start mashing the button.',
    rows: [
      { key: 'clickCheck', type: 'toggle', label: 'Pause between spins' },
      {
        key: 'tiltSensitivity',
        type: 'select',
        label: 'When should it step in?',
        options: [
          ['conservative', 'Early'],
          ['moderate', 'Normal'],
          ['degen', 'Late'],
        ],
      },
    ],
  },
  {
    legend: 'Sneaky Bet Alert',
    hint: "Speaks up when your bet creeps above your usual base bet. Casino defaults aren't your defaults.",
    rows: [
      { key: 'sneakyBet', type: 'toggle', label: 'Warn me' },
      { key: 'sneakyBetThreshold', type: 'number', label: 'My usual base bet ($)', min: 0.01, max: 1000, step: 0.01 },
    ],
  },
  {
    legend: 'TimeCheck',
    hint: "Shows how long you've been at it, priced in hours of your own pay.",
    rows: [
      { key: 'timeCheck', type: 'toggle', label: 'Show the clock' },
      { key: 'hourlyWage', type: 'number', label: 'An hour of my time is worth ($)', min: 5, max: 2000, step: 1 },
      { key: 'timeCheckHours', type: 'number', label: 'Nudge me after (hours)', min: 0.5, max: 24, step: 0.5 },
    ],
  },
  {
    legend: 'RealityCheck',
    hint: 'Timeouts when things get spicy. For a proper lock, use Take a break above.',
    rows: [
      { key: 'depositBlock', type: 'toggle', label: 'Grey out deposit buttons during a timeout' },
      { key: 'autoBreak', type: 'toggle', label: "Offer a break when I'm tilting (it asks first)" },
      { key: 'autoBreakScore', type: 'number', label: 'Tilt score that brings up the offer (50 to 95)', min: 50, max: 95, step: 1 },
      { key: 'autoBreakHours', type: 'number', label: 'How long the break lasts if I take it (hours)', min: 1, max: 720, step: 1 },
    ],
  },
  {
    legend: 'Keep the Win',
    hint: 'Hides the casino\u2019s \u201cCancel withdrawal\u201d button while your cashout clears.',
    rows: [{ key: 'keepTheWin', type: 'toggle', label: 'Hide the cancel button' }],
  },
  {
    legend: 'Win Skim',
    hint: "When you're up, it nudges you to move part of the win into your casino vault before it wanders back.",
    rows: [
      { key: 'winSkim', type: 'toggle', label: 'Nudge me to skim' },
      {
        key: 'winSkimPercent',
        type: 'select',
        label: 'How much of the win',
        number: true,
        options: [10, 20, 30, 40, 50, 60, 70, 80, 90].map((n) => [String(n), `${n}%`]),
      },
      { key: 'winSkimMinProfit', type: 'number', label: "Only once I'm up at least ($)", min: 10, max: 10000, step: 1 },
    ],
  },
  {
    legend: 'Cashout goals',
    hint: 'Pings you when your balance hits something real. Rent beats one more spin.',
    rows: [
      { key: 'cashoutGoals', type: 'toggle', label: 'Ping me at my goals' },
      { key: 'goals', type: 'goals', label: 'My goals' },
    ],
  },
  {
    legend: 'Bonus playthrough',
    hint: "Tracks a bonus's wagering and stops the bets that would void it.",
    rows: [
      { key: 'bonusTracker', type: 'toggle', label: 'Track a bonus' },
      { key: 'bonusName', type: 'text', label: 'Bonus name', maxlength: 60 },
      { key: 'bonusTargetWager', type: 'number', label: 'Wagering needed ($)', min: 0, max: 100000000, step: 1 },
      { key: 'bonusMaxBet', type: 'number', label: 'Max bet allowed ($)', min: 0, max: 1000000, step: 0.01 },
      { key: 'bonusBlockOver', type: 'toggle', label: 'Stop bets over the max' },
    ],
  },
  {
    legend: 'Nope List',
    hint: "Games and game types you're done with. TiltCheck blocks their tiles.",
    rows: [
      { key: 'nopeList', type: 'toggle', label: 'Block my Nope List' },
      { key: 'nopeCategories', type: 'categories', label: 'Game types' },
      { key: 'nopeGames', type: 'lines', label: 'Specific games, one per line' },
    ],
  },
  {
    legend: 'Sounds',
    hint: 'A small ping when something trips.',
    rows: [
      { key: 'sounds', type: 'toggle', label: 'Play sounds' },
      { key: 'soundVolume', type: 'range', label: 'Volume', min: 0, max: 1, step: 0.05 },
    ],
  },
]);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function rowHtml(row) {
  const id = `set-${row.key}`;
  const data = `data-setting="${row.key}" data-type="${row.type}"`;
  switch (row.type) {
    case 'toggle':
      return `<div class="dash-row"><label for="${id}">${esc(row.label)}</label><input type="checkbox" id="${id}" ${data} /></div>`;
    case 'number':
      return `<div class="dash-row"><label for="${id}">${esc(row.label)}</label><input type="number" inputmode="decimal" id="${id}" ${data} min="${row.min}" max="${row.max}" step="${row.step}" required /></div>`;
    case 'range':
      return `<div class="dash-row"><label for="${id}">${esc(row.label)}</label><input type="range" id="${id}" ${data} min="${row.min}" max="${row.max}" step="${row.step}" /></div>`;
    case 'text':
      return `<div class="dash-row"><label for="${id}">${esc(row.label)}</label><input type="text" id="${id}" ${data} maxlength="${row.maxlength}" /></div>`;
    case 'select':
      return `<div class="dash-row"><label for="${id}">${esc(row.label)}</label><select id="${id}" ${data}${row.number ? ' data-number="1"' : ''}>${row.options
        .map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`)
        .join('')}</select></div>`;
    case 'categories':
      return `<div class="dash-row__label" id="${id}-label">${esc(row.label)}</div><div class="dash-cats" role="group" aria-labelledby="${id}-label" ${data}>${GAME_CATEGORIES.map(
        ([v, l]) => `<label><input type="checkbox" value="${v}" data-cat="${v}" /> ${esc(l)}</label>`,
      ).join('')}</div>`;
    case 'lines':
      return `<label class="dash-row__label" for="${id}">${esc(row.label)}</label><textarea class="dash-textarea" id="${id}" ${data} rows="3" placeholder="plinko&#10;sweet-bonanza"></textarea>`;
    case 'goals':
      return `<div class="dash-row__label" id="${id}-label">${esc(row.label)}</div><div id="${id}" ${data} role="group" aria-labelledby="${id}-label"></div><button type="button" class="dash-add-goal" id="btn-add-goal">Add a goal</button>`;
    default:
      return '';
  }
}

export function dashboardSettingsHtml({ loginUrl }) {
  const groups = SETTINGS_GROUPS.map(
    (g) => `<fieldset class="dash-group"><legend>${esc(g.legend)}</legend><p class="dash-group__hint">${esc(g.hint)}</p>${g.rows.map(rowHtml).join('')}</fieldset>`,
  ).join('\n');

  return `<section class="dash-break cooldown-lock" aria-labelledby="dash-break-title">
  <h2 id="dash-break-title" class="cooldown-label">Take a break</h2>
  <div class="cooldown-durs" role="group" aria-label="How long">
    <button type="button" class="cooldown-dur-btn" data-dash-hours="24" aria-pressed="false">24h</button>
    <button type="button" class="cooldown-dur-btn" data-dash-hours="72" aria-pressed="false">3 Days</button>
    <button type="button" class="cooldown-dur-btn active" data-dash-hours="168" aria-pressed="true">7 Days</button>
    <button type="button" class="cooldown-dur-btn" data-dash-hours="720" aria-pressed="false">30 Days</button>
  </div>
  <button type="button" class="btn btn-primary cooldown-lock-btn" id="btn-dash-lock">Lock me out for 7 days</button>
  <p id="dash-lock-status" class="cooldown-lock-status" role="status" aria-live="polite" hidden></p>
  <p class="cooldown-fine">The block runs in the TiltCheck extension. You can't cancel it early.</p>
</section>

<section class="dash-settings" id="settings" aria-labelledby="dash-settings-title">
  <h2 id="dash-settings-title">Settings</h2>
  <p class="dash-settings__lede">Everything the extension does, in one place. Saved to your Discord account, so every browser with the extension follows along.</p>
  <div class="dash-signin" id="dash-signin">
    <p>Sign in with Discord to change these. Signed out, the extension runs the defaults.</p>
    <a class="btn btn-primary" id="dash-signin-btn" href="${esc(loginUrl)}">Sign in with Discord</a>
  </div>
  <form id="dash-settings-form" novalidate hidden>
    ${groups}
    <div class="dash-save">
      <button type="submit" class="btn btn-primary" id="dash-save-btn">Save settings</button>
      <span class="dash-save__status" id="dash-save-status" role="status" aria-live="polite"></span>
    </div>
  </form>
  <p class="dash-help">Want a ban the casino has to honor? <a href="https://www.ncpgambling.org/" target="_blank" rel="noopener noreferrer">NCPG (US)</a> · <a href="tel:18004262537">1-800-GAMBLER</a> · <a href="https://www.gamstop.co.uk/" target="_blank" rel="noopener noreferrer">GAMSTOP (UK)</a></p>
</section>
${lockConfirmDialogHtml()}`;
}

export function dashboardSettingsScript({ apiUrl, defaults }) {
  return `${LOCK_CONFIRM_SCRIPT}
<script>
(function () {
  var API = ${JSON.stringify(apiUrl)} + '/settings';
  var DEFAULTS = ${JSON.stringify(defaults)};
  var form = document.getElementById('dash-settings-form');
  var signin = document.getElementById('dash-signin');
  var status = document.getElementById('dash-save-status');
  var saveBtn = document.getElementById('dash-save-btn');
  var goalsBox = document.getElementById('set-goals');
  var addGoal = document.getElementById('btn-add-goal');
  var loaded = null;

  function token() {
    try {
      var t = localStorage.getItem('tc_token');
      var exp = Number(localStorage.getItem('tc_token_exp') || 0);
      if (!t || (exp && exp < Date.now())) return null;
      return t;
    } catch (e) { return null; }
  }
  function say(msg) { if (status) status.textContent = msg; }
  function field(key) { return form.querySelector('[data-setting="' + key + '"]'); }
  function slug(s) { return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48); }

  function goalRow(g) {
    var row = document.createElement('div');
    row.className = 'dash-goal';
    var n = document.createElement('input');
    n.type = 'text'; n.maxLength = 40; n.placeholder = 'Rent'; n.value = g.name || ''; n.setAttribute('aria-label', 'Goal name');
    n.setAttribute('data-goal-name', '');
    var a = document.createElement('input');
    a.type = 'number'; a.min = '1'; a.max = '10000000'; a.step = '1'; a.inputMode = 'decimal'; a.value = g.targetAmount != null ? g.targetAmount : '';
    a.setAttribute('aria-label', 'Goal amount in dollars'); a.setAttribute('data-goal-amount', '');
    var rm = document.createElement('button');
    rm.type = 'button'; rm.textContent = 'Remove';
    rm.addEventListener('click', function () { row.remove(); addGoal.disabled = goalsBox.children.length >= 10; });
    row.setAttribute('data-goal-id', g.id || ('g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)));
    row.setAttribute('data-goal-metric', g.metric === 'profit' ? 'profit' : 'balance');
    row.appendChild(n); row.appendChild(a); row.appendChild(rm);
    return row;
  }

  function fill(s) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-setting]'), function (el) {
      var key = el.getAttribute('data-setting');
      var type = el.getAttribute('data-type');
      var v = s[key];
      if (type === 'toggle') el.checked = v === true;
      else if (type === 'categories') {
        Array.prototype.forEach.call(el.querySelectorAll('[data-cat]'), function (c) { c.checked = (v || []).indexOf(c.value) !== -1; });
      } else if (type === 'lines') el.value = (v || []).join('\\n');
      else if (type === 'goals') {
        goalsBox.innerHTML = '';
        (Array.isArray(v) ? v : []).forEach(function (g) { goalsBox.appendChild(goalRow(g)); });
        addGoal.disabled = goalsBox.children.length >= 10;
      } else if (v !== undefined && v !== null) el.value = String(v);
    });
  }

  function collect() {
    var out = {};
    var bad = null;
    Array.prototype.forEach.call(form.querySelectorAll('[data-setting]'), function (el) {
      var key = el.getAttribute('data-setting');
      var type = el.getAttribute('data-type');
      if (type === 'toggle') out[key] = !!el.checked;
      else if (type === 'number' || type === 'range') {
        var n = Number(el.value);
        var min = Number(el.min), max = Number(el.max);
        if (el.value === '' || !isFinite(n) || n < min || n > max) { bad = bad || el; return; }
        out[key] = el.getAttribute('step') === '1' ? Math.round(n) : n;
      } else if (type === 'select') out[key] = el.getAttribute('data-number') ? Number(el.value) : el.value;
      else if (type === 'text') out[key] = el.value.trim().slice(0, 60);
      else if (type === 'categories') {
        out[key] = Array.prototype.filter.call(el.querySelectorAll('[data-cat]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
      } else if (type === 'lines') {
        var seen = {};
        out[key] = el.value.split(/\\n|,/).map(slug).filter(function (x) { if (!x || seen[x]) return false; seen[x] = 1; return true; }).slice(0, 64);
      } else if (type === 'goals') {
        out[key] = Array.prototype.map.call(goalsBox.children, function (row) {
          return {
            id: row.getAttribute('data-goal-id'),
            name: row.querySelector('[data-goal-name]').value.trim().slice(0, 40),
            targetAmount: Number(row.querySelector('[data-goal-amount]').value),
            metric: row.getAttribute('data-goal-metric'),
            enabled: true
          };
        }).filter(function (g) { return g.name && g.targetAmount >= 1 && g.targetAmount <= 10000000; }).slice(0, 10);
      }
    });
    return { settings: out, bad: bad };
  }

  function signedOut(msg) {
    form.hidden = true;
    signin.hidden = false;
    if (msg) { var p = signin.querySelector('p'); if (p) p.textContent = msg; }
  }

  function load() {
    var t = token();
    if (!t) { signedOut(); return; }
    signin.hidden = true;
    form.hidden = false;
    fill(DEFAULTS);
    form.setAttribute('aria-busy', 'true');
    saveBtn.disabled = true;
    say('Loading your settings...');
    fetch(API, { headers: { Authorization: 'Bearer ' + t } })
      .then(function (r) {
        if (r.status === 401) { signedOut('Your Discord sign-in ran out. Sign in again to change settings.'); throw new Error('401'); }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (body) {
        loaded = Object.assign({}, DEFAULTS, (body && body.settings) || {});
        fill(loaded);
        saveBtn.disabled = false;
        say(body && body.updatedAt ? 'Loaded.' : 'These are the defaults. Change anything and save.');
      })
      .catch(function (e) {
        if (String(e && e.message) === '401') return;
        saveBtn.disabled = true;
        say("Can't reach your settings right now. Nothing changed. Try again in a bit.");
      })
      .then(function () { form.removeAttribute('aria-busy'); });
  }

  addGoal && addGoal.addEventListener('click', function () {
    if (goalsBox.children.length >= 10) return;
    var row = goalRow({ name: '', targetAmount: '' });
    goalsBox.appendChild(row);
    addGoal.disabled = goalsBox.children.length >= 10;
    row.querySelector('input').focus();
  });

  form && form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = token();
    if (!t) { signedOut(); return; }
    var c = collect();
    if (c.bad) {
      say('That number is outside what it can take (' + c.bad.min + ' to ' + c.bad.max + ').');
      c.bad.focus();
      return;
    }
    saveBtn.disabled = true;
    say('Saving...');
    fetch(API, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: c.settings })
    })
      .then(function (r) {
        if (r.status === 401) { signedOut('Your Discord sign-in ran out. Sign in again to save.'); throw new Error('401'); }
        return r.json().then(function (b) { if (!r.ok) throw new Error((b && b.error) || 'http ' + r.status); return b; });
      })
      .then(function (b) {
        loaded = Object.assign({}, DEFAULTS, (b && b.settings) || c.settings);
        fill(loaded);
        say('Saved. The extension picks it up within 15 minutes, or right away when you open it.');
      })
      .catch(function (err) {
        if (String(err && err.message) === '401') return;
        say('Not saved: ' + ((err && err.message) || 'something broke') + '.');
      })
      .then(function () { saveBtn.disabled = false; });
  });

  // ---- Take a break from the dashboard (same lock as /cooldown/, same "No take-backs" popup) ----
  var hours = 168;
  var lockedUntil = 0;
  var durs = Array.prototype.slice.call(document.querySelectorAll('[data-dash-hours]'));
  var lockBtn = document.getElementById('btn-dash-lock');
  var lockStatus = document.getElementById('dash-lock-status');
  function words(h) { if (h === 24) return '24 hours'; var d = Math.round(h / 24); return d + (d === 1 ? ' day' : ' days'); }
  function fmt(ms) { try { return new Date(ms).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return new Date(ms).toString(); } }
  function paint() {
    if (!lockBtn) return;
    if (lockedUntil > Date.now()) {
      lockBtn.disabled = true;
      lockBtn.textContent = 'Locked until ' + fmt(lockedUntil);
      durs.forEach(function (b) { b.disabled = true; });
      lockStatus.textContent = 'Locked until ' + fmt(lockedUntil) + '. Go touch grass.';
      lockStatus.hidden = false;
    } else {
      lockBtn.disabled = false;
      lockBtn.textContent = 'Lock me out for ' + words(hours);
    }
  }
  durs.forEach(function (b) {
    b.addEventListener('click', function () {
      durs.forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('active'); b.setAttribute('aria-pressed', 'true');
      hours = parseInt(b.getAttribute('data-dash-hours'), 10) || 168;
      paint();
    });
  });
  lockBtn && lockBtn.addEventListener('click', function () {
    if (lockedUntil > Date.now()) return;
    var endSec = Math.floor(Date.now() / 1000) + hours * 3600;
    if (!window.TiltCheckLockConfirm) return;
    window.TiltCheckLockConfirm.open({ endMs: endSec * 1000 }).then(function (ok) {
      if (!ok || lockedUntil > Date.now()) return;
      window.postMessage({ source: 'TILTCHECK_COOLDOWN_PAGE', type: 'LOCK_UPDATED', wallet: 'in_browser_lockout', endTime: endSec, lockSource: 'dashboard' }, window.location.origin);
      try {
        localStorage.setItem('tiltcheck_cooldown_active_until', String(endSec * 1000));
        localStorage.setItem('tiltcheck_cooldown_source', 'dashboard');
      } catch (e) {}
      lockedUntil = endSec * 1000;
      paint();
    });
  });
  window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data || event.data.source !== 'TILTCHECK_EXTENSION' || event.data.type !== 'LOCK_STATE') return;
    var until = Number(event.data.activeUntil) || 0;
    if (until > Date.now() && until >= lockedUntil) {
      lockedUntil = until;
      try { localStorage.setItem('tiltcheck_cooldown_active_until', String(until)); } catch (e) {}
      paint();
    }
  });
  try {
    var stored = Number(localStorage.getItem('tiltcheck_cooldown_active_until') || 0);
    if (stored > Date.now()) lockedUntil = stored;
  } catch (e) {}
  paint();
  window.postMessage({ source: 'TILTCHECK_COOLDOWN_PAGE', type: 'GET_LOCK_STATE' }, window.location.origin);

  window.addEventListener('storage', function (e) { if (e.key === 'tc_token') load(); });
  load();
})();
</script>`;
}
