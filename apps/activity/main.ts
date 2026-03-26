/// <reference types="vite/client" />
import { DiscordSDK } from '@discord/embedded-app-sdk';
import { io, Socket } from 'socket.io-client';

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '1445916179163250860';
const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://tiltcheck-edge-hub.j-chapman7.workers.dev';
const ARENA_URL = import.meta.env.VITE_ARENA_URL || 'http://localhost:3010';

// --- Types ---
interface SessionRound {
  bet: number;
  win: number;
  timestamp: number;
}
interface SessionState {
  userId: string;
  username: string;
  casino: string;
  game: string;
  rounds: SessionRound[];
  expectedRtp: number;
  startedAt: number;
}

interface ChannelState {
  id: string;
  sessions: Record<string, SessionState>;
}

// --- Global State ---
let session: SessionState = {
  userId: 'unknown',
  username: 'Anonymous',
  casino: '',
  game: '',
  rounds: [],
  expectedRtp: 96.5,
  startedAt: Date.now(),
};

const channelState: ChannelState = {
  id: '',
  sessions: {},
};

let currentUser: { username: string; id: string } | null = null;
let currentChannelId: string | null = null;
let socket: Socket | null = null;
let currentView = 'analyzer';
let currentGame = 'poker';

// --- Math ---
function calcActualRtp(rounds: SessionRound[]): number {
  if (rounds.length === 0) return 0;
  const totalWagered = rounds.reduce((sum, r) => sum + r.bet, 0);
  const totalReturned = rounds.reduce((sum, r) => sum + r.win, 0);
  if (totalWagered === 0) return 0;
  return (totalReturned / totalWagered) * 100;
}

function calcDrift(actual: number, expected: number): number {
  return actual - expected;
}

function calcConfidence(roundCount: number): string {
  if (roundCount < 50) return 'NEED DATA';
  if (roundCount < 100) return 'LOW';
  if (roundCount < 250) return 'MODERATE';
  if (roundCount < 500) return 'GOOD';
  return 'HIGH';
}

function getDriftClass(drift: number): string {
  if (Math.abs(drift) < 2) return 'drift-neutral';
  if (drift > 0) return 'drift-positive';
  return 'drift-negative';
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}H ${minutes % 60}M`;
  return `${minutes}M`;
}

// --- View Management ---
function switchView(viewId: string) {
  currentView = viewId;
  document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`view-${viewId}`)?.classList.add('active');
  document.querySelector(`.nav-tab[data-view="${viewId}"]`)?.classList.add('active');

  if (viewId === 'analyzer') renderUI();
}

function switchGame(gameId: string) {
  currentGame = gameId;
  document.querySelectorAll('.sub-tab').forEach(el => el.classList.remove('active'));
  document.querySelector(`.sub-tab[data-game="${gameId}"]`)?.classList.add('active');
  
  const container = document.getElementById('game-container')!;
  container.innerHTML = `
    <div class="waiting-state">
      <div class="waiting-icon">[${gameId.toUpperCase()}]</div>
      <p class="waiting-title">${gameId.toUpperCase()} Mode Active</p>
      <p class="waiting-sub">Connecting to Game Arena...</p>
    </div>
  `;
  
  if (socket?.connected) {
    socket.emit('join-lobby', { game: gameId });
  }
}

// --- Render Analyzer ---
function renderUI(status: string = 'CONNECTED') {
  const container = document.getElementById('view-analyzer')!;
  if (!container) return;

  const actualRtp = calcActualRtp(session.rounds);
  const drift = calcDrift(actualRtp, session.expectedRtp);
  const confidence = calcConfidence(session.rounds.length);
  const driftClass = getDriftClass(drift);
  const totalWagered = session.rounds.reduce((sum: number, r: SessionRound) => sum + r.bet, 0);
  const totalReturned = session.rounds.reduce((sum: number, r: SessionRound) => sum + r.win, 0);
  const sessionTime = formatDuration(Date.now() - session.startedAt);
  const userName = currentUser?.username ?? 'ANONYMOUS DEGEN';

  const hasRounds = session.rounds.length > 0;
  const otherSessions = Object.values(channelState.sessions).filter(s => s.userId !== currentUser?.id);

  container.innerHTML = `
    <p id="sdk-status" class="sdk-status">${status}</p>

    <div class="session-header">
      <span class="session-user">[USER] ${userName}</span>
      <span class="session-timer">[SESSION] ${sessionTime}</span>
    </div>

    ${hasRounds ? `
    <div class="rtp-dashboard">
      <div class="rtp-main">
        <div class="rtp-actual">
          <span class="rtp-label">ACTUAL RTP</span>
          <span class="rtp-value ${driftClass}">${actualRtp.toFixed(1)}%</span>
        </div>
        <div class="rtp-expected">
          <span class="rtp-label">EXPECTED</span>
          <span class="rtp-value">${session.expectedRtp.toFixed(1)}%</span>
        </div>
        <div class="rtp-drift">
          <span class="rtp-label">DRIFT</span>
          <span class="rtp-value ${driftClass}">${drift > 0 ? '+' : ''}${drift.toFixed(1)}%</span>
        </div>
      </div>

      <div class="session-stats">
        <div class="stat">
          <span class="stat-label">Rounds</span>
          <span class="stat-value">${session.rounds.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Wagered</span>
          <span class="stat-value">$${totalWagered.toFixed(2)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Returned</span>
          <span class="stat-value">$${totalReturned.toFixed(2)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Confidence</span>
          <span class="stat-value">${confidence}</span>
        </div>
      </div>
    </div>
    ` : `
    <div class="waiting-state">
      <div class="waiting-icon">[SIGNAL]</div>
      <p class="waiting-title">Waiting for session data...</p>
      <p class="waiting-sub">Start playing with the Chrome Extension active, or add manually below.</p>
    </div>
    `}

    ${otherSessions.length > 0 ? `
    <div class="room-hud">
      <p class="section-label">ROOM ANALYTICS</p>
      <div class="room-list">
        ${otherSessions.map(os => {
          const ortp = calcActualRtp(os.rounds);
          const oclass = getDriftClass(calcDrift(ortp, os.expectedRtp));
          return `
            <div class="room-user-card">
              <span class="room-user-name">${os.username}</span>
              <div class="room-user-stats">
                <span class="room-user-rtp ${oclass}">${ortp.toFixed(1)}%</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="manual-entry">
      <p class="section-label">AUDIT OVERRIDE</p>
      <div class="entry-row">
        <div class="entry-field">
          <label>Bet ($)</label>
          <input type="number" id="betAmount" placeholder="10.00" step="0.01" min="0" />
        </div>
        <div class="entry-field">
          <label>Win ($)</label>
          <input type="number" id="winAmount" placeholder="0.00" step="0.01" min="0" />
        </div>
        <button id="addRoundBtn" class="btn-primary btn-small">+</button>
      </div>
    </div>

    <div class="btn-row">
      <button id="resetBtn" class="btn-secondary">Reset Session</button>
      <button id="alertBtn" class="btn-secondary">Send Hub Alert</button>
    </div>
  `;

  // --- Event Listeners ---
  document.getElementById('addRoundBtn')?.addEventListener('click', () => {
    const bet = parseFloat((document.getElementById('betAmount') as HTMLInputElement).value);
    const win = parseFloat((document.getElementById('winAmount') as HTMLInputElement).value);
    if (!isNaN(bet) && bet > 0) {
      session.rounds.push({ bet, win: win || 0, timestamp: Date.now() });
      renderUI();
    }
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    session.rounds = [];
    session.startedAt = Date.now();
    renderUI();
  });

  document.getElementById('alertBtn')?.addEventListener('click', async () => {
    updateStatus('PUSHING ALERT...');
    try {
      await fetch(`${HUB_URL}/tilt-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser?.username ?? 'anonymous',
          userId: currentUser?.id ?? 'unknown',
          timestamp: Date.now(),
          signal: 'Manual override triggered.',
          stats: {
            rounds: session.rounds.length,
            actualRtp: calcActualRtp(session.rounds),
            expectedRtp: session.expectedRtp,
          },
        }),
      });
      updateStatus('HUB ACKNOWLEDGED');
      setTimeout(() => updateStatus('CONNECTED'), 3000);
    } catch {
      updateStatus('HUB OFFLINE', true);
    }
  });
}

// --- Navigation ---
function initNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const view = (tab as HTMLElement).dataset.view;
      if (view) switchView(view);
    });
  });

  document.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const game = (tab as HTMLElement).dataset.game;
      if (game) switchGame(game);
    });
  });

  document.getElementById('emergencyVaultBtn')?.addEventListener('click', () => {
    alert('VAULT TRIGGERED: Assets moving to non-custodial Profit Locker.');
  });
}

// --- Socket.io ---
function initSocket() {
  if (socket) return;
  
  socket = io(ARENA_URL, {
    auth: {
      token: import.meta.env.VITE_ARENA_TOKEN || 'discord-activity-bypass',
      userId: currentUser?.id
    }
  });

  socket.on('connect', () => {
    console.log('[TiltCheck] Arena linked.');
    if (currentView === 'games') switchGame(currentGame);
  });

  socket.on('disconnect', () => {
    console.warn('[TiltCheck] Arena connection lost.');
  });

  socket.on('game-update', (data) => {
    if (currentView === 'games') {
      const container = document.getElementById('game-container')!;
      container.innerHTML = `<pre class="result-box">${JSON.stringify(data, null, 2)}</pre>`;
    }
  });
}

// --- Data Polling ---
async function pollSession() {
  if (!currentUser?.id || currentUser.id === 'unknown') return;

  try {
    const endpoint = currentChannelId 
      ? `${HUB_URL}/channel/${currentChannelId}` 
      : `${HUB_URL}/session/${currentUser.id}`;

    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (data.sessions) {
        channelState.sessions = data.sessions;
        if (data.sessions[currentUser.id]) session = data.sessions[currentUser.id];
        renderUI();
      }
    }
  } catch (e) {
    console.warn('[TiltCheck] Mesh sync failed:', e);
  }
}

setInterval(pollSession, 2500);

// --- Status Helper ---
function updateStatus(msg: string, isError = false) {
  const el = document.getElementById('sdk-status');
  if (el) {
    el.textContent = msg;
    el.style.color = isError ? '#ef4444' : '#17c3b2';
  }
}

// --- SDK Init ---
async function initDiscord() {
  renderUI('CONNECTING...');

  const isInsideDiscord = window.self !== window.top;

  if (!isInsideDiscord) {
    currentUser = { username: 'LOCAL DEGEN', id: 'dev-0000' };
    updateStatus('BYPASS MODE');
    initNavigation();
    initSocket();
    renderUI();
    return;
  }

  try {
    const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
    await discordSdk.ready();

    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      scope: ['identify', 'rpc.activities.write'],
      prompt: 'none',
    });

    const response = await fetch('https://api.tiltcheck.me/auth/discord/activity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const { access_token } = await response.json();
    const auth = await discordSdk.commands.authenticate({ access_token });

    if (auth.user) {
      currentUser = { username: auth.user.username, id: auth.user.id };
      currentChannelId = discordSdk.channelId;
      
      initNavigation();
      initSocket();
      renderUI();
    }

  } catch {
    updateStatus('SDK OFFLINE', true);
    currentUser = { username: 'ANONYMOUS', id: 'dev-0000' };
    initNavigation();
    initSocket();
    renderUI();
  }
}

initDiscord();
