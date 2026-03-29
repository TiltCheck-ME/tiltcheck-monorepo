/* Copyright (c) 2026 TiltCheck. All rights reserved. */

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
import { initSidebar } from './sidebar/index.js';
import { SidebarUI } from './sidebar/types.js';
import { Analyzer } from './analyzer.js';
import { WalletBridge } from './wallet-bridge.js';
import { SolanaProvider } from '@tiltcheck/utils';
import { FairnessService } from './FairnessService.js';
import { EXT_CONFIG } from './config.js';

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
let tiltMonitoringInterval: ReturnType<typeof setInterval> | null = null;
let sidebar: SidebarUI | null = null;
const FULL_SIDEBAR_WIDTH = 340;
const MINIMIZED_SIDEBAR_WIDTH = 40;
const SIDEBAR_VISIBILITY_KEY = 'tiltcheck_sidebar_visible';

// Intervention state
let cooldownEndTime: number | null = null;

function refreshLicenseVerification() {
  if (!licenseVerifier) {
    licenseVerifier = new CasinoLicenseVerifier();
  }
  casinoVerification = licenseVerifier.verifyCasino();
  sidebar?.updateLicense(casinoVerification);
  return casinoVerification;
}

function setSidebarVisibility(visible: boolean): boolean {
  const sidebar = document.getElementById('tiltcheck-sidebar');
  if (!sidebar) return false;
  sidebar.style.display = visible ? 'block' : 'none';

  const offset = sidebar.classList.contains('minimized') ? MINIMIZED_SIDEBAR_WIDTH : FULL_SIDEBAR_WIDTH;

  if (visible) {
    document.body.style.width = `calc(100% - ${offset}px)`;
    document.documentElement.style.width = `calc(100% - ${offset}px)`;
    document.body.style.transition = 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  } else {
    document.body.style.width = '100%';
    document.documentElement.style.width = '100%';
  }

  return visible;
}

function persistSidebarVisibility(visible: boolean) {
  try {
    chrome.storage.local.set({ [SIDEBAR_VISIBILITY_KEY]: visible });
  } catch {
    // Ignore persistence failures; UI still works in-memory.
  }
}

async function restoreSidebarVisibility(defaultVisible: boolean) {
  try {
    const stored = await chrome.storage.local.get([SIDEBAR_VISIBILITY_KEY]);
    if (typeof stored[SIDEBAR_VISIBILITY_KEY] === 'boolean') {
      setSidebarVisibility(stored[SIDEBAR_VISIBILITY_KEY]);
      return;
    }
  } catch {
    // Fall back to default visibility.
  }
  setSidebarVisibility(defaultVisible);
}

function toggleSidebarVisibility(): boolean {
  const sidebarEl = document.getElementById('tiltcheck-sidebar');
  if (!sidebarEl) {
    sidebar = initSidebar();
    if (sidebar) persistSidebarVisibility(true);
    return !!sidebar;
  }
  const currentlyVisible = sidebarEl.style.display !== 'none';
  const visible = setSidebarVisibility(!currentlyVisible);
  persistSidebarVisibility(visible);
  return visible;
}

function getSidebarState() {
  const sidebar = document.getElementById('tiltcheck-sidebar');
  return {
    exists: !!sidebar,
    visible: !!sidebar && sidebar.style.display !== 'none',
  };
}

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
    if (target === this.overlay || target.closest('#tiltcheck-sidebar')) return;

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
  sidebar = initSidebar();
  // Default hidden on TiltCheck-owned pages, visible on supported casino pages.
  const defaultVisible = !isDomain(hostname, 'tiltcheck.me');
  void restoreSidebarVisibility(defaultVisible);
  console.log('[TiltCheck] Sidebar created:', !!sidebar);

  // Check casino license from footer/legal sections and refresh after delayed page content loads.
  const initialLicenseStatus = refreshLicenseVerification();
  console.log('[TiltCheck] License verification:', initialLicenseStatus);
  setTimeout(() => refreshLicenseVerification(), 3000);
  setTimeout(() => refreshLicenseVerification(), 8000);

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

  // Sidebar-first mode: start monitoring automatically.
  void startMonitoring().catch((err) => {
    console.warn('[TiltCheck] Auto-start monitoring failed:', err);
  });

}

/**
 * Start monitoring
 */
async function startMonitoring() {
  if (isMonitoring) return;

  console.log('[TiltCheck] Starting monitoring...');

  // Update UI
  sidebar?.updateRealityCheck(true);
  isMonitoring = true;

  // Get initial balance
  extractor = new CasinoDataExtractor();
  await extractor.initialize();
  const initialBalance = extractor.extractBalance() || 100; // Default if can't extract

  console.log('[TiltGuard] Initial balance:', initialBalance);

  // Get risk level, redeem threshold, and auth token from storage
  const storageResult = await chrome.storage.local.get(['riskLevel', 'redeemThreshold', 'authToken']);
  const riskLevel = (storageResult.riskLevel as 'conservative' | 'moderate' | 'degen') || 'moderate';
  const redeemThreshold = Number(storageResult.redeemThreshold) || 0;
  const authToken = storageResult.authToken as string | undefined;

  console.log('[TiltGuard] Using profile:', { riskLevel, redeemThreshold, hasToken: !!authToken });

  // Initialize tilt detector
  tiltDetector = new TiltDetector(initialBalance, riskLevel, redeemThreshold);

  // Initialize analyzer client with auth token if available
  const wsUrlWithAuth = authToken ? `${ANALYZER_WS_URL}?token=${authToken}` : ANALYZER_WS_URL;
  client = new AnalyzerClient(wsUrlWithAuth, (error) => {
    // Surface post-open disconnect/reconnect failures to UI and logs.
    console.warn('[TiltGuard] Analyzer connection issue:', error);
    sidebar?.updateRealityCheck(false);
    window.dispatchEvent(
      new CustomEvent('tg-status-update', {
        detail: { message: 'Analyzer connection dropped. Reconnecting...', type: 'warning' }
      })
    );
  });

  try {
    await client.connect();
    console.log('[TiltGuard] Connected to analyzer server');
    sidebar?.updateRealityCheck(true);
  } catch {
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
function _stopMonitoring() {
  console.log('[TiltGuard] Stopping monitoring...');

  if (stopObserving) {
    stopObserving();
    stopObserving = null;
  }

  if (client) {
    client.disconnect();
    client = null;
  }
  if (tiltMonitoringInterval) {
    clearInterval(tiltMonitoringInterval);
    tiltMonitoringInterval = null;
  }

  isMonitoring = false;
  sidebar?.updateRealityCheck(false);

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
    (window as any).TiltCheckSidebar?.updateStats(stats);

    // Check for tilt immediately after bet
    const tiltSigns = tiltDetector.detectAllTiltSigns();
    const tiltRisk = tiltDetector.getTiltRiskScore();
    const indicators = tiltSigns.map(sign => sign.description);

    // Update sidebar tilt score
    sidebar?.updateTilt(tiltRisk, indicators);

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

  // NEW: Push to Hub Relay for Discord Activity
  fetch(`${EXT_CONFIG.HUB_URL}/telemetry/round`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: session.userId,
      bet,
      win: payout
    })
  }).catch(err => console.warn('[TiltCheck] Hub relay failed:', err));

  // Check for Bag Fumble or Zero Balance Intervention
  if (tiltDetector) {
    checkBagFumble(spinData.balance, tiltDetector.getSessionSummary().initialBalance);
  }

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
 * Monitor Bag Fumbling (Buddy System)
 * Triggers if user was up significantly and is now blowing their bag, or if they zero out completely.
 */
let peakBalance = 0;
let zeroTriggered = false;
let fumbleStrikes = 0;

function checkBagFumble(balance: number | null, initialBalance: number) {
  if (balance === null || initialBalance <= 0) return;

  if (balance > peakBalance) {
    peakBalance = balance;
  }

  const hadBigBag = peakBalance >= initialBalance * 1.5;
  const isBlowingIt = hadBigBag && balance <= (initialBalance * 1.1) && balance < (peakBalance * 0.5);
  const isZero = balance < 0.05;

  if ((isBlowingIt || isZero) && !zeroTriggered) {
    zeroTriggered = true;
    fumbleStrikes++;

    if (fumbleStrikes === 1) {
      // Strike 1
      showInteractiveNotification(
        isZero ? 
        "🛑 0 BALANCE DETECTED. Hey, stop it. You're gonna be mad if you deposit again. Close the tab and go touch grass." :
        "📉 BAG FUMBLE DETECTED. You were up and now you're giving it all back. Stop spinning before you ruin your week. Go touch grass.",
        [
          { text: "Close Tab", action: () => { window.close(); } },
          { text: "I Won't Deposit (Lie)", action: () => { } }
        ]
      );
    } else {
      // Strike 2+ (Continued zeroing out / fumbling)
      showInteractiveNotification(
        "🚨 REPEATED FUMBLES. You obviously aren't going to stop yourself, so I just pinged the Discord. Get in the 'degen-accountability' VC for a lifeline before you do something stupid.",
        [
          { text: "Get Yelled At (Join VC)", action: () => { window.open('https://discord.gg/s6NNfPHxMS', '_blank'); } },
          { text: "Ignore Me", action: () => { } }
        ]
      );
      
      // Simulate ping to Discord
      sidebar?.notifyBuddy('intervention', {
        type: 'phone_friend_discord',
        data: { message: 'Discord ping sent to Degen Accountability channel.' }
      });
    }
  } else if (balance >= initialBalance * 1.2 && !isBlowingIt) {
    // Reset trigger if they actually recover (Strikes persist)
    zeroTriggered = false;
  }
}

/**
 * Periodic tilt monitoring
 */
function startTiltMonitoring() {
  if (tiltMonitoringInterval) {
    clearInterval(tiltMonitoringInterval);
  }
  tiltMonitoringInterval = setInterval(() => {
    if (!tiltDetector || !isMonitoring) return;

    const tiltSigns = tiltDetector.detectAllTiltSigns();
    const tiltRisk = tiltDetector.getTiltRiskScore();
    const indicators = tiltSigns.map(sign => sign.description);

    // Update sidebar
    sidebar?.updateTilt(tiltRisk, indicators);

    // Check for critical tilt
    if (tiltRisk >= 80) {
      triggerEmergencyStop('Critical tilt detected!');
      sidebar?.notifyBuddy('critical_tilt', { risk: tiltRisk });
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

      case 'redeem_nudge':
        showRedeemNudge(intervention.data);
        break;
    }

    // Notify Buddy
    sidebar?.notifyBuddy('intervention', {
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
    <h2 style="font-size: 24px; margin-bottom: 15px; letter-spacing: -0.05em; font-weight: 900;">🚨 EMERGENCY STOP</h2>
    <p style="font-size: 16px; margin-bottom: 10px; font-weight: bold;">${reason}</p>
    
    <div style="
      background: rgba(0,0,0,0.3); 
      padding: 15px; 
      margin-bottom: 20px; 
      border: 1px solid rgba(255,255,255,0.2);
      text-align: left;
      font-size: 11px;
      line-height: 1.4;
      color: rgba(255,255,255,0.9);
      max-height: 120px;
      overflow-y: auto;
    ">
      <b style="color: #ffda00; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 5px;">Digital Asset Risk Disclosure:</b>
      TiltCheck is a non-custodial tool. We do not hold your funds. You are solely responsible for your private keys. Crypto assets are highly volatile and involves risk of total loss. No information provided constitutes financial advice.
    </div>

    <div style="display: flex; gap: 10px; justify-content: center;">
      <button id="emergency-vault" style="
        background: white;
        color: #cc0000;
        border: none;
        padding: 14px 20px;
        font-size: 13px;
        font-weight: 900;
        border-radius: 4px;
        cursor: pointer;
        text-transform: uppercase;
      ">Vault Balance</button>
      <button id="emergency-continue" style="
        background: rgba(0,0,0,0.4);
        color: white;
        border: 2px solid white;
        padding: 14px 20px;
        font-size: 13px;
        font-weight: 900;
        border-radius: 4px;
        cursor: pointer;
        text-transform: uppercase;
      ">I Acknowledge Risk</button>
    </div>
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
  const createUserId = () => {
    const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    return `user_${Date.now()}_${rand}`;
  };
  return new Promise((resolve) => {
    try {
      // 1. Prefer authenticated Discord ID if available
      chrome.storage.local.get(['userData', 'tiltguard_user_id'], (result: any) => {
        if (result.userData?.id) {
          resolve(result.userData.id as string);
        } else if (result.tiltguard_user_id) {
          resolve(result.tiltguard_user_id as string);
        } else {
          // Generate new user ID
          const newId = createUserId();
          chrome.storage.local.set({ tiltguard_user_id: newId });
          resolve(newId as string);
        }
      });
    } catch {
      // Fallback to localStorage
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const user = JSON.parse(storedUserData);
          if (user.id) return resolve(user.id);
        } catch { /* ignore */ }
      }
      
      let userId = localStorage.getItem('tiltguard_user_id');
      if (!userId) {
        userId = createUserId();
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
  const observer = new MutationObserver((_mutations) => {
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

// Listen for extension messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[TiltGuard] Message received:', message.type);

  // Keep excluded domains isolated even if content script is injected.
  if (isExcludedDomain && message.type !== 'get_sidebar_state') {
    sendResponse({ error: 'Feature disabled on this domain' });
    return true;
  }

  switch (message.type) {
    case 'toggle_sidebar': {
      const visible = toggleSidebarVisibility();
      sendResponse({ success: true, visible });
      break;
    }

    case 'open_sidebar': {
      const sidebarEl = document.getElementById('tiltcheck-sidebar');
      if (!sidebarEl) {
        sidebar = initSidebar();
      }
      const visible = setSidebarVisibility(true);
      persistSidebarVisibility(true);
      sendResponse({ success: true, visible });
      break;
    }

    case 'get_sidebar_state':
      sendResponse(getSidebarState());
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
  return true;
});

/**
 * Show high-intensity Redeem Nudge
 */
function showRedeemNudge(data: any) {
  const overlay = document.createElement('div');
  overlay.id = 'tiltcheck-redeem-nudge';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 1000000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    font-family: 'Inter', sans-serif;
    text-align: center;
  `;

  overlay.innerHTML = `
    <div style="max-width: 500px; padding: 40px; border: 2px solid #00ff88; border-radius: 20px; background: rgba(0, 255, 136, 0.05); box-shadow: 0 0 50px rgba(0, 255, 136, 0.2);">
      <h1 style="font-size: 64px; margin-bottom: 10px;">🏆</h1>
      <h2 style="font-size: 28px; color: #00ff88; text-transform: uppercase; letter-spacing: 2px;">WIN SECURED</h2>
      <p style="font-size: 20px; margin: 20px 0; line-height: 1.5;">${data.message}</p>
      <div style="font-size: 48px; font-weight: 800; margin-bottom: 30px;">$${Number(data.amount).toFixed(2)}</div>
      
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="redeem-btn" style="background: #00ff88; color: black; border: none; padding: 15px 30px; border-radius: 10px; font-weight: 900; cursor: pointer; font-size: 18px; text-transform: uppercase;">
          Redeem Now & Quit
        </button>
        <button id="later-btn" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.2); padding: 15px 30px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 14px;">
          Maybe Later (Risk It)
        </button>
      </div>
      
      <div style="margin-top: 30px; font-size: 11px; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px;">
        Made for Degens. By Degens.
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('redeem-btn')?.addEventListener('click', () => {
    // Notify hub of successful win secure
    void relayWinSecure(data.amount);
    overlay.remove();
    window.close(); // Hard exit
  });

  document.getElementById('later-btn')?.addEventListener('click', () => {
    overlay.remove();
  });
}

async function relayWinSecure(amount: number) {
  try {
    const userId = await getUserId();
    await fetch(`${EXT_CONFIG.HUB_URL}/telemetry/win-secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, userId })
    });
  } catch (err) {
    console.warn('[TiltCheck] Win secure relay failed:', err);
  }
}

// Initialize on load
if (!isExcludedDomain) {
  initialize();
}

console.log('[TiltGuard] Content script loaded');
