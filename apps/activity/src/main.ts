// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

/// <reference types="vite/client" />

import { DiscordBridge } from './sdk/DiscordBridge.js';
import { HubRelay } from './sdk/HubRelay.js';
import { SessionState } from './state/SessionState.js';
import { AnalyzerView } from './views/AnalyzerView.js';
import { GameView } from './views/GameView.js';
import { VaultView } from './views/VaultView.js';
import { BonusFeedView } from './views/BonusFeedView.js';
import { LeaderboardView } from './views/LeaderboardView.js';

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1445916179163250860';
const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://hub.tiltcheck.me';
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard.tiltcheck.me';

async function main(): Promise<void> {
  const statusEl = document.getElementById('sdk-status');
  const setStatus = (msg: string) => { if (statusEl) statusEl.textContent = msg; };

  setStatus('CONNECTING...');

  // --------------------------------------------------------
  // 1. Initialize shared state
  // --------------------------------------------------------
  const state = new SessionState();

  // --------------------------------------------------------
  // 2. Discord SDK
  // --------------------------------------------------------
  const bridge = new DiscordBridge(DISCORD_CLIENT_ID);
  let discordState;
  try {
    discordState = await bridge.initialize();
    state.setIdentity(discordState.userId, discordState.username);
    state.setParticipantCount(discordState.participants.length || 1);
    state.setOrientation(discordState.orientation);
    setStatus('CONNECTED');
  } catch (err) {
    console.error('[Activity] Discord init failed:', err);
    setStatus('DEMO MODE');
    // Fall back to demo mode — allow browsing without SDK
    state.setIdentity('demo', 'DEMO DEGEN');
  }

  // --------------------------------------------------------
  // 3. Hub relay
  // --------------------------------------------------------
  const relay = new HubRelay({
    url: HUB_URL,
    userId: state.userId,
    channelId: discordState?.channelId ?? 'demo-channel'
  });
  relay.connect();

  relay.on('connected', (connected: unknown) => {
    setStatus(connected ? 'LIVE' : 'RECONNECTING...');
  });

  relay.on('session.update', (data: unknown) => {
    const d = data as { userId: string; username: string; rounds: Array<{ bet: number; win: number; timestamp: number }> };
    if (d.userId !== state.userId) {
      state.updateChannelSession(d.userId, d.username, d.rounds);
    }
  });

  relay.on('bonus.available', (data: unknown) => {
    const b = data as { id: string; casinoName: string; description: string; nextClaimAt?: string; is_expired?: boolean; is_verified?: boolean };
    state.addBonus({
      id: b.id,
      casinoName: b.casinoName,
      description: b.description,
      nextClaimAt: b.nextClaimAt ?? null,
      is_expired: b.is_expired ?? false,
      is_verified: b.is_verified ?? false
    });
  });

  // --------------------------------------------------------
  // 4. Discord SDK event bindings
  // --------------------------------------------------------
  bridge.on('participants', (participants: unknown) => {
    const p = participants as Array<{ id: string }>;
    state.setParticipantCount(p.length);
  });

  bridge.on('orientation', (o: unknown) => {
    state.setOrientation(o as 'landscape' | 'portrait');
    document.body.dataset.orientation = o as string;
  });

  bridge.on('voiceState', (active: unknown) => {
    state.setVoiceActive(active as boolean);
  });

  // --------------------------------------------------------
  // 5. Mount views
  // --------------------------------------------------------
  const analyzerContainer = document.getElementById('view-analyzer');
  const gameContainer = document.getElementById('view-game');
  const vaultContainer = document.getElementById('view-vault');
  const bonusContainer = document.getElementById('view-bonus');
  const leaderboardContainer = document.getElementById('view-leaderboard');

  if (analyzerContainer) {
    new AnalyzerView(analyzerContainer, state).mount();
  }

  if (gameContainer) {
    new GameView(gameContainer, state, relay).mount();
  }

  if (vaultContainer) {
    await new VaultView(vaultContainer, state, state.userId).mount();
  }

  if (bonusContainer) {
    await new BonusFeedView(bonusContainer, state, state.userId).mount();
  }

  if (leaderboardContainer) {
    new LeaderboardView(leaderboardContainer, state).mount();
  }

  // --------------------------------------------------------
  // 6. Top-level navigation
  // --------------------------------------------------------
  document.querySelectorAll('.nav-tab[data-view]').forEach(tab => {
    tab.addEventListener('click', () => {
      const view = (tab as HTMLElement).dataset.view!;
      state.setView(view);
      document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
      document.getElementById(`view-${view}`)?.classList.add('active');
      tab.classList.add('active');
    });
  });

  // --------------------------------------------------------
  // 7. Global action buttons
  // --------------------------------------------------------
  document.getElementById('btn-open-dashboard')?.addEventListener('click', () => {
    bridge.openExternalLink(`${DASHBOARD_URL}?ref=activity`);
  });

  document.getElementById('btn-invite-buddy')?.addEventListener('click', () => {
    bridge.inviteUserToActivity();
  });

  // --------------------------------------------------------
  // 8. Rich presence — update Discord profile status
  // --------------------------------------------------------
  const updatePresence = () => {
    const rounds = state.rounds;
    const netPL = rounds.reduce((s, r) => s + r.win - r.bet, 0);
    const sign = netPL >= 0 ? '+' : '';
    bridge.setRichPresence(
      `Session P/L: ${sign}$${Math.abs(netPL).toFixed(2)}`,
      `Playing on TiltCheck`
    ).catch(() => {});
  };

  state.on('rounds', updatePresence);
}

main().catch(err => console.error('[Activity] Fatal error:', err));
