/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-27 */

/**
 * Reality Check v2 - Orchestrator
 * 
 * Rebuilt from scratch for the "Pivoted Platform" requirements.
 * Zero-Custody. Surgical Telemetry. Non-Overlay HUD.
 */

import { StakeSensor } from './sensors/StakeSensor.js';
import { RealityHUD } from './hud/Sidebar.js';
import { HubRelay } from './telemetry/HubRelay.js';

class RealityCheckOrchestrator {
  private sensor: StakeSensor;
  private hud: RealityHUD;
  private relay: HubRelay;
  private isStake: boolean;

  constructor() {
    const host = window.location.hostname;
    this.isStake = host.includes('stake.us') || host.includes('stake.com');
    
    // 1. Initialize Components
    this.sensor = new StakeSensor(host.includes('stake.us'));
    this.hud = new RealityHUD();
    this.relay = new HubRelay();

    this.init();
  }

  private async init() {
    console.log('[TiltCheck] Reality Check v2: ONLINE.');

    // 2. Setup HUD Listeners
    this.setupHUDListeners();

    // 3. Start Sensory Input (Stake Priority)
    if (this.isStake) {
      await this.sensor.initialize();
      this.sensor.start((round) => {
        // Update HUD (Local)
        this.hud.updateRound(round);
        
        // Push to Hub (Global / Discord Activity)
        this.relay.pushRound(round);
      });
      
      // Auto-show HUD if compatible
      this.hud.toggle(true);
    }
    
    // 4. Handle Auth Handoff
    // Auth result is written to chrome.storage.local by auth-bridge.js.
    // Listen for storage changes to detect when the user has connected Discord.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.userData) return;
      const user = changes.userData.newValue as { id?: string; username?: string } | undefined;
      if (user?.id) {
        console.log('[TiltCheck] Identity established:', user.username);
        this.relay.setUserId(user.id);
      }
    });
  }

  private setupHUDListeners() {
    const btnBrake = document.getElementById('hud-btn-brake');

    btnBrake?.addEventListener('click', () => {
      // Future: Real-world spending comparison popup
      console.log('[TiltCheck] Brake triggered.');
    });

    // Handle initial connection if not linked
    if (!this.relay.getUserId()) {
       const connectBtn = document.createElement('button');
       connectBtn.className = 'hud-btn hud-btn-primary';
       connectBtn.textContent = 'CONNECT DISCORD';
       connectBtn.style.marginTop = '12px';
       connectBtn.onclick = () => this.initiateDiscordAuth();
       
       document.querySelector('.hud-content')?.prepend(connectBtn);
    }
  }

  private initiateDiscordAuth() {
    // Route through the background service worker so auth-bridge.html is the
    // opener. auth-bridge.js sets opener_origin to its own chrome-extension://
    // origin, which is the only origin the API trusts for postMessage delivery.
    // Opening the popup directly from a content-script page would pass the
    // casino-page origin, causing "Missing trusted extension origin" at callback.
    const authUrl = `https://api.tiltcheck.me/auth/discord/login?source=extension`;
    chrome.runtime.sendMessage({ type: 'open_auth_bridge', url: authUrl }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        console.error('[TiltCheck] Could not open Discord auth bridge:', chrome.runtime.lastError?.message);
      }
    });
  }
}

// Kickoff
if (typeof window !== 'undefined') {
  new RealityCheckOrchestrator();
}
