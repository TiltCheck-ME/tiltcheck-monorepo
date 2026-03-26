/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Discord bot bootstrap entry.
 *
 * In smoke/CI mode we skip strict shared env validation so the bot can start
 * without full production secrets and still validate command/runtime wiring.
 */
if (process.env.SKIP_DISCORD_LOGIN === 'true' && !process.env.SKIP_ENV_VALIDATION) {
  process.env.SKIP_ENV_VALIDATION = 'true';
}

await import('./index.js');
