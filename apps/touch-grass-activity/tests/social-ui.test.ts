// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// @vitest-environment jsdom
// Hot Takes and Story Chain in the DOM: lobby tiles, vote buttons before a vote and the split after,
// the submit box, mod tools only for mods, story lines, the no-two-in-a-row note and the read-back sheet.
import { describe, expect, it } from 'vitest';
import { SocialBook, memorySocialStorage } from '../src/shared/social.js';
import { renderHotTakes, fmtLeft, type SocialFetch } from '../src/client/views/hotTakes.js';
import { emptyStoryUi, renderStory } from '../src/client/views/story.js';
import { renderLobby } from '../src/client/views/lobby.js';
import { COPY } from '../src/client/copy.js';

const NOW = Date.UTC(2026, 10, 13, 9);
const A = { id: '100000000000000001', name: 'Ana' };
const B = { id: '100000000000000002', name: 'Bo' };

function html(s: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = s;
  return d;
}

async function fetchFor(b: SocialBook, id: string, mod = false): Promise<SocialFetch> {
  return { kind: 'ok', view: await b.view(id, mod, NOW) };
}

describe('lobby', () => {
  it('shows Hot Takes and Story Chain next to the games', async () => {
    const b = new SocialBook(memorySocialStorage());
    const d = html(renderLobby(null, [], null, 'week', false, await fetchFor(b, A.id)));
    expect(d.querySelector('[data-go="hot"]')?.textContent).toContain(COPY.tiles.hot.name);
    expect(d.querySelector('[data-go="story"]')?.textContent).toContain(COPY.tiles.story.name);
    expect(d.querySelector('[data-count="hot"]')?.textContent).toBe(COPY.hot.badgeVote);
    expect(d.querySelector('[data-count="story"]')?.textContent).toBe('0/20 lines');
    // Still renders before the social data loads.
    expect(html(renderLobby(null, [])).querySelector('[data-go="hot"]')).not.toBeNull();
  });
});

describe('Hot Takes screen', () => {
  it('vote buttons and no split before voting; split and spice after', async () => {
    const b = new SocialBook(memorySocialStorage());
    const f = (await b.view(A.id, false, NOW)).hot.featured!;
    await b.act(B, false, { op: 'hot.vote', pollId: f.id, vote: 'disagree' }, NOW);
    const before = html(renderHotTakes(await fetchFor(b, A.id), '', NOW));
    expect(before.querySelectorAll('[data-hot-vote]')).toHaveLength(2);
    expect(before.querySelector('[data-split]')).toBeNull();
    expect(before.textContent).toContain(COPY.hot.hiddenUntilVote);
    await b.act(A, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, NOW);
    const after = html(renderHotTakes(await fetchFor(b, A.id), '', NOW));
    expect(after.querySelector('[data-hot-vote]')).toBeNull();
    expect(after.querySelector('[data-split]')?.textContent).toContain('50%');
    expect(after.querySelector('[data-spice]')?.getAttribute('data-spice')).toBe('100');
    expect(after.textContent).toContain('Ghost pepper');
    expect(after.querySelector('[data-hot-left]')?.textContent).toBe(COPY.hot.nextIn('7h 0m'));
  });

  it('mod tools only for mods; text is escaped', async () => {
    const b = new SocialBook(memorySocialStorage());
    await b.act(A, false, { op: 'hot.submit', text: '<img src=x onerror=alert(1)> is a hot take' }, NOW);
    const player = html(renderHotTakes(await fetchFor(b, B.id), '', NOW));
    expect(player.querySelector('[data-mod-hide]')).toBeNull();
    expect(player.querySelector('[data-mod-queue]')).toBeNull();
    const mod = html(renderHotTakes(await fetchFor(b, B.id, true), '', NOW));
    expect(mod.querySelector('[data-mod-queue] [data-mod-hide]')).not.toBeNull();
    expect(mod.querySelector('img')).toBeNull();
    expect(mod.querySelector('[data-mod-queue]')?.textContent).toContain('<img src=x');
  });

  it('submit box: counter, disabled when empty or out of takes', async () => {
    const b = new SocialBook(memorySocialStorage());
    const d = html(renderHotTakes(await fetchFor(b, A.id), 'hello', NOW));
    expect((d.querySelector('[data-hot-submit]') as HTMLButtonElement).disabled).toBe(false);
    expect(d.querySelector('[data-count-for="hot"]')?.textContent).toBe('5/200');
    expect((html(renderHotTakes(await fetchFor(b, A.id), '', NOW)).querySelector('[data-hot-submit]') as HTMLButtonElement).disabled).toBe(true);
    for (let i = 0; i < 3; i += 1) await b.act(A, false, { op: 'hot.submit', text: `t${i}` }, NOW);
    const out = html(renderHotTakes(await fetchFor(b, A.id), 'more', NOW));
    expect((out.querySelector('[data-hot-submit]') as HTMLButtonElement).disabled).toBe(true);
    expect((out.querySelector('[data-sdraft="hot"]') as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('no-server and error states', () => {
    expect(html(renderHotTakes({ kind: 'no-server' }, '', NOW)).textContent).toContain(COPY.hot.noServer);
    expect(html(renderHotTakes({ kind: 'error' }, '', NOW)).textContent).toContain(COPY.hot.error);
  });

  it('fmtLeft', () => {
    expect(fmtLeft(30_000)).toBe('under a minute');
    expect(fmtLeft(12 * 60_000)).toBe('12m');
    expect(fmtLeft(3 * 3_600_000 + 5 * 60_000)).toBe('3h 5m');
  });
});

describe('Story Chain screen', () => {
  it('shows the opener and lines, then the wait note for the last writer', async () => {
    const b = new SocialBook(memorySocialStorage());
    const s = (await b.view(A.id, false, NOW)).story;
    await b.act(A, false, { op: 'story.add', storyId: s.id, text: 'Ana goes first' }, NOW);
    const mine = html(renderStory(await fetchFor(b, A.id), emptyStoryUi()));
    expect(mine.querySelector('.story-opener')?.textContent).toBe(s.opener);
    expect(mine.querySelector('[data-story-lines]')?.textContent).toContain('Ana goes first');
    expect(mine.querySelector('[data-story-wait]')).not.toBeNull();
    expect(mine.querySelector('[data-story-add]')).toBeNull();
    const theirs = html(renderStory(await fetchFor(b, B.id), { ...emptyStoryUi(), draft: 'next' }));
    expect(theirs.querySelector('[data-story-add]')).not.toBeNull();
    expect(theirs.querySelector('.story-line__by')?.textContent).toBe('Ana');
  });

  it('only the latest 8 lines until "show all"', async () => {
    const b = new SocialBook(memorySocialStorage());
    const s = (await b.view(A.id, false, NOW)).story;
    for (let i = 0; i < 10; i += 1) await b.act(i % 2 ? B : A, false, { op: 'story.add', storyId: s.id, text: `line ${i}` }, NOW);
    const f = await fetchFor(b, A.id);
    expect(html(renderStory(f, emptyStoryUi())).querySelectorAll('[data-line]')).toHaveLength(8);
    expect(html(renderStory(f, { ...emptyStoryUi(), showAll: true })).querySelectorAll('[data-line]')).toHaveLength(10);
  });

  it('finished stories open in the read-back sheet; mods get End story', async () => {
    const b = new SocialBook(memorySocialStorage(), { storyMax: 5 });
    let s = (await b.view(A.id, false, NOW)).story;
    for (let i = 0; i < 5; i += 1) await b.act(i % 2 ? B : A, false, { op: 'story.add', storyId: s.id, text: `bit ${i}` }, NOW);
    const f = await fetchFor(b, A.id);
    const v = f.kind === 'ok' ? f.view : null;
    const past = v!.storyArchive[0]!;
    const list = html(renderStory(f, emptyStoryUi()));
    expect(list.querySelector(`[data-story-read="${past.id}"]`)).not.toBeNull();
    expect(list.querySelector('[data-mod-end]')).toBeNull();
    const sheet = html(renderStory(f, { ...emptyStoryUi(), reading: past.id }));
    expect(sheet.querySelector('[data-story-sheet]')?.textContent).toContain('bit 4');
    expect(sheet.querySelector('[data-story-sheet] [role="dialog"]')).not.toBeNull();
    s = (await b.view(A.id, true, NOW)).story;
    expect(html(renderStory(await fetchFor(b, A.id, true), emptyStoryUi())).querySelector(`[data-mod-end="${s.id}"]`)).not.toBeNull();
  });
});
