/**
 * Enhanced Content Script - TiltGuard + License Verification
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

// Early exit if on Discord or localhost API - BEFORE any imports or code runs
const hostname = window.location.hostname;
const isExcludedDomain = 
  hostname.includes('discord.com') ||
  (hostname === 'localhost' && window.location.port === '3333');

if (isExcludedDomain) {
  console.log('[TiltGuard] Skipping - excluded domain:', hostname);
  // Exit immediately - don't load anything
  throw new Error('TiltGuard: Excluded domain');
}

// Only import and run on allowed casino sites
import { CasinoDataExtractor, AnalyzerClient } from './extractor.js';
import { TiltDetector } from './tilt-detector.js';
import { CasinoLicenseVerifier } from './license-verifier.js';
import './sidebar.js';

// Configuration
const ANALYZER_WS_URL = 'ws://localhost:7071';

// State
let extractor: CasinoDataExtractor | null = null;
let tiltDetector: TiltDetector | null = null;
let licenseVerifier: CasinoLicenseVerifier | null = null;
let client: AnalyzerClient | null = null;
let sessionId: string | null = null;
let stopObserving: (() => void) | null = null;
let isMonitoring = false;
let casinoVerification: any = null;

// Intervention state
let cooldownEndTime: number | null = null;
let interventionQueue: any[] = [];

/**
 * Initialize on page load
 */
function initialize() {
  console.log('[TiltGuard] Initializing on:', window.location.hostname);
  
  // Create sidebar UI
  const sidebar = (window as any).TiltGuardSidebar?.create();
  console.log('[TiltGuard] Sidebar created:', !!sidebar);
  
  // Check casino license
  licenseVerifier = new CasinoLicenseVerifier();
  casinoVerification = licenseVerifier.verifyCasino();
  
  console.log('[TiltGuard] License verification:', casinoVerification);
  
  // Update sidebar with license info
  (window as any).TiltGuardSidebar?.updateLicense(casinoVerification);
  
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
  
  console.log('[TiltGuard] Starting monitoring...');
  
  // Update UI
  (window as any).TiltGuardSidebar?.updateGuardian(true);
  isMonitoring = true;
  
  // Get initial balance
  extractor = new CasinoDataExtractor();
  const initialBalance = extractor.extractBalance() || 100; // Default if can't extract
  
  console.log('[TiltGuard] Initial balance:', initialBalance);
  
  // Initialize tilt detector
  tiltDetector = new TiltDetector(initialBalance);
  
  // Initialize analyzer client
  client = new AnalyzerClient(ANALYZER_WS_URL);
  
  try {
    await client.connect();
    console.log('[TiltGuard] Connected to analyzer server');
  } catch (error) {
    console.log('[TiltGuard] Analyzer backend offline - tilt monitoring only');
  }
  
  // Generate session ID
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    
    handleSpinEvent(spinData, { sessionId: sessionId!, userId, casinoId, gameId });
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
function handleSpinEvent(spinData: any, session: any) {
  const bet = spinData.bet || 0;
  const payout = spinData.win || 0;
  
  // Record in tilt detector
  if (tiltDetector) {
    tiltDetector.recordBet(bet, payout);
    
    // Update sidebar stats
    const stats = {
      startTime: Date.now() - (tiltDetector as any).sessionStartTime || Date.now(),
      totalBets: (tiltDetector as any).bets?.length || 0,
      totalWagered: (tiltDetector as any).totalWagered || 0,
      totalWins: (tiltDetector as any).totalWagered + (payout - bet) || 0
    };
    (window as any).TiltGuardSidebar?.updateStats(stats);
    
    // Check for tilt immediately after bet
    const tiltSigns = tiltDetector.detectAllTiltSigns();
    const tiltRisk = tiltDetector.getTiltRiskScore();
    const indicators = tiltSigns.map(sign => sign.message);
    
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
      symbols: spinData.symbols,
      bonusRound: spinData.bonusActive,
      freeSpins: (spinData.freeSpins || 0) > 0
    });
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
    const indicators = tiltSigns.map(sign => sign.message);
    
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
  overlay.id = 'tiltguard-cooldown-overlay';
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
  const overlay = document.getElementById('tiltguard-cooldown-overlay');
  if (overlay) overlay.remove();
}

/**
 * Show vault prompt
 */
function showVaultPrompt(vaultData: any) {
  const message = `💰 Your balance is ${vaultData.suggestedAmount.toFixed(2)}. Consider vaulting to protect your winnings.`;
  showInteractiveNotification(message, [
    { text: 'Vault Now', action: () => openVaultInterface(vaultData.suggestedAmount) },
    { text: 'Later', action: () => {} }
  ]);
}

/**
 * Show spending reminder
 */
function showSpendingReminder(comparison: any) {
  showInteractiveNotification(comparison.message, [
    { text: 'Vault & Buy', action: () => openVaultInterface(comparison.cost) },
    { text: 'Remind Me Later', action: () => {} }
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
      { text: 'Continue', action: () => {} }
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
      { text: 'Keep Playing', action: () => {} }
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
  // TODO: Integrate with LockVault module
  chrome.runtime.sendMessage({
    type: 'open_vault',
    data: { suggestedAmount: amount }
  });
}

/**
 * Show persistent warning
 */
function showPersistentWarning(message: string) {
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

// Initialize on load
initialize();

console.log('[TiltGuard] Content script loaded');
