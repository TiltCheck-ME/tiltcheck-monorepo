// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Trivia view — live trivia drops

import * as relay from '../relay.js';

interface TriviaQuestion {
  id: string;
  question: string;
  choices: string[];
  category?: string;
}

interface TriviaRoundStart {
  gameId?: string;
  question?: TriviaQuestion;
  prizePool?: number;
  roundNumber?: number;
  totalRounds?: number;
  leaderboard?: Array<{ username: string; score: number }>;
}

interface TriviaRoundReveal {
  correctChoice?: string;
  explanation?: string;
  leaderboard?: Array<{ username: string; score: number }>;
}

let roundData: TriviaRoundStart | null = null;
let revealData: TriviaRoundReveal | null = null;
let selectedAnswer: string | null = null;
let container: HTMLElement | null = null;

function render(): void {
  if (!container) return;

  // Waiting state
  if (!roundData?.question) {
    container.innerHTML = `
      <div class="card card--accent">
        <p class="card__eyebrow">Trivia</p>
        <h2 class="card__title">Waiting for drop</h2>
        <p class="card__body">When the round drops, answer fast. Last degen standing takes the pot.</p>
      </div>
      <div class="waiting">
        <div class="waiting__icon">[?]</div>
        <p class="waiting__text">Listening for trivia round...</p>
      </div>
    `;
    return;
  }

  const q = roundData.question;
  const isRevealed = revealData !== null;
  const lb = (isRevealed ? revealData?.leaderboard : roundData.leaderboard) ?? [];

  container.innerHTML = `
    <div class="card">
      <p class="card__eyebrow">Round ${roundData.roundNumber ?? '?'} / ${roundData.totalRounds ?? '?'}${q.category ? ` — ${q.category}` : ''}</p>
      <h2 class="card__title">${q.question}</h2>
      ${roundData.prizePool ? `<p class="card__body" style="color:var(--color-gold);">Pot: $${roundData.prizePool}</p>` : ''}
    </div>

    <div class="choice-grid">
      ${q.choices.map((c) => {
        let cls = 'choice-btn';
        if (isRevealed && c === revealData?.correctChoice) cls += ' correct';
        else if (isRevealed && c === selectedAnswer && c !== revealData?.correctChoice) cls += ' wrong';
        else if (!isRevealed && c === selectedAnswer) cls += ' selected';
        return `<button class="${cls}" data-choice="${c}" ${isRevealed || selectedAnswer ? 'disabled' : ''}>${c}</button>`;
      }).join('')}
    </div>

    ${isRevealed && revealData?.explanation ? `
      <div class="card" style="margin-top:0.75rem;">
        <p class="card__eyebrow">Answer</p>
        <p class="card__body">${revealData.explanation}</p>
      </div>
    ` : ''}

    ${lb.length > 0 ? `
      <div class="card" style="margin-top:0.75rem;">
        <p class="card__eyebrow">Leaderboard</p>
        ${lb.sort((a, b) => b.score - a.score).slice(0, 8).map((e) => `
          <div class="lb-row">
            <span class="lb-row__name">${e.username}</span>
            <span class="lb-row__score">${e.score} PTS</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  if (!isRevealed && !selectedAnswer) {
    container.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedAnswer = btn.dataset.choice ?? null;
        if (selectedAnswer && roundData?.question) {
          relay.submitTriviaAnswer(roundData.question.id, selectedAnswer);
        }
        render();
      });
    });
  }
}

export function mount(el: HTMLElement): void {
  container = el;

  relay.on('trivia.round.start', (data) => {
    roundData = data as TriviaRoundStart;
    revealData = null;
    selectedAnswer = null;
    render();
  });

  relay.on('trivia.round.reveal', (data) => {
    revealData = data as TriviaRoundReveal;
    render();
  });

  render();
}
