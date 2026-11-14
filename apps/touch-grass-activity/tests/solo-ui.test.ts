// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// @vitest-environment jsdom
// Solo games and the invite button in the DOM: lobby tiles and pills, Daily Grass board and keyboard
// labels, Myth or Math screens, and "Invite friends" calling the Discord SDK.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { renderLobby } from '../src/client/views/lobby.js';
import { dailyShare, keyColors, renderDaily } from '../src/client/views/daily.js';
import { renderMyth } from '../src/client/views/myth.js';
import { renderDad } from '../src/client/views/dad.js';
import { renderBluff, emptyDraft } from '../src/client/views/bluff.js';
import { renderTrivia } from '../src/client/views/trivia.js';
import { canInvite, inviteButton, openInvite, setInviteSdk } from '../src/client/views/invite.js';
import { COPY } from '../src/client/copy.js';
import type { DailyPublic, Tile } from '../src/shared/daily.js';

const ME = '100000001';
const BO = '100000002';
const NOW = Date.UTC(2026, 10, 12, 18);

function html(s: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = s;
  return d;
}

function room() {
  const r = new Room(createRoomState('i-1-gc-123456789-987654321'), makeRng(5));
  r.state.guildId = '123456789';
  r.join({ id: ME, name: 'Jme', avatar: null }, NOW);
  r.join({ id: BO, name: 'Bo', avatar: null }, NOW);
  return r;
}

const board = (over: Partial<DailyPublic> = {}): DailyPublic => ({
  day: '2026-11-12',
  dayNumber: 20769,
  rows: [{ word: 'crane', colors: ['b', 'y', 'g', 'b', 'b'] }],
  status: 'playing',
  answer: null,
  startedAt: NOW,
  finishedAt: null,
  hint: null,
  stats: { played: 0, wins: 0, current: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], lastWinDay: null, lastPlayedDay: null },
  ...over,
});

afterEach(() => setInviteSdk(null));

describe('lobby: solo tiles', () => {
  it('Daily Grass and Myth or Math tiles with art and a solo pill counting players', () => {
    const r = room();
    r.handle(BO, { t: 'look', at: 'daily' }, NOW);
    r.handle(ME, { t: 'myth.start' }, NOW);
    const el = html(renderLobby(r.viewFor(ME, NOW), []));
    expect(el.querySelector('.tile--daily svg')).not.toBeNull();
    expect(el.querySelector('.tile--myth svg')).not.toBeNull();
    expect(el.querySelector('[data-count=daily]')!.textContent).toBe('Solo · 1 playing');
    expect(el.querySelector('[data-count=myth]')!.textContent).toBe('Solo · 1 playing');
    expect(el.querySelector('.tile--daily .tile__art')!.textContent!.trim()).toBe('');
    // Header copy, the Touch Grass eyebrow and the flag mark.
    expect(el.querySelector('.lobby-head .title')!.textContent).toBe('TiltCheck');
    expect(el.querySelector('.lobby-head .lede')!.textContent).toBe('Get distracted on purpose.');
    expect(el.querySelector('.lobby-head .brand__eyebrow')!.textContent).toBe('Touch Grass');
    expect(el.querySelector('.brand__mark')).not.toBeNull();
  });
});

describe('Daily Grass view', () => {
  it('board and keyboard carry screen-reader labels; typed letters show in the open row', () => {
    const r = room();
    r.setDaily(ME, board());
    const el = html(renderDaily(r.viewFor(ME, NOW), 'pi', false));
    const first = el.querySelectorAll('[data-dg-row="0"] .dg-tile');
    expect([...first].map((t) => t.getAttribute('aria-label'))).toEqual(['C, not in the word', 'R, wrong spot', 'A, right spot', 'N, not in the word', 'E, not in the word']);
    expect(el.querySelector('[data-dg-row="1"]')!.textContent).toBe('PI');
    expect(el.querySelector('[data-dg-key="a"]')!.getAttribute('aria-label')).toBe('A, right spot');
    expect(el.querySelector('[data-dg-key="r"]')!.getAttribute('aria-label')).toBe('R, wrong spot');
    expect(el.querySelector('[data-dg-key="z"]')!.getAttribute('aria-label')).toBe('Z');
    expect(el.querySelector('[data-dg-key="enter"]')!.getAttribute('aria-label')).toBe('Enter');
    expect(el.querySelector('[data-dg-key="back"]')!.getAttribute('aria-label')).toBe('Delete');
    expect(el.querySelectorAll('[data-dg-key]')).toHaveLength(28);
    expect(el.querySelector('[data-dg-grid]')!.getAttribute('role')).toBe('grid');
    expect(el.querySelector('.bar__meta')!.textContent).toBe('#1');
  });

  it('key colors keep the best result per letter', () => {
    expect(keyColors([{ word: 'eerie', colors: ['b', 'b', 'y', 'b', 'g'] }])).toEqual({ e: 'g', r: 'y', i: 'b' });
  });

  it('friends show rows used and solved, never letters; the end screen shows stats and the answer only when lost', () => {
    const r = room();
    r.setDaily(BO, board({ rows: [{ word: 'crane', colors: ['b', 'b', 'b', 'b', 'b'] }, { word: 'tribe', colors: ['g', 'g', 'g', 'g', 'g'] }], status: 'won', finishedAt: NOW }));
    r.setDaily(ME, board({ rows: Array.from({ length: 6 }, () => ({ word: 'pilot', colors: ['b', 'b', 'b', 'b', 'b'] as Tile[] })), status: 'lost', answer: 'quilt', finishedAt: NOW, stats: { played: 1, wins: 0, current: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], lastWinDay: null, lastPlayedDay: 20769 } }));
    const el = html(renderDaily(r.viewFor(ME, NOW), '', false));
    const friend = el.querySelector(`[data-dg-friend="${BO}"]`)!;
    expect(friend.textContent).toContain(COPY.daily.solved);
    expect(friend.textContent).not.toMatch(/crane|tribe/i);
    expect(el.querySelector('[data-dg-result]')!.textContent).toBe('Out of guesses. The word was QUILT.');
    expect(el.querySelector('[data-dg-stats]')).not.toBeNull();
    expect(el.querySelector('[data-dg-share]')).not.toBeNull();
    expect(el.querySelector('[data-dg-key]')).toBeNull();
  });
});

describe('Daily Grass view: hint', () => {
  it('before the 3rd guess the Hint button is disabled with the unlock line', () => {
    const r = room();
    r.setDaily(ME, board());
    const el = html(renderDaily(r.viewFor(ME, NOW), '', false));
    const btn = el.querySelector<HTMLButtonElement>('[data-dg-hint]')!;
    expect(btn.disabled).toBe(true);
    expect(el.querySelector('[data-dg-hintbar]')!.textContent).toContain(COPY.daily.hintLocked);
    expect(el.querySelector('[data-dg-marks]')).toBeNull();
  });

  it('after 3 guesses it is live; once used, a marker sits over its column, its key gets a ring, the button is gone', () => {
    const rows = [
      { word: 'crane', colors: ['b', 'y', 'g', 'b', 'b'] as Tile[] },
      { word: 'pilot', colors: ['b', 'b', 'b', 'b', 'b'] as Tile[] },
      { word: 'dumpy', colors: ['b', 'b', 'b', 'b', 'b'] as Tile[] },
    ];
    const r = room();
    r.setDaily(ME, board({ rows }));
    const ready = html(renderDaily(r.viewFor(ME, NOW), '', false));
    expect(ready.querySelector<HTMLButtonElement>('[data-dg-hint]')!.disabled).toBe(false);
    expect(ready.querySelector('[data-dg-hintbar]')!.textContent).toContain(COPY.daily.hintReady);

    r.setDaily(ME, board({ rows, hint: { pos: 0, letter: 'h' } }));
    const used = html(renderDaily(r.viewFor(ME, NOW), '', false));
    expect(used.querySelector('[data-dg-hint]')).toBeNull();
    const marks = used.querySelectorAll('[data-dg-marks] .dg-mark');
    expect(marks).toHaveLength(5);
    expect(used.querySelector('[data-dg-mark="0"]')!.textContent).toBe('H');
    expect(used.querySelector('[data-dg-mark="0"]')!.getAttribute('aria-label')).toBe('Hint, spot 1: H');
    expect([...marks].slice(1).every((m) => m.textContent === '')).toBe(true);
    expect(used.querySelector('[data-dg-key="h"]')!.className).toContain('dg-key--hint');
    expect(used.querySelector('[data-dg-key="h"]')!.getAttribute('aria-label')).toBe('H, Hint');
    expect(used.querySelector('[data-dg-hint-used]')!.textContent).toContain('Hint: spot 1 is H.');
    // The board still has six guess rows under the marker.
    expect(used.querySelectorAll('[data-dg-row]')).toHaveLength(6);
  });

  it("Today's solvers show a bulb for hinted solves, no letter; Copy result adds the bulb", () => {
    const r = room();
    r.setSolvers({
      day: '2026-11-12',
      rows: [
        { id: BO, name: 'Bo', avatar: null, guesses: 3, ms: 60_000, at: NOW },
        { id: ME, name: 'Jme', avatar: null, guesses: 4, ms: 90_000, at: NOW, hint: true },
      ],
    });
    r.setDaily(
      ME,
      board({
        rows: [
          { word: 'crane', colors: ['b', 'b', 'b', 'b', 'b'] },
          { word: 'pilot', colors: ['b', 'b', 'b', 'b', 'b'] },
          { word: 'dumpy', colors: ['b', 'b', 'b', 'b', 'b'] },
          { word: 'shush', colors: ['g', 'g', 'g', 'g', 'g'] },
        ],
        status: 'won',
        finishedAt: NOW,
        hint: { pos: 0, letter: 's' },
      }),
    );
    const v = r.viewFor(ME, NOW);
    const el = html(renderDaily(v, '', false));
    expect(el.querySelector(`[data-dg-solver="${BO}"] [data-dg-hinted]`)).toBeNull();
    const mine = el.querySelector(`[data-dg-solver="${ME}"] [data-dg-hinted]`)!;
    expect(mine.getAttribute('aria-label')).toBe(COPY.daily.hintedSolve);
    expect(el.querySelector('[data-dg-solvers]')!.textContent).not.toMatch(/\bS\b/);
    const text = dailyShare(v)!;
    expect(text.split('\n')[0]).toMatch(/4\/6 \u{1F4A1}$/u);
    expect(text).not.toMatch(/shush|crane/i);
  });
});

describe('Myth or Math view', () => {
  it('start, card (two labelled calls, clock), reveal (stamp + why) and end screens', () => {
    const r = room();
    expect(html(renderMyth(r.viewFor(ME, NOW), 0, false)).querySelector('[data-act="myth.start"]')).not.toBeNull();
    r.handle(ME, { t: 'myth.start' }, NOW);
    const card = html(renderMyth(r.viewFor(ME, NOW), 0, false));
    expect(card.querySelector('[data-mm-card]')!.textContent!.length).toBeGreaterThan(10);
    expect(card.querySelector('[data-mpick="false"]')!.getAttribute('aria-label')).toBe(COPY.myth.mythLabel);
    expect(card.querySelector('[data-mpick="true"]')!.getAttribute('aria-label')).toBe(COPY.myth.mathLabel);
    expect(card.querySelector('[data-myth-clock]')).not.toBeNull();
    const run = r.state.myth!.runs[ME]!;
    r.handle(ME, { t: 'myth.answer', rid: run.runId, cid: run.ids[0]!, pick: true }, NOW + 10);
    const rev = html(renderMyth(r.viewFor(ME, NOW), 0, false));
    expect(['MYTH', 'MATH']).toContain(rev.querySelector('[data-mm-stamp]')!.textContent);
    expect(rev.querySelector('[data-mm-why]')!.textContent!.length).toBeGreaterThan(10);
    run.phase = 'over';
    run.board = 'off-record';
    const end = html(renderMyth(r.viewFor(ME, NOW), 0, false));
    expect(end.querySelector('[data-mm-title]')!.textContent).toMatch(/points$/);
    expect(end.querySelector('[data-mm-brag]')!.textContent).toBe(COPY.highScores.noServer);
  });
});

describe('Invite friends', () => {
  it('hidden without the Discord SDK (guest mode), shown with it', () => {
    setInviteSdk(null);
    expect(canInvite()).toBe(false);
    expect(inviteButton()).toBe('');
    expect(html(renderLobby(room().viewFor(ME, NOW), [])).querySelector('[data-invite]')).toBeNull();
    setInviteSdk({ commands: {} });
    expect(canInvite()).toBe(false);
    setInviteSdk({ commands: { openInviteDialog: async () => null } });
    expect(canInvite()).toBe(true);
    expect(html(renderLobby(room().viewFor(ME, NOW), [])).querySelector('.lobby-head [data-invite]')!.textContent).toBe(COPY.invite);
  });

  it('in the lobby header and on every multiplayer seating screen and in-game', () => {
    setInviteSdk({ commands: { openInviteDialog: async () => null } });
    const r = room();
    const v = () => r.viewFor(ME, NOW);
    expect(html(renderDad(v(), 5)).querySelector('[data-invite]')).not.toBeNull();
    expect(html(renderBluff(v(), emptyDraft(), 0)).querySelector('[data-invite]')).not.toBeNull();
    expect(html(renderTrivia(v(), 0)).querySelector('[data-invite]')).not.toBeNull();
    // In game: DA&D with a third player seated and started.
    r.join({ id: '100000003', name: 'Cy', avatar: null }, NOW);
    for (const id of [ME, BO, '100000003']) r.handle(id, { t: 'dad.sit' }, NOW + 1_000);
    r.handle(ME, { t: 'dad.start' }, NOW + 2_000);
    expect(html(renderDad(v(), 5)).querySelector('.dad-side [data-invite]')).not.toBeNull();
    r.handle(ME, { t: 'trivia.start' }, NOW + 3_000);
    expect(html(renderTrivia(v(), 0)).querySelector('aside [data-invite]')).not.toBeNull();
    for (const id of [ME, BO, '100000003']) r.handle(id, { t: 'bluff.sit' }, NOW + 4_000);
    r.handle(ME, { t: 'bluff.start' }, NOW + 5_000);
    expect(html(renderBluff(v(), emptyDraft(), 0)).querySelector('.dad-side [data-invite]')).not.toBeNull();
  });

  it('clicking it calls sdk.commands.openInviteDialog; an error becomes a short toast', async () => {
    const openInviteDialog = vi.fn(async () => null);
    setInviteSdk({ commands: { openInviteDialog } });
    const toast = vi.fn();
    const el = html(renderLobby(room().viewFor(ME, NOW), []));
    document.body.appendChild(el);
    el.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-invite]')) void openInvite(toast);
    });
    el.querySelector<HTMLButtonElement>('[data-invite]')!.click();
    await Promise.resolve();
    expect(openInviteDialog).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();

    setInviteSdk({ commands: { openInviteDialog: vi.fn(async () => Promise.reject(new Error('nope'))) } });
    await openInvite(toast);
    expect(toast).toHaveBeenCalledWith(COPY.inviteFailed);
    el.remove();
  });
});
