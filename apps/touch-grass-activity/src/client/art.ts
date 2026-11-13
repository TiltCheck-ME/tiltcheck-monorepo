// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Lobby and tile art. Inline SVG (no text nodes, so it never leaks into textContent) plus the DA&D
// brand files bundled locally: Discord's proxy blocks outside hosts, so nothing here is remote.
// DA&D logo and banner come from the DA&D repo (TiltCheck-ME/DegensAgainstDecency, public/logo.png
// and public/banner.png), resized to webp. They are the DA&D brand, not Touch Grass art.

import dadLogoUrl from './art/dad-logo.webp';

// The banner is pulled in by styles.css (.tile--dad) so Vite fingerprints it alongside the CSS.
export { dadLogoUrl };

/** Two rows of grass blades along the bottom of the lobby hero. Stretches to any width. */
export const GRASS_SVG = `<svg class="hero__grass" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
<path class="grass-back" d="M-4 64Q0 49 4 37Q4 50 6 64ZM1 64Q2 46 -1 32Q6 48 12 64ZM9 64Q8 46 5 30Q12 47 17 64ZM14 64Q14 41 12 22Q18 43 24 64ZM20 64Q24 39 27 19Q28 42 31 64ZM27 64Q34 50 40 39Q39 51 40 64ZM36 64Q37 49 37 37Q40 51 44 64ZM43 64Q46 44 50 27Q50 46 51 64ZM48 64Q48 50 46 39Q53 51 59 64ZM55 64Q57 46 57 31Q62 47 66 64ZM63 64Q68 47 74 33Q73 49 74 64ZM71 64Q74 44 76 27Q78 46 80 64ZM79 64Q86 47 93 34Q90 49 90 64ZM85 64Q86 42 84 23Q90 44 95 64ZM92 64Q97 43 101 25Q100 45 101 64ZM98 64Q103 47 108 33Q108 49 111 64ZM107 64Q113 45 119 30Q117 47 118 64ZM116 64Q116 43 114 25Q121 45 127 64ZM124 64Q130 39 136 18Q135 41 136 64ZM131 64Q131 43 128 25Q135 45 141 64ZM138 64Q138 49 135 37Q141 51 147 64ZM145 64Q147 48 148 35Q150 49 154 64ZM152 64Q155 45 157 30Q158 47 161 64ZM159 64Q161 40 161 21Q166 42 171 64ZM167 64Q173 40 180 21Q177 42 177 64ZM173 64Q174 48 173 35Q177 49 182 64ZM179 64Q179 48 176 34Q183 49 190 64ZM187 64Q193 44 200 28Q197 46 196 64ZM194 64Q199 43 203 26Q203 45 205 64ZM200 64Q207 41 213 23Q212 43 213 64ZM210 64Q210 46 208 31Q214 48 220 64ZM217 64Q218 50 216 39Q221 51 226 64ZM222 64Q222 50 218 39Q225 51 232 64ZM228 64Q227 46 224 32Q231 48 237 64ZM235 64Q237 49 236 37Q241 50 246 64ZM242 64Q248 49 253 37Q252 51 252 64ZM251 64Q251 45 248 29Q255 47 261 64ZM257 64Q262 48 267 34Q266 49 266 64ZM262 64Q265 39 267 19Q268 42 270 64ZM267 64Q271 50 273 39Q275 52 278 64ZM276 64Q278 42 278 25Q283 44 289 64ZM284 64Q287 41 289 23Q291 44 293 64ZM291 64Q296 48 302 35Q300 50 301 64ZM299 64Q305 41 311 22Q310 43 312 64ZM309 64Q311 45 311 29Q314 46 318 64ZM314 64Q315 47 314 34Q318 49 322 64ZM320 64Q327 45 334 30Q332 47 333 64ZM331 64Q333 46 332 32Q338 48 344 64ZM339 64Q342 48 346 36Q346 50 348 64ZM346 64Q351 45 355 29Q356 47 358 64ZM356 64Q361 43 367 25Q365 45 364 64ZM363 64Q364 45 363 29Q368 47 374 64ZM372 64Q378 41 385 22Q382 43 381 64ZM378 64Q383 39 387 19Q387 42 388 64ZM384 64Q390 49 396 37Q393 50 393 64ZM391 64Q397 41 404 22Q401 43 400 64ZM398 64Q398 44 396 28Q402 46 407 64ZM403 64Q407 43 410 26Q412 45 416 64Z"/>
<path class="grass-front" d="M-4 64Q0 49 5 36Q4 50 5 64ZM1 64Q2 54 2 47Q6 55 9 64ZM7 64Q8 53 6 44Q11 54 15 64ZM14 64Q17 53 19 44Q20 54 22 64ZM21 64Q23 48 25 35Q27 50 29 64ZM27 64Q29 57 31 52Q33 58 36 64ZM32 64Q33 49 31 38Q35 51 39 64ZM37 64Q39 52 40 42Q43 53 47 64ZM44 64Q45 50 43 38Q48 51 53 64ZM51 64Q55 55 59 47Q58 56 59 64ZM56 64Q62 50 67 38Q65 51 66 64ZM63 64Q66 52 68 43Q69 53 72 64ZM70 64Q72 52 74 42Q76 53 79 64ZM77 64Q83 49 88 36Q87 50 87 64ZM83 64Q88 48 93 35Q92 50 93 64ZM89 64Q89 53 87 44Q92 54 96 64ZM94 64Q97 51 101 40Q100 52 101 64ZM99 64Q103 50 106 39Q106 52 107 64ZM104 64Q106 48 105 35Q110 49 115 64ZM113 64Q118 53 124 43Q122 54 121 64ZM120 64Q122 53 124 44Q125 54 127 64ZM125 64Q128 54 132 46Q131 55 132 64ZM129 64Q129 53 127 44Q133 54 138 64ZM135 64Q135 52 134 43Q139 53 144 64ZM143 64Q144 48 143 35Q148 49 153 64ZM149 64Q150 50 150 38Q153 51 157 64ZM154 64Q158 48 162 36Q161 50 162 64ZM159 64Q162 48 164 35Q165 50 167 64ZM165 64Q168 57 171 51Q171 57 172 64ZM170 64Q173 48 175 35Q176 50 177 64ZM176 64Q175 49 173 37Q178 50 183 64ZM182 64Q184 54 187 46Q188 55 190 64ZM189 64Q191 56 193 50Q195 57 197 64ZM194 64Q194 56 191 49Q197 57 201 64ZM198 64Q202 54 206 47Q206 55 207 64ZM204 64Q205 56 206 49Q209 56 213 64ZM209 64Q212 57 216 52Q216 58 217 64ZM214 64Q219 53 224 43Q222 54 222 64ZM219 64Q222 53 224 44Q226 54 229 64ZM227 64Q231 52 234 43Q234 53 236 64ZM234 64Q238 49 241 37Q241 51 243 64ZM241 64Q241 54 239 46Q244 55 249 64ZM246 64Q246 50 246 39Q249 51 253 64ZM250 64Q254 49 259 37Q257 50 257 64ZM255 64Q257 55 257 48Q260 56 264 64ZM261 64Q262 53 262 44Q265 54 269 64ZM267 64Q269 52 269 42Q274 53 278 64ZM277 64Q276 54 274 46Q280 55 285 64ZM282 64Q283 52 282 43Q287 53 291 64ZM288 64Q288 55 286 47Q291 56 295 64ZM293 64Q294 57 294 52Q297 58 300 64ZM297 64Q302 52 306 42Q305 53 307 64ZM304 64Q307 49 308 36Q311 50 314 64ZM311 64Q315 56 319 49Q320 57 322 64ZM319 64Q323 49 328 37Q326 50 326 64ZM324 64Q325 49 324 37Q329 51 334 64ZM331 64Q336 49 340 37Q339 50 340 64ZM338 64Q342 49 346 36Q346 50 348 64ZM346 64Q346 57 344 51Q349 58 353 64ZM351 64Q353 49 355 37Q356 50 358 64ZM356 64Q359 51 361 40Q363 52 366 64ZM361 64Q365 50 367 39Q369 51 372 64ZM369 64Q373 57 377 51Q377 57 378 64ZM375 64Q378 55 382 47Q381 56 382 64ZM379 64Q382 48 384 34Q386 49 389 64ZM386 64Q390 51 394 40Q394 52 395 64ZM392 64Q393 57 392 51Q397 57 402 64ZM398 64Q402 54 404 47Q406 55 408 64ZM404 64Q407 55 410 47Q410 56 411 64Z"/>
</svg>`;

/** Sun with a soft halo, top corner of the hero. */
export const SUN_SVG = `<svg class="hero__sun" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
<defs><radialGradient id="tg-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe9a3"/><stop offset=".42" stop-color="#ffd25e"/><stop offset=".55" stop-color="#ffd25e" stop-opacity=".35"/><stop offset="1" stop-color="#ffd25e" stop-opacity="0"/></radialGradient></defs>
<circle cx="60" cy="60" r="60" fill="url(#tg-sun)"/></svg>`;

/** Trivia: quiz-show sign, a lit question mark inside a ring of marquee bulbs. */
export const TRIVIA_ART = `<svg class="tile__svg" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
<defs><linearGradient id="tg-tv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3ad6ff"/><stop offset="1" stop-color="#1b6dff"/></linearGradient></defs>
<rect x="6" y="6" width="84" height="84" rx="22" fill="url(#tg-tv)"/>
<rect x="14" y="14" width="68" height="68" rx="16" fill="#071a3a"/>
<g fill="#fff3b0"><circle cx="26" cy="10" r="2.6"/><circle cx="40" cy="10" r="2.6"/><circle cx="56" cy="10" r="2.6"/><circle cx="70" cy="10" r="2.6"/><circle cx="26" cy="86" r="2.6"/><circle cx="40" cy="86" r="2.6"/><circle cx="56" cy="86" r="2.6"/><circle cx="70" cy="86" r="2.6"/><circle cx="10" cy="26" r="2.6"/><circle cx="10" cy="40" r="2.6"/><circle cx="10" cy="56" r="2.6"/><circle cx="10" cy="70" r="2.6"/><circle cx="86" cy="26" r="2.6"/><circle cx="86" cy="40" r="2.6"/><circle cx="86" cy="56" r="2.6"/><circle cx="86" cy="70" r="2.6"/></g>
<path d="M36 38a12 12 0 1 1 18 10.4c-4 2.3-6 4.4-6 9.6" fill="none" stroke="#5cf2d6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="48" cy="69" r="5.2" fill="#5cf2d6"/>
</svg>`;

/** Bluff: a poker face. One brow up, flat mouth, smoke curling off the top. */
export const BLUFF_ART = `<svg class="tile__svg" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
<defs><linearGradient id="tg-bf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b48cff"/><stop offset="1" stop-color="#5b2bb5"/></linearGradient></defs>
<path d="M58 22c-6-5 2-9-3-15M68 24c-4-6 4-9 0-16M46 22c-3-4 1-7-2-11" fill="none" stroke="#cdb8ff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>
<circle cx="48" cy="56" r="34" fill="url(#tg-bf)"/>
<circle cx="48" cy="56" r="34" fill="none" stroke="#e6dbff" stroke-opacity=".35" stroke-width="2"/>
<path d="M28 44l12-2M56 38c4-3 9-3 13-1" fill="none" stroke="#1a0f33" stroke-width="4" stroke-linecap="round"/>
<path d="M30 52h11M56 52h12" fill="none" stroke="#1a0f33" stroke-width="5" stroke-linecap="round"/>
<path d="M37 72h22" fill="none" stroke="#1a0f33" stroke-width="4.5" stroke-linecap="round"/>
</svg>`;

/** Quest flag for the brand mark next to the lobby title: a pennant on a pole planted in a mound. */
export const FLAG_SVG = `<svg class="hero__leaf" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 21V3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6.6 4h11.2l-2.9 4 2.9 4H6.6Z" fill="currentColor"/><path d="M2.5 21.2c2-1.6 5-1.6 7 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

/** Daily Grass: a little board of letter tiles (green, yellow, gray) with grass at its feet. */
export const DAILY_ART = `<svg class="tile__svg" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
<defs><linearGradient id="tg-dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fe39a"/><stop offset="1" stop-color="#1e8a4c"/></linearGradient></defs>
<rect x="6" y="6" width="84" height="84" rx="22" fill="url(#tg-dg)"/>
<rect x="14" y="14" width="68" height="68" rx="16" fill="#0b2216"/>
<g><rect x="20" y="21" width="16" height="16" rx="4" fill="#3fbf6e"/><rect x="40" y="21" width="16" height="16" rx="4" fill="#3b4a43"/><rect x="60" y="21" width="16" height="16" rx="4" fill="#e9c548"/>
<rect x="20" y="41" width="16" height="16" rx="4" fill="#3b4a43"/><rect x="40" y="41" width="16" height="16" rx="4" fill="#3fbf6e"/><rect x="60" y="41" width="16" height="16" rx="4" fill="#3fbf6e"/></g>
<path d="M18 80q3-10 5-16q1 8 3 16zM27 80q4-12 9-19q-2 10-1 19zM38 80q2-9 2-14q4 7 6 14zM50 80q4-11 9-17q-3 9-2 17zM61 80q2-8 1-13q5 6 7 13zM71 80q3-10 7-15q-2 8-1 15z" fill="#5fe08a"/>
</svg>`;

/** Myth or Math: a magnifier over a fact card with a busted-myth stamp. No chips, slots or dice. */
export const MYTH_ART = `<svg class="tile__svg" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
<defs><linearGradient id="tg-mm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc24b"/><stop offset="1" stop-color="#e2602f"/></linearGradient></defs>
<rect x="6" y="6" width="84" height="84" rx="22" fill="url(#tg-mm)"/>
<rect x="17" y="18" width="50" height="60" rx="8" fill="#fff6e6" transform="rotate(-6 42 48)"/>
<path d="M26 32h28M26 41h24M26 50h18" stroke="#c9b79a" stroke-width="4" stroke-linecap="round" transform="rotate(-6 42 48)"/>
<g transform="rotate(-14 44 62)"><rect x="24" y="54" width="40" height="17" rx="4" fill="none" stroke="#d83a2a" stroke-width="3.5"/><path d="M30 62.5h28" stroke="#d83a2a" stroke-width="4" stroke-linecap="round"/></g>
<circle cx="64" cy="40" r="15" fill="#2a1404" fill-opacity=".18" stroke="#2a1404" stroke-width="5"/>
<path d="M74.5 51l10 11" stroke="#2a1404" stroke-width="7" stroke-linecap="round"/>
<path d="M57 34a9 9 0 0 1 8-4" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;
