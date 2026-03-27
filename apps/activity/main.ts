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
let currentGame = 'dad';

interface VaultStatus {
  activeVaults: number;
  profitGuardActive: boolean;
  totalVaultedBalance: number;
}

let vaultData: VaultStatus = {
  activeVaults: 0,
  profitGuardActive: false,
  totalVaultedBalance: 0
};

interface TriviaState {
  question: string;
  options: string[];
  prizePool: number;
  leaderboard: Array<{ username: string; score: number }>;
}

let triviaData: TriviaState = {
  question: 'Waiting for round...',
  options: [],
  prizePool: 0,
  leaderboard: []
};

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
      <p class="waiting-title">LISTENING FOR LOSSES...</p>
      <p class="waiting-sub">Start playing with the Chrome Extension active, or manually log your mistakes below.</p>
    </div>
    `}

    ${otherSessions.length > 0 ? `
    <div class="room-hud">
      <p class="section-label">SQUAD PERFORMANCE</p>
      <div class="rtp-main" style="margin-bottom: 1rem; border-color: var(--color-danger);">
        <div class="rtp-actual">
          <span class="rtp-label">SQUAD DRIFT</span>
          <span class="rtp-value ${getDriftClass(calcDrift(
            Object.values(channelState.sessions).reduce((s, sess) => s + sess.rounds.reduce((r, rd) => r + rd.win, 0), 0) /
            (Object.values(channelState.sessions).reduce((s, sess) => s + sess.rounds.reduce((r, rd) => r + rd.bet, 0), 0) || 1) * 100,
            96.5
          ))}">${calcDrift(
            Object.values(channelState.sessions).reduce((s, sess) => s + sess.rounds.reduce((r, rd) => r + rd.win, 0), 0) /
            (Object.values(channelState.sessions).reduce((s, sess) => s + sess.rounds.reduce((r, rd) => r + rd.bet, 0), 0) || 1) * 100,
            96.5
          ).toFixed(1)}%</span>
        </div>
      </div>
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
      <button id="resetBtn" class="btn-secondary">SCRUB EVIDENCE</button>
      <button id="alertBtn" class="btn-secondary">INITIATE PANIC SIGNAL</button>
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

// --- Vault Logic ---
async function triggerEmergencyVault() {
  const btn = document.getElementById('emergencyVaultBtn');
  if (btn) {
    btn.textContent = 'EXECUTING...';
    btn.setAttribute('disabled', 'true');
  }

  try {
    const res = await fetch(`${HUB_URL}/vault/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser?.id }),
    });
    
    if (res.ok) {
      alert('VAULT SUCCESS: All eligible balances moved to non-custodial Profit Locker.');
    } else {
      throw new Error('API failure');
    }
  } catch {
    alert('VAULT FAILED: Ensure you have a non-custodial wallet linked in the Dashboard.');
  } finally {
    if (btn) {
      btn.textContent = '[!] VAULT EVERYTHING';
      btn.removeAttribute('disabled');
    }
  }
}

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

  document.getElementById('emergencyVaultBtn')?.addEventListener('click', triggerEmergencyVault);
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
    if (currentView === 'games' && currentGame !== 'trivia') {
      const container = document.getElementById('game-container')!;
      container.innerHTML = `<pre class="result-box">${JSON.stringify(data, null, 2)}</pre>`;
    }
  });

  socket.on('trivia-question', (data) => {
    triviaData.question = data.question;
    triviaData.options = data.options;
    triviaData.prizePool = data.prizePool;
    if (currentView === 'games' && currentGame === 'trivia') renderTrivia();
  });

  socket.on('trivia-leaderboard', (data) => {
    triviaData.leaderboard = data.leaderboard;
    if (currentView === 'games' && currentGame === 'trivia') renderTrivia();
  });
}

function renderTrivia() {
  const container = document.getElementById('game-container')!;
  container.innerHTML = `
    <div class="rtp-dashboard" style="border-color: var(--color-accent);">
      <p class="section-label">LIVE TRIVIA - $[${triviaData.prizePool}] PRIZE POOL</p>
      <div class="waiting-title" style="margin-bottom: 1.5rem; font-size: 1.1rem;">${triviaData.question}</div>
      <div class="entry-row" style="flex-wrap: wrap; gap: 0.5rem;">
        ${triviaData.options.map(opt => `
          <button class="btn-secondary trivia-opt-btn" style="flex: 1 0 40%; font-size: 0.7rem;">${opt}</button>
        `).join('')}
      </div>
    </div>
    
    <div class="room-hud" style="margin-top: 1rem;">
      <p class="section-label">SQUAD LEADERBOARD</p>
      <div class="room-list">
        ${triviaData.leaderboard.length > 0 ? triviaData.leaderboard.sort((a,b) => b.score - a.score).map(entry => `
          <div class="room-user-card">
            <span class="room-user-name">${entry.username}</span>
            <span class="stat-value" style="color: var(--color-primary);">${entry.score} PTS</span>
          </div>
        `).join('') : '<p class="waiting-sub">No scores registered yet.</p>'}
      </div>
    </div>
  `;
  
  document.querySelectorAll('.trivia-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      socket?.emit('trivia-answer', { answer: btn.textContent });
      (btn as HTMLElement).style.borderColor = 'var(--color-primary)';
      btn.setAttribute('disabled', 'true');
    });
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

// --- Vault Data Polling ---
async function pollVaultStatus() {
  if (!currentUser?.id || currentUser.id === 'unknown') return;

  try {
    const res = await fetch(`${HUB_URL}/vault/status/${currentUser.id}`);
    if (res.ok) {
      const data = await res.json();
      vaultData = {
        activeVaults: data.activeVaults ?? 0,
        profitGuardActive: data.profitGuardActive ?? false,
        totalVaultedBalance: data.totalVaultedBalance ?? 0
      };
      updateVaultUI();
    }
  } catch (e) {
    console.warn('[TiltCheck] Vault sync failed:', e);
  }
}

function updateVaultUI() {
  const countEl = document.getElementById('vault-count');
  const guardEl = document.getElementById('profit-guard-status');
  
  if (countEl) countEl.textContent = vaultData.activeVaults.toString();
  if (guardEl) {
    guardEl.textContent = vaultData.profitGuardActive ? 'ACTIVE' : 'INACTIVE';
    guardEl.style.backgroundColor = vaultData.profitGuardActive ? 'rgba(0, 255, 170, 0.1)' : 'transparent';
    guardEl.style.color = vaultData.profitGuardActive ? 'var(--color-positive)' : 'var(--color-danger)';
  }
}

setInterval(pollSession, 2500);
setInterval(pollVaultStatus, 5000);

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
