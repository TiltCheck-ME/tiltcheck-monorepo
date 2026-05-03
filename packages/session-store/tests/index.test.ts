/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import { describe, expect, it } from 'vitest';
import { createMemorySessionStore } from '../src/index.js';

describe('@tiltcheck/session-store', () => {
  it('creates, reads, refreshes, and destroys memory sessions', async () => {
    const store = createMemorySessionStore({ ttlMs: 50 });

    const created = await store.create('user-123', { role: 'user' });
    expect(created.userId).toBe('user-123');
    expect(created.data).toEqual({ role: 'user' });

    const fetched = await store.get(created.id);
    expect(fetched?.id).toBe(created.id);

    const refreshed = await store.refresh(created.id);
    expect(refreshed).not.toBeNull();
    expect(refreshed!.expiresAt.getTime()).toBeGreaterThanOrEqual(created.expiresAt.getTime());

    await store.destroy(created.id);
    await expect(store.get(created.id)).resolves.toBeNull();
  });
});
