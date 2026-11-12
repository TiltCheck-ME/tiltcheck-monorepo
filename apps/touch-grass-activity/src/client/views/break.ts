// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Group Touch Grass break: pick a length, shared countdown, optional bail, share card at the end.

import { COPY, roastFor } from '../copy.js';
import { BREAK_MINUTES, formatClock } from '../../shared/breakTimer.js';
import type { RoomView } from '../../shared/protocol.js';
import { avatarImg, esc, nameOf, userById } from './util.js';

export interface BreakResultCard {
  minutes: number;
  stuck: string[];
  bailed: Array<{ name: string; at: string; left: boolean }>;
}

export function breakResult(view: RoomView): BreakResultCard {
  const b = view.brk;
  const start = b.startedAt ?? 0;
  const stuck: string[] = [];
  const bailed: BreakResultCard['bailed'] = [];
  for (const c of [...b.crew].sort((x, y) => (x.bailedAt ?? Infinity) - (y.bailedAt ?? Infinity))) {
    const name = nameOf(view, c.id, 'someone who left');
    if (c.bailedAt === null) stuck.push(name);
    else bailed.push({ name, at: formatClock(c.bailedAt - start), left: c.left });
  }
  return { minutes: b.minutes ?? 0, stuck, bailed };
}

export function shareText(r: BreakResultCard): string {
  const lines = [`${COPY.brk.shareCard(r.minutes)}.`];
  lines.push(r.stuck.length ? `${COPY.brk.stuckIt}: ${r.stuck.join(', ')}` : COPY.brk.nobodyStuck);
  if (r.bailed.length) lines.push(`${COPY.brk.bailedList}: ${r.bailed.map((b) => `${b.name} (${b.at})`).join(', ')}`);
  return lines.join('\n');
}

export function renderBreak(view: RoomView, clockOffsetMs: number, pickMinutes: number): string {
  const b = view.brk;
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.brk.title}</h1><span class="bar__meta"></span></header>`;

  if (b.phase === 'idle') {
    return `${header}
      <section class="panel break-panel">
        <p class="lede">${COPY.brk.idleBody}</p>
        <h2 class="eyebrow">${COPY.brk.pick}</h2>
        <div class="seg" role="radiogroup">
          ${BREAK_MINUTES.map((m) => `<button class="seg__btn" role="radio" aria-checked="${m === pickMinutes}" data-minutes="${m}">${COPY.brk.minutes(m)}</button>`).join('')}
        </div>
        <button class="btn btn--primary btn--big" data-act="break.start">${COPY.brk.start(pickMinutes)}</button>
      </section>`;
  }

  if (b.phase === 'running') {
    const now = Date.now() + clockOffsetMs;
    const left = Math.max(0, (b.endsAt ?? now) - now);
    const total = (b.minutes ?? 1) * 60_000;
    const pct = Math.min(100, Math.max(0, 100 - (left / total) * 100));
    const mine = b.me.bailedAt;
    const out = b.crew.filter((c) => c.bailedAt === null);
    return `${header}
      <section class="panel break-panel">
        <h2 class="h2">${mine !== null ? COPY.brk.bailedTitle : COPY.brk.runningTitle}</h2>
        <div class="clock" data-clock>${formatClock(left)}</div>
        <div class="progress"><span style="width:${pct.toFixed(1)}%"></span></div>
        ${
          mine !== null
            ? `<p class="roast">${esc(roastFor(view.you, mine, formatClock(mine - (b.startedAt ?? mine))))}</p>`
            : `<p class="muted">${COPY.brk.runningBody}</p>`
        }
        <h3 class="eyebrow">${COPY.brk.crew} <span class="count">${out.length}</span></h3>
        <div class="people">${out.map((c) => `<span class="person">${avatarImg(userById(view, c.id))}<span class="person__name">${esc(nameOf(view, c.id))}</span></span>`).join('')}</div>
        ${b.me.inBreak && mine === null ? `<button class="btn btn--ghost" data-act="break.bail">${COPY.brk.bail}</button>` : ''}
      </section>`;
  }

  const r = breakResult(view);
  return `${header}
    <section class="panel break-panel">
      <h2 class="h2">${COPY.brk.doneTitle}</h2>
      <div class="share-card" data-share-card>
        <p class="share-card__brand">TILTCHECK / TOUCH GRASS</p>
        <p class="share-card__time">${r.minutes}:00</p>
        <p class="share-card__label">${esc(COPY.brk.stuckIt)}</p>
        <p class="share-card__names">${r.stuck.length ? r.stuck.map(esc).join(', ') : esc(COPY.brk.nobodyStuck)}</p>
        ${
          r.bailed.length
            ? `<p class="share-card__label">${esc(COPY.brk.bailedList)}</p><ul class="share-card__bailed">${r.bailed
                .map((x) => `<li>${esc(x.name)} <span>bailed at ${x.at}${x.left ? `, ${COPY.brk.left}` : ''}</span></li>`)
                .join('')}</ul>`
            : ''
        }
      </div>
      <div class="row">
        <button class="btn btn--primary" data-share>${COPY.brk.share}</button>
        <button class="btn btn--ghost" data-copy>${COPY.brk.copy}</button>
        <button class="btn btn--ghost" data-act="break.reset">${COPY.brk.again}</button>
      </div>
    </section>`;
}
