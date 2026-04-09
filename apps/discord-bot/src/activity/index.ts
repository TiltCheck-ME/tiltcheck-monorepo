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

  renderActivity(session);
}

/**
 * Render the main activity UI into the document body.
 * Placeholder for the Live Session widget - expand this as needed.
 */
function renderActivity(activeSession: ActivitySession): void {
  const root = document.getElementById('app');
  if (!root) {
    console.error('[TiltCheck Activity] No #app element found in DOM.');
    return;
  }

  root.innerHTML = `
    <div class="tiltcheck-activity">
      <header class="activity-header">
        <span class="brand-title">TiltCheck</span>
        <span class="brand-tagline">Made for Degens. By Degens.</span>
      </header>
      <section class="live-session-widget">
        <h2>Live Session</h2>
        <p class="session-info">User: <strong>${escapeHtml(activeSession.username)}</strong></p>
        <p class="session-info">Channel: <strong>${activeSession.channelId ?? 'Unknown'}</strong></p>
        <p class="placeholder-note">Live session data coming soon.</p>
      </section>
      <footer class="activity-footer">Made for Degens. By Degens.</footer>
    </div>
  `;
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
