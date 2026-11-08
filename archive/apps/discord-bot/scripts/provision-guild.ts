import { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  PermissionFlagsBits 
} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * TILTCHECK DISCORD ARCHITECT SCRIPT
 * Automatically provisions the "Closed Beta" channel structure, 
 * permissions, and descriptions for the TiltCheck ecosystem.
 */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// GUILD_ID should be the TiltCheck server ID
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN || !GUILD_ID) {
  console.error("❌ ERROR: DISCORD_TOKEN and DISCORD_GUILD_ID must be set in .env");
  process.exit(1);
}

const SCHEMA = {
  categories: [
    {
      name: '⚠️ THE GATE',
      channels: [
        { name: 'genesis-onboarding', type: ChannelType.GuildText, topic: 'Verification and manual screening for Architect applicants.' },
        { name: 'manifesto', type: ChannelType.GuildText, topic: 'The Degen Audit Layer mission and the math of fairness.' },
      ]
    },
    {
      name: '🧬 ARCHITECT SECTOR (BETA)',
      channels: [
        { name: 'dev-updates', type: ChannelType.GuildText, topic: 'Automated feed of system status and repository changes.' },
        { name: 'bug-bounty-log', type: ChannelType.GuildText, topic: 'Official ingestion point for survey.exe findings.' },
        { name: 'trust-engine-stress-test', type: ChannelType.GuildText, topic: 'Live auditing of casino reputations and player signatures.' },
      ]
    },
    {
      name: '💬 THE VOID',
      channels: [
        { name: 'general-degenerate', type: ChannelType.GuildText, topic: 'Off-topic discussion for Genesis testers.' },
        { name: 'touch-grass', type: ChannelType.GuildText, topic: 'Restricted channel for mandatory intermissions and mental health pings.' },
      ]
    }
  ]
};

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user?.tag}`);
  
  const guild = await client.guilds.fetch(GUILD_ID);
  if (!guild) {
    console.error("❌ ERROR: Could not find guild with ID", GUILD_ID);
    process.exit(1);
  }

  console.log(`🏗️  Architecting server: ${guild.name}`);

  for (const cat of SCHEMA.categories) {
    console.log(`📂 Creating category: ${cat.name}`);
    const category = await guild.channels.create({
      name: cat.name,
      type: ChannelType.GuildCategory,
    });

    for (const chan of cat.channels) {
      console.log(`  └─ 📝 Creating channel: ${chan.name}`);
      await guild.channels.create({
        name: chan.name,
        type: chan.type as any,
        parent: category.id,
        topic: chan.topic,
      });
    }
  }

  console.log("✅ ARCHITECTURE COMPLETE. System initialized.");
  process.exit(0);
});

client.login(TOKEN);
