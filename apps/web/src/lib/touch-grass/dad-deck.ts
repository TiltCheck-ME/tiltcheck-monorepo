// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

export type DadHand = {
  prompt: string;
  cards: string[];
};

export const DAD_PROMPTS = [
  "I'm not tilted, I'm just _____.",
  "The last time I said I'm due, I actually _____.",
  'Bankroll management, according to me, is _____.',
  'I cashed out once. Then I _____.',
  'My accountability buddy is currently _____.',
  'The house is not the problem. The problem is _____.',
  'If this session had a title it would be _____.',
] as const;

export const DAD_WHITE_CARDS = [
  'one more spin, no cap',
  'a heater that was actually variance',
  'rinsing what was left of rent',
  'wen win, except never',
  "the gambler's fallacy with extra steps",
  'asking Discord if this is a skem',
  'locking in after already being cooked',
  'soon™, said the bonus terms',
  'blaming the slot, never the session',
  "texting I'm due like it's a strategy",
  'a timeout I already skipped',
  'watching the graph go red and max betting',
] as const;

function pickFour(cards: readonly string[]): string[] {
  const pool = [...cards];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = pool[i];
    const swap = pool[j];
    if (current === undefined || swap === undefined) {
      continue;
    }
    pool[i] = swap;
    pool[j] = current;
  }
  return pool.slice(0, 4);
}

export function nextDadHand(excludePrompt?: string): DadHand {
  const filtered = excludePrompt ? DAD_PROMPTS.filter((prompt) => prompt !== excludePrompt) : [...DAD_PROMPTS];
  const pickFrom = filtered.length > 0 ? filtered : [...DAD_PROMPTS];
  const prompt = pickFrom[Math.floor(Math.random() * pickFrom.length)] ?? DAD_PROMPTS[0];
  return {
    prompt,
    cards: pickFour(DAD_WHITE_CARDS),
  };
}

export function revealDadPlay(prompt: string, card: string): string {
  if (prompt.includes('_____')) {
    return prompt.replace('_____', card);
  }
  return `${prompt} ${card}`;
}
