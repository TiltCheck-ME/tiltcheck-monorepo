// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// DA&D view — Degens Against Decency card game

import * as relay from '../relay.js';

interface DadRound {
  prompt: string;
  cards: Array<{ id: string; text: string }>;
  phase: 'play' | 'vote' | 'reveal';
  winner?: { cardId: string; username: string };
}

let currentRound: DadRound | null = null;
let container: HTMLElement | null = null;
let userId = '';

function render(): void {
  if (!container) return;

  if (!currentRound) {
    container.innerHTML = `
      <div class="card card--accent">
        <p class="card__eyebrow">DA&D</p>
        <h2 class="card__title">Waiting for round</h2>
        <p class="card__body">A prompt drops when the room is ready. Play your worst card.</p>
      </div>
      <div class="waiting">
        <div class="waiting__icon">[CARDS]</div>
        <p class="waiting__text">Listening for game-arena...</p>
      </div>
    `;
    return;
  }

  const { prompt, cards, phase, winner } = currentRound;

  container.innerHTML = `
    <div class="card">
      <p class="card__eyebrow">Prompt</p>
      <h2 class="card__title">${prompt}</h2>
      <p class="card__body" style="color:var(--text-muted);">Phase: ${phase.toUpperCase()}</p>
    </div>

    ${phase === 'reveal' && winner ? `
      <div class="card card--accent">
        <p class="card__eyebrow">Winner</p>
        <h2 class="card__title" style="color:var(--color-gold);">${winner.username}</h2>
      </div>
    ` : ''}

    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.5rem;">
      ${cards.map((c) => `
        <button class="btn ${phase === 'play' ? 'btn--primary' : ''}" data-card="${c.id}" ${phase !== 'play' ? 'disabled' : ''}>
          ${c.text}
        </button>
      `).join('')}
    </div>
  `;

  if (phase === 'play') {
    container.querySelectorAll<HTMLButtonElement>('[data-card]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cardId = btn.dataset.card;
        if (cardId && currentRound) {
          relay.playCard('current', cardId, userId);
          btn.disabled = true;
          btn.textContent = 'PLAYED';
        }
      });
    });
  }
}

export function mount(el: HTMLElement, uid: string): void {
  container = el;
  userId = uid;

  relay.on('dad.round', (data) => {
    const d = data as DadRound;
    currentRound = d;
    render();
  });

  relay.on('game.update', (data) => {
    const d = data as { type?: string };
    if (d.type === 'dad-round') {
      currentRound = data as DadRound;
      render();
    }
  });

  render();
}
