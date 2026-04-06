// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import type { SessionState } from '../state/SessionState.js';
import type { HubRelay } from '../sdk/HubRelay.js';

export class GameView {
  private container: HTMLElement;
  private state: SessionState;
  private relay: HubRelay;
  private dadState: {
    hand: Array<{ id: string; text: string }>;
    blackCard: string;
    scores: Map<string, number>;
    phase: 'waiting' | 'playing' | 'voting' | 'results';
    winner: string | null;
  } = { hand: [], blackCard: '', scores: new Map(), phase: 'waiting', winner: null };

  constructor(container: HTMLElement, state: SessionState, relay: HubRelay) {
    this.container = container;
    this.state = state;
    this.relay = relay;
  }

  mount(): void {
    this.render();
    this.state.on('game', () => this.render());

    this.relay.on('dad.round', (data: unknown) => {
      const d = data as { hand?: Array<{ id: string; text: string }>; blackCard?: string; phase?: 'waiting' | 'playing' | 'voting' | 'results'; scores?: Record<string, number>; winner?: string };
      if (d.hand) this.dadState.hand = d.hand;
      if (d.blackCard) this.dadState.blackCard = d.blackCard;
      if (d.phase) this.dadState.phase = d.phase;
      if (d.scores) this.dadState.scores = new Map(Object.entries(d.scores));
      if (d.winner !== undefined) this.dadState.winner = d.winner;
      if (this.state.currentGame === 'dad') this.render();
    });

    this.relay.on('trivia.question', (data: unknown) => {
      const d = data as { question: string; options: string[]; prizePool: number; timeRemaining: number };
      this.state.updateTrivia({
        question: d.question,
        options: d.options,
        prizePool: d.prizePool,
        timeRemaining: d.timeRemaining,
        correctAnswer: null
      });
      if (this.state.currentGame === 'trivia') this.render();
    });

    this.relay.on('trivia.result', (data: unknown) => {
      const d = data as { correctAnswer: string; leaderboard: Array<{ username: string; score: number }> };
      this.state.updateTrivia({
        correctAnswer: d.correctAnswer,
        leaderboard: d.leaderboard
      });
      if (this.state.currentGame === 'trivia') this.render();
    });
  }

  render(): void {
    const game = this.state.currentGame;

    let content: string;
    switch (game) {
      case 'dad':
        content = this.renderDAD();
        break;
      case 'trivia':
        content = this.renderTrivia();
        break;
      case 'poker':
        content = this.renderPoker();
        break;
      default:
        content = `<div class="waiting-state"><p>Select a game above.</p></div>`;
    }

    this.container.innerHTML = `
      <div class="view-game">
        <div class="game-tabs">
          <button class="game-tab ${game === 'dad' ? 'active' : ''}" data-game="dad">DA&amp;D</button>
          <button class="game-tab ${game === 'trivia' ? 'active' : ''}" data-game="trivia">TRIVIA</button>
          <button class="game-tab ${game === 'poker' ? 'active' : ''}" data-game="poker">POKER</button>
        </div>
        <div class="game-content" id="game-container">${content}</div>
      </div>
    `;

    this.container.querySelectorAll('.game-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = (btn as HTMLElement).dataset.game!;
        this.state.setGame(g);
        this.relay.joinLobby(g);
      });
    });

    this.attachGameListeners();
  }

  private renderDAD(): string {
    const { phase, blackCard, hand, scores, winner } = this.dadState;

    if (phase === 'waiting' || !blackCard) {
      return `
        <div class="waiting-state">
          <p class="waiting-title">DA&amp;D - Degens Against Degens</p>
          <p class="waiting-sub">Waiting for round to start...</p>
          <button class="btn-game" id="dad-join-btn">Join Lobby</button>
        </div>`;
    }

    if (winner) {
      return `
        <div class="winner-state">
          <p class="winner-title">ROUND WINNER</p>
          <p class="winner-name">${winner}</p>
          <button class="btn-game" id="dad-next-btn">Next Round</button>
        </div>`;
    }

    const handHtml = hand.map(card => `
      <button class="dad-card" data-card-id="${card.id}">${card.text}</button>
    `).join('');

    const scoresHtml = [...scores.entries()].map(([user, score]) =>
      `<div class="score-row"><span>${user}</span><span>${score}</span></div>`
    ).join('');

    return `
      <div class="dad-state">
        <div class="black-card">${blackCard}</div>
        <div class="dad-hand">${handHtml}</div>
        ${scoresHtml ? `<div class="scores">${scoresHtml}</div>` : ''}
      </div>`;
  }

  private renderTrivia(): string {
    const t = this.state.trivia;

    if (!t.question || t.question === 'Waiting for round...') {
      return `
        <div class="waiting-state">
          <p class="waiting-title">TRIVIADROPS</p>
          <p class="waiting-sub">Waiting for next question...</p>
          <div class="prize-pool">PRIZE POOL: ${t.prizePool.toFixed(3)} SOL</div>
        </div>`;
    }

    if (t.correctAnswer) {
      const lbHtml = t.leaderboard.slice(0, 5).map((e, i) =>
        `<div class="lb-row"><span>#${i + 1} ${e.username}</span><span>${e.score}</span></div>`
      ).join('');
      return `
        <div class="trivia-result">
          <p class="result-answer">Answer: <strong>${t.correctAnswer}</strong></p>
          <div class="leaderboard">${lbHtml}</div>
        </div>`;
    }

    const optHtml = t.options.map((opt, i) => `
      <button class="trivia-opt" data-opt="${i}">${opt}</button>
    `).join('');

    return `
      <div class="trivia-active">
        <div class="trivia-timer">${t.timeRemaining}s</div>
        <p class="trivia-question">${t.question}</p>
        <div class="trivia-options">${optHtml}</div>
        <div class="prize-pool">PRIZE: ${t.prizePool.toFixed(3)} SOL</div>
      </div>`;
  }

  private renderPoker(): string {
    return `
      <div class="waiting-state">
        <p class="waiting-title">POKER</p>
        <p class="waiting-sub">Poker rooms coming soon.</p>
        <button class="btn-game" id="poker-join-btn">Join Table</button>
      </div>`;
  }

  private attachGameListeners(): void {
    document.getElementById('dad-join-btn')?.addEventListener('click', () => {
      this.relay.joinLobby('dad');
    });

    document.getElementById('dad-next-btn')?.addEventListener('click', () => {
      this.relay.joinLobby('dad');
      this.dadState = { hand: [], blackCard: '', scores: new Map(), phase: 'waiting', winner: null };
    });

    this.container.querySelectorAll('.dad-card').forEach(card => {
      card.addEventListener('click', () => {
        const cardId = (card as HTMLElement).dataset.cardId!;
        if (this.dadState.phase === 'playing') {
          this.relay.playCard('current', cardId);
        } else if (this.dadState.phase === 'voting') {
          this.relay.voteCard('current', cardId);
        }
      });
    });

    this.container.querySelectorAll('.trivia-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const optIdx = (btn as HTMLElement).dataset.opt!;
        this.relay.submitTriviaAnswer('current', optIdx);
        this.container.querySelectorAll('.trivia-opt').forEach(b => (b as HTMLButtonElement).disabled = true);
      });
    });
  }
}
