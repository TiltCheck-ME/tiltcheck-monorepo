/* © 2026 TiltCheck Ecosystem. All Rights Reserved. */

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
    window.addEventListener('message', (event) => {
      if (event.data.type === 'discord-auth') {
        const { user } = event.data;
        console.log('[TiltCheck] Identity established:', user.username);
        this.relay.setUserId(user.id);
        // Refresh HUD if needed (e.g. show username)
        alert(`Reality Check: Connected as ${user.username}`);
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
    const width = 500;
    const height = 750;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    const authUrl = `https://api.tiltcheck.me/auth/discord/login?source=extension&opener_origin=${encodeURIComponent(window.location.origin)}`;
    
    window.open(
      authUrl, 
      'TiltCheck - Discord Connect', 
      `width=${width},height=${height},top=${top},left=${left}`
    );
  }
}

// Kickoff
if (typeof window !== 'undefined') {
  new RealityCheckOrchestrator();
}
