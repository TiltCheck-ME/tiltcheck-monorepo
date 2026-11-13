// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// @vitest-environment jsdom
// The visual pass: winner podium, gold/silver/bronze, avatar fallback, lobby tiles and art, motion rules.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { renderTrivia } from '../src/client/views/trivia.js';
import { renderHighScores } from '../src/client/views/highScores.js';
import { renderLobby } from '../src/client/views/lobby.js';
import { avatarImg, failedAvatars, placeOf, podium } from '../src/client/views/util.js';
import { COPY } from '../src/client/copy.js';
import type { BoardView } from '../src/shared/scores.js';

const ME = '100000001';
const BO = '100000002';
const CY = '100000003';
const DI = '100000004';
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../src/client/styles.css'), 'utf8');

function html(s: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = s;
  return d;
}

function roomView() {
  const room = new Room(createRoomState('i-look'), makeRng(1));
  for (const [id, name] of [[ME, 'Jme'], [BO, 'Bo'], [CY, 'Cy'], [DI, 'Di']] as const) room.join({ id, name, avatar: null }, 0);
  return room;
}

describe('winner podium', () => {
  it('top three in 2-1-3 order with gold, silver, bronze', () => {
    const view = roomView().viewFor(ME, 0);
    const el = html(podium(view, [{ id: ME, score: 400 }, { id: BO, score: 300 }, { id: CY, score: 200 }, { id: DI, score: 100 }]));
    const spots = [...el.querySelectorAll('.podium__spot')];
    expect(spots.map((s) => s.querySelector('.podium__name')!.textContent)).toEqual(['Bo', 'You', 'Cy']);
    expect(spots.map((s) => s.querySelector('.podium__place')!.textContent)).toEqual(['2', '1', '3']);
    expect(spots[1]!.classList.contains('medal--1')).toBe(true);
    expect(spots[0]!.classList.contains('medal--2')).toBe(true);
    expect(spots[2]!.classList.contains('medal--3')).toBe(true);
  });

  it('ties share a place; zero scores stay off the podium; nobody scored means no podium', () => {
    const view = roomView().viewFor(ME, 0);
    const tie = html(podium(view, [{ id: BO, score: 3 }, { id: ME, score: 3 }, { id: CY, score: 0 }]));
    expect([...tie.querySelectorAll('.podium__place')].map((x) => x.textContent)).toEqual(['1', '1']);
    expect(tie.querySelectorAll('.medal--1')).toHaveLength(2);
    expect(podium(view, [{ id: BO, score: 0 }])).toBe('');
    expect(placeOf(5, [9, 5, 5, 1])).toBe(2);
    expect(placeOf(1, [9, 5, 5, 1])).toBe(4);
  });

  it('trivia end screen shows the podium above the board; the winner line is unchanged', () => {
    const room = roomView();
    const t = room.state.trivia;
    t.phase = 'over';
    t.game = 1;
    t.scores = { [ME]: 450, [BO]: 300, [CY]: 120 };
    room.state.triviaPosted = { game: 1, brags: {} };
    const el = html(renderTrivia(room.viewFor(ME, 0), 0));
    expect(el.querySelector('[data-trivia-winner]')!.textContent).toBe('You take it. Bragging rights only.');
    expect(el.querySelector('[data-podium]')).not.toBeNull();
    const board = [...el.querySelectorAll('.scores .score')];
    expect(board[0]!.classList.contains('medal--1')).toBe(true);
    expect(board[2]!.classList.contains('medal--3')).toBe(true);
  });
});

describe('high-score board medals', () => {
  it('gold, silver and bronze on the top three rows only', () => {
    const rows = [1, 2, 3, 4].map((i) => ({ id: `10000000${i}`, name: `P${i}`, avatar: null, score: 1000 - i * 100, at: 0 }));
    const board: BoardView = { week: rows, allTime: rows, me: { week: null, allTime: null } } as unknown as BoardView;
    const el = html(renderHighScores({ kind: 'board', board }, 'week', ME));
    const li = [...el.querySelectorAll('[data-hs-row]')];
    expect(li.map((x) => ['medal--1', 'medal--2', 'medal--3'].find((c) => x.classList.contains(c)) ?? '')).toEqual(['medal--1', 'medal--2', 'medal--3', '']);
    expect(li.map((x) => x.querySelector('.score__rank')!.textContent)).toEqual(['1', '2', '3', '4']);
  });
});

describe('avatars', () => {
  it('initial drawn by CSS (no text node), picture on top, and no picture once it has failed', () => {
    const u = { id: '200000009', name: 'zed', avatar: null };
    const el = html(avatarImg(u));
    const span = el.querySelector('.avatar')!;
    expect(span.getAttribute('data-initial')).toBe('Z');
    expect(span.getAttribute('aria-label')).toBe('zed');
    expect(span.textContent).toBe('');
    const src = span.querySelector('img')!.getAttribute('src')!;
    failedAvatars.add(src);
    expect(html(avatarImg(u)).querySelector('img')).toBeNull();
    failedAvatars.delete(src);
  });
});

describe('lobby tiles', () => {
  it('each game has its art; DA&D carries its own logo; counts at 0 do not pulse', () => {
    const el = html(renderLobby(null, [{ id: ME, name: 'Jme', avatar: null }]));
    expect(el.querySelector('.tile--dad .tile__logo')).not.toBeNull();
    expect(el.querySelector('.tile--trivia svg')).not.toBeNull();
    expect(el.querySelector('.tile--bluff svg')).not.toBeNull();
    expect(el.querySelector('.hero__grass')).not.toBeNull();
    expect(el.querySelectorAll('.badge--on')).toHaveLength(0);
    // Art adds no text: the tile reads exactly as before.
    expect(el.querySelector('.tile--bluff .tile__name')!.textContent).toBe('Bluff');
    expect(el.querySelector('.tile--trivia .tile__art')!.textContent!.trim()).toBe('');
  });
});

describe('copy grammar on the end screens', () => {
  it('"You win" and "Your lie" when the viewer is the subject', () => {
    expect(COPY.dad.gameOver('You')).toBe('You win. Bragging rights only.');
    expect(COPY.dad.gameOver('Bo')).toBe('Bo wins. Bragging rights only.');
    expect(COPY.bluff.reveal('You')).toBe('Your lie');
    expect(COPY.bluff.reveal('Bo')).toBe("Bo's lie");
  });
});

describe('styles', () => {
  it('reduced motion switches every animation and transition off', () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(block).toContain('animation: none !important');
    expect(block).toContain('transition: none !important');
  });

  it('no remote assets: every url() in the stylesheet is a bundled local file', () => {
    const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1]!.replace(/['"]/g, ''));
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u.startsWith('./art/')).toBe(true);
    expect(css).not.toMatch(/@import|https?:\/\//);
  });

  it('gold, silver and bronze are defined', () => {
    expect(css).toMatch(/\.medal--1 \{ --medal: var\(--gold\)/);
    expect(css).toMatch(/\.medal--2 \{ --medal: var\(--silver\)/);
    expect(css).toMatch(/\.medal--3 \{ --medal: var\(--bronze\)/);
  });
});
