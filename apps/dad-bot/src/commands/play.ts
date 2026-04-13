// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-02
 */

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
  const activityType = interaction.options.getString('game', true);
  const userId = interaction.user.id;
  const guildId = interaction.guildId || 'dm';
  const channelId = interaction.channelId || 'dm';

  if (activityType === 'poker') {
    const gatedEmbed = new EmbedBuilder()
      .setColor('#f59e0b')
      .setTitle('Poker launch is gated')
      .setDescription('Poker is not live in the activity launcher yet. The cross-server table handoff, promo tracking bridge, and shared trust identity work are still being finished.')
      .addFields(
        { name: 'Live now', value: 'Trivia, slots, and blackjack activities are live.', inline: false },
        { name: 'Why blocked', value: 'Poker is still disabled in the arena runtime, so launching it here would dump users into a dead path.', inline: false },
        { name: 'Next move', value: 'Use `/play` for live activities today. Poker comes back when the launch gates are green.', inline: false }
      )
      .setFooter({ text: 'Made for Degens. By Degens.' })
      .setTimestamp();

    await interaction.reply({
      embeds: [gatedEmbed],
      ephemeral: true,
    });
    return;
  }

  if (!activityManager) {
    await interaction.reply({
      content: 'Activity system not initialized. Please try again later.',
      ephemeral: true,
    });
    return;
  }

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
      .setColor('#00A8FF')
      .setTitle(`Launch ${activityType.toUpperCase()}`)
      .setDescription(`Ready to play some ${activityType}? Click the button below to start.`)
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
      content: 'Failed to launch activity. Please try again later.',
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
          { name: 'Poker (Launch Gates Pending)', value: 'poker' },
          { name: 'Slots', value: 'slots' },
          { name: 'Blackjack', value: 'blackjack' }
        )
    ),
  execute,
};
