// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Daily Grass word lists. SERVER AND TESTS ONLY: the browser build swaps in
// src/client/guestDailyWords.ts (vite.config.ts), so neither the answers nor the dictionary ship to
// clients. Inside Discord the worker holds the answer and only sends tile colors back.
//
// Answers: an original list curated for Touch Grass (common, family-friendly 5-letter words; no
// slurs, nothing sexual, no money or gambling words). Every answer is also a valid guess.
// Guesses: the larger dictionary in ./dailyDictionary.ts (see that file and the README for its license).

import { GUESS_WORDS } from './dailyDictionary.js';

const ANSWER_ROWS = [
  'about above acorn actor adopt adult after again agree ahead alarm album',
  'alert alike alive allow alone along aloud amber amuse angel anger angle',
  'ankle apple apply apron arena argue arise armor aroma arrow aside awake',
  'award aware bacon badge bagel baker basic basil batch beach beard beast',
  'begin being bench berry birch birth black blade blank blaze blend bless',
  'blink block bloom board boast boost booth brain brake brave bread break',
  'brick bride brief bring brisk broad brook broom brown brush buddy build',
  'bunch bunny burst cabin cable camel candy canoe cargo carry catch cause',
  'cedar chair chalk charm chart chase cheek cheer chess chest chick chief',
  'child chili chimp chirp choir chord chunk cinch civic claim clamp clash',
  'class clean clear clerk click cliff climb clock close cloth cloud clown',
  'coach coast cobra cocoa comet comic coral couch cough count court cover',
  'craft crane crate crawl cream creek crisp crowd crown crumb crust cubic',
  'curve cycle daily dairy daisy dance delta denim depth diary dizzy dodge',
  'donut dough dozen draft drain drama dream dress drift drill drink drive',
  'eagle early earth easel eight elbow elder email ember empty enjoy enter',
  'equal error essay event every exact exist extra fable faint fairy faith',
  'false fancy feast fence ferry fetch fever field fifth fifty final first',
  'flame flash fleet flint float flock flood floor flour flute focus foggy',
  'force forge forth forty forum found frame fresh frost fruit fudge funny',
  'fuzzy gecko ghost giant given glade glass gleam globe glove goose grace',
  'grade grain grand grape graph grass gravy great green greet grill groan',
  'group grove guard guess guest guide habit happy hatch haven hazel heart',
  'heavy hedge hello hobby honey horse hotel house human humor hurry ideal',
  'igloo image inbox index inner input irony issue ivory jelly jewel jolly',
  'juice jumbo kayak kebab knack knock koala label lance large laser later',
  'laugh layer learn lemon level light lilac limit linen lions llama lodge',
  'logic loose lunar lunch magic major mango maple march marsh match mayor',
  'medal melon merit merry metal meter minty mirth mixer model month moose',
  'motor mount mouse mouth movie muddy music naval nerve never night ninja',
  'noble noise north notch novel nurse nylon oasis ocean offer often olive',
  'onion opera orbit order otter outer owner oxide paint panda panel paper',
  'party pasta patch peace peach pearl pedal perch piano picky piece pilot',
  'pinch pixel pizza place plain plane plant plate plaza plush point polar',
  'porch pouch power press pride prism proud prune pupil puppy quack quail',
  'quart queen quest quick quiet quilt quirk quote radar radio rally ranch',
  'range rapid raven reach react ready realm relax relay renew reply rhyme',
  'ridge right river roast robin robot rocky rodeo rough round route royal',
  'ruler rural salad salsa sandy satin sauce scale scarf scene scent scoop',
  'scout scrub seize serve seven shade shake shape share shark sharp sheep',
  'shelf shell shine shirt shore short shout sight silky silly since skate',
  'skill skirt skunk slate sleep slice slide slope smart smile snack snail',
  'snake sneak solar solid solve sound south space spare spark speak spice',
  'spike spine spoon sport spray squad staff stage stair stamp stand start',
  'steam steel stern stick still stone stool storm story stove straw strip',
  'study stump style sugar sunny super swamp sweep sweet swift swing sword',
  'syrup table taste teach tease thank theme thick thing think third thorn',
  'three throw thumb tiger timer toast today topic torch total touch tough',
  'tower track trail train treat trend trial tribe trick truck truly trunk',
  'trust truth tulip tutor twice twist ultra uncle under unity until upper',
  'urban usual valid valve vapor verse video vigor vinyl visit vital vivid',
  'vocal voice wagon waltz watch water whale wheat wheel while whisk whole',
  'width windy witty woman world worry wrist write yacht yearn yield young',
  'youth zebra zesty',
];

export const DAILY_ANSWERS: readonly string[] = ANSWER_ROWS.join(' ').split(' ');

let guessSet: Set<string> | null = null;

/** A guess has to be a real word: in the dictionary or one of the answers. */
export function isValidGuess(word: string): boolean {
  if (!/^[a-z]{5}$/.test(word)) return false;
  guessSet ??= new Set([...GUESS_WORDS.split(' '), ...DAILY_ANSWERS]);
  return guessSet.has(word);
}

/** Server words are the real thing; the guest stub says so too, so the UI can tell them apart. */
export const DAILY_WORDS_KIND: 'server' | 'guest' = 'server';
