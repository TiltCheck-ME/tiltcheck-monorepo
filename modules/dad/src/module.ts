/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * DA&D (Degens Against Decency) Module
 * AI-powered card game for Discord communities
 * 
 * Features:
 * - White cards (answers) and Black cards (prompts)
 * - AI-generated card packs via AI Gateway
 * - Player matching and voting
 * - Score tracking and leaderboards
 * - Seasonal and themed expansions
 */

import { eventRouter } from '@tiltcheck/event-router';
import { v4 as uuidv4 } from 'uuid';
import type { TiltCheckEvent } from '@tiltcheck/types';

// AI Gateway client for card generation
let aiClient: any = null;

// Initialize AI client dynamically
async function getAIClient() {
  if (!aiClient) {
    try {
      const module = await import('@tiltcheck/ai-client');
      aiClient = module.aiClient;
    } catch {
      console.log('[DA&D] AI client not available, using default cards only');
    }
  }
  return aiClient;
}

// Card types
export interface WhiteCard {
  id: string;
  text: string;
  packId: string;
}

export interface BlackCard {
  id: string;
  text: string;
  blanks: number; // Number of _____ in the text
  packId: string;
}

export interface CardPack {
  id: string;
  name: string;
  description: string;
  theme: string;
  whiteCards: WhiteCard[];
  blackCards: BlackCard[];
  isOfficial: boolean;
  createdAt: number;
}

// Game types
export interface Player {
  userId: string;
  username: string;
  score: number;
  hand: WhiteCard[];
}

export interface GameRound {
  roundNumber: number;
  blackCard: BlackCard;
  judgeUserId: string;
  phase: 'submitting' | 'revealing' | 'scored';
  submitDeadlineAt: number;
  revealStartedAt?: number;
  submissions: Map<string, WhiteCard[]>; // userId -> cards
  revealedSubmissions: Array<{ userId: string; cards: WhiteCard[] }>;
  votes: Map<string, string>; // voterId -> submissionUserId
  winner?: string;
  endedAt?: number;
}

export interface Game {
  id: string;
  channelId: string;
  players: Map<string, Player>;
  status: 'waiting' | 'active' | 'completed';
  currentRound: number;
  rounds: GameRound[];
  cardPacks: string[]; // Pack IDs in use
  maxRounds: number;
  maxPlayers: number;
  submitWindowMs: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface SerializedGameRound {
  roundNumber: number;
  blackCard: BlackCard;
  judgeUserId: string;
  phase: 'submitting' | 'revealing' | 'scored';
  submitDeadlineAt: number;
  revealStartedAt?: number;
  submissions: Array<{ userId: string; cards: WhiteCard[] }>;
  revealedSubmissions: Array<{ userId: string; cards: WhiteCard[] }>;
  votes: Array<{ voterId: string; submissionUserId: string }>;
  winner?: string;
  endedAt?: number;
}

export interface SerializedGameState {
  id: string;
  channelId: string;
  players: Player[];
  status: 'waiting' | 'active' | 'completed';
  currentRound: number;
  rounds: SerializedGameRound[];
  cardPacks: string[];
  maxRounds: number;
  maxPlayers: number;
  submitWindowMs: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export class DADModule {
  private games: Map<string, Game> = new Map();
  private cardPacks: Map<string, CardPack> = new Map();
  
  constructor() {
    this.initializeDefaultPacks();
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions(): void {
    // Listen for game events if needed
    eventRouter.subscribe(
      'game.started',
      async (event: TiltCheckEvent) => {
        console.log('[DA&D] Game started:', event.data);
      },
      'dad'
    );
  }

  /**
   * Initialize default card packs
   */
  private initializeDefaultPacks(): void {
    // Degen Starter Pack
    const degenPack: CardPack = {
      id: 'degen-starter',
      name: 'Degen Starter Pack',
      description: 'Essential cards for degens',
      theme: 'casino',
      isOfficial: true,
      createdAt: Date.now(),
      whiteCards: [
        { id: uuidv4(), text: 'Rage spinning at 3 AM', packId: 'degen-starter' },
        { id: uuidv4(), text: 'Losing your entire bankroll', packId: 'degen-starter' },
        { id: uuidv4(), text: 'A sketchy Discord promo link', packId: 'degen-starter' },
        { id: uuidv4(), text: 'Hitting max win on a $0.10 spin', packId: 'degen-starter' },
        { id: uuidv4(), text: 'Getting bonus nerfed mid-session', packId: 'degen-starter' },
        { id: uuidv4(), text: 'Watching someone else hit the jackpot', packId: 'degen-starter' },
        { id: uuidv4(), text: 'Chasing losses until sunrise', packId: 'degen-starter' },
        { id: uuidv4(), text: 'A mysterious wallet address', packId: 'degen-starter' },
        { id: uuidv4(), text: 'Blaming RTP for everything', packId: 'degen-starter' },
        { id: uuidv4(), text: 'One more spin before bed', packId: 'degen-starter' },
      ],
      blackCards: [
        { id: uuidv4(), text: 'What destroyed my bankroll this week? _____', blanks: 1, packId: 'degen-starter' },
        { id: uuidv4(), text: 'I knew I was tilting when _____', blanks: 1, packId: 'degen-starter' },
        { id: uuidv4(), text: 'The secret to responsible gambling is _____', blanks: 1, packId: 'degen-starter' },
        { id: uuidv4(), text: 'After _____, I decided to take a break from slots.', blanks: 1, packId: 'degen-starter' },
        { id: uuidv4(), text: 'My biggest regret as a degen? _____', blanks: 1, packId: 'degen-starter' },
      ],
    };

    this.cardPacks.set(degenPack.id, degenPack);
  }

  /**
   * Generate AI-powered card pack
   * Uses AI Gateway for contextual, theme-appropriate cards
   */
  async generateAICardPack(options: {
    theme?: string;
    name?: string;
    cardCount?: number;
  } = {}): Promise<CardPack> {
    const theme = options.theme || 'degen-casino';
    const name = options.name || `AI Pack: ${theme}`;
    const count = options.cardCount || 10;

    const client = await getAIClient();
    
    if (client) {
      try {
        const result = await client.generateCards({
          theme,
          cardType: 'both',
          count,
        });

        if (result.success && result.data) {
          const packId = uuidv4();
          
          const whiteCards: WhiteCard[] = (result.data.whiteCards || []).map((text: string) => ({
            id: uuidv4(),
            text,
            packId,
          }));

          const blackCards: BlackCard[] = (result.data.blackCards || []).map((text: string) => ({
            id: uuidv4(),
            text,
            blanks: (text.match(/_____/g) || []).length || 1,
            packId,
          }));

          const pack: CardPack = {
            id: packId,
            name,
            description: `AI-generated pack with theme: ${theme}`,
            theme,
            whiteCards,
            blackCards,
            isOfficial: false,
            createdAt: Date.now(),
          };

          this.cardPacks.set(pack.id, pack);
          console.log(`[DA&D] Generated AI pack "${name}" with ${whiteCards.length} white and ${blackCards.length} black cards`);
          
          return pack;
        }
      } catch (error) {
        console.log('[DA&D] AI card generation failed, using fallback:', error);
      }
    }

    // Fallback: generate basic pack without AI
    return this.createFallbackPack(theme, name);
  }

  /**
   * Create fallback pack when AI is unavailable
   */
  private async createFallbackPack(theme: string, name: string): Promise<CardPack> {
    const packId = uuidv4();
    
    const fallbackWhiteCards = [
      'A mysterious crypto airdrop',
      'Losing your seed phrase',
      'FOMO buying at the top',
      'Rage betting after a bad beat',
      'Telling Discord you\'re quitting gambling',
      'One more bonus buy before bed',
    ];

    const fallbackBlackCards = [
      'What made me tilt today? _____',
      'The worst decision in my gambling career: _____',
      'Why did the casino nerf my bonus? _____',
    ];

    const pack: CardPack = {
      id: packId,
      name,
      description: `Fallback pack for theme: ${theme}`,
      theme,
      whiteCards: fallbackWhiteCards.map(text => ({ id: uuidv4(), text, packId })),
      blackCards: fallbackBlackCards.map(text => ({ 
        id: uuidv4(), 
        text, 
        blanks: 1, 
        packId 
      })),
      isOfficial: false,
      createdAt: Date.now(),
    };

    this.cardPacks.set(pack.id, pack);
    return pack;
  }

  /**
   * Create a new card pack
   */
  async createCardPack(pack: Omit<CardPack, 'id' | 'createdAt'>): Promise<CardPack> {
    const newPack: CardPack = {
      ...pack,
      id: uuidv4(),
      createdAt: Date.now(),
    };

    this.cardPacks.set(newPack.id, newPack);

    return newPack;
  }

  /**
   * Get all available card packs
   */
  getCardPacks(): CardPack[] {
    return Array.from(this.cardPacks.values());
  }

  /**
   * Create a new game
   */
  async createGame(
    channelId: string,
    packIds: string[],
    options: { maxRounds?: number; maxPlayers?: number; submitWindowMs?: number } = {}
  ): Promise<Game> {
    // Validate packs exist
    for (const packId of packIds) {
      if (!this.cardPacks.has(packId)) {
        throw new Error(`Card pack not found: ${packId}`);
      }
    }

    const game: Game = {
      id: uuidv4(),
      channelId,
      players: new Map(),
      status: 'waiting',
      currentRound: 0,
      rounds: [],
      cardPacks: packIds,
      maxRounds: options.maxRounds || 10,
      maxPlayers: options.maxPlayers || 10,
      submitWindowMs: options.submitWindowMs || 60_000,
      createdAt: Date.now(),
    };

    this.games.set(game.id, game);

    return game;
  }

  /**
   * Join a game
   */
  async joinGame(gameId: string, userId: string, username: string): Promise<Player> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'waiting') {
      throw new Error('Game has already started');
    }

    if (game.players.size >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    if (game.players.has(userId)) {
      throw new Error('Player already in game');
    }

    // Deal initial hand
    const hand = this.dealCards(game, 7);

    const player: Player = {
      userId,
      username,
      score: 0,
      hand,
    };

    game.players.set(userId, player);

    return player;
  }

  /**
   * Start a game
   */
  async startGame(gameId: string): Promise<Game> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'waiting') {
      throw new Error('Game has already started');
    }

    if (game.players.size < 2) {
      throw new Error('Need at least 2 players to start');
    }

    game.status = 'active';
    game.startedAt = Date.now();

    // Start first round
    await this.startRound(gameId);

    // Emit game started event
    await eventRouter.publish('game.started', 'dad', {
      gameId: game.id,
      channelId: game.channelId,
      playerCount: game.players.size,
    });

    return game;
  }

  /**
   * Start a new round
   */
  private async startRound(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    game.currentRound++;

    // Draw a black card
    const blackCard = this.drawBlackCard(game);
    const judgeUserId = this.getJudgeForRound(game, game.currentRound);

    const round: GameRound = {
      roundNumber: game.currentRound,
      blackCard,
      judgeUserId,
      phase: 'submitting',
      submitDeadlineAt: Date.now() + game.submitWindowMs,
      revealStartedAt: undefined,
      submissions: new Map(),
      revealedSubmissions: [],
      votes: new Map(),
    };

    game.rounds.push(round);
  }

  private getJudgeForRound(game: Game, roundNumber: number): string {
    const players = Array.from(game.players.keys());
    if (players.length === 0) {
      throw new Error('No players available');
    }
    const judgeIndex = (roundNumber - 1) % players.length;
    return players[judgeIndex];
  }

  private maybeAdvanceSubmissionPhase(game: Game, round: GameRound): void {
    if (round.phase !== 'submitting') {
      return;
    }
    const requiredSubmissions = Math.max(0, game.players.size - 1);

    if (round.submissions.size >= requiredSubmissions) {
      this.revealRoundSubmissions(game, round);
      return;
    }

    if (Date.now() <= round.submitDeadlineAt) {
      return;
    }

    // Submit random cards for players who timed out (excluding judge).
    for (const [userId, player] of game.players.entries()) {
      if (userId === round.judgeUserId || round.submissions.has(userId)) {
        continue;
      }

      const submittedCards = this.pickRandomCardsFromHand(player.hand, round.blackCard.blanks);
      round.submissions.set(userId, submittedCards);
      const submittedCardIds = new Set(submittedCards.map((card) => card.id));
      player.hand = player.hand.filter((card) => !submittedCardIds.has(card.id));
    }

    this.revealRoundSubmissions(game, round);
  }

  private revealRoundSubmissions(game: Game, round: GameRound): void {
    round.phase = 'revealing';
    round.revealStartedAt = Date.now();
    round.revealedSubmissions = this.shuffle(
      Array.from(round.submissions.entries()).map(([userId, cards]) => ({ userId, cards }))
    );

    // Round reveal is internal state for now; external event contract remains stable.
  }

  private pickRandomCardsFromHand(hand: WhiteCard[], count: number): WhiteCard[] {
    if (hand.length < count) {
      throw new Error('Not enough cards in hand for auto-submit');
    }
    return this.shuffle([...hand]).slice(0, count);
  }

  /**
   * Submit cards for a round
   */
  async submitCards(gameId: string, userId: string, cardIds: string[]): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'active') {
      throw new Error('Game is not active');
    }

    const player = game.players.get(userId);
    if (!player) {
      throw new Error('Player not in game');
    }

    const round = game.rounds[game.rounds.length - 1];
    if (!round) {
      throw new Error('No active round');
    }

    this.maybeAdvanceSubmissionPhase(game, round);

    if (round.phase !== 'submitting') {
      throw new Error('Submission window is closed for this round');
    }

    if (userId === round.judgeUserId) {
      throw new Error('Judge cannot submit cards this round');
    }

    if (round.submissions.has(userId)) {
      throw new Error('Already submitted cards for this round');
    }

    // Validate card IDs and get cards from hand
    const cards: WhiteCard[] = [];
    for (const cardId of cardIds) {
      const card = player.hand.find(c => c.id === cardId);
      if (!card) {
        throw new Error(`Card not in hand: ${cardId}`);
      }
      cards.push(card);
    }

    // Validate correct number of cards for blanks
    if (cards.length !== round.blackCard.blanks) {
      throw new Error(`Must submit ${round.blackCard.blanks} card(s)`);
    }

    // Submit cards
    round.submissions.set(userId, cards);

    // Remove cards from hand
    player.hand = player.hand.filter(c => !cardIds.includes(c.id));

    // Emit card played event
    await eventRouter.publish('game.card.played', 'dad', {
      gameId: game.id,
      userId,
      roundNumber: round.roundNumber,
    }, userId);

    this.maybeAdvanceSubmissionPhase(game, round);
  }

  /**
   * Judge selects the winning submission.
   */
  async pickWinner(gameId: string, judgeUserId: string, submissionUserId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const round = game.rounds[game.rounds.length - 1];
    if (!round) {
      throw new Error('No active round');
    }

    this.maybeAdvanceSubmissionPhase(game, round);

    if (round.phase !== 'revealing') {
      throw new Error('Round is not ready for winner selection');
    }

    if (judgeUserId !== round.judgeUserId) {
      throw new Error('Only the round judge can pick the winner');
    }

    if (judgeUserId === submissionUserId) {
      throw new Error('Judge cannot pick themselves');
    }

    if (!round.submissions.has(submissionUserId)) {
      throw new Error('Invalid submission');
    }

    round.winner = submissionUserId;
    round.phase = 'scored';
    round.endedAt = Date.now();

    const winner = game.players.get(submissionUserId);
    if (winner) {
      winner.score++;
    }

    await this.endRound(gameId);
  }

  /**
   * Backwards-compatible alias for legacy callers.
   */
  async vote(gameId: string, voterId: string, submissionUserId: string): Promise<void> {
    await this.pickWinner(gameId, voterId, submissionUserId);
  }

  /**
   * End the current round and tally votes
   */
  private async endRound(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const round = game.rounds[game.rounds.length - 1];
    if (!round) {
      throw new Error('No active round');
    }

    if (!round.winner) {
      throw new Error('Cannot end round without winner');
    }

    // Emit round ended event
    await eventRouter.publish('game.round.ended', 'dad', {
      gameId: game.id,
      roundNumber: round.roundNumber,
      winnerId: round.winner,
      judgeUserId: round.judgeUserId,
    });

    // Deal new cards to players
    for (const player of game.players.values()) {
      while (player.hand.length < 7) {
        const cards = this.dealCards(game, 1);
        player.hand.push(...cards);
      }
    }

    // Check if game should end
    if (game.currentRound >= game.maxRounds) {
      await this.endGame(gameId);
    } else {
      // Start next round
      await this.startRound(gameId);
    }
  }

  /**
   * End the game
   */
  private async endGame(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    game.status = 'completed';
    game.completedAt = Date.now();

    // Find overall winner
    let winnerId: string | undefined;
    let maxScore = 0;
    for (const [userId, player] of game.players) {
      if (player.score > maxScore) {
        maxScore = player.score;
        winnerId = userId;
      }
    }

    // Emit game completed event
    await eventRouter.publish('game.completed', 'dad', {
      gameId: game.id,
      winnerId,
      finalScores: Array.from(game.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
      })),
    });
  }

  /**
   * Get game state
   */
  getGame(gameId: string): Game | undefined {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') {
      return game;
    }
    const round = game.rounds[game.rounds.length - 1];
    if (round) {
      this.maybeAdvanceSubmissionPhase(game, round);
    }
    return game;
  }

  private serializeGame(game: Game): SerializedGameState {
    return {
      id: game.id,
      channelId: game.channelId,
      players: Array.from(game.players.values()),
      status: game.status,
      currentRound: game.currentRound,
      rounds: game.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        blackCard: round.blackCard,
        judgeUserId: round.judgeUserId,
        phase: round.phase,
        submitDeadlineAt: round.submitDeadlineAt,
        revealStartedAt: round.revealStartedAt,
        submissions: Array.from(round.submissions.entries()).map(([userId, cards]) => ({ userId, cards })),
        revealedSubmissions: round.revealedSubmissions,
        votes: Array.from(round.votes.entries()).map(([voterId, submissionUserId]) => ({ voterId, submissionUserId })),
        winner: round.winner,
        endedAt: round.endedAt,
      })),
      cardPacks: game.cardPacks,
      maxRounds: game.maxRounds,
      maxPlayers: game.maxPlayers,
      submitWindowMs: game.submitWindowMs,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      completedAt: game.completedAt,
    };
  }

  /**
   * Export a game into a JSON-serializable snapshot.
   */
  exportGameState(gameId: string): SerializedGameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }
    return this.serializeGame(game);
  }

  /**
   * Restore a game from a serialized snapshot.
   */
  importGameState(snapshot: SerializedGameState): Game {
    for (const packId of snapshot.cardPacks) {
      if (!this.cardPacks.has(packId)) {
        throw new Error(`Cannot import game. Missing card pack: ${packId}`);
      }
    }

    const restoredGame: Game = {
      id: snapshot.id,
      channelId: snapshot.channelId,
      players: new Map(snapshot.players.map((player) => [player.userId, player])),
      status: snapshot.status,
      currentRound: snapshot.currentRound,
      rounds: snapshot.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        blackCard: round.blackCard,
        judgeUserId: round.judgeUserId,
        phase: round.phase,
        submitDeadlineAt: round.submitDeadlineAt,
        revealStartedAt: round.revealStartedAt,
        submissions: new Map(round.submissions.map((entry) => [entry.userId, entry.cards])),
        revealedSubmissions: round.revealedSubmissions,
        votes: new Map(round.votes.map((entry) => [entry.voterId, entry.submissionUserId])),
        winner: round.winner,
        endedAt: round.endedAt,
      })),
      cardPacks: snapshot.cardPacks,
      maxRounds: snapshot.maxRounds,
      maxPlayers: snapshot.maxPlayers,
      submitWindowMs: snapshot.submitWindowMs,
      createdAt: snapshot.createdAt,
      startedAt: snapshot.startedAt,
      completedAt: snapshot.completedAt,
    };

    this.games.set(restoredGame.id, restoredGame);
    return restoredGame;
  }

  /**
   * Advance any expired submit window for an active game.
   */
  advanceGameTimers(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') {
      return;
    }
    const round = game.rounds[game.rounds.length - 1];
    if (!round) {
      return;
    }
    this.maybeAdvanceSubmissionPhase(game, round);
  }

  /**
   * Advance all active game timers.
   */
  advanceAllTimers(): void {
    for (const game of this.games.values()) {
      if (game.status !== 'active') {
        continue;
      }
      const round = game.rounds[game.rounds.length - 1];
      if (round) {
        this.maybeAdvanceSubmissionPhase(game, round);
      }
    }
  }

  /**
   * Get game by id without mutating timers.
   */
  getGameUnsafe(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  /**
   * Get active games for a channel
   */
  getChannelGames(channelId: string): Game[] {
    const games = Array.from(this.games.values()).filter(
      g => g.channelId === channelId && g.status !== 'completed'
    );
    for (const game of games) {
      if (game.status === 'active') {
        const round = game.rounds[game.rounds.length - 1];
        if (round) {
          this.maybeAdvanceSubmissionPhase(game, round);
        }
      }
    }
    return games;
  }

  /**
   * Deal white cards from the packs
   */
  private dealCards(game: Game, count: number): WhiteCard[] {
    const allWhiteCards: WhiteCard[] = [];
    
    for (const packId of game.cardPacks) {
      const pack = this.cardPacks.get(packId);
      if (pack) {
        allWhiteCards.push(...pack.whiteCards);
      }
    }

    // Shuffle and deal
    const shuffled = this.shuffle(allWhiteCards);
    return shuffled.slice(0, count);
  }

  /**
   * Draw a random black card
   */
  private drawBlackCard(game: Game): BlackCard {
    const allBlackCards: BlackCard[] = [];
    
    for (const packId of game.cardPacks) {
      const pack = this.cardPacks.get(packId);
      if (pack) {
        allBlackCards.push(...pack.blackCards);
      }
    }

    const index = Math.floor(Math.random() * allBlackCards.length);
    return allBlackCards[index];
  }

  /**
   * Shuffle array
   */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const dad = new DADModule();

console.log('[DA&D] Module loaded - Card game ready');
