/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DADModule, dad } from '../src/index.js';
import { eventRouter } from '@tiltcheck/event-router';

describe('DA&D Module', () => {
  let module: DADModule;

  beforeEach(() => {
    module = new DADModule();
    eventRouter.clearHistory();
  });

  describe('Card Packs', () => {
    it('should initialize with default degen pack', () => {
      const packs = module.getCardPacks();
      
      expect(packs.length).toBeGreaterThan(0);
      
      const degenPack = packs.find((p: any) => p.id === 'degen-starter');
      expect(degenPack).toBeDefined();
      expect(degenPack?.name).toBe('Degen Starter Pack');
      expect(degenPack?.whiteCards.length).toBeGreaterThan(0);
      expect(degenPack?.blackCards.length).toBeGreaterThan(0);
    });

    it('should create a custom card pack', async () => {
      const pack = await module.createCardPack({
        name: 'Custom Pack',
        description: 'Custom test pack',
        theme: 'test',
        isOfficial: false,
        whiteCards: [
          { id: 'w1', text: 'Custom white card', packId: 'custom' },
        ],
        blackCards: [
          { id: 'b1', text: 'Custom black card _____', blanks: 1, packId: 'custom' },
        ],
      });

      expect(pack.id).toBeDefined();
      expect(pack.name).toBe('Custom Pack');
      expect(pack.whiteCards.length).toBe(1);
      expect(pack.blackCards.length).toBe(1);

      // Verify it's in the list
      const packs = module.getCardPacks();
      expect(packs.some((p: any) => p.id === pack.id)).toBe(true);
    });
  });

  describe('Game Creation', () => {
    it('should create a new game', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);

      expect(game.id).toBeDefined();
      expect(game.channelId).toBe('channel-1');
      expect(game.status).toBe('waiting');
      expect(game.players.size).toBe(0);
      expect(game.cardPacks).toContain('degen-starter');
      expect(game.maxRounds).toBe(10);
      expect(game.maxPlayers).toBe(10);
    });

    it('should create game with custom options', async () => {
      const game = await module.createGame('channel-2', ['degen-starter'], {
        maxRounds: 5,
        maxPlayers: 6,
      });

      expect(game.maxRounds).toBe(5);
      expect(game.maxPlayers).toBe(6);
    });

    it('should throw error for invalid pack', async () => {
      await expect(
        module.createGame('channel-3', ['invalid-pack'])
      ).rejects.toThrow('Card pack not found');
    });
  });

  describe('Player Management', () => {
    it('should allow players to join a game', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);

      const player1 = await module.joinGame(game.id, 'user1', 'Player1');
      expect(player1.userId).toBe('user1');
      expect(player1.username).toBe('Player1');
      expect(player1.score).toBe(0);
      expect(player1.hand.length).toBe(7);

      const player2 = await module.joinGame(game.id, 'user2', 'Player2');
      expect(player2.userId).toBe('user2');

      // Verify game has both players
      const updatedGame = module.getGame(game.id);
      expect(updatedGame?.players.size).toBe(2);
    });

    it('should prevent duplicate joins', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');

      await expect(
        module.joinGame(game.id, 'user1', 'Player1')
      ).rejects.toThrow('Player already in game');
    });

    it('should prevent joining after game starts', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);

      await expect(
        module.joinGame(game.id, 'user3', 'Player3')
      ).rejects.toThrow('Game has already started');
    });

    it('should prevent joining when game is full', async () => {
      const game = await module.createGame('channel-1', ['degen-starter'], {
        maxPlayers: 2,
      });
      await module.joinGame(game.id, 'user1', 'Player1');
      await module.joinGame(game.id, 'user2', 'Player2');

      await expect(
        module.joinGame(game.id, 'user3', 'Player3')
      ).rejects.toThrow('Game is full');
    });
  });

  describe('Game Flow', () => {
    it('should start a game', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      await module.joinGame(game.id, 'user2', 'Player2');

      const startedGame = await module.startGame(game.id);

      expect(startedGame.status).toBe('active');
      expect(startedGame.startedAt).toBeDefined();
      expect(startedGame.currentRound).toBe(1);
      expect(startedGame.rounds.length).toBe(1);
      expect(startedGame.rounds[0].blackCard).toBeDefined();
      expect(startedGame.rounds[0].judgeUserId).toBe('user1');
      expect(startedGame.rounds[0].phase).toBe('submitting');

      // Check game started event was emitted
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'game.started')).toBe(true);
    });

    it('should require at least 2 players to start', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');

      await expect(
        module.startGame(game.id)
      ).rejects.toThrow('Need at least 2 players to start');
    });

    it('should prevent starting game twice', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);

      await expect(
        module.startGame(game.id)
      ).rejects.toThrow('Game has already started');
    });
  });

  describe('Card Submission', () => {
    it('should allow players to submit cards', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      const player2 = await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);

      const cardToSubmit = player2.hand[0];
      
      await module.submitCards(game.id, 'user2', [cardToSubmit.id]);

      const updatedGame = module.getGame(game.id);
      const round = updatedGame?.rounds[updatedGame.rounds.length - 1];
      
      expect(round?.submissions.has('user2')).toBe(true);
      expect(round?.submissions.get('user2')?.[0].id).toBe(cardToSubmit.id);
      expect(round?.phase).toBe('revealing');

      // Check event was emitted
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'game.card.played')).toBe(true);
    });

    it('should require correct number of cards for blanks', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      const player2 = await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);

      const updatedGame = module.getGame(game.id);
      const round = updatedGame?.rounds[updatedGame.rounds.length - 1];
      const blanks = round?.blackCard.blanks || 1;

      // Try to submit wrong number of cards
      if (blanks === 1) {
        await expect(
          module.submitCards(game.id, 'user2', [player2.hand[0].id, player2.hand[1].id])
        ).rejects.toThrow('Must submit');
      }
    });

    it('should prevent submitting twice in same round', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);

      const updatedGame = module.getGame(game.id);
      const player2 = updatedGame?.players.get('user2');
      expect(player2).toBeDefined();
      await module.submitCards(game.id, 'user2', [player2!.hand[0].id]);

      await expect(
        module.submitCards(game.id, 'user2', [player2!.hand[1].id])
      ).rejects.toThrow('Submission window is closed for this round');
    });

    it('should prevent judge from submitting', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      const player1 = await module.joinGame(game.id, 'user1', 'Player1');
      await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);

      await expect(
        module.submitCards(game.id, 'user1', [player1.hand[0].id])
      ).rejects.toThrow('Judge cannot submit cards this round');
    });
  });

  describe('Voting', () => {
    it('should allow players to vote', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      const player2 = await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);

      // Non-judge player submits cards
      await module.submitCards(game.id, 'user2', [player2.hand[0].id]);

      // Judge picks winner
      await module.pickWinner(game.id, 'user1', 'user2');

      const updatedGame = module.getGame(game.id);
      const firstRound = updatedGame?.rounds[0];
      
      expect(firstRound?.winner).toBe('user2');
      expect(updatedGame?.players.get('user2')?.score).toBe(1);
    });

    it('should prevent voting for yourself', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      const player2 = await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);
      await module.submitCards(game.id, 'user2', [player2.hand[0].id]);

      await expect(
        module.pickWinner(game.id, 'user1', 'user1')
      ).rejects.toThrow('Judge cannot pick themselves');
    });
  });

  describe('Game Queries', () => {
    it('should get game by ID', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      
      const retrieved = module.getGame(game.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(game.id);
    });

    it('should get active games for channel', async () => {
      await module.createGame('channel-1', ['degen-starter']);
      await module.createGame('channel-1', ['degen-starter']);
      await module.createGame('channel-2', ['degen-starter']);

      const channelGames = module.getChannelGames('channel-1');
      expect(channelGames.length).toBe(2);
      expect(channelGames.every((g: any) => g.channelId === 'channel-1')).toBe(true);
    });

    it('should not return completed games', async () => {
      const game = await module.createGame('channel-1', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      await module.joinGame(game.id, 'user2', 'Player2');

      // Get before completion
      let channelGames = module.getChannelGames('channel-1');
      expect(channelGames.length).toBe(1);

      // Manually mark as completed for testing
      const gameObj = module.getGame(game.id);
      if (gameObj) {
        gameObj.status = 'completed';
      }

      // Get after completion
      channelGames = module.getChannelGames('channel-1');
      expect(channelGames.length).toBe(0);
    });

    it('should export and import active round state', async () => {
      const game = await module.createGame('channel-restore', ['degen-starter']);
      await module.joinGame(game.id, 'user1', 'Player1');
      const player2 = await module.joinGame(game.id, 'user2', 'Player2');
      await module.startGame(game.id);
      await module.submitCards(game.id, 'user2', [player2.hand[0].id]);

      const snapshot = module.exportGameState(game.id);
      expect(snapshot).toBeDefined();

      const restoredModule = new DADModule();
      restoredModule.importGameState(snapshot!);
      const restoredGame = restoredModule.getGameUnsafe(game.id);

      expect(restoredGame).toBeDefined();
      expect(restoredGame?.status).toBe('active');
      expect(restoredGame?.players.size).toBe(2);
      expect(restoredGame?.rounds.length).toBe(1);
      const restoredRound = restoredGame?.rounds[0];
      expect(restoredRound?.phase).toBe('revealing');
      expect(restoredRound?.judgeUserId).toBe('user1');
      expect(restoredRound?.submissions.has('user2')).toBe(true);
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(dad).toBeInstanceOf(DADModule);
    });
  });
});
