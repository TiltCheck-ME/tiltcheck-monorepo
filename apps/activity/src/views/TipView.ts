// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20

import type { SessionState, TipRain, TipEntry } from '../state/SessionState.js';
import type { HubRelay } from '../sdk/HubRelay.js';
import { getApiEndpointCandidates } from '../config.js';

export class TipView {
  private container: HTMLElement;
  private state: SessionState;
  private relay: HubRelay;
  private channelId: string;
  private rainTimer: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement, state: SessionState, relay: HubRelay, channelId: string) {
    this.container = container;
    this.state = state;
    this.relay = relay;
    this.channelId = channelId;
  }

  async mount(): Promise<void> {
    await Promise.all([this.fetchEliteStatus(), this.fetchTipHistory()]);
    this.render();
    this.state.on('tip', () => this.render());

    this.relay.on('tip.rain', (data: unknown) => {
      const d = data as TipRain;
      this.state.setActiveRain(d);
      this.flashNavBadge(true);
    });

    this.relay.on('tip.claimed', (data: unknown) => {
      const d = data as { rainId: string };
      if (this.state.activeRain?.id === d.rainId) {
        this.state.setActiveRain(null);
        this.flashNavBadge(false);
      }
    });

    this.relay.on('tip.sent', (data: unknown) => {
      this.state.addTipToHistory(data as TipEntry);
    });
  }

  private flashNavBadge(show: boolean): void {
    const tab = document.querySelector('.nav-tab[data-view="bonuses"]');
    if (!tab) return;
    if (show) {
      tab.classList.add('has-rain');
    } else {
      tab.classList.remove('has-rain');
    }
  }

  private async fetchEliteStatus(): Promise<void> {
    const data = await this.fetchFirstOkJson<{ isElite?: boolean; feeSavedSol?: number }>(
      getApiEndpointCandidates(`/user/${this.state.userId}/elite`)
    );
    if (!data) return;
    this.state.setEliteStatus(data.isElite ?? false, data.feeSavedSol ?? 0);
  }

  private async fetchTipHistory(): Promise<void> {
    const data = await this.fetchFirstOkJson<{ tips?: TipEntry[] }>(
      getApiEndpointCandidates(`/justthetip/history?channelId=${encodeURIComponent(this.channelId)}`)
    );
    if (!Array.isArray(data?.tips)) return;
    data.tips.forEach((t: TipEntry) => this.state.addTipToHistory(t));
  }

  private async claimRain(rainId: string): Promise<void> {
    const btn = this.container.querySelector<HTMLButtonElement>('#tip-claim-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'CLAIMING...'; }
    try {
      const res = await this.fetchFirstOkResponse(getApiEndpointCandidates('/justthetip/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rainId, userId: this.state.userId, channelId: this.channelId })
      });
      if (res.ok) {
        const data = await res.json();
        this.state.setActiveRain(null);
        this.flashNavBadge(false);
        this.state.addTipToHistory({
          id: rainId,
          fromUsername: this.state.activeRain?.fromUsername ?? 'ROOM',
          toUsername: this.state.username,
          amountSol: data.amountSol ?? 0,
          message: 'Claimed',
          timestamp: Date.now(),
          claimed: true
        });
        this.showToast(`+${(data.amountSol ?? 0).toFixed(4)} SOL claimed`);
      } else {
        this.showToast('Claim failed — try again', true);
        if (btn) { btn.disabled = false; btn.textContent = 'CLAIM'; }
      }
    } catch (_) {
      this.showToast('Network error', true);
      if (btn) { btn.disabled = false; btn.textContent = 'CLAIM'; }
    }
  }

  private async sendTip(): Promise<void> {
    const toInput = this.container.querySelector<HTMLInputElement>('#tip-to');
    const amountInput = this.container.querySelector<HTMLInputElement>('#tip-amount');
    const msgInput = this.container.querySelector<HTMLInputElement>('#tip-msg');
    const btn = this.container.querySelector<HTMLButtonElement>('#tip-send-btn');

    const toUsername = toInput?.value.trim().replace(/^@/, '') ?? '';
    const amountSol = parseFloat(amountInput?.value ?? '0');
    const message = msgInput?.value.trim() ?? '';

    if (!toUsername || !amountSol || amountSol <= 0) {
      this.showToast('Enter a username and amount', true);
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'SENDING...'; }

    try {
      const res = await this.fetchFirstOkResponse(getApiEndpointCandidates('/justthetip/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: this.state.userId,
          toUsername,
          amountSol,
          message,
          channelId: this.channelId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (toInput) toInput.value = '';
        if (amountInput) amountInput.value = '';
        if (msgInput) msgInput.value = '';
        this.showToast(`Sent ${amountSol} SOL to @${toUsername}`);
        // relay broadcasts to room — tip.sent event will update history
        if (data.feeSavedSol > 0) {
          this.state.setEliteStatus(true, this.state.feeSavedSol + data.feeSavedSol);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        this.showToast(err.message ?? 'Send failed', true);
      }
    } catch (_) {
      this.showToast('Network error', true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'SEND TIP'; }
    }
  }

  private async fetchFirstOkJson<T>(endpoints: readonly string[]): Promise<T | null> {
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          continue;
        }
        return await res.json() as T;
      } catch (_) {
        continue;
      }
    }
    return null;
  }

  private async fetchFirstOkResponse(endpoints: readonly string[], init: RequestInit): Promise<Response> {
    let fallbackResponse: Response | null = null;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, init);
        if (res.ok) {
          return res;
        }
        fallbackResponse = res;
      } catch (_) {
        continue;
      }
    }

    return fallbackResponse ?? new Response(null, { status: 503, statusText: 'Activity API unavailable' });
  }

  private showToast(msg: string, isError = false): void {
    const existing = this.container.querySelector('.tip-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'tip-toast';
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 4rem; left: 50%; transform: translateX(-50%);
      background: ${isError ? '#ef4444' : '#17c3b2'};
      color: #000; font-weight: 700; font-size: 0.75rem; letter-spacing: 0.08em;
      padding: 0.5rem 1.25rem; z-index: 9999; text-transform: uppercase;
      animation: toast-in 0.15s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private startRainCountdown(expiresAt: number): void {
    if (this.rainTimer) clearInterval(this.rainTimer);
    const el = this.container.querySelector<HTMLElement>('#rain-countdown');
    const update = () => {
      const ms = expiresAt - Date.now();
      if (!el) return;
      if (ms <= 0) {
        el.textContent = 'EXPIRED';
        if (this.rainTimer) clearInterval(this.rainTimer);
        this.state.setActiveRain(null);
        return;
      }
      const s = Math.ceil(ms / 1000);
      el.textContent = `${s}s`;
      if (s <= 10) el.style.color = '#ef4444';
    };
    update();
    this.rainTimer = setInterval(update, 500);
  }

  render(): void {
    if (this.rainTimer) { clearInterval(this.rainTimer); this.rainTimer = null; }
    const rain = this.state.activeRain;
    const history = this.state.tipHistory;
    const isElite = this.state.isElite;
    const feeSaved = this.state.feeSavedSol;

    this.container.innerHTML = `
      ${rain ? `
      <div class="tip-rain-banner">
        <div class="tip-rain-header">
          <span class="tip-rain-label">RAIN LIVE</span>
          <span class="tip-rain-timer" id="rain-countdown">--</span>
        </div>
        <div class="tip-rain-body">
          <span class="tip-rain-from">${rain.fromUsername}</span>
          <span class="tip-rain-amount">${rain.amountSol.toFixed(4)} SOL</span>
        </div>
        ${rain.message ? `<p class="tip-rain-msg">"${rain.message}"</p>` : ''}
        <button class="btn-claim" id="tip-claim-btn">CLAIM</button>
      </div>
      ` : `
      <div class="tip-idle-state">
        <span class="tip-idle-label">NO ACTIVE RAIN</span>
        <p class="tip-idle-sub">When someone rains the room, it shows up here. Be the whale.</p>
      </div>
      `}

      <div class="tip-send-form">
        <p class="section-label">SEND TIP</p>
        <div class="tip-form-row">
          <input id="tip-to" class="tip-input" type="text" placeholder="@username or ROOM" autocomplete="off" />
          <input id="tip-amount" class="tip-input tip-input-sm" type="number" placeholder="SOL" step="0.001" min="0.001" />
        </div>
        <input id="tip-msg" class="tip-input" type="text" placeholder="message (optional)" maxlength="80" />
        <button class="btn-send" id="tip-send-btn">SEND TIP</button>
      </div>

      <div class="tip-elite-badge ${isElite ? 'elite-active' : 'elite-inactive'}">
        <span class="elite-status">${isElite ? 'ELITE — 0% FEES' : 'FREE TIER — 2.5% FEE'}</span>
        ${isElite
          ? `<span class="elite-saved">You've saved ${feeSaved.toFixed(4)} SOL in fees</span>`
          : `<span class="elite-cta">Upgrade to Elite — stop feeding the protocol</span>`
        }
      </div>

      <div class="tip-history">
        <p class="section-label">RECENT RAINS (${history.length})</p>
        ${history.length === 0 ? `
          <p class="tip-history-empty">No tips yet. Change that.</p>
        ` : history.slice(0, 10).map(t => `
          <div class="tip-history-row ${t.claimed ? 'claimed' : ''}">
            <span class="tip-hist-from">${t.fromUsername}</span>
            <span class="tip-hist-arrow">-></span>
            <span class="tip-hist-to">${t.toUsername}</span>
            <span class="tip-hist-amount">${t.amountSol.toFixed(4)} SOL</span>
            ${t.message ? `<span class="tip-hist-msg">"${t.message}"</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    if (rain) {
      this.startRainCountdown(rain.expiresAt);
      this.container.querySelector('#tip-claim-btn')?.addEventListener('click', () => {
        this.claimRain(rain.id);
      });
    }

    this.container.querySelector('#tip-send-btn')?.addEventListener('click', () => {
      this.sendTip();
    });
  }
}
