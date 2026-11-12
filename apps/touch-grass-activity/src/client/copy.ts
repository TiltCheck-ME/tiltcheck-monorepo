// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// All player-facing copy. Voice: short, blunt, degen. You run your own session.
// No money mechanics, no rewards, no crisis copy in the main UI (tests/no-money.test.ts checks this file).

export const COPY = {
  appTitle: 'Touch Grass',
  lobbyLede: 'Step away from the reels. Sit at a table that is not a spin.',
  whoHere: "Who's here",
  nobodyHere: 'Just you. Invite the group chat.',
  tiles: {
    dad: { name: 'Degens Against Decency', desc: 'Worst card wins. 3 to 8 players. Points are bragging rights.' },
    brk: { name: 'Touch Grass break', desc: 'Pick 5, 10 or 15. One clock for the whole call.' },
    trivia: { name: 'Trivia', desc: 'Coming soon.' },
  },
  back: 'Lobby',
  guestBanner: 'Guest mode. Fake local user, nothing leaves this browser.',
  connecting: 'Loading the table...',
  offline: 'Lost the room. Reconnecting.',
  polling: 'Live link dropped. Checking in every few seconds.',
  dad: {
    seatingTitle: 'Pull up a chair',
    seatingBody: (n: number) => `${n} seated. Need 3 to 8. First to the target wins.`,
    sit: 'Deal me in',
    stand: 'Stand up',
    start: 'Start game',
    target: 'Points to win',
    waitingForNext: "You're in line. Dealt in next round.",
    spectating: 'Spectating. Hit "Deal me in" to join next round.',
    judgeWait: (done: number, need: number) => `You're judging. ${done}/${need} cards in.`,
    pickTitle: 'Pick the worst best answer',
    judgingOthers: 'Judge is reading. Look innocent.',
    submitted: 'Card is in. No take-backs.',
    playCard: 'Play a card',
    nextRound: 'Next round',
    roundWinner: (name: string) => `${name} takes the point.`,
    judgeLeft: 'Judge dipped. Round skipped, cards back in hands.',
    notEnough: 'Table dropped under 3. Paused until someone sits down.',
    paused: 'Paused. Need 3 players to keep going.',
    resume: 'Resume',
    gameOver: (name: string) => `${name} wins. Bragging rights only. Go touch grass.`,
    playAgain: 'Run it back',
    judgeTag: 'JUDGE',
  },
  brk: {
    title: 'Touch Grass break',
    idleBody: 'One shared clock for everyone in the call. Bailing is allowed. It will be noted.',
    pick: 'How long?',
    minutes: (m: number) => `${m} min`,
    start: (m: number) => `Start ${m} min break`,
    runningTitle: 'Grass in progress',
    runningBody: 'Phone down. Stand up. The tab will still be there.',
    bail: 'Bail early',
    bailedTitle: 'You bailed',
    crew: 'Still out there',
    doneTitle: 'Break over',
    stuckIt: 'Stuck it out',
    bailedList: 'Folded early',
    nobodyStuck: 'Nobody made it. Legendary.',
    shareCard: (m: number) => `${m} minute Touch Grass break`,
    share: 'Share to chat',
    copy: 'Copy result',
    copied: 'Copied.',
    again: 'New break',
    left: 'left the call',
  },
} as const;

/** Roasts for bailing early. {t} is the m:ss they lasted. */
export const BAIL_ROASTS: readonly string[] = [
  'Bailed at {t}. The grass filed a missing persons report.',
  '{t} in. Goldfish are taking notes.',
  'Out at {t}. Speedrun of folding, any%.',
  'Tapped out at {t}. Bold of you to call that a break.',
  '{t}. The couch wins again.',
  'Lasted {t}. Your attention span wants a word.',
  '{t} and done. The outdoors will survive the loss.',
  'Folded at {t}. Even the pigeons stayed longer.',
];

export function roastFor(userId: string, bailedAtMs: number, clock: string): string {
  let h = 0;
  for (const ch of `${userId}:${bailedAtMs}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const line = BAIL_ROASTS[h % BAIL_ROASTS.length] ?? BAIL_ROASTS[0] ?? '';
  return line.replace('{t}', clock);
}
