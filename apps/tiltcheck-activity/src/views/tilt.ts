// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Tilt view — tilt status, The Brakes trigger, behavioral signals

import { openExternal } from '../sdk.js';

interface TiltSignal {
  label: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

let tiltScore = 0;
let signals: TiltSignal[] = [];
let brakesEngaged = false;
let container: HTMLElement | null = null;

function severityClass(s: string): string {
  if (s === 'high') return 'tilt-high';
  if (s === 'medium') return 'tilt-medium';
  return 'tilt-low';
}

function tiltLabel(score: number): string {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'ELEVATED';
  if (score >= 20) return 'WATCH';
  return 'CLEAR';
}

function render(): void {
  if (!container) return;

  const label = tiltLabel(tiltScore);
  const cls = tiltScore >= 60 ? 'tilt-high' : tiltScore >= 30 ? 'tilt-medium' : 'tilt-low';

  container.innerHTML = `
    <div class="card ${tiltScore >= 60 ? 'card--danger' : tiltScore >= 30 ? 'card--warning' : 'card--accent'}">
      <p class="card__eyebrow">Tilt score</p>
      <div style="display:flex;align-items:baseline;gap:0.75rem;">
        <span class="kpi__value ${cls}" style="font-size:2.5rem;">${tiltScore}</span>
        <span class="card__body ${cls}" style="font-weight:700;">${label}</span>
      </div>
      <div class="rtp-bar" style="margin-top:0.5rem;">
        <div class="rtp-bar__fill" style="width:${tiltScore}%;background:${tiltScore >= 60 ? 'var(--color-danger)' : tiltScore >= 30 ? 'var(--color-warning)' : 'var(--color-primary)'};"></div>
      </div>
    </div>

    ${brakesEngaged ? `
      <div class="card card--danger">
        <p class="card__eyebrow">The Brakes</p>
        <h2 class="card__title" style="color:var(--color-danger);">ENGAGED</h2>
        <p class="card__body">Your line was hit. Step away. The session is over.</p>
      </div>
    ` : `
      <button id="btn-brakes" class="btn btn--danger" style="width:100%;margin-bottom:0.75rem;">
        Engage The Brakes
      </button>
    `}

    ${signals.length > 0 ? `
      <div class="card">
        <p class="card__eyebrow">Behavioral signals</p>
        ${signals.map((s) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.35rem 0;border-bottom:1px solid var(--border);">
            <span style="font-size:0.75rem;color:var(--text-secondary);">${s.label}</span>
            <span class="${severityClass(s.severity)}" style="font-family:var(--font-mono);font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${s.severity}</span>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="card">
        <p class="card__eyebrow">Behavioral signals</p>
        <p class="card__body">No signals detected. Keep playing smart.</p>
      </div>
    `}

    <div class="card" style="margin-top:0.5rem;">
      <p class="card__eyebrow">Need help?</p>
      <p class="card__body">If you have lost money you cannot afford to lose:</p>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
        <button id="btn-ncpg" class="btn btn--primary" style="flex:1;">NCPG.org</button>
        <button id="btn-gambler" class="btn" style="flex:1;">1-800-GAMBLER</button>
      </div>
    </div>
  `;

  if (!brakesEngaged) {
    document.getElementById('btn-brakes')?.addEventListener('click', () => {
      brakesEngaged = true;
      render();
    });
  }

  document.getElementById('btn-ncpg')?.addEventListener('click', () => {
    openExternal('https://www.ncpg.org');
  });
}

export function mount(el: HTMLElement, relayModule: { on: (event: string, handler: (data: unknown) => void) => void }): void {
  container = el;

  // Listen for tilt updates from hub relay via socket.io
  relayModule.on('session.update', (data) => {
    const d = data as { tiltScore?: number; signals?: TiltSignal[] };
    if (d.tiltScore !== undefined) {
      tiltScore = d.tiltScore;
      if (d.signals) signals = d.signals;
      render();
    }
  });

  // Listen for dedicated tilt events
  relayModule.on('tilt.update', (data) => {
    const d = data as { tiltScore?: number; signals?: TiltSignal[] };
    if (d.tiltScore !== undefined) tiltScore = d.tiltScore;
    if (d.signals) signals = d.signals;
    render();
  });

  render();
}
