// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// @vitest-environment jsdom
// Guest-mode smoke test of the real client in jsdom: lobby -> DA&D with bots -> break.
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
  it('lobby shows the fake user and three tiles, trivia disabled', () => {
    expect(document.body.textContent).toContain('Guest mode');
    expect(document.querySelectorAll('.person')).toHaveLength(1);
    expect($('.person__name')?.textContent).toBe('Jme');
    expect(document.querySelectorAll('.tile')).toHaveLength(3);
    const trivia = $<HTMLButtonElement>('.tile--soon')!;
    expect(trivia.disabled).toBe(true);
    expect(trivia.textContent).toContain('Coming soon');
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

  it('break: start pulls you to the clock, bail shows a roast with the time', async () => {
    await click('[data-go=lobby]');
    await click('[data-go=break]');
    await click('[data-minutes="5"]');
    expect($('[data-act="break.start"]')?.textContent).toContain('5 min');
    await click('[data-act="break.start"]');
    expect($('[data-clock]')?.textContent).toMatch(/^[45]:\d\d$/);
    expect(document.querySelectorAll('.break-panel .person').length).toBeGreaterThanOrEqual(1);
    await click('[data-act="break.bail"]');
    expect($('.roast')?.textContent).toMatch(/0:0\d/);
  });
});
