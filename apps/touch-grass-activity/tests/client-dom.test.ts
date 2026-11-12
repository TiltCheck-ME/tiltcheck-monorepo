// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// @vitest-environment jsdom
// Guest-mode smoke test of the real client in jsdom: lobby -> DA&D with bots -> trivia.
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
  it('lobby shows the fake user and two live tiles with counts, no break tile', () => {
    expect(document.body.textContent).toContain('Guest mode');
    expect(document.querySelectorAll('.person')).toHaveLength(1);
    expect($('.person__name')?.textContent).toBe('Jme');
    expect(document.querySelectorAll('.tile')).toHaveLength(2);
    expect($('[data-count=dad]')?.textContent).toBe('0 seated');
    expect($('[data-count=trivia]')?.textContent).toBe('0 playing');
    const trivia = $<HTMLButtonElement>('.tile--trivia')!;
    expect(trivia.disabled).toBe(false);
    expect(document.body.textContent).not.toMatch(/break|soon/i);
    expect(document.body.textContent).toContain('Step away from the reels. Sit at a table that is not a spin.');
  });

  it('lobby shows the High scores board with This week / All time tabs (guest board starts empty)', async () => {
    await sleep(30);
    const hs = $('[data-high-scores]')!;
    expect(hs.textContent).toContain('High scores');
    expect([...hs.querySelectorAll('[data-scores-tab]')].map((x) => x.textContent)).toEqual(['This week', 'All time']);
    expect($('[data-scores-tab=week]')!.getAttribute('aria-selected')).toBe('true');
    expect(hs.textContent).toContain('Nobody on it yet');
    expect(hs.textContent).toContain('Bragging rights only');
    await click('[data-scores-tab=all]');
    expect($('[data-scores-tab=all]')!.getAttribute('aria-selected')).toBe('true');
    await click('[data-scores-tab=week]');
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
    while (!document.body.textContent?.includes('Bragging rights only') && guard++ < 80) {
      const card = $<HTMLButtonElement>('[data-card]:not([disabled])');
      if (card) await click('[data-card]:not([disabled])');
      if ($('[data-entry]')) await click('[data-entry]');
      if ($('[data-act="dad.next"]')) await click('[data-act="dad.next"]');
      await sleep(1000);
    }
    expect(document.body.textContent).toContain('Bragging rights only');
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
    expect(document.body.textContent).toContain('Locked in');
    expect(document.querySelectorAll('[data-choice]:not([disabled])')).toHaveLength(0);
    await click('[data-go=lobby]');
    expect($('[data-count=trivia]')?.textContent).toMatch(/^3 playing/);
  });
});
