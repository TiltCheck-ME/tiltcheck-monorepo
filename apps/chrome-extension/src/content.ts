// v1.1.0 — 2026-02-26
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/*
 * Future Feature List (Post-Beta)
 * - SusLink integration: Check casino against known scam reports
 * - Report submission: Players can flag casino updates (payout schedules, bonus terms)
 * - Onboarding interviews: Support for business, casino, degen, developer profiles
 * - Buddy system: Phone-a-friend notification toggles and alerts
 * - Accountability streaming: Integration with streaming platforms for accountability checks
 * - Discord support: Help tickets and community-driven support channels
 * - Autovault: API-key-based automatic vault deposits at thresholds
 * - Lock wallet integration: Withdraw-to-lock-timer patterns for security
 * - Custom balance alerts: Personalized notifications (e.g., Power Bill equivalent)
 * - Pattern learning: Natural language setup for personal betting patterns
 * - Zero balance intervention: Suggest alternative income opportunities
 * - Harm reduction tips: Smart suggestions based on session data
 */

/**
 * Enhanced Content Script - TiltCheck + License Verification
 * 
 * Monitors:
 * - Casino license legitimacy
 * - Tilt indicators (rage betting, chasing losses, etc.)
 * - RTP/fairness analysis
 * 
 * Provides:
 * - Real-time interventions
 * - Vault recommendations
 * - Real-world spending reminders
 */

/**
 * Check if hostname matches a domain (handles subdomains correctly)
 */
function isDomain(hostname: string, domain: string): boolean {
  // Exact match or subdomain match (e.g., "www.discord.com" matches "discord.com")
  return hostname === domain || hostname.endsWith('.' + domain);
}

// Early exit if on Discord or localhost API - BEFORE any imports or code runs
const hostname = window.location.hostname.toLowerCase();
const pathname = window.location.pathname.toLowerCase();
const isDiscordAuthRoute = pathname.startsWith('/auth/discord');

const isExcludedDomain =
  isDomain(hostname, 'discord.com') ||
  (hostname === 'localhost' && window.location.port === '3333') ||
  (hostname === 'localhost' && window.location.port === '3001' && isDiscordAuthRoute) ||
  (isDomain(hostname, 'api.tiltcheck.me') && isDiscordAuthRoute);

if (isExcludedDomain) {
  console.log('[TiltCheck] Skipping - excluded domain:', hostname);
}

// Only import and run on allowed casino sites
import { CasinoDataExtractor, AnalyzerClient, SpinEvent } from './extractor.js';
import { TiltDetector } from './tilt-detector.js';
import { CasinoLicenseVerifier } from './license-verifier.js';
import './sidebar.js';
import { Analyzer } from './analyzer.js';
import { WalletBridge } from './wallet-bridge.js';
import { SolanaProvider } from '@tiltcheck/utils';
import { FairnessService } from './FairnessService.js';

// Configuration
const ANALYZER_WS_URL = 'wss://api.tiltcheck.me/analyzer';

// State
let extractor: CasinoDataExtractor | null = null;
let tiltDetector: TiltDetector | null = null;
let licenseVerifier: CasinoLicenseVerifier | null = null;
let client: AnalyzerClient | null = null;
let sessionId: string | null = null;
let stopObserving: (() => void) | null = null;
let isMonitoring = false;
let casinoVerification: any = null;
let analyzer: Analyzer | null = null;
let solana: SolanaProvider | null = null;
let bridge: WalletBridge | null = null;
let fairness: FairnessService | null = null;

// Intervention state
let cooldownEndTime: number | null = null;
const interventionQueue: any[] = [];

/**
 * Visual Picker for selecting elements
 */
class VisualPicker {
  private overlay: HTMLElement | null = null;
  private active = false;
  private callback: ((selector: string) => void) | null = null;

  start(callback: (selector: string) => void) {
    if (this.active) return;
    this.active = true;
    this.callback = callback;

    // Create overlay for highlighting
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      background: rgba(0, 255, 136, 0.2);
      border: 2px solid #00ff88;
      z-index: 2147483647;
      transition: all 0.1s;
      display: none;
      border-radius: 4px;
    `;
    document.body.appendChild(this.overlay);

    document.addEventListener('mousemove', this.onHover, true);
    document.addEventListener('click', this.onClick, true);
    document.body.style.cursor = 'crosshair';
  }

  stop() {
    this.active = false;
    this.callback = null;
    if (this.overlay) this.overlay.remove();
    document.removeEventListener('mousemove', this.onHover, true);
    document.removeEventListener('click', this.onClick, true);
    document.body.style.cursor = '';
  }

  private onHover = (e: MouseEvent) => {
    if (!this.overlay) return;
    const target = e.target as HTMLElement;
    if (target === this.overlay || target.closest('#tiltguard-sidebar')) return;

    const rect = target.getBoundingClientRect();
    this.overlay.style.display = 'block';
    this.overlay.style.top = rect.top + 'px';
    this.overlay.style.left = rect.left + 'px';
    this.overlay.style.width = rect.width + 'px';
    this.overlay.style.height = rect.height + 'px';
  }

  private onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (target.closest('#tiltcheck-sidebar')) return;

    const selector = this.generateSelector(target);
    if (this.callback) this.callback(selector);
    this.stop();
  }

  private generateSelector(el: HTMLElement): string {
    // 1. ID (if valid and unique)
    if (el.id && /^[a-z][a-z0-9_-]*$/i.test(el.id) && document.querySelectorAll(`#${el.id}`).length === 1) {
      return `#${el.id}`;
    }

    // 2. Data Attributes (High priority for testing/scraping)
    const dataAttrs = ['data-test', 'data-testid', 'data-qa', 'data-automation-id'];
    for (const attr of dataAttrs) {
      if (el.hasAttribute(attr)) {
        return `[${attr}="${el.getAttribute(attr)}"]`;
      }
    }

    // 3. Unique Class Combination
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(c => c && !c.includes(':'));
      if (classes.length > 0) {
        // Try single classes
        for (const cls of classes) {
          if (document.querySelectorAll(`.${cls}`).length === 1) return `.${cls}`;
        }
      }
    }

    // 4. Fallback: Path with nth-of-type
    const path: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();

      if (current.id && /^[a-z][a-z0-9_-]*$/i.test(current.id)) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break; // Stop at ID
      } else {
        // Calculate nth-of-type
        let sibling = current;
        let nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling as HTMLElement;
          if (sibling.tagName === current.tagName) nth++;
        }

        if (nth > 1) selector += `:nth-of-type(${nth})`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}

/**
 * Highlighter for testing selectors
 */
class Highlighter {
  private overlay: HTMLElement | null = null;

  highlight(selector: string) {
    this.clear();
    try {
      const el = document.querySelector(selector) as HTMLElement;
      if (!el) {
        console.warn('[TiltCheck] Element not found for highlighting');
        return;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const rect = el.getBoundingClientRect();
      this.overlay = document.createElement('div');
      this.overlay.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: rgba(0, 255, 136, 0.2);
        border: 2px solid #00ff88;
        z-index: 2147483647;
        pointer-events: none;
        transition: all 0.3s;
        border-radius: 4px;
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
      `;
      document.body.appendChild(this.overlay);

      // Remove after 2 seconds
      setTimeout(() => this.clear(), 2000);

    } catch (e) {
      console.error('Invalid selector', e);
    }
  }

  clear() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

/**
 * Initialize on page load
 */
function initialize() {
  console.log('[TiltCheck] Initializing on:', window.location.hostname);

  // Create sidebar UI
  const sidebar = (window as any).TiltCheckSidebar?.create();
  console.log('[TiltCheck] Sidebar created:', !!sidebar);

  // Check casino license
  licenseVerifier = new CasinoLicenseVerifier();
  casinoVerification = licenseVerifier.verifyCasino();

  console.log('[TiltCheck] License verification:', casinoVerification);

  // Update sidebar with license info
  (window as any).TiltCheckSidebar?.updateLicense(casinoVerification);

  // Initialize Fairness Tools
  analyzer = new Analyzer();
  bridge = new WalletBridge();
  solana = new SolanaProvider();
  fairness = new FairnessService();
  setupFairnessListeners();

  // Setup Visual Picker Listener
  const picker = new VisualPicker();
  window.addEventListener('tg-start-picker', ((e: CustomEvent) => {
    picker.start((selector) => {
      // Send result back to sidebar via event
      window.dispatchEvent(new CustomEvent('tg-picker-result', { detail: { field: e.detail.field, selector } }));
    });
  }) as EventListener);

  // Setup Highlighter Listener
  const highlighter = new Highlighter();
  window.addEventListener('tg-test-selector', ((e: CustomEvent) => {
    highlighter.highlight(e.detail.selector);
  }) as EventListener);

  // Setup Fairness Calculator Listener
  window.addEventListener('tg-calc-fairness', (async (e: CustomEvent) => {
    if (!fairness) return;
    const { serverSeed, clientSeed, nonce } = e.detail;
    try {
      const hash = await fairness.verifyCasinoResult(serverSeed, clientSeed, parseInt(nonce));
      const float = fairness.hashToFloat(hash);

      window.dispatchEvent(new CustomEvent('tg-fairness-result', {
        detail: {
          hash,
          float,
          dice: fairness.getDiceResult(float),
          limbo: fairness.getLimboResult(float)
        }
      }));
    } catch (err) {
      console.error('Fairness calc error', err);
    }
  }) as EventListener);

  // Setup start button
  const startBtn = document.getElementById('tg-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (isMonitoring) {
        stopMonitoring();
      } else {
        startMonitoring();
      }
    });
  }

  // Send verification to popup
  try {
    chrome.runtime.sendMessage({
      type: 'license_verification',
      data: casinoVerification
    });
  } catch (e) {
    console.log('[TiltGuard] Could not send message to popup:', e);
  }
}

/**
 * Start monitoring
 */
async function startMonitoring() {
  if (isMonitoring) return;

  console.log('[TiltCheck] Starting monitoring...');

  // Update UI
  (window as any).TiltCheckSidebar?.updateGuardian(true);
  isMonitoring = true;

  // Get initial balance
  extractor = new CasinoDataExtractor();
  await extractor.initialize();
  const initialBalance = extractor.extractBalance() || 100; // Default if can't extract

  console.log('[TiltGuard] Initial balance:', initialBalance);

  // Get risk level from storage (synced from onboarding)
  const storageResult = await chrome.storage.local.get(['riskLevel']);
  const riskLevel = (storageResult.riskLevel as 'conservative' | 'moderate' | 'degen') || 'moderate';

  console.log('[TiltGuard] Using risk profile:', riskLevel);

  // Initialize tilt detector
  tiltDetector = new TiltDetector(initialBalance, riskLevel);

  // Initialize analyzer client
  client = new AnalyzerClient(ANALYZER_WS_URL);

  try {
    await client.connect();
    console.log('[TiltGuard] Connected to analyzer server');
  } catch (_error) {
    console.log('[TiltGuard] Analyzer backend offline - tilt monitoring only');
  }

  // Generate session ID using cryptographically secure random
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  sessionId = `session_${Date.now()}_${randomBytes[0].toString(36)}`;
  const userId = await getUserId();
  const casinoId = detectCasinoId();
  const gameId = detectGameId();

  console.log('[TiltGuard] Session started:', { sessionId, userId, casinoId, gameId });

  // Start tilt monitoring
  startTiltMonitoring();

  // Start observing
  stopObserving = extractor.startObserving((spinData) => {
    if (!spinData) return;

    console.log('[TiltGuard] Spin detected:', spinData);

    // Check if sessionId is valid before using
    if (!sessionId) {
      console.warn('[TiltGuard] Session not started, cannot record spin');
      return;
    }

    handleSpinEvent(spinData, { sessionId, userId, casinoId, gameId });
  });

  console.log('[TiltGuard] Monitoring started successfully');
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
  console.log('[TiltGuard] Stopping monitoring...');

  if (stopObserving) {
    stopObserving();
    stopObserving = null;
  }

  if (client) {
    client.disconnect();
    client = null;
  }

  isMonitoring = false;
  (window as any).TiltGuardSidebar?.updateGuardian(false);

  console.log('[TiltGuard] Monitoring stopped');
}

/**
 * Handle spin event
 */
function handleSpinEvent(spinData: SpinEvent, session: { sessionId: string, userId: string, casinoId: string, gameId: string }) {
  const bet = spinData.bet || 0;
  const payout = spinData.win || 0;

  // Record in tilt detector
  if (tiltDetector) {
    tiltDetector.recordBet(bet, payout);

    // Get session summary for accurate stats
    const sessionSummary = tiltDetector.getSessionSummary();

    // Update sidebar stats
    // Note: sessionSummary.duration is the session duration in ms
    // netProfit represents total winnings (payouts - bets)
    const stats = {
      startTime: sessionSummary.startTime || Date.now(),
      totalBets: sessionSummary.totalBets || 0,
      totalWagered: sessionSummary.totalWagered || 0,
      totalWon: sessionSummary.totalWon || 0
    };
    (window as any).TiltGuardSidebar?.updateStats(stats);

    // Check for tilt immediately after bet
    const tiltSigns = tiltDetector.detectAllTiltSigns();
    const tiltRisk = tiltDetector.getTiltRiskScore();
    const indicators = tiltSigns.map(sign => sign.description);

    // Update sidebar tilt score
    (window as any).TiltGuardSidebar?.updateTilt(tiltRisk, indicators);

    const interventions = tiltDetector.generateInterventions();
    if (interventions.length > 0) {
      handleInterventions(interventions);
    }
  }

  // Send to analyzer (if connected)
  if (client && sessionId) {
    client.sendSpin({
      sessionId: session.sessionId,
      casinoId: session.casinoId,
      gameId: session.gameId,
      userId: session.userId,
      bet,
      payout,
      gameResult: spinData.gameResult,
      symbols: spinData.symbols,
      bonusRound: spinData.bonusActive,
      freeSpins: (spinData.freeSpins || 0) > 0
    });
  }

  // Check for Zero Balance Intervention
  checkZeroBalance(spinData.balance);

  // Auto-increment Nonce for Fairness Verifier
  const currentNonce = parseInt(localStorage.getItem('tiltcheck_nonce') || '0');
  const nextNonce = currentNonce + 1;
  localStorage.setItem('tiltcheck_nonce', nextNonce.toString());

  // Notify Sidebar (Visual Indicator)
  window.dispatchEvent(new CustomEvent('tg-nonce-update', { detail: { nonce: nextNonce, source: 'spin' } }));

  // Update Status Bar
  window.dispatchEvent(new CustomEvent('tg-status-update', { detail: { message: 'Analyzing spin...', type: 'thinking' } }));

  // Verify Provably Fair (Check Yourself)
  verifySpinFairness(spinData, session.gameId);
}

/**
 * Check if balance hit zero and suggest surveys
 */
let zeroBalanceTriggered = false;
function checkZeroBalance(balance: number | null) {
  if (balance === null) return;

  // If balance is 0 (or very close to it) and we haven't triggered yet
  if (balance < 0.05 && !zeroBalanceTriggered) {
    zeroBalanceTriggered = true;

    // Show intervention
    showInteractiveNotification(
      "📉 Balance hit zero. Want to earn $5-10 quickly with a survey?",
      [
        { text: "Earn Crypto", action: () => { window.open('https://tiltcheck.me/tools/qualifyfirst.html', '_blank'); } },
        { text: "No thanks", action: () => { } }
      ]
    );
  } else if (balance > 1.0) {
    // Reset trigger if they deposit or win
    zeroBalanceTriggered = false;
  }
}

/**
 * Periodic tilt monitoring
 */
function startTiltMonitoring() {
  setInterval(() => {
    if (!tiltDetector || !isMonitoring) return;

    const tiltSigns = tiltDetector.detectAllTiltSigns();
    const tiltRisk = tiltDetector.getTiltRiskScore();
    const indicators = tiltSigns.map(sign => sign.description);

    // Update sidebar
    (window as any).TiltGuardSidebar?.updateTilt(tiltRisk, indicators);

    // Send to popup
    chrome.runtime.sendMessage({
      type: 'tilt_update',
      data: {
        tiltRisk,
        tiltSigns,
        sessionSummary: tiltDetector.getSessionSummary()
      }
    });

    // Check for critical tilt
    if (tiltRisk >= 80) {
      triggerEmergencyStop('Critical tilt detected!');
      (window as any).TiltGuardSidebar?.notifyBuddy('critical_tilt', { risk: tiltRisk });
    }
  }, 5000); // Check every 5 seconds
}

/**
 * Handle interventions
 */
function handleInterventions(interventions: any[]) {
  for (const intervention of interventions) {
    console.log('[TiltGuard] Intervention:', intervention);

    switch (intervention.type) {
      case 'cooldown':
        startCooldown(intervention.data.duration);
        break;

      case 'vault_balance':
        showVaultPrompt(intervention.data);
        break;

      case 'spending_reminder':
        showSpendingReminder(intervention.data.realWorldComparison);
        break;

      case 'stop_loss_triggered':
        triggerStopLoss(intervention.data);
        break;

      case 'phone_friend':
        showPhoneFriendPrompt();
        break;

      case 'session_break':
        showBreakPrompt();
        break;
    }

    // Queue for popup
    interventionQueue.push(intervention);

    // Send to popup
    chrome.runtime.sendMessage({
      type: 'intervention',
      data: intervention
    });

    // Notify Buddy
    (window as any).TiltGuardSidebar?.notifyBuddy('intervention', {
      type: intervention.type,
      data: intervention.data
    });
  }
}

/**
 * Start cooldown period
 */
function startCooldown(duration: number) {
  cooldownEndTime = Date.now() + duration;

  // Block betting UI
  blockBettingUI(true);

  // Show overlay
  showCooldownOverlay(duration);

  // Countdown
  const countdown = setInterval(() => {
    if (!cooldownEndTime) {
      clearInterval(countdown);
      return;
    }

    const remaining = cooldownEndTime - Date.now();
    if (remaining <= 0) {
      clearInterval(countdown);
      endCooldown();
    } else {
      updateCooldownOverlay(remaining);
    }
  }, 1000);
}

/**
 * End cooldown
 */
function endCooldown() {
  cooldownEndTime = null;
  blockBettingUI(false);
  removeCooldownOverlay();
  showNotification('✅ Cooldown complete. Play responsibly.', 'success');
}

/**
 * Block betting UI during cooldown
 */
function blockBettingUI(block: boolean) {
  // Find common bet buttons
  const betButtons = document.querySelectorAll(
    'button[class*="bet"], button[class*="spin"], [data-action="bet"], [data-action="spin"]'
  );

  betButtons.forEach((btn: any) => {
    if (block) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.dataset.tiltguardBlocked = 'true';
    } else if (btn.dataset.tiltguardBlocked) {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
      delete btn.dataset.tiltguardBlocked;
    }
  });
}

/**
 * Show cooldown overlay
 */
function showCooldownOverlay(duration: number) {
  const overlay = document.createElement('div');
  overlay.id = 'tiltcheck-cooldown-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    font-family: Arial, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="text-align: center;">
      <h1 style="font-size: 48px; margin-bottom: 20px;">🛑</h1>
      <h2 style="font-size: 32px; margin-bottom: 10px;">Cooldown Period</h2>
      <p style="font-size: 18px; color: #ffaa00; margin-bottom: 30px;">
        Tilt detected. Take a break.
      </p>
      <div id="cooldown-timer" style="font-size: 72px; font-weight: bold; color: #00ff88;">
        ${Math.ceil(duration / 1000)}
      </div>
      <p style="font-size: 14px; margin-top: 20px; color: rgba(255, 255, 255, 0.7);">
        Betting will resume when the timer reaches zero.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * Update cooldown overlay
 */
function updateCooldownOverlay(remaining: number) {
  const timer = document.getElementById('cooldown-timer');
  if (timer) {
    timer.textContent = Math.ceil(remaining / 1000).toString();
  }
}

/**
 * Remove cooldown overlay
 */
function removeCooldownOverlay() {
  const overlay = document.getElementById('tiltcheck-cooldown-overlay');
  if (overlay) overlay.remove();
}

/**
 * Show vault prompt
 */
function showVaultPrompt(vaultData: any) {
  const message = `💰 Your balance is ${vaultData.suggestedAmount.toFixed(2)}. Consider vaulting to protect your winnings.`;
  showInteractiveNotification(message, [
    { text: 'Vault Now', action: () => openVaultInterface(vaultData.suggestedAmount) },
    { text: 'Later', action: () => { } }
  ]);
}

/**
 * Show spending reminder
 */
function showSpendingReminder(comparison: any) {
  showInteractiveNotification(comparison.message, [
    { text: 'Vault & Buy', action: () => openVaultInterface(comparison.cost) },
    { text: 'Remind Me Later', action: () => { } }
  ]);
}

/**
 * Trigger stop loss
 */
function triggerStopLoss(data: any) {
  triggerEmergencyStop(data.reason);
  showVaultPrompt({ suggestedAmount: tiltDetector?.getSessionSummary().currentBalance || 0 });
}

/**
 * Show phone a friend prompt
 */
function showPhoneFriendPrompt() {
  showInteractiveNotification(
    '📞 Multiple tilt signs detected. Consider calling someone before continuing.',
    [
      { text: 'Take Break', action: () => startCooldown(5 * 60 * 1000) },
      { text: 'Continue', action: () => { } }
    ]
  );
}

/**
 * Show break prompt
 */
function showBreakPrompt() {
  showInteractiveNotification(
    '⏰ You\'ve been playing for a while. How about a quick break?',
    [
      { text: '5 Min Break', action: () => startCooldown(5 * 60 * 1000) },
      { text: 'Keep Playing', action: () => { } }
    ]
  );
}

/**
 * Emergency stop
 */
function triggerEmergencyStop(reason: string) {
  // Stop all betting
  blockBettingUI(true);

  // Show critical warning
  const warning = document.createElement('div');
  warning.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ff3838 0%, #cc0000 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(255, 56, 56, 0.5);
    z-index: 999999;
    max-width: 400px;
    text-align: center;
    font-family: Arial, sans-serif;
  `;

  warning.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 15px;">🚨 EMERGENCY STOP</h2>
    <p style="font-size: 16px; margin-bottom: 20px;">${reason}</p>
    <button id="emergency-vault" style="
      background: white;
      color: #cc0000;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      margin-right: 10px;
    ">Vault Balance</button>
    <button id="emergency-continue" style="
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid white;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    ">I Understand (Continue)</button>
  `;

  document.body.appendChild(warning);

  // Event listeners
  document.getElementById('emergency-vault')?.addEventListener('click', () => {
    openVaultInterface(tiltDetector?.getSessionSummary().currentBalance || 0);
    warning.remove();
  });

  document.getElementById('emergency-continue')?.addEventListener('click', () => {
    blockBettingUI(false);
    warning.remove();
  });
}

/**
 * Open vault interface (integrate with LockVault)
 */
function openVaultInterface(amount: number) {
  // Send vault request to background script for processing
  chrome.runtime.sendMessage({
    type: 'open_vault',
    data: { suggestedAmount: amount }
  }, (response) => {
    if (response?.success) {
      showNotification('✓ Vault interface opened', 'success');
    } else if (response?.error) {
      showNotification(`✗ Vault error: ${response.error}`, 'error');
    }
  });
}

/**
 * Show persistent warning (reserved for future use)
 */
function _showPersistentWarning(message: string) {
  const warning = document.createElement('div');
  warning.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #ff3838 0%, #cc0000 100%);
    color: white;
    padding: 15px;
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    z-index: 999998;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  warning.textContent = message;
  document.body.appendChild(warning);
}

/**
 * Show interactive notification
 */
function showInteractiveNotification(message: string, actions: Array<{ text: string; action: () => void }>) {
  const notification = document.createElement('div');
  notification.className = 'tiltguard-notification';
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3);
    z-index: 999999;
    max-width: 350px;
    font-family: Arial, sans-serif;
    border: 2px solid #00ff88;
  `;

  const messageEl = document.createElement('p');
  messageEl.style.cssText = 'margin-bottom: 15px; font-size: 14px; line-height: 1.4;';
  messageEl.textContent = message;
  notification.appendChild(messageEl);

  const actionsContainer = document.createElement('div');
  actionsContainer.style.cssText = 'display: flex; gap: 10px;';

  for (const actionDef of actions) {
    const button = document.createElement('button');
    button.textContent = actionDef.text;
    button.style.cssText = `
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      background: linear-gradient(135deg, #00ff88 0%, #00ccff 100%);
      color: black;
    `;

    button.addEventListener('click', () => {
      actionDef.action();
      notification.remove();
    });

    actionsContainer.appendChild(button);
  }

  notification.appendChild(actionsContainer);
  document.body.appendChild(notification);

  // Auto-remove after 30 seconds
  setTimeout(() => notification.remove(), 30000);
}

/**
 * Show notification message
 */
function showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success') {
  const notification = document.createElement('div');
  const bgColors = {
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColors[type]};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    max-width: 350px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/**
 * Detect casino ID from hostname
 */
function detectCasinoId(): string {
  const hostname = window.location.hostname.toLowerCase();

  // Use isDomain for secure domain matching
  if (isDomain(hostname, 'stake.com') || isDomain(hostname, 'stake.us')) return 'stake';
  if (isDomain(hostname, 'roobet.com')) return 'roobet';
  if (isDomain(hostname, 'bc.game')) return 'bc-game';
  if (isDomain(hostname, 'duelbits.com')) return 'duelbits';
  if (isDomain(hostname, 'rollbit.com')) return 'rollbit';
  if (isDomain(hostname, 'shuffle.com')) return 'shuffle';
  if (isDomain(hostname, 'gamdom.com')) return 'gamdom';
  if (isDomain(hostname, 'csgoempire.com')) return 'csgoempire';

  // Extract domain name as fallback
  const parts = hostname.replace('www.', '').split('.');
  return parts[0] || 'unknown';
}

/**
 * Detect game ID from URL or page content
 */
function detectGameId(): string {
  const pathname = window.location.pathname.toLowerCase();
  const href = window.location.href.toLowerCase();

  // Try to extract from URL patterns
  // e.g., /casino/slots/game-name, /games/sweet-bonanza
  const patterns = [
    /\/casino\/slots\/([a-z0-9-]+)/,
    /\/games?\/([a-z0-9-]+)/,
    /\/slots?\/([a-z0-9-]+)/,
    /\/play\/([a-z0-9-]+)/
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern) || href.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Try to get from page title
  const pageTitle = document.title.toLowerCase();
  if (pageTitle.includes('sweet bonanza')) return 'sweet-bonanza';
  if (pageTitle.includes('gates of olympus')) return 'gates-of-olympus';
  if (pageTitle.includes('sugar rush')) return 'sugar-rush';
  if (pageTitle.includes('starlight princess')) return 'starlight-princess';
  if (pageTitle.includes('wild west gold')) return 'wild-west-gold';
  if (pageTitle.includes('dog house')) return 'dog-house';
  if (pageTitle.includes('book of dead')) return 'book-of-dead';
  if (pageTitle.includes('fire joker')) return 'fire-joker';

  return 'unknown-game';
}

/**
 * Get user ID from storage or generate one
 */
async function getUserId(): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Try to get from chrome storage
      chrome.storage.local.get(['tiltguard_user_id'], (result) => {
        if (result.tiltguard_user_id) {
          resolve(result.tiltguard_user_id as string);
        } else {
          // Generate new user ID
          const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          chrome.storage.local.set({ tiltguard_user_id: newId });
          resolve(newId as string);
        }
      });
    } catch (_e) {
      // Fallback to localStorage if chrome.storage is not available
      let userId = localStorage.getItem('tiltguard_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('tiltguard_user_id', userId);
      }
      resolve(userId);
    }
  });
}

/**
 * Setup listeners for "Play" button to capture commitment
 */
function setupFairnessListeners() {
  const observer = new MutationObserver((mutations) => {
    // Generic selector for bet buttons - refine per casino
    const playBtns = document.querySelectorAll('[data-testid="bet-button"], .bet-button, button[class*="bet"]');

    playBtns.forEach((btn) => {
      if (btn instanceof HTMLElement && !btn.dataset.tiltCheckAttached) {
        btn.dataset.tiltCheckAttached = "true";
        btn.addEventListener('click', async () => {
          try {
            if (!solana || !bridge) return;

            // 1. Fetch Entropy (Solana Block Hash)
            const blockHash = await solana.getLatestBlockHash();

            // 2. Get User Identity (Mocked - in prod get from storage/bridge)
            const discordId = await getUserId();
            const clientSeed = localStorage.getItem('tiltcheck_client_seed') || 'default-seed';

            // 3. Store commitment for the upcoming result
            sessionStorage.setItem('tiltcheck_pending_commitment', JSON.stringify({
              blockHash,
              discordId,
              clientSeed,
              timestamp: Date.now()
            }));

            console.log(`[TiltCheck] Commitment Locked: ${blockHash.substring(0, 8)}...`);

            // Optional: Send Memo to Solana (requires wallet connection)
            // await bridge.connect();
            // await solana.sendCommitmentMemo(bridge, discordId, clientSeed, detectGameId());

          } catch (err) {
            console.error("[TiltCheck] Commitment Error:", err);
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Verify the fairness of a finished spin
 */
async function verifySpinFairness(spinData: any, gameId: string) {
  if (!fairness || !analyzer) return;

  const storedCommitment = sessionStorage.getItem('tiltcheck_pending_commitment');
  if (!storedCommitment) return; // No commitment made for this spin

  try {
    const commitment = JSON.parse(storedCommitment);

    // Clear immediately to prevent reusing for next spin
    sessionStorage.removeItem('tiltcheck_pending_commitment');

    // 1. Calculate the "Source of Truth" from the commitment
    const expectedHash = await fairness.generateHash(
      commitment.blockHash,
      commitment.discordId,
      commitment.clientSeed
    );
    const expectedFloat = fairness.hashToFloat(expectedHash);

    // 2. Normalize based on Game ID
    let expectedResult: number | string = expectedFloat;
    let gameType = 'standard';

    if (gameId.includes('dice')) {
      gameType = 'dice';
      expectedResult = fairness.getDiceResult(expectedFloat);
    } else if (gameId.includes('limbo') || gameId.includes('crash')) {
      gameType = 'limbo';
      expectedResult = fairness.getLimboResult(expectedFloat);
    } else if (gameId.includes('plinko')) {
      gameType = 'plinko';
      // Default to 16 rows if unknown, or extract from spinData if available
      const rows = spinData.rows || 16;
      expectedResult = fairness.getPlinkoPath(expectedHash, rows).join(',');
    }

    console.log(`[TiltCheck] 🎲 Fair Result Calculated (${gameType}):`, expectedResult);
    console.log(`[TiltCheck] 🔑 Server Hash:`, expectedHash);

    // 3. Verify against Casino Data
    // If the casino provided the hash in the metadata, we can verify strictly
    if (spinData.hash) {
      const isHashValid = spinData.hash === expectedHash;
      if (isHashValid) {
        window.dispatchEvent(new CustomEvent('tg-status-update', { detail: { message: 'Fairness Verified (Hash Match)', type: 'success' } }));
        showNotification("✅ Fair Game Verified (Hash Match)", "success");
      } else {
        showNotification("⚠️ Fairness Hash Mismatch!", "error");
        console.warn(`[TiltCheck] Hash Mismatch! Expected: ${expectedHash}, Got: ${spinData.hash}`);
      }
    } else if (spinData.gameResult !== null && spinData.gameResult !== undefined) {
      // Automated check against scraped result
      const resultVal = Number(spinData.gameResult);

      // Only compare if expectedResult is a number (skip Plinko paths for now)
      if (typeof expectedResult === 'number') {
        // Use a reasonable tolerance (e.g. 0.05 for dice/crash rounding)
        if (Math.abs(resultVal - expectedResult) < 0.05) {
          window.dispatchEvent(new CustomEvent('tg-status-update', { detail: { message: `Fairness Verified (Result: ${resultVal})`, type: 'success' } }));
          showNotification(`✅ Fair Game Verified (Result: ${resultVal})`, "success");
          console.log(`[TiltCheck] ✅ Scraped result ${resultVal} matches expected ${expectedResult}`);
        } else {
          console.warn(`[TiltCheck] ⚠️ Result Mismatch! Expected: ${expectedResult}, Scraped: ${resultVal}`);
        }
      }
    } else {
      // If no hash provided, we rely on the user checking the console or UI overlay
      // In a full implementation, we would use Analyzer.waitForResult() here to scrape the visual result
      console.log(`[TiltCheck] Visual Verify: Does the screen show ${expectedResult}?`);
      window.dispatchEvent(new CustomEvent('tg-status-update', { detail: { message: `Visual Check: Expecting ${expectedResult}`, type: 'info' } }));
    }

  } catch (err) {
    console.error("[TiltCheck] Verification Error:", err);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[TiltGuard] Message received:', message.type);

  switch (message.type) {
    case 'start_analysis':
      startMonitoring().then(() => {
        sendResponse({ success: true, sessionId });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    case 'stop_analysis':
      stopMonitoring();
      sendResponse({ success: true });
      break;

    case 'get_license_verification':
      sendResponse(casinoVerification || { error: 'Not verified' });
      break;

    case 'get_tilt_status':
      if (tiltDetector) {
        sendResponse({
          tiltRisk: tiltDetector.getTiltRiskScore(),
          tiltSigns: tiltDetector.detectAllTiltSigns(),
          sessionSummary: tiltDetector.getSessionSummary()
        });
      } else {
        sendResponse({ error: 'Monitoring not active' });
      }
      break;

    case 'get_session_stats':
      if (tiltDetector) {
        sendResponse(tiltDetector.getSessionSummary());
      } else {
        sendResponse({ error: 'Monitoring not active' });
      }
      break;

    case 'get_pending_intervention':
      if (interventionQueue.length > 0) {
        sendResponse({ intervention: interventionQueue.shift() });
      } else {
        sendResponse({ intervention: null });
      }
      break;

    case 'start_cooldown':
      startCooldown(message.duration || 300000);
      sendResponse({ success: true });
      break;

    case 'request_report':
      if (tiltDetector) {
        sendResponse({ success: true, report: (tiltDetector as any).generateReport ? (tiltDetector as any).generateReport() : { summary: tiltDetector.getSessionSummary() } });
      } else {
        sendResponse({ error: 'No data to report' });
      }
      break;

    case 'validate_selector':
      try {
        const el = document.querySelector(message.selector);
        const value = el ? (el instanceof HTMLInputElement ? el.value : el.textContent || '').trim().substring(0, 50) : null;
        sendResponse({ found: !!el, value: value || 'Empty' });
      } catch (e) {
        sendResponse({ found: false, error: 'Invalid selector' });
      }
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
  return true;
});

// Initialize on load
if (!isExcludedDomain) {
  initialize();
}

console.log('[TiltGuard] Content script loaded');
