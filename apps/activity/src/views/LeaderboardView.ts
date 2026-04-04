// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import type { SessionState } from '../state/SessionState.js';
import { calcActualRtp } from '../utils/math.js';

interface LeaderboardEntry {
  userId: string;
  username: string;
  netPL: number;
  trustScore: number;
}

export class LeaderboardView {
  private container: HTMLElement;
  private state: SessionState;

  constructor(container: HTMLElement, state: SessionState) {
    this.container = container;
    this.state = state;
  }

  mount(): void {
    this.render();
    this.state.on('channelSessions', () => this.render());
    this.state.on('rounds', () => this.render());
  }

  render(): void {
    const own = this.buildOwnEntry();
    const others = this.buildOtherEntries();
    const all = [own, ...others].sort((a, b) => b.netPL - a.netPL);

    const rows = all.map((e, i) => `
      <div class="lb-row ${e.userId === this.state.userId ? 'own-row' : ''}">
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${e.username}</span>
        <span class="lb-pl ${e.netPL >= 0 ? 'positive' : 'negative'}">${e.netPL >= 0 ? '+' : ''}$${Math.abs(e.netPL).toFixed(2)}</span>
        <span class="lb-rtp">${calcActualRtp(this.state.rounds).toFixed(1)}%</span>
      </div>`).join('');

    this.container.innerHTML = `
      <div class="view-leaderboard">
        <div class="lb-header">
          <span>PLAYER</span>
          <span>NET P/L</span>
          <span>RTP</span>
        </div>
        <div class="lb-rows">
          ${rows.length > 0 ? rows : '<div class="lb-empty">No players in this channel yet.</div>'}
        </div>
      </div>`;
  }

  private buildOwnEntry(): LeaderboardEntry {
    const rounds = this.state.rounds;
    const netPL = rounds.reduce((s, r) => s + r.win - r.bet, 0);
    return {
      userId: this.state.userId,
      username: this.state.username,
      netPL,
      trustScore: 0
    };
  }

  private buildOtherEntries(): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    this.state.channelSessions.forEach((session) => {
      if (session.userId === this.state.userId) return;
      const netPL = session.rounds.reduce((s, r) => s + r.win - r.bet, 0);
      entries.push({ userId: session.userId, username: session.username, netPL, trustScore: 0 });
    });
    return entries;
  }
}
