// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Session view — RTP dashboard + drift + manual round entry

import * as relay from '../relay.js';

interface Round { bet: number; win: number; timestamp: number; }

let rounds: Round[] = [];
let expectedRtp = 96.5;
let startedAt = Date.now();
let container: HTMLElement | null = null;
let userId = '';
let channelId = '';

function calcRtp(r: Round[]): number {
  if (r.length === 0) return 0;
  const wagered = r.reduce((s, x) => s + x.bet, 0);
  if (wagered === 0) return 0;
  return (r.reduce((s, x) => s + x.win, 0) / wagered) * 100;
}

function driftClass(drift: number): string {
  if (Math.abs(drift) < 2) return 'drift-neutral';
  return drift > 0 ? 'drift-positive' : 'drift-negative';
}

function confidence(count: number): string {
  if (count < 50) return 'NEED DATA';
  if (count < 100) return 'LOW';
  if (count < 250) return 'MODERATE';
  if (count < 500) return 'GOOD';
  return 'HIGH';
}

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}H ${m % 60}M` : `${m}M`;
}

function render(): void {
  if (!container) return;

  const actual = calcRtp(rounds);
  const drift = actual - expectedRtp;
  const wagered = rounds.reduce((s, r) => s + r.bet, 0);
  const returned = rounds.reduce((s, r) => s + r.win, 0);
  const netPL = returned - wagered;
  const hasData = rounds.length > 0;

  container.innerHTML = `
    ${hasData ? `
      <div class="grid-3">
        <div class="kpi">
          <p class="kpi__value ${driftClass(drift)}">${actual.toFixed(1)}%</p>
          <p class="kpi__label">Actual RTP</p>
        </div>
        <div class="kpi">
          <p class="kpi__value">${expectedRtp.toFixed(1)}%</p>
          <p class="kpi__label">Expected</p>
        </div>
        <div class="kpi">
          <p class="kpi__value ${driftClass(drift)}">${drift > 0 ? '+' : ''}${drift.toFixed(1)}%</p>
          <p class="kpi__label">Drift</p>
        </div>
      </div>

      <div class="grid-4" style="margin-top:0.5rem;">
        <div class="kpi">
          <p class="kpi__value" style="font-size:1rem;">${rounds.length}</p>
          <p class="kpi__label">Rounds</p>
        </div>
        <div class="kpi">
          <p class="kpi__value" style="font-size:1rem;">$${wagered.toFixed(0)}</p>
          <p class="kpi__label">Wagered</p>
        </div>
        <div class="kpi">
          <p class="kpi__value" style="font-size:1rem;color:${netPL >= 0 ? 'var(--color-positive)' : 'var(--color-danger)'};">${netPL >= 0 ? '+' : ''}$${netPL.toFixed(0)}</p>
          <p class="kpi__label">Net P/L</p>
        </div>
        <div class="kpi">
          <p class="kpi__value" style="font-size:1rem;">${confidence(rounds.length)}</p>
          <p class="kpi__label">Confidence</p>
        </div>
      </div>

      <div class="card" style="margin-top:0.75rem;">
        <p class="card__eyebrow">Session: ${formatTime(Date.now() - startedAt)}</p>
        <div class="rtp-bar">
          <div class="rtp-bar__fill" style="width:${Math.min(100, actual)}%;background:${drift >= -2 ? 'var(--color-primary)' : 'var(--color-danger)'};"></div>
        </div>
      </div>
    ` : `
      <div class="waiting">
        <div class="waiting__icon">[SIGNAL]</div>
        <p class="waiting__text">No rounds logged. Start playing with the extension or log manually below.</p>
      </div>
    `}

    <div class="card" style="margin-top:0.75rem;">
      <p class="card__eyebrow">Manual entry</p>
      <div class="input-row">
        <div class="input-field">
          <label>Bet ($)</label>
          <input type="number" id="inp-bet" placeholder="10.00" step="0.01" min="0" />
        </div>
        <div class="input-field">
          <label>Win ($)</label>
          <input type="number" id="inp-win" placeholder="0.00" step="0.01" min="0" />
        </div>
        <button id="btn-add" class="btn btn--primary">+</button>
      </div>
    </div>

    <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
      <button id="btn-reset" class="btn" style="flex:1;">Reset session</button>
      <button id="btn-alert" class="btn btn--danger" style="flex:1;">Panic signal</button>
    </div>
  `;

  // Bind events
  document.getElementById('btn-add')?.addEventListener('click', () => {
    const bet = parseFloat((document.getElementById('inp-bet') as HTMLInputElement).value);
    const win = parseFloat((document.getElementById('inp-win') as HTMLInputElement).value) || 0;
    if (!isNaN(bet) && bet > 0) {
      const round = { bet, win, timestamp: Date.now() };
      rounds.push(round);
      relay.pushRound(userId, channelId, round);
      render();
    }
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    rounds = [];
    startedAt = Date.now();
    render();
  });

  document.getElementById('btn-alert')?.addEventListener('click', () => {
    const HUB = import.meta.env.VITE_HUB_URL || 'https://api.tiltcheck.me';
    fetch(`${HUB}/tilt-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        timestamp: Date.now(),
        signal: 'Manual panic trigger from Activity.',
        stats: { rounds: rounds.length, actualRtp: calcRtp(rounds), expectedRtp },
      }),
    }).catch(() => {});
  });
}

export function mount(el: HTMLElement, uid: string, cid: string): void {
  container = el;
  userId = uid;
  channelId = cid;

  relay.on('session.update', (data) => {
    const d = data as { userId: string; rounds?: Round[] };
    if (d.userId === userId && d.rounds) {
      rounds = d.rounds;
      render();
    }
  });

  render();
}
