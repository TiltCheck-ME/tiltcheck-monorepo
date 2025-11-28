// TiltCheck Content Script - Monitors tiltcheck.me for live gameplay stats

let gameplayData = {
  currentBalance: 0,
  totalWagered: 0,
  totalWon: 0,
  totalLost: 0,
  winRate: 0,
  sessionTime: 0,
  currentStreak: 0,
  biggestWin: 0,
  biggestLoss: 0,
  lastUpdate: Date.now()
};

let casinoInfo = {
  name: '',
  license: '',
  licenseVerified: false,
  regulator: '',
  fairnessProof: false
};

let tiltNotifications = [];

// Check if we're on tiltcheck.me
const isTiltCheckSite = window.location.hostname.includes('tiltcheck.me');

// Extract gameplay stats from tiltcheck.me page
function extractGameplayStats() {
  if (!isTiltCheckSite) return null;

  try {
    // Look for balance indicators
    const balanceEl = document.querySelector('[data-balance], .balance, #balance, [class*="balance"]');
    if (balanceEl) {
      gameplayData.currentBalance = parseFloat(balanceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
    }

    // Look for wagered amount
    const wageredEl = document.querySelector('[data-wagered], .wagered, [class*="wagered"]');
    if (wageredEl) {
      const newWagered = parseFloat(wageredEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      if (newWagered > gameplayData.totalWagered) {
        // Log delta wager event
        chrome.runtime.sendMessage({
          action: 'enqueueGameplayEvent',
          event: { type: 'wager', amount: newWagered - gameplayData.totalWagered, balance: gameplayData.currentBalance }
        });
      }
      gameplayData.totalWagered = newWagered;
    }

    // Look for wins/losses
    const wonEl = document.querySelector('[data-won], .total-won, [class*="total-won"]');
    if (wonEl) {
      const newWon = parseFloat(wonEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      if (newWon > gameplayData.totalWon) {
        chrome.runtime.sendMessage({
          action: 'enqueueGameplayEvent',
          event: { type: 'win', amount: newWon - gameplayData.totalWon, balance: gameplayData.currentBalance }
        });
        gameplayData.currentStreak++;
        gameplayData.biggestWin = Math.max(gameplayData.biggestWin, newWon - gameplayData.totalWon);
      }
      gameplayData.totalWon = newWon;
    }

    const lostEl = document.querySelector('[data-lost], .total-lost, [class*="total-lost"]');
    if (lostEl) {
      const newLost = parseFloat(lostEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      if (newLost > gameplayData.totalLost) {
        chrome.runtime.sendMessage({
          action: 'enqueueGameplayEvent',
          event: { type: 'loss', amount: newLost - gameplayData.totalLost, balance: gameplayData.currentBalance }
        });
        gameplayData.currentStreak = 0; // reset streak on loss
        gameplayData.biggestLoss = Math.max(gameplayData.biggestLoss, newLost - gameplayData.totalLost);
      }
      gameplayData.totalLost = newLost;
    }

    // Calculate win rate
    if (gameplayData.totalWagered > 0) {
      gameplayData.winRate = ((gameplayData.totalWon / gameplayData.totalWagered) * 100).toFixed(2);
    }

    gameplayData.lastUpdate = Date.now();
    // Balance change logging
    if (gameplayData.currentBalance !== undefined) {
      if (typeof extractGameplayStats.lastBalance === 'number' && gameplayData.currentBalance !== extractGameplayStats.lastBalance) {
        chrome.runtime.sendMessage({
          action: 'enqueueGameplayEvent',
          event: { type: 'balance_update', balance: gameplayData.currentBalance }
        });
      }
      extractGameplayStats.lastBalance = gameplayData.currentBalance;
    }
    
    return gameplayData;
  } catch (error) {
    console.error('TiltCheck: Error extracting gameplay stats', error);
    return null;
  }
}

// Extract casino license verification info
function extractCasinoInfo() {
  if (!isTiltCheckSite) return null;

  try {
    // Look for casino name
    const nameEl = document.querySelector('[data-casino-name], .casino-name, h1');
    if (nameEl) {
      casinoInfo.name = nameEl.textContent.trim();
    }

    // Look for license info
    const licenseEl = document.querySelector('[data-license], .license, [class*="license"]');
    if (licenseEl) {
      casinoInfo.license = licenseEl.textContent.trim();
      casinoInfo.licenseVerified = licenseEl.classList.contains('verified') || 
                                   licenseEl.hasAttribute('data-verified');
    }

    // Look for regulator
    const regulatorEl = document.querySelector('[data-regulator], .regulator, [class*="regulator"]');
    if (regulatorEl) {
      casinoInfo.regulator = regulatorEl.textContent.trim();
    }

    // Check for provably fair badge
    const fairnessEl = document.querySelector('[data-provably-fair], .provably-fair, [class*="provably-fair"]');
    casinoInfo.fairnessProof = !!fairnessEl;

    return casinoInfo;
  } catch (error) {
    console.error('TiltCheck: Error extracting casino info', error);
    return null;
  }
}

// Monitor for tilt engine notifications
function checkTiltStatus() {
  if (!isTiltCheckSite) return;

  try {
    // Check for rapid losses (potential tilt)
    if (gameplayData.totalLost > gameplayData.totalWon * 2 && gameplayData.totalWagered > 100) {
      addTiltNotification('warning', 'Loss Detected', `You're down ${(gameplayData.totalLost - gameplayData.totalWon).toFixed(2)}. Consider taking a break.`);
    }

    // Check for win streaks (stay cautious)
    if (gameplayData.currentStreak > 5) {
      addTiltNotification('info', 'Hot Streak', `${gameplayData.currentStreak} wins in a row! Stay disciplined.`);
    }

    // Check session time (prevent long sessions)
    if (gameplayData.sessionTime > 120) { // 2 hours
      addTiltNotification('alert', 'Long Session', 'You\'ve been playing for over 2 hours. Time for a break?');
    }
  } catch (error) {
    console.error('TiltCheck: Error checking tilt status', error);
  }
}

function addTiltNotification(type, title, message) {
  const notification = {
    id: Date.now(),
    type, // 'info', 'warning', 'alert'
    title,
    message,
    timestamp: new Date().toLocaleTimeString()
  };
  
  tiltNotifications.unshift(notification);
  if (tiltNotifications.length > 10) tiltNotifications.pop();
  
  // Send to background for badge update
  chrome.runtime.sendMessage({
    action: 'tiltAlert',
    type,
    title
  });
}

// Listen for messages from sidebar/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getGameplayStats') {
    const stats = extractGameplayStats();
    sendResponse({ stats: stats || gameplayData, isTiltCheckSite });
  }
  
  if (request.action === 'getCasinoInfo') {
    const info = extractCasinoInfo();
    sendResponse({ info: info || casinoInfo, isTiltCheckSite });
  }
  
  if (request.action === 'getTiltNotifications') {
    sendResponse({ notifications: tiltNotifications, isTiltCheckSite });
  }
  
  if (request.action === 'getAllData') {
    const stats = extractGameplayStats();
    const info = extractCasinoInfo();
    sendResponse({ 
      stats: stats || gameplayData, 
      info: info || casinoInfo, 
      notifications: tiltNotifications,
      isTiltCheckSite 
    });
  }
  
  return true; // Async response
});

// Monitor DOM changes for real-time updates
if (isTiltCheckSite) {
  const observer = new MutationObserver(() => {
    extractGameplayStats();
    extractCasinoInfo();
    checkTiltStatus();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Periodic updates every 2 seconds
  setInterval(() => {
    extractGameplayStats();
    checkTiltStatus();
  }, 2000);
}

// Initial extraction on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    extractGameplayStats();
    extractCasinoInfo();
  });
} else {
  extractGameplayStats();
  extractCasinoInfo();
}
