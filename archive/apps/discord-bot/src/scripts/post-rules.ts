import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
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
}

const TOKEN = process.env.TILT_DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('Missing token or guild id');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  
  // Find the rules channel
  const rulesChannel = guild.channels.cache.find(c => c.name === 'rules' && c.isTextBased());
  
  if (!rulesChannel || !rulesChannel.isTextBased()) {
    console.error('Rules channel not found!');
    process.exit(1);
  }

  const embed = new EmbedBuilder()
    .setTitle('📜 The Degen Laws (Server Rules)')
    .setColor(0x17c3b2)
    .setDescription('TiltCheck is an independent audit layer for the gambling ecosystem. These are our laws. Breaking them results in immediate removal.')
    .addFields(
      { name: '1. No Shilling', value: 'Do not post your referral links, promote your own projects, or shill casinos. We are here for data, not marketing.' },
      { name: '2. No Custodial Advice', value: 'Do not offer financial advice or tell people how to manage their money. Post data, post your own goals, but do not dictate others.' },
      { name: '3. Respect the Math', value: 'We trust transparent math and data. Baseless claims about "rigged" slots without evidence or telemetry will be ignored or deleted.' },
      { name: '4. Keep it Professional', value: 'No harassment, discrimination, or toxic behavior. Have tough love, but don\'t be malicious.' },
      { name: '5. Stay On Topic', value: 'Use the right channels. Keep #casino-watch for audits and #degen-talk for session stories.' }
    )
    .setFooter({ text: 'TiltCheck Truth Layer • Redeem to Win' })
    .setTimestamp();

  await rulesChannel.send({ embeds: [embed] });
  console.log('Successfully posted rules to #rules channel!');
  
  process.exit(0);
});

client.login(TOKEN);
