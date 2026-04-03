/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
/**
 * Discord Server Setup Script
 * Run ONCE after creating a fresh server and inviting the bot with Admin permissions.
 *
 * Usage (PowerShell):
 *   $env:GUILD_ID = "your_server_id"; pnpm --filter discord-bot exec tsx src/scripts/setup-server.ts
 *
 * The script auto-loads the root .env file — no need to set DISCORD_BOT_TOKEN manually.
 */

import { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, type Guild } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

// Auto-load root .env — try both monorepo root paths (pnpm exec CWD varies)
const candidates = [
  path.resolve(process.cwd(), '.env'),         // if run from monorepo root
  path.resolve(process.cwd(), '../../.env'),   // if run from apps/discord-bot
];
const envPath = candidates.find(p => fs.existsSync(p));
if (envPath) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/); // handle Windows CRLF
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
  console.log(`Loaded env from: ${envPath}`);
} else {
  console.warn('No .env file found — relying on shell environment variables only.');
}

const TOKEN = process.env.TILT_DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('Missing DISCORD_BOT_TOKEN (or TILT_DISCORD_BOT_TOKEN) and/or GUILD_ID.');
  console.error('Set GUILD_ID in PowerShell: $env:GUILD_ID = "your_server_id"');
  process.exit(1);
}

// ─── Server Structure ────────────────────────────────────────────────────────

const ROLES = [
  { name: 'TiltCheck Team', color: 0x17c3b2, hoist: true, position: 10 },
  { name: 'Genesis Tester', color: 0xffd700, hoist: true, position: 9 },
  { name: 'Guardian', color: 0x3b82f6, hoist: true, position: 8 },
  { name: 'Degen', color: 0x6b7280, hoist: false, position: 7 },
  { name: 'Muted', color: 0x1f2937, hoist: false, position: 1 },
];

const STRUCTURE = [
  {
    category: '👋 Start Here',
    channels: [
      { name: 'welcome', type: ChannelType.GuildText, topic: 'What TiltCheck is and why it exists.', readonly: true, staffOnly: false, genesisOnly: false },
      { name: 'rules', type: ChannelType.GuildText, topic: 'Keep it real. No shilling. No harassment.', readonly: true, staffOnly: false, genesisOnly: false },
      { name: 'announcements', type: ChannelType.GuildText, topic: 'Product updates and beta milestones.', readonly: true, staffOnly: false, genesisOnly: false },
    ],
  },
  {
    category: '💬 Community',
    channels: [
      { name: 'general', type: ChannelType.GuildText, topic: 'Talk about anything. Be a human.', readonly: false, staffOnly: false, genesisOnly: false },
      { name: 'degen-talk', type: ChannelType.GuildText, topic: 'Session stories, wins, losses, lessons.', readonly: false, staffOnly: false, genesisOnly: false },
      { name: 'casino-watch', type: ChannelType.GuildText, topic: 'Flag sketchy platforms. Share legitimate finds.', readonly: false, staffOnly: false, genesisOnly: false },
      { name: 'off-topic', type: ChannelType.GuildText, topic: 'Everything that doesn\'t fit elsewhere.', readonly: false, staffOnly: false, genesisOnly: false },
    ],
  },
  {
    category: '🛠️ Beta Program',
    channels: [
      { name: 'beta-general', type: ChannelType.GuildText, topic: 'Beta tester chat. Testers only.', genesisOnly: true, readonly: false, staffOnly: false },
      { name: 'bug-reports', type: ChannelType.GuildText, topic: 'Post bugs here. Be specific. Screenshots help.', genesisOnly: true, readonly: false, staffOnly: false },
      { name: 'feature-requests', type: ChannelType.GuildText, topic: 'What would make this actually useful for you?' , genesisOnly: true, readonly: false, staffOnly: false },
      { name: 'beta-applications', type: ChannelType.GuildText, topic: 'Auto-posted applications from the website.', readonly: true, staffOnly: true, genesisOnly: false },
    ],
  },
  {
    category: '📊 Audit Feed',
    channels: [
      { name: 'trust-alerts', type: ChannelType.GuildText, topic: 'Automated trust score changes and flags.', readonly: true, staffOnly: false, genesisOnly: false },
      { name: 'casino-scores', type: ChannelType.GuildText, topic: 'New casino audits posted automatically.', readonly: true, staffOnly: false, genesisOnly: false },
      { name: 'scam-alerts', type: ChannelType.GuildText, topic: 'Domains flagged by the extension.', readonly: true, staffOnly: false, genesisOnly: false },
    ],
  },
  {
    category: '🤙 Accountability',
    channels: [
      { name: 'session-goals', type: ChannelType.GuildText, topic: 'Set a goal before you play. Post it here.', readonly: false, staffOnly: false, genesisOnly: false },
      { name: 'wins-secured', type: ChannelType.GuildText, topic: 'You cashed out. Tell us about it.', readonly: false, staffOnly: false, genesisOnly: false },
      { name: 'tough-love', type: ChannelType.GuildText, topic: 'Honest reflection on sessions that didn\'t go well.', readonly: false, staffOnly: false, genesisOnly: false },
    ],
  },
  {
    category: '🔧 Staff Only',
    channels: [
      { name: 'staff-chat', type: ChannelType.GuildText, topic: 'Internal team channel.', staffOnly: true, readonly: false, genesisOnly: false },
      { name: 'mod-log', type: ChannelType.GuildText, topic: 'Moderation actions log.', staffOnly: true, readonly: false, genesisOnly: false },
    ],
  },
];

// ─── Setup Function ──────────────────────────────────────────────────────────

async function setup(guild: Guild) {
  console.log(`\n🛠  Setting up: ${guild.name} (${guild.id})\n`);

  // 1. Create roles
  console.log('Creating roles...');
  const roleMap: Record<string, string> = {};
  for (const roleDef of ROLES) {
    const existing = guild.roles.cache.find(r => r.name === roleDef.name);
    if (existing) {
      roleMap[roleDef.name] = existing.id;
      console.log(`  ✓ Role exists: ${roleDef.name}`);
      continue;
    }
    const role = await guild.roles.create({
      name: roleDef.name,
      color: roleDef.color,
      hoist: roleDef.hoist,
    });
    roleMap[roleDef.name] = role.id;
    console.log(`  + Created: ${roleDef.name}`);
  }

  const teamRoleId = roleMap['TiltCheck Team'];
  const genesisRoleId = roleMap['Genesis Tester'];
  const everyoneId = guild.roles.everyone.id;

  // 2. Create categories and channels
  console.log('\nCreating channels...');
  let betaWebhookUrl: string | null = null;

  for (const section of STRUCTURE) {
    const category = await guild.channels.create({
      name: section.category,
      type: ChannelType.GuildCategory,
    });

    for (const ch of section.channels) {
      const permissionOverwrites = [];

      if (ch.readonly) {
        // Everyone can read, not write
        permissionOverwrites.push(
          { id: everyoneId, deny: [PermissionFlagsBits.SendMessages] },
          { id: teamRoleId, allow: [PermissionFlagsBits.SendMessages] },
        );
      }

      if (ch.staffOnly) {
        // Only staff can see
        permissionOverwrites.push(
          { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
          { id: teamRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        );
      }

      if (ch.genesisOnly) {
        // Only Genesis Testers + Staff
        permissionOverwrites.push(
          { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
          { id: genesisRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: teamRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        );
      }

      const channel = await guild.channels.create({
        name: ch.name,
        type: ch.type,
        topic: ch.topic,
        parent: category.id,
        permissionOverwrites,
      });

      console.log(`  + #${ch.name}`);

      // Create webhook for beta applications
      if (ch.name === 'beta-applications' && channel.type === ChannelType.GuildText) {
        const webhook = await channel.createWebhook({ name: 'TiltCheck Beta Applications' });
        betaWebhookUrl = webhook.url;
        console.log('\n  🔗 Beta webhook created!');
      }

      // Post welcome message
      if (ch.name === 'welcome' && channel.type === ChannelType.GuildText) {
        await channel.send([
          '## Welcome to TiltCheck',
          '',
          'The house has the math. We can count too.',
          '',
          'TiltCheck is an independent audit layer for the gambling ecosystem. We score casinos, track session behavior, and give you the data to make smarter decisions.',
          '',
          '**Before you do anything:**',
          '• Read <#rules>',
          '• Use `/linkwallet` in the bot to connect your Solana wallet to your account',
          '• Check out the dashboard at **tiltcheck.me**',
          '',
          '_If you\'re here to apply for the beta program, hit up tiltcheck.me/beta-tester_',
        ].join('\n'));
      }
    }
  }

  // 3. Output webhook URL
  if (betaWebhookUrl) {
    console.log('\n─────────────────────────────────────────');
    console.log('Add this to your .env file:');
    console.log(`DISCORD_BETA_WEBHOOK_URL=${betaWebhookUrl}`);
    console.log('─────────────────────────────────────────\n');

    // Also try to append to root .env if it exists
    const envPath = path.resolve(process.cwd(), '../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      if (!content.includes('DISCORD_BETA_WEBHOOK_URL')) {
        fs.appendFileSync(envPath, `\nDISCORD_BETA_WEBHOOK_URL=${betaWebhookUrl}\n`);
        console.log('✓ Written to .env automatically');
      }
    }
  }

  console.log('\n✅ Server setup complete.\n');
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  const guild = await client.guilds.fetch(GUILD_ID!);
  await setup(guild);
  client.destroy();
});

client.login(TOKEN);
