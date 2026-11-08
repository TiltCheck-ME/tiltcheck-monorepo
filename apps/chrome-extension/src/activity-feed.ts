/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
/**
 * activity-feed.ts
 * Real-time guardrail and session event logger for TiltCheck.
 * Non-custodial: client-side telemetry with zero custody of player funds.
 */

export type ActivityEventType = 'info' | 'warn' | 'danger';

export interface ActivityEvent {
  msg: string;
  type?: ActivityEventType;
  ts: number;
}

export const ACTIVITY_FEED_STORAGE_KEY = 'activityFeed';
export const MAX_ACTIVITY_FEED_ITEMS = 50;

export async function recordActivityFeedEvent(
  msg: string,
  type: ActivityEventType = 'info',
): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }

  try {
    const data = await chrome.storage.local.get([ACTIVITY_FEED_STORAGE_KEY]);
    const list: ActivityEvent[] = Array.isArray(data[ACTIVITY_FEED_STORAGE_KEY])
      ? [...data[ACTIVITY_FEED_STORAGE_KEY]]
      : [];

    list.push({
      msg,
      type,
      ts: Date.now(),
    });

    const trimmed = list.slice(-MAX_ACTIVITY_FEED_ITEMS);
    await chrome.storage.local.set({ [ACTIVITY_FEED_STORAGE_KEY]: trimmed });
  } catch {
    // Storage access unavailable or isolated environment
  }
}

export async function getActivityFeed(): Promise<ActivityEvent[]> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return [];
  }

  try {
    const data = await chrome.storage.local.get([ACTIVITY_FEED_STORAGE_KEY]);
    return Array.isArray(data[ACTIVITY_FEED_STORAGE_KEY]) ? data[ACTIVITY_FEED_STORAGE_KEY] : [];
  } catch {
    return [];
  }
}

export async function clearActivityFeed(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }

  try {
    await chrome.storage.local.remove([ACTIVITY_FEED_STORAGE_KEY]);
  } catch {
    // Storage access unavailable
  }
}
