/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */

export interface CommunityDefaultCasino {
  name: string;
  monitoredDomain?: string;
  aliases?: readonly string[];
}

export const COMMUNITY_DEFAULT_CASINOS: readonly CommunityDefaultCasino[] = [
  { name: 'MyPrize US', monitoredDomain: 'myprize.us' },
  { name: 'Crown Coins Casino', monitoredDomain: 'crowncoinscasino.com' },
  { name: 'Rolla', monitoredDomain: 'rolla.com' },
  { name: 'WOW Vegas', monitoredDomain: 'wowvegas.com' },
  { name: 'Modo Casino', monitoredDomain: 'modo.us', aliases: ['Modo'] },
  { name: 'Gains.com', monitoredDomain: 'gains.com', aliases: ['Gains'] },
  { name: 'LoneStar Casino' },
  { name: 'Real Prize', monitoredDomain: 'realprize.com' },
  { name: 'MegaBonanza', monitoredDomain: 'megabonanza.com', aliases: ['Mega Bonanza'] },
  { name: 'Jackpota', monitoredDomain: 'jackpota.com' },
  { name: 'McLuck', monitoredDomain: 'mcluck.com' },
  { name: 'Hello Millions', monitoredDomain: 'hellomillions.com' },
  { name: 'PlayFame', monitoredDomain: 'playfame.com' },
  { name: 'SpinBlitz' },
  { name: 'Ace.com', aliases: ['Ace'] },
  { name: 'Spindoo' },
  { name: 'Pulsz', monitoredDomain: 'pulsz.com' },
  { name: 'Pulsz Bingo', monitoredDomain: 'pulszbingo.com' },
  { name: 'Stake.us', monitoredDomain: 'stake.us' },
  { name: 'LuckyLand Slots', monitoredDomain: 'luckylandslots.com', aliases: ['Luckyland Slots'] },
  { name: 'Chumba Casino', monitoredDomain: 'chumbacasino.com' },
  { name: 'Global Poker', monitoredDomain: 'globalpoker.com' },
  { name: 'Zula Casino', monitoredDomain: 'zulacasino.com' },
  { name: 'Sportzino', monitoredDomain: 'sportzino.com' },
  { name: 'American Luck', monitoredDomain: 'americanluck.com' },
  { name: 'Yay Casino' },
  { name: 'Shuffle.us', monitoredDomain: 'shuffle.us', aliases: ['Shuffle US'] },
  { name: 'Chanced', monitoredDomain: 'chanced.com' },
  { name: 'Punt', monitoredDomain: 'punt.com' },
  { name: 'Spinfinite' },
  { name: 'Lunaland Casino' },
  { name: 'Baba Casino' },
  { name: 'Spree', monitoredDomain: 'spree.com' },
  { name: 'Dara Casino' },
  { name: "Chip'n WIN", aliases: ['Chip n WIN'] },
  { name: 'JefeBet Casino' },
  { name: 'Rolling Riches' },
  { name: 'LuckyStake' },
  { name: 'Lucky Hands' },
  { name: 'SpinQuest' },
  { name: 'Zoot', monitoredDomain: 'getzoot.us' },
  { name: 'High 5 Casino', monitoredDomain: 'high5casino.com' },
  { name: 'Gold Machine' },
] as const;

export function normalizeCasinoName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const communityDefaultPriority = new Map<string, number>();

for (const [index, casino] of COMMUNITY_DEFAULT_CASINOS.entries()) {
  const priority = index + 1;
  communityDefaultPriority.set(normalizeCasinoName(casino.name), priority);

  for (const alias of casino.aliases ?? []) {
    communityDefaultPriority.set(normalizeCasinoName(alias), priority);
  }
}

export const COMMUNITY_DEFAULT_MONITORED_CASINOS = COMMUNITY_DEFAULT_CASINOS
  .map(casino => casino.monitoredDomain)
  .filter((domain): domain is string => Boolean(domain));

export function getCommunityDefaultCasinoPriority(name: string): number {
  return communityDefaultPriority.get(normalizeCasinoName(name)) ?? Number.MAX_SAFE_INTEGER;
}

export function isCommunityDefaultCasino(name: string): boolean {
  return communityDefaultPriority.has(normalizeCasinoName(name));
}
