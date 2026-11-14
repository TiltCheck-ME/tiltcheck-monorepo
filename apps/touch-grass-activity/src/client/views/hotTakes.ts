// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Hot Takes: today's anonymous take, agree / disagree, the split and spice meter after you vote, a
// box to add your own take to the queue, past takes with their final split, and mod tools for mods.
// Renders whatever the worker sends; no author is ever in that data.

import { COPY } from '../copy.js';
import { TAKE_MAX, type ArchivedTakeView, type Results, type SocialView } from '../../shared/social.js';
import { esc } from './util.js';
import { HOT_ART } from '../art.js';

/** What the client knows about Hot Takes + Story Chain. null = still loading. */
export type SocialFetch = { kind: 'ok'; view: SocialView; error?: string; guest?: boolean } | { kind: 'no-server' } | { kind: 'error'; code?: string };

/** "3h 12m", "12m", "under a minute". */
export function fmtLeft(ms: number): string {
  if (ms < 60_000) return 'under a minute';
  const mins = Math.floor(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Split bar plus the spice meter (5 segments). */
export function splitBar(r: Results, mine: string | null = null): string {
  const dis = r.total ? 100 - r.agreePct : 0;
  const lit = Math.round((r.spice / 100) * 5);
  const segs = Array.from({ length: 5 }, (_, i) => `<span class="spice__seg ${i < lit ? 'spice__seg--on' : ''}"></span>`).join('');
  return `<div class="split" data-split>
    <div class="split__labels"><span class="split__agree">${COPY.hot.agree} ${r.agreePct}%</span><span class="split__dis">${dis}% ${COPY.hot.disagree}</span></div>
    <div class="split__bar" role="img" aria-label="${r.agreePct}% agree, ${dis}% disagree"><span class="split__fill" style="width:${r.agreePct}%"></span></div>
    <div class="split__meta"><span class="muted small">${COPY.hot.votes(r.total)}${mine ? ` · ${esc(COPY.hot.youVoted(mine))}` : ''}</span>
      <span class="spice" data-spice="${r.spice}" aria-label="${COPY.hot.spice}: ${COPY.hot.spiceLevel(r.spice)}"><span class="spice__label">${COPY.hot.spice}</span><span class="spice__segs">${segs}</span><span class="spice__level">${COPY.hot.spiceLevel(r.spice)}</span></span>
    </div>
  </div>`;
}

function modButtons(kind: 'take' | 'line', id: string, hidden: boolean | undefined, remove = true): string {
  return `<span class="mod-actions">${
    hidden
      ? `<button class="btn btn--sm btn--ghost" data-mod-hide="${esc(id)}" data-mod-kind="${kind}" data-mod-hidden="false">${COPY.mod.unhide}</button>`
      : `<button class="btn btn--sm btn--ghost" data-mod-hide="${esc(id)}" data-mod-kind="${kind}" data-mod-hidden="true">${COPY.mod.hide}</button>`
  }${remove ? `<button class="btn btn--sm btn--ghost" data-mod-remove="${esc(id)}" data-mod-kind="${kind}">${COPY.mod.remove}</button>` : ''}</span>`;
}

function archiveItem(p: ArchivedTakeView, mod: boolean): string {
  const text = p.text ? esc(p.text) : `<span class="muted">${COPY.hot.removed}</span>`;
  return `<li class="take-past ${p.hidden ? 'is-hidden' : ''}" data-take-past="${esc(p.id)}">
    <p class="take-past__text">${text}${p.hidden ? ` <span class="tag tag--hidden">${COPY.mod.hiddenTag}</span>` : ''}</p>
    ${splitBar(p.results)}
    ${mod ? modButtons('take', p.id, p.hidden) : ''}
  </li>`;
}

export function renderHotTakes(social: SocialFetch | null, draft: string, now: number): string {
  const v = social?.kind === 'ok' ? social.view : null;
  const left = v?.hot.featured ? fmtLeft(v.hot.featured.endsAt - now) : '';
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.hot.title}</h1><span class="bar__meta" data-hot-left>${
    left ? esc(COPY.hot.nextIn(left)) : ''
  }</span></header>`;
  if (!social) return `${header}<section class="panel"><p class="muted">${COPY.connecting}</p></section>`;
  if (social.kind === 'no-server') return `${header}<section class="panel"><div class="game-hero">${HOT_ART}</div><p class="muted">${COPY.hot.noServer}</p></section>`;
  if (!v) return `${header}<section class="panel"><p class="muted">${COPY.hot.error}</p></section>`;

  const f = v.hot.featured;
  let featured: string;
  if (!f) featured = `<p class="muted">${COPY.hot.none}</p>`;
  else {
    const voted = f.myVote !== null;
    const actions = voted
      ? ''
      : `<div class="vote-row">
          <button class="btn btn--primary vote-btn" data-hot-vote="agree" data-poll="${esc(f.id)}">${COPY.hot.agree}</button>
          <button class="btn vote-btn" data-hot-vote="disagree" data-poll="${esc(f.id)}">${COPY.hot.disagree}</button>
        </div>
        <p class="muted small">${COPY.hot.hiddenUntilVote}</p>`;
    const results = f.results && (voted || v.mod) ? splitBar(f.results, f.myVote ? (f.myVote === 'agree' ? COPY.hot.agree : COPY.hot.disagree) : null) : '';
    featured = `<p class="eyebrow">${f.house ? COPY.hot.house : COPY.hot.featured}${f.hidden ? ` <span class="tag tag--hidden">${COPY.mod.hiddenTag}</span>` : ''}</p>
      <p class="prompt take" data-take="${esc(f.id)}">${esc(f.text)}</p>
      ${actions}${results}
      ${v.mod ? `<div class="row">${modButtons('take', f.id, f.hidden)}</div>` : ''}`;
  }

  const count = [...draft].length;
  const submit = `<section class="panel" data-hot-submit-panel>
      <h2 class="eyebrow">${COPY.hot.submitTitle}</h2>
      <textarea class="text-in" rows="3" maxlength="${TAKE_MAX}" data-sdraft="hot" placeholder="${esc(COPY.hot.placeholder)}" aria-label="${esc(COPY.hot.submitTitle)}"${v.hot.submitsLeft ? '' : ' disabled'}>${esc(draft)}</textarea>
      <div class="text-meta"><span class="muted small">${esc(COPY.hot.submitHint(v.hot.submitsLeft))}</span><span class="muted small" data-count-for="hot">${count}/${TAKE_MAX}</span></div>
      <button class="btn btn--primary" data-hot-submit${draft.trim() && v.hot.submitsLeft ? '' : ' disabled'}>${COPY.hot.submit}</button>
      <p class="muted small">${esc(COPY.hot.queued(v.hot.queued))}</p>
    </section>`;

  const archive = `<section class="panel" data-hot-archive>
      <h2 class="eyebrow">${COPY.hot.archive}</h2>
      ${v.hot.archive.length ? `<ol class="take-list">${v.hot.archive.map((p) => archiveItem(p, v.mod)).join('')}</ol>` : `<p class="muted small">${COPY.hot.archiveEmpty}</p>`}
    </section>`;

  const modQueue = v.mod
    ? `<section class="panel panel--mod" data-mod-queue>
        <h2 class="eyebrow">${COPY.mod.title}: ${COPY.mod.queue}</h2>
        ${
          v.hot.modQueue && v.hot.modQueue.length
            ? `<ol class="take-list">${v.hot.modQueue
                .map(
                  (t) =>
                    `<li class="take-past ${t.hidden ? 'is-hidden' : ''}" data-queued="${esc(t.id)}"><p class="take-past__text">${esc(t.text)}${
                      t.hidden ? ` <span class="tag tag--hidden">${COPY.mod.hiddenTag}</span>` : ''
                    }</p>${modButtons('take', t.id, t.hidden)}</li>`,
                )
                .join('')}</ol>`
            : `<p class="muted small">${COPY.mod.queueEmpty}</p>`
        }
      </section>`
    : '';

  return `${header}
    <section class="panel hot-main"><div class="game-hero">${HOT_ART}</div>${featured}${social.kind === 'ok' && social.guest ? `<p class="muted small">${COPY.hot.guest}</p>` : ''}</section>
    ${submit}
    ${modQueue}
    ${archive}`;
}
