// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20

/// <reference types="vite/client" />

import { DiscordBridge } from './sdk/DiscordBridge.js';
import { HubRelay } from './sdk/HubRelay.js';
import { SessionState } from './state/SessionState.js';
import { AnalyzerView } from './views/AnalyzerView.js';
import { GameView } from './views/GameView.js';
import { VaultView } from './views/VaultView.js';
import { BonusFeedView } from './views/BonusFeedView.js';
import { LeaderboardView } from './views/LeaderboardView.js';
import { TipView } from './views/TipView.js';
import { HomeView } from './views/HomeView.js';
import { RecapView } from './views/RecapView.js';
import { DASHBOARD_URL, DISCORD_CLIENT_ID, HUB_URL } from './config.js';
import type { ActivityView } from './state/SessionState.js';

const VIEWS: ActivityView[] = ['home', 'play', 'bonuses', 'recap'];

function renderModuleFallback(container: HTMLElement, title: string): void {
  container.innerHTML = `
    <div class="shell-card shell-fallback-card">
      <div class="shell-card-header">
        <div>
          <p class="shell-eyebrow">Safe fallback</p>
          <h2 class="shell-title">${title}</h2>
        </div>
        <span class="stage-pill stage-lobby">Held</span>
      </div>
      <p class="shell-copy">This module failed soft. The shell stays alive so Discord does not white-screen.</p>
    </div>
  `;
}

async function safeMount(container: HTMLElement | null, title: string, mount: () => Promise<void> | void): Promise<void> {
  if (!container) {
    return;
  }

  try {
    await mount();
  } catch (error) {
    console.error(`[Activity] ${title} mount failed:`, error);
    renderModuleFallback(container, title);
  }
}

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
  let discordState = bridge.getState();
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
  document.body.dataset.orientation = state.orientation;

  // --------------------------------------------------------
  // 3. Hub relay
  // --------------------------------------------------------
  const relay = new HubRelay({
    url: HUB_URL,
    userId: state.userId,
    channelId: discordState?.channelId ?? 'demo-channel',
    accessToken: bridge.getAccessToken(),
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

  const applyView = (view: ActivityView) => {
    state.setView(view);
    document.querySelectorAll<HTMLElement>('.view-content').forEach((el) => {
      el.classList.toggle('active', el.id === `view-${view}`);
    });
    document.querySelectorAll<HTMLElement>('.nav-tab[data-view]').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === view);
    });
  };

  // --------------------------------------------------------
  // 5. Mount views
  // --------------------------------------------------------
  const homeShellContainer = document.getElementById('view-home-shell');
  const analyzerContainer = document.getElementById('view-home-analyzer');
  const gameContainer = document.getElementById('view-play-game');
  const bonusContainer = document.getElementById('view-bonuses-feed');
  const vaultContainer = document.getElementById('view-bonuses-vault');
  const tipContainer = document.getElementById('view-bonuses-tip');
  const recapShellContainer = document.getElementById('view-recap-shell');
  const leaderboardContainer = document.getElementById('view-recap-leaderboard');

  await Promise.all([
    safeMount(homeShellContainer, 'Home shell', () => {
      if (!homeShellContainer) return;
      new HomeView(homeShellContainer, state).mount();
    }),
    safeMount(analyzerContainer, 'Analyzer', () => {
      if (!analyzerContainer) return;
      new AnalyzerView(analyzerContainer, state).mount();
    }),
    safeMount(gameContainer, 'Play shell', () => {
      if (!gameContainer) return;
      new GameView(gameContainer, state, relay).mount();
    }),
    safeMount(bonusContainer, 'Bonus feed', async () => {
      if (!bonusContainer) return;
      await new BonusFeedView(bonusContainer, state, state.userId).mount();
    }),
    safeMount(vaultContainer, 'Vault', async () => {
      if (!vaultContainer) return;
      await new VaultView(vaultContainer, state, state.userId).mount();
    }),
    safeMount(tipContainer, 'Tip', async () => {
      if (!tipContainer) return;
      await new TipView(tipContainer, state, relay, relay.getChannelId()).mount();
    }),
    safeMount(recapShellContainer, 'Recap shell', () => {
      if (!recapShellContainer) return;
      new RecapView(recapShellContainer, state).mount();
    }),
    safeMount(leaderboardContainer, 'Leaderboard', () => {
      if (!leaderboardContainer) return;
      new LeaderboardView(leaderboardContainer, state).mount();
    }),
  ]);

  // --------------------------------------------------------
  // 6. Top-level navigation
  // --------------------------------------------------------
  document.querySelectorAll('.nav-tab[data-view]').forEach(tab => {
    tab.addEventListener('click', () => {
      const view = (tab as HTMLElement).dataset.view as ActivityView | undefined;
      if (!view || !VIEWS.includes(view)) {
        applyView('home');
        return;
      }

      applyView(view);
    });
  });
  applyView(state.currentView);

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

main().catch(err => {
  console.error('[Activity] Fatal error:', err);

  document.querySelectorAll<HTMLElement>('.view-content').forEach((el) => {
    el.classList.toggle('active', el.id === 'view-home');
  });
  document.querySelectorAll<HTMLElement>('.nav-tab[data-view]').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === 'home');
  });

  const statusEl = document.getElementById('sdk-status');
  if (statusEl) {
    statusEl.textContent = 'SAFE MODE';
  }

  const homeShell = document.getElementById('view-home-shell');
  if (homeShell) {
    renderModuleFallback(homeShell, 'Home');
  }
});
