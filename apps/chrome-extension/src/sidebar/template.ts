/* Copyright (c) 2026 TiltCheck. All rights reserved. */

export const SIDEBAR_TEMPLATE = `
    <div class="tg-header">
      <div class="tg-logo"><span class="tg-logo-mark">T</span>TiltCheck</div>
      <div class="tg-header-actions">
        <button class="tg-header-btn tg-advanced-only" id="tg-settings" title="Open settings panel">Settings</button>
        <button class="tg-header-btn" id="tg-minimize" title="Minimize panel">Minimize</button>
        <button class="tg-header-btn" id="tg-hide" title="Hide panel">Hide</button>
      </div>
    </div>
    <div id="tg-license-strip" class="tg-license-strip pending">License: scanning current site...</div>
    <div id="tg-status-bar" class="tg-status-bar" style="display: none;"></div>
    
    <div class="tg-content" id="tg-content">
      <!-- Auth Section -->
      <div class="tg-section" id="tg-auth-section">
        <div class="tg-auth-prompt">
          <h3>Welcome to TiltCheck</h3>
          <p>Demo is instant. Connect Discord when you want synced vault history and buddy alerts. No lectures, just better signals.</p>
          <button class="tg-btn tg-btn-primary" id="tg-discord-login">Connect with Discord</button>
          <div class="tg-auth-divider">You can stay in demo mode if you prefer</div>
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
          <button class="tg-btn-icon" id="tg-logout" title="Logout" aria-label="Logout">&#x00D7;</button>
        </div>
        <div class="tg-account-strip">
          <span id="tg-account-text">Demo mode is live</span>
          <button class="tg-btn tg-btn-primary tg-btn-inline" id="tg-connect-discord-inline">Connect Discord</button>
        </div>
        <div class="tg-focus-note">Quick tip: keep this minimized while you play, then expand when you want a clean reality check.</div>

        <!-- Quick Safety -->
        <div class="tg-section tg-emergency">
          <div class="tg-emergency-header">
            <div>
              <div class="tg-emergency-title">Emergency Lock</div>
              <div class="tg-emergency-sub">Immediate cool-down if things feel off</div>
            </div>
            <button class="tg-btn tg-btn-danger" id="tg-emergency-lock">Start 15-Min Break</button>
          </div>
        </div>

        <!-- Settings Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-settings-panel" style="display: none;">
          <h4>API Keys</h4>
          <div class="tg-input-group">
            <label>Primary AI Key</label>
            <input type="password" id="api-key-openai" />
          </div>
          <div class="tg-input-group">
            <label>Secondary AI Key</label>
            <input type="password" id="api-key-anthropic" />
          </div>
          <div class="tg-input-group">
            <label>Custom API</label>
            <input type="text" id="api-key-custom" />
          </div>
          <div class="tg-input-group" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <input type="checkbox" id="cfg-buddy-mirror" style="width: auto;" />
            <label for="cfg-buddy-mirror" style="margin: 0; font-size: 12px;">Mirror Buddy Notifications</label>
          </div>
          <button class="tg-btn tg-btn-primary" id="save-api-keys">Save Keys</button>
          <button class="tg-btn tg-btn-secondary" id="close-settings">Close</button>
        </div>

        <!-- Configurator Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-config-panel" style="display: none;">
          <h4>Site Mapper</h4>
          <div class="tg-input-group">
            <label>Bet Amount Selector</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="cfg-bet" placeholder=".bet-amount" style="flex:1;" />
              <button class="tg-btn-icon tg-picker-btn" data-target="cfg-bet" title="Pick Element">Pick</button>
              <button class="tg-btn-icon tg-test-btn" data-target="cfg-bet" title="Test Selector">Test</button>
            </div>
          </div>
          <div class="tg-input-group">
            <label>Game Result Selector</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="cfg-result" placeholder=".game-result" style="flex:1;" />
              <button class="tg-btn-icon tg-picker-btn" data-target="cfg-result" title="Pick Element">Pick</button>
              <button class="tg-btn-icon tg-test-btn" data-target="cfg-result" title="Test Selector">Test</button>
            </div>
          </div>
          <button class="tg-btn tg-btn-primary" id="save-config">Save Config</button>
          <button class="tg-btn tg-btn-secondary" id="close-config">Close</button>
        </div>

        <!-- Fairness Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-verifier-panel" style="display: none;">
          <h4>Fairness Check</h4>
          
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
                <button class="tg-btn-icon" id="fv-sync-nonce" title="Sync Nonce">Sync</button>
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
            <div>
              <h3>Active Session</h3>
              <div class="tg-session-site" id="tg-session-site">Unknown</div>
            </div>
            <div class="tg-guardian-indicator" id="tg-guardian-indicator"></div>
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
              <span class="tg-metric-label">Tilt <span class="tg-help" data-tip="Calculated from wager frequency and bet-size volatility.">?</span></span>
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
          <h4>Live Signals</h4>
          <div class="tg-feed" id="tg-message-feed">
            <div class="tg-feed-item">Monitoring active. No fluff.</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="tg-section">
          <h4>Quick Tools</h4>
          <button class="tg-btn tg-btn-secondary tg-advanced-toggle" id="tg-toggle-advanced" aria-pressed="false">Show Pro Tools</button>
          <div class="tg-action-grid">
            <button class="tg-action-btn" id="tg-open-linkcheck">LinkCheck</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-open-config">Site Setup</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-open-verifier">Fairness Check</button>
            <button class="tg-action-btn" id="tg-open-dashboard">Open Dashboard</button>
            <button class="tg-action-btn" id="tg-open-vault">Open Vault</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-wallet">Wallet Status</button>
            <button class="tg-action-btn tg-advanced-only" id="tg-upgrade">Unlock Premium</button>
          </div>
          <button class="tg-btn tg-btn-secondary tg-advanced-only" id="tg-open-report" style="margin-top: 8px;">Report Site Change</button>
        </div>

        <!-- LinkCheck Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-linkcheck-panel" style="display: none;">
          <h4>LinkCheck Scanner</h4>
          <div class="tg-input-group">
            <label>Check URL</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="linkcheck-url" style="flex:1;" />
              <button class="tg-btn-icon" id="linkcheck-scan-btn">Scan</button>
            </div>
          </div>
          <div id="linkcheck-result" style="display:none; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; margin-bottom: 10px;">
            <div id="linkcheck-score" style="font-weight: bold; margin-bottom: 4px;"></div>
            <div id="linkcheck-details" style="font-size: 11px; opacity: 0.8;"></div>
          </div>
          <button class="tg-btn tg-btn-secondary" id="close-linkcheck">Close</button>
        </div>

        <!-- Report Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-report-panel" style="display: none;">
          <h4>Community Signal</h4>
          <div class="tg-input-group">
            <label>Signal Type</label>
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
            <textarea id="report-details" rows="3" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;"></textarea>
          </div>
          <button class="tg-btn tg-btn-primary" id="submit-report">Send Signal</button>
          <button class="tg-btn tg-btn-secondary" id="close-report">Close</button>
        </div>

        <!-- Vault Section -->
        <div class="tg-section">
          <h4>Vault Balance</h4>
          <div class="tg-vault-amount" id="tg-vault-balance">$0.00</div>
          
          <!-- Custom Goals -->
          <div class="tg-goal-progress" id="tg-goal-progress" style="display: none;">
            <div class="tg-goal-label" id="tg-goal-label">Goal</div>
            <div class="tg-goal-bar">
              <div class="tg-goal-fill" id="tg-goal-fill" style="width: 0%;"></div>
            </div>
            <div class="tg-goal-meta" id="tg-goal-meta">$0 / $0</div>
          </div>
          <div id="tg-goals-list" style="margin-bottom: 10px;"></div>

          <!-- Inline Goal Form (hidden) -->
          <div id="tg-goal-form-panel" style="display:none; margin-bottom:8px; padding:10px; background:rgba(0,0,0,0.25); border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
            <div class="tg-input-group">
              <label>Goal Name</label>
              <input type="text" id="goal-form-name" placeholder="e.g. Power Bill" />
            </div>
            <div class="tg-input-group">
              <label>Target ($)</label>
              <input type="number" id="goal-form-amount" placeholder="100" min="1" />
            </div>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <button class="tg-btn tg-btn-primary tg-btn-inline" id="goal-form-save">Save Goal</button>
              <button class="tg-btn tg-btn-secondary tg-btn-inline" id="goal-form-cancel">Cancel</button>
            </div>
          </div>

          <div class="tg-vault-actions">
            <button class="tg-btn tg-btn-vault" id="tg-vault-btn">Vault Balance</button>
            <button class="tg-btn tg-btn-secondary" id="tg-vault-custom">Custom Amount</button>
          </div>
          <button class="tg-btn tg-btn-secondary" id="tg-add-goal" style="margin-top: 8px; font-size: 11px;">+ Add Withdraw Goal</button>
          
          <!-- Lock Timer Wallet -->
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="font-size: 11px; margin-bottom: 6px;">Lock Timer Wallet</h4>
            
            <div id="tg-lock-form">
              <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <input type="number" id="lock-timer-mins" style="width: 60px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 4px;" />
                <button class="tg-btn tg-btn-primary" id="start-lock-timer" style="margin: 0; padding: 4px 8px; font-size: 11px;">Lock Funds</button>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 10px; opacity: 0.7; line-height: 1.3;">
                <input type="checkbox" id="lock-agree" style="margin-top: 2px;" />
                <label for="lock-agree">I voluntarily lock these funds. They cannot be accessed until the timer expires.</label>
              </div>
            </div>

            <div id="tg-lock-status" style="display: none; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>Locked (SOL):</span>
                <span id="tg-locked-amount" style="color: #fbbf24; font-weight: bold;">0.0000 SOL</span>
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
                 <input type="number" id="tg-release-amount" placeholder="Amount to release (SOL)" style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff; font-size: 12px; margin-bottom: 5px;" />
                 <div style="font-size: 10px; opacity: 0.6; text-align: right;">Leave empty to release all (SOL)</div>
              </div>

              <button class="tg-btn tg-btn-secondary" id="release-funds-btn" disabled style="width: 100%; padding: 6px; font-size: 11px; opacity: 0.5; cursor: not-allowed;">Release Funds</button>
            </div>
          </div>

          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="font-size: 11px; margin-bottom: 6px;">Vault Timeline</h4>
            <div id="tg-vault-timeline" class="tg-vault-timeline">
              <div class="tg-vault-timeline-empty">No vault activity yet. Your wins will show up here.</div>
            </div>
          </div>
        </div>

        <!-- Export -->
        <div class="tg-section">
          <button class="tg-btn tg-btn-secondary" id="tg-export-session">Export Session</button>
        </div>
        <!-- Premium Upgrade Panel (hidden) -->
        <div class="tg-settings-panel" id="tg-premium-panel" style="display:none;">
          <h4>Unlock Premium</h4>
          <div style="margin-bottom:8px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size:12px; font-weight:700;">Free</span>
              <span style="font-size:11px; color:var(--tg-muted);">$0/mo</span>
            </div>
            <ul style="font-size:11px; opacity:0.55; padding-left:16px; line-height:1.9; margin:0;">
              <li>Basic tilt alerts</li>
              <li>Community feed</li>
            </ul>
          </div>
          <div style="margin-bottom:12px; padding:10px; background:rgba(0,255,198,0.05); border-radius:8px; border:1px solid rgba(0,255,198,0.2);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size:12px; font-weight:700; color:#00FFC6;">Premium</span>
              <span style="font-size:11px; color:var(--tg-muted);">$5/mo</span>
            </div>
            <ul style="font-size:11px; opacity:0.55; padding-left:16px; line-height:1.9; margin:0;">
              <li>Priority alerts</li>
              <li>Advanced vault controls</li>
              <li>Buddy mirror</li>
              <li>AI tilt analysis</li>
            </ul>
          </div>
          <button class="tg-btn tg-btn-primary" id="tg-upgrade-confirm">Upgrade Now &#x2192;</button>
          <button class="tg-btn tg-btn-secondary" id="tg-premium-close">Cancel</button>
        </div>
        <div class="tg-brand-footer">Made for degens, by degens • © 2026 TiltCheck</div>
      </div>
    </div>

    <div class="tg-toast" id="tg-toast" style="display:none;"></div>
`;
