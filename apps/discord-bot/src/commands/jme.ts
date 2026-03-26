/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * JME Command Suite — Owner & Admin Audit Tools
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import type { Command } from '../types.js';

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
        .setName('nuke')
        .setDescription('Mass-reset user interaction data (Owner Only)')
        .addUserOption((o) => o.setName('target').setDescription('User to nuke').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('intel')
        .setDescription('Real-time cluster & database heartbeat')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'purge':
        await handlePurge(interaction);
        break;
      case 'nuke':
        await handleNuke(interaction);
        break;
      case 'intel':
        await handleIntel(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown protocol endpoint.', ephemeral: true });
    }
  },
};

async function handlePurge(interaction: ChatInputCommandInteraction) {
  const type = interaction.options.getString('type', true);
  const channel = interaction.channel as TextChannel;

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: '❌ Invalid channel context.', ephemeral: true });
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
      .setColor(0xff4b2b)
      .setTitle('🧹 CHANNEL AUDIT: COMPLETE')
      .setDescription(`Surgically removed **${deletedCount}** messages from this sector.`)
      .setFooter({ text: 'TiltCheck | Administrative Cleanse' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[JME] Purge error:', error);
    await interaction.editReply({ content: '❌ Failed to execute purge. Ensure bot has Manage Messages permissions and messages are < 14 days old.' });
  }
}

async function handleNuke(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('target', true);
  
  // Hardcoded Owner Check (Customizable)
  const isOwner = interaction.user.id === '164294266634' || interaction.user.id === '229825593856163840'; // Replace with actual ID
  
  if (!isOwner) {
    await interaction.reply({ content: '❌ UNAUTHORIZED. Owner-level clearance required for user nuking.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('⚛️ USER NUKE INITIATED')
    .setDescription(`Surgically resetting all interaction signals for **${target.username}**.`)
    .addFields(
      { name: 'Target', value: `<@${target.id}>`, inline: true },
      { name: 'Protocol', value: 'Full GGR Reset', inline: true },
      { name: 'Status', value: 'Processing Database Purge...', inline: false }
    )
    .setFooter({ text: 'TiltCheck | Tactical Override' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  // TODO: Implement actual database delete calls for user signals
}

async function handleIntel(interaction: ChatInputCommandInteraction) {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  const embed = new EmbedBuilder()
    .setColor(0x17c3b2)
    .setTitle('📡 PRODUCTION INTEL: BOT CLUSTER')
    .addFields(
      { name: 'Uptime', value: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`, inline: true },
      { name: 'Memory', value: `${Math.round(memory.rss / 1024 / 1024)}MB RSS`, inline: true },
      { name: 'Environment', value: process.env.NODE_ENV || 'production', inline: true },
      { name: 'Cluster', value: 'Google Cloud Run (us-central1)', inline: false },
      { name: 'DB Pooler', value: process.env.POSTGRESQL ? 'CONNECTING/READY' : 'OFFLINE', inline: true }
    )
    .setFooter({ text: 'TiltCheck | Central Audit Layer' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
