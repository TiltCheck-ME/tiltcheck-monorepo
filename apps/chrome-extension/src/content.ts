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

/**
 * Check if hostname matches a domain (handles subdomains correctly)
 */
function isDomain(hostname: string, domain: string): boolean {
  // Exact match or subdomain match (e.g., "www.discord.com" matches "discord.com")
  return hostname === domain || hostname.endsWith('.' + domain);
}

// Early exit if on Discord or localhost API - BEFORE any imports or code runs
const hostname = window.location.hostname.toLowerCase();
const isExcludedDomain = 
  isDomain(hostname, 'discord.com') ||
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

// Intervention state
let cooldownEndTime: number | null = null;
const interventionQueue: any[] = [];

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
  } catch (_error) {
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
          resolve(result.tiltguard_user_id);
        } else {
          // Generate new user ID
          const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          chrome.storage.local.set({ tiltguard_user_id: newId });
          resolve(newId);
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

// Initialize on load
initialize();

console.log('[TiltGuard] Content script loaded');
