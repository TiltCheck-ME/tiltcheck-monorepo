// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Trust view — quick casino trust lookup

import { openExternal } from '../sdk.js';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.tiltcheck.me';

interface TrustResult {
  name: string;
  slug: string;
  score: number;
  grade: string;
  risk: string;
}

let container: HTMLElement | null = null;
let query = '';
let result: TrustResult | null = null;
let loading = false;
let error: string | null = null;

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--color-positive)';
  if (score >= 50) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function render(): void {
  if (!container) return;

  container.innerHTML = `
    <div class="card card--accent">
      <p class="card__eyebrow">Casino trust lookup</p>
      <p class="card__body">Search a casino. Read the score. No guesswork.</p>
    </div>

    <div class="input-row" style="margin-bottom:0.75rem;">
      <div class="input-field" style="flex:1;">
        <label>Casino name or domain</label>
        <input type="text" id="inp-search" placeholder="stake.com" value="${query}" />
      </div>
      <button id="btn-search" class="btn btn--primary" ${loading ? 'disabled' : ''}>
        ${loading ? '...' : 'Look up'}
      </button>
    </div>

    ${error ? `
      <div class="card card--danger">
        <p class="card__body" style="color:var(--color-danger);">${error}</p>
      </div>
    ` : ''}

    ${result ? `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <p class="card__eyebrow">${result.risk} risk</p>
            <h2 class="card__title">${result.name}</h2>
          </div>
          <div style="text-align:right;">
            <span class="trust-grade" style="color:${scoreColor(result.score)};">${result.grade}</span>
            <p class="card__body" style="font-family:var(--font-mono);font-size:0.7rem;">${result.score}/100</p>
          </div>
        </div>
      </div>

      <button id="btn-full" class="btn btn--primary" style="width:100%;margin-top:0.5rem;">
        Open full trust read
      </button>
    ` : ''}

    ${!result && !error && !loading ? `
      <div class="waiting">
        <div class="waiting__icon">[TRUST]</div>
        <p class="waiting__text">Enter a casino name above to check the trust score.</p>
      </div>
    ` : ''}
  `;

  // Bind
  const searchInput = document.getElementById('inp-search') as HTMLInputElement;
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  document.getElementById('btn-search')?.addEventListener('click', doSearch);

  if (result) {
    document.getElementById('btn-full')?.addEventListener('click', () => {
      openExternal(`https://tiltcheck.me/casinos/${result!.slug}`);
    });
  }
}

async function doSearch(): Promise<void> {
  const input = (document.getElementById('inp-search') as HTMLInputElement)?.value.trim();
  if (!input) return;

  query = input;
  loading = true;
  error = null;
  result = null;
  render();

  try {
    const res = await fetch(`${API_URL}/rgaas/casino-lookup?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`${res.status}`);

    const data = (await res.json()) as { casino?: TrustResult };
    if (data.casino) {
      result = data.casino;
    } else {
      error = 'No casino matched that search. Check the spelling or try the domain.';
    }
  } catch {
    error = 'Lookup failed. The API might be cold.';
  }

  loading = false;
  render();
}

export function mount(el: HTMLElement): void {
  container = el;
  render();
}
