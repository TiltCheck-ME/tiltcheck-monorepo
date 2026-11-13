// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
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

/** Small flag mark next to the lobby title. */
export const FLAG_SVG = `<svg class="brand__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 21V3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6.6 4h11.2l-2.9 4 2.9 4H6.6Z" fill="currentColor"/><path d="M2.5 21.2c2-1.6 5-1.6 7 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
