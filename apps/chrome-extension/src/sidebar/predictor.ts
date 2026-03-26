import { SidebarUI } from './types.js';
import { apiCall } from './api.js';
import { DropPredictionWindow } from '@tiltcheck/types';

export class PredictorManager {
  private ui: SidebarUI;
  private windows: DropPredictionWindow[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ui: SidebarUI) {
    this.ui = ui;
  }

  public async init(): Promise<void> {
    console.log('[PredictorManager] Initializing drop predictions...');
    await this.fetchPredictions();
    
    // Refresh predictions every 5 minutes
    this.pollInterval = setInterval(() => this.fetchPredictions(), 5 * 60 * 1000);
    
    // Start the countdown ticker
    this.startTicker();
  }

  private async fetchPredictions(): Promise<void> {
    try {
      const resp = await apiCall('/stats');
      if (resp?.ok && resp.stats?.predictions) {
        this.windows = resp.stats.predictions;
      } else {
        // Fallback to simulation if API fails or is empty
        this.simulatePredictions();
      }
      
      this.render();
    } catch (err) {
      console.warn('[PredictorManager] Could not fetch predictions', err);
      this.simulatePredictions();
    }
  }

  private simulatePredictions(): void {
    const now = Date.now();
    this.windows = [
      {
        id: 's-1',
        source: 'instagram',
        label: 'IG Flash Code (Sim)',
        estimatedAt: now + (45 * 60 * 1000),
        confidence: 0.85
      },
      {
        id: 's-2',
        source: 'telegram',
        label: 'TG Rain (Sim)',
        estimatedAt: now + (4 * 60 * 1000),
        confidence: 0.70
      }
    ];
  }

  private startTicker(): void {
    setInterval(() => {
      this.render();
    }, 1000);
  }

  private render(): void {
    const container = document.getElementById('predictor-list');
    if (!container) return;

    const now = Date.now();
    container.innerHTML = this.windows
      .map(win => {
        const diff = win.estimatedAt - now;
        const isCritical = diff > 0 && diff < 10 * 60 * 1000; // < 10 mins
        const timeStr = diff > 0 ? this.formatTime(diff) : 'LIVE / ANY MOMENT';
        
        return `
          <div class="predictor-card ${isCritical ? 'critical' : ''}">
            <div class="card-header">
              <span class="source-tag tag-${win.source}">${win.source.toUpperCase()}</span>
              <span class="confidence-tag">${(win.confidence * 100).toFixed(0)}% Conf.</span>
            </div>
            <div class="card-body">
              <div class="drop-label">${win.label}</div>
              <div class="drop-timer">${timeStr}</div>
            </div>
            ${isCritical ? '<div class="critical-glow"></div>' : ''}
          </div>
        `;
      })
      .join('');
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  public destroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
