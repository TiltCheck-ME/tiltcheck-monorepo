// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Guest-mode Myth or Math general cards: five practice cards copied from src/shared/mythGeneral.ts
// (same text, answer and why; sources are noted there). No money-words exception here.

type Row = [id: string, text: string, truth: boolean, why: string];

export const GUEST_GENERAL_ROWS: Row[] = [
  ['h02', 'Most people only use 10% of their brain.', false, 'Brain scans show activity across nearly the whole brain over a day. No part sits idle.'],
  ['h03', 'Lightning can strike the same place twice.', true, 'Tall structures get hit over and over. The Empire State Building takes about 20 to 25 strikes a year.'],
  ['h35', 'In a group of 23 people, there is a better than even chance two share a birthday.', true, 'With 23 people there are 253 possible pairs. The chance of a shared birthday is about 50.7%.'],
  ['h38', 'A 50% rise followed by a 50% drop gets you back where you started.', false, 'Up 50% then down 50% leaves you at 75%. The drop is taken from a bigger number.'],
  ['h14', 'Octopuses have three hearts.', true, 'Two pump blood through the gills and one pumps it around the rest of the body.'],
];
