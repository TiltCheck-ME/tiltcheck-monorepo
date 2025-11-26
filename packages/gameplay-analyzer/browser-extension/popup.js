/**
 * Popup script for browser extension
 */

let currentSessionId = null;
let updateInterval = null;

// Get elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const casinoId = document.getElementById('casinoId');
const gameId = document.getElementById('gameId');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const reportBtn = document.getElementById('reportBtn');
const statsSection = document.getElementById('statsSection');
const totalSpins = document.getElementById('totalSpins');
const totalWagered = document.getElementById('totalWagered');
const totalWon = document.getElementById('totalWon');
const rtp = document.getElementById('rtp');
const verdict = document.getElementById('verdict');
const autoStartToggle = document.getElementById('autoStartToggle');

/**
 * Send message to content script
 */
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          resolve(response || { error: 'No response' });
        });
      } else {
        resolve({ error: 'No active tab' });
      }
    });
  });
}

/**
 * Update UI based on status
 */
async function updateStatus() {
  const status = await sendMessage({ type: 'get_status' });
  
  if (status.error) {
    statusText.textContent = 'Not on casino site';
    statusDot.classList.remove('active');
    return;
  }
  
  if (status.isActive) {
    statusText.textContent = 'Analyzing...';
    statusDot.classList.add('active');
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    reportBtn.disabled = false;
    statsSection.classList.remove('hidden');
    currentSessionId = status.sessionId;
  } else {
    statusText.textContent = 'Ready';
    statusDot.classList.remove('active');
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    reportBtn.disabled = true;
    statsSection.classList.add('hidden');
    currentSessionId = null;
  }
  
  casinoId.textContent = status.casinoId || '-';
  gameId.textContent = status.gameId || '-';
}

/**
 * Start analysis
 */
async function startAnalysis() {
  const result = await sendMessage({ type: 'start_analysis' });
  
  if (result.success) {
    await updateStatus();
    startStatsUpdate();
  } else {
    alert('Failed to start analysis: ' + (result.error || 'Unknown error'));
  }
}

/**
 * Stop analysis
 */
async function stopAnalysis() {
  const result = await sendMessage({ type: 'stop_analysis' });
  
  if (result.success) {
    await updateStatus();
    stopStatsUpdate();
  }
}

/**
 * View fairness report
 */
async function viewReport() {
  const result = await sendMessage({ type: 'request_report' });
  
  if (result.error) {
    alert('Failed to get report: ' + result.error);
    return;
  }
  
  const report = result.report;
  
  // Update stats
  if (report.sessionStats) {
    totalSpins.textContent = report.sessionStats.totalSpins || 0;
    totalWagered.textContent = `$${(report.sessionStats.totalWagered || 0).toFixed(2)}`;
    totalWon.textContent = `$${(report.sessionStats.totalWon || 0).toFixed(2)}`;
    rtp.textContent = `${(report.sessionStats.actualRTP || 0).toFixed(2)}%`;
    
    // Color code RTP
    const rtpValue = report.sessionStats.actualRTP || 0;
    if (rtpValue < 90) {
      rtp.classList.add('danger');
      rtp.classList.remove('warning');
    } else if (rtpValue < 95) {
      rtp.classList.add('warning');
      rtp.classList.remove('danger');
    } else {
      rtp.classList.remove('danger', 'warning');
    }
  }
  
  // Update verdict
  if (report.verdict) {
    verdict.textContent = report.verdict.toUpperCase();
    verdict.className = 'stat-value';
    
    if (report.verdict === 'rigged' || report.verdict === 'unfair') {
      verdict.classList.add('danger');
    } else if (report.verdict === 'suspicious') {
      verdict.classList.add('warning');
    }
  }
  
  // Show detailed report in alert (TODO: better UI)
  if (report.recommendations && report.recommendations.length > 0) {
    alert('Report:\n\n' + report.recommendations.join('\n\n'));
  }
}

/**
 * Start periodic stats update
 */
function startStatsUpdate() {
  if (updateInterval) clearInterval(updateInterval);
  
  updateInterval = setInterval(async () => {
    if (currentSessionId) {
      await viewReport();
    }
  }, 5000); // Update every 5 seconds
}

/**
 * Stop stats update
 */
function stopStatsUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

/**
 * Toggle auto-start
 */
function toggleAutoStart() {
  const enabled = autoStartToggle.checked;
  chrome.storage.local.set({ autoStart: enabled });
}

// Event listeners
startBtn.addEventListener('click', startAnalysis);
stopBtn.addEventListener('click', stopAnalysis);
reportBtn.addEventListener('click', viewReport);
autoStartToggle.addEventListener('change', toggleAutoStart);

// Load settings
chrome.storage.local.get(['autoStart'], (result) => {
  autoStartToggle.checked = result.autoStart || false;
});

// Initial status update
updateStatus();

// Update status every 2 seconds
setInterval(updateStatus, 2000);
