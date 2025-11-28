// TiltCheck Sidebar Panel - Live tiltcheck.me Stats

const API_BASE = 'https://tiltcheck.me/api'; // TiltCheck API

let gameplayStats = {};
let casinoInfo = {};
let tiltNotifications = [];
let isTiltCheckSite = false;

// Fetch live data from content script
async function fetchLiveData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  chrome.tabs.sendMessage(tab.id, { action: 'getAllData' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Not on tiltcheck.me or data unavailable');
      showNotOnTiltCheckMessage();
      return;
    }

    if (response) {
      isTiltCheckSite = response.isTiltCheckSite;
      gameplayStats = response.stats || {};
      casinoInfo = response.info || {};
      tiltNotifications = response.notifications || [];
      
      updateAllUI();
    }
  });
}

// Update all UI elements
function updateAllUI() {
  if (!isTiltCheckSite) {
    showNotOnTiltCheckMessage();
    return;
  }

  updateGameplayStatsUI();
  updateCasinoInfoUI();
  updateNotificationsUI();
  document.getElementById('current-url').textContent = 'tiltcheck.me';
}

// Update gameplay stats section
function updateGameplayStatsUI() {
  const scanStatus = document.getElementById('scan-status');
  const trustScore = document.getElementById('trust-score');
  const trustLabel = document.getElementById('trust-label');
  
  // Show balance as trust score
  if (gameplayStats.currentBalance !== undefined) {
    trustScore.textContent = `$${gameplayStats.currentBalance.toFixed(2)}`;
    trustLabel.textContent = 'Current Balance';
    scanStatus.textContent = `Win Rate: ${gameplayStats.winRate || 0}%`;
    scanStatus.className = 'scan-status safe';
  }

  // Update stats
  document.getElementById('stat-scanned').textContent = gameplayStats.totalWagered?.toFixed(0) || 0;
  document.querySelector('#stat-scanned + .stat-label').textContent = 'WAGERED';
  
  document.getElementById('stat-blocked').textContent = gameplayStats.totalWon?.toFixed(0) || 0;
  document.querySelector('#stat-blocked + .stat-label').textContent = 'WON';
}

// Update casino license verification UI
function updateCasinoInfoUI() {
  const container = document.getElementById('links-detected');
  
  if (!casinoInfo.name) {
    container.innerHTML = '<div class="empty-state">Loading casino info...</div>';
    return;
  }

  const verifiedBadge = casinoInfo.licenseVerified 
    ? '<span style="color: #00d4aa;">✓ Verified</span>' 
    : '<span style="color: #ffc107;">⚠ Unverified</span>';

  const fairnessBadge = casinoInfo.fairnessProof
    ? '<span style="color: #00d4aa;">✓ Provably Fair</span>'
    : '<span style="color: #666;">No Proof</span>';

  container.innerHTML = `
    <div class="link-item" style="background: #1a1a1a; padding: 12px; margin-bottom: 8px;">
      <strong style="color: #00d4aa;">${casinoInfo.name || 'Unknown Casino'}</strong>
    </div>
    <div class="link-item">
      <strong>License:</strong> ${casinoInfo.license || 'N/A'}<br>
      <strong>Status:</strong> ${verifiedBadge}
    </div>
    <div class="link-item">
      <strong>Regulator:</strong> ${casinoInfo.regulator || 'Unknown'}<br>
      <strong>Fairness:</strong> ${fairnessBadge}
    </div>
  `;
}

// Update tilt engine notifications
function updateNotificationsUI() {
  const container = document.getElementById('tilt-notifications');
  const notifSection = document.querySelector('.section h2');
  
  // Update count in header
  const headers = document.querySelectorAll('.section h2');
  headers.forEach(h => {
    if (h.textContent.includes('🚨')) {
      h.textContent = `🚨 Tilt Alerts (${tiltNotifications.length})`;
    }
  });
  
  if (tiltNotifications.length === 0) {
    container.innerHTML = '<div class="empty-state">No alerts yet</div>';
    return;
  }

  container.innerHTML = tiltNotifications
    .slice(0, 5)
    .map(notif => {
      const color = notif.type === 'alert' ? '#ff4444' : 
                    notif.type === 'warning' ? '#ffc107' : '#00d4aa';
      return `
        <div class="link-item" style="border-left: 3px solid ${color};">
          <strong style="color: ${color};">${notif.title}</strong><br>
          <span style="font-size: 0.8rem;">${notif.message}</span><br>
          <span style="font-size: 0.7rem; color: #666;">${notif.timestamp}</span>
        </div>
      `;
    })
    .join('');
}

// Show message when not on tiltcheck.me
function showNotOnTiltCheckMessage() {
  document.getElementById('current-url').textContent = 'Not on tiltcheck.me';
  document.getElementById('scan-status').textContent = 'Navigate to tiltcheck.me to see live stats';
  document.getElementById('scan-status').className = 'scan-status warning';
  document.getElementById('trust-score').textContent = '--';
  document.getElementById('trust-label').textContent = 'No Data';
  
  document.getElementById('links-detected').innerHTML = 
    '<div class="empty-state">Visit tiltcheck.me to monitor gameplay</div>';
}

// Refresh live data
document.getElementById('scan-page-btn').addEventListener('click', () => {
  fetchLiveData();
});

// Open tiltcheck.me dashboard
document.getElementById('view-dashboard-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://tiltcheck.me/dashboard' });
});

// Initialize and start live updates
fetchLiveData();
setInterval(fetchLiveData, 3000); // Refresh every 3 seconds

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    fetchLiveData();
  }
});

chrome.tabs.onActivated.addListener(() => {
  fetchLiveData();
});
