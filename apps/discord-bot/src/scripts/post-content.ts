/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
/**
 * Post static channel content — run ONCE after setup-server.ts
 *
 * Usage (PowerShell):
 *   $env:GUILD_ID = "your_server_id"; pnpm --filter discord-bot exec tsx src/scripts/post-content.ts
 *
 * Posts rich embeds to: #rules, #announcements, and community channel intros.
 */

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType,
  type TextChannel,
  type Guild,
} from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

// Auto-load root .env
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];
const envPath = candidates.find(p => fs.existsSync(p));
if (envPath) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
  console.log(`Loaded env from: ${envPath}`);
}

const TOKEN = process.env.TILT_DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('Missing token or GUILD_ID. Set $env:GUILD_ID in PowerShell first.');
  process.exit(1);
}

const TEAL = 0x17c3b2;
const GOLD = 0xffd700;
const DARK = 0x111827;

// ─── Channel Content ─────────────────────────────────────────────────────────

async function postRules(channel: TextChannel) {
  const embed = new EmbedBuilder()
    .setColor(TEAL)
    .setTitle('The Rules')
    .setDescription('Short version: don\'t be a dick.\n\u200b')
    .addFields(
      {
        name: '1. No shilling',
        value: 'Don\'t promote casino affiliate links, referral codes, or your own projects. We audit casinos. We don\'t advertise them.',
      },
      {
        name: '2. No harassment',
        value: 'Calling someone out for a bad session is fine. Piling on isn\'t. If someone\'s tilting, support them — don\'t mock them.',
      },
      {
        name: '3. Keep it real',
        value: 'Fake wins and inflated claims get you removed. The whole point of this server is honest data.',
      },
      {
        name: '4. No scam links',
        value: 'Post a sketchy link and you\'re gone. No warnings. The extension flags these automatically anyway.',
      },
      {
        name: '5. Right channel, right topic',
        value: 'Session goals → <#session-goals> · Bug reports → <#bug-reports> · General chat → <#general>',
      },
      {
        name: '6. Respect the readonly channels',
        value: '`#trust-alerts`, `#casino-scores`, and `#announcements` are bot and staff channels. Posts there are automated.',
      },
    )
    .setFooter({ text: 'Questions? Ask in #general. Bugs? #bug-reports. Beta access? tiltcheck.me/beta-tester' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await msg.pin();
  console.log('✓ Posted + pinned rules');
}

async function postAnnouncement(channel: TextChannel) {
  const embed = new EmbedBuilder()
    .setColor(GOLD)
    .setTitle('🛡 TiltCheck is live.')
    .setDescription(
      'The house has been running the math for decades. We built the counter.\n\u200b'
    )
    .addFields(
      {
        name: 'What we do',
        value:
          'We score casinos for fairness and transparency. We track your session behavior and tell you when to cash out. We don\'t tell you to stop — we help you stop while you\'re ahead.',
        inline: false,
      },
      {
        name: 'Where to start',
        value:
          '→ Connect your wallet: `/linkwallet` in any channel\n→ Check your dashboard: [tiltcheck.me](https://tiltcheck.me)\n→ Install the extension: [tiltcheck.me/extension](https://tiltcheck.me/extension)\n→ Apply for beta: [tiltcheck.me/beta-tester](https://tiltcheck.me/beta-tester)',
        inline: false,
      },
      {
        name: 'The mission',
        value: 'Redeem to Win. Cash out when you\'re up. The house counts every hand. So do we.',
        inline: false,
      },
    )
    .setFooter({ text: 'TiltCheck Audit Layer · tiltcheck.me' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await msg.pin();
  console.log('✓ Posted + pinned announcement');
}

async function postSessionGoalsIntro(channel: TextChannel) {
  const embed = new EmbedBuilder()
    .setColor(TEAL)
    .setTitle('Set your goal before you play.')
    .setDescription(
      'Post your session goal here before you start. Amount, game, stop-loss. Public accountability is the whole point.\n\u200b'
    )
    .addFields(
      {
        name: 'Format (use whatever works for you)',
        value:
          '`Starting with: 0.5 SOL`\n`Stop-win: 0.8 SOL`\n`Stop-loss: 0.3 SOL`\n`Game: Stake Plinko`',
      },
      {
        name: 'Why bother?',
        value:
          'Writing it down before you start is the single most effective thing you can do. It\'s not about restriction — it\'s about having a plan when your brain wants to ignore one.',
      },
    )
    .setFooter({ text: 'Post your wins in #wins-secured · Honest reflection in #tough-love' });

  await channel.send({ embeds: [embed] });
  console.log('✓ Posted session-goals intro');
}

async function postWinsIntro(channel: TextChannel) {
  const embed = new EmbedBuilder()
    .setColor(GOLD)
    .setTitle('You cashed out. Tell us.')
    .setDescription(
      'This is the channel for wins that actually got secured — money out of the casino and into your wallet.\n\u200b'
    )
    .addFields({
      name: 'The rule',
      value:
        'A win only counts when you\'ve redeemed it. Up 3 SOL and still playing isn\'t a win. Up 3 SOL and cashed out is. Post it here.',
    })
    .setFooter({ text: 'Redeem to Win. · tiltcheck.me' });

  await channel.send({ embeds: [embed] });
  console.log('✓ Posted wins-secured intro');
}

async function postToughLoveIntro(channel: TextChannel) {
  const embed = new EmbedBuilder()
    .setColor(DARK)
    .setTitle('This is the honest channel.')
    .setDescription(
      'Bad sessions happen. This is a place to reflect on them without judgment — and without wallowing.\n\u200b'
    )
    .addFields(
      {
        name: 'What belongs here',
        value:
          'Honest post-session breakdowns. What went wrong. What you\'d do differently. What the data said vs. what you did.',
      },
      {
        name: 'What doesn\'t belong here',
        value: 'Self-pity spirals. Blaming the casino. Talking yourself into going back in.',
      },
      {
        name: 'If you\'re in a bad place',
        value:
          'Say so. This community can listen. For crisis support: **GamCare 0808 8020 133** · **National Problem Gambling Helpline 1-800-522-4700**',
      },
    )
    .setFooter({ text: 'It\'s just money. You\'re still here. · tiltcheck.me' });

  await channel.send({ embeds: [embed] });
  console.log('✓ Posted tough-love intro');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(guild: Guild) {
  console.log(`\n📬 Posting content to: ${guild.name}\n`);

  const channels = await guild.channels.fetch();

  const getTextChannel = (name: string): TextChannel | null => {
    const ch = channels.find(
      c => c?.type === ChannelType.GuildText && c.name === name
    );
    return (ch as TextChannel) ?? null;
  };

  const posts: Array<[string, (ch: TextChannel) => Promise<void>]> = [
    ['rules', postRules],
    ['announcements', postAnnouncement],
    ['session-goals', postSessionGoalsIntro],
    ['wins-secured', postWinsIntro],
    ['tough-love', postToughLoveIntro],
  ];

  for (const [name, fn] of posts) {
    const channel = getTextChannel(name);
    if (!channel) {
      console.warn(`  ⚠ Channel #${name} not found — skipping`);
      continue;
    }
    await fn(channel);
    await new Promise(r => setTimeout(r, 1000)); // rate limit buffer
  }

  console.log('\n✅ All content posted.\n');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  const guild = await client.guilds.fetch(GUILD_ID!);
  await run(guild);
  client.destroy();
});

client.login(TOKEN);
