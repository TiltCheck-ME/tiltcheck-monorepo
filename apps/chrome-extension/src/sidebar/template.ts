/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */

export const SIDEBAR_TEMPLATE = `
    <div class="tg-header">
      <div class="tg-header-brand">
        <div class="tg-logo-icon"><span class="tg-logo-mark">T</span></div>
        <div class="tg-logo-copy">
          <span class="tg-logo-text">TILTCHECK</span>
          <span class="tg-logo-sub">The Degen Audit Layer</span>
        </div>
      </div>
      <div class="tg-header-actions">
        <button class="tg-header-btn tg-advanced-only" id="tg-settings" title="Settings">SET</button>
        <button class="tg-header-btn" id="tg-minimize" title="Minimize">−</button>
        <button class="tg-header-btn" id="tg-hide" title="Close">×</button>
      </div>
    </div>
    <div id="tg-license-strip" class="tg-license-strip pending">License: scanning current site...</div>
    <div id="tg-status-bar" class="tg-status-bar" style="display: none;"></div>
    
    <div class="tg-content" id="tg-content">
      <!-- Auth Section -->
      <div class="tg-section" id="tg-auth-section">
        <div class="tg-auth-prompt">
          <h3>TILTCHECK ACTIVE</h3>
          <p>Connect Discord to sync vault history, live session signals, and casino telemetry across the ecosystem. No lectures, just math.</p>
          <button class="tg-btn tg-btn-primary" id="tg-discord-login">Connect with Discord</button>
          <button class="tg-btn tg-btn-secondary" id="tg-guest-login" style="margin-top: 8px;">Continue as Guest</button>
        </div>
      </div>

      <!-- Main Content (hidden until auth) -->
      <div id="tg-main-content" style="display: none;">
        <!-- User Bar -->
        <div class="tg-user-bar">
          <div class="tg-user-info">
            <span id="tg-username">Guest</span>
            <span class="tg-tier" id="tg-user-tier">Verified User</span>
          </div>
          <button class="tg-btn-icon" id="tg-logout" title="Logout" aria-label="Logout">&#x00D7;</button>
        </div>
        <div class="tg-account-strip">
          <span id="tg-account-text">Demo mode is live</span>
          <button class="tg-btn tg-btn-primary tg-btn-inline" id="tg-connect-discord-inline">Connect Discord</button>
        </div>
        <div class="tg-focus-note">Quick tip: keep this minimized while you play, then expand when you want a clean reality check.</div>

        <!-- Reality Check Bot -->
        <div class="tg-section tg-emergency">
          <div class="tg-emergency-header">
            <div style="flex: 1;">
              <div class="tg-emergency-title">TILTCHECK INTERVENTION</div>
              <div class="tg-emergency-sub">The house is farming you. Use the EMERGENCY BRAKE to lock your gains on-chain before you give it all back.</div>
            </div>
            <button class="tg-btn tg-btn-danger" id="tg-emergency-lock" style="width: auto; padding: 10px 16px;">EMERGENCY BRAKE</button>
          </div>
        </div>

        <div class="tg-section">
          <h4>Redeem-to-Win</h4>
          <div class="tg-input-group">
            <label>Cash-out line for <span id="tg-redeem-site-label">this site</span></label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="tg-redeem-threshold" min="0" step="0.01" placeholder="0.00" style="flex: 1;" />
              <button class="tg-btn tg-btn-primary tg-btn-inline" id="tg-save-redeem-threshold">Arm</button>
            </div>
            <div style="font-size: 11px; opacity: 0.65; margin-top: 6px;">
              Set 0 to disable the redeem nudge on this casino.
            </div>
          </div>
        </div>

        <!-- Settings Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-settings-panel" style="display: none;">
          <h4>Sidebar Settings</h4>
          <div class="tg-input-group" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <input type="checkbox" id="cfg-buddy-mirror" style="width: auto;" />
            <label for="cfg-buddy-mirror" style="margin: 0; font-size: 12px;">Mirror Buddy Alerts In Discord</label>
          </div>
          <div style="font-size: 10px; opacity: 0.65; margin-top: 8px;">
            Quick mirror only. Buddy roster and approvals stay dashboard-owned.
          </div>
          <button class="tg-btn tg-btn-secondary" id="tg-open-buddies" style="margin-top: 10px;">Open Buddy Controls</button>
          <button class="tg-btn tg-btn-secondary" id="close-settings">Close</button>
        </div>

        <!-- Reality Check Log -->
        <div class="tg-metrics-card">
          <div class="tg-metrics-header" style="margin-bottom: 24px;">
            <div style="flex: 1;">
              <h1 class="tg-hud-label">THE PROJECTED</h1>
              <h2 class="tg-hud-title" style="color: var(--tg-muted); opacity: 0.5;">HOUSE ALWAYS WINS</h2>
            </div>
            <div id="tg-status-indicator" class="tg-status-indicator"></div>
          </div>

          <div class="tg-metric-stack">
            <h1 class="tg-hud-label">THE REALITY</h1>
            <div class="tg-drift-main">
              <span class="tg-drift-value" id="tg-rtp">--</span>
              <span class="tg-drift-label">ACTUAL RTP</span>
            </div>
          </div>

          <div class="tg-metrics-grid" style="margin-top: 24px; border-top: 1px solid var(--tg-border); padding-top: 20px;">
            <div class="tg-metric">
              <span class="tg-metric-label">Volatility</span>
              <span class="tg-metric-value" id="tg-score-value">0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Wagered</span>
              <span class="tg-metric-value" id="tg-wagered">$0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Rounds</span>
              <span class="tg-metric-value" id="tg-bets">0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Session P/L</span>
              <span class="tg-metric-value" id="tg-profit">$0</span>
            </div>
          </div>
          <div class="tg-session-site" id="tg-session-site" style="margin-top: 12px; text-align: center;">Scanning Casino Environment...</div>
        </div>

        <!-- P/L Graph -->
        <div class="tg-section">
          <h4>Profit/Loss</h4>
          <div class="tg-graph" id="tg-pnl-graph">
            <canvas id="pnl-canvas" width="300" height="120"></canvas>
          </div>
        </div>

        <!-- Reality Check Log (Formerly Message Feed) -->
        <div class="tg-section">
          <h4>Session History Log</h4>
          <div class="tg-feed" id="tg-message-feed">
            <div class="tg-feed-item">Monitoring active. No fluff.</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="tg-section">
          <h4>Quick Tools</h4>
          <button class="tg-btn tg-btn-secondary tg-advanced-toggle" id="tg-toggle-advanced" aria-pressed="false">Show Pro Tools</button>
          <div class="tg-action-grid">
            <button class="tg-action-btn" id="tg-open-predictor">BONUS SCANNER</button>
            <button class="tg-action-btn" id="tg-open-dashboard">THE DASHBOARD</button>
          </div>
          <button class="tg-btn tg-btn-secondary tg-advanced-only" id="tg-open-report" style="margin-top: 8px;">Report Site Change</button>
        </div>

        <!-- Report Panel (toggleable) -->
        <div class="tg-settings-panel tg-advanced-only" id="tg-report-panel" style="display: none;">
          <h4>THE TILT SIGNAL</h4>
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

        <!-- Bonus Radar Panel -->
        <div class="tg-settings-panel" id="tg-predictor-panel" style="display: none;">
          <h4>Bonus Radar</h4>
          <div id="predictor-list" class="tg-feed" style="max-height: 250px;">
            <div class="tg-feed-item">Fetching drop windows...</div>
          </div>
          <div style="font-size: 10px; opacity: 0.5; margin-top: 10px; font-style: italic;">
            * Predictions are based on historical social media activity and community signals.
          </div>
          <button class="tg-btn tg-btn-secondary" id="close-predictor" style="margin-top: 10px;">Close</button>
        </div>

        <!-- Vault Section -->
        <div class="tg-section">
          <h4>Vault Balance</h4>
          <div class="tg-vault-amount" id="tg-vault-balance">$0.00</div>
          
          <!-- Auto-Vault (API Backdoor) -->
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="font-size: 11px; margin: 0;">THE AUTO-BAG SECURE (API)</h4>
              <div class="tg-toggle-wrapper">
                <input type="checkbox" id="tg-autovault-toggle" class="tg-toggle-input" />
                <label for="tg-autovault-toggle" class="tg-toggle-label"></label>
              </div>
            </div>
            <div id="tg-autovault-controls" style="display: none; background: rgba(0,255,198,0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(0,255,198,0.1);">
              <div class="tg-input-group" style="margin-bottom: 8px;">
                <label style="font-size: 10px; opacity: 0.7;">Quick-save % of profit</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="range" id="tg-autovault-pct" min="5" max="50" step="5" value="10" style="flex: 1;" />
                  <span id="tg-autovault-pct-val" style="font-size: 12px; font-weight: bold; width: 30px;">10%</span>
                </div>
              </div>
              <div style="font-size: 9px; opacity: 0.6; line-height: 1.4;">
                Session quick-save only. Durable vault rules and wallet safety settings stay dashboard-owned.
              </div>
              <div id="tg-autovault-stats" style="margin-top: 8px; font-size: 10px; border-top: 1px solid rgba(0,255,198,0.1); padding-top: 6px; display: flex; justify-content: space-between;">
                <span>Session Secured:</span>
                <span id="tg-autovault-secured" style="color: #00FFC6;">0.00 --</span>
              </div>
              <button class="tg-btn tg-btn-secondary" id="tg-open-vault" style="margin-top: 10px;">Open Vault Controls</button>
            </div>
          </div>

          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="font-size: 11px; margin-bottom: 6px;">Vault Timeline</h4>
            <div id="tg-vault-timeline" class="tg-vault-timeline">
              <div class="tg-vault-timeline-empty">No vault activity yet. Your wins will show up here.</div>
            </div>
          </div>
        </div>

        <!-- Daily Bonuses Section -->
        <div class="tg-section tg-bonuses-section">
          <div class="tg-bonuses-header">
            <h4 style="margin:0;">DAILY BONUSES</h4>
            <div class="tg-bonuses-controls">
              <button class="tg-btn-link" id="tg-bonuses-refresh">[REFRESH]</button>
              <button class="tg-btn-link" id="tg-bonuses-toggle">[EXPAND]</button>
            </div>
          </div>
          <div id="tg-bonuses-body" style="display:none;">
            <div id="tg-bonuses-list">
              <div class="tg-bonus-empty">Loading bonuses...</div>
            </div>
            <div class="tg-bonuses-footer">
              <a href="https://tiltcheck.me/bonuses" target="_blank" rel="noopener noreferrer" class="tg-bonuses-viewall">View all at tiltcheck.me/bonuses</a>
            </div>
          </div>
        </div>
        <div class="tg-brand-footer">Made for Degens. By Degens. • © 2026 TiltCheck</div>
      </div>
    </div>

    <div class="tg-toast" id="tg-toast" style="display:none;"></div>

    <!-- Vibe Check Overlay -->
    <div id="tg-vibe-check-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 2147483647; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; color: #fff; font-family: 'JetBrains Mono', monospace;">
      <div style="font-size: 32px; margin-bottom: 20px; letter-spacing: 0.2em;">ALERT</div>
      <h2 style="font-size: 32px; color: #ff3366; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">SESSION PAUSE</h2>
      <p style="font-size: 18px; margin-bottom: 30px; max-width: 500px;">The Reality Check Bot just caught you rage-betting. You're about to fumble the bag. Either lock your profits now or go touch grass.</p>
      
      <div id="vibe-check-gif" style="width: 300px; height: 300px; background: #222; margin-bottom: 30px; border: 2px solid #ff3366; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 12px;">
        <!-- GIF will be injected here -->
        <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMThqOHF4YTh2eGgxNzhxZnx8fGVufDB8fHw%3D/v1.gif" alt="Wake up" style="width: 100%; height: 100%; object-fit: cover;">
      </div>

      <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
        <button class="tg-btn tg-btn-danger" id="vibe-lock-bag" style="padding: 15px 30px; font-size: 18px;">SECURE THE BAG</button>
        <button class="tg-btn tg-btn-secondary" id="vibe-discord" style="padding: 15px 30px; font-size: 18px;">GET YELLED AT (DISCORD)</button>
        <button class="tg-btn tg-btn-outline" id="vibe-ignore" style="padding: 15px 30px; font-size: 14px; opacity: 0.5;">IGNORE (FUMBLE IT)</button>
      </div>
    </div>

    <!-- Onboarding Overlay -->
    <div id="onboarding-overlay">
      <div class="onboarding-tooltip">
        <div class="tooltip-title">Welcome</div>
        <div class="tooltip-body">Let's walk through the Reality Check Pro tools.</div>
        <div class="tooltip-footer">
          <div class="tooltip-progress">1 / 4</div>
          <div class="tooltip-actions">
            <button class="tooltip-btn" id="ob-skip">Skip</button>
            <button class="tooltip-btn primary" id="ob-next">Next</button>
          </div>
        </div>
      </div>
    </div>
`;
