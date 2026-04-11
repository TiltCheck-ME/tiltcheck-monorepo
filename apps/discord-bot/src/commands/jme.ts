// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
/**
 * JME Command Suite — Owner & Admin Audit Tools
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import type { Command } from '../types.js';
import { getRandomQuote } from '@tiltcheck/utils';
import { resetUserOnboarding } from '../handlers/onboarding.js';

export const jme: Command = {
  data: new SlashCommandBuilder()
    .setName('jme')
    .setDescription('Degen Overlord & Admin Audit Tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('purge')
        .setDescription('Surgically clean channel history')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Type of purge')
            .setRequired(true)
            .addChoices(
              { name: 'All Messages', value: 'all' },
              { name: 'Last 50', value: '50' },
              { name: 'Bot Only', value: 'bot' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Surgically reset user interaction data (Owner Only)')
        .addUserOption((o) => o.setName('target').setDescription('User to reset').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('intel')
        .setDescription('Real-time cluster & database heartbeat')
    )
    .addSubcommand((sub) =>
      sub
        .setName('rolegrant')
        .setDescription('Grant beta tester role and send onboarding DM (Owner Only)')
        .addUserOption((o) =>
          o.setName('target').setDescription('User to grant beta access').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'purge':
        await handlePurge(interaction);
        break;
      case 'reset':
        await handleReset(interaction);
        break;
      case 'intel':
        await handleIntel(interaction);
        break;
      case 'rolegrant':
        await handleBetaRolegrant(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown protocol endpoint.', ephemeral: true });
    }
  },
};

async function handleBetaRolegrant(interaction: ChatInputCommandInteraction) {
  const ownerIds = (process.env.BOT_OWNER_IDS || '1472601571496951932,229825593856163840').split(',');
  if (!ownerIds.includes(interaction.user.id)) {
    await interaction.reply({ content: '[!] UNAUTHORIZED. Owner-level clearance required.', ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('target', true);
  await interaction.deferReply({ ephemeral: true });

  const betaRoleId = process.env.BETA_TESTER_ROLE_ID || '1492283508456947904';
  const guildId = process.env.DISCORD_GUILD_ID || '1488253239643078787';

  try {
    const guild = await interaction.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(target.id);
    await member.roles.add(betaRoleId, `Beta access granted by ${interaction.user.username}`);
  } catch (err) {
    console.error('[JME] Role grant failed:', err);
    await interaction.editReply({ content: `[!] Could not assign role. Is <@${target.id}> in the server? Error: ${String(err).slice(0, 120)}` });
    return;
  }

  // Send beta onboarding DM
  let dmSent = false;
  try {
    const dm = await target.createDM();

    const betaEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('YOU ARE IN. WELCOME TO THE BETA.')
      .setDescription(
        `**${target.username}** — you just got cleared for Founder Tester access on TiltCheck.\n\n` +
        `Your role is live. Here's what you have access to:\n\n` +
        `**Trust Engines Beta** — score casinos in real-time and flag withdrawal patterns before they become a problem.\n` +
        `**Delta Engine** — RTP audit layer. It watches the math. You watch the screen.\n` +
        `**Phishing Shield** — link scanner. Paste any URL, get a threat report in seconds.\n` +
        `**Extension Build** — the full Chrome sidebar. Install it, run a session, tell us what breaks.\n\n` +
        `**Your job:** Break it. If something feels wrong, is wrong, or makes no sense — report it in <#1488256031590191174>.\n\n` +
        `Start with \`/help\` in the server to see all active commands. Or just jump into <#1488256025449595132> and start asking questions.`
      )
      .addFields(
        { name: 'Role Granted', value: 'Founder Tester', inline: true },
        { name: 'Bug Reports', value: '<#1488256031590191174>', inline: true },
        { name: 'Beta General', value: '<#1488256030579364055>', inline: true },
        { name: 'Getting Started', value: 'https://tiltcheck.me/getting-started', inline: false },
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const helpBtn = new ButtonBuilder()
      .setLabel('Getting Started')
      .setStyle(ButtonStyle.Link)
      .setURL('https://tiltcheck.me/getting-started');

    const extensionBtn = new ButtonBuilder()
      .setLabel('Apply for Extension Build')
      .setStyle(ButtonStyle.Link)
      .setURL('https://tiltcheck.me/beta-tester');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(helpBtn, extensionBtn);
    await dm.send({ embeds: [betaEmbed], components: [row] });
    dmSent = true;
  } catch (err) {
    console.error('[JME] Beta DM failed:', err);
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('BETA ACCESS GRANTED')
    .addFields(
      { name: 'User', value: `<@${target.id}> (${target.username})`, inline: true },
      { name: 'Role', value: 'Founder Tester', inline: true },
      { name: 'Onboarding DM', value: dmSent ? 'Sent' : 'Failed — DMs may be closed', inline: true },
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

  await interaction.editReply({ embeds: [confirmEmbed] });
}

async function handlePurge(interaction: ChatInputCommandInteraction) {
  const type = interaction.options.getString('type', true);
  const channel = interaction.channel as TextChannel;

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '[!] Invalid channel context.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    let deletedCount = 0;
    
    if (type === 'all' || type === '50') {
      const limit = type === 'all' ? 100 : 50; // Discord bulkDelete limit is 100
      const deleted = await channel.bulkDelete(limit, true);
      deletedCount = deleted.size;
    } else if (type === 'bot') {
      const messages = await channel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter(m => m.author.id === interaction.client.user?.id);
      await Promise.all(botMessages.map(m => m.delete()));
      deletedCount = botMessages.size;
    }

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('CHANNEL CLEANUP COMPLETE')
      .setDescription(`Removed **${deletedCount}** messages.`)
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[JME] Purge error:', error);
    await interaction.editReply({ content: '[!] Failed to execute purge. Ensure bot has Manage Messages permissions and messages are < 14 days old.' });
  }
}

async function handleReset(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('target', true);
  
  // Owner Check
  const ownerIds = (process.env.BOT_OWNER_IDS || '1472601571496951932,229825593856163840').split(',');
  const isOwner = ownerIds.includes(interaction.user.id);
  
  if (!isOwner) {
    await interaction.reply({ content: '[!] UNAUTHORIZED. Owner-level clearance required for user reset.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle('USER RESET INITIATED')
    .setDescription(`Resetting all interaction signals for **${target.username}**.`)
    .addFields(
      { name: 'Target', value: `<@${target.id}>`, inline: true },
      { name: 'Protocol', value: 'Full Reset', inline: true },
      { name: 'Status', value: 'Processing Database Purge...', inline: false }
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  await resetUserOnboarding(target.id);
}

async function handleIntel(interaction: ChatInputCommandInteraction) {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  const embed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('BOT CLUSTER — LIVE INTEL')
    .addFields(
      { name: 'Uptime', value: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`, inline: true },
      { name: 'Memory', value: `${Math.round(memory.rss / 1024 / 1024)}MB RSS`, inline: true },
      { name: 'Environment', value: process.env.NODE_ENV || 'production', inline: true },
      { name: 'Cluster', value: 'Google Cloud Run (us-central1)', inline: false },
      { name: 'DB Pooler', value: process.env.POSTGRESQL ? 'CONNECTING/READY' : 'OFFLINE', inline: true }
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });


  await interaction.reply({ embeds: [embed], ephemeral: true });
}
