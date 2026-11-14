// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12

import type { RoomUser, RoomView } from '../../shared/protocol.js';
import { avatarUrl } from '../discord.js';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function nameOf(view: RoomView, id: string | null | undefined, fallback = 'someone'): string {
  if (!id) return fallback;
  if (id === view.you) return 'You';
  return view.members.find((m) => m.id === id)?.name ?? fallback;
}

/** Stable hue per user, so the initial behind an avatar keeps its colour across renders. */
function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

/**
 * Avatar: a coloured circle with the user's initial (drawn by CSS from data-initial, so no text node)
 * and the Discord picture on top. If the picture can't load, the initial shows through.
 */
export function avatarImg(u: Pick<RoomUser, 'id' | 'avatar' | 'name'>, cls = 'avatar'): string {
  const initial = (u.name.trim()[0] ?? '?').toUpperCase();
  const src = avatarUrl(u.id, u.avatar);
  const img = failedAvatars.has(src) ? '' : `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-avatar />`;
  return `<span class="${cls}" role="img" aria-label="${esc(u.name)}" title="${esc(u.name)}" data-initial="${esc(initial)}" style="--hue:${hueOf(u.id)}">${img}</span>`;
}

/** Avatar pictures that failed to load (main.ts fills this); later renders show the initial only. */
export const failedAvatars = new Set<string>();

/** Competition rank (ties share a place): 1 + how many scores beat this one. */
export function placeOf(score: number, all: number[]): number {
  return 1 + all.filter((s) => s > score).length;
}

/** Medal class for places 1-3 (gold, silver, bronze); empty past that or for a zero score. */
export function medal(place: number, score = 1): string {
  return score > 0 && place <= 3 ? ` medal--${place}` : '';
}

/**
 * Winner podium: top three in 2-1-3 order, tallest block in the middle. Rows arrive best first.
 * Ties share a medal. Visual only; the winner line above it is still the source of truth.
 */
export function podium(view: RoomView, rows: { id: string; score: number }[]): string {
  const top = rows.filter((r) => r.score > 0).slice(0, 3);
  if (!top.length) return '';
  const all = rows.map((r) => r.score);
  const order = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];
  return `<div class="podium" data-podium>${order
    .map((i, slot) => {
      const r = top[i] as { id: string; score: number };
      const place = placeOf(r.score, all);
      return `<div class="podium__spot podium__spot--${i + 1}${medal(place)}" style="--i:${slot}">
        ${avatarImg(userById(view, r.id), 'avatar avatar--podium')}
        <span class="podium__name">${esc(nameOf(view, r.id))}</span>
        <span class="podium__block"><span class="podium__place">${place}</span><span class="podium__pts">${r.score}</span></span>
      </div>`;
    })
    .join('')}</div>`;
}

export function userById(view: RoomView, id: string): Pick<RoomUser, 'id' | 'avatar' | 'name'> {
  return view.members.find((m) => m.id === id) ?? { id, avatar: null, name: 'someone' };
}
