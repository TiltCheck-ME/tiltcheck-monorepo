// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
// Discord Embedded App SDK activity entry point.
// Initializes the TiltCheck activity inside Discord's in-app overlay.
// No emojis. No fluff. Made for Degens. By Degens.

import { DiscordSDK, patchUrlMappings } from '@discord/embedded-app-sdk';

// Patch URL mappings so fetch/websocket calls work inside Discord's proxy sandbox.
patchUrlMappings([
  { prefix: '/api', target: 'https://api.tiltcheck.me' },
]);

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? '';

if (!DISCORD_CLIENT_ID) {
  console.error('[TiltCheck Activity] DISCORD_CLIENT_ID is not set. Activity will not initialize.');
}

const sdk = new DiscordSDK(DISCORD_CLIENT_ID);

interface ActivitySession {
  userId: string;
  username: string;
  guildId: string | null;
  channelId: string | null;
}

let session: ActivitySession | null = null;

/**
 * Boot the TiltCheck activity.
 * Authenticates the current Discord user and renders the Live Session widget.
 */
async function initActivity(): Promise<void> {
  await sdk.ready();

  // Authorize with the required scopes
  const { code } = await sdk.commands.authorize({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  // Exchange code for token via the TiltCheck API
  const tokenResponse = await fetch('/api/auth/discord/activity-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!tokenResponse.ok) {
    console.error('[TiltCheck Activity] Token exchange failed:', tokenResponse.status);
    renderError('Authentication failed. Cannot start session.');
    return;
  }

  const { access_token } = await tokenResponse.json() as { access_token: string };

  // Authenticate the SDK
  const auth = await sdk.commands.authenticate({ access_token });

  session = {
    userId: auth.user.id,
    username: auth.user.username,
    guildId: sdk.guildId,
    channelId: sdk.channelId,
  };

  console.log(`[TiltCheck Activity] Authenticated as ${session.username} (${session.userId})`);

  await renderActivity(session);
}

// ---------------------------------------------------------------------------
// CollectClock hub types
// ---------------------------------------------------------------------------

interface BonusEntry {
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
}

interface HubParticipant {
  userId: string;
  username: string;
}

// ---------------------------------------------------------------------------
// Stake drop prediction helpers
// ---------------------------------------------------------------------------

const LAST_KNOWN_DROP = '2025-11-02';
const DROP_INTERVAL_DAYS = 5; // midpoint of 3-7 day historical range
const HISTORICAL_DROP_COUNT = 149;

function computeNextDrop(): { label: string; confidence: string } {
  const lastDrop = new Date(LAST_KNOWN_DROP);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastDrop.getTime()) / (1000 * 60 * 60 * 24));
  const cyclesElapsed = Math.floor(daysSince / DROP_INTERVAL_DAYS);
  const nextDropMs =
    lastDrop.getTime() + (cyclesElapsed + 1) * DROP_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  const hoursUntil = Math.max(0, Math.floor((nextDropMs - now.getTime()) / (1000 * 60 * 60)));
  const daysUntil = Math.floor(hoursUntil / 24);
  const remHours = hoursUntil % 24;
  const label = daysUntil > 0 ? `~${daysUntil}d ${remHours}h` : `~${hoursUntil}h`;
  const confidence = hoursUntil > 72 ? 'low' : hoursUntil > 24 ? 'medium' : 'high';
  return { label, confidence };
}

// ---------------------------------------------------------------------------
// localStorage claim state (keyed: userId + brand + YYYY-MM-DD)
// ---------------------------------------------------------------------------

function claimKey(userId: string, brand: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `collectclock:claimed:${userId}:${brand}:${today}`;
}

function isClaimedLocally(userId: string, brand: string): boolean {
  try {
    return localStorage.getItem(claimKey(userId, brand)) === '1';
  } catch {
    return false;
  }
}

function markClaimedLocally(userId: string, brand: string): void {
  try {
    localStorage.setItem(claimKey(userId, brand), '1');
  } catch {
    // localStorage unavailable in some contexts — ignore
  }
}

// ---------------------------------------------------------------------------
// renderActivity — CollectClock hub
// ---------------------------------------------------------------------------

/**
 * Render the CollectClock hub into the activity root element.
 * Fetches bonus data and channel participants, then builds the full UI.
 * All auth/bootstrap logic above this function is left untouched.
 */
async function renderActivity(activeSession: ActivitySession): Promise<void> {
  const root = document.getElementById('app');
  if (!root) {
    console.error('[TiltCheck Activity] No #app element found in DOM.');
    return;
  }

  // Show loading state while data fetches
  root.innerHTML =
    '<p style="color:#17c3b2;padding:2rem;text-align:center;font-family:monospace;">COLLECTCLOCK LOADING...</p>';

  // -- Fetch bonus data --
  let bonuses: BonusEntry[] = [];
  try {
    const res = await fetch('/api/bonuses');
    if (res.ok) {
      bonuses = (await res.json()) as BonusEntry[];
    } else {
      throw new Error(`API ${res.status}`);
    }
  } catch {
    try {
      const fallback = await fetch(
        'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json',
      );
      if (fallback.ok) {
        bonuses = (await fallback.json()) as BonusEntry[];
      }
    } catch (fallbackErr) {
      console.warn('[TiltCheck Activity] Bonus data unavailable:', fallbackErr);
    }
  }

  // -- Fetch voice channel participants --
  let participants: HubParticipant[] = [];
  try {
    const result = await sdk.commands.getInstanceConnectedParticipants();
    participants = result.participants.map((p) => ({
      userId: p.id,
      username: p.global_name ?? p.username,
    }));
  } catch (err) {
    console.warn('[TiltCheck Activity] Could not fetch participants:', err);
    participants = [{ userId: activeSession.userId, username: activeSession.username }];
  }

  // -- Stake drop prediction --
  const drop = computeNextDrop();

  // -- Build bonus card HTML --
  function bonusCardHtml(bonus: BonusEntry): string {
    const claimed = isClaimedLocally(activeSession.userId, bonus.brand);
    const codeBlock = bonus.code
      ? `<span class="cc-badge">[CODE: ${escapeHtml(bonus.code)}]</span>`
      : '';
    return `
      <div class="cc-card" data-brand="${escapeHtml(bonus.brand)}">
        <div class="cc-card__head">
          <span class="cc-card__brand">${escapeHtml(bonus.brand.toUpperCase())}</span>
          ${codeBlock}
        </div>
        <div class="cc-card__amount">${escapeHtml(bonus.bonus)}</div>
        <div class="cc-card__actions">
          <a class="cc-btn cc-btn--visit"
             href="${escapeHtml(bonus.url)}"
             target="_blank"
             rel="noopener noreferrer">[CLAIM]</a>
          <button
            class="cc-btn ${claimed ? 'cc-btn--done' : 'cc-btn--mark'}"
            data-brand="${escapeHtml(bonus.brand)}"
            ${claimed ? 'disabled' : ''}
          >${claimed ? '[CLAIMED]' : '[MARK CLAIMED]'}</button>
        </div>
        <div class="cc-card__meta">Verified: ${escapeHtml(bonus.verified)}</div>
      </div>`;
  }

  const bonusRows =
    bonuses.length > 0
      ? bonuses.map(bonusCardHtml).join('')
      : '<p class="cc-empty">No bonus data available. Check back later.</p>';

  const participantList = participants.map((p) => escapeHtml(p.username)).join(', ');

  // -- Inject full UI --
  root.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      .cc-hub { background: #0a0c10; color: #ffffff; font-family: monospace; min-height: 100vh; }

      /* Header */
      .cc-hub__header {
        background: #0d1117;
        border-bottom: 1px solid rgba(23,195,178,0.4);
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .cc-hub__title { color: #17c3b2; font-size: 1.1rem; font-weight: bold; letter-spacing: 0.12em; }
      .cc-hub__tagline { color: rgba(255,255,255,0.4); font-size: 0.7rem; font-family: sans-serif; }

      /* Sections */
      .cc-section { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(23,195,178,0.12); }
      .cc-section__title {
        color: #17c3b2;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        font-weight: bold;
        margin-bottom: 0.55rem;
        text-transform: uppercase;
      }

      /* Bonus list */
      .cc-bonus-list { max-height: 44vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.45rem; }
      .cc-card {
        background: #10141a;
        border: 1px solid rgba(23,195,178,0.25);
        border-radius: 4px;
        padding: 0.65rem 0.75rem;
      }
      .cc-card__head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
      .cc-card__brand { color: #17c3b2; font-weight: bold; font-size: 0.85rem; }
      .cc-badge {
        background: rgba(23,195,178,0.1);
        color: #17c3b2;
        font-size: 0.68rem;
        padding: 0.1rem 0.35rem;
        border: 1px solid rgba(23,195,178,0.3);
        border-radius: 2px;
      }
      .cc-card__amount { color: #e2e8f0; font-family: sans-serif; font-size: 0.85rem; }
      .cc-card__actions { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.45rem; }
      .cc-card__meta { color: rgba(255,255,255,0.32); font-size: 0.65rem; margin-top: 0.35rem; font-family: sans-serif; }

      /* Buttons */
      .cc-btn {
        display: inline-block;
        font-family: monospace;
        font-size: 0.73rem;
        padding: 0.28rem 0.6rem;
        border-radius: 3px;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid;
        background: transparent;
        transition: background 0.12s;
        line-height: 1.4;
      }
      .cc-btn--visit { color: #17c3b2; border-color: #17c3b2; }
      .cc-btn--visit:hover { background: rgba(23,195,178,0.14); }
      .cc-btn--mark { color: #ffffff; border-color: rgba(255,255,255,0.3); }
      .cc-btn--mark:hover { background: rgba(255,255,255,0.07); }
      .cc-btn--done { color: #17c3b2; border-color: #17c3b2; background: rgba(23,195,178,0.1); cursor: default; }

      /* Drop box */
      .cc-drop-box {
        background: #10141a;
        border: 1px solid rgba(23,195,178,0.25);
        border-radius: 4px;
        padding: 0.65rem 0.75rem;
      }
      .cc-drop-box__label { color: rgba(255,255,255,0.5); font-size: 0.7rem; font-family: sans-serif; }
      .cc-drop-box__time { color: #17c3b2; font-size: 1.05rem; font-weight: bold; margin: 0.25rem 0; }
      .cc-drop-box__meta { color: rgba(255,255,255,0.32); font-size: 0.65rem; font-family: sans-serif; }

      /* Session */
      .cc-session { font-family: sans-serif; font-size: 0.8rem; color: rgba(255,255,255,0.65); }
      .cc-session a { color: #17c3b2; text-decoration: none; }
      .cc-session a:hover { text-decoration: underline; }

      /* Misc */
      .cc-empty { color: rgba(255,255,255,0.38); font-size: 0.8rem; padding: 1rem 0; text-align: center; }
      .cc-hub__footer {
        padding: 0.6rem 1rem;
        text-align: center;
        color: rgba(255,255,255,0.22);
        font-size: 0.65rem;
        font-family: sans-serif;
        letter-spacing: 0.1em;
        border-top: 1px solid rgba(23,195,178,0.1);
      }
    </style>

    <div class="cc-hub">
      <div class="cc-hub__header">
        <span class="cc-hub__title">COLLECTCLOCK</span>
        <span class="cc-hub__tagline">Made for Degens. By Degens.</span>
      </div>

      <div class="cc-section">
        <div class="cc-section__title">Daily Bonuses</div>
        <div class="cc-bonus-list" id="cc-bonus-list">
          ${bonusRows}
        </div>
      </div>

      <div class="cc-section">
        <div class="cc-section__title">Next Stake Drop</div>
        <div class="cc-drop-box">
          <div class="cc-drop-box__label">Predicted next Instagram drop</div>
          <div class="cc-drop-box__time">${escapeHtml(drop.label)} (${escapeHtml(drop.confidence)} confidence)</div>
          <div class="cc-drop-box__meta">
            Based on ${HISTORICAL_DROP_COUNT} historical drops. Last known: ${LAST_KNOWN_DROP}.
          </div>
        </div>
      </div>

      <div class="cc-section">
        <div class="cc-section__title">In This Session (${participants.length})</div>
        <div class="cc-session">
          <span>${participantList || escapeHtml(activeSession.username)}</span>
          &nbsp;&mdash;&nbsp;
          <a href="https://tiltcheck.me/bonuses" target="_blank" rel="noopener noreferrer">
            View all at tiltcheck.me/bonuses
          </a>
        </div>
      </div>

      <div class="cc-hub__footer">Made for Degens. By Degens.</div>
    </div>
  `;

  // Wire up MARK CLAIMED buttons
  root.querySelectorAll<HTMLButtonElement>('button.cc-btn--mark').forEach((btn) => {
    btn.addEventListener('click', () => {
      const brand = btn.getAttribute('data-brand');
      if (!brand) return;

      markClaimedLocally(activeSession.userId, brand);

      // Fire-and-forget — no backend required yet, log for now
      const payload = {
        userId: activeSession.userId,
        brand,
        claimedAt: new Date().toISOString(),
      };
      console.log('[TiltCheck Activity] Claim marked:', payload);
      fetch('/api/bonuses/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn('[TiltCheck Activity] Claim POST failed (fire-and-forget):', err);
      });

      // Update button state immediately — no re-render needed
      btn.textContent = '[CLAIMED]';
      btn.className = 'cc-btn cc-btn--done';
      btn.disabled = true;
    });
  });
}

/**
 * Render a fatal error state into the activity UI.
 */
function renderError(message: string): void {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = `
    <div class="tiltcheck-activity tiltcheck-activity--error">
      <header class="activity-header">
        <span class="brand-title">TiltCheck</span>
      </header>
      <section class="error-state">
        <p>${escapeHtml(message)}</p>
      </section>
    </div>
  `;
}

/**
 * Minimal HTML escaping to prevent injection via user-supplied values.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

initActivity().catch((err) => {
  console.error('[TiltCheck Activity] Fatal initialization error:', err);
  renderError('Activity failed to start. Check the console for details.');
});
