// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// /launch — Opens the Degens Discord Activity

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
import { ActivityType } from '@tiltcheck/discord-activities';

let activityManager: any = null;

export function setLaunchActivityManager(manager: any): void {
  activityManager = manager;
}

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!activityManager) {
    await interaction.reply({ content: 'Activity system not ready.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.user.id;
  const guildId = interaction.guildId || 'dm';
  const channelId = interaction.channelId || 'dm';
  const sessionToken = Buffer.from(`${userId}:${Date.now()}:${uuidv4()}`).toString('base64');
  const instanceId = uuidv4();

  try {
    const instance = await activityManager.launchActivity({
      userId,
      guildId,
      channelId,
      activityType: ActivityType.TRIVIA,
      instanceId,
      sessionToken,
      applicationId: interaction.client.application?.id || '',
    });

    const embed = new EmbedBuilder()
      .setColor('#d946ef')
      .setTitle('DEGENS ACTIVITY')
      .setDescription('DA&D, Trivia, Jackpot. Pick your poison.')
      .addFields(
        { name: 'Session', value: `\`${instanceId.slice(0, 8)}\``, inline: true },
        { name: 'Status', value: instance.status, inline: true },
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`launch-activity:${instanceId}`)
        .setLabel('Launch')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('[/launch] Error:', err);
    await interaction.editReply({ content: 'Failed to launch activity.' });
  }
}

export const launch: Command = {
  data: new SlashCommandBuilder()
    .setName('launch')
    .setDescription('Open the Degens Activity — DA&D, Trivia, Jackpot'),
  execute,
};
