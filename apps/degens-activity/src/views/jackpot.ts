// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Jackpot view — Live Trivia prize pool fed by JustTheTip
// The "jackpot" IS the trivia prize pool. It grows from /rain, /triviadrop funding,
// and direct Solana Pay deposits. Winner of the Live Trivia HQ game takes it.

import * as relay from '../relay.js';
import { openExternal } from '../sdk.js';

interface JackpotState {
  pool: number;
  entries: number;
  lastWinner: string | null;
  lastPayout: number;
  fundingUrl: string | null;
}

interface RainEvent {
  fromUsername: string;
  amountSol: number;
  message: string;
  timestamp: number;
}

let state: JackpotState = {
  pool: 0,
  entries: 0,
  lastWinner: null,
  lastPayout: 0,
  fundingUrl: null,
};

let recentRains: RainEvent[] = [];
let container: HTMLElement | null = null;

function render(): void {
  if (!container) return;

  container.innerHTML = `
    <div class="spinner">
      <p class="spinner__label">Live Trivia Prize Pool</p>
      <p class="spinner__value">$${state.pool.toFixed(2)}</p>
      <p class="spinner__label">${state.entries} players in queue</p>
    </div>

    <div class="grid-3" style="margin-top:1rem;">
      <div class="kpi">
        <p class="kpi__value">${state.entries}</p>
        <p class="kpi__label">Players</p>
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
        <p class="card__body">Won $${state.lastPayout.toFixed(2)} in the last Live Trivia game.</p>
      </div>
    ` : ''}

    ${recentRains.length > 0 ? `
      <div class="card" style="margin-top:0.75rem;">
        <p class="card__eyebrow">Recent rain drops</p>
        ${recentRains.slice(0, 5).map((r) => `
          <div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border);">
            <span style="font-size:0.7rem;color:var(--text-secondary);">${r.fromUsername}</span>
            <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-primary);">${r.amountSol.toFixed(4)} SOL</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="card" style="margin-top:0.75rem;">
      <p class="card__eyebrow">How the jackpot works</p>
      <p class="card__body">
        The pot grows from <strong>/rain</strong> drops, <strong>/triviadrop</strong> escrow funding,
        and direct Solana Pay deposits. Winner of the Live Trivia HQ game takes it all.
        No entry fee. Just survive the questions.
      </p>
    </div>

    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
      <button id="btn-fund" class="btn btn--primary" style="flex:1;">Fund the Pot</button>
      <button id="btn-play" class="btn" style="flex:1;">Play Trivia</button>
    </div>
  `;

  document.getElementById('btn-fund')?.addEventListener('click', () => {
    openExternal('https://tiltcheck.me/pay/jackpot');
  });

  document.getElementById('btn-play')?.addEventListener('click', () => {
    // Switch to trivia tab
    document.querySelector<HTMLElement>('.tab[data-view="trivia"]')?.click();
  });
}

export function mount(el: HTMLElement, uid: string): void {
  container = el;

  // Live jackpot updates from game-arena
  relay.on('jackpot.update', (data) => {
    const d = data as { pool?: number; entries?: number; lastWinner?: string; lastPayout?: number };
    if (d.pool !== undefined) state.pool = d.pool;
    if (d.entries !== undefined) state.entries = d.entries;
    if (d.lastWinner) state.lastWinner = d.lastWinner;
    if (d.lastPayout !== undefined) state.lastPayout = d.lastPayout;
    render();
  });

  // Trivia game-update events also carry pool info
  relay.on('game.update', (data) => {
    const d = data as { type?: string; pool?: number; prizePool?: number; entries?: number; winners?: Array<{ username: string; score: number }> };
    if (d.type === 'jackpot-update' || d.type === 'trivia-started') {
      if (d.pool !== undefined) state.pool = d.pool;
      if (d.prizePool !== undefined) state.pool = d.prizePool;
      if (d.entries !== undefined) state.entries = d.entries;
      render();
    }
    if (d.type === 'trivia-completed' && d.winners && d.winners.length > 0) {
      state.lastWinner = d.winners[0].username;
      if (d.prizePool) state.lastPayout = d.prizePool;
      state.pool = 0;
      render();
    }
  });

  // Rain events feed into the recent rains display
  relay.on('tip.rain', (data) => {
    const d = data as { fromUsername?: string; amountSol?: number; message?: string };
    if (d.fromUsername && d.amountSol) {
      recentRains.unshift({
        fromUsername: d.fromUsername,
        amountSol: d.amountSol,
        message: d.message ?? '',
        timestamp: Date.now(),
      });
      recentRains = recentRains.slice(0, 10);
      render();
    }
  });

  render();
}
