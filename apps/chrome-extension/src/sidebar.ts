﻿/**
 * Â© 2024â€“2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Sidebar - Fully Functional UI
 * Features: Discord auth, vault, dashboard, wallet, session export, premium upgrades
 * Integrates with AI Gateway for intelligent tilt detection
 */

const API_BASE = 'http://localhost:3001';
const AI_GATEWAY_URL = 'https://ai-gateway.tiltcheck.me';
let authToken: string | null = null;
let showSettings = false;
let apiKeys: any = {
  openai: '',
  anthropic: '',
  custom: ''
};

let isAuthenticated = false;
let userData: any = null;
const SIDEBAR_WIDTH = 340;
const MINIMIZED_WIDTH = 40;
let sessionStats = {
  startTime: Date.now(),
  totalBets: 0,
  totalWagered: 0,
  totalWon: 0,
  currentBalance: 0
};
let lockTimerInterval: any = null;

function applyPageOffset(width: number) {
  const offset = `${width}px`;

  // Some sites anchor layout to <html>, others to <body>. Set both so content shifts reliably.
  document.documentElement.style.marginRight = offset;
  document.documentElement.style.transition = 'margin-right 0.3s ease';
  document.body.style.marginRight = offset;
  document.body.style.transition = 'margin-right 0.3s ease';
}

async function apiCall(endpoint: string, options: any = {}) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { error: 'Network error' };
  }
}

/**
 * Call AI Gateway for intelligent analysis
 */
async function callAIGateway(application: string, data: any = {}) {
  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({
        application,
        prompt: data.prompt || '',
        context: data.context || {}
      })
    });

    if (response.ok) {
      return await response.json();
    }
    console.log('[TiltCheck] AI Gateway request failed, using local fallback');
    return { success: false, error: 'Request failed' };
  } catch (error) {
    console.log('[TiltCheck] AI Gateway offline, using local fallback');
    return { success: false, error: 'Network error' };
  }
}

function createSidebar() {
  const existing = document.getElementById('tiltcheck-sidebar');
  if (existing) existing.remove();

  const sidebar = document.createElement('div');
  sidebar.id = 'tiltcheck-sidebar';
  sidebar.innerHTML = `
    <div class="tg-header">
      <div class="tg-logo">TiltCheck</div>
      <div class="tg-header-actions">
        <button class="tg-icon-btn" id="tg-settings" title="Settings">âš™</button>
        <button class="tg-icon-btn" id="tg-minimize" title="Minimize">âˆ’</button>
      </div>
    </div>
    <div id="tg-status-bar" class="tg-status-bar" style="display: none;"></div>
    
    <div class="tg-content" id="tg-content">
      <!-- Auth Section -->
      <div class="tg-section" id="tg-auth-section">
        <div class="tg-auth-prompt">
          <h3>Sign In</h3>
          <p>Authenticate to sync data and access vault</p>
          <button class="tg-btn tg-btn-primary" id="tg-discord-login">Discord Login</button>
          <div class="tg-auth-divider">or</div>
          <button class="tg-btn tg-btn-secondary" id="tg-guest-mode">Try Demo Mode</button>
        </div>
      </div>

      <!-- Main Content (hidden until auth) -->
      <div id="tg-main-content" style="display: none;">
        <!-- User Bar -->
        <div class="tg-user-bar">
          <div class="tg-user-info">
            <span id="tg-username">Guest</span>
            <span class="tg-tier" id="tg-user-tier">Free</span>
          </div>
          <button class="tg-btn-icon" id="tg-logout" title="Logout">Ã—</button>
        </div>

        <!-- Settings Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-settings-panel" style="display: none;">
          <h4>API Keys</h4>
          <div class="tg-input-group">
            <label>OpenAI Key</label>
            <input type="password" id="api-key-openai" placeholder="sk-..." />
          </div>
          <div class="tg-input-group">
            <label>Anthropic Key</label>
            <input type="password" id="api-key-anthropic" placeholder="sk-ant-..." />
          </div>
          <div class="tg-input-group">
            <label>Custom API</label>
            <input type="text" id="api-key-custom" placeholder="Custom key" />
          </div>
          <div class="tg-input-group" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <input type="checkbox" id="cfg-buddy-mirror" style="width: auto;" />
            <label for="cfg-buddy-mirror" style="margin: 0; font-size: 12px;">Mirror Buddy Notifications</label>
          </div>
          <button class="tg-btn tg-btn-primary" id="save-api-keys">Save Keys</button>
          <button class="tg-btn tg-btn-secondary" id="close-settings">Close</button>
        </div>

        <!-- Configurator Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-config-panel" style="display: none;">
          <h4>ðŸŽ° Casino Configurator</h4>
          <div class="tg-input-group">
            <label>Bet Amount Selector</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="cfg-bet" placeholder=".bet-amount" style="flex:1;" />
              <button class="tg-btn-icon tg-picker-btn" data-target="cfg-bet" title="Pick Element">ðŸŽ¯</button>
              <button class="tg-btn-icon tg-test-btn" data-target="cfg-bet" title="Test Selector">ðŸ‘ï¸</button>
            </div>
          </div>
          <div class="tg-input-group">
            <label>Game Result Selector</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="cfg-result" placeholder=".game-result" style="flex:1;" />
              <button class="tg-btn-icon tg-picker-btn" data-target="cfg-result" title="Pick Element">ðŸŽ¯</button>
              <button class="tg-btn-icon tg-test-btn" data-target="cfg-result" title="Test Selector">ðŸ‘ï¸</button>
            </div>
          </div>
          <button class="tg-btn tg-btn-primary" id="save-config">Save Config</button>
          <button class="tg-btn tg-btn-secondary" id="close-config">Close</button>
        </div>

        <!-- Fairness Verifier Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-verifier-panel" style="display: none;">
          <h4>âš–ï¸ Fairness Verifier</h4>
          
          <div class="tg-tabs">
            <button class="tg-tab active" data-target="fv-tab-verify">Verify</button>
            <button class="tg-tab" data-target="fv-tab-history">History</button>
          </div>
          
          <div id="fv-tab-verify" class="tg-tab-content">
            <div class="tg-input-group">
              <label>Server Seed (Unhashed)</label>
              <input type="text" id="fv-server" placeholder="Paste revealed seed" />
            </div>
            <div class="tg-input-group">
              <label>Client Seed</label>
              <input type="text" id="fv-client" placeholder="Your client seed" />
            </div>
            <div class="tg-input-group">
              <label>Nonce</label>
              <div style="display: flex; gap: 5px;">
                <input type="number" id="fv-nonce" placeholder="1" value="1" style="flex: 1;" />
                <button class="tg-btn-icon" id="fv-sync-nonce" title="Sync Nonce">ðŸ”„</button>
              </div>
            </div>
            <button class="tg-btn tg-btn-primary" id="fv-verify">Verify Outcome</button>
            
            <div id="fv-results" style="margin-top: 15px; display: none; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
              <div class="tg-metric">
                <span class="tg-metric-label">Dice Result</span>
                <span class="tg-metric-value" id="fv-res-dice" style="color: #10b981;">0.00</span>
              </div>
              <div class="tg-metric">
                <span class="tg-metric-label">Limbo/Crash</span>
                <span class="tg-metric-value" id="fv-res-limbo" style="color: #f59e0b;">0.00x</span>
              </div>
              <div style="font-size: 10px; opacity: 0.5; margin-top: 5px; word-break: break-all;" id="fv-res-hash"></div>
            </div>
          </div>

          <div id="fv-tab-history" class="tg-tab-content" style="display: none;">
            <div id="fv-history-list" class="tg-feed" style="max-height: 200px;"></div>
            <button class="tg-btn tg-btn-secondary" id="fv-clear-history">Clear History</button>
          </div>

          <button class="tg-btn tg-btn-secondary" id="close-verifier">Close</button>
        </div>

        <!-- Active Session Metrics (TOP PRIORITY) -->
        <div class="tg-metrics-card">
          <div class="tg-metrics-header">
            <h3>Active Session</h3>
            <div class="tg-guardian-indicator" id="tg-guardian-indicator">â—</div>
          </div>
          <div class="tg-metrics-grid">
            <div class="tg-metric">
              <span class="tg-metric-label">Time</span>
              <span class="tg-metric-value" id="tg-duration">0:00</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Bets</span>
              <span class="tg-metric-value" id="tg-bets">0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Wagered</span>
              <span class="tg-metric-value" id="tg-wagered">$0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">P/L</span>
              <span class="tg-metric-value" id="tg-profit">$0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">RTP</span>
              <span class="tg-metric-value" id="tg-rtp">--</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Tilt</span>
              <span class="tg-metric-value tg-tilt-value" id="tg-score-value">0</span>
            </div>
          </div>
        </div>

        <!-- P/L Graph -->
        <div class="tg-section">
          <h4>Profit/Loss</h4>
          <div class="tg-graph" id="tg-pnl-graph">
            <canvas id="pnl-canvas" width="300" height="120"></canvas>
          </div>
        </div>

        <!-- Message Feed -->
        <div class="tg-section">
          <h4>Activity Feed</h4>
          <div class="tg-feed" id="tg-message-feed">
            <div class="tg-feed-item">Monitoring active...</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="tg-section">
          <div class="tg-action-grid">
            <button class="tg-action-btn" id="tg-open-suslink">ðŸ›¡ï¸ SusLink</button>
            <button class="tg-action-btn" id="tg-open-config">Configure</button>
            <button class="tg-action-btn" id="tg-open-verifier">Verify</button>
            <button class="tg-action-btn" id="tg-open-dashboard">Dashboard</button>
            <button class="tg-action-btn" id="tg-open-vault">Vault</button>
            <button class="tg-action-btn" id="tg-wallet">Wallet</button>
            <button class="tg-action-btn" id="tg-upgrade">Upgrade</button>
          </div>
          <button class="tg-btn tg-btn-secondary" id="tg-open-report" style="margin-top: 8px;">ðŸ“¢ Report Casino Update</button>
        </div>

        <!-- SusLink Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-suslink-panel" style="display: none;">
          <h4>ðŸ›¡ï¸ SusLink Scanner</h4>
          <div class="tg-input-group">
            <label>Check URL</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="suslink-url" placeholder="https://..." style="flex:1;" />
              <button class="tg-btn-icon" id="suslink-scan-btn">ðŸ”</button>
            </div>
          </div>
          <div id="suslink-result" style="display:none; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; margin-bottom: 10px;">
            <div id="suslink-score" style="font-weight: bold; margin-bottom: 4px;"></div>
            <div id="suslink-details" style="font-size: 11px; opacity: 0.8;"></div>
          </div>
          <button class="tg-btn tg-btn-secondary" id="close-suslink">Close</button>
        </div>

        <!-- Report Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-report-panel" style="display: none;">
          <h4>ðŸ“¢ Community Report</h4>
          <div class="tg-input-group">
            <label>Report Type</label>
            <select id="report-type" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;">
              <option value="payout_change">Payout Schedule Change</option>
              <option value="bonus_nerf">Bonus Amount Reduced</option>
              <option value="rtp_change">RTP/Odds Change</option>
              <option value="scam_alert">Scam/Fraud Alert</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="tg-input-group">
            <label>Details</label>
            <textarea id="report-details" rows="3" placeholder="Describe what changed..." style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;"></textarea>
          </div>
          <button class="tg-btn tg-btn-primary" id="submit-report">Submit Report</button>
          <button class="tg-btn tg-btn-secondary" id="close-report">Close</button>
        </div>

        <!-- Vault Section -->
        <div class="tg-section">
          <h4>Vault Balance</h4>
          <div class="tg-vault-amount" id="tg-vault-balance">$0.00</div>
          
          <!-- Custom Goals -->
          <div id="tg-goals-list" style="margin-bottom: 10px;"></div>
          
          <div class="tg-vault-actions">
            <button class="tg-btn tg-btn-vault" id="tg-vault-btn">Vault Balance</button>
            <button class="tg-btn tg-btn-secondary" id="tg-vault-custom">Custom Amount</button>
          </div>
          <button class="tg-btn tg-btn-secondary" id="tg-add-goal" style="margin-top: 8px; font-size: 11px;">+ Add Withdraw Goal</button>
          
          <!-- Lock Timer Wallet -->
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="font-size: 11px; margin-bottom: 6px;">â³ Lock Timer Wallet</h4>
            
            <div id="tg-lock-form">
              <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <input type="number" id="lock-timer-mins" placeholder="Mins" style="width: 60px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;" />
                <button class="tg-btn tg-btn-primary" id="start-lock-timer" style="margin: 0; padding: 4px 8px; font-size: 11px;">Lock Funds</button>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 10px; opacity: 0.7; line-height: 1.3;">
                <input type="checkbox" id="lock-agree" style="margin-top: 2px;" />
                <label for="lock-agree">I voluntarily lock these funds. They cannot be accessed until the timer expires.</label>
              </div>
            </div>

            <div id="tg-lock-status" style="display: none; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>Locked:</span>
                <span id="tg-locked-amount" style="color: #fbbf24; font-weight: bold;">$0.00</span>
              </div>
              
              <!-- Progress Bar -->
              <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 8px; overflow: hidden;">
                <div id="tg-lock-progress" style="width: 0%; height: 100%; background: #fbbf24; transition: width 1s linear;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
                <span>Unlocks in:</span>
                <span id="tg-lock-timer">--:--</span>
              </div>
              
              <!-- Partial Release Input (Hidden until unlock) -->
              <div id="tg-release-controls" style="display: none; margin-bottom: 8px;">
                 <input type="number" id="tg-release-amount" placeholder="Amount to release" style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff; font-size: 12px; margin-bottom: 5px;" />
                 <div style="font-size: 10px; opacity: 0.6; text-align: right;">Leave empty to release all</div>
              </div>

              <button class="tg-btn tg-btn-secondary" id="release-funds-btn" disabled style="width: 100%; padding: 6px; font-size: 11px; opacity: 0.5; cursor: not-allowed;">Release Funds</button>
            </div>
          </div>
        </div>

        <!-- Export -->
        <div class="tg-section">
          <button class="tg-btn tg-btn-secondary" id="tg-export-session">Export Session</button>
        </div>
      </div>
    </div>
  `;

  // Push page content to make room for sidebar
  document.body.style.marginRight = '340px';
  document.body.style.transition = 'margin-right 0.3s ease';

  const style = document.createElement('style');
  style.textContent = `
    #tiltcheck-sidebar {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: ${SIDEBAR_WIDTH}px;
      height: 100vh;
      background: #0f1419;
      color: #e1e8ed;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      overflow-y: auto;
      transition: transform 0.2s ease;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
    }
    #tiltcheck-sidebar.minimized { transform: translateX(${SIDEBAR_WIDTH - MINIMIZED_WIDTH}px); width: ${MINIMIZED_WIDTH}px; }
    body.tiltcheck-minimized { margin-right: ${MINIMIZED_WIDTH}px !important; }
    #tiltcheck-sidebar::-webkit-scrollbar { width: 6px; }
    #tiltcheck-sidebar::-webkit-scrollbar-track { background: transparent; }
    #tiltcheck-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
    
    .tg-header {
      background: #000;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .tg-logo {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.5px;
    }
    .tg-header-actions { display: flex; gap: 6px; }
    .tg-icon-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e1e8ed;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s;
    }
    .tg-icon-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.3); }
    
    .tg-content { padding: 12px; }
    .tg-section { margin-bottom: 12px; padding: 14px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05); }
    .tg-section h4 { margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.5px; }
    
    .tg-auth-prompt { text-align: center; padding: 40px 20px; }
    .tg-auth-prompt h3 { font-size: 18px; margin-bottom: 8px; font-weight: 600; }
    .tg-auth-prompt p { font-size: 13px; opacity: 0.6; margin-bottom: 24px; }
    .tg-auth-divider { margin: 14px 0; text-align: center; opacity: 0.4; font-size: 12px; }
    
    .tg-user-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 12px;
    }
    .tg-user-info { display: flex; gap: 8px; align-items: center; font-size: 13px; }
    .tg-tier { padding: 2px 8px; background: rgba(99, 102, 241, 0.2); border-radius: 3px; font-size: 11px; color: #818cf8; }
    .tg-btn-icon {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 20px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      padding: 0;
      line-height: 1;
    }
    .tg-btn-icon:hover { color: rgba(255, 255, 255, 0.8); }
    
    .tg-settings-panel {
      background: #1a1f26;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tg-settings-panel h4 { margin: 0 0 12px 0; font-size: 13px; }
    .tg-input-group { margin-bottom: 12px; }
    .tg-input-group label { display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.7; }
    .tg-input-group input {
      width: 100%;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #e1e8ed;
      font-size: 12px;
    }
    .tg-input-group input:focus { outline: none; border-color: rgba(99, 102, 241, 0.5); }
    
    .tg-metrics-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .tg-metrics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .tg-metrics-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    .tg-guardian-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      color: transparent;
      font-size: 0;
    }
    .tg-guardian-indicator.inactive { background: rgba(255, 255, 255, 0.2); }
    
    .tg-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .tg-metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tg-metric-label {
      font-size: 11px;
      opacity: 0.5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tg-metric-value {
      font-size: 15px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .tg-tilt-value { color: #10b981; }
    .tg-tilt-value.warning { color: #f59e0b; }
    .tg-tilt-value.critical { color: #ef4444; }
    
    .tg-graph {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: 10px;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .tg-feed {
      max-height: 120px;
      overflow-y: auto;
      font-size: 12px;
    }
    .tg-feed-item {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      opacity: 0.7;
    }
    .tg-feed-item:last-child { border-bottom: none; }
    
    .tg-action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .tg-action-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e1e8ed;
      padding: 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .tg-action-btn:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); }
    
    .tg-vault-amount {
      font-size: 24px;
      font-weight: 700;
      color: #fbbf24;
      margin-bottom: 12px;
      font-variant-numeric: tabular-nums;
    }
    .tg-vault-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .tg-btn {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      border: none;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 13px;
    }
    .tg-btn-primary { background: #6366f1; }
    .tg-btn-primary:hover { background: #5558e3; }
    .tg-btn-secondary { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); }
    .tg-btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
    .tg-btn-vault { background: #f59e0b; }
    .tg-btn-vault:hover { background: #d97706; }

    .tg-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; }
    .tg-tab { flex: 1; background: none; border: none; color: rgba(255,255,255,0.5); padding: 8px; cursor: pointer; border-bottom: 2px solid transparent; font-size: 12px; font-weight: 600; }
    .tg-tab.active { color: #fff; border-bottom-color: #6366f1; }
    .tg-history-item { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px; background: rgba(255,255,255,0.02); margin-bottom: 4px; border-radius: 4px; }
    .tg-history-header { display: flex; justify-content: space-between; margin-bottom: 4px; opacity: 0.7; }
    .tg-history-result { font-weight: bold; color: #10b981; }

    .tg-status-bar { padding: 8px 12px; font-size: 11px; font-weight: 600; text-align: center; animation: slideDown 0.3s ease; }
    .tg-status-bar.thinking { background: rgba(99, 102, 241, 0.2); color: #818cf8; border-bottom: 1px solid rgba(99, 102, 241, 0.3); }
    .tg-status-bar.success { background: rgba(16, 185, 129, 0.2); color: #34d399; border-bottom: 1px solid rgba(16, 185, 129, 0.3); }
    .tg-status-bar.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-bottom: 1px solid rgba(245, 158, 11, 0.3); }
    .tg-status-bar.buddy { background: rgba(236, 72, 153, 0.2); color: #f472b6; border-bottom: 1px solid rgba(236, 72, 153, 0.3); }
    
    @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
    .nonce-flash { animation: flashGreen 1s ease; }
    @keyframes flashGreen {
      0% { background-color: rgba(16, 185, 129, 0.5); }
      100% { background-color: rgba(0, 0, 0, 0.3); }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(sidebar);
  setupEventListeners();
  checkAuthStatus();
  return sidebar;
}

function setupEventListeners() {
  document.getElementById('tg-minimize')?.addEventListener('click', () => {
    const sidebar = document.getElementById('tiltcheck-sidebar');
    const btn = document.getElementById('tg-minimize');
    const isMin = sidebar?.classList.toggle('minimized');
    document.body.classList.toggle('tiltcheck-minimized', !!isMin);
    applyPageOffset(isMin ? MINIMIZED_WIDTH : SIDEBAR_WIDTH);
    if (btn) btn.textContent = isMin ? '+' : 'âˆ’';
  });

  // Settings toggle
  document.getElementById('tg-settings')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-settings-panel');
    if (panel) {
      showSettings = !showSettings;
      panel.style.display = showSettings ? 'block' : 'none';
    }
  });

  document.getElementById('close-settings')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-settings-panel');
    if (panel) {
      showSettings = false;
      panel.style.display = 'none';
    }
  });

  // Buddy Mirror Setting
  const buddyCheckbox = document.getElementById('cfg-buddy-mirror') as HTMLInputElement;
  if (buddyCheckbox) {
    buddyCheckbox.checked = localStorage.getItem('tiltcheck_buddy_mirror') === 'true';
    buddyCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('tiltcheck_buddy_mirror', (e.target as HTMLInputElement).checked.toString());
    });
  }

  // Configurator toggle
  document.getElementById('tg-open-config')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-config-panel');
    if (panel) panel.style.display = 'block';
  });

  document.getElementById('close-config')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-config-panel');
    if (panel) panel.style.display = 'none';
  });

  // SusLink toggle
  document.getElementById('tg-open-suslink')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-suslink-panel');
    if (panel) panel.style.display = 'block';
  });
  document.getElementById('close-suslink')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-suslink-panel');
    if (panel) panel.style.display = 'none';
  });

  // Report toggle
  document.getElementById('tg-open-report')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-report-panel');
    if (panel) panel.style.display = 'block';
  });
  document.getElementById('close-report')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-report-panel');
    if (panel) panel.style.display = 'none';
  });

  // Verifier toggle
  document.getElementById('tg-open-verifier')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-verifier-panel');
    if (panel) {
      panel.style.display = 'block';
      // Auto-populate from storage/session
      const clientSeed = localStorage.getItem('tiltcheck_client_seed');
      const nonce = localStorage.getItem('tiltcheck_nonce'); // Assuming this is tracked

      if (clientSeed) (document.getElementById('fv-client') as HTMLInputElement).value = clientSeed;
      if (nonce) (document.getElementById('fv-nonce') as HTMLInputElement).value = nonce;
    }
  });

  document.getElementById('close-verifier')?.addEventListener('click', () => {
    const panel = document.getElementById('tg-verifier-panel');
    if (panel) panel.style.display = 'none';
  });

  // Picker buttons
  document.querySelectorAll('.tg-picker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = (e.currentTarget as HTMLElement).dataset.target;
      // Dispatch event for content script to handle
      window.dispatchEvent(new CustomEvent('tg-start-picker', { detail: { field: targetId } }));
    });
  });

  // Test buttons
  document.querySelectorAll('.tg-test-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = (e.currentTarget as HTMLElement).dataset.target;
      const input = document.getElementById(targetId!) as HTMLInputElement;
      if (input && input.value) {
        window.dispatchEvent(new CustomEvent('tg-test-selector', { detail: { selector: input.value } }));
      }
    });
  });

  // Listen for picker results
  window.addEventListener('tg-picker-result', ((e: CustomEvent) => {
    const input = document.getElementById(e.detail.field) as HTMLInputElement;
    if (input) input.value = e.detail.selector;
  }) as EventListener);

  // Verify Fairness Logic
  document.getElementById('fv-verify')?.addEventListener('click', () => {
    const serverSeed = (document.getElementById('fv-server') as HTMLInputElement).value;
    const clientSeed = (document.getElementById('fv-client') as HTMLInputElement).value;
    const nonce = (document.getElementById('fv-nonce') as HTMLInputElement).value;

    if (!serverSeed || !clientSeed || !nonce) {
      alert('Please fill all fields');
      return;
    }

    window.dispatchEvent(new CustomEvent('tg-calc-fairness', { detail: { serverSeed, clientSeed, nonce } }));
  });

  // Listen for fairness results
  window.addEventListener('tg-fairness-result', ((e: CustomEvent) => {
    const res = document.getElementById('fv-results');
    if (res) res.style.display = 'block';

    document.getElementById('fv-res-dice')!.textContent = e.detail.dice.toFixed(2);
    document.getElementById('fv-res-limbo')!.textContent = e.detail.limbo.toFixed(2) + 'x';
    document.getElementById('fv-res-hash')!.textContent = e.detail.hash;

    // Save to history
    saveVerificationHistory({
      timestamp: Date.now(),
      serverSeed: (document.getElementById('fv-server') as HTMLInputElement).value,
      clientSeed: (document.getElementById('fv-client') as HTMLInputElement).value,
      nonce: (document.getElementById('fv-nonce') as HTMLInputElement).value,
      result: e.detail
    });
  }) as EventListener);

  // Tab switching
  document.querySelectorAll('.tg-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).dataset.target;
      const parent = (e.currentTarget as HTMLElement).closest('.tg-settings-panel');

      parent?.querySelectorAll('.tg-tab').forEach(t => t.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');

      parent?.querySelectorAll('.tg-tab-content').forEach(c => (c as HTMLElement).style.display = 'none');
      const content = document.getElementById(target!);
      if (content) content.style.display = 'block';

      if (target === 'fv-tab-history') renderVerificationHistory();
    });
  });

  document.getElementById('fv-clear-history')?.addEventListener('click', () => {
    localStorage.removeItem('tiltcheck_verification_history');
    renderVerificationHistory();
  });

  // Copy Hash Handler (Delegated)
  document.getElementById('fv-history-list')?.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.tg-copy-hash') as HTMLElement;
    if (target && target.dataset.hash) {
      navigator.clipboard.writeText(target.dataset.hash);

      // Visual feedback
      const originalText = target.textContent;
      target.textContent = 'âœ“';
      setTimeout(() => target.textContent = originalText, 1000);
    }
  });

  // Sync Nonce Handler
  document.getElementById('fv-sync-nonce')?.addEventListener('click', () => {
    const nonce = localStorage.getItem('tiltcheck_nonce');
    if (nonce) {
      const input = document.getElementById('fv-nonce') as HTMLInputElement;
      input.value = nonce;
      updateStatus('Nonce synced from session', 'success');
    } else {
      updateStatus('No active session nonce found', 'warning');
    }
  });

  // Listen for Status Updates
  window.addEventListener('tg-status-update', ((e: CustomEvent) => {
    updateStatus(e.detail.message, e.detail.type);
  }) as EventListener);

  // Listen for Nonce Updates (Visual Indicator)
  window.addEventListener('tg-nonce-update', ((e: CustomEvent) => {
    const input = document.getElementById('fv-nonce') as HTMLInputElement;
    if (input) {
      input.value = e.detail.nonce;
      // Trigger flash animation
      input.classList.remove('nonce-flash');
      void input.offsetWidth; // trigger reflow
      input.classList.add('nonce-flash');
    }
  }) as EventListener);

  // SusLink Scan Logic
  document.getElementById('suslink-scan-btn')?.addEventListener('click', async () => {
    const url = (document.getElementById('suslink-url') as HTMLInputElement).value;
    if (!url) return;

    const resultDiv = document.getElementById('suslink-result');
    const scoreDiv = document.getElementById('suslink-score');
    const detailsDiv = document.getElementById('suslink-details');

    if (resultDiv) resultDiv.style.display = 'block';
    if (scoreDiv) scoreDiv.textContent = 'Scanning...';

    try {
      // Call backend API for SusLink scan
      const result = await apiCall('/security/scan-url', {
        method: 'POST',
        body: JSON.stringify({ url })
      });

      if (result.success && result.scan) {
        const scan = result.scan;
        if (scoreDiv) {
          scoreDiv.textContent = `${scan.isSafe ? 'âœ…' : 'âŒ'} ${scan.isSafe ? 'Safe' : 'High Risk'} (Trust Score: ${scan.trustScore}/100)`;
          scoreDiv.style.color = scan.isSafe ? '#10b981' : '#ef4444';
        }
        if (detailsDiv) {
          detailsDiv.textContent = scan.details || (scan.isSafe
            ? 'Domain registered > 5 years. No reports found.'
            : 'Domain flagged. Check user reports.');
        }
      } else {
        // Fallback for API failure
        const isSafe = !url.includes('scam');
        if (scoreDiv) {
          scoreDiv.textContent = isSafe ? 'âœ… Safe (Trust Score: 95/100)' : 'âŒ High Risk (Trust Score: 10/100)';
          scoreDiv.style.color = isSafe ? '#10b981' : '#ef4444';
        }
        if (detailsDiv) {
          detailsDiv.textContent = 'Offline mode: local check only.';
        }
      }
    } catch (e) {
      console.error('[TiltGuard] SusLink scan error:', e);
      if (scoreDiv) {
        scoreDiv.textContent = 'âš ï¸ Scan Error';
        scoreDiv.style.color = '#f59e0b';
      }
      if (detailsDiv) {
        detailsDiv.textContent = 'Network error. Please try again.';
      }
    }
  });

  // Submit Report Logic
  document.getElementById('submit-report')?.addEventListener('click', async () => {
    const type = (document.getElementById('report-type') as HTMLSelectElement).value;
    const details = (document.getElementById('report-details') as HTMLTextAreaElement).value;

    if (!details) {
      alert('Please provide details');
      return;
    }

    if (!userData) {
      alert('Please sign in to submit reports.');
      return;
    }

    updateStatus('Sending report...', 'thinking');

    try {
      const result = await apiCall('/reports/casino-update', {
        method: 'POST',
        body: JSON.stringify({ type, details, casino: window.location.hostname })
      });

      if (result.success) {
        addFeedMessage(`Report submitted: ${type}`);
        updateStatus('Report sent to community', 'success');
        (document.getElementById('report-details') as HTMLTextAreaElement).value = '';
        document.getElementById('tg-report-panel')!.style.display = 'none';
      } else {
        updateStatus(`Report failed: ${result.error}`, 'warning');
      }
    } catch (e) {
      updateStatus('Network error', 'warning');
    }
  });

  // Add Goal Logic
  document.getElementById('tg-add-goal')?.addEventListener('click', () => {
    const name = prompt('Goal Name (e.g. Power Bill):');
    const amount = prompt('Amount ($):');

    if (name && amount) {
      const goalsList = document.getElementById('tg-goals-list');
      const goalDiv = document.createElement('div');
      goalDiv.style.cssText = 'display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; padding:4px; background:rgba(255,255,255,0.05); border-radius:4px;';
      goalDiv.innerHTML = `<span>${name} ($${amount})</span> <button style="background:none;border:none;color:#10b981;cursor:pointer;font-size:10px;">Vault</button>`;
      goalsList?.appendChild(goalDiv);
    }
  });

  // Lock Timer Logic
  document.getElementById('start-lock-timer')?.addEventListener('click', async () => {
    const minsInput = document.getElementById('lock-timer-mins') as HTMLInputElement;
    const agreeCheckbox = document.getElementById('lock-agree') as HTMLInputElement;
    const mins = parseInt(minsInput.value);

    if (!agreeCheckbox.checked) {
      alert('You must agree to the voluntary lock disclaimer.');
      return;
    }

    if (!mins || mins <= 0) {
      alert('Please enter valid minutes');
      return;
    }

    const amountStr = prompt('Amount to lock ($):');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }

    if (!userData) {
      alert('Please sign in to use the vault.');
      return;
    }

    updateStatus('Locking funds...', 'thinking');

    try {
      const result = await apiCall(`/vault/${userData.id}/lock`, {
        method: 'POST',
        body: JSON.stringify({ amount, durationMinutes: mins })
      });

      if (result.success) {
        addFeedMessage(`ðŸ”’ Locked $${amount} for ${mins}m`);
        updateStatus('Funds locked successfully', 'success');
        minsInput.value = '';
        agreeCheckbox.checked = false;
        loadVaultBalance(); // Refresh balance
        checkLockStatus(); // Refresh lock status UI
      } else {
        updateStatus(`Lock failed: ${result.error}`, 'warning');
      }
    } catch (e) {
      console.error(e);
      updateStatus('Network error', 'warning');
    }
  });

  // Release Funds Logic
  document.getElementById('release-funds-btn')?.addEventListener('click', async () => {
    if (!userData) return;

    const releaseInput = document.getElementById('tg-release-amount') as HTMLInputElement;
    const amountToRelease = releaseInput && releaseInput.value ? parseFloat(releaseInput.value) : null;

    updateStatus('Releasing funds...', 'thinking');

    try {
      const result = await apiCall(`/vault/${userData.id}/release`, {
        method: 'POST',
        body: JSON.stringify({ amount: amountToRelease })
      });

      if (result.success) {
        addFeedMessage(`ðŸ”“ Funds released: $${result.amount.toFixed(2)}`);
        updateStatus('Funds released to main wallet', 'success');
        checkLockStatus(); // Should reset UI to form
        loadVaultBalance();
      } else {
        updateStatus(`Release failed: ${result.error}`, 'warning');
      }
    } catch (e) {
      updateStatus('Network error', 'warning');
    }
  });

  // Save Config
  document.getElementById('save-config')?.addEventListener('click', async () => {
    const betSelector = (document.getElementById('cfg-bet') as HTMLInputElement).value;
    const resultSelector = (document.getElementById('cfg-result') as HTMLInputElement).value;

    // Dynamically import saveCustomCasino or use message passing if needed
    // Since we are in the same bundle context, we can try to use the global extractor if exposed, 
    // or just save to storage directly here for simplicity since we are in content script context.
    const config = {
      casinoId: 'custom-' + window.location.hostname,
      domain: window.location.hostname,
      selectors: {
        betAmount: betSelector,
        gameResult: resultSelector
      }
    };

    const storage = chrome.storage.sync || chrome.storage.local;
    storage.get(['tiltcheck_custom_casinos'], (result) => {
      const current = (result.tiltcheck_custom_casinos || []) as any[];
      const filtered = current.filter(c => c.domain !== config.domain);
      filtered.push(config);
      storage.set({ tiltcheck_custom_casinos: filtered }, () => {
        alert('Configuration saved! Please refresh the page.');
        document.getElementById('tg-config-panel')!.style.display = 'none';
      });
    });
  });

  document.getElementById('save-api-keys')?.addEventListener('click', () => {
    const openai = (document.getElementById('api-key-openai') as HTMLInputElement)?.value;
    const anthropic = (document.getElementById('api-key-anthropic') as HTMLInputElement)?.value;
    const custom = (document.getElementById('api-key-custom') as HTMLInputElement)?.value;

    apiKeys = { openai, anthropic, custom };
    localStorage.setItem('tiltguard_api_keys', JSON.stringify(apiKeys));
    addFeedMessage('API keys saved');

    const panel = document.getElementById('tg-settings-panel');
    if (panel) {
      showSettings = false;
      panel.style.display = 'none';
    }
  });

  document.getElementById('tg-guest-mode')?.addEventListener('click', () => {
    // Demo mode — shows full UI with fake data, prompts signup after 60s
    userData = { username: 'Demo User', tier: 'demo', id: 'demo' };
    authToken = 'demo-token';
    isAuthenticated = true;
    showMainContent();
    addFeedMessage('👀 Demo mode — sign in with Discord to save your data and access all features.');

    // After 60 seconds, nudge them to sign up
    setTimeout(() => {
      addFeedMessage('⚡ Ready to go full degen? Sign in with Discord to unlock vault, tilt tracking, and more.');
      const authSection = document.getElementById('tg-auth-section');
      if (authSection) {
        authSection.style.display = 'block';
        authSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60000);
  });

  document.getElementById('tg-discord-login')?.addEventListener('click', async () => {
    // Open Discord OAuth in new window
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindow = window.open(
      'https://discord.com/oauth2/authorize?client_id=1445916179163250860&permissions=2252352254102592&response_type=code&redirect_uri=https%3A%2F%2Fapi.tiltcheck.me%2Fauth%2Fdiscord%2Fcallback&integration_type=0&scope=identify+email+bot+dm_channels.messages.read+messages.read+applications.store.update+dm_channels.read+presences.read+lobbies.write+applications.entitlements+applications.commands',
      'Discord Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for auth response
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'discord-auth' && event.data.token) {
        authToken = event.data.token;
        userData = event.data.user;
        isAuthenticated = true;
        localStorage.setItem('tiltcheck_auth', JSON.stringify(userData));
        localStorage.setItem('tiltcheck_token', authToken || '');
        showMainContent();
        addFeedMessage(`Authenticated as ${userData.username}`);
        window.removeEventListener('message', handleMessage);

        // Close auth window if still open
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback: check if window was closed without completing auth
    const checkClosed = setInterval(() => {
      if (authWindow && authWindow.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        if (!isAuthenticated) {
          addFeedMessage('Discord login cancelled');
        }
      }
    }, 1000);
  });

  document.getElementById('tg-logout')?.addEventListener('click', () => {
    localStorage.removeItem('tiltguard_auth');
    localStorage.removeItem('tiltguard_token');
    authToken = null;
    location.reload();
  });
  document.getElementById('tg-open-dashboard')?.addEventListener('click', openDashboard);
  document.getElementById('tg-open-vault')?.addEventListener('click', openVault);
  document.getElementById('tg-wallet')?.addEventListener('click', openWallet);
  document.getElementById('tg-vault-btn')?.addEventListener('click', vaultCurrentBalance);
  document.getElementById('tg-vault-custom')?.addEventListener('click', async () => {
    const amt = prompt('Enter amount to vault:');
    if (amt && !isNaN(parseFloat(amt))) {
      await depositToVault(parseFloat(amt));
    }
  });
  document.getElementById('tg-export-session')?.addEventListener('click', () => {
    const data = { ...sessionStats, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiltguard-session-${Date.now()}.json`;
    a.click();
    addFeedMessage('Session exported');
  });
  document.getElementById('tg-upgrade')?.addEventListener('click', openPremium);
}

function checkAuthStatus() {
  const stored = localStorage.getItem('tiltguard_auth');
  const token = localStorage.getItem('tiltguard_token');
  const keys = localStorage.getItem('tiltguard_api_keys');

  if (keys) {
    apiKeys = JSON.parse(keys);
    // Populate settings fields
    setTimeout(() => {
      if (document.getElementById('api-key-openai')) {
        (document.getElementById('api-key-openai') as HTMLInputElement).value = apiKeys.openai || '';
        (document.getElementById('api-key-anthropic') as HTMLInputElement).value = apiKeys.anthropic || '';
        (document.getElementById('api-key-custom') as HTMLInputElement).value = apiKeys.custom || '';
      }
    }, 100);
  }

  // Require authentication
  if (!stored || !token) {
    console.log('ðŸŽ® TiltGuard: Authentication required');
    return;
  }

  if (stored && token) {
    userData = JSON.parse(stored);
    authToken = token;
    isAuthenticated = true;
    showMainContent();
    loadVaultBalance();
    checkLockStatus();
    initPnLGraph();
  }
}

function addFeedMessage(message: string) {
  const feed = document.getElementById('tg-message-feed');
  if (!feed) return;

  const item = document.createElement('div');
  item.className = 'tg-feed-item';
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  item.textContent = `[${time}] ${message}`;

  feed.insertBefore(item, feed.firstChild);

  // Keep only last 10 messages
  while (feed.children.length > 10) {
    feed.removeChild(feed.lastChild!);
  }
}

const pnlHistory: number[] = [];

function initPnLGraph() {
  const canvas = document.getElementById('pnl-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Initial empty graph
  drawPnLGraph(ctx, canvas);
}

function drawPnLGraph(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const width = canvas.width;
  const height = canvas.height;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, width, height);

  // Zero line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  if (pnlHistory.length < 2) {
    // No data message
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet', width / 2, height / 2);
    return;
  }

  // Calculate scale
  const max = Math.max(...pnlHistory, 0);
  const min = Math.min(...pnlHistory, 0);
  const range = max - min || 1;

  // Draw line
  ctx.strokeStyle = pnlHistory[pnlHistory.length - 1] >= 0 ? '#10b981' : '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();

  pnlHistory.forEach((value, index) => {
    const x = (index / (pnlHistory.length - 1)) * width;
    const y = height - ((value - min) / range) * height;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Current value
  const current = pnlHistory[pnlHistory.length - 1];
  ctx.fillStyle = current >= 0 ? '#10b981' : '#ef4444';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${current.toFixed(2)}`, width - 10, 20);
}

function showMainContent() {
  document.getElementById('tg-auth-section')!.style.display = 'none';
  document.getElementById('tg-main-content')!.style.display = 'block';
  const username = document.getElementById('tg-username')!;
  const tier = document.getElementById('tg-user-tier')!;
  username.textContent = userData.username || 'Guest';
  tier.textContent = userData.tier === 'premium' ? 'Premium' : 'Free';
  initPnLGraph();
  addFeedMessage('Session started');
}

async function vaultCurrentBalance() {
  const balance = sessionStats.currentBalance || 0;
  if (balance <= 0) {
    addFeedMessage('No balance to vault');
    return;
  }
  const confirmed = confirm(`Vault entire balance of $${balance.toFixed(2)}?`);
  if (!confirmed) return;

  await depositToVault(balance);
  sessionStats.currentBalance = 0;
}

function updateLicense(verification: any) {
  // License verification can be shown in feed
  if (verification.isLegitimate) {
    addFeedMessage(`âœ“ Licensed: ${verification.licenseInfo?.authority || 'Verified'}`);
  } else {
    addFeedMessage(`âš  ${verification.verdict || 'Unlicensed'}`);
  }
}

function updateGuardian(active: boolean) {
  const indicator = document.getElementById('tg-guardian-indicator');
  if (indicator) {
    indicator.className = active ? 'tg-guardian-indicator' : 'tg-guardian-indicator inactive';
  }
  addFeedMessage(active ? 'Guardian activated' : 'Guardian deactivated');
}

async function updateTilt(score: number, _indicators: string[]) {
  const scoreEl = document.getElementById('tg-score-value');
  if (scoreEl) {
    scoreEl.textContent = Math.round(score).toString();
    // Update color based on score
    scoreEl.className = 'tg-metric-value tg-tilt-value';
    if (score >= 60) scoreEl.classList.add('critical');
    else if (score >= 30) scoreEl.classList.add('warning');
  }

  // Add to feed if high tilt
  if (score >= 60) {
    addFeedMessage(`âš ï¸ High tilt detected: ${Math.round(score)}`);

    // Get AI-powered intervention suggestions
    const aiResult = await callAIGateway('tilt-detection', {
      context: {
        recentBets: [],
        sessionDuration: Math.floor((Date.now() - sessionStats.startTime) / 60000),
        losses: Math.max(0, sessionStats.totalWagered - sessionStats.totalWon)
      }
    });

    if (aiResult.success && aiResult.data?.interventionSuggestions) {
      aiResult.data.interventionSuggestions.forEach((suggestion: string) => {
        addFeedMessage(`ðŸ’¡ ${suggestion}`);
      });
    }
  }
}

function updateStats(stats: any) {
  sessionStats = { ...sessionStats, ...stats };
  const duration = Math.floor((Date.now() - (sessionStats.startTime || Date.now())) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const profit = (sessionStats.totalWon || 0) - (sessionStats.totalWagered || 0);
  const rtp = sessionStats.totalWagered > 0 ? ((sessionStats.totalWon || 0) / sessionStats.totalWagered * 100) : 0;

  const updates = {
    'tg-duration': `${minutes}:${seconds.toString().padStart(2, '0')}`,
    'tg-bets': stats.totalBets.toString(),
    'tg-wagered': `$${stats.totalWagered.toFixed(2)}`,
    'tg-profit': `$${profit.toFixed(2)}`,
    'tg-rtp': `${rtp.toFixed(1)}%`
  };

  Object.entries(updates).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value) {
      el.textContent = value;
      if (id === 'tg-profit') el.style.color = profit >= 0 ? '#10b981' : '#ef4444';
    }
  });

  // Update P/L graph
  pnlHistory.push(profit);
  if (pnlHistory.length > 50) pnlHistory.shift(); // Keep last 50 points

  const canvas = document.getElementById('pnl-canvas') as HTMLCanvasElement;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) drawPnLGraph(ctx, canvas);
  }

  if (stats.currentBalance !== undefined) sessionStats.currentBalance = stats.currentBalance;
}

async function depositToVault(amount: number) {
  if (!userData) return;
  const result = await apiCall(`/vault/${userData.id}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount })
  });

  if (result.success) {
    const vaultEl = document.getElementById('tg-vault-balance');
    if (vaultEl) vaultEl.textContent = `$${result.vault.balance.toFixed(2)}`;
    addFeedMessage(`Vaulted $${amount.toFixed(2)}`);
  } else {
    addFeedMessage(`Vault error: ${result.error}`);
  }
}

async function loadVaultBalance() {
  if (!userData) return;
  const result = await apiCall(`/vault/${userData.id}`);
  if (result.vault) {
    const vaultEl = document.getElementById('tg-vault-balance');
    if (vaultEl) vaultEl.textContent = `$${result.vault.balance.toFixed(2)}`;
  }
}

async function checkLockStatus() {
  if (!userData) return;

  // Check if user has active lock
  const result = await apiCall(`/vault/${userData.id}/lock-status`);

  const form = document.getElementById('tg-lock-form');
  const status = document.getElementById('tg-lock-status');

  if (result.success && result.locked) {
    if (form) form.style.display = 'none';
    if (status) status.style.display = 'block';

    const amountEl = document.getElementById('tg-locked-amount');
    if (amountEl) amountEl.textContent = `$${result.amount.toFixed(2)}`;
    if (amountEl) amountEl.dataset.total = result.amount.toString();

    // Use createdAt if available for progress bar, otherwise default to now (0% progress fallback)
    const startTime = result.createdAt ? new Date(result.createdAt).getTime() : Date.now();
    startLockCountdown(new Date(result.unlockTime).getTime(), startTime);
  } else {
    if (form) form.style.display = 'block';
    if (status) status.style.display = 'none';
    if (lockTimerInterval) clearInterval(lockTimerInterval);
  }
}

function startLockCountdown(unlockTime: number, startTime: number) {
  if (lockTimerInterval) clearInterval(lockTimerInterval);

  const totalDuration = unlockTime - startTime;

  const update = () => {
    const now = Date.now();
    const diff = unlockTime - now;

    // Progress Bar Logic
    const elapsed = now - startTime;
    let progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    if (progress > 100) progress = 100;
    if (progress < 0) progress = 0;

    const progressEl = document.getElementById('tg-lock-progress');
    if (progressEl) progressEl.style.width = `${progress}%`;

    const timerEl = document.getElementById('tg-lock-timer');
    const btn = document.getElementById('release-funds-btn') as HTMLButtonElement;
    const releaseControls = document.getElementById('tg-release-controls');
    const releaseInput = document.getElementById('tg-release-amount') as HTMLInputElement;

    if (diff <= 0) {
      if (timerEl) timerEl.textContent = 'Ready to Release';
      if (releaseControls) releaseControls.style.display = 'block';

      // Auto-fill max amount if empty
      if (releaseInput && !releaseInput.value) {
        const total = document.getElementById('tg-locked-amount')?.dataset.total;
        if (total) releaseInput.value = total;
      }

      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.classList.remove('tg-btn-secondary');
        btn.classList.add('tg-btn-primary');
      }
      if (lockTimerInterval) clearInterval(lockTimerInterval);
      return;
    }

    // Format time
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (timerEl) {
      timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
    if (releaseControls) releaseControls.style.display = 'none';
  };

  update();
  lockTimerInterval = setInterval(update, 1000);
}

async function openDashboard() {
  if (!userData) return;
  const result = await apiCall(`/dashboard/${userData.id}`);
  if (result.error) {
    addFeedMessage('Dashboard unavailable');
    return;
  }

  addFeedMessage('Dashboard opened');
  const data = JSON.stringify(result, null, 2);
  const win = window.open('', 'TiltGuard Dashboard', 'width=800,height=600');
  if (win) {
    win.document.write(`
      <html>
        <head><title>TiltGuard Dashboard</title>
        <style>body{font-family:monospace;padding:20px;background:#0f1419;color:#e1e8ed;}pre{background:#1a1f26;padding:15px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);}</style>
        </head>
        <body>
          <h1>ðŸŽ¯ TiltGuard Dashboard</h1>
          <pre>${data}</pre>
        </body>
      </html>
    `);
  }
}

async function openVault() {
  if (!userData) return;
  const result = await apiCall(`/vault/${userData.id}`);
  if (result.error) {
    alert('Vault data unavailable');
    return;
  }

  const data = JSON.stringify(result.vault, null, 2);
  const win = window.open('', 'TiltGuard Vault', 'width=600,height=500');
  if (win) {
    win.document.write(`
      <html>
        <head><title>TiltGuard Vault</title>
        <style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:white;}pre{background:#16213e;padding:15px;border-radius:8px;}</style>
        </head>
        <body>
          <h1>ðŸ”’ TiltGuard Vault</h1>
          <pre>${data}</pre>
        </body>
      </html>
    `);
  }
}

async function openWallet() {
  if (!userData) return;
  const result = await apiCall(`/wallet/${userData.id}`);
  if (result.error) {
    alert('Wallet data unavailable');
    return;
  }

  const data = JSON.stringify(result, null, 2);
  const win = window.open('', 'TiltGuard Wallet', 'width=600,height=500');
  if (win) {
    win.document.write(`
      <html>
        <head><title>TiltGuard Wallet</title>
        <style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:white;}pre{background:#16213e;padding:15px;border-radius:8px;}</style>
        </head>
        <body>
          <h1>ðŸ’° TiltGuard Wallet</h1>
          <pre>${data}</pre>
        </body>
      </html>
    `);
  }
}

async function openPremium() {
  const result = await apiCall('/premium/plans');
  if (result.error) {
    addFeedMessage('Premium plans unavailable');
    return;
  }

  const plans = result.plans.map((p: any) =>
    `${p.name} - $${p.price}/mo\n${p.features.join('\n')}`
  ).join('\n\n');

  const upgrade = confirm(`Available Plans:\n\n${plans}\n\nUpgrade to Premium?`);
  if (upgrade && userData) {
    const upgradeResult = await apiCall('/premium/upgrade', {
      method: 'POST',
      body: JSON.stringify({ userId: userData.id, plan: 'premium' })
    });
    if (upgradeResult.success) {
      userData.tier = 'premium';
      const tierEl = document.getElementById('tg-user-tier');
      if (tierEl) tierEl.textContent = 'Premium';
      addFeedMessage('Upgraded to Premium');
    }
  }
}

function saveVerificationHistory(data: any) {
  const history = JSON.parse(localStorage.getItem('tiltcheck_verification_history') || '[]');
  history.unshift(data);
  if (history.length > 20) history.pop(); // Keep last 20
  localStorage.setItem('tiltcheck_verification_history', JSON.stringify(history));
  renderVerificationHistory();
}

function renderVerificationHistory() {
  const list = document.getElementById('fv-history-list');
  if (!list) return;

  const history = JSON.parse(localStorage.getItem('tiltcheck_verification_history') || '[]');

  if (history.length === 0) {
    list.innerHTML = '<div class="tg-feed-item">No history yet</div>';
    return;
  }

  list.innerHTML = history.map((item: any) => `
    <div class="tg-history-item">
      <div class="tg-history-header">
        <span>Nonce: ${item.nonce}</span>
        <span>${new Date(item.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>Dice: <span class="tg-history-result">${item.result.dice.toFixed(2)}</span></span>
        <span>Crash: <span class="tg-history-result">${item.result.limbo.toFixed(2)}x</span></span>
      </div>
      <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
        <span style="font-size:9px; opacity:0.4; flex:1; overflow:hidden; text-overflow:ellipsis; font-family:monospace;">${item.result.hash}</span>
        <button class="tg-btn-icon tg-copy-hash" data-hash="${item.result.hash}" title="Copy Hash" style="width:20px; height:20px; font-size:12px; padding:0; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1);">ðŸ“‹</button>
      </div>
    </div>
  `).join('');
}

async function notifyBuddy(type: string, data: any) {
  // Check if feature is enabled
  const mirror = localStorage.getItem('tiltcheck_buddy_mirror') === 'true';
  if (!mirror) return;

  // Check if user is authenticated
  if (!userData || !authToken) return;

  try {
    const result = await apiCall('/buddy/notify', {
      method: 'POST',
      body: JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      })
    });

    if (result.success) {
      addFeedMessage(`ðŸ‘¥ Buddy notified: ${type}`);
      updateStatus('Buddy alert sent', 'buddy');
    }
  } catch (e) {
    console.error('[TiltGuard] Buddy notification failed:', e);
  }
}

function updateStatus(message: string, type: string = 'info') {
  const bar = document.getElementById('tg-status-bar');
  if (!bar) return;

  // Check buddy setting for buddy notifications
  if (type === 'buddy') {
    const mirror = localStorage.getItem('tiltcheck_buddy_mirror') === 'true';
    if (!mirror) return;
  }

  bar.textContent = message;
  bar.className = `tg-status-bar ${type}`;
  bar.style.display = 'block';

  // Auto hide after 3s unless thinking (which persists until cleared/changed)
  if (type !== 'thinking') {
    setTimeout(() => {
      if (bar.textContent === message) {
        bar.style.display = 'none';
      }
    }, 3000);
  }
}

if (typeof window !== 'undefined') {
  (window as any).TiltCheckSidebar = { create: createSidebar, updateLicense, updateGuardian, updateTilt, updateStats, notifyBuddy };
}
