/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

export type LoungeTriviaCard = {
  active: boolean;
  note: string;
  gameId?: string;
  playerCount?: number;
};

export function loungeTriviaCard(live: { gameId: string; playerCount: number } | null): LoungeTriviaCard {
  if (!live) {
    return {
      active: false,
      note: 'No trivia night yet. Hosts schedule from the existing arena. Optional prizes are Rain from the host pouch. No entry fees.',
    };
  }
  return {
    active: true,
    gameId: live.gameId,
    playerCount: live.playerCount,
    note: 'Live trivia is the arena game. Prizes, if any, come from the host. No entry fees.',
  };
}
