#!/usr/bin/env node
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * Registers /ask on the TiltCheck Discord app. Not run by CI or by any deploy.
 *
 *   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/register-command.mjs --guild <server id>
 *   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/register-command.mjs --global --confirm-production
 *
 * A guild command shows up in that server right away (use a test server first).
 * A global command reaches every server the app is in, so it needs --confirm-production.
 * Both only work once the app's Interactions Endpoint URL points at this worker's /discord/interactions.
 */
import { ASK_COMMAND } from '../src/discord.js';

const args = process.argv.slice(2);
const appId = process.env.DISCORD_APP_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildAt = args.indexOf('--guild');
const guildId = guildAt >= 0 ? args[guildAt + 1] : '';
const global = args.includes('--global');

if (!appId || !botToken) {
  console.error('Set DISCORD_APP_ID and DISCORD_BOT_TOKEN in the environment.');
  process.exit(1);
}
if (!guildId && !global) {
  console.error('Pick one: --guild <server id> (test server) or --global --confirm-production.');
  process.exit(1);
}
if (global && !args.includes('--confirm-production')) {
  console.error('--global registers /ask in every server. Add --confirm-production once that is approved.');
  process.exit(1);
}
if (guildId && !/^\d{17,20}$/.test(guildId)) {
  console.error('That guild id does not look like a Discord id.');
  process.exit(1);
}

const url = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

const res = await fetch(url, {
  method: 'POST',
  headers: { authorization: `Bot ${botToken}`, 'content-type': 'application/json' },
  body: JSON.stringify(ASK_COMMAND),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Discord said ${res.status}:`, JSON.stringify(body));
  process.exit(1);
}
console.log(`Registered /${body.name} (${body.id}) ${guildId ? `in guild ${guildId}` : 'globally'}.`);
