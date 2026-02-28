/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Popup script for TiltCheck browser extension
 * Updated to work with the new popup.html UI layout
 */

// Production endpoints — override with TILTCHECK_API_URL env at build time if needed
const API_BASE_URL = 'https://api.tiltcheck.me';
const AI_GATEWAY_URL = 'https://ai-gateway.tiltcheck.me';
const WEB_APP_URL = 'https://tiltcheck.me';

// Trusted domain whitelist for AI Gateway
const TRUSTED_AI_DOMAINS = [
  'ai-gateway.tiltcheck.me',
  'api.tiltcheck.me',
  'localhost',
  '127.0.0.1'
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

// Auth Elements
const authSection = document.getElementById('authSection');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar') as HTMLImageElement;
const userName = document.getElementById('userName');
const onboardingStatus = document.getElementById('onboardingStatus');
const loginBtn = document.getElementById('loginBtn');
const onboardingPrompt = document.getElementById('onboardingPrompt');
const finishSetupBtn = document.getElementById('finishSetupBtn');

// Configurator Elements
const configBtn = document.getElementById('configBtn');
const configPanel = document.getElementById('configPanel');
const cfgCancel = document.getElementById('cfgCancel');
const cfgSave = document.getElementById('cfgSave');
const cfgDomain = document.getElementById('cfgDomain') as HTMLInputElement;
const cfgBet = document.getElementById('cfgBet') as HTMLInputElement;
const cfgResult = document.getElementById('cfgResult') as HTMLInputElement;

// State
let authToken: string | null = null;
let userData: any = null;

/**
 * Initialize Authentication State
 */
async function initAuth() {
  const result = await chrome.storage.local.get(['authToken', 'userData']);
  if (result.authToken) {
    authToken = result.authToken as string;
    userData = result.userData;
    updateAuthUI();
    checkOnboardingStatus();
  }
}

/**
 * Update Auth UI based on state
 */
function updateAuthUI() {
  if (authToken && userData) {
    loginBtn.classList.add('hidden');
    userProfile.classList.remove('hidden');
    userName.textContent = userData.username || 'User';
    userAvatar.src = userData.avatar || '';

    // Check if Discord ID is missing and prompt for it
    if (!userData.discordId) {
      showDiscordIdInput();
    }
  } else {
    loginBtn.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
}

/**
 * Check Onboarding Status from API
 */
async function checkOnboardingStatus() {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/user/onboarding`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isOnboarded) {
        onboardingStatus.textContent = 'ONBOARDED';
        onboardingStatus.classList.add('complete');
        onboardingPrompt?.classList.add('hidden');
      } else {
        onboardingStatus.textContent = 'PENDING';
        onboardingStatus.classList.remove('complete');
        onboardingPrompt?.classList.remove('hidden');
      }

      // Sync risk level to extension settings
      if (data.riskLevel) {
        chrome.storage.local.set({ riskLevel: data.riskLevel });
      }
    }
  } catch (error) {
    console.error('[TiltGuard] Failed to fetch onboarding status:', error);
  }
}

/**
 * Show input to manually enter Discord ID
 */
function showDiscordIdInput() {
  const existing = document.getElementById('discord-id-container');
  if (existing) return;

  const container = document.createElement('div');
  container.id = 'discord-id-container';
  container.style.cssText = 'margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(251, 191, 36, 0.3);';
  
  container.innerHTML = `
    <div style="font-size: 11px; color: #fbbf24; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
      <span>⚠️</span> Missing Discord ID
    </div>
    <div style="display: flex; gap: 4px;">
      <input type="text" id="manual-discord-id" placeholder="Enter ID (e.g. 1234...)" style="flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #444; background: #222; color: white; font-size: 12px;">
      <button id="save-discord-id" style="padding: 6px 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">Save</button>
    </div>
  `;

  userProfile.appendChild(container);

  document.getElementById('save-discord-id')?.addEventListener('click', async () => {
    const input = document.getElementById('manual-discord-id') as HTMLInputElement;
    const id = input.value.trim();
    if (id) {
      // Update local state immediately
      userData.discordId = id;
      chrome.storage.local.set({ userData });
      
      // Attempt to sync to backend
      try {
        // This endpoint needs to exist in your API
        await fetch(`${API_BASE_URL}/user/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ discordId: id })
        });
        container.remove();
      } catch (e) {
        console.error('Failed to sync Discord ID to server', e);
        // Keep local change but maybe show error? For now just remove input as it's saved locally.
        container.remove();
      }
    }
  });
}

/**
 * Start Discord OAuth Login
 */
function startLogin() {
  const loginUrl = 'https://discord.com/oauth2/authorize?client_id=1445916179163250860&permissions=2252352254102592&response_type=code&redirect_uri=https%3A%2F%2Fapi.tiltcheck.me%2Fauth%2Fdiscord%2Fcallback&integration_type=0&scope=identify+email+bot+dm_channels.messages.read+messages.read+applications.store.update+dm_channels.read+presences.read+lobbies.write+applications.entitlements+applications.commands';
  window.open(loginUrl, 'TiltCheck Login', 'width=500,height=700');
}

/**
 * Redirect to dashboard onboarding
 */
function goToOnboarding() {
  chrome.tabs.create({ url: 'https://dashboard.tiltcheck.me/onboarding' });
}

// Listen for broadcast message from login window
window.addEventListener('message', (event) => {
  if (event.data?.type === 'discord-auth') {
    authToken = event.data.token;
    userData = event.data.user;

    chrome.storage.local.set({ authToken, userData }, () => {
      updateAuthUI();
      checkOnboardingStatus();
    });
  }
});

/**
 * Send message to content script
 */
function sendMessage(message: any): Promise<any> {
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
      duration: (aiResult.data.cooldownDuration || 300) * 1000
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
  statROI.className = 'stat-value ' + (Number(roi) >= 0 ? '' : 'negative');

  // RTP
  const rtp = stats.totalWagered > 0
    ? ((stats.totalWon / stats.totalWagered) * 100).toFixed(1)
    : 0;
  statRTP.textContent = `${rtp}%`;

  // Verdict
  if (Number(rtp) < 90) {
    statVerdict.textContent = 'COLD';
    statVerdict.className = 'stat-value negative';
  } else if (Number(rtp) > 100) {
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

/**
 * Configurator Logic
 */
function openConfigurator() {
  configPanel.classList.remove('hidden');

  // Auto-fill domain
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url) {
      const url = new URL(tabs[0].url);
      cfgDomain.value = url.hostname;
    }
  });
}

function closeConfigurator() {
  configPanel.classList.add('hidden');
}

async function testSelector(inputId) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const msgEl = document.getElementById(`msg-${inputId}`);
  const selector = input.value;

  if (!selector) {
    msgEl.textContent = 'Enter a selector';
    msgEl.className = 'validation-msg invalid';
    return;
  }

  msgEl.textContent = 'Testing...';
  msgEl.className = 'validation-msg';

  const response = await sendMessage({
    type: 'validate_selector',
    selector
  });

  if (response.found) {
    msgEl.textContent = `✅ Found: "${response.value}"`;
    msgEl.className = 'validation-msg valid';
  } else {
    msgEl.textContent = '❌ Element not found';
    msgEl.className = 'validation-msg invalid';
  }
}

function saveConfiguration() {
  const config = {
    casinoId: 'custom-' + Date.now(),
    domain: cfgDomain.value,
    selectors: {
      betAmount: cfgBet.value,
      gameResult: cfgResult.value
      // Add others as needed
    }
  };

  chrome.storage.local.get(['tiltcheck_custom_casinos'], (result: any) => {
    const current: any[] = result.tiltcheck_custom_casinos || [];
    // Remove existing for this domain to avoid duplicates
    const filtered = current.filter((c: any) => c.domain !== config.domain);
    filtered.push(config);

    chrome.storage.local.set({ tiltcheck_custom_casinos: filtered }, () => {
      alert('Configuration saved! Please refresh the page.');
      closeConfigurator();
    });
  });
}

// Event Listeners
if (startBtn) startBtn.addEventListener('click', startGuardian);
if (stopBtn) stopBtn.addEventListener('click', stopGuardian);
if (vaultBtn) vaultBtn.addEventListener('click', openVault);
if (reportBtn) reportBtn.addEventListener('click', viewFullReport);
if (configBtn) configBtn.addEventListener('click', openConfigurator);
if (cfgCancel) cfgCancel.addEventListener('click', closeConfigurator);
if (cfgSave) cfgSave.addEventListener('click', saveConfiguration);
if (loginBtn) loginBtn.addEventListener('click', startLogin);
if (finishSetupBtn) finishSetupBtn.addEventListener('click', goToOnboarding);

// Test buttons delegation
document.querySelectorAll('.test-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = (e.target as HTMLElement).dataset.target;
    if (targetId) testSelector(targetId);
  });
});

// Initial status check
refreshStatus();
initAuth();

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
