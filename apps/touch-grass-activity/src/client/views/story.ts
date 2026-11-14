// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Story Chain: the server's running story (opening line + the latest lines), a box for the next line,
// finished stories with a "Read it back" sheet, and mod tools (hide a line, end the story) for mods.

import { COPY } from '../copy.js';
import { LINE_MAX, type ArchivedStoryView, type LineView } from '../../shared/social.js';
import { esc } from './util.js';
import { STORY_ART } from '../art.js';
import type { SocialFetch } from './hotTakes.js';

/** How many of the latest lines show before "Show the whole story so far". */
export const STORY_SHOWN = 8;

export interface StoryUi {
  draft: string;
  showAll: boolean;
  /** Archived story open in the read-back sheet. */
  reading: string | null;
  endArmed: boolean;
}

export function emptyStoryUi(): StoryUi {
  return { draft: '', showAll: false, reading: null, endArmed: false };
}

function lineItem(l: LineView, mod: boolean): string {
  const text = l.text ? esc(l.text) : `<span class="muted">${COPY.hot.removed}</span>`;
  return `<li class="story-line ${l.mine ? 'story-line--mine' : ''} ${l.hidden ? 'is-hidden' : ''}" data-line="${esc(l.id)}">
    <span class="story-line__text">${text}${l.hidden ? ` <span class="tag tag--hidden">${COPY.mod.hiddenTag}</span>` : ''}</span>
    <span class="story-line__by">${esc(l.mine ? 'You' : l.name)}</span>
    ${
      mod
        ? `<span class="mod-actions">${
            l.hidden
              ? `<button class="btn btn--sm btn--ghost" data-mod-hide="${esc(l.id)}" data-mod-kind="line" data-mod-hidden="false">${COPY.mod.unhide}</button>`
              : `<button class="btn btn--sm btn--ghost" data-mod-hide="${esc(l.id)}" data-mod-kind="line" data-mod-hidden="true">${COPY.mod.hide}</button>`
          }</span>`
        : ''
    }
  </li>`;
}

export function renderReadBack(st: ArchivedStoryView, mod: boolean): string {
  return `<div class="sheet" data-story-sheet>
    <div class="sheet__backdrop" data-story-close></div>
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="story-read-title">
      <div class="sheet__head"><h2 class="sheet__title" id="story-read-title">${COPY.story.readBack}</h2><button type="button" class="btn btn--sm btn--ghost" data-story-close>${COPY.close}</button></div>
      <p class="muted small">${esc(st.ended === 'mod' ? COPY.story.endedByMod : COPY.story.endedFull)} · ${esc(COPY.story.storyMeta(st.lines.filter((l) => !l.hidden).length))}</p>
      <div class="story-read">
        <p class="story-opener">${esc(st.opener)}</p>
        <ol class="story-lines">${st.lines.map((l) => lineItem(l, mod)).join('')}</ol>
      </div>
    </div>
  </div>`;
}

export function renderStory(social: SocialFetch | null, ui: StoryUi): string {
  const v = social?.kind === 'ok' ? social.view : null;
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.story.title}</h1><span class="bar__meta">${
    v ? esc(COPY.story.lines(v.story.count, v.story.max)) : ''
  }</span></header>`;
  if (!social) return `${header}<section class="panel"><p class="muted">${COPY.connecting}</p></section>`;
  if (social.kind === 'no-server') return `${header}<section class="panel"><div class="game-hero">${STORY_ART}</div><p class="muted">${COPY.story.noServer}</p></section>`;
  if (!v) return `${header}<section class="panel"><p class="muted">${COPY.story.error}</p></section>`;

  const s = v.story;
  const lines = s.lines;
  const shown = ui.showAll ? lines : lines.slice(-STORY_SHOWN);
  const hiddenCount = lines.length - shown.length;
  const earlier = lines.length > STORY_SHOWN
    ? `<button class="btn btn--sm btn--ghost story-more" data-story-all>${hiddenCount > 0 ? `${esc(COPY.story.earlier(hiddenCount))} · ${COPY.story.showAll}` : COPY.story.showLess}</button>`
    : '';
  const count = [...ui.draft].length;
  const write = s.canAdd
    ? `<textarea class="text-in" rows="2" maxlength="${LINE_MAX}" data-sdraft="story" placeholder="${esc(COPY.story.placeholder)}" aria-label="${esc(COPY.story.placeholder)}">${esc(ui.draft)}</textarea>
       <div class="text-meta"><span class="muted small">${esc(COPY.story.rules(s.max))}</span><span class="muted small" data-count-for="story">${count}/${LINE_MAX}</span></div>
       <button class="btn btn--primary" data-story-add data-story-id="${esc(s.id)}"${ui.draft.trim() ? '' : ' disabled'}>${COPY.story.add}</button>`
    : `<p class="note note--calm" data-story-wait>${COPY.story.yourLast}</p>`;

  const main = `<section class="panel story-main">
      <div class="game-hero">${STORY_ART}</div>
      <p class="eyebrow">${COPY.story.opener}</p>
      <p class="story-opener">${esc(s.opener)}</p>
      ${earlier}
      ${shown.length ? `<ol class="story-lines" data-story-lines>${shown.map((l) => lineItem(l, v.mod)).join('')}</ol>` : `<p class="muted small">${COPY.story.empty}</p>`}
      <div class="story-write">${write}</div>
      ${social.kind === 'ok' && social.guest ? `<p class="muted small">${COPY.story.guest}</p>` : ''}
      ${
        v.mod
          ? `<div class="row panel--mod-row"><button class="btn btn--sm ${ui.endArmed ? 'btn--danger' : 'btn--ghost'}" data-mod-end="${esc(s.id)}">${ui.endArmed ? COPY.mod.endStorySure : COPY.mod.endStory}</button></div>`
          : ''
      }
    </section>`;

  const archive = `<section class="panel" data-story-archive>
      <h2 class="eyebrow">${COPY.story.archive}</h2>
      ${
        v.storyArchive.length
          ? `<ol class="take-list">${v.storyArchive
              .map(
                (st) => `<li class="take-past" data-story-past="${esc(st.id)}"><p class="take-past__text">${esc(st.opener)}</p>
                  <div class="text-meta"><span class="muted small">${esc(COPY.story.storyMeta(st.lines.filter((l) => !l.hidden).length))} · ${esc(st.ended === 'mod' ? COPY.story.endedByMod : COPY.story.endedFull)}</span>
                  <button class="btn btn--sm" data-story-read="${esc(st.id)}">${COPY.story.readBack}</button></div></li>`,
              )
              .join('')}</ol>`
          : `<p class="muted small">${COPY.story.archiveEmpty}</p>`
      }
    </section>`;

  const reading = ui.reading ? v.storyArchive.find((st) => st.id === ui.reading) : null;
  return `${header}${main}${archive}${reading ? renderReadBack(reading, v.mod) : ''}`;
}
