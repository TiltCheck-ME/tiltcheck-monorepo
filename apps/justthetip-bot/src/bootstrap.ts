// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
if (process.env.SKIP_DISCORD_LOGIN === 'true' && !process.env.SKIP_ENV_VALIDATION) {
  process.env.SKIP_ENV_VALIDATION = 'true';
}
await import('./index.js');
