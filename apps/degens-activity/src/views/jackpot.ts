// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Jackpot view — community pot spinner

import * as relay from '../relay.js';

interface JackpotState {
  pool: number;
  entries: number;
  lastWinner: string | null;
  lastPayout: number;
  spinning: boolean;
}

let state: JackpotState = {
  pool: 0,
  entries: 0,
  lastWinner: null,
  lastPayout: 0,
  spinning: false,
};

let container: HTMLElement | null = null;

function render(): void {
  if (!container) return;

  container.innerHTML = `
    <div class="spinner">
      <p class="spinner__label">Community Jackpot</p>
      <p class="spinner__value">${state.spinning ? '...' : `$${state.pool.toFixed(2)}`}</p>
      <p class="spinner__label">${state.entries} entries in pot</p>
    </div>

    <div class="grid-3" style="margin-top:1rem;">
      <div class="kpi">
        <p class="kpi__value">${state.entries}</p>
        <p class="kpi__label">Entries</p>
      </div>
      <div class="kpi">
        <p class="kpi__value" style="color:var(--color-gold);">$${state.pool.toFixed(0)}</p>
        <p class="kpi__label">Pool</p>
      </div>
      <div class="kpi">
        <p class="kpi__value" style="color:${state.lastWinner ? 'var(--color-positive)' : 'var(--text-muted)'};">${state.lastWinner ? `$${state.lastPayout.toFixed(0)}` : '--'}</p>
        <p class="kpi__label">Last payout</p>
      </div>
    </div>

    ${state.lastWinner ? `
      <div class="card" style="margin-top:0.75rem;">
        <p class="card__eyebrow">Last winner</p>
        <h2 class="card__title" style="color:var(--color-gold);">${state.lastWinner}</h2>
        <p class="card__body">Took home $${state.lastPayout.toFixed(2)} from the pot.</p>
      </div>
    ` : ''}

    <div class="card" style="margin-top:0.75rem;">
      <p class="card__eyebrow">How it works</p>
      <p class="card__body">Pool grows from game activity. Random spin picks a winner. No skill. Pure chaos.</p>
    </div>
  `;
}

export function mount(el: HTMLElement): void {
  container = el;

  relay.on('game.update', (data) => {
    const d = data as { type?: string; pool?: number; entries?: number; winner?: string; payout?: number };
    if (d.type === 'jackpot-update') {
      if (d.pool !== undefined) state.pool = d.pool;
      if (d.entries !== undefined) state.entries = d.entries;
      render();
    }
    if (d.type === 'jackpot-spin') {
      state.spinning = true;
      render();
      setTimeout(() => {
        state.spinning = false;
        if (d.winner) state.lastWinner = d.winner;
        if (d.payout !== undefined) state.lastPayout = d.payout;
        render();
      }, 2000);
    }
  });

  render();
}
