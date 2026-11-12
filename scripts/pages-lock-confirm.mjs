/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * "No take-backs" confirmation shown before any Take-a-break lock starts on tiltcheck.me
 * (the /cooldown/ page and the dashboard). Shared by convert-markdown.js.
 *
 * Behavior:
 * - The lock button stays disabled until the first-person checkbox is ticked.
 * - Cancel, Esc, or tapping outside closes it without locking.
 * - Focus is trapped inside while open and goes back to the button that opened it.
 * - role="dialog" + aria-modal, labelled and described for screen readers.
 *
 * API (browser): window.TiltCheckLockConfirm.open({ endMs }) -> Promise<boolean>
 */

export const LOCK_CONFIRM_COPY = Object.freeze({
  title: 'No take-backs.',
  body: "Until {end}, TiltCheck greys out casino deposit buttons in this browser. No cancel button, no early exit, no \u201cjust this once.\u201d You can make it longer. That's it.",
  check: "I know I'm the one choosing this, and I can't undo it.",
  go: 'Lock it',
  cancel: 'Cancel',
});

export function lockConfirmDialogHtml() {
  const c = LOCK_CONFIRM_COPY;
  const [before, after] = c.body.split('{end}');
  return `<div class="lock-confirm" id="lock-confirm" hidden>
  <div class="lock-confirm__backdrop" data-lock-confirm-cancel></div>
  <div class="lock-confirm__box" role="dialog" aria-modal="true" aria-labelledby="lock-confirm-title" aria-describedby="lock-confirm-body" tabindex="-1">
    <h2 class="lock-confirm__title" id="lock-confirm-title">${c.title}</h2>
    <p class="lock-confirm__body" id="lock-confirm-body">${before}<strong id="lock-confirm-end">the end time</strong>${after}</p>
    <label class="lock-confirm__check" for="lock-confirm-check">
      <input type="checkbox" id="lock-confirm-check" />
      <span>${c.check}</span>
    </label>
    <div class="lock-confirm__actions">
      <button type="button" class="btn btn-secondary lock-confirm__cancel" id="lock-confirm-cancel" data-lock-confirm-cancel>${c.cancel}</button>
      <button type="button" class="btn btn-primary lock-confirm__go" id="lock-confirm-go" disabled aria-disabled="true">${c.go}</button>
    </div>
  </div>
</div>`;
}

export const LOCK_CONFIRM_SCRIPT = `<script>
(function () {
  if (window.TiltCheckLockConfirm) return;
  var root = document.getElementById('lock-confirm');
  if (!root) return;
  var box = root.querySelector('.lock-confirm__box');
  var check = document.getElementById('lock-confirm-check');
  var go = document.getElementById('lock-confirm-go');
  var endEl = document.getElementById('lock-confirm-end');
  var pending = null;
  var opener = null;

  function fmt(ms) {
    try {
      return new Date(ms).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    } catch (e) { return new Date(ms).toString(); }
  }
  function focusables() {
    return Array.prototype.slice.call(box.querySelectorAll('input, button, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(function (n) { return !n.disabled; });
  }
  function sync() {
    var ok = !!check.checked;
    go.disabled = !ok;
    go.setAttribute('aria-disabled', ok ? 'false' : 'true');
  }
  function close(result) {
    if (!pending) return;
    var done = pending;
    pending = null;
    root.hidden = true;
    document.documentElement.classList.remove('lock-confirm-open');
    document.removeEventListener('keydown', onKey, true);
    if (opener && typeof opener.focus === 'function') { try { opener.focus(); } catch (e) {} }
    opener = null;
    done(result);
  }
  function onKey(e) {
    if (root.hidden) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(false); return; }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1];
      var active = document.activeElement;
      if (!box.contains(active)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  }
  check.addEventListener('change', sync);
  check.addEventListener('click', function () { setTimeout(sync, 0); });
  Array.prototype.forEach.call(root.querySelectorAll('[data-lock-confirm-cancel]'), function (n) {
    n.addEventListener('click', function () { close(false); });
  });
  go.addEventListener('click', function () {
    // Belt and braces: never lock without the box ticked.
    if (!check.checked) { sync(); return; }
    close(true);
  });
  // Focus that wanders out (screen reader virtual cursor, tapping the page) comes back in.
  document.addEventListener('focusin', function (e) {
    if (!root.hidden && !box.contains(e.target)) { check.focus(); }
  });

  window.TiltCheckLockConfirm = {
    open: function (opts) {
      opts = opts || {};
      if (pending) close(false);
      opener = document.activeElement;
      endEl.textContent = fmt(Number(opts.endMs) || Date.now());
      check.checked = false;
      sync();
      root.hidden = false;
      document.documentElement.classList.add('lock-confirm-open');
      document.addEventListener('keydown', onKey, true);
      setTimeout(function () { try { check.focus(); } catch (e) {} }, 0);
      return new Promise(function (resolve) { pending = resolve; });
    },
    isOpen: function () { return !!pending; }
  };
})();
</script>`;
