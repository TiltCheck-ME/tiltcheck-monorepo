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
  submissions: Map<string, WhiteCard[]>; // userId -> cards
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
      async (event) => {
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
    options: { maxRounds?: number; maxPlayers?: number } = {}
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

    const round: GameRound = {
      roundNumber: game.currentRound,
      blackCard,
      submissions: new Map(),
      votes: new Map(),
    };

    game.rounds.push(round);
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

    // Check if all players have submitted
    if (round.submissions.size === game.players.size) {
      // Ready for voting
      console.log('[DA&D] All players submitted, ready for voting');
    }
  }

  /**
   * Vote for a submission
   */
  async vote(gameId: string, voterId: string, submissionUserId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const round = game.rounds[game.rounds.length - 1];
    if (!round) {
      throw new Error('No active round');
    }

    if (voterId === submissionUserId) {
      throw new Error('Cannot vote for yourself');
    }

    if (!round.submissions.has(submissionUserId)) {
      throw new Error('Invalid submission');
    }

    round.votes.set(voterId, submissionUserId);

    // Check if all players have voted (everyone votes except can't vote for self)
    // With N players, we expect N votes (each player votes once)
    if (round.votes.size === game.players.size) {
      await this.endRound(gameId);
    }
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

    // Tally votes
    const voteCounts = new Map<string, number>();
    for (const submissionUserId of round.votes.values()) {
      voteCounts.set(submissionUserId, (voteCounts.get(submissionUserId) || 0) + 1);
    }

    // Find winner (most votes)
    let winnerId: string | undefined;
    let maxVotes = 0;
    for (const [userId, votes] of voteCounts) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winnerId = userId;
      }
    }

    if (winnerId) {
      round.winner = winnerId;
      const winner = game.players.get(winnerId);
      if (winner) {
        winner.score++;
      }
    }

    round.endedAt = Date.now();

    // Emit round ended event
    await eventRouter.publish('game.round.ended', 'dad', {
      gameId: game.id,
      roundNumber: round.roundNumber,
      winnerId,
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
    return this.games.get(gameId);
  }

  /**
   * Get active games for a channel
   */
  getChannelGames(channelId: string): Game[] {
    return Array.from(this.games.values()).filter(
      g => g.channelId === channelId && g.status !== 'completed'
    );
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
