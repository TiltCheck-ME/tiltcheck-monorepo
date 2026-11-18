/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * Buddy privacy: nothing buddy-facing can carry an amount, balance, score, wallet, game or site.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { toBuddySafeEvent } from '../../src/decoupled-sidebar.js';

const src = (f: string) => readFileSync(path.resolve(__dirname, '../../src', f), 'utf8');

describe('buddy-facing payloads', () => {
  it('toBuddySafeEvent keeps only the event kind', () => {
    expect(toBuddySafeEvent('phone_friend_discord')).toEqual({ type: 'phone_friend_discord' });
    expect(toBuddySafeEvent('stop_loss_triggered $500')).toEqual({ type: 'stop_loss_triggered500' });
    expect(Object.keys(toBuddySafeEvent('x'))).toEqual(['type']);
  });

  it('pro bootstrap passes no data to notifySupportIntervention / notifyBuddy', () => {
    const s = src('pro-monolith-bootstrap.ts');
    const calls = s.match(/notifySupportIntervention\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(3);
    for (const c of calls) {
      if (c.startsWith('notifySupportIntervention(type: string')) continue; // the definition
      expect(c).toMatch(/^notifySupportIntervention\((intervention\.type|'[a-z_]+')\)$/);
    }
    expect(s).toMatch(/notifyBuddy\('intervention', toBuddySafeEvent\(type\)\)/);
    expect(s).not.toMatch(/notifyBuddy\([^)]*(balance|initialBalance|peakBalance|risk|wallet)/i);
  });
});
