// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import type { Command } from '../types.js';

// Global activity manager (initialized in main index.ts)
let activityManager: any = null;

export function setActivityManager(manager: any): void {
  activityManager = manager;
}

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!activityManager) {
    await interaction.reply({
      content: 'Activity system not loaded. Try again.',
      ephemeral: true,
    });
    return;
  }

  const activityType = interaction.options.getString('game', true);
  const userId = interaction.user.id;
  const guildId = interaction.guildId || 'dm';
  const channelId = interaction.channelId || 'dm';

  try {
    // Defer reply immediately
    await interaction.deferReply({ ephemeral: true });

    // Generate session token and instance ID
    const sessionToken = Buffer.from(`${userId}:${Date.now()}:${uuidv4()}`).toString('base64');
    const instanceId = uuidv4();

    // Launch activity
    const instance = await activityManager.launchActivity({
      userId,
      guildId,
      channelId,
      activityType,
      instanceId,
      sessionToken,
      applicationId: interaction.client.application?.id || '',
      gameConfig: {
        theme: 'dark',
      },
    });

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle(`LAUNCH ${activityType.toUpperCase()}`)
      .setDescription(`${activityType.charAt(0).toUpperCase() + activityType.slice(1)} session ready. Click below to start.`)
      .addFields(
        { name: 'Game Type', value: activityType, inline: true },
        { name: 'Status', value: instance.status, inline: true },
        { name: 'Session ID', value: instanceId.slice(0, 8), inline: false }
      )
      .setFooter({ text: 'Made for Degens. By Degens.' })
      .setTimestamp();

    // Build launch button
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`launch-activity:${instanceId}`)
        .setLabel('Launch Activity')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`activity-info:${instanceId}`)
        .setLabel('Info')
        .setStyle(ButtonStyle.Secondary)
    );

    // Send reply
    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    console.log(`[/play command] Activity ${instanceId} queued for user ${userId} (${activityType})`);
  } catch (error) {
    console.error('[/play command] Error:', error);
    await interaction.editReply({
      content: 'Activity launch failed. Try again.',
    });
  }
}

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Launch an interactive game or activity')
    .addStringOption((option) =>
      option
        .setName('game')
        .setDescription('Choose a game to play')
        .setRequired(true)
        .addChoices(
          { name: 'Trivia', value: 'trivia' },
          { name: 'Poker', value: 'poker' },
          { name: 'Slots', value: 'slots' },
          { name: 'Blackjack', value: 'blackjack' }
        )
    ),
  execute,
};
