// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Group Touch Grass break. One shared countdown per Activity instance.
// Opt-in: someone picks a length and starts it. Bailing early is allowed and gets roasted.

export const BREAK_MINUTES = [5, 10, 15] as const;
export type BreakMinutes = (typeof BREAK_MINUTES)[number];

export type BreakPhase = 'idle' | 'running' | 'done';

export interface BreakCrewMember {
  joinedAt: number;
  bailedAt: number | null;
  left: boolean;
}

export interface BreakState {
  phase: BreakPhase;
  minutes: BreakMinutes | null;
  startedBy: string | null;
  startedAt: number | null;
  endsAt: number | null;
  endedAt: number | null;
  crew: Record<string, BreakCrewMember>;
}

export type BreakResult = { ok: true } | { ok: false; code: string; message: string };

const ok: BreakResult = { ok: true };
const fail = (code: string, message: string): BreakResult => ({ ok: false, code, message });

export function createBreak(): BreakState {
  return { phase: 'idle', minutes: null, startedBy: null, startedAt: null, endsAt: null, endedAt: null, crew: {} };
}

export function isBreakMinutes(n: unknown): n is BreakMinutes {
  return typeof n === 'number' && (BREAK_MINUTES as readonly number[]).includes(n);
}

export function startBreak(s: BreakState, by: string, minutes: unknown, now: number, presentIds: readonly string[]): BreakResult {
  if (s.phase === 'running') return fail('already-running', 'A break is already running.');
  if (!isBreakMinutes(minutes)) return fail('bad-minutes', 'Pick 5, 10 or 15 minutes.');
  const crew: Record<string, BreakCrewMember> = {};
  for (const id of new Set([by, ...presentIds])) crew[id] = { joinedAt: now, bailedAt: null, left: false };
  Object.assign(s, {
    phase: 'running',
    minutes,
    startedBy: by,
    startedAt: now,
    endsAt: now + minutes * 60_000,
    endedAt: null,
    crew,
  } satisfies BreakState);
  return ok;
}

/** Someone opened the Activity mid-break. They are in it from now. */
export function joinBreak(s: BreakState, id: string, now: number): void {
  if (s.phase !== 'running' || s.crew[id]) return;
  s.crew[id] = { joinedAt: now, bailedAt: null, left: false };
}

export function bail(s: BreakState, id: string, now: number): BreakResult {
  if (s.phase !== 'running') return fail('not-running', 'No break running.');
  const m = s.crew[id];
  if (!m) return fail('not-in-break', 'You are not in this break.');
  if (m.bailedAt !== null) return fail('already-bailed', 'You already bailed. It is on the record.');
  m.bailedAt = now;
  maybeAllOut(s, now);
  return ok;
}

/** Left the Activity during a break: counts as a bail. */
export function leaveBreak(s: BreakState, id: string, now: number): void {
  const m = s.crew[id];
  if (s.phase !== 'running' || !m || m.bailedAt !== null) return;
  m.bailedAt = now;
  m.left = true;
  maybeAllOut(s, now);
}

function maybeAllOut(s: BreakState, now: number): void {
  if (Object.values(s.crew).every((m) => m.bailedAt !== null)) {
    s.phase = 'done';
    s.endedAt = now;
  }
}

/** Returns true when the break just finished. */
export function tickBreak(s: BreakState, now: number): boolean {
  if (s.phase === 'running' && s.endsAt !== null && now >= s.endsAt) {
    s.phase = 'done';
    s.endedAt = s.endsAt;
    return true;
  }
  return false;
}

export function resetBreak(s: BreakState): BreakResult {
  if (s.phase === 'running') return fail('still-running', 'Break is still running.');
  Object.assign(s, createBreak());
  return ok;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export interface BreakSummary {
  minutes: BreakMinutes | null;
  stuck: string[];
  bailed: Array<{ id: string; at: string; atMs: number; left: boolean }>;
}

export function summarizeBreak(s: BreakState): BreakSummary {
  const stuck: string[] = [];
  const bailed: BreakSummary['bailed'] = [];
  for (const [id, m] of Object.entries(s.crew)) {
    if (m.bailedAt === null) stuck.push(id);
    else {
      const atMs = m.bailedAt - (s.startedAt ?? m.joinedAt);
      bailed.push({ id, at: formatClock(atMs), atMs, left: m.left });
    }
  }
  bailed.sort((a, b) => a.atMs - b.atMs);
  return { minutes: s.minutes, stuck, bailed };
}
