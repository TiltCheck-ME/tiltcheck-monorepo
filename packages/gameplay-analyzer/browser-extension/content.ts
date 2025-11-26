/**
 * Content script - Runs on casino pages to extract gameplay data
 */

// Import the extractor (will be bundled)
import { CasinoDataExtractor, AnalyzerClient } from '../src/extractor.js';

// Configuration
const ANALYZER_WS_URL = 'ws://localhost:7071';

// Initialize
let extractor: CasinoDataExtractor | null = null;
let client: AnalyzerClient | null = null;
let sessionId: string | null = null;
let stopObserving: (() => void) | null = null;

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get user ID from storage or generate
 */
async function getUserId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userId'], (result) => {
      if (result.userId) {
        resolve(result.userId);
      } else {
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        chrome.storage.local.set({ userId }, () => resolve(userId));
      }
    });
  });
}

/**
 * Start analyzing gameplay
 */
async function startAnalysis(): Promise<void> {
  console.log('[TiltCheck] Starting gameplay analysis...');
  
  // Initialize extractor
  extractor = new CasinoDataExtractor();
  
  // Initialize WebSocket client
  client = new AnalyzerClient(ANALYZER_WS_URL);
  
  try {
    await client.connect();
    console.log('[TiltCheck] Connected to analyzer backend');
  } catch (error) {
    console.error('[TiltCheck] Failed to connect to analyzer:', error);
    showNotification('TiltCheck: Failed to connect to analyzer backend', 'error');
    return;
  }
  
  // Get user ID
  const userId = await getUserId();
  
  // Generate session ID
  sessionId = generateSessionId();
  
  // Detect casino and game
  const casinoId = detectCasinoId();
  const gameId = detectGameId();
  
  console.log('[TiltCheck] Session started:', { sessionId, userId, casinoId, gameId });
  
  // Start observing DOM
  stopObserving = extractor.startObserving((spinData) => {
    if (!spinData || !client || !sessionId) return;
    
    console.log('[TiltCheck] Spin detected:', spinData);
    
    // Send to analyzer
    client.sendSpin({
      sessionId,
      casinoId,
      gameId,
      userId,
      bet: spinData.bet || 0,
      payout: spinData.win || 0,
      symbols: spinData.symbols || undefined,
      bonusRound: spinData.bonusActive,
      freeSpins: (spinData.freeSpins || 0) > 0
    });
    
    // Show notification for big wins
    if (spinData.win && spinData.bet && spinData.win > spinData.bet * 20) {
      showNotification(`Big Win! ${spinData.win.toFixed(2)} (${(spinData.win / spinData.bet).toFixed(1)}x)`, 'success');
    }
  });
  
  showNotification('TiltCheck: Analysis started', 'success');
  
  // Update badge
  chrome.runtime.sendMessage({ type: 'update_badge', text: 'ON', color: '#00ff00' });
}

/**
 * Stop analyzing gameplay
 */
function stopAnalysis(): void {
  console.log('[TiltCheck] Stopping gameplay analysis...');
  
  if (stopObserving) {
    stopObserving();
    stopObserving = null;
  }
  
  if (client) {
    client.disconnect();
    client = null;
  }
  
  showNotification('TiltCheck: Analysis stopped', 'info');
  
  // Update badge
  chrome.runtime.sendMessage({ type: 'update_badge', text: '', color: '#cccccc' });
}

/**
 * Detect casino from URL
 */
function detectCasinoId(): string {
  const hostname = window.location.hostname;
  
  if (hostname.includes('stake.com')) return 'stake';
  if (hostname.includes('roobet.com')) return 'roobet';
  if (hostname.includes('bc.game')) return 'bc-game';
  if (hostname.includes('duelbits.com')) return 'duelbits';
  
  return 'unknown';
}

/**
 * Detect game from URL/DOM
 */
function detectGameId(): string {
  // Try URL path
  const path = window.location.pathname;
  const pathParts = path.split('/');
  
  if (pathParts.length > 2) {
    return pathParts[pathParts.length - 1] || 'unknown';
  }
  
  // Try DOM (game title)
  if (extractor) {
    const gameTitle = extractor.extractGameTitle();
    if (gameTitle) return gameTitle.toLowerCase().replace(/\s+/g, '-');
  }
  
  return 'unknown';
}

/**
 * Show notification overlay
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const notification = document.createElement('div');
  notification.className = `tiltcheck-notification tiltcheck-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#00ff00' : type === 'error' ? '#ff0000' : '#0088ff'};
    color: #000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    animation: tiltcheck-slide-in 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'tiltcheck-slide-out 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Add CSS animations
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes tiltcheck-slide-in {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes tiltcheck-slide-out {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

/**
 * Listen for messages from popup/background
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TiltCheck] Message received:', message);
  
  switch (message.type) {
    case 'start_analysis':
      startAnalysis();
      sendResponse({ success: true });
      break;
    
    case 'stop_analysis':
      stopAnalysis();
      sendResponse({ success: true });
      break;
    
    case 'get_status':
      sendResponse({
        isActive: stopObserving !== null,
        sessionId,
        casinoId: detectCasinoId(),
        gameId: detectGameId()
      });
      break;
    
    case 'request_report':
      if (client && sessionId) {
        client.requestReport(sessionId).then(report => {
          sendResponse({ report });
        }).catch(error => {
          sendResponse({ error: error.message });
        });
        return true; // Async response
      } else {
        sendResponse({ error: 'No active session' });
      }
      break;
    
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Auto-start if enabled in settings
chrome.storage.local.get(['autoStart'], (result) => {
  if (result.autoStart) {
    console.log('[TiltCheck] Auto-starting analysis...');
    startAnalysis();
  }
});

console.log('[TiltCheck] Content script loaded');
