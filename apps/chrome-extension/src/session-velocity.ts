/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */

/**
 * Session Net PnL Mini-Sparkline & Velocity Radar
 *
 * Tracks live session balance samples via non-custodial DOM observation,
 * calculates rolling loss velocity ($/min) and tilt acceleration,
 * and renders a high-performance SVG sparkline and velocity radar badge.
 *
 * Velocity Status Bands:
 * - STEADY: Velocity > -0.50 $/min (flat or in profit)
 * - DRAIN:  Velocity between -0.50 and -5.00 $/min (gradual loss)
 * - BLEED:  Velocity between -5.00 and -20.00 $/min (accelerating loss)
 * - CLIFF-DIVE: Velocity <= -20.00 $/min (severe rapid tilt spiral)
 */

import { readBalance } from './reality-hud.js';

export type VelocityStatus = 'STEADY' | 'DRAIN' | 'BLEED' | 'CLIFF-DIVE';

export interface BalanceSample {
  timestamp: number;
  balance: number;
  pnl: number;
}

export interface SessionPnlState {
  startingBalance: number | null;
  currentBalance: number | null;
  netPnl: number;
  peakPnl: number;
  lowestPnl: number;
  samples: BalanceSample[];
  velocityPerMin: number;
  status: VelocityStatus;
  statusReason: string;
  startTime: number;
  lastUpdated: number;
}

export const TILTCHECK_SESSION_PNL_KEY = 'tiltcheck_session_pnl_state';
export const TILTCHECK_SESSION_RADAR_ENABLED_KEY = 'tiltcheck_session_radar_enabled';
export const DEFAULT_SESSION_RADAR_ENABLED = true;
export const MAX_RADAR_SAMPLES = 30;

export const DEFAULT_SESSION_PNL_STATE: SessionPnlState = {
  startingBalance: null,
  currentBalance: null,
  netPnl: 0,
  peakPnl: 0,
  lowestPnl: 0,
  samples: [],
  velocityPerMin: 0,
  status: 'STEADY',
  statusReason: 'Pacing steady. No tilt velocity detected.',
  startTime: 0,
  lastUpdated: 0,
};

export function calculateNetPnl(current: number, baseline: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) return 0;
  return Math.round((current - baseline) * 100) / 100;
}

export function calculateVelocityPerMin(samples: BalanceSample[], windowSec = 180): number {
  if (!Array.isArray(samples) || samples.length < 2) return 0;

  const latest = samples[samples.length - 1];
  const cutoff = latest.timestamp - windowSec * 1000;

  let windowSamples = samples.filter((s) => s.timestamp >= cutoff);
  if (windowSamples.length < 2) {
    windowSamples = samples.slice(-5);
  }

  const s0 = windowSamples[0];
  const sn = windowSamples[windowSamples.length - 1];
  const deltaSec = (sn.timestamp - s0.timestamp) / 1000;

  if (deltaSec < 3) return 0;

  const deltaPnl = sn.pnl - s0.pnl;
  const ratePerSec = deltaPnl / deltaSec;
  return Math.round(ratePerSec * 60 * 100) / 100;
}

export function determineVelocityStatus(
  velocityPerMin: number,
  netPnl: number,
): { status: VelocityStatus; label: string; color: string; reason: string } {
  if (velocityPerMin <= -20.0 || (velocityPerMin <= -10.0 && netPnl <= -50)) {
    return {
      status: 'CLIFF-DIVE',
      label: 'CLIFF-DIVE',
      color: '#ef4444',
      reason: `Severe loss acceleration: -$${Math.abs(velocityPerMin).toFixed(2)}/min. Tilt dive detected.`,
    };
  }
  if (velocityPerMin <= -5.0) {
    return {
      status: 'BLEED',
      label: 'BLEED',
      color: '#f97316',
      reason: `Accelerating drawdown: -$${Math.abs(velocityPerMin).toFixed(2)}/min. Protect bankroll.`,
    };
  }
  if (velocityPerMin <= -0.5) {
    return {
      status: 'DRAIN',
      label: 'DRAIN',
      color: '#fbbf24',
      reason: `Gradual loss rate: -$${Math.abs(velocityPerMin).toFixed(2)}/min. Steady bleed.`,
    };
  }
  if (velocityPerMin >= 1.0) {
    return {
      status: 'STEADY',
      label: 'STEADY',
      color: '#17c3b2',
      reason: `Positive momentum: +$${velocityPerMin.toFixed(2)}/min. Lock profit.`,
    };
  }
  return {
    status: 'STEADY',
    label: 'STEADY',
    color: '#17c3b2',
    reason: 'Pacing steady. No tilt velocity detected.',
  };
}

export function recordBalanceSample(
  state: SessionPnlState,
  balance: number,
  timestamp = Date.now(),
): SessionPnlState {
  if (!Number.isFinite(balance) || balance < 0) return state;

  const startingBalance = state.startingBalance === null ? balance : state.startingBalance;
  const startTime = state.startTime === 0 ? timestamp : state.startTime;
  const pnl = calculateNetPnl(balance, startingBalance);

  // Skip duplicate samples if balance is unchanged and within 2 seconds
  if (state.samples.length > 0) {
    const last = state.samples[state.samples.length - 1];
    if (last.balance === balance && timestamp - last.timestamp < 2000) {
      return state;
    }
  }

  const newSample: BalanceSample = { timestamp, balance, pnl };
  const updatedSamples = [...state.samples, newSample].slice(-MAX_RADAR_SAMPLES);

  const peakPnl = Math.max(state.peakPnl, pnl);
  const lowestPnl = Math.min(state.lowestPnl, pnl);
  const velocityPerMin = calculateVelocityPerMin(updatedSamples);
  const statusInfo = determineVelocityStatus(velocityPerMin, pnl);

  return {
    startingBalance,
    currentBalance: balance,
    netPnl: pnl,
    peakPnl,
    lowestPnl,
    samples: updatedSamples,
    velocityPerMin,
    status: statusInfo.status,
    statusReason: statusInfo.reason,
    startTime,
    lastUpdated: timestamp,
  };
}

export function resetSessionPnl(
  startingBalance: number | null = null,
  timestamp = Date.now(),
): SessionPnlState {
  return {
    startingBalance,
    currentBalance: startingBalance,
    netPnl: 0,
    peakPnl: 0,
    lowestPnl: 0,
    samples: startingBalance !== null ? [{ timestamp, balance: startingBalance, pnl: 0 }] : [],
    velocityPerMin: 0,
    status: 'STEADY',
    statusReason: 'Session reset. Telemetry fresh.',
    startTime: timestamp,
    lastUpdated: timestamp,
  };
}

export function generateSparklineSvg(
  samples: BalanceSample[],
  width = 280,
  height = 70,
): string {
  if (!Array.isArray(samples) || samples.length < 2) {
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <line x1="8" y1="${height / 2}" x2="${width - 8}" y2="${height / 2}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 3" />
  <text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" fill="rgba(160,175,190,0.5)" font-family="Space Grotesk, -apple-system, sans-serif" font-size="10" font-weight="600" letter-spacing="0.08em">AWAITING SPIN TELEMETRY</text>
</svg>`;
  }

  const pnlValues = samples.map((s) => s.pnl);
  const minPnl = Math.min(0, ...pnlValues);
  const maxPnl = Math.max(0, ...pnlValues);
  const span = Math.max(10, maxPnl - minPnl);

  const padX = 10;
  const padY = 12;
  const graphWidth = width - padX * 2;
  const graphHeight = height - padY * 2;

  const yMin = minPnl - span * 0.08;
  const yMax = maxPnl + span * 0.08;
  const ySpan = Math.max(1, yMax - yMin);

  const points = samples.map((s, idx) => {
    const x = padX + (idx / (samples.length - 1)) * graphWidth;
    const y = padY + graphHeight - ((s.pnl - yMin) / ySpan) * graphHeight;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, pnl: s.pnl };
  });

  const zeroY = Math.round((padY + graphHeight - ((0 - yMin) / ySpan) * graphHeight) * 10) / 10;
  const lastPoint = points[points.length - 1];
  const peakPoint = points.reduce((prev, curr) => (curr.pnl > prev.pnl ? curr : prev), points[0]);
  const isProfit = lastPoint.pnl >= 0;
  const strokeColor = isProfit ? '#17c3b2' : '#ff4a4a';
  const gradStartColor = isProfit ? 'rgba(23, 195, 178, 0.35)' : 'rgba(255, 74, 74, 0.35)';

  const lineD = 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ');
  const areaD = `${lineD} L ${lastPoint.x} ${zeroY} L ${points[0].x} ${zeroY} Z`;

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${gradStartColor}" />
      <stop offset="100%" stop-color="rgba(0,0,0,0)" />
    </linearGradient>
  </defs>
  <line x1="${padX}" y1="${zeroY}" x2="${width - padX}" y2="${zeroY}" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3 3" stroke-width="1" />
  <text x="${padX}" y="${Math.max(10, zeroY - 3)}" fill="rgba(255,255,255,0.3)" font-size="8" font-family="monospace">0.00</text>
  <path d="${areaD}" fill="url(#pnlGrad)" />
  <path d="${lineD}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  ${peakPoint.pnl > 0 ? `<circle cx="${peakPoint.x}" cy="${peakPoint.y}" r="2.5" fill="#17c3b2" />` : ''}
  <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="3.5" fill="${strokeColor}" stroke="#ffffff" stroke-width="1.5" />
</svg>`;
}

export interface SessionVelocityHandle {
  getState: () => SessionPnlState;
  sample: (balanceOverride?: number) => SessionPnlState;
  reset: (startingBalance?: number | null) => SessionPnlState;
  stop: () => void;
}

const SPIN_CONTROL_SELECTOR = [
  'button[data-test="spin-button"]',
  'button.spin-button',
  'button[aria-label="Spin"]',
  'button[class*="SpinButton"]',
  'button[class*="play-button"]',
  'button[data-testid="play-button"]',
  'button[data-testid="spin-button"]',
  'button[class*="bet-button"]',
  'button[data-test="bet-button"]',
  '.game-controls button',
  '#spin-button',
  '.play-btn',
  '.spin-btn',
].join(', ');

export function installSessionVelocityRadar(
  doc: Document,
  options?: {
    enabled?: boolean;
    initialBalance?: number | null;
  },
): SessionVelocityHandle {
  let state = resetSessionPnl(options?.initialBalance ?? null);
  let stopped = false;
  const isEnabled = options?.enabled ?? DEFAULT_SESSION_RADAR_ENABLED;

  function doSample(balanceOverride?: number): SessionPnlState {
    if (stopped) return state;
    const balance = balanceOverride !== undefined ? balanceOverride : readBalance(doc);
    if (balance !== null) {
      state = recordBalanceSample(state, balance);
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set({ [TILTCHECK_SESSION_PNL_KEY]: state });
        }
      } catch {
        // Storage unavailable in tests
      }
    }
    return state;
  }

  // Initial read
  doSample();

  // Listen to spin button clicks
  const onSpinClick = () => {
    if (stopped) return;
    setTimeout(() => doSample(), 600);
    setTimeout(() => doSample(), 1800);
  };

  if (isEnabled) {
    doc.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest(SPIN_CONTROL_SELECTOR)) {
        onSpinClick();
      }
    }, true);
  }

  // Polling interval
  const intervalId = setInterval(() => {
    if (stopped) return;
    doSample();
  }, 3500);

  return {
    getState: () => state,
    sample: (balanceOverride?: number) => doSample(balanceOverride),
    reset: (startingBalance?: number | null) => {
      state = resetSessionPnl(startingBalance);
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set({ [TILTCHECK_SESSION_PNL_KEY]: state });
        }
      } catch {
        // Ignored in test environment
      }
      return state;
    },
    stop: () => {
      stopped = true;
      clearInterval(intervalId);
    },
  };
}
