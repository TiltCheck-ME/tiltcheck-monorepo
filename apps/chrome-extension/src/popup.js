/**
 * Popup script for TiltCheck Guardian browser extension
 * Updated to work with the new popup.html UI layout
 */

// AI Gateway URL - validated trusted domain
const AI_GATEWAY_URL = 'https://ai-gateway.tiltcheck.me';

// Trusted domain whitelist for AI Gateway
const TRUSTED_AI_DOMAINS = [
  'ai-gateway.tiltcheck.me',
  'api.tiltcheck.me',
  'localhost'
];

/**
 * Validate AI Gateway URL is from a trusted domain
 * @param {string} url - The URL to validate
 * @returns {boolean} - Whether the URL is from a trusted domain
 */
function isValidAIGatewayURL(url) {
  try {
    const parsedUrl = new URL(url);
    return TRUSTED_AI_DOMAINS.includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}

let currentSessionId = null;
let updateInterval = null;
let isMonitoring = false;

// DOM Elements - matching new popup.html structure
const licenseIcon = document.getElementById('licenseIcon');
const licenseTitle = document.getElementById('licenseTitle');
const licenseDetails = document.getElementById('licenseDetails');
const licenseWarning = document.getElementById('licenseWarning');
const tiltSection = document.getElementById('tiltSection');
const tiltScore = document.getElementById('tiltScore');
const tiltIndicators = document.getElementById('tiltIndicators');
const interventionBox = document.getElementById('interventionBox');
const interventionIcon = document.getElementById('interventionIcon');
const interventionMessage = document.getElementById('interventionMessage');
const interventionPrimary = document.getElementById('interventionPrimary');
const interventionSecondary = document.getElementById('interventionSecondary');
const sessionStats = document.getElementById('sessionStats');
const statDuration = document.getElementById('statDuration');
const statBets = document.getElementById('statBets');
const statProfit = document.getElementById('statProfit');
const statROI = document.getElementById('statROI');
const statRTP = document.getElementById('statRTP');
const statVerdict = document.getElementById('statVerdict');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const vaultBtn = document.getElementById('vaultBtn');
const reportBtn = document.getElementById('reportBtn');

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
 * Call AI Gateway for tilt detection
 */
async function callAIGateway(application, data) {
  const gatewayUrl = `${AI_GATEWAY_URL}/api/ai`;
  
  // Validate URL is from a trusted domain
  if (!isValidAIGatewayURL(gatewayUrl)) {
    console.error('[TiltGuard] Untrusted AI Gateway URL blocked');
    return { success: false, error: 'Untrusted AI Gateway URL' };
  }
  
  try {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application,
        prompt: data.prompt || '',
        context: data.context || {}
      })
    });
    
    if (response.ok) {
      return await response.json();
    }
    return { success: false, error: 'AI Gateway request failed' };
  } catch (error) {
    console.log('[TiltGuard] AI Gateway offline, using local analysis');
    return { success: false, error: error.message };
  }
}

/**
 * Update license verification display
 */
function updateLicenseDisplay(verification) {
  if (!verification) {
    licenseIcon.textContent = '🔍';
    licenseTitle.textContent = 'Checking license...';
    licenseDetails.textContent = '-';
    return;
  }

  if (verification.isLegitimate) {
    licenseIcon.textContent = '✅';
    licenseTitle.textContent = 'Licensed Casino';
    licenseDetails.textContent = verification.licenseInfo?.authority || 'Verified';
    licenseWarning.classList.add('hidden');
  } else {
    licenseIcon.textContent = '⚠️';
    licenseTitle.textContent = verification.verdict || 'Unlicensed';
    licenseDetails.textContent = 'Proceed with caution';
    licenseWarning.textContent = `⚠️ ${verification.reasoning || 'This casino may not be properly licensed'}`;
    licenseWarning.classList.remove('hidden');
  }
}

/**
 * Update tilt monitor display
 */
async function updateTiltDisplay(tiltData) {
  if (!tiltData) return;

  tiltSection.classList.remove('hidden');
  
  const score = tiltData.tiltRisk || tiltData.tiltScore || 0;
  tiltScore.textContent = `${Math.round(score)}/100`;
  
  // Color-code the tilt score
  tiltScore.className = 'tilt-score';
  if (score >= 60) {
    tiltScore.classList.add('danger');
  } else if (score >= 30) {
    tiltScore.classList.add('warning');
  }
  
  // Try AI Gateway for enhanced tilt detection
  const aiResult = await callAIGateway('tilt-detection', {
    context: {
      recentBets: tiltData.recentBets || [],
      sessionDuration: tiltData.sessionDuration || 0,
      losses: tiltData.losses || 0
    }
  });
  
  // Update indicators
  const indicators = aiResult.success 
    ? aiResult.data.indicators 
    : (tiltData.tiltSigns || []).map(s => s.message || s);
  
  tiltIndicators.innerHTML = indicators.map(indicator => {
    const severity = indicator.toLowerCase().includes('critical') ? 'critical' 
      : indicator.toLowerCase().includes('high') ? 'high'
      : indicator.toLowerCase().includes('medium') ? 'medium' 
      : 'low';
    return `
      <div class="tilt-indicator ${severity}">
        <div class="tilt-indicator-title">${indicator}</div>
      </div>
    `;
  }).join('');
  
  // Show intervention if AI recommends cooldown
  if (aiResult.success && aiResult.data.cooldownRecommended) {
    showIntervention({
      type: 'cooldown',
      message: aiResult.data.interventionSuggestions?.[0] || 'Consider taking a break',
      duration: aiResult.data.cooldownDuration || 300
    });
  }
}

/**
 * Show intervention UI
 */
function showIntervention(intervention) {
  interventionBox.classList.remove('hidden');
  
  if (intervention.type === 'cooldown' || intervention.severity === 'critical') {
    interventionBox.classList.add('critical');
    interventionIcon.textContent = '🛑';
  } else {
    interventionBox.classList.remove('critical');
    interventionIcon.textContent = '⚠️';
  }
  
  interventionMessage.textContent = intervention.message;
  
  interventionPrimary.textContent = intervention.primaryAction || 'Take Break';
  interventionPrimary.onclick = () => {
    sendMessage({ type: 'start_cooldown', duration: intervention.duration || 300000 });
    interventionBox.classList.add('hidden');
  };
  
  interventionSecondary.textContent = 'Dismiss';
  interventionSecondary.onclick = () => {
    interventionBox.classList.add('hidden');
  };
}

/**
 * Update session stats display
 */
function updateSessionStats(stats) {
  if (!stats) return;
  
  sessionStats.classList.remove('hidden');
  
  // Duration
  const duration = stats.duration || Math.floor((Date.now() - stats.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  statDuration.textContent = `${minutes}m`;
  
  // Bets
  statBets.textContent = stats.totalBets || 0;
  
  // Profit/Loss
  const profit = (stats.totalWon || 0) - (stats.totalWagered || 0);
  statProfit.textContent = `$${profit.toFixed(2)}`;
  statProfit.className = 'stat-value ' + (profit >= 0 ? '' : 'negative');
  
  // ROI
  const roi = stats.totalWagered > 0 
    ? ((profit / stats.totalWagered) * 100).toFixed(1) 
    : 0;
  statROI.textContent = `${roi}%`;
  statROI.className = 'stat-value ' + (roi >= 0 ? '' : 'negative');
  
  // RTP
  const rtp = stats.totalWagered > 0 
    ? ((stats.totalWon / stats.totalWagered) * 100).toFixed(1) 
    : 0;
  statRTP.textContent = `${rtp}%`;
  
  // Verdict
  if (rtp < 90) {
    statVerdict.textContent = 'COLD';
    statVerdict.className = 'stat-value negative';
  } else if (rtp > 100) {
    statVerdict.textContent = 'HOT';
    statVerdict.className = 'stat-value';
  } else {
    statVerdict.textContent = 'NORMAL';
    statVerdict.className = 'stat-value neutral';
  }
}

/**
 * Start Guardian monitoring
 */
async function startGuardian() {
  const result = await sendMessage({ type: 'start_analysis' });
  
  if (result.success || !result.error) {
    isMonitoring = true;
    currentSessionId = result.sessionId || `session_${Date.now()}`;
    
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    
    // Start periodic updates
    updateInterval = setInterval(refreshStatus, 3000);
    
    // Initial update
    await refreshStatus();
  } else {
    alert('Failed to start: ' + (result.error || 'Unknown error'));
  }
}

/**
 * Stop Guardian monitoring
 */
async function stopGuardian() {
  const result = await sendMessage({ type: 'stop_analysis' });
  
  isMonitoring = false;
  currentSessionId = null;
  
  startBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  // Hide dynamic sections
  tiltSection.classList.add('hidden');
  interventionBox.classList.add('hidden');
}

/**
 * Refresh status from content script
 */
async function refreshStatus() {
  // Get license verification
  const licenseResult = await sendMessage({ type: 'get_license_verification' });
  if (licenseResult && !licenseResult.error) {
    updateLicenseDisplay(licenseResult);
  }
  
  // Get tilt data
  const tiltResult = await sendMessage({ type: 'get_tilt_status' });
  if (tiltResult && !tiltResult.error) {
    await updateTiltDisplay(tiltResult);
  }
  
  // Get session stats
  const statsResult = await sendMessage({ type: 'get_session_stats' });
  if (statsResult && !statsResult.error) {
    updateSessionStats(statsResult);
  }
  
  // Check for interventions
  const interventionResult = await sendMessage({ type: 'get_pending_intervention' });
  if (interventionResult && interventionResult.intervention) {
    showIntervention(interventionResult.intervention);
  }
}

/**
 * Open vault interface
 */
function openVault() {
  chrome.tabs.create({ url: 'https://tiltcheck.me/vault' });
}

/**
 * View full report
 */
async function viewFullReport() {
  const result = await sendMessage({ type: 'request_report' });
  
  if (result.error) {
    alert('Failed to get report: ' + result.error);
    return;
  }
  
  // Open report in new tab or show in popup
  const reportData = JSON.stringify(result.report, null, 2);
  const blob = new Blob([reportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url });
}

// Event Listeners
if (startBtn) startBtn.addEventListener('click', startGuardian);
if (stopBtn) stopBtn.addEventListener('click', stopGuardian);
if (vaultBtn) vaultBtn.addEventListener('click', openVault);
if (reportBtn) reportBtn.addEventListener('click', viewFullReport);

// Initial status check
refreshStatus();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'license_verification':
      updateLicenseDisplay(message.data);
      break;
    case 'tilt_update':
      updateTiltDisplay(message.data);
      break;
    case 'intervention':
      showIntervention(message.data);
      break;
    case 'session_stats':
      updateSessionStats(message.data);
      break;
  }
  sendResponse({ received: true });
  return true;
});
