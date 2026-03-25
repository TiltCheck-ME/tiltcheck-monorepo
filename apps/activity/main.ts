/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Discord Activity: Live RTP Session Analyzer
 *
 * You play. We watch. We math. We tell you if the casino's
 * math matches what they claim.
 */

import { DiscordSDK } from '@discord/embedded-app-sdk';

const DISCORD_CLIENT_ID = '1445916179163250860';
const HUB_URL = 'https://tiltcheck-edge-hub.j-chapman7.workers.dev';

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
  if (roundCount < 50) return 'Need more data';
  if (roundCount < 100) return 'Low (~60%)';
  if (roundCount < 250) return 'Moderate (~80%)';
  if (roundCount < 500) return 'Good (~90%)';
  return 'High (95%+)';
}

function getDriftClass(drift: number): string {
  if (Math.abs(drift) < 2) return 'drift-neutral';
  if (drift > 0) return 'drift-positive';
  return 'drift-negative';
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

// --- Render ---
function renderUI(status: string = 'Connecting...') {
  const container = document.getElementById('app')!;
  const actualRtp = calcActualRtp(session.rounds);
  const drift = calcDrift(actualRtp, session.expectedRtp);
  const confidence = calcConfidence(session.rounds.length);
  const driftClass = getDriftClass(drift);
  const totalWagered = session.rounds.reduce((sum: number, r: SessionRound) => sum + r.bet, 0);
  const totalReturned = session.rounds.reduce((sum: number, r: SessionRound) => sum + r.win, 0);
  const sessionTime = formatDuration(Date.now() - session.startedAt);
  const userName = currentUser?.username ?? 'Anonymous Degen';

  const hasRounds = session.rounds.length > 0;
  
  // Get other sessions for the Room HUD
  const otherSessions = Object.values(channelState.sessions).filter(s => s.userId !== currentUser?.id);

  container.innerHTML = `
    <p id="sdk-status" class="sdk-status">${status}</p>

    <div class="session-header">
      <span class="session-user">👤 ${userName}</span>
      <span class="session-timer">⏱️ ${sessionTime}</span>
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
      <div class="waiting-icon">📡</div>
      <p class="waiting-title">Waiting for session data...</p>
      <p class="waiting-sub">Start playing with the Chrome Extension active, or enter rounds manually below.</p>
    </div>
    `}

    ${otherSessions.length > 0 ? `
    <div class="room-hud">
      <p class="section-label">OTHER DEGENS IN ROOM</p>
      <div class="room-list">
        ${otherSessions.map(os => {
          const ortp = calcActualRtp(os.rounds);
          const odrift = calcDrift(ortp, os.expectedRtp);
          const oclass = getDriftClass(odrift);
          return `
            <div class="room-user-card">
              <span class="room-user-name">${os.username}</span>
              <div class="room-user-stats">
                <span class="room-user-rtp ${oclass}">${ortp.toFixed(1)}%</span>
                <span class="room-user-drift ${oclass}">${odrift > 0 ? '+' : ''}${odrift.toFixed(1)}%</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="manual-entry">
      <p class="section-label">QUICK ADD ROUND</p>
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
      <button id="alertBtn" class="btn-secondary">Send Tilt Alert</button>
    </div>

    <div id="result" class="result-box">${hasRounds
      ? `Last round: Bet $${session.rounds[session.rounds.length-1].bet.toFixed(2)} → Won $${session.rounds[session.rounds.length-1].win.toFixed(2)}`
      : 'Ready for audit. No custody. Just math.'
    }</div>
  `;

  // --- Event Listeners ---
  document.getElementById('addRoundBtn')?.addEventListener('click', () => {
    const bet = parseFloat((document.getElementById('betAmount') as HTMLInputElement).value);
    const win = parseFloat((document.getElementById('winAmount') as HTMLInputElement).value);
    if (isNaN(bet) || bet <= 0) {
      document.getElementById('result')!.textContent = 'Enter a valid bet amount.';
      return;
    }
    session.rounds.push({ bet, win: isNaN(win) ? 0 : win, timestamp: Date.now() });
    renderUI(document.getElementById('sdk-status')?.textContent ?? 'Connected');
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    session = { ...session, rounds: [], startedAt: Date.now() };
    renderUI(document.getElementById('sdk-status')?.textContent ?? 'Connected');
  });

  document.getElementById('alertBtn')?.addEventListener('click', async () => {
    const resultEl = document.getElementById('result')!;
    resultEl.textContent = 'Pushing to Hub...';
    try {
      const res = await fetch(`${HUB_URL}/tilt-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser?.username ?? 'anonymous',
          userId: currentUser?.id ?? 'unknown',
          timestamp: Date.now(),
          signal: 'Tilt detected.',
          stats: {
            rounds: session.rounds.length,
            actualRtp: calcActualRtp(session.rounds),
            expectedRtp: session.expectedRtp,
            drift: calcDrift(calcActualRtp(session.rounds), session.expectedRtp),
          },
        }),
      });
      const data = await res.json();
      resultEl.textContent = `Hub acknowledged: ${JSON.stringify(data)}`;
    } catch {
      resultEl.textContent = 'Hub unreachable. Is the worker running?';
    }
  });
}

// --- Data Polling ---
async function pollSession() {
  if (!currentUser?.id || currentUser.id === 'unknown') return;

  try {
    // If we have a channelId, poll the collective room state instead of just the user
    const endpoint = currentChannelId 
      ? `${HUB_URL}/channel/${currentChannelId}` 
      : `${HUB_URL}/session/${currentUser.id}`;

    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      
      if (currentChannelId && data.sessions) {
        // Multi-user room data
        channelState.sessions = data.sessions;
        if (data.sessions[currentUser.id]) {
          session = data.sessions[currentUser.id];
        }
        renderUI(document.getElementById('sdk-status')?.textContent ?? 'Connected');
      } else if (data.rounds && JSON.stringify(data.rounds) !== JSON.stringify(session.rounds)) {
        // Fallback or Single-user data
        session.rounds = data.rounds;
        renderUI(document.getElementById('sdk-status')?.textContent ?? 'Connected');
      }
    }
  } catch (e) {
    console.warn('[TiltCheck] Polling hub failed:', e);
  }
}

// Start polling every 2.5s
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
  renderUI('Connecting to Discord SDK...');

  const isInsideDiscord = window.self !== window.top;

  if (!isInsideDiscord) {
    currentUser = { username: 'Local Degen', id: 'dev-0000' };
    updateStatus('DEV MODE: Running outside Discord. SDK skipped.');
    renderUI('DEV MODE: Running outside Discord. SDK skipped.');
    return;
  }

  const sdkTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('SDK timed out (8s). Check Discord Dev Portal settings.')), 8000)
  );

  try {
    const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
    await Promise.race([discordSdk.ready(), sdkTimeout]);

    // 1. Authorize (Client-side)
    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      scope: ['identify', 'rpc.activities.write'],
      prompt: 'none',
    });

    // 2. Exchange Code for Access Token (Server-side via API)
    updateStatus('Exchanging auth code...');
    const response = await fetch('https://api.tiltcheck.me/auth/discord/activity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const { access_token } = await response.json();

    // 3. Authenticate with Access Token (Client-side handshake)
    updateStatus('Pipes secured. Handshaking...');
    const auth = await discordSdk.commands.authenticate({ access_token });

    if (auth.user) {
      currentUser = { username: auth.user.username, id: auth.user.id };
      currentChannelId = discordSdk.channelId;
      if (currentChannelId) channelState.id = currentChannelId;

      // Perform the Degen Handshake with the Edge Hub
      try {
        updateStatus('Registering identity at the edge...');
        await fetch(`${HUB_URL}/auth/Handshake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            discordId: currentUser.id, 
            tiltcheckId: `tc-${currentUser.id}`,
            channelId: currentChannelId 
          }),
        });
        console.log('[TiltCheck] Degen Handshake synchronized with D1.');
      } catch (e) {
        console.warn('[TiltCheck] Edge handshake failed (non-critical):', e);
      }

      updateStatus(`Connected as ${currentUser.username}`);
      renderUI(`Connected as ${currentUser.username}`);
      console.log('[TiltCheck] Authenticated successfully via central API.');
    }

  } catch (err: any) {
    const msg = err?.message ?? 'Unknown SDK error';
    updateStatus(`SDK Error: ${msg}`, true);
    console.error('[TiltCheck] SDK failed:', msg);
    
    // Fallback to anonymous for UI testing
    currentUser = { username: 'Anonymous Degen', id: 'dev-0000' };
    renderUI('SDK failure. Running in bypass mode.');
  }
}


initDiscord();
