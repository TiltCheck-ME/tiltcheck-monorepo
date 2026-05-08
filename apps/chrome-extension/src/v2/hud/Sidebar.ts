/* © 2026 TiltCheck Ecosystem. All Rights Reserved. */

/**
 * Reality Check HUD Controller (v2)
 */

import { HUD_STYLES } from './styles.js';
import { RoundData } from '../core/Sensor.js';

export class RealityHUD {
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;
  private stats = {
    totalWagered: 0,
    totalWin: 0,
    roundsCount: 0,
    lastRound: null as RoundData | null
  };

  constructor() {
    this.injectStyles();
    this.createUI();
  }

  private injectStyles(): void {
    if (document.getElementById('tiltcheck-v2-styles')) return;
    const style = document.createElement('style');
    style.id = 'tiltcheck-v2-styles';
    style.textContent = HUD_STYLES;
    document.head.appendChild(style);
  }

  private createUI(): void {
    if (document.getElementById('tiltcheck-v2-sidebar')) return;

    this.container = document.createElement('div');
    this.container.id = 'tiltcheck-v2-sidebar';
    this.container.innerHTML = `
      <div class="hud-header">
        <div class="hud-logo">REALITY CHECK<span style="opacity:0.4">v2.0</span></div>
        <div class="hud-status-indicator"></div>
      </div>

      <div class="hud-content">
        <!-- Live Feed -->
        <div class="hud-section">
          <div class="hud-section-label">THE FEED <span style="opacity:0.6">(SENSOR)</span></div>
          <div class="live-feed-card" id="hud-live-feed">
            <div style="font-size: 11px; opacity: 0.5;">Waking up sensory input...</div>
          </div>
        </div>

        <!-- Analytics -->
        <div class="hud-section">
          <div class="hud-section-label">THE TRUTH <span style="opacity:0.6">(ANALYTICS)</span></div>
          <div class="truth-card">
            <div class="truth-rtp-value" id="hud-truth-rtp">--%</div>
            <div class="truth-rtp-label">ACTUAL RTP</div>
          </div>
          
          <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: rgba(255,255,255,0.03); padding: 12px; border: 1px solid rgba(255,255,255,0.05);">
              <div class="hud-section-label" style="margin-bottom: 4px;">WAGERED</div>
              <div id="hud-total-wagered" style="font-weight: 700; font-family: 'JetBrains Mono';">$0.00</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 12px; border: 1px solid rgba(255,255,255,0.05);">
              <div class="hud-section-label" style="margin-bottom: 4px;">ROUNDS</div>
              <div id="hud-rounds-count" style="font-weight: 700; font-family: 'JetBrains Mono';">0</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="hud-actions">
           <button class="hud-btn hud-btn-danger" id="hud-btn-brake">EMERGENCY BRAKE</button>
           <button class="hud-btn hud-btn-primary" id="hud-btn-activity">VIEW DISCORD ACTIVITY</button>
           <button class="hud-btn hud-btn-secondary" id="hud-btn-hide">HIDE SENSOR HUD</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.setupListeners();
  }

  private setupListeners(): void {
    document.getElementById('hud-btn-hide')?.addEventListener('click', () => this.toggle(false));
    document.getElementById('hud-btn-activity')?.addEventListener('click', () => {
      window.open('https://discord.com/channels/@me', '_blank');
    });
    document.getElementById('hud-btn-brake')?.addEventListener('click', () => {
        alert('EMERGENCY BRAKE: Secure your funds manually. We do not hold custody.');
    });
  }

  toggle(visible: boolean): void {
    this.isVisible = visible;
    if (visible) {
      document.body.classList.add('tiltcheck-sidebar-open');
      this.container?.classList.remove('minimized');
    } else {
      document.body.classList.remove('tiltcheck-sidebar-open');
      this.container?.classList.add('minimized');
    }
  }

  updateRound(round: RoundData): void {
    this.stats.roundsCount++;
    this.stats.totalWagered += round.bet;
    this.stats.totalWin += round.win;
    this.stats.lastRound = round;

    this.renderUpdate();
  }

  private renderUpdate(): void {
    // 1. Update Live Feed
    const feed = document.getElementById('hud-live-feed');
    if (feed && this.stats.lastRound) {
      feed.innerHTML = `
        <div class="live-round-row">
          <span class="hud-section-label" style="margin:0">BET</span>
          <span class="live-value bet">$${this.stats.lastRound.bet.toFixed(2)}</span>
        </div>
        <div class="live-round-row">
          <span class="hud-section-label" style="margin:0">WIN</span>
          <span class="live-value win">$${this.stats.lastRound.win.toFixed(2)}</span>
        </div>
        <div style="font-size: 10px; opacity: 0.4; margin-top: 8px; text-transform: uppercase;">GAME: ${this.stats.lastRound.gameId}</div>
      `;
    }

    // 2. Update Stats
    const rtp = this.stats.totalWagered > 0 
      ? (this.stats.totalWin / this.stats.totalWagered) * 100 
      : 0;
    
    document.getElementById('hud-truth-rtp')!.textContent = `${rtp.toFixed(1)}%`;
    document.getElementById('hud-total-wagered')!.textContent = `$${this.stats.totalWagered.toFixed(2)}`;
    document.getElementById('hud-rounds-count')!.textContent = this.stats.roundsCount.toString();
  }
}
