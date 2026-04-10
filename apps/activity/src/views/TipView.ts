// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

import type { SessionState, TipDrop, TipEntry } from '../state/SessionState.js';
import type { HubRelay } from '../sdk/HubRelay.js';

const API_BASE = 'https://api.tiltcheck.me';

export class TipView {
  private container: HTMLElement;
  private state: SessionState;
  private relay: HubRelay;
  private channelId: string;
  private dropTimer: ReturnType<typeof setInterval> | null = null;

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

    this.relay.on('tip.drop', (data: unknown) => {
      const d = data as TipDrop;
      this.state.setActiveDrop(d);
      this.flashNavBadge(true);
    });

    this.relay.on('tip.claimed', (data: unknown) => {
      const d = data as { dropId: string };
      if (this.state.activeDrop?.id === d.dropId) {
        this.state.setActiveDrop(null);
        this.flashNavBadge(false);
      }
    });

    this.relay.on('tip.sent', (data: unknown) => {
      this.state.addTipToHistory(data as TipEntry);
    });
  }

  private flashNavBadge(show: boolean): void {
    const tab = document.querySelector('.nav-tab[data-view="tip"]');
    if (!tab) return;
    if (show) {
      tab.classList.add('has-drop');
    } else {
      tab.classList.remove('has-drop');
    }
  }

  private async fetchEliteStatus(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/user/${this.state.userId}/elite`);
      if (!res.ok) return;
      const data = await res.json();
      this.state.setEliteStatus(data.isElite ?? false, data.feeSavedSol ?? 0);
    } catch (_) { /* non-fatal */ }
  }

  private async fetchTipHistory(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/justthetip/history?channelId=${encodeURIComponent(this.channelId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.tips)) {
        data.tips.forEach((t: TipEntry) => this.state.addTipToHistory(t));
      }
    } catch (_) { /* non-fatal */ }
  }

  private async claimDrop(dropId: string): Promise<void> {
    const btn = this.container.querySelector<HTMLButtonElement>('#tip-claim-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'CLAIMING...'; }
    try {
      const res = await fetch(`${API_BASE}/justthetip/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dropId, userId: this.state.userId, channelId: this.channelId })
      });
      if (res.ok) {
        const data = await res.json();
        this.state.setActiveDrop(null);
        this.flashNavBadge(false);
        this.state.addTipToHistory({
          id: dropId,
          fromUsername: this.state.activeDrop?.fromUsername ?? 'ROOM',
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
      const res = await fetch(`${API_BASE}/justthetip/send`, {
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

  private startDropCountdown(expiresAt: number): void {
    if (this.dropTimer) clearInterval(this.dropTimer);
    const el = this.container.querySelector<HTMLElement>('#drop-countdown');
    const update = () => {
      const ms = expiresAt - Date.now();
      if (!el) return;
      if (ms <= 0) {
        el.textContent = 'EXPIRED';
        if (this.dropTimer) clearInterval(this.dropTimer);
        this.state.setActiveDrop(null);
        return;
      }
      const s = Math.ceil(ms / 1000);
      el.textContent = `${s}s`;
      if (s <= 10) el.style.color = '#ef4444';
    };
    update();
    this.dropTimer = setInterval(update, 500);
  }

  render(): void {
    if (this.dropTimer) { clearInterval(this.dropTimer); this.dropTimer = null; }
    const drop = this.state.activeDrop;
    const history = this.state.tipHistory;
    const isElite = this.state.isElite;
    const feeSaved = this.state.feeSavedSol;

    this.container.innerHTML = `
      ${drop ? `
      <div class="tip-drop-banner">
        <div class="tip-drop-header">
          <span class="tip-drop-label">DROP LIVE</span>
          <span class="tip-drop-timer" id="drop-countdown">--</span>
        </div>
        <div class="tip-drop-body">
          <span class="tip-drop-from">${drop.fromUsername}</span>
          <span class="tip-drop-amount">${drop.amountSol.toFixed(4)} SOL</span>
        </div>
        ${drop.message ? `<p class="tip-drop-msg">"${drop.message}"</p>` : ''}
        <button class="btn-claim" id="tip-claim-btn">CLAIM</button>
      </div>
      ` : `
      <div class="tip-idle-state">
        <span class="tip-idle-label">NO ACTIVE DROP</span>
        <p class="tip-idle-sub">When someone tips the room, it shows up here. Be the whale.</p>
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
        <p class="section-label">RECENT DROPS (${history.length})</p>
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

    if (drop) {
      this.startDropCountdown(drop.expiresAt);
      this.container.querySelector('#tip-claim-btn')?.addEventListener('click', () => {
        this.claimDrop(drop.id);
      });
    }

    this.container.querySelector('#tip-send-btn')?.addEventListener('click', () => {
      this.sendTip();
    });
  }
}
