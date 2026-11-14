// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Lobby and game icons. Flat inline SVG line icons drawn in currentColor, so each one takes its
// game's accent as a tint (no gradients, no glow). No text nodes, so nothing leaks into textContent.
// DA&D keeps its own brand logo, bundled locally from the DA&D repo (TiltCheck-ME/DegensAgainstDecency,
// public/logo.png resized to webp). Discord's proxy blocks outside hosts, so nothing here is remote.

import dadLogoUrl from './art/dad-logo.webp';

export { dadLogoUrl };

const icon = (body: string) =>
  `<svg class="tile__svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** Trivia: a question mark in a rounded square. */
export const TRIVIA_ART = icon(`<rect x="4" y="4" width="32" height="32" rx="8"/><path d="M15.5 15.5a4.5 4.5 0 1 1 6.8 3.9c-1.5.9-2.3 1.7-2.3 3.4"/><circle cx="20" cy="27.6" r="1.4" fill="currentColor" stroke="none"/>`);

/** Bluff: a poker face. One brow up, flat mouth. */
export const BLUFF_ART = icon(`<circle cx="20" cy="20" r="15"/><path d="M12.5 15l4.5-.8M23 13.6c1.8-1 3.6-1 5.2-.3M13 19h4M23 19h4M15 26.5h10"/>`);

/** Daily Grass: a small board of letter tiles, two filled. */
export const DAILY_ART = icon(`<rect x="5" y="9" width="8" height="8" rx="2"/><rect x="16" y="9" width="8" height="8" rx="2" fill="currentColor"/><rect x="27" y="9" width="8" height="8" rx="2"/><rect x="5" y="22" width="8" height="8" rx="2" fill="currentColor"/><rect x="16" y="22" width="8" height="8" rx="2"/><rect x="27" y="22" width="8" height="8" rx="2"/>`);

/** Myth or Math: a magnifier. */
export const MYTH_ART = icon(`<circle cx="17.5" cy="17.5" r="10"/><path d="M25 25l9 9"/>`);

/** Chess: a knight's head. */
export const CHESS_ART = icon(`<path d="M13 33c0-6 3.5-8.5 4.5-11.5-3 .8-5.5.4-7-1.3l5.5-7c1-2.8 3-4.6 5.6-5.2l1-3 1.8 3.2c5.6 1.6 8.6 7.6 8.6 24.8z"/><path d="M10 33h21"/>`);

/**
 * Chess pieces, drawn here from plain shapes (no third-party piece set). 45 x 45 box; `fill` is the
 * piece colour and `ink` the outline and detail colour, so each one reads on light and dark squares.
 */
const PIECE_BODY: Record<string, string> = {
  p: `<circle cx="22.5" cy="14" r="5"/><path d="M16.5 33c0-6.5 2.3-10.4 6-12 3.7 1.6 6 5.5 6 12z"/>`,
  r: `<path d="M12.5 9h4.5v3.5h3V9h5v3.5h3V9h4.5v8h-20z"/><path d="M14.5 17h16l1.5 16H13z"/>`,
  n: `<path d="M15 33c0-6 3.6-8.6 4.6-11.6-3.2.8-5.8.4-7.4-1.4l5.6-7.2c1.1-2.9 3.1-4.7 5.8-5.3l1-3 1.9 3.3c5.8 1.6 8.9 7.8 8.9 25.2z"/><circle cx="22" cy="12.5" r="1.3" class="pc-ink"/>`,
  b: `<circle cx="22.5" cy="6.5" r="2.4"/><path d="M22.5 9c6.4 4.6 7.6 12.6 4 18h-8c-3.6-5.4-2.4-13.4 4-18z"/><path d="M17 27h11v3H17zM16 30h13l1.5 3h-16z"/><path d="M22.5 14.5v6.5M19.5 17.7h6" class="pc-line"/>`,
  q: `<circle cx="9.5" cy="12" r="2.2"/><circle cx="22.5" cy="8.5" r="2.2"/><circle cx="35.5" cy="12" r="2.2"/><circle cx="16" cy="10" r="1.8"/><circle cx="29" cy="10" r="1.8"/><path d="M12 30 10 14.5l6.5 8 6-12 6 12 6.5-8L33 30z"/>`,
  k: `<path d="M22.5 3.5v8M18.5 7h8" class="pc-cross"/><path d="M13 31c-3.2-8.6 2.5-14.6 9.5-9.4 7-5.2 12.7.8 9.5 9.4z"/><path d="M22.5 13.5c-1.6 2.4-1.6 5.2 0 8.1 1.6-2.9 1.6-5.7 0-8.1z"/>`,
};

export function pieceSvg(piece: string): string {
  const white = piece === piece.toUpperCase();
  const body = PIECE_BODY[piece.toLowerCase()] ?? '';
  return `<svg class="pc ${white ? 'pc--w' : 'pc--b'}" viewBox="0 0 45 45" aria-hidden="true" focusable="false">${body}<rect x="11" y="33" width="23" height="5.5" rx="1.6"/></svg>`;
}

/** Small flag mark next to the lobby title. */
/** Hot Takes: a flame. */
export const HOT_ART = icon(`<path d="M20 35c-6.6 0-11-4.4-11-10.4 0-5.2 3.4-8.3 5.8-11.4.6 2.6 2 4.4 3.8 5.4-.6-5.6 1.6-10.4 5.6-13.6.4 5 3.2 7.8 5.6 10.6 2 2.4 3.2 5 3.2 8.8C33 30.6 28 35 20 35z"/><path d="M20 35c-2.8 0-4.6-1.9-4.6-4.4 0-2.4 1.6-3.8 3-5.6.6 1.6 1.6 2.4 2.8 2.8.4-1.4 1-2.6 2-3.4.6 1.6 1.4 2.8 1.4 4.6 0 3.6-2 6-4.6 6z"/>`);

/** Story Chain: three lines of text with a pen nib on the last one. */
export const STORY_ART = icon(`<path d="M7 11h26M7 18h26M7 25h14"/><path d="M25 33l2-6 8-8 4 4-8 8-6 2z"/>`);

export const FLAG_SVG = `<svg class="brand__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 21V3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6.6 4h11.2l-2.9 4 2.9 4H6.6Z" fill="currentColor"/><path d="M2.5 21.2c2-1.6 5-1.6 7 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
