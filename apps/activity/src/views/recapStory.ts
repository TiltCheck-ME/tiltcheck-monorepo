// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import type { SessionRound, SessionState } from '../state/SessionState.js';
import { calcActualRtp, calcNetPL, calcWinRate, formatCurrency } from '../utils/math.js';

type RecapMood = 'cold-start' | 'heated' | 'tilted' | 'guarded' | 'mixed';

export interface RecapTopic {
  label: string;
  detail: string;
  score: number;
}

export interface ActivityRecapStory {
  mood: RecapMood;
  headline: string;
  storyline: string;
  tiltcheckTake: string;
  topTopics: RecapTopic[];
  warnings: string[];
  smartCallout: string;
  degenCallout: string;
  roomPopulation: number;
  netPL: number;
  totalWagered: number;
  winRate: number;
  actualRtp: number;
  roundCount: number;
  hasMeaningfulData: boolean;
  safetyHooks: {
    smartExit: string;
    cooldown: string;
    scamGuard: string;
  };
}

function formatGameLabel(game: string): string {
  return game === 'dad' ? 'DA&D' : game.toUpperCase();
}

function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatUsd(value: number): string {
  return `$${Math.abs(value).toFixed(2)}`;
}

function getLossStreak(rounds: readonly SessionRound[]): number {
  let current = 0;
  let longest = 0;

  for (const round of rounds) {
    if (round.win <= round.bet) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 0;
  }

  return longest;
}

function getCurrentLossStreak(rounds: readonly SessionRound[]): number {
  let streak = 0;

  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].win <= rounds[index].bet) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function buildTopTopics(state: SessionState, netPL: number, winRate: number, roomPopulation: number): RecapTopic[] {
  const topics: RecapTopic[] = [];
  const { bonusFeed, vault, tipHistory, activeRain, currentGame, roundStage, rounds, trivia } = state;
  const verifiedBonuses = bonusFeed.filter((item) => item.is_verified).length;
  const expiredBonuses = bonusFeed.filter((item) => item.is_expired).length;
  const unverifiedBonuses = bonusFeed.length - verifiedBonuses;

  topics.push({
    label: formatGameLabel(currentGame),
    detail: roundStage === 'post-round'
      ? 'Round is settled and the lane is telling the story now.'
      : roundStage === 'in-round'
        ? 'Round is still live. Recap is reading the tape in motion.'
        : 'Lobby is staged and waiting for clean action.',
    score: rounds.length > 0 ? 6 : 2,
  });

  if (rounds.length > 0) {
    topics.push({
      label: netPL >= 0 ? 'heater check' : 'drawdown check',
      detail: `${formatCount(rounds.length, 'round')} closed ${formatCurrency(netPL)} with ${winRate.toFixed(0)}% clean wins.`,
      score: 5 + Math.min(rounds.length, 4),
    });
  }

  if (bonusFeed.length > 0) {
    topics.push({
      label: verifiedBonuses > 0 ? 'bonus hunt' : 'promo static',
      detail: `${formatCount(bonusFeed.length, 'bonus')} tracked. ${verifiedBonuses} verified, ${unverifiedBonuses} unverified, ${expiredBonuses} expired.`,
      score: 4 + Math.min(bonusFeed.length, 3),
    });
  }

  if (vault.profitGuardActive || vault.activeVaults > 0) {
    topics.push({
      label: 'profit guard',
      detail: `${formatCount(vault.activeVaults, 'vault')} online with ${formatUsd(vault.totalVaultedBalance)} locked out of punt range.`,
      score: 8,
    });
  }

  if (tipHistory.length > 0 || activeRain) {
    topics.push({
      label: 'tip flow',
      detail: activeRain
        ? `${formatCount(tipHistory.length, 'settled tip transfer')} and live rain still on deck.`
        : `${formatCount(tipHistory.length, 'settled tip transfer')} moved through the lane.`,
      score: 4 + Math.min(tipHistory.length, 3),
    });
  }

  if (roomPopulation > 1) {
    topics.push({
      label: 'room heat',
      detail: `${formatCount(roomPopulation, 'degen')} active across the shell.`,
      score: 3 + Math.min(roomPopulation, 4),
    });
  }

  if (trivia.correctAnswer) {
    topics.push({
      label: 'answer reveal',
      detail: `Correct answer locked: ${trivia.correctAnswer}.`,
      score: 7,
    });
  }

  return topics
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, 3);
}

function buildWarnings(state: SessionState, netPL: number, winRate: number, totalWagered: number): string[] {
  const warnings: string[] = [];
  const { rounds, bonusFeed, vault, activeRain } = state;
  const longestLossStreak = getLossStreak(rounds);
  const currentLossStreak = getCurrentLossStreak(rounds);
  const expiredBonuses = bonusFeed.filter((item) => item.is_expired).length;
  const unverifiedBonuses = bonusFeed.filter((item) => !item.is_verified).length;

  if (rounds.length === 0) {
    warnings.push('No round tape yet. Recap stays in watch mode until the first live press lands.');
  }

  if (currentLossStreak >= 3 || longestLossStreak >= 4) {
    warnings.push(`Loss streak hit ${Math.max(currentLossStreak, longestLossStreak)}. Cooldown energy is missing from this lane.`);
  }

  if (rounds.length >= 4 && winRate <= 35) {
    warnings.push(`Hit rate is stuck at ${winRate.toFixed(0)}%. That is chase bait, not a strategy.`);
  }

  if (netPL < 0 && totalWagered > 0 && !vault.profitGuardActive && vault.activeVaults === 0) {
    warnings.push(`The lane is ${formatCurrency(netPL)} with no guard rails live. That is how small leaks turn into punt sessions.`);
  }

  if (expiredBonuses > 0) {
    warnings.push(`${formatCount(expiredBonuses, 'expired bonus')} still sitting in feed. Dead promos create dead reads.`);
  }

  if (unverifiedBonuses > 0) {
    warnings.push(`${formatCount(unverifiedBonuses, 'unverified bonus')} needs a trust check before anybody treats it like real value.`);
  }

  if (activeRain?.claimable) {
    warnings.push('Claimable tip rain is still hanging. Leaving free EV on the floor is pure degen work.');
  }

  if (warnings.length === 0) {
    warnings.push('No hard red flags. The room stayed inside the rails this cycle.');
  }

  return warnings.slice(0, 3);
}

function detectMood(story: {
  hasMeaningfulData: boolean;
  netPL: number;
  winRate: number;
  roundCount: number;
  warnings: string[];
  vaultActive: boolean;
  verifiedBonuses: number;
}): RecapMood {
  if (!story.hasMeaningfulData) {
    return 'cold-start';
  }

  if (
    story.netPL < 0
    && story.roundCount >= 3
    && (story.winRate < 40 || story.warnings.some((warning) => warning.includes('Loss streak')))
  ) {
    return 'tilted';
  }

  if (story.vaultActive || story.verifiedBonuses > 0) {
    return 'guarded';
  }

  if (story.netPL > 0 && story.winRate >= 50) {
    return 'heated';
  }

  return 'mixed';
}

function buildHeadline(mood: RecapMood, gameLabel: string, roundCount: number, netPL: number): string {
  switch (mood) {
    case 'cold-start':
      return 'No real tape yet. The room is staged, but recap has not earned a hot take.';
    case 'heated':
      return `The lane came in hot. ${gameLabel} printed ${formatCount(roundCount, 'round')} and closed ${formatCurrency(netPL)}.`;
    case 'tilted':
      return `The tape got greasy. ${gameLabel} chewed through ${formatCurrency(netPL)} and the chase meter is lit.`;
    case 'guarded':
      return `The room stayed sharp. ${gameLabel} kept moving, but the protection stack actually showed up.`;
    default:
      return `The degen tape was mixed. ${gameLabel} moved, but the room never fully picked a lane.`;
  }
}

function buildStoryline(
  mood: RecapMood,
  state: SessionState,
  roundCount: number,
  netPL: number,
  winRate: number,
  roomPopulation: number,
): string {
  const { bonusFeed, vault, tipHistory, activeRain } = state;
  const verifiedBonuses = bonusFeed.filter((item) => item.is_verified).length;
  const roomLine = roomPopulation > 1 ? `${formatCount(roomPopulation, 'degen')} stayed active in the room.` : 'This lane was mostly solo.';
  const protectionLine = vault.profitGuardActive || vault.activeVaults > 0
    ? `${formatCount(vault.activeVaults, 'vault')} held ${formatUsd(vault.totalVaultedBalance)} behind guard.`
    : 'No protection stack showed up.';
  const bonusLine = bonusFeed.length > 0
    ? `${formatCount(bonusFeed.length, 'bonus')} hit the board with ${verifiedBonuses} clean enough to trust.`
    : 'Bonus chatter stayed quiet.';
  const tipLine = activeRain || tipHistory.length > 0
    ? `Tip flow stayed alive with ${formatCount(tipHistory.length, 'settled transfer')}${activeRain ? ' plus live rain in orbit' : ''}.`
    : 'Tip flow never became the story.';

  switch (mood) {
    case 'cold-start':
      return 'Home, Play, and Bonuses are armed, but this recap stays local and honest until the first real event prints.';
    case 'heated':
      return `${roundCount} rounds landed at ${winRate.toFixed(0)}% wins for ${formatCurrency(netPL)}. ${roomLine} ${tipLine}`;
    case 'tilted':
      return `${roundCount} rounds dragged win rate down to ${winRate.toFixed(0)}% and left the lane ${formatCurrency(netPL)}. ${protectionLine}`;
    case 'guarded':
      return `${roundCount} rounds closed ${formatCurrency(netPL)} while ${protectionLine} ${bonusLine}`;
    default:
      return `${roundCount} rounds closed ${formatCurrency(netPL)} with ${winRate.toFixed(0)}% wins. ${roomLine} ${bonusLine}`;
  }
}

function buildTiltCheckTake(mood: RecapMood): string {
  switch (mood) {
    case 'cold-start':
      return 'Do not hallucinate a pattern from an empty board. Let the lane print first.';
    case 'heated':
      return 'Good momentum. Do not turn one clean heater into hero-ball nonsense.';
    case 'tilted':
      return 'Cooldown beats cope. Lock the guard, cut the chase, and wait for a cleaner setup.';
    case 'guarded':
      return 'Protection stayed online. Keep farming clean value instead of forcing the next round.';
    default:
      return 'Some signals were clean and some were pure static. Make the next round prove itself.';
  }
}

function buildSafetyHooks(
  state: SessionState,
  netPL: number,
  totalWagered: number,
): ActivityRecapStory['safetyHooks'] {
  const { bonusFeed, rounds, vault, roundStage } = state;
  const currentLossStreak = getCurrentLossStreak(rounds);
  const readyVerifiedBonuses = bonusFeed.filter((item) => item.is_verified && !item.is_expired).length;
  const unverifiedBonuses = bonusFeed.filter((item) => !item.is_verified).length;
  const expiredBonuses = bonusFeed.filter((item) => item.is_expired).length;

  let smartExit = 'Flat tape still counts. Leaving without a forced punt is disciplined work.';
  if (vault.profitGuardActive || vault.activeVaults > 0) {
    smartExit = `Protection made the exit easy. ${formatCount(vault.activeVaults, 'vault')} kept ${formatUsd(vault.totalVaultedBalance)} off the table.`;
  } else if (netPL > 0 && rounds.length > 0) {
    smartExit = `Booked ${formatCurrency(netPL)} and did not turn a clean read into hero-ball. Bank that.`;
  } else if (readyVerifiedBonuses > 0) {
    smartExit = `${formatCount(readyVerifiedBonuses, 'verified bonus')} gave the room a clean grab. One hit is enough.`;
  }

  let cooldown = roundStage === 'post-round'
    ? 'Recap is the cooldown surface. Read the tape before you queue the next lap.'
    : 'No hard cooldown alarm. Keep the next spot honest.';
  if (currentLossStreak >= 3) {
    cooldown = `${formatCount(currentLossStreak, 'loss')} in a row says stop. Cooldown has more edge than another chase.`;
  } else if (netPL < 0 && totalWagered > 0) {
    cooldown = `The lane is ${formatCurrency(netPL)} on ${formatUsd(totalWagered)} wagered. Cool off before you reload.`;
  }

  let scamGuard = 'No obvious promo scam signal. Keep the same trust standard next cycle.';
  if (unverifiedBonuses > 0) {
    scamGuard = `${formatCount(unverifiedBonuses, 'promo')} still needs a trust check. Source, link, and code all matter.`;
  } else if (expiredBonuses > 0) {
    scamGuard = `${formatCount(expiredBonuses, 'expired promo')} is still floating around. Dead promos are bait, not value.`;
  }

  return { smartExit, cooldown, scamGuard };
}

function buildSmartCallout(state: SessionState, netPL: number): string {
  const { bonusFeed, vault, tipHistory, feeSavedSol, isElite, rounds } = state;
  const verifiedBonuses = bonusFeed.filter((item) => item.is_verified).length;

  if (vault.profitGuardActive || vault.activeVaults > 0) {
    return `Profit guard stayed live with ${formatCount(vault.activeVaults, 'vault')} and ${formatUsd(vault.totalVaultedBalance)} tucked away.`;
  }

  if (verifiedBonuses > 0) {
    return `${formatCount(verifiedBonuses, 'verified bonus')} kept the bonus lane on trusted ground instead of blind clicking.`;
  }

  if (tipHistory.length > 0) {
    return `${formatCount(tipHistory.length, 'tip transfer')} actually settled. The lane converted chatter into value.`;
  }

  if (isElite || feeSavedSol > 0) {
    return `Elite routing shaved ${feeSavedSol.toFixed(3)} SOL off fees. That is disciplined edge, not cosplay.`;
  }

  if (rounds.length > 0 && netPL >= 0) {
    return `Closed ${formatCurrency(netPL)} and knew where to stop. That is a real cash-out, not fake discipline.`;
  }

  return 'Smart move is patience. Wait for real tape before pretending there is a story.';
}

function buildDegenCallout(state: SessionState, netPL: number, totalWagered: number): string {
  const { bonusFeed, activeRain, rounds, vault } = state;
  const currentLossStreak = getCurrentLossStreak(rounds);
  const expiredBonuses = bonusFeed.filter((item) => item.is_expired).length;

  if (currentLossStreak >= 3) {
    return `Pressed through a ${currentLossStreak}-round slide. That is classic chase fuel.`;
  }

  if (activeRain?.claimable) {
    return 'Tip rain is live and still claimable. Leaving free EV untouched is degen behavior.';
  }

  if (expiredBonuses > 0) {
    return `${formatCount(expiredBonuses, 'expired bonus')} is still cluttering the board. Dead promos are bait.`;
  }

  if (rounds.length > 0 && netPL < 0 && totalWagered > 0 && !vault.profitGuardActive && vault.activeVaults === 0) {
    return `Ran ${formatUsd(totalWagered)} through the lane while underwater and unprotected. Tighten it up.`;
  }

  return 'Degen move would be forcing a recap out of empty data. This board does not do fake conviction.';
}

export function buildActivityRecapStory(state: SessionState): ActivityRecapStory {
  const rounds = state.rounds;
  const netPL = calcNetPL(rounds);
  const totalWagered = rounds.reduce((sum, round) => sum + round.bet, 0);
  const winRate = calcWinRate(rounds);
  const actualRtp = calcActualRtp(rounds);
  const roomPopulation = Math.max(state.participantCount, state.channelSessions.size + 1);
  const verifiedBonuses = state.bonusFeed.filter((item) => item.is_verified).length;
  const hasMeaningfulData = (
    rounds.length > 0
    || state.bonusFeed.length > 0
    || state.tipHistory.length > 0
    || Boolean(state.activeRain)
    || state.channelSessions.size > 0
    || state.vault.activeVaults > 0
    || state.vault.profitGuardActive
    || Boolean(state.trivia.correctAnswer)
    || state.roundStage !== 'lobby'
  );
  const warnings = buildWarnings(state, netPL, winRate, totalWagered);
  const safetyHooks = buildSafetyHooks(state, netPL, totalWagered);
  const mood = detectMood({
    hasMeaningfulData,
    netPL,
    winRate,
    roundCount: rounds.length,
    warnings,
    vaultActive: state.vault.profitGuardActive || state.vault.activeVaults > 0,
    verifiedBonuses,
  });
  const gameLabel = formatGameLabel(state.currentGame);

  return {
    mood,
    headline: buildHeadline(mood, gameLabel, rounds.length, netPL),
    storyline: buildStoryline(mood, state, rounds.length, netPL, winRate, roomPopulation),
    tiltcheckTake: buildTiltCheckTake(mood),
    topTopics: buildTopTopics(state, netPL, winRate, roomPopulation),
    warnings,
    smartCallout: buildSmartCallout(state, netPL),
    degenCallout: buildDegenCallout(state, netPL, totalWagered),
    roomPopulation,
    netPL,
    totalWagered,
    winRate,
    actualRtp,
    roundCount: rounds.length,
    hasMeaningfulData,
    safetyHooks,
  };
}
