/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import type { IntelBlock } from '@tiltcheck/intel-agent';

export interface IntelShareSnapshot {
  token: string;
  title: string;
  blocks: IntelBlock[];
  createdAt: string;
  expiresAt: string;
}

const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const store = new Map<string, IntelShareSnapshot>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [token, snapshot] of store.entries()) {
    if (Date.parse(snapshot.expiresAt) <= now) {
      store.delete(token);
    }
  }
}

export function saveIntelShareSnapshot(input: {
  token: string;
  title: string;
  blocks: IntelBlock[];
}): IntelShareSnapshot {
  pruneExpired();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SHARE_TTL_MS).toISOString();
  const snapshot: IntelShareSnapshot = {
    token: input.token,
    title: input.title,
    blocks: input.blocks,
    createdAt,
    expiresAt,
  };
  store.set(input.token, snapshot);
  return snapshot;
}

export function getIntelShareSnapshot(token: string): IntelShareSnapshot | null {
  pruneExpired();
  const snapshot = store.get(token);
  if (!snapshot) {
    return null;
  }
  if (Date.parse(snapshot.expiresAt) <= Date.now()) {
    store.delete(token);
    return null;
  }
  return snapshot;
}

export const INTEL_SHARE_TTL_MS = SHARE_TTL_MS;
