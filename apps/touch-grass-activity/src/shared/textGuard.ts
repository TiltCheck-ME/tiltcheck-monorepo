// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Free text that players type (Bluff statements). Two jobs, both server side:
//   1. cleanText: normalise (NFKC), strip control / zero-width / bidi characters, collapse spaces.
//   2. hasSlur: a LIGHT, slur-only blocklist. Not a profanity filter: swearing is fine, slurs are not.
//
// DA&D (TiltCheck-ME/DegensAgainstDecency) has no free-text filter of its own, and Touch Grass DA&D
// is cards only, so this list is new. It is deliberately short and matches whole words only (plus
// light leetspeak, stretched letters and spaced-out letters) to keep false positives near zero.
// Rendering safety is separate: every client view escapes text with esc() before it hits the DOM.
//
// The stems are ROT13 so the source and the browser bundle do not carry slurs in plain text.

// Words left out on purpose because they are also everyday words or phrases (false positives):
// "chink" (in the armor), "coon" (hound), "sambo" (the martial art), "spic" + -y/-ed (spicy, spiced).
const ROT13_STEMS = [
  'avttre', 'avttn', 'avtt', 'snttbg', 'snt', 'xvxr', 'tbbx', 'jrgonpx',
  'genaal', 'genaavr', 'ergneq', 'enturnq', 'gbjryurnq', 'ornare', 'cnxv', 'qlxr', 'wvtnobb',
];
/** Stems that only take a plain plural (so "spicy" and "spiced" stay legal). */
const ROT13_PLURAL_ONLY = ['fcvp'];

function rot13(s: string): string {
  return s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
}

const SUFFIX = '(?:s|z|es|ed|ing)?';

/** "faggot" -> f+a+g{2,}o+t+ : stretched letters match, but a doubled letter must stay doubled. */
function stemPattern(stem: string): string {
  let out = '';
  for (let i = 0; i < stem.length; ) {
    let j = i;
    while (stem[j] === stem[i]) j += 1;
    const run = j - i;
    out += run > 1 ? `${stem[i]}{${run},}` : `${stem[i]}+`;
    i = j;
  }
  return out;
}

const SLUR_RE = new RegExp(
  `^(?:(?:${ROT13_STEMS.map((s) => stemPattern(rot13(s))).join('|')})${SUFFIX}|(?:${ROT13_PLURAL_ONLY.map((s) => stemPattern(rot13(s))).join('|')})s?)$`,
);

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '9': 'g', '6': 'g', '8': 'b', '|': 'l', '+': 't' };

// Control chars, zero-width, bidi overrides, BOM, soft hyphen.
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;

/** Normalise player text for storage and display. */
export function cleanText(raw: string): string {
  return raw.normalize('NFKC').replace(/\s+/g, ' ').replace(INVISIBLE, '').replace(/ {2,}/g, ' ').trim();
}

/** Length in characters the way a person counts them (code points, not UTF-16 units). */
export function charCount(s: string): number {
  return [...s].length;
}

function tokens(text: string): string[] {
  const lowered = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[0-9!@$|+]/g, (c) => LEET[c] ?? c);
  return lowered.split(/[^a-z]+/).filter(Boolean);
}

/** True when the text contains a slur as a word, including "n i g g e r" / "n.i.g.g.e.r" spellings. */
export function hasSlur(text: string): boolean {
  const words = tokens(text);
  if (words.some((w) => SLUR_RE.test(w))) return true;
  // Runs of single letters joined back together.
  let run = '';
  for (const w of [...words, '']) {
    if (w.length === 1) {
      run += w;
      continue;
    }
    if (run.length >= 3 && SLUR_RE.test(run)) return true;
    run = '';
  }
  return false;
}
