// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// @vitest-environment jsdom
// Guest-mode smoke test of the real client in jsdom: lobby -> DA&D with bots -> trivia -> Bluff.
import { beforeAll, describe, expect, it } from 'vitest';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel as string) as T | null;
const click = async (sel: string) => {
  const el = $<HTMLElement>(sel);
  if (!el) throw new Error(`missing ${sel}\n${document.body.innerHTML.slice(0, 600)}`);
  el.click();
  await sleep(20);
};

beforeAll(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState(null, '', '/?name=Jme');
  await import('../src/client/main.js');
  await sleep(50);
});

describe('client in guest mode (no frame_id)', () => {
  it('lobby shows the fake user, three table tiles with counts, two solo tiles, chess, Hot Takes and Story Chain, no break tile', () => {
    expect(document.body.textContent).toContain('Guest mode');
    expect(document.querySelectorAll('.person')).toHaveLength(1);
    expect($('.person__name')?.textContent).toBe('Jme');
    expect(document.querySelectorAll('.tile')).toHaveLength(8);
    expect($('.tile--hot .tile__name')?.textContent).toBe('Hot Takes');
    expect($('.tile--story .tile__name')?.textContent).toBe('Story Chain');
    expect($('.tile--chess .tile__name')?.textContent).toBe('Chess');
    expect($('[data-count=chess]')?.textContent).toBe('0 seated');
    expect($('[data-count=daily]')?.textContent).toBe('Solo');
    expect($('[data-count=myth]')?.textContent).toBe('Solo');
    expect($('.tile--bluff .tile__name')?.textContent).toBe('Bluff');
    expect($('[data-count=bluff]')?.textContent).toBe('0 seated');
    expect($('[data-count=dad]')?.textContent).toBe('0 seated');
    expect($('[data-count=trivia]')?.textContent).toBe('0 playing');
    const trivia = $<HTMLButtonElement>('.tile--trivia')!;
    expect(trivia.disabled).toBe(false);
    expect(document.body.textContent).not.toMatch(/break|soon/i);
    expect($('.lobby-head .title')?.textContent).toBe('TiltCheck');
    expect(document.body.textContent).toContain('Get distracted on purpose.');
    // Touch Grass is back only as the small eyebrow over the title.
    expect($('.brand__eyebrow')?.textContent).toBe('Touch Grass');
    expect(document.body.textContent?.match(/Touch Grass/g)).toHaveLength(1);
    // Guest mode: no Discord SDK, so no invite button anywhere.
    expect($('[data-invite]')).toBeNull();
  });

  it('no High scores card in the lobby; the header Scores button opens a sheet with This week / All time tabs', async () => {
    await sleep(30);
    expect($('[data-high-scores]')).toBeNull();
    expect($('.lobby-head [data-scores-open]')?.textContent).toBe('Scores');
    await click('[data-scores-open]');
    const hs = $('[data-scores-sheet] [data-high-scores]')!;
    expect($('[data-scores-sheet] [role=dialog]')?.getAttribute('aria-modal')).toBe('true');
    // The sheet says what the scores are: trivia only.
    expect($('[data-scores-sheet] .sheet__title')?.textContent).toBe('Trivia high scores');
    expect($('[data-scores-sheet] .sheet__scope')?.textContent).toContain('Trivia games only');
    expect($('[data-scores-open]')?.getAttribute('aria-label')).toBe('Trivia high scores');
    expect(document.activeElement?.hasAttribute('data-scores-close')).toBe(true);
    expect([...hs.querySelectorAll('[data-scores-tab]')].map((x) => x.textContent)).toEqual(['This week', 'All time']);
    expect($('[data-scores-tab=week]')!.getAttribute('aria-selected')).toBe('true');
    expect(hs.textContent).toContain('No scores yet');
    expect(hs.textContent).toContain('No money, just bragging rights.');
    await click('[data-scores-tab=all]');
    expect($('[data-scores-tab=all]')!.getAttribute('aria-selected')).toBe('true');
    await click('[data-scores-tab=week]');
    // Close: the button, Escape and the backdrop all close it; focus goes back to Scores.
    await click('[data-scores-sheet] .btn[data-scores-close]');
    expect($('[data-scores-sheet]')).toBeNull();
    expect(document.activeElement?.hasAttribute('data-scores-open')).toBe(true);
    await click('[data-scores-open]');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(20);
    expect($('[data-scores-sheet]')).toBeNull();
    await click('[data-scores-open]');
    await click('.sheet__backdrop');
    expect($('[data-scores-sheet]')).toBeNull();
    // "Bragging rights" appears in one place only: the sheet footer.
    expect(document.body.textContent).not.toMatch(/bragging/i);
  });

  it('plays DA&D against bots until someone wins', async () => {
    await click('[data-go=dad]');
    await click('[data-act="dad.sit"]');
    await click('[data-bot=add]');
    await click('[data-bot=add]');
    const sel = $<HTMLSelectElement>('[data-target]')!;
    sel.value = '3';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    expect($<HTMLButtonElement>('[data-act="dad.start"]')!.disabled).toBe(false);
    await click('[data-act="dad.start"]');
    expect($('.prompt')?.textContent).toContain('_____');
    let guard = 0;
    while (!$('[data-act="dad.reset"]') && guard++ < 80) {
      const card = $<HTMLButtonElement>('[data-card]:not([disabled])');
      if (card) await click('[data-card]:not([disabled])');
      if ($('[data-entry]')) await click('[data-entry]');
      if ($('[data-act="dad.next"]')) await click('[data-act="dad.next"]');
      await sleep(1000);
    }
    expect(document.body.textContent).toMatch(/(You win|wins)\./);
    expect(document.body.textContent).not.toMatch(/bragging/i);
    expect($('[data-act="dad.reset"]')).not.toBeNull();
  }, 90_000);

  it('trivia: start pulls you to question 1, answer locks, the answer is not marked before the reveal', async () => {
    await click('[data-go=lobby]');
    expect($('[data-count=dad]')?.textContent).toMatch(/^3 seated/);
    await click('[data-go=trivia]');
    await click('[data-act="trivia.start"]');
    expect($('.bar__meta')?.textContent).toBe('Q1 / 10');
    expect(document.querySelectorAll('[data-choice]')).toHaveLength(4);
    expect(Number($('[data-trivia-clock]')?.textContent)).toBeGreaterThan(10);
    expect($('.choice--correct')).toBeNull();
    await click('[data-choice="2"]');
    expect($('.choice--mine')?.getAttribute('data-choice')).toBe('2');
    expect(document.body.textContent).toContain('Answer locked');
    expect(document.querySelectorAll('[data-choice]:not([disabled])')).toHaveLength(0);
    await click('[data-go=lobby]');
    expect($('[data-count=trivia]')?.textContent).toMatch(/^3 playing/);
  });

  it('bluff: sit, start, write two truths and a lie (draft survives re-renders), guess, play to the final board', async () => {
    await click('[data-go=bluff]');
    expect($('[data-count=bluff]')).toBeNull();
    await click('[data-act="bluff.sit"]');
    expect(document.body.textContent).toContain('3 seated');
    await click('[data-act="bluff.start"]');
    let wrote = false;
    let guessed = false;
    let guard = 0;
    while (!$('[data-bluff-winner]') && guard++ < 120) {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-draft]');
      if (inputs.length === 3) {
        expect(inputs[0]!.maxLength).toBe(120);
        const lines = ['I have been to Iceland.', 'I can play the banjo.', 'I once met a wizard.'];
        for (let i = 0; i < 3; i += 1) {
          const el = document.querySelector<HTMLInputElement>(`[data-draft="${i}"]`)!;
          el.focus();
          el.value = lines[i]!;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        expect($<HTMLButtonElement>('[data-act="bluff.tell"]')!.disabled).toBe(true);
        await click('[data-lie="1"]');
        // The click re-rendered the screen: what was typed is still there.
        expect(document.querySelector<HTMLInputElement>('[data-draft="2"]')!.value).toBe(lines[2]);
        expect($<HTMLButtonElement>('[data-act="bluff.tell"]')!.disabled).toBe(false);
        await click('[data-act="bluff.tell"]');
        expect(document.body.textContent).toContain('THE LIE');
        expect(document.querySelectorAll('[data-pick]')).toHaveLength(0);
        wrote = true;
      }
      const pick = $<HTMLButtonElement>('[data-pick]:not([disabled])');
      if (pick) {
        expect(document.body.textContent).not.toContain('THE LIE');
        await click('[data-pick]:not([disabled])');
        // Either still waiting on a bot (locked) or ours was the last guess and the reveal is up.
        expect(document.body.textContent?.includes('Guess locked') || Boolean($('[data-picked-by]'))).toBe(true);
        guessed = true;
      }
      if ($('[data-picked-by]') && $('[data-act="bluff.next"]')) await click('[data-act="bluff.next"]');
      await sleep(500);
    }
    expect(wrote).toBe(true);
    expect(guessed).toBe(true);
    expect($('[data-bluff-winner]')).not.toBeNull();
    expect(document.body.textContent).toContain('Final board');
    expect($('[data-act="bluff.start"]')?.textContent).toBe('Play again');
  }, 120_000);

  it('Daily Grass: on-screen keys and the physical keyboard type a row; Enter sends it; colors come back', async () => {
    if ($('[data-go=lobby]')) await click('[data-go=lobby]');
    await click('[data-go=daily]');
    await sleep(60);
    expect(document.querySelectorAll('.dg-tile')).toHaveLength(30);
    for (const k of 'cra') await click(`[data-dg-key="${k}"]`);
    for (const k of ['n', 'e']) document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    await sleep(20);
    expect($('[data-dg-row="0"]')!.textContent).toBe('CRANE');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(60);
    const tiles = [...document.querySelectorAll('[data-dg-row="0"] .dg-tile')];
    expect(tiles.every((t) => /dg-tile--[gyb]/.test(t.className))).toBe(true);
    expect($('[data-dg-row="1"]')!.textContent).toBe('');
    // One guess in: the hint is still locked (unless CRANE happened to be today's practice word).
    if ($('[data-dg-key]')) {
      expect($<HTMLButtonElement>('[data-dg-hint]')!.disabled).toBe(true);
      expect($('[data-dg-hintbar]')!.textContent).toContain('Hint unlocks after 3 guesses.');
    }
    // Backspace edits the open row only.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await sleep(20);
    expect($('[data-dg-row="1"]')!.textContent).toBe('');
    expect(document.body.textContent).toContain("Today's solvers");
  });

  it('Myth or Math: start a run, call a card, see the why, move on', async () => {
    await click('[data-go=lobby]');
    await click('[data-go=myth]');
    await click('[data-act="myth.start"]');
    expect($('[data-mm-card]')!.textContent!.length).toBeGreaterThan(5);
    await click('[data-mpick="true"]');
    expect(['MYTH', 'MATH']).toContain($('[data-mm-stamp]')!.textContent);
    expect($('[data-mm-why]')!.textContent!.length).toBeGreaterThan(10);
    await click('[data-act="myth.next"]');
    expect($('.bar__meta')!.textContent).toBe('Card 2 / 10');
  });

  it('Chess: claim White, a bot takes Black, tap-to-select then tap-to-move, two-tap resign', async () => {
    await click('[data-go=lobby]');
    await click('[data-go=chess]');
    expect($('.bar__title')!.textContent).toBe('Chess');
    expect(document.querySelectorAll('[data-sq]')).toHaveLength(64);
    // a1 sits bottom left for White and spectators.
    expect(document.querySelectorAll('[data-sq]')[56]!.getAttribute('data-sq')).toBe('0');
    await click('[data-chess-claim=w]');
    await sleep(1000);
    expect($('[data-chess-player=b] .chess-player__name')?.textContent).toMatch(/^Bot /);
    expect($('[data-act="chess.start"]')!.hasAttribute('disabled')).toBe(false);
    await click('[data-act="chess.start"]');
    expect($('[data-chess-status]')!.textContent).toContain('Your move.');
    // Tap e2: its two targets light up. Tap it again: let go.
    await click('[data-sq="12"]');
    expect($('[data-sq="12"]')!.classList.contains('sq--sel')).toBe(true);
    expect([...document.querySelectorAll('.sq--dot')].map((x) => x.getAttribute('data-sq')).sort()).toEqual(['20', '28']);
    await click('[data-sq="12"]');
    expect(document.querySelectorAll('.sq--dot')).toHaveLength(0);
    // A black piece can't be picked up.
    await click('[data-sq="52"]');
    expect(document.querySelectorAll('.sq--sel')).toHaveLength(0);
    await click('[data-sq="12"]');
    await click('[data-sq="28"]');
    expect($('[data-chess-moves]')!.textContent).toContain('e4');
    expect($('[data-sq="28"] .pc--w')).not.toBeNull();
    await sleep(1000);
    expect($('[data-chess-moves]')!.textContent).toMatch(/1\. e4 \S+/);
    expect($('[data-chess-status]')!.textContent).toContain('Your move.');
    // Resign takes two taps.
    await click('[data-chess-resign]');
    expect($('[data-chess-resign]')!.textContent).toBe('Tap again to resign');
    expect($('[data-chess-status]')!.textContent).toContain('Your move.');
    await click('[data-chess-resign]');
    expect($('[data-chess-status]')!.textContent).toMatch(/^Resigned\. Bot \w+ wins with Black\.$/);
    expect($('[data-act="chess.start"]')!.textContent).toBe('Rematch. Colors swap.');
    expect(document.body.textContent).not.toContain('!');
  });
});
