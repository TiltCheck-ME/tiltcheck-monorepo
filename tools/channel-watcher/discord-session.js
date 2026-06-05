// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
/** Shared Discord browser auth for Playwright scrapers (cookies + optional runtime token). */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function readRuntimeDiscordToken() {
  const rawToken = (process.env.DISCORD_TOKEN || process.env.TILT_DISCORD_TOKEN || '').trim();
  if (!rawToken) return '';
  return rawToken.replace(/^"+|"+$/g, '');
}

export function isHeadlessRuntime() {
  return (
    process.env.RAILWAY_ENVIRONMENT !== undefined ||
    process.env.CI === 'true' ||
    !process.env.DISPLAY
  );
}

export function sanitizeSessionState(sessionState) {
  return {
    cookies: Array.isArray(sessionState?.cookies) ? sessionState.cookies : [],
    origins: Array.isArray(sessionState?.origins)
      ? sessionState.origins.map((origin) => {
          if (!origin || typeof origin !== 'object') return origin;
          const localStorage = Array.isArray(origin.localStorage)
            ? origin.localStorage.filter((entry) => entry && entry.name !== 'token')
            : [];
          return { ...origin, localStorage };
        })
      : [],
  };
}

export function loadSessionState(sessionFile) {
  if (!sessionFile || !existsSync(sessionFile)) return null;
  const raw = readFileSync(sessionFile, 'utf8');
  const parsed = JSON.parse(raw);
  const sanitized = sanitizeSessionState(parsed);
  const sanitizedJson = JSON.stringify(sanitized, null, 2);
  if (sanitizedJson !== raw.trim()) {
    writeFileSync(sessionFile, `${sanitizedJson}\n`);
  }
  return sanitized;
}

export async function applyDiscordAuth(context, { sessionFile } = {}) {
  const token = readRuntimeDiscordToken();
  if (token) {
    await context.addInitScript((userToken) => {
      window.localStorage.setItem('token', JSON.stringify(userToken));
    }, token);
    return { mode: 'token', sessionFile };
  }
  return { mode: sessionFile ? 'cookies' : 'none', sessionFile };
}

export function assertHeadlessAuthConfigured(sessionFile) {
  const headless = isHeadlessRuntime();
  const hasSession = sessionFile && existsSync(sessionFile);
  const hasToken = Boolean(readRuntimeDiscordToken());
  if (!headless) return;
  if (hasSession || hasToken) return;

  const lines = [
    'Discord auth is not configured for headless deploy (Railway/CI).',
    'Set one of:',
    '  • DISCORD_TOKEN — user token for runtime injection (recommended on Railway)',
    '  • DISCORD_SESSION_JSON — sanitized Playwright cookies (base64 or raw JSON)',
    '  • Mount /data/.session.json on a Railway volume after `npm run session:create`',
    '',
    'Interactive browser login is not available in this environment.',
  ];
  throw new Error(lines.join('\n'));
}

export async function ensureDiscordLoggedIn(page, context, { sessionFile, interactiveTimeoutMs = 180_000 } = {}) {
  const headless = isHeadlessRuntime();
  const token = readRuntimeDiscordToken();

  await page.goto('https://discord.com/channels/@me', { waitUntil: 'domcontentloaded' });
  const loggedIn = await page
    .locator('[data-list-id="guildsnav"]')
    .isVisible({ timeout: headless ? 25_000 : 8_000 })
    .catch(() => false);

  if (loggedIn) {
    return { loggedIn: true, savedSession: false };
  }

  if (headless) {
    const hint = token
      ? 'DISCORD_TOKEN was set but login did not stick — token may be expired or invalid.'
      : 'Session cookies may be expired — refresh DISCORD_SESSION_JSON or set DISCORD_TOKEN.';
    throw new Error(`Discord login failed in headless mode. ${hint}`);
  }

  console.log('⚠️  Log into Discord in the browser window (up to 3 minutes)...');
  await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-list-id="guildsnav"]', { timeout: interactiveTimeoutMs }).catch(() => {
    throw new Error('Login timeout. Run `npm run session:create` locally, then deploy cookies to Railway.');
  });

  if (sessionFile) {
    await context.storageState({ path: sessionFile });
  }
  return { loggedIn: true, savedSession: Boolean(sessionFile) };
}
