/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 */

/**
 * beta-panel.ts
 * Settings > Beta: the anonymous-counts opt-in toggle and the Send feedback form.
 *
 * Feedback goes to the collectclock-api worker's /support route with the
 * signed-in Discord session; the worker relays it to staff. No Discord webhook
 * URL is stored in the extension.
 */

import {
  FEEDBACK_FALLBACK_URL,
  FEEDBACK_MAX_LENGTH,
  WORKER_ROUTES,
  getWorkerEndpoint,
} from './config.js';
import {
  BETA_EVENTS,
  getBetaCounts,
  isBetaTelemetryOptedIn,
  setBetaTelemetryOptIn,
  type BetaCounts,
} from './beta-telemetry.js';

const EVENT_LABELS: Record<(typeof BETA_EVENTS)[number], string> = {
  install: 'install',
  nudge_shown: 'nudges',
  break_taken: 'breaks',
  keep_win_hold: 'Keep the Win holds',
  cash_out: 'cash-outs',
  ask_question: 'Ask questions',
  protection_turned_off: 'protections turned off',
};

export function formatBetaCounts(counts: BetaCounts): string {
  const parts = BETA_EVENTS.filter((name) => (counts[name] ?? 0) > 0).map(
    (name) => `${EVENT_LABELS[name]} ${counts[name]}`,
  );
  return parts.length ? `Counted on this device so far: ${parts.join(', ')}.` : 'Nothing counted yet.';
}

export type FeedbackResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'signed-out' | 'rate-limited' | 'failed' };

async function readWorkerSession(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get(['workerSession']);
    return typeof stored?.workerSession === 'string' ? stored.workerSession : '';
  } catch {
    return '';
  }
}

/** POST feedback text to the worker. Sends only the message the user typed. */
export async function sendFeedback(
  message: string,
  getSession: () => Promise<string> = readWorkerSession,
): Promise<FeedbackResult> {
  const text = message.trim().slice(0, FEEDBACK_MAX_LENGTH);
  if (!text) return { ok: false, reason: 'empty' };
  const session = await getSession();
  if (!session) return { ok: false, reason: 'signed-out' };
  try {
    const res = await fetch(getWorkerEndpoint(WORKER_ROUTES.SUPPORT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session}` },
      credentials: 'omit',
      body: JSON.stringify({ kind: 'feedback', message: text }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, reason: 'signed-out' };
    if (res.status === 429) return { ok: false, reason: 'rate-limited' };
    return { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

const FEEDBACK_STATUS: Record<string, string> = {
  ok: 'Sent. Thanks.',
  empty: 'Type something first.',
  'signed-out': 'Log in with Discord (top of this popup) to send feedback.',
  'rate-limited': 'Feedback limit reached for today. Try again tomorrow.',
  failed: 'Could not send right now. Try again in a bit.',
};

export async function initBetaPanel(doc: Document = document): Promise<void> {
  const toggle = doc.getElementById('beta-telemetry-toggle') as HTMLInputElement | null;
  const countsEl = doc.getElementById('beta-telemetry-counts');

  const renderCounts = async (optedIn: boolean) => {
    if (!countsEl) return;
    countsEl.style.display = optedIn ? '' : 'none';
    countsEl.textContent = optedIn ? formatBetaCounts(await getBetaCounts()) : '';
  };

  if (toggle) {
    const optedIn = await isBetaTelemetryOptedIn();
    toggle.checked = optedIn;
    await renderCounts(optedIn);
    toggle.addEventListener('change', async () => {
      await setBetaTelemetryOptIn(toggle.checked);
      await renderCounts(toggle.checked);
    });
  }

  const openBtn = doc.getElementById('btn-send-feedback');
  const form = doc.getElementById('feedback-form');
  const textarea = doc.getElementById('feedback-message') as HTMLTextAreaElement | null;
  const submit = doc.getElementById('btn-feedback-submit') as HTMLButtonElement | null;
  const status = doc.getElementById('feedback-status');
  const fallback = doc.getElementById('feedback-fallback-link') as HTMLAnchorElement | null;

  if (fallback) {
    const url = FEEDBACK_FALLBACK_URL.trim();
    if (/^https:\/\//i.test(url)) {
      fallback.href = url;
      fallback.style.display = 'block';
    }
  }

  openBtn?.addEventListener('click', () => {
    if (!form) return;
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    if (form.style.display === 'block') textarea?.focus();
  });

  submit?.addEventListener('click', async () => {
    if (!textarea) return;
    submit.disabled = true;
    const result = await sendFeedback(textarea.value);
    submit.disabled = false;
    if (status) status.textContent = FEEDBACK_STATUS[result.ok === true ? 'ok' : result.reason];
    if (result.ok) textarea.value = '';
  });
}
