// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Live Trivia HQ — elimination-style trivia with powerups and prize pool
// Mirrors trivia-manager lifecycle: waiting → round → reveal → next/completed

import * as relay from '../relay.js';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TriviaQuestion {
  id: string;
  question: string;
  choices: string[];
  category?: string;
  theme?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Player {
  userId: string;
  username: string;
  score: number;
  eliminated: boolean;
  shieldConsumed: boolean;
  buyBackUsed: boolean;
}

interface RoundStartPayload {
  gameId?: string;
  question?: TriviaQuestion;
  prizePool?: number;
  roundNumber?: number;
  totalRounds?: number;
  endsAt?: number;
  leaderboard?: Array<{ username: string; score: number }>;
  players?: Player[];
}

interface RoundRevealPayload {
  gameId?: string;
  questionId?: string;
  correctChoice?: string;
  explanation?: string;
  stats?: Record<string, { count: number; correct: boolean }>;
  leaderboard?: Array<{ username: string; score: number }>;
  players?: Player[];
}

interface GameStartedPayload {
  type?: string;
  gameId?: string;
  prizePool?: number;
  roundNumber?: number;
  totalRounds?: number;
}

interface GameCompletedPayload {
  type?: string;
  gameId?: string;
  winners?: Array<{ userId: string; username: string; score: number; rank: number }>;
  finalScores?: Player[];
  prizePool?: number;
}

type Phase = 'waiting' | 'countdown' | 'answering' | 'reveal' | 'completed';

// ── State ──────────────────────────────────────────────────────────────────────

let container: HTMLElement | null = null;
let userId = '';

let phase: Phase = 'waiting';
let gameId: string | null = null;
let prizePool = 0;
let roundNumber = 0;
let totalRounds = 0;
let currentQuestion: TriviaQuestion | null = null;
let roundEndsAt = 0;
let selectedAnswer: string | null = null;
let answerLocked = false;

let correctChoice: string | null = null;
let explanation: string | null = null;
let answerStats: Record<string, { count: number; correct: boolean }> = {};

let players: Player[] = [];
let leaderboard: Array<{ username: string; score: number }> = [];
let winners: Array<{ username: string; score: number; rank: number }> = [];

let shieldAvailable = true;
let shieldUsedThisRound = false;
let apeInUsedThisRound = false;
let buyBackAvailable = true;

let timerInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMyPlayer(): Player | undefined {
  return players.find((p) => p.userId === userId);
}

function amEliminated(): boolean {
  return getMyPlayer()?.eliminated ?? false;
}

function aliveCount(): number {
  return players.filter((p) => !p.eliminated).length;
}

function timeLeft(): number {
  if (!roundEndsAt) return 0;
  return Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
}

function difficultyColor(d?: string): string {
  if (d === 'hard') return 'var(--color-danger)';
  if (d === 'medium') return 'var(--color-gold)';
  return 'var(--color-positive)';
}

// ── Timer ──────────────────────────────────────────────────────────────────────

function startTimer(): void {
  stopTimer();
  timerInterval = setInterval(() => {
    const el = document.getElementById('trivia-timer');
    if (el) {
      const t = timeLeft();
      el.textContent = `${t}s`;
      el.style.color = t <= 5 ? 'var(--color-danger)' : 'var(--text-primary)';
    }
    if (timeLeft() <= 0) stopTimer();
  }, 250);
}

function stopTimer(): void {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ── Render ─────────────────────────────────────────────────────────────────────

function render(): void {
  if (!container) return;

  if (phase === 'waiting') return renderWaiting();
  if (phase === 'answering') return renderQuestion();
  if (phase === 'reveal') return renderReveal();
  if (phase === 'completed') return renderCompleted();
}

function renderWaiting(): void {
  container!.innerHTML = `
    <div class="card card--accent">
      <p class="card__eyebrow">Live Trivia</p>
      <h2 class="card__title">Waiting for game</h2>
      <p class="card__body">When the host drops a round, you're in. Answer fast. Wrong answer = eliminated. Last degen standing takes the pot.</p>
    </div>

    ${prizePool > 0 ? `
      <div class="kpi" style="margin-top:0.75rem;">
        <p class="kpi__value" style="color:var(--color-gold);">$${prizePool}</p>
        <p class="kpi__label">Prize Pool</p>
      </div>
    ` : ''}

    ${players.length > 0 ? renderPlayerRoster() : `
      <div class="waiting">
        <div class="waiting__icon">[HQ]</div>
        <p class="waiting__text">Listening for trivia game...</p>
      </div>
    `}
  `;
}

function renderQuestion(): void {
  if (!currentQuestion) return;

  const q = currentQuestion;
  const eliminated = amEliminated();
  const me = getMyPlayer();
  const t = timeLeft();

  container!.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <p class="card__eyebrow">Round ${roundNumber} / ${totalRounds}${q.category ? ` — ${q.category}` : ''}${q.difficulty ? ` — <span style="color:${difficultyColor(q.difficulty)}">${q.difficulty.toUpperCase()}</span>` : ''}</p>
        <span id="trivia-timer" style="font-family:var(--font-display);font-weight:900;font-size:1.5rem;">${t}s</span>
      </div>
      <h2 class="card__title" style="margin-top:0.5rem;">${q.question}</h2>
      ${prizePool ? `<p class="card__body" style="color:var(--color-gold);">Pot: $${prizePool} — ${aliveCount()} alive</p>` : ''}
    </div>

    ${eliminated ? `
      <div class="card card--danger" style="text-align:center;">
        <p class="card__eyebrow">Eliminated</p>
        <p class="card__body">You're out. Watch the round play out.${buyBackAvailable && me && !me.buyBackUsed ? ' Or buy back in.' : ''}</p>
        ${buyBackAvailable && me && !me.buyBackUsed ? `<button id="btn-buyback" class="btn btn--primary" style="margin-top:0.5rem;">BUY BACK IN</button>` : ''}
      </div>
    ` : `
      <div class="choice-grid">
        ${q.choices.map((c, i) => {
          let cls = 'choice-btn';
          if (selectedAnswer === c) cls += ' selected';
          const disabled = answerLocked || eliminated;
          return `<button class="${cls}" data-choice="${c}" data-idx="${i}" ${disabled ? 'disabled' : ''}>${c}</button>`;
        }).join('')}
      </div>

      ${!answerLocked ? `
        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
          ${shieldAvailable && me && !me.shieldConsumed ? `<button id="btn-shield" class="btn" style="flex:1;" title="Shield: survive one wrong answer this round">SHIELD</button>` : ''}
          ${!apeInUsedThisRound ? `<button id="btn-apein" class="btn btn--primary" style="flex:1;" title="Ape In: double points if correct, instant elimination if wrong">APE IN</button>` : ''}
        </div>
      ` : `
        <div class="card" style="margin-top:0.5rem;text-align:center;">
          <p class="card__body" style="color:var(--color-primary);">Answer locked. Waiting for reveal...</p>
        </div>
      `}
    `}

    ${renderPlayerRoster()}
  `;

  startTimer();
  bindQuestionEvents();
}

function renderReveal(): void {
  if (!currentQuestion) return;

  const q = currentQuestion;

  container!.innerHTML = `
    <div class="card">
      <p class="card__eyebrow">Round ${roundNumber} / ${totalRounds} — REVEAL</p>
      <h2 class="card__title">${q.question}</h2>
    </div>

    <div class="choice-grid">
      ${q.choices.map((c) => {
        let cls = 'choice-btn';
        if (c === correctChoice) cls += ' correct';
        else if (c === selectedAnswer && c !== correctChoice) cls += ' wrong';
        return `<button class="${cls}" disabled>${c}</button>`;
      }).join('')}
    </div>

    ${explanation ? `
      <div class="card" style="margin-top:0.75rem;">
        <p class="card__eyebrow">Explanation</p>
        <p class="card__body">${explanation}</p>
      </div>
    ` : ''}

    ${Object.keys(answerStats).length > 0 ? `
      <div class="card" style="margin-top:0.5rem;">
        <p class="card__eyebrow">Answer distribution</p>
        ${Object.entries(answerStats).map(([choice, s]) => `
          <div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border);">
            <span style="font-size:0.75rem;color:${s.correct ? 'var(--color-positive)' : 'var(--text-muted)'};">${choice}</span>
            <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);">${s.count} votes</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${renderLeaderboard()}
    ${renderPlayerRoster()}
  `;
}

function renderCompleted(): void {
  container!.innerHTML = `
    <div class="card card--accent">
      <p class="card__eyebrow">Game over</p>
      <h2 class="card__title" style="color:var(--color-gold);">
        ${winners.length > 0 ? `${winners[0].username} wins` : 'No survivors'}
      </h2>
      ${prizePool ? `<p class="card__body" style="color:var(--color-gold);">Prize pool: $${prizePool}</p>` : ''}
    </div>

    ${winners.length > 0 ? `
      <div class="card" style="margin-top:0.75rem;">
        <p class="card__eyebrow">Winners</p>
        ${winners.map((w) => `
          <div class="lb-row">
            <span class="lb-row__name">${w.rank}. ${w.username}</span>
            <span class="lb-row__score">${w.score} PTS</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${renderLeaderboard()}

    <div style="margin-top:0.75rem;text-align:center;">
      <p style="font-size:0.7rem;color:var(--text-muted);">Next game starts when the host drops another round.</p>
    </div>
  `;

  // Auto-reset after 15s
  setTimeout(() => {
    if (phase === 'completed') {
      phase = 'waiting';
      resetGameState();
      render();
    }
  }, 15000);
}

function renderLeaderboard(): string {
  if (leaderboard.length === 0) return '';
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  return `
    <div class="card" style="margin-top:0.75rem;">
      <p class="card__eyebrow">Leaderboard</p>
      ${sorted.map((e, i) => `
        <div class="lb-row">
          <span class="lb-row__name">${i + 1}. ${e.username}</span>
          <span class="lb-row__score">${e.score} PTS</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPlayerRoster(): string {
  if (players.length === 0) return '';
  const alive = players.filter((p) => !p.eliminated);
  const dead = players.filter((p) => p.eliminated);

  return `
    <div class="card" style="margin-top:0.75rem;">
      <p class="card__eyebrow">${alive.length} alive / ${players.length} total</p>
      ${alive.map((p) => `
        <div style="display:flex;justify-content:space-between;padding:0.2rem 0;font-size:0.7rem;">
          <span style="color:var(--text-secondary);">${p.username}${p.userId === userId ? ' (you)' : ''}${p.shieldConsumed ? ' [shield used]' : ''}</span>
          <span style="font-family:var(--font-mono);color:var(--color-primary);">${p.score}</span>
        </div>
      `).join('')}
      ${dead.length > 0 ? `
        <div style="margin-top:0.35rem;padding-top:0.35rem;border-top:1px solid var(--border);">
          ${dead.map((p) => `
            <div style="display:flex;justify-content:space-between;padding:0.15rem 0;font-size:0.65rem;">
              <span style="color:var(--text-muted);text-decoration:line-through;">${p.username}${p.userId === userId ? ' (you)' : ''}</span>
              <span style="font-family:var(--font-mono);color:var(--text-muted);">${p.score}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// ── Event bindings ─────────────────────────────────────────────────────────────

function bindQuestionEvents(): void {
  if (!container) return;

  // Answer choices
  container.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (answerLocked || amEliminated()) return;
      selectedAnswer = btn.dataset.choice ?? null;
      answerLocked = true;
      if (selectedAnswer && currentQuestion) {
        relay.submitTriviaAnswer(currentQuestion.id, selectedAnswer);
      }
      render();
    });
  });

  // Shield
  document.getElementById('btn-shield')?.addEventListener('click', () => {
    if (!gameId || !currentQuestion) return;
    relay.requestShield(gameId, currentQuestion.id);
    shieldAvailable = false;
    shieldUsedThisRound = true;
    render();
  });

  // Ape In
  document.getElementById('btn-apein')?.addEventListener('click', () => {
    if (!gameId || !currentQuestion) return;
    relay.requestApeIn(gameId, currentQuestion.id);
    apeInUsedThisRound = true;
    render();
  });

  // Buy Back
  document.getElementById('btn-buyback')?.addEventListener('click', () => {
    if (!gameId) return;
    relay.buyBack(gameId);
    buyBackAvailable = false;
    render();
  });
}

// ── State management ───────────────────────────────────────────────────────────

function resetRoundState(): void {
  selectedAnswer = null;
  answerLocked = false;
  correctChoice = null;
  explanation = null;
  answerStats = {};
  shieldUsedThisRound = false;
  apeInUsedThisRound = false;
  stopTimer();
}

function resetGameState(): void {
  resetRoundState();
  gameId = null;
  prizePool = 0;
  roundNumber = 0;
  totalRounds = 0;
  currentQuestion = null;
  players = [];
  leaderboard = [];
  winners = [];
  shieldAvailable = true;
  buyBackAvailable = true;
}

// ── Mount + event subscriptions ────────────────────────────────────────────────

export function mount(el: HTMLElement, uid: string): void {
  container = el;
  userId = uid;

  // Game started (from game-update envelope)
  relay.on('game.update', (data) => {
    const d = data as { type?: string } & Record<string, unknown>;
    if (d.type === 'trivia-started') {
      const p = d as unknown as GameStartedPayload;
      gameId = p.gameId ?? null;
      prizePool = p.prizePool ?? 0;
      totalRounds = p.totalRounds ?? 0;
      phase = 'waiting';
      render();
    }
    if (d.type === 'trivia-joined') {
      // A new player joined
      render();
    }
    if (d.type === 'trivia-completed') {
      const p = d as unknown as GameCompletedPayload;
      winners = (p.winners ?? []).map((w) => ({ username: w.username, score: w.score, rank: w.rank }));
      if (p.finalScores) players = p.finalScores;
      if (p.prizePool) prizePool = p.prizePool;
      phase = 'completed';
      stopTimer();
      render();
    }
    if (d.type === 'trivia-reset') {
      resetGameState();
      phase = 'waiting';
      render();
    }
    if (d.type === 'jackpot-update') {
      prizePool = (d as { pool?: number }).pool ?? prizePool;
      render();
    }
  });

  // Round start
  relay.on('trivia.round.start', (data) => {
    const d = data as RoundStartPayload;
    resetRoundState();
    gameId = d.gameId ?? gameId;
    currentQuestion = d.question ?? null;
    prizePool = d.prizePool ?? prizePool;
    roundNumber = d.roundNumber ?? roundNumber + 1;
    totalRounds = d.totalRounds ?? totalRounds;
    roundEndsAt = d.endsAt ?? (Date.now() + 30_000);
    if (d.leaderboard) leaderboard = d.leaderboard;
    if (d.players) {
      players = d.players;
      // Refresh powerup state from server
      const me = getMyPlayer();
      if (me) {
        shieldAvailable = !me.shieldConsumed;
        buyBackAvailable = !me.buyBackUsed;
      }
    }
    phase = 'answering';
    render();
  });

  // Round reveal
  relay.on('trivia.round.reveal', (data) => {
    const d = data as RoundRevealPayload;
    correctChoice = d.correctChoice ?? null;
    explanation = d.explanation ?? null;
    answerStats = d.stats ?? {};
    if (d.leaderboard) leaderboard = d.leaderboard;
    if (d.players) players = d.players;
    phase = 'reveal';
    stopTimer();
    render();
  });

  // Player eliminated
  relay.on('trivia.player.eliminated', (data) => {
    const d = data as { userId: string };
    const p = players.find((pl) => pl.userId === d.userId);
    if (p) p.eliminated = true;
    render();
  });

  // Player reinstated (buy back)
  relay.on('trivia.player.reinstated', (data) => {
    const d = data as { userId: string };
    const p = players.find((pl) => pl.userId === d.userId);
    if (p) { p.eliminated = false; p.buyBackUsed = true; }
    render();
  });

  // Ape-in result
  relay.on('trivia.ape-in.result', (data) => {
    const d = data as { success?: boolean; message?: string };
    if (!d.success) {
      // Could show a toast, for now just re-render
    }
    render();
  });

  // Shield result
  relay.on('trivia.shield.result', (data) => {
    const d = data as { activated?: boolean };
    if (d.activated) {
      const me = getMyPlayer();
      if (me) me.shieldConsumed = true;
      shieldAvailable = false;
    }
    render();
  });

  render();
}
