// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import type { SessionState } from '../state/SessionState.js';
import {
  calcActualRtp,
  calcDrift,
  calcConfidence,
  calcNetPL,
  formatDuration,
  getDriftClass
} from '../utils/math.js';

export class AnalyzerView {
  private container: HTMLElement;
  private state: SessionState;

  constructor(container: HTMLElement, state: SessionState) {
    this.container = container;
    this.state = state;
  }

  render(): void {
    const { rounds, expectedRtp, startedAt, username, participantCount, voiceActive } = this.state;

    const actualRtp = calcActualRtp(rounds);
    const drift = calcDrift(actualRtp, expectedRtp);
    const confidence = calcConfidence(rounds.length);
    const driftClass = getDriftClass(drift);
    const netPL = calcNetPL(rounds);
    const totalWagered = rounds.reduce((s, r) => s + r.bet, 0);
    const sessionTime = formatDuration(Date.now() - startedAt);
    const hasRounds = rounds.length > 0;

    const plSign = netPL >= 0 ? '+' : '';
    const plClass = netPL >= 0 ? 'drift-positive' : 'drift-negative';

    this.container.innerHTML = `
      <div class="view-analyzer">
        <div class="session-header">
          <span class="session-user">[${username.toUpperCase()}]</span>
          <span class="session-timer">[SESSION: ${sessionTime}]</span>
          <span class="session-participants">[${participantCount} PLAYER${participantCount !== 1 ? 'S' : ''}]</span>
          ${voiceActive ? '<span class="voice-indicator">[MIC ACTIVE]</span>' : ''}
        </div>

        ${hasRounds ? `
        <div class="rtp-dashboard">
          <div class="rtp-main">
            <div class="rtp-block">
              <span class="rtp-label">ACTUAL RTP</span>
              <span class="rtp-value ${driftClass}">${actualRtp.toFixed(1)}%</span>
            </div>
            <div class="rtp-block">
              <span class="rtp-label">EXPECTED</span>
              <span class="rtp-value">${expectedRtp.toFixed(1)}%</span>
            </div>
            <div class="rtp-block">
              <span class="rtp-label">DRIFT</span>
              <span class="rtp-value ${driftClass}">${drift > 0 ? '+' : ''}${drift.toFixed(1)}%</span>
            </div>
            <div class="rtp-block">
              <span class="rtp-label">NET P/L</span>
              <span class="rtp-value ${plClass}">${plSign}$${Math.abs(netPL).toFixed(2)}</span>
            </div>
          </div>
          <div class="session-stats">
            <div class="stat-row">
              <span class="stat-key">ROUNDS</span>
              <span class="stat-val">${rounds.length}</span>
            </div>
            <div class="stat-row">
              <span class="stat-key">WAGERED</span>
              <span class="stat-val">$${totalWagered.toFixed(2)}</span>
            </div>
            <div class="stat-row">
              <span class="stat-key">CONFIDENCE</span>
              <span class="stat-val confidence-${confidence.toLowerCase().replace(' ', '-')}">${confidence}</span>
            </div>
          </div>
        </div>
        ` : `
        <div class="analyzer-idle">
          <p class="idle-title">SENSOR ONLINE</p>
          <p class="idle-sub">Install the TiltCheck Chrome extension to stream real-time round data here.</p>
        </div>
        `}
      </div>
    `;
  }

  mount(): void {
    this.render();
    this.state.on('rounds', () => this.render());
    this.state.on('participants', () => this.render());
    this.state.on('voice', () => this.render());
  }
}
