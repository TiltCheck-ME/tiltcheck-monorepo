// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
/**
 * Sliding-window counter for email-ingest parse failures. Triggers
 * ALERT_RULES.EMAIL_INGEST_SUSTAINED_PARSE_FAILURES when the threshold is hit.
 *
 * In-process only (resets on deploy). Pair with log/metrics scraping for HA.
 */

import { ALERT_RULES, resetAlertCooldown, triggerAlert } from '@tiltcheck/monitoring';

const failureTimestamps: number[] = [];

function getWindowMs(): number {
  const raw = process.env.EMAIL_INGEST_PARSE_FAILURE_WINDOW_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 600_000;
  return Number.isFinite(n) && n > 0 ? n : 600_000;
}

function getThreshold(): number {
  const raw = process.env.EMAIL_INGEST_PARSE_FAILURE_ALERT_THRESHOLD?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 5;
  return Number.isFinite(n) && n >= 2 ? n : 5;
}

function prune(now: number): void {
  const windowMs = getWindowMs();
  while (failureTimestamps.length > 0 && now - (failureTimestamps[0] ?? 0) > windowMs) {
    failureTimestamps.shift();
  }
}

/**
 * Record a parse failure and fire a cooled-down alert if the window is saturated.
 */
export async function recordEmailIngestParseFailure(context: Record<string, unknown>): Promise<void> {
  const now = Date.now();
  prune(now);
  failureTimestamps.push(now);

  const threshold = getThreshold();
  if (failureTimestamps.length < threshold) return;

  await triggerAlert(ALERT_RULES.EMAIL_INGEST_SUSTAINED_PARSE_FAILURES, {
    service: 'api',
    route: '/rgaas/email-ingest',
    failureCount: failureTimestamps.length,
    windowMs: getWindowMs(),
    threshold,
    ...context,
  });
}

export function resetEmailIngestParseHealthForTests(): void {
  failureTimestamps.length = 0;
  resetAlertCooldown(ALERT_RULES.EMAIL_INGEST_SUSTAINED_PARSE_FAILURES.id);
}
