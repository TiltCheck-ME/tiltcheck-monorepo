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

export function avatarImg(u: Pick<RoomUser, 'id' | 'avatar' | 'name'>, cls = 'avatar'): string {
  return `<img class="${cls}" src="${esc(avatarUrl(u.id, u.avatar))}" alt="${esc(u.name)}" title="${esc(u.name)}" loading="lazy" referrerpolicy="no-referrer" />`;
}

export function userById(view: RoomView, id: string): Pick<RoomUser, 'id' | 'avatar' | 'name'> {
  return view.members.find((m) => m.id === id) ?? { id, avatar: null, name: 'someone' };
}
