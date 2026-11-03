/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

export const FLAG_WINDOW_MS = 2 * 60 * 60 * 1000;
export const FLAG_THRESHOLD = 3;
export const MIN_ACCOUNT_AGE_DAYS = 7;
export const SERIAL_FLAG_DAY_CAP = 10;

export type PeerFlag = {
  flaggerId: string;
  linkedId: string;
  targetId: string;
  at: number;
};

export type PrivateFlagToast = {
  targetId: string;
  count: number;
  copy: string;
};

export class PeerFlagBoard {
  private flags: PeerFlag[] = [];
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  submit(input: {
    flaggerId: string;
    linkedId?: string;
    targetId: string;
    accountAgeDays: number;
    reputationOk: boolean;
  }): { ok: true; notify: PrivateFlagToast | null } | { ok: false; reason: string } {
    const now = this.now();
    if (input.flaggerId === input.targetId) return { ok: false, reason: 'not yourself' };
    if (input.accountAgeDays < MIN_ACCOUNT_AGE_DAYS || !input.reputationOk) {
      return { ok: false, reason: 'not established' };
    }
    const linkedId = input.linkedId ?? input.flaggerId;
    this.decay(now);
    const today = this.flags.filter((row) => row.linkedId === linkedId && now - row.at < 24 * 60 * 60 * 1000);
    if (today.length >= SERIAL_FLAG_DAY_CAP) return { ok: false, reason: 'serial ignored' };
    if (today.some((row) => row.targetId === input.targetId)) {
      return { ok: false, reason: 'one per day' };
    }
    this.flags.push({
      flaggerId: input.flaggerId,
      linkedId,
      targetId: input.targetId,
      at: now,
    });
    const windowed = this.uniqueFlaggers(input.targetId, now);
    if (windowed.length < FLAG_THRESHOLD) {
      return { ok: true, notify: null };
    }
    return {
      ok: true,
      notify: {
        targetId: input.targetId,
        count: windowed.length,
        copy: `Heads up: ${windowed.length} people in the lounge want you to take a breather. Not a pile-on, just love. 10-min timeout? Skip anytime.`,
      },
    };
  }

  publicCount(): never {
    throw new Error('flag counts are never public');
  }

  uniqueFlaggers(targetId: string, now = this.now()): string[] {
    const ids = new Set<string>();
    for (const row of this.flags) {
      if (row.targetId === targetId && now - row.at <= FLAG_WINDOW_MS) {
        ids.add(row.linkedId);
      }
    }
    return [...ids];
  }

  private decay(now: number): void {
    this.flags = this.flags.filter((row) => now - row.at <= FLAG_WINDOW_MS);
  }
}
