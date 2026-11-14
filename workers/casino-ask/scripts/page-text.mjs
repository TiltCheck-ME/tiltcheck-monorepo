#!/usr/bin/env node
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * Prints what the Ask lookup would read from a page, so you can check a casino page before adding it.
 *   curl -sL -A "Mozilla/5.0" https://acebet.cc/redemptions | node workers/casino-ask/scripts/page-text.mjs
 * Under about 500 characters, or no mention of redemptions or terms, usually means an app shell or a block page.
 */
import { htmlToText } from '../src/text.js';

let html = '';
for await (const chunk of process.stdin) html += chunk;
const text = htmlToText(html);
console.log(text.slice(0, 4000));
console.error(`\n${text.length} characters of text.`);
