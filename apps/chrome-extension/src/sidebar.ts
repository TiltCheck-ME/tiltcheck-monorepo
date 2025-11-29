/**
 * TiltGuard Sidebar - Fully Functional UI
 * Features: Discord auth, vault, dashboard, wallet, session export, premium upgrades
 */

const API_BASE = 'https://api.tiltcheck.me';
let authToken: string | null = null;
let showSettings = false;
let apiKeys: any = {
  openai: '',
  anthropic: '',
  custom: ''
};

let isAuthenticated = false;
let userData: any = null;
let sessionStats = {
  startTime: Date.now(),
  totalBets: 0,
  totalWagered: 0,
  totalWins: 0,
  currentBalance: 0
};

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

function createSidebar() {
  const existing = document.getElementById('tiltguard-sidebar');
  if (existing) existing.remove();

  const sidebar = document.createElement('div');
  sidebar.id = 'tiltguard-sidebar';
  sidebar.innerHTML = `
    <div class="tg-header">
      <div class="tg-logo">TiltGuard</div>
      <div class="tg-header-actions">
        <button class="tg-icon-btn" id="tg-settings" title="Settings">⚙</button>
        <button class="tg-icon-btn" id="tg-minimize" title="Minimize">−</button>
      </div>
    </div>
    
    <div class="tg-content" id="tg-content">
      <!-- Auth Section -->
      <div class="tg-section" id="tg-auth-section">
        <div class="tg-auth-prompt">
          <h3>Sign In</h3>
          <p>Authenticate to sync data and access vault</p>
          <button class="tg-btn tg-btn-primary" id="tg-discord-login">Discord Login</button>
          <div class="tg-auth-divider">or</div>
          <button class="tg-btn tg-btn-secondary" id="tg-guest-mode">Guest Mode</button>
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
          <button class="tg-btn-icon" id="tg-logout" title="Logout">×</button>
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
          <button class="tg-btn tg-btn-primary" id="save-api-keys">Save Keys</button>
          <button class="tg-btn tg-btn-secondary" id="close-settings">Close</button>
        </div>

        <!-- Active Session Metrics (TOP PRIORITY) -->
        <div class="tg-metrics-card">
          <div class="tg-metrics-header">
            <h3>Active Session</h3>
            <div class="tg-guardian-indicator" id="tg-guardian-indicator">●</div>
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
            <button class="tg-action-btn" id="tg-open-dashboard">Dashboard</button>
            <button class="tg-action-btn" id="tg-open-vault">Vault</button>
            <button class="tg-action-btn" id="tg-wallet">Wallet</button>
            <button class="tg-action-btn" id="tg-upgrade">Upgrade</button>
          </div>
        </div>

        <!-- Vault Section -->
        <div class="tg-section">
          <h4>Vault Balance</h4>
          <div class="tg-vault-amount" id="tg-vault-balance">$0.00</div>
          <div class="tg-vault-actions">
            <button class="tg-btn tg-btn-vault" id="tg-vault-btn">Vault Balance</button>
            <button class="tg-btn tg-btn-secondary" id="tg-vault-custom">Custom Amount</button>
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
    #tiltguard-sidebar {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 340px;
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
    #tiltguard-sidebar.minimized { transform: translateX(300px); width: 40px; }
    body.tiltguard-minimized { margin-right: 40px !important; }
    #tiltguard-sidebar::-webkit-scrollbar { width: 6px; }
    #tiltguard-sidebar::-webkit-scrollbar-track { background: transparent; }
    #tiltguard-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
    
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
  `;

  document.head.appendChild(style);
  document.body.appendChild(sidebar);
  setupEventListeners();
  checkAuthStatus();
  return sidebar;
}

function setupEventListeners() {
  document.getElementById('tg-minimize')?.addEventListener('click', () => {
    const sidebar = document.getElementById('tiltguard-sidebar');
    const btn = document.getElementById('tg-minimize');
    const isMin = sidebar?.classList.toggle('minimized');
    document.body.classList.toggle('tiltguard-minimized', isMin);
    document.body.style.marginRight = isMin ? '40px' : '340px';
    if (btn) btn.textContent = isMin ? '+' : '−';
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
  
  document.getElementById('tg-discord-login')?.addEventListener('click', async () => {
    // Open Discord OAuth in new window
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const authWindow = window.open(
      `${API_BASE}/auth/discord`,
      'Discord Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for auth response
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'discord-auth' && event.data.token) {
        authToken = event.data.token;
        userData = event.data.user;
        isAuthenticated = true;
        localStorage.setItem('tiltguard_auth', JSON.stringify(userData));
        localStorage.setItem('tiltguard_token', authToken);
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
  
  document.getElementById('tg-guest-mode')?.addEventListener('click', continueAsGuest);
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
    console.log('🎮 TiltGuard: Authentication required');
    return;
  }
  
  if (stored && token) {
    userData = JSON.parse(stored);
    authToken = token;
    isAuthenticated = true;
    showMainContent();
    loadVaultBalance();
    initPnLGraph();
  }
}

async function continueAsGuest() {
  const result = await apiCall('/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ username: 'Guest' })
  });
  
  if (result.success) {
    authToken = result.token;
    userData = result.user;
    isAuthenticated = true;
    localStorage.setItem('tiltguard_auth', JSON.stringify(userData));
    localStorage.setItem('tiltguard_token', authToken);
    showMainContent();
    addFeedMessage('Guest session started');
  } else {
    alert('Failed to start guest session');
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
    addFeedMessage(`✓ Licensed: ${verification.licenseInfo?.authority || 'Verified'}`);
  } else {
    addFeedMessage(`⚠ ${verification.verdict || 'Unlicensed'}`);
  }
}

function updateGuardian(active: boolean) {
  const indicator = document.getElementById('tg-guardian-indicator');
  if (indicator) {
    indicator.className = active ? 'tg-guardian-indicator' : 'tg-guardian-indicator inactive';
  }
  addFeedMessage(active ? 'Guardian activated' : 'Guardian deactivated');
}

function updateTilt(score: number, _indicators: string[]) {
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
    addFeedMessage(`⚠️ High tilt detected: ${Math.round(score)}`);
  }
}

function updateStats(stats: any) {
  sessionStats = { ...sessionStats, ...stats };
  const duration = Math.floor((Date.now() - stats.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const profit = stats.totalWins - stats.totalWagered;
  const rtp = stats.totalWagered > 0 ? (stats.totalWins / stats.totalWagered * 100) : 0;
  
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
          <h1>🎯 TiltGuard Dashboard</h1>
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
          <h1>🔒 TiltGuard Vault</h1>
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
          <h1>💰 TiltGuard Wallet</h1>
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

if (typeof window !== 'undefined') {
  (window as any).TiltGuardSidebar = { create: createSidebar, updateLicense, updateGuardian, updateTilt, updateStats };
}
