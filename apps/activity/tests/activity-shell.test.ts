// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { SessionState } from '../src/state/SessionState.js';
import type { HubRelay } from '../src/sdk/HubRelay.js';
import { GameView } from '../src/views/GameView.js';

class HubRelayStub {
  private handlers = new Map<string, Array<(data: unknown) => void>>();
  public scheduledGames: Array<{ category: string; theme: string; totalRounds: number }> = [];
  public submittedAnswers: Array<{ questionId: string; answer: string }> = [];
  public shieldRequests: Array<{ gameId: string; questionId: string }> = [];
  public apeInRequests: Array<{ gameId: string; questionId: string }> = [];
  public buyBackRequests: string[] = [];

  on(event: string, handler: (data: unknown) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }

  getTriviaSnapshot() {
    return {
      started: null,
      roundStart: null,
      roundReveal: null,
    };
  }

  joinLobby(): void {}
  joinGame(): void {}
  clearJoinedGame(): void {}
  playCard(): void {}
  voteCard(): void {}
  submitTriviaAnswer(questionId: string, answer: string): void {
    this.submittedAnswers.push({ questionId, answer });
  }
  requestTriviaShield(gameId: string, questionId: string): void {
    this.shieldRequests.push({ gameId, questionId });
  }
  requestTriviaApeIn(gameId: string, questionId: string): void {
    this.apeInRequests.push({ gameId, questionId });
  }
  buyTriviaBack(gameId: string): void {
    this.buyBackRequests.push(gameId);
  }
  scheduleTriviaGame(category: string, theme: string, totalRounds: number): void {
    this.scheduledGames.push({ category, theme, totalRounds });
  }
  resetTriviaGame(): void {}
}

describe('activity shell play state', () => {
  let container: HTMLElement;
  let state: SessionState;
  let relay: HubRelayStub;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="game-root"></div>';
    container = document.getElementById('game-root') as HTMLElement;
    state = new SessionState();
    state.setIdentity('user-1', 'Alice');
    relay = new HubRelayStub();
  });

  it('boots the play shell in lobby mode by default', () => {
    new GameView(container, state, relay as unknown as HubRelay).mount();

    expect(state.roundStage).toBe('lobby');
    expect(state.activityRecap.title).toBe('Party loop armed');
    expect(container.textContent).toContain('Lobby');
    expect(container.textContent).toContain('Party Loop');
    expect(container.textContent).toContain('Funding + test path');
    expect(container.textContent).toContain('Open Jackpot Funding');
  });

  it('moves the play shell from lobby to live round to post-round', () => {
    state.setGame('dad');
    new GameView(container, state, relay as unknown as HubRelay).mount();

    relay.emit('dad.round', {
      blackCard: 'Test black card',
      hand: [{ id: 'card-1', text: 'Card text' }],
      phase: 'playing',
      scores: { degen: 2 },
    });

    expect(state.roundStage).toBe('in-round');
    expect(state.activityRecap.title).toBe('DA&D round live');
    expect(container.textContent).toContain('Round Live');

    relay.emit('dad.round', {
      blackCard: 'Test black card',
      phase: 'results',
      winner: 'DEGEN LORD',
    });

    expect(state.roundStage).toBe('post-round');
    expect(state.activityRecap.title).toBe('DA&D round settled');
    expect(state.activityRecap.detail).toContain('DEGEN LORD');
    expect(container.textContent).toContain('Post Round');
  });

  it('starts a short trivia pack and locks a live answer with crowd tools', () => {
    state.setGame('trivia');
    new GameView(container, state, relay as unknown as HubRelay).mount();

    (container.querySelector('[data-pack="rapid-trivia"]') as HTMLButtonElement).click();
    expect(relay.scheduledGames).toEqual([
      { category: 'general', theme: 'Rapid Trivia', totalRounds: 5 },
    ]);

    relay.emit('game.update', {
      type: 'trivia-started',
      gameId: 'game-1',
      category: 'general',
      theme: 'Rapid Trivia',
      prizePool: 0,
      roundNumber: 1,
      totalRounds: 5,
    });

    relay.emit('game.update', {
      type: 'trivia-joined',
      gameId: 'game-1',
      prizePool: 0,
      roundNumber: 1,
      totalRounds: 5,
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 0,
        eliminated: false,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    relay.emit('trivia.round.start', {
      gameId: 'game-1',
      question: {
        id: 'question-1',
        question: 'What does RTP stand for?',
        choices: ['Return to Player', 'Risk Transfer Protocol'],
        category: 'general',
      },
      roundNumber: 1,
      totalRounds: 5,
      endsAt: Date.now() + 20_000,
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 0,
        eliminated: false,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    (container.querySelector('#trivia-ape-btn') as HTMLButtonElement).click();
    expect(relay.apeInRequests).toEqual([{ gameId: 'game-1', questionId: 'question-1' }]);

    relay.emit('trivia.ape-in.result', {
      questionId: 'question-1',
      distribution: {
        'Return to Player': 3,
        'Risk Transfer Protocol': 1,
      },
    });
    expect(container.textContent).toContain('Crowd read');

    (container.querySelector('#trivia-shield-btn') as HTMLButtonElement).click();
    expect(relay.shieldRequests).toEqual([{ gameId: 'game-1', questionId: 'question-1' }]);

    relay.emit('trivia.shield.result', {
      questionId: 'question-1',
      eliminated: [],
    });
    expect(container.textContent).toContain('Shield Armed');

    (container.querySelector('.trivia-opt') as HTMLButtonElement).click();
    expect(relay.submittedAnswers).toEqual([
      { questionId: 'question-1', answer: 'Return to Player' },
    ]);

    relay.emit('trivia.round.reveal', {
      gameId: 'game-1',
      correctChoice: 'Return to Player',
      explanation: 'RTP is the long-run return rate.',
      stats: {
        'Return to Player': { count: 3, correct: true },
        'Risk Transfer Protocol': { count: 1, correct: false },
      },
      leaderboard: [{ username: 'Alice', score: 1 }],
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 1,
        eliminated: false,
        shieldConsumed: true,
        buyBackUsed: false,
      }],
    });

    expect(state.roundStage).toBe('post-round');
    expect(container.textContent).toContain('Reveal');
    expect(container.textContent).toContain('Bank Clean Win');
    expect(container.textContent).toContain('Safety hooks');
    expect(container.textContent).toContain('RTP is the long-run return rate.');
  });

  it('offers a chase buy-back after a missed trivia prompt', () => {
    state.setGame('trivia');
    new GameView(container, state, relay as unknown as HubRelay).mount();

    relay.emit('game.update', {
      type: 'trivia-started',
      gameId: 'game-2',
      category: 'strategy',
      theme: 'Tilt or Skill',
      prizePool: 0,
      roundNumber: 1,
      totalRounds: 5,
    });
    relay.emit('game.update', {
      type: 'trivia-joined',
      gameId: 'game-2',
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 0,
        eliminated: false,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    relay.emit('trivia.round.start', {
      gameId: 'game-2',
      question: {
        id: 'question-2',
        question: 'What is loss chasing?',
        choices: ['A profitable recovery strategy', 'Increasing bets after losses'],
        category: 'strategy',
      },
      roundNumber: 1,
      totalRounds: 5,
      endsAt: Date.now() + 20_000,
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 0,
        eliminated: false,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    relay.emit('trivia.round.reveal', {
      gameId: 'game-2',
      correctChoice: 'Increasing bets after losses',
      explanation: 'Loss chasing is classic tilt.',
      stats: {
        'A profitable recovery strategy': { count: 1, correct: false },
        'Increasing bets after losses': { count: 3, correct: true },
      },
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 0,
        eliminated: true,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    expect(container.textContent).toContain('Chase Buy-Back');
    expect(container.textContent).toContain('Take Cooldown to Recap');
    expect(container.textContent).toContain('One chase max');
    (container.querySelector('#trivia-buyback-btn') as HTMLButtonElement).click();
    expect(relay.buyBackRequests).toEqual(['game-2']);
  });

  it('tracks lightweight progression through party loop prompts and recap exits', () => {
    state.setGame('trivia');
    new GameView(container, state, relay as unknown as HubRelay).mount();

    relay.emit('game.update', {
      type: 'trivia-started',
      gameId: 'game-3',
      category: 'general',
      theme: 'Rapid Trivia',
      prizePool: 0,
      roundNumber: 1,
      totalRounds: 5,
    });
    relay.emit('game.update', {
      type: 'trivia-joined',
      gameId: 'game-3',
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 0,
        eliminated: false,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    relay.emit('trivia.round.start', {
      gameId: 'game-3',
      question: {
        id: 'question-3',
        question: 'What does a cooldown stop?',
        choices: ['Loss chasing', 'Math'],
        category: 'general',
      },
      roundNumber: 1,
      totalRounds: 5,
      endsAt: Date.now() + 20_000,
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 0,
        eliminated: false,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    (container.querySelector('#trivia-ape-btn') as HTMLButtonElement).click();

    relay.emit('trivia.round.reveal', {
      gameId: 'game-3',
      correctChoice: 'Loss chasing',
      explanation: 'Cooldowns interrupt tilt spirals.',
      stats: {
        'Loss chasing': { count: 3, correct: true },
        Math: { count: 1, correct: false },
      },
      players: [{
        userId: 'user-1',
        username: 'Alice',
        score: 1,
        eliminated: false,
        shieldConsumed: false,
        buyBackUsed: false,
      }],
    });

    expect(state.progression.promptsPlayed).toBe(1);
    expect(state.progression.promptsCleared).toBe(1);
    expect(state.progression.weeklyClout).toBe(3);
    expect(state.progression.currentTitle).toBe('Fresh Spark');
    expect(state.progression.badges.map((badge) => badge.id)).toEqual(['room-warmup', 'crowd-reader']);
    expect(container.textContent).toContain('Weekly clout');
    expect(container.textContent).toContain('Fresh Spark');

    (container.querySelector('#trivia-recap-btn') as HTMLButtonElement).click();
    expect(state.progression.weeklyClout).toBe(4);
  });
});
