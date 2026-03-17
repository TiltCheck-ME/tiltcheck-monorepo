/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SidebarUI, SessionStats } from './types.js';

export class SessionManager {
  private ui: SidebarUI;
  public sessionStats: SessionStats = {
    startTime: Date.now(),
    totalBets: 0,
    totalWagered: 0,
    totalWon: 0,
    currentBalance: 0
  };
  private lastProfit = 0;

  constructor(ui: SidebarUI) {
    this.ui = ui;
  }

  public resetStats() {
    this.sessionStats = {
      startTime: Date.now(),
      totalBets: 0,
      totalWagered: 0,
      totalWon: 0,
      currentBalance: 0
    };
    this.lastProfit = 0;
    this.updateStatsUi();
  }

  public updateStats(params: Partial<SessionStats>) {
    Object.assign(this.sessionStats, params);
    this.updateStatsUi();
    this.drawPnlGraph();
  }

  private updateStatsUi() {
    const betsEl = document.getElementById('tg-bets');
    const wageredEl = document.getElementById('tg-wagered');
    const profitEl = document.getElementById('tg-profit');
    const rtpEl = document.getElementById('tg-rtp');

    const profit = this.sessionStats.totalWon - this.sessionStats.totalWagered;
    const rtp = this.sessionStats.totalWagered > 0 
      ? (this.sessionStats.totalWon / this.sessionStats.totalWagered) * 100 
      : 0;

    if (betsEl) betsEl.textContent = this.sessionStats.totalBets.toString();
    if (wageredEl) wageredEl.textContent = \`$\${this.sessionStats.totalWagered.toFixed(2)}\`;
    if (profitEl) {
      profitEl.textContent = \`\${profit >= 0 ? '+' : ''}$\${profit.toFixed(2)}\`;
      profitEl.style.color = profit >= 0 ? '#10b981' : '#ef4444';
    }
    if (rtpEl) rtpEl.textContent = \`\${rtp.toFixed(1)}%\`;

    this.updateDuration();
  }

  public updateDuration() {
    const durationEl = document.getElementById('tg-duration');
    if (!durationEl) return;
    const diff = Math.floor((Date.now() - this.sessionStats.startTime) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    durationEl.textContent = \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
  }

  public drawPnlGraph() {
    const canvas = document.getElementById('pnl-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simplified P/L graph drawing logic
    // In actual sidebar.ts, it uses a more complex history-based drawing.
    // For now, let's keep a mini-buffer of profits.
    // ... logic for drawing ...
  }
}
