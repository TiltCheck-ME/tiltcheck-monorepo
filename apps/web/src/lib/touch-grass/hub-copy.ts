// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

export type TouchGrassMode = 'public' | 'pause';

export function parseTouchGrassMode(search: { get(name: string): string | null }): TouchGrassMode {
  return search.get('mode') === 'pause' ? 'pause' : 'public';
}

export const TOUCH_GRASS_HUB = {
  title: 'Touch Grass',
  lede: 'Casino tab is cooked. Sit at a table that is not a spin.',
  idleSoon: 'No drop running. Play a practice table or wait. soon™',
  triviaPane: 'Live Trivia',
  dadPane: 'Degens Against Decency',
  dadDiscordOnly:
    'Practice prompts and offline cards. Reset your headspace before touching a casino tab again.',
} as const;

export const PAUSE_HIDDEN_CTA_HREFS = ['/pay/jackpot', '/tools/degens-arena'] as const;
export const PAUSE_HIDDEN_CTA_LABELS = ['treasury', 'jackpot', 'join drop', 'Join drop'] as const;

export function shouldShowMoneyCta(mode: TouchGrassMode): boolean {
  return mode === 'public';
}
