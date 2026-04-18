// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import type { SessionState } from '../state/SessionState.js';
import type { HubRelay } from '../sdk/HubRelay.js';

export class GameView {
  private container: HTMLElement;
  private state: SessionState;
  private relay: HubRelay;
  private triviaGameId: string | null = null;
  private triviaQuestionId: string | null = null;
  private triviaJoinRequested = false;
  private triviaJoined = false;
  private triviaError: string | null = null;
  private triviaTimerId: ReturnType<typeof setInterval> | null = null;
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
    this.state.on('trivia', () => {
      if (this.state.currentGame === 'trivia') {
        this.render();
      }
    });

    this.relay.on('dad.round', (data: unknown) => {
      const d = data as { hand?: Array<{ id: string; text: string }>; blackCard?: string; phase?: 'waiting' | 'playing' | 'voting' | 'results'; scores?: Record<string, number>; winner?: string };
      if (d.hand) this.dadState.hand = d.hand;
      if (d.blackCard) this.dadState.blackCard = d.blackCard;
      if (d.phase) this.dadState.phase = d.phase;
      if (d.scores) this.dadState.scores = new Map(Object.entries(d.scores));
      if (d.winner !== undefined) this.dadState.winner = d.winner;
      if (this.state.currentGame === 'dad') this.render();
    });

    this.relay.on('game.update', (data: unknown) => this.handleGameUpdate(data));
    this.relay.on('game.error', (data: unknown) => this.handleGameError(data));
    this.relay.on('trivia.round.start', (data: unknown) => this.handleTriviaRoundStart(data));
    this.relay.on('trivia.round.reveal', (data: unknown) => this.handleTriviaRoundReveal(data));

    const triviaSnapshot = this.relay.getTriviaSnapshot();
    if (triviaSnapshot.started) {
      this.handleGameUpdate(triviaSnapshot.started);
    }
    if (triviaSnapshot.roundStart) {
      this.handleTriviaRoundStart(triviaSnapshot.roundStart);
    }
    if (triviaSnapshot.roundReveal) {
      this.handleTriviaRoundReveal(triviaSnapshot.roundReveal);
    }
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
      default:
        content = `<div class="waiting-state"><p>Select a game above.</p></div>`;
    }

    this.container.innerHTML = `
        <div class="view-game">
          <div class="game-tabs">
            <button class="game-tab ${game === 'dad' ? 'active' : ''}" data-game="dad">DA&amp;D</button>
            <button class="game-tab ${game === 'trivia' ? 'active' : ''}" data-game="trivia">TRIVIA</button>
          </div>
          <div class="game-content" id="game-container">${content}</div>
        </div>
    `;

    this.container.querySelectorAll('.game-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = (btn as HTMLElement).dataset.game!;
        this.state.setGame(g);
        if (g === 'trivia') {
          this.triviaJoinRequested = true;
          this.joinTriviaGame();
          return;
        }
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

    if (!this.triviaJoined) {
      const joinLabel = !this.triviaGameId
        ? 'Waiting for Live Trivia'
        : this.triviaJoinRequested
          ? 'Joining Live Trivia...'
          : 'Join Live Trivia';

      const joinStatus = this.triviaError
        ? this.triviaError
        : this.triviaGameId
          ? 'A live trivia game is open. Join the real game room to receive questions.'
          : 'No live trivia game is open yet.';

      return `
        <div class="waiting-state">
          <p class="waiting-title">TRIVIADROPS</p>
          <p class="waiting-sub">${joinStatus}</p>
          <button class="btn-game" id="trivia-join-btn" ${this.triviaGameId ? '' : 'disabled'}>${joinLabel}</button>
          <div class="prize-pool">PRIZE POOL: ${t.prizePool.toFixed(3)} SOL</div>
        </div>`;
    }

    if (!t.question || t.question === 'Waiting for round...') {
      return `
        <div class="waiting-state">
          <p class="waiting-title">TRIVIADROPS</p>
          <p class="waiting-sub">Connected. Waiting for next question...</p>
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

  private attachGameListeners(): void {
    document.getElementById('dad-join-btn')?.addEventListener('click', () => {
      this.relay.joinLobby('dad');
    });

    document.getElementById('dad-next-btn')?.addEventListener('click', () => {
      this.relay.joinLobby('dad');
      this.dadState = { hand: [], blackCard: '', scores: new Map(), phase: 'waiting', winner: null };
    });

    document.getElementById('trivia-join-btn')?.addEventListener('click', () => {
      this.triviaJoinRequested = true;
      this.joinTriviaGame();
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
        const optIdx = Number.parseInt((btn as HTMLElement).dataset.opt!, 10);
        const answer = this.state.trivia.options[optIdx];
        if (!this.triviaQuestionId || !answer) {
          return;
        }
        this.relay.submitTriviaAnswer(this.triviaQuestionId, answer);
        this.container.querySelectorAll('.trivia-opt').forEach(b => (b as HTMLButtonElement).disabled = true);
      });
    });
  }

  private joinTriviaGame(): void {
    this.triviaJoinRequested = true;
    this.triviaJoined = false;
    this.triviaError = null;

    if (!this.triviaGameId) {
      this.render();
      return;
    }

    this.relay.joinGame(this.triviaGameId);
    this.render();
  }

  private startTriviaTimer(endsAt: number): void {
    this.stopTriviaTimer();

    const syncTimer = () => {
      this.state.updateTrivia({
        timeRemaining: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
      });
    };

    syncTimer();
    this.triviaTimerId = setInterval(syncTimer, 1000);
  }

  private stopTriviaTimer(): void {
    if (this.triviaTimerId) {
      clearInterval(this.triviaTimerId);
      this.triviaTimerId = null;
    }
  }

  private handleGameUpdate(data: unknown): void {
    const d = data as {
      type?: string;
      gameId?: string;
      prizePool?: number;
      finalScores?: Array<{ username: string; score: number }>;
    };

    if (d.type === 'trivia-started' && d.gameId) {
      if (this.triviaGameId !== d.gameId) {
        this.triviaJoined = false;
        this.triviaQuestionId = null;
        this.stopTriviaTimer();
      }

      this.triviaGameId = d.gameId;
      this.triviaError = null;
      this.state.updateTrivia({
        question: 'Waiting for round...',
        options: [],
        prizePool: d.prizePool ?? this.state.trivia.prizePool,
        timeRemaining: 0,
        correctAnswer: null,
      });

      if (this.state.currentGame === 'trivia' && this.triviaJoinRequested) {
        this.joinTriviaGame();
      }
    }

    if (d.type === 'trivia-joined' && d.gameId === this.triviaGameId) {
      this.triviaJoined = true;
      this.triviaError = null;
    }

    if (d.type === 'trivia-completed' && (!this.triviaGameId || d.gameId === this.triviaGameId)) {
      this.relay.clearJoinedGame();
      this.triviaGameId = null;
      this.triviaQuestionId = null;
      this.triviaJoined = false;
      this.stopTriviaTimer();
      this.state.updateTrivia({
        question: 'Waiting for round...',
        options: [],
        prizePool: 0,
        timeRemaining: 0,
        correctAnswer: null,
        leaderboard: d.finalScores ?? [],
      });
    }
  }

  private handleGameError(data: unknown): void {
    if (this.state.currentGame !== 'trivia' && !this.triviaGameId && !this.triviaJoinRequested) {
      return;
    }
    this.triviaJoined = false;
    this.triviaError = typeof data === 'string' ? data : 'Trivia join failed.';
    if (this.state.currentGame === 'trivia') {
      this.render();
    }
  }

  private handleTriviaRoundStart(data: unknown): void {
    const d = data as {
      gameId?: string;
      question?: { id: string; question: string; choices: string[] };
      prizePool?: number;
      endsAt?: number;
    };

    if (!d.question || !d.endsAt || (this.triviaGameId && d.gameId && d.gameId !== this.triviaGameId)) {
      return;
    }

    if (d.gameId) {
      this.triviaGameId = d.gameId;
    }

    this.triviaJoined = true;
    this.triviaError = null;
    this.triviaQuestionId = d.question.id;
    this.startTriviaTimer(d.endsAt);
    this.state.updateTrivia({
      question: d.question.question,
      options: d.question.choices,
      prizePool: d.prizePool ?? this.state.trivia.prizePool,
      timeRemaining: Math.max(0, Math.ceil((d.endsAt - Date.now()) / 1000)),
      correctAnswer: null,
    });
  }

  private handleTriviaRoundReveal(data: unknown): void {
    const d = data as { gameId?: string; correctChoice?: string; leaderboard?: Array<{ username: string; score: number }> };

    if (!d.correctChoice || (this.triviaGameId && d.gameId && d.gameId !== this.triviaGameId)) {
      return;
    }

    this.stopTriviaTimer();
    this.state.updateTrivia({
      correctAnswer: d.correctChoice,
      leaderboard: d.leaderboard ?? this.state.trivia.leaderboard,
      timeRemaining: 0,
    });
  }
}
