// TiltCheck Popup - Live Gameplay Monitor

let gameplayStats = {};
let previousBalance = 0;
let sessionStartTime = Date.now();
let updateInterval;
let supabaseSession = null;

// Load API helpers
const apiScript = document.createElement('script');
apiScript.src = 'api.js';
document.head.appendChild(apiScript);

apiScript.onload = () => {
  // After api.js loads try to read session
  chrome.storage.local.get(['supabaseSession'], data => {
    supabaseSession = data.supabaseSession || null;
    updateAuthUI();
  });
};

// Fetch live gameplay data
async function fetchGameplayData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  chrome.tabs.sendMessage(tab.id, { action: 'getAllData' }, (response) => {
    if (chrome.runtime.lastError) {
      showInactiveState();
      return;
    }

    if (response && response.isTiltCheckSite) {
      gameplayStats = response.stats || {};
      updateUI();
      checkTiltStatus(response.notifications || []);
    } else {
      showInactiveState();
    }
  });
}

// Update all UI elements
function updateUI() {
  const balance = gameplayStats.currentBalance || 0;
  const wagered = gameplayStats.totalWagered || 0;
  const won = gameplayStats.totalWon || 0;
  const lost = gameplayStats.totalLost || 0;
  const winRate = gameplayStats.winRate || 0;
  const net = won - lost;

  // Status
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Live on tiltcheck.me';
  statusEl.className = 'status-text active';

  // Balance
  document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
  
  // Balance change
  const changeEl = document.getElementById('balance-change');
  if (previousBalance > 0) {
    const change = balance - previousBalance;
    if (change > 0) {
      changeEl.textContent = `+$${change.toFixed(2)}`;
      changeEl.className = 'balance-change positive';
    } else if (change < 0) {
      changeEl.textContent = `-$${Math.abs(change).toFixed(2)}`;
      changeEl.className = 'balance-change negative';
    } else {
      changeEl.textContent = 'No change';
      changeEl.className = 'balance-change';
    }
  } else {
    changeEl.textContent = 'Session start';
    changeEl.className = 'balance-change';
  }
  previousBalance = balance;

  // Stats
  document.getElementById('wagered').textContent = `$${wagered.toFixed(0)}`;
  document.getElementById('won').textContent = `$${won.toFixed(0)}`;
  document.getElementById('winrate').textContent = `${winRate}%`;
  
  const netEl = document.getElementById('net');
  netEl.textContent = `$${net.toFixed(2)}`;
  netEl.style.color = net >= 0 ? '#00d4aa' : '#ff4444';

  // Session time
  const sessionMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);
  document.getElementById('session-time').textContent = `Session: ${sessionMinutes}m`;
}

// Check and display tilt warnings
function checkTiltStatus(notifications) {
  const alertBox = document.getElementById('tilt-alert');
  const titleEl = document.getElementById('tilt-title');
  const messageEl = document.getElementById('tilt-message');

  // Get latest critical notification
  const criticalNotif = notifications.find(n => n.type === 'alert' || n.type === 'warning');
  
  if (criticalNotif) {
    alertBox.className = `tilt-alert active ${criticalNotif.type}`;
    titleEl.textContent = criticalNotif.title;
    messageEl.textContent = criticalNotif.message;
  } else {
    // Check manual conditions
    const net = (gameplayStats.totalWon || 0) - (gameplayStats.totalLost || 0);
    const wagered = gameplayStats.totalWagered || 0;
    
    if (net < -100 && wagered > 100) {
      alertBox.className = 'tilt-alert active danger';
      titleEl.textContent = '🚨 Heavy Losses Detected';
      messageEl.textContent = `You're down $${Math.abs(net).toFixed(2)}. Consider stopping for today.`;
    } else if (net < -50 && wagered > 50) {
      alertBox.className = 'tilt-alert active warning';
      titleEl.textContent = '⚠️ Caution Advised';
      messageEl.textContent = 'You\'re on a losing streak. Take a break and reassess.';
    } else {
      alertBox.className = 'tilt-alert';
    }
  }
}

// Show inactive state
function showInactiveState() {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Not on tiltcheck.me';
  statusEl.className = 'status-text inactive';
  
  document.getElementById('balance').textContent = '$0.00';
  document.getElementById('balance-change').textContent = 'Visit tiltcheck.me';
  document.getElementById('wagered').textContent = '$0';
  document.getElementById('won').textContent = '$0';
  document.getElementById('winrate').textContent = '0%';
  document.getElementById('net').textContent = '$0';
  document.getElementById('tilt-alert').className = 'tilt-alert';
}

// --- Auth UI ---
function updateAuthUI() {
  const loginBtn = document.getElementById('login-btn');
  if (!loginBtn) return;
  if (supabaseSession?.access_token) {
    loginBtn.textContent = 'Logged In';
    loginBtn.disabled = true;
  } else {
    loginBtn.textContent = 'Login with Discord';
    loginBtn.disabled = false;
  }
}

async function performLogin() {
  if (!window.TiltAPI) return;
  try {
    const session = await window.TiltAPI.startDiscordLogin();
    supabaseSession = session;
    updateAuthUI();
    chrome.runtime.sendMessage({ action: 'supabaseLoggedIn' });
  } catch (e) {
    console.error('Login failed', e);
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.textContent = 'Retry Login';
  }
}

document.addEventListener('click', e => {
  if (e.target && e.target.id === 'login-btn') {
    performLogin();
  }
});

// Button handlers
document.getElementById('refresh-stats').addEventListener('click', () => {
  fetchGameplayData();
});

document.getElementById('open-sidebar').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.sidePanel.open({ tabId: tab.id });
});

// Initialize
fetchGameplayData();

// Auto-refresh every 2 seconds
updateInterval = setInterval(fetchGameplayData, 2000);

// Cleanup on close
window.addEventListener('unload', () => {
  if (updateInterval) clearInterval(updateInterval);
});
