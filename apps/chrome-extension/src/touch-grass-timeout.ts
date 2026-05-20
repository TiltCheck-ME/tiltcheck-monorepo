/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */

/**
 * Touch Grass Timeout — fullscreen, non-dismissible pause until duration elapses.
 * 8s breathing pacer, 20s forensic/mindfulness rotation, local-only (no network).
 *
 * Risk: undismissable by design — future popup settings must require explicit opt-in
 * for duration and policy (accessibility + platform ToS posture).
 */

export const TOUCH_GRASS_DURATION_MS = 120_000;

/** Forensic / mindfulness ticker cadence (ms). */
export const MESSAGE_ROTATE_MS = 20_000;

/** Fade between ticker lines (ms); keep shorter than MESSAGE_ROTATE_MS. */
const MESSAGE_FADE_SWAP_MS = 450;

export const BREAK_MESSAGES: readonly string[] = [
  'Click velocity anomaly detected. Your brain is scrambling to patch a sudden dopamine drop, not a mathematical edge.',
  'Fact: Fast-clicking alters nothing but the speed at which the house edge resolves against your balance.',
  "House algorithms monitor pacing. When you accelerate play, you transition from choice to pure execution of the machine's loop.",
  'Drop your shoulders. Unclench your jaw. Exhale completely. Mechanically cut the physical adrenaline loop.',
  'The platform has a memory; house telemetry tracks your live click-velocity to categorize your risk and volatility tolerance in real time.',
  "Turbo spins and short-cycling cut off your brain's natural evaluation window. The house relies on your auto-pilot.",
  'Prefrontal cortex (rational limit) is offline. Amygdala (fight-or-flight) is driving. You cannot out-gamble a system while hijacked.',
  'Inhale for 4 seconds. Exhale for 4 seconds. Let the neural chemical spike clear before the layout unlocks.',
];

const LOCKDOWN_ROOT_ID = 'tiltcheck-lockdown-root';
const MESSAGE_EL_ID = 'tiltcheck-lockdown-message';
const TIMER_ID = 'lockdown-timer';

let overlayActive = false;

export function blockBettingUI(block: boolean): void {
  const betButtons = document.querySelectorAll<HTMLElement>(
    'button[class*="bet"], button[class*="spin"], [data-action="bet"], [data-action="spin"]'
  );

  betButtons.forEach((btn) => {
    if (block) {
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = true;
      }
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.dataset.tiltguardBlocked = 'true';
    } else if (btn.dataset.tiltguardBlocked) {
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = false;
      }
      btn.style.opacity = '';
      btn.style.cursor = '';
      delete btn.dataset.tiltguardBlocked;
    }
  });
}

function injectLockdownStyles(root: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = `
    #${LOCKDOWN_ROOT_ID} {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #0f1115 !important;
      z-index: 2147483647 !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;
      color: #ff4a4a;
      box-sizing: border-box;
      padding: 1.5rem;
      overflow-y: auto;
      user-select: none;
    }

    #${LOCKDOWN_ROOT_ID} .tiltcheck-lockdown-inner {
      width: 100%;
      max-width: 32rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    #${LOCKDOWN_ROOT_ID} .tiltcheck-eyebrow {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #ff4a4a;
      margin-bottom: 0.75rem;
    }

    #${LOCKDOWN_ROOT_ID} .tiltcheck-lockdown-headline {
      font-size: 1.625rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin: 0 0 0.75rem;
      line-height: 1.15;
    }

    #${LOCKDOWN_ROOT_ID} .tiltcheck-lockdown-reason {
      font-size: 0.875rem;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.82);
      margin: 0 0 1.25rem;
      max-width: 28rem;
    }

    /* Center stage: pacer ring + timer digits */
    .tiltcheck-pacer-stage {
      position: relative;
      width: 250px;
      height: 250px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 2rem 0;
    }

    .tiltcheck-breath-pacer {
      position: absolute;
      width: 200px;
      height: 200px;
      border: 4px solid #ff4a4a;
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(255, 74, 74, 0.2);
      animation: tiltcheck-breath-pacer 8s ease-in-out infinite;
      pointer-events: none;
    }

    #${TIMER_ID} {
      font-size: 3.5rem;
      font-weight: bold;
      color: #ffffff;
      z-index: 10;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
    }

    @keyframes tiltcheck-breath-pacer {
      0%, 100% {
        transform: scale(0.6);
        opacity: 0.3;
        box-shadow: 0 0 10px rgba(255, 74, 74, 0.1);
      }
      50% {
        transform: scale(1.1);
        opacity: 0.9;
        border-color: #4affb4;
        box-shadow: 0 0 30px rgba(74, 255, 180, 0.4);
      }
    }

    #${LOCKDOWN_ROOT_ID} .tiltcheck-breath-hint {
      position: absolute;
      bottom: -2.25rem;
      left: 50%;
      transform: translateX(-50%);
      width: 18rem;
      font-size: 0.625rem;
      opacity: 0.55;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.55);
    }

    #${LOCKDOWN_ROOT_ID} .tiltcheck-signal-label {
      font-size: 0.625rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255, 74, 74, 0.65);
      margin-bottom: 0.5rem;
      align-self: stretch;
      text-align: left;
    }

    #${MESSAGE_EL_ID} {
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0;
      text-align: left;
      min-height: 4.5em;
      align-self: stretch;
      color: rgba(245, 245, 245, 0.94);
      transition: opacity 0.45s ease;
    }

    #${LOCKDOWN_ROOT_ID} .tiltcheck-lockdown-foot {
      font-size: 0.6875rem;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.45);
      margin: 1.25rem 0 0;
      max-width: 26rem;
    }
  `;
  root.insertBefore(style, root.firstChild);
}

/**
 * Full-viewport lock. Undismissable until the countdown completes.
 */
export function triggerTouchGrassTimeout(reason: string, durationMs: number = TOUCH_GRASS_DURATION_MS): void {
  if (overlayActive) {
    return;
  }
  overlayActive = true;

  blockBettingUI(true);

  const existing = document.getElementById(LOCKDOWN_ROOT_ID);
  if (existing) {
    existing.remove();
  }

  const root = document.createElement('div');
  root.id = LOCKDOWN_ROOT_ID;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute(
    'aria-label',
    'Touch Grass timeout — session pause with breathing pacer and rotating guidance'
  );

  injectLockdownStyles(root);

  const inner = document.createElement('div');
  inner.className = 'tiltcheck-lockdown-inner';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'tiltcheck-eyebrow';
  eyebrow.textContent = 'Touch Grass Timeout';

  const headline = document.createElement('h1');
  headline.className = 'tiltcheck-lockdown-headline';
  headline.textContent = 'Hold the line. Recalibrate.';

  const reasonEl = document.createElement('p');
  reasonEl.className = 'tiltcheck-lockdown-reason';
  reasonEl.textContent = reason;

  const stage = document.createElement('div');
  stage.className = 'tiltcheck-pacer-stage';

  const breathRing = document.createElement('div');
  breathRing.className = 'tiltcheck-breath-pacer';
  breathRing.setAttribute('aria-hidden', 'true');

  const timerWrap = document.createElement('div');
  timerWrap.id = TIMER_ID;
  timerWrap.setAttribute('aria-live', 'polite');
  timerWrap.setAttribute('aria-atomic', 'true');

  const breathHint = document.createElement('div');
  breathHint.className = 'tiltcheck-breath-hint';
  breathHint.textContent = 'Inhale as the ring expands — exhale as it releases.';

  const signalLabel = document.createElement('div');
  signalLabel.className = 'tiltcheck-signal-label';
  signalLabel.textContent = 'Signal';

  const messageRegion = document.createElement('div');
  messageRegion.className = 'tiltcheck-signal-region';
  messageRegion.setAttribute('role', 'region');
  messageRegion.setAttribute('aria-label', 'System message updates every 20 seconds');

  const messageEl = document.createElement('p');
  messageEl.id = MESSAGE_EL_ID;
  messageEl.setAttribute('aria-live', 'off');
  messageEl.textContent = BREAK_MESSAGES[0] ?? '';

  const foot = document.createElement('p');
  foot.className = 'tiltcheck-lockdown-foot';
  foot.textContent =
    'This tab stays locked until the counter hits zero. No dismiss. Future settings: explicit opt-in for duration and policy.';

  stage.appendChild(breathRing);
  stage.appendChild(timerWrap);
  stage.appendChild(breathHint);

  inner.appendChild(eyebrow);
  inner.appendChild(headline);
  inner.appendChild(reasonEl);
  inner.appendChild(stage);
  messageRegion.appendChild(messageEl);
  inner.appendChild(signalLabel);
  inner.appendChild(messageRegion);
  inner.appendChild(foot);
  root.appendChild(inner);
  document.body.appendChild(root);

  const stopBlocking = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const captureOpts = { capture: true };
  root.addEventListener('click', stopBlocking, captureOpts);
  root.addEventListener('mousedown', stopBlocking, captureOpts);
  root.addEventListener('mouseup', stopBlocking, captureOpts);
  root.addEventListener('keydown', stopBlocking, captureOpts);
  root.addEventListener('touchstart', stopBlocking, captureOpts);
  document.addEventListener('keydown', stopBlocking, captureOpts);

  let messageIndex = 0;
  let pendingFadeTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearPendingFade = () => {
    if (pendingFadeTimeout !== null) {
      clearTimeout(pendingFadeTimeout);
      pendingFadeTimeout = null;
    }
  };

  const messageRotateIntervalId = window.setInterval(() => {
    if (!document.getElementById(LOCKDOWN_ROOT_ID) || !messageEl.isConnected) {
      clearInterval(messageRotateIntervalId);
      return;
    }
    messageIndex = (messageIndex + 1) % BREAK_MESSAGES.length;
    messageEl.style.opacity = '0';
    clearPendingFade();
    pendingFadeTimeout = window.setTimeout(() => {
      pendingFadeTimeout = null;
      if (!messageEl.isConnected) return;
      messageEl.textContent = BREAK_MESSAGES[messageIndex] ?? '';
      messageEl.style.opacity = '1';
    }, MESSAGE_FADE_SWAP_MS);
  }, MESSAGE_ROTATE_MS);

  let countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  const started = Date.now();

  const finish = () => {
    if (countdownIntervalId !== null) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    clearInterval(messageRotateIntervalId);
    clearPendingFade();
    root.remove();
    document.removeEventListener('keydown', stopBlocking, captureOpts);
    blockBettingUI(false);
    overlayActive = false;
  };

  const tick = () => {
    const left = Math.max(0, durationMs - (Date.now() - started));
    const sec = Math.ceil(left / 1000);
    timerWrap.textContent = `${sec}`;

    if (left <= 0) {
      finish();
    }
  };

  tick();
  countdownIntervalId = window.setInterval(tick, 250);
}
