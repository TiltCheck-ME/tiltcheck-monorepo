// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// @vitest-environment jsdom
// End screen grammar, brag lines, the board (highlight, off-board personal best), and the guest board.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { renderTrivia } from '../src/client/views/trivia.js';
import { renderHighScores } from '../src/client/views/highScores.js';
import { winnerLine } from '../src/client/copy.js';
import { LocalTransport } from '../src/client/transport.js';
import type { Brag, BoardView } from '../src/shared/scores.js';

const ME = '100000001';
const BO = '100000002';
const CY = '100000003';

function overView(scores: Record<string, number>, posted: { brags: Record<string, Brag> | null } | null = { brags: {} }) {
  const room = new Room(createRoomState('i-ui'), makeRng(1));
  room.join({ id: ME, name: 'Jme', avatar: null }, 0);
  room.join({ id: BO, name: 'Bo', avatar: null }, 0);
  room.join({ id: CY, name: 'Cy', avatar: null }, 0);
  const t = room.state.trivia;
  t.phase = 'over';
  t.game = 1;
  t.scores = scores;
  if (posted) room.state.triviaPosted = { game: 1, brags: posted.brags };
  return room.viewFor(ME, 0);
}

function html(s: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = s;
  return d;
}

describe('end screen', () => {
  it('"You win." when the viewer wins, "<Name> wins." otherwise, ties tie', () => {
    const win = html(renderTrivia(overView({ [ME]: 809, [BO]: 300 }), 0));
    expect(win.querySelector('[data-trivia-winner]')!.textContent).toBe('You win.');
    expect(win.textContent).not.toContain('You wins');
    const lose = html(renderTrivia(overView({ [ME]: 100, [BO]: 300 }), 0));
    expect(lose.querySelector('[data-trivia-winner]')!.textContent).toBe('Bo wins.');
    const tie = html(renderTrivia(overView({ [ME]: 10, [BO]: 300, [CY]: 300 }), 0));
    expect(tie.querySelector('[data-trivia-winner]')!.textContent).toBe('Bo and Cy tie.');
    const tieMe = html(renderTrivia(overView({ [ME]: 300, [BO]: 300 }), 0));
    expect(tieMe.querySelector('[data-trivia-winner]')!.textContent).toBe('You and Bo tie.');
    expect(winnerLine(['A', 'B', 'C'])).toBe('A, B and C tie.');
  });

  it('brags: "#3 this week.", "New personal best.", pending and off the record', () => {
    const wk = html(renderTrivia(overView({ [ME]: 500 }, { brags: { [ME]: { personalBest: false, weekRank: 3, allTimeRank: null } } }), 0));
    expect(wk.querySelector('[data-brag]')!.textContent).toBe('#3 this week.');
    const pb = html(renderTrivia(overView({ [ME]: 809 }, { brags: { [ME]: { personalBest: true, weekRank: 1, allTimeRank: 1 } } }), 0));
    expect(pb.querySelector('[data-brag]')!.textContent).toBe('#1 all time. New personal best.');
    const pbOnly = html(renderTrivia(overView({ [ME]: 120 }, { brags: { [ME]: { personalBest: true, weekRank: null, allTimeRank: null } } }), 0));
    expect(pbOnly.querySelector('[data-brag]')!.textContent).toBe('New personal best.');
    const none = html(renderTrivia(overView({ [ME]: 120 }, { brags: {} }), 0));
    expect(none.querySelector('[data-brag]')).toBeNull();
    const pending = html(renderTrivia(overView({ [ME]: 120 }, null), 0));
    expect(pending.querySelector('[data-brag]')!.textContent).toContain('Saving score');
    const off = html(renderTrivia(overView({ [ME]: 120 }, { brags: null }), 0));
    expect(off.querySelector('[data-brag]')!.textContent).toContain("Games in DMs aren't recorded");
  });
});

describe('board', () => {
  const row = (id: string, name: string, score: number) => ({ id, name, avatar: null, score, at: 0 });
  const board = (over: Partial<BoardView>): BoardView => ({ ok: true, guild: '1', weekStart: 0, week: [], allTime: [], me: { week: null, allTime: null }, ...over });

  it('highlights the viewer row', () => {
    const el = html(renderHighScores({ kind: 'board', board: board({ week: [row(BO, 'Bo', 900), row(ME, 'Jme', 809)] }) }, 'week', ME));
    expect(el.querySelector('.score--me')!.getAttribute('data-hs-row')).toBe(ME);
    expect(el.querySelector('[data-hs-mine]')).toBeNull();
  });

  it('shows the viewer personal best when they are off the board, per tab', () => {
    const b = board({ week: [row(BO, 'Bo', 900)], allTime: [row(BO, 'Bo', 1200)], me: { week: { score: 300, rank: null }, allTime: { score: 809, rank: null } } });
    const wk = html(renderHighScores({ kind: 'board', board: b }, 'week', ME));
    expect(wk.querySelector('[data-hs-mine] .score__pts')!.textContent).toBe('300');
    const all = html(renderHighScores({ kind: 'board', board: b }, 'all', ME));
    expect(all.querySelector('[data-hs-mine] .score__pts')!.textContent).toBe('809');
    expect(all.textContent).toContain('Your best');
  });

  it('no server, loading and error states', () => {
    expect(html(renderHighScores({ kind: 'no-server' }, 'week', ME)).textContent).toContain("Games in DMs aren't recorded");
    expect(html(renderHighScores(null, 'week', ME)).textContent).toContain('Loading scores');
    expect(html(renderHighScores({ kind: 'error' }, 'week', ME)).textContent).toContain("didn't load");
  });

  it('guest mode keeps a board in the tab, fed only by a finished game', async () => {
    const t = new LocalTransport({ id: 'guest-jme', name: 'Jme', avatar: null }, 'local');
    await new Promise((r) => setTimeout(r, 10));
    expect((await t.highScores()).kind).toBe('board');
    const tv = t.room.state.trivia;
    tv.phase = 'over';
    tv.game = 1;
    tv.scores = { 'guest-jme': 809 };
    t.send({ t: 'ping' });
    await new Promise((r) => setTimeout(r, 20));
    const r = await t.highScores();
    expect(r.kind === 'board' && r.board.allTime.map((x) => [x.name, x.score])).toEqual([['Jme', 809]]);
    expect(r.kind === 'board' && r.guest).toBe(true);
    expect(t.room.viewFor('guest-jme', 0).trivia.me.brag).toEqual({ personalBest: true, weekRank: 1, allTimeRank: 1 });
    t.close();
  });
});

describe('phone question size', () => {
  it('trivia question text is ~15-20% smaller under 640px; choices untouched', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/client/styles.css'), 'utf8');
    const block = /@media \(max-width: 639px\) \{([^}]*\})\s*\}/.exec(css)?.[1] ?? '';
    expect(block).toContain('.trivia-panel .prompt');
    expect(block).toContain('font-size: clamp(15px, 3.8vw, 17px)');
    expect(block).not.toContain('.choice');
    // Shared prompt (DA&D) keeps its size and weight.
    expect(css).toMatch(/\.prompt \{[^}]*font-weight: 800;[^}]*font-size: clamp\(18px, 4\.6vw, 26px\)/);
  });
});
