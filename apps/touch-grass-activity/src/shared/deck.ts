// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Degens Against Decency deck. Original TiltCheck cards only, no AI generation.
// Sources: apps/web/src/lib/touch-grass/dad-deck.ts and modules/dad starter pack, plus new cards.
// Rule for this deck: no money mechanics in the copy (see tests/no-money.test.ts).

export interface Card {
  id: string;
  text: string;
}

export const BLANK = '_____';

export const PROMPTS: readonly string[] = [
  // from apps/web dad-deck.ts
  "I'm not tilted, I'm just _____.",
  'The last time I said I was due, I actually _____.',
  'Bankroll management, according to me, is _____.',
  'I cashed out once. Then I _____.',
  'My accountability buddy is currently _____.',
  'The house is not the problem. The problem is _____.',
  'If this session had a title it would be _____.',
  // from modules/dad starter pack
  'I knew I was tilting when _____.',
  'After _____, I decided to take a break.',
  'My biggest regret as a degen? _____.',
  'What wrecked my whole week? _____.',
  // new
  'New personal record: _____.',
  'Discord mods hate this one trick: _____.',
  'Nobody: ... Me at 4 AM: _____.',
  'The group chat went silent after I posted _____.',
  'My villain origin story is _____.',
  "Touch grass? I'd rather touch _____.",
  '_____: the real house edge.',
  'Step one of my comeback arc: _____.',
  'My love language is _____.',
  'The vibes were immaculate until _____.',
  'I said I was at work. I was actually _____.',
  'Breaking news: local degen discovers _____.',
  "I'm built different. Specifically, I'm built out of _____.",
  'Rock bottom has a basement and it is called _____.',
  'The only thing I am consistent at is _____.',
  'My sleep schedule was taken out by _____.',
  'Peak performance looks like _____.',
  'Tonight on Degen Documentaries: _____.',
  'Doctors are baffled by _____.',
];

export const WHITE_CARDS: readonly string[] = [
  // from apps/web dad-deck.ts
  'one more spin, no cap',
  'a heater that was actually variance',
  'wen win, except never',
  "the gambler's fallacy with extra steps",
  'asking Discord if this is a skem',
  'locking in after already being cooked',
  'soon, said the bonus terms',
  'blaming the slot, never the session',
  "texting I'm due like it's a strategy",
  'a timeout I already skipped',
  'watching the graph go red and doubling down',
  // from modules/dad starter pack
  'rage spinning at 3 AM',
  'a sketchy Discord promo link',
  'getting the bonus nerfed mid-session',
  'chasing losses until sunrise',
  'blaming RTP for everything',
  'one more spin before bed',
  // new
  'a 47-message voice note',
  'refreshing the same page for six hours',
  'a strategy I saw on TikTok',
  'my lucky hoodie that has never been lucky',
  'calling it a data-gathering session',
  'the third energy drink of the morning',
  'my screen time report',
  'a group chat named "we are so back"',
  'it being over, and also us being so back',
  'muting the friend who asks if I am okay',
  'narrating my own downfall in voice chat',
  'a spreadsheet I abandoned on row 4',
  'blaming the Wi-Fi',
  'pretending the L was content',
  'a sigma grindset at 3:47 AM',
  'my ex, somehow',
  'a cold shower and zero lessons learned',
  'whispering "trust the process"',
  'unread texts from my mom',
  'a podcast about discipline at 2x speed',
  'the gremlin that lives in my brain',
  'shrimp-sized self-control',
  'clout chasing in a 12-person server',
  'an apology post drafted in my notes app',
  'a pigeon with better impulse control than me',
  'getting ratioed by a bot',
  'my last two brain cells fighting',
  'going outside and immediately coming back',
  'a nap that turned into a lifestyle',
  'reading the terms and conditions for once',
  'a hustle guru with a rented Lambo',
  'the main character energy of a houseplant',
  'calling an L "a lesson" for the ninth time',
  'microwaved pizza at 5 AM',
  'a "quick one" that lasted four hours',
  'my thumbs filing for workers comp',
  'a notification I am scared to open',
  'yelling "WHY" at an algorithm',
  'grandma asking what I do for a living',
  'hearing "you good?" and lying',
  'a streak I am too proud to end',
  'unironically saying "variance"',
  'the copium reserves',
  'a lucky number that is just my birthday',
  'a gut feeling with zero receipts',
  'skipping lunch to stay locked in',
  'deleting the app, then redownloading the app',
  'the water I keep promising to drink',
  'a 10-minute break that lasted 10 seconds',
  'my dog judging me from the doorway',
  'a crash out with a live audience',
  'one brain cell working a double shift',
  'claiming I was just testing the waters',
  'the chat spamming L',
  'a sunrise I did not ask to see',
  'a harmless side quest',
  'astrology, but for bad decisions',
  'logging off like a responsible adult (lie)',
  'touching grass and finding it mid',
  'a mod who has seen too much',
  'screaming into a pillow, strategically',
  'a vibe check I failed out loud',
  'the "I can stop whenever" speech',
  'speedrunning a bad mood',
];

export function promptCards(): Card[] {
  return PROMPTS.map((text, i) => ({ id: `p${i}`, text }));
}

export function whiteCards(): Card[] {
  return WHITE_CARDS.map((text, i) => ({ id: `w${i}`, text }));
}

export function fillPrompt(prompt: string, answer: string): string {
  return prompt.includes(BLANK) ? prompt.replace(BLANK, answer) : `${prompt} ${answer}`;
}
