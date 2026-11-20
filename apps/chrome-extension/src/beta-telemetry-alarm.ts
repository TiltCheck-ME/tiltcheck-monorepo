/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 */

/**
 * beta-telemetry-alarm.ts
 * Daily background attempt to send opt-in beta counts from the MV3 service worker.
 *
 * Bundled to dist/beta-telemetry-alarm.js and loaded by background.js with
 * importScripts(). It only calls flushBetaTelemetry(), so every existing rule
 * applies unchanged: no network call unless the user opted in and the build
 * flag and endpoint are set, never an empty batch, at most one send per 24h
 * (shared with the popup through the last-sent timestamp and a Web Lock),
 * 1h-doubling-to-24h backoff, and 400 drops the batch.
 */

import { flushBetaTelemetry, type BetaFlushResult } from './beta-telemetry.js';

export const BETA_FLUSH_ALARM_NAME = 'tiltcheck_beta_counts_flush';
export const BETA_FLUSH_ALARM_PERIOD_MINUTES = 1440;

function alarmsApi(): typeof chrome.alarms | null {
  try {
    return typeof chrome !== 'undefined' && chrome?.alarms?.create ? chrome.alarms : null;
  } catch {
    return null;
  }
}

/**
 * Create the daily alarm only if it does not exist yet. Re-creating it on every
 * service-worker wake would reset its timer, so it might never fire.
 */
export async function ensureBetaFlushAlarm(): Promise<void> {
  const alarms = alarmsApi();
  if (!alarms) return;
  try {
    const existing = await alarms.get(BETA_FLUSH_ALARM_NAME);
    if (existing && existing.periodInMinutes === BETA_FLUSH_ALARM_PERIOD_MINUTES) return;
    await alarms.create(BETA_FLUSH_ALARM_NAME, {
      delayInMinutes: BETA_FLUSH_ALARM_PERIOD_MINUTES,
      periodInMinutes: BETA_FLUSH_ALARM_PERIOD_MINUTES,
    });
  } catch {
    /* alarms unavailable: the popup still flushes when opened */
  }
}

export async function runBetaFlush(): Promise<BetaFlushResult> {
  try {
    return await flushBetaTelemetry();
  } catch {
    return 'failed';
  }
}

let initialized = false;

/** Register the alarm and listeners once per service-worker instance. */
export function initBetaTelemetryAlarm(): void {
  if (initialized) return;
  if (typeof chrome === 'undefined') return;
  initialized = true;

  try {
    chrome.alarms?.onAlarm?.addListener?.((alarm) => {
      if (alarm?.name === BETA_FLUSH_ALARM_NAME) void runBetaFlush();
    });
  } catch {
    /* ignore */
  }

  try {
    chrome.runtime?.onStartup?.addListener?.(() => {
      void ensureBetaFlushAlarm();
      void runBetaFlush();
    });
  } catch {
    /* ignore */
  }

  try {
    chrome.runtime?.onInstalled?.addListener?.(() => {
      void ensureBetaFlushAlarm();
    });
  } catch {
    /* ignore */
  }

  void ensureBetaFlushAlarm();
}

/** Test-only reset. */
export function __resetBetaTelemetryAlarmForTests(): void {
  initialized = false;
}
