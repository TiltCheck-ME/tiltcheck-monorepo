// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-02
 */

import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import type { DiscordActivityManager } from '@tiltcheck/discord-activities';
import { registerButtonHandler } from './button-handlers.js';

let activityManager: DiscordActivityManager | null = null;

export function setActivityManager(manager: DiscordActivityManager): void {
  activityManager = manager;
}

/**
 * Handle button clicks for launching activities
 */
export async function handleActivityButtonInteraction(
  interaction: ButtonInteraction,
  manager: DiscordActivityManager
): Promise<void> {
  const customId = interaction.customId;

  if (customId.startsWith('launch-activity:')) {
    await handleLaunchActivityButton(interaction, manager, customId);
  } else if (customId.startsWith('activity-info:')) {
    await handleActivityInfoButton(interaction, manager, customId);
  }
}

async function handleLaunchActivityButton(
  interaction: ButtonInteraction,
  manager: DiscordActivityManager,
  customId: string
): Promise<void> {
  const instanceId = customId.replace('launch-activity:', '');
  const instance = manager.getInstance(instanceId);

  if (!instance) {
    await interaction.reply({
      content: 'Activity session not found. Please try launching again.',
      ephemeral: true,
    });
    return;
  }

  // Mark as active
  instance.status = 'active';

  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('Activity Launched!')
    .setDescription(
      `Your ${instance.activityType} activity is now live!\n\n` +
        '**Browser Activity Window:**\n' +
        'The embedded game window will open in your Discord client (desktop).\n\n' +
        '**Tips:**\n' +
        '• Keep the activity window open while playing\n' +
        '• Your session will persist for 1 hour\n' +
        '• Winnings will be credited automatically'
    )
    .addFields({
      name: 'Session Info',
      value: `\`\`\`Instance: ${instanceId.slice(0, 12)}\nType: ${instance.activityType}\nStatus: ${instance.status}\`\`\``,
      inline: false,
    })
    .setFooter({ text: 'Made for Degens. By Degens.' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });

  console.log(`[Activity Button] Launched activity ${instanceId} for user ${interaction.user.id}`);
}

async function handleActivityInfoButton(
  interaction: ButtonInteraction,
  manager: DiscordActivityManager,
  customId: string
): Promise<void> {
  const instanceId = customId.replace('activity-info:', '');
  const instance = manager.getInstance(instanceId);
  const sessionState = manager.getSessionState(instanceId);

  if (!instance) {
    await interaction.reply({
      content: 'Activity session not found.',
      ephemeral: true,
    });
    return;
  }

  const createdMinutesAgo = Math.floor((Date.now() - instance.createdAt) / 60000);
  const expiresInMinutes = Math.floor((instance.expiresAt - Date.now()) / 60000);

  const embed = new EmbedBuilder()
    .setColor('#00A8FF')
    .setTitle('Activity Session Info')
    .addFields(
      { name: 'Game Type', value: instance.activityType, inline: true },
      { name: 'Status', value: instance.status, inline: true },
      { name: 'Created', value: `${createdMinutesAgo} minutes ago`, inline: true },
      { name: 'Expires In', value: `${Math.max(0, expiresInMinutes)} minutes`, inline: true },
      { name: 'Channel', value: instance.channelId, inline: true },
      { name: 'Reconnect Count', value: `${sessionState?.reconnectCount || 0}`, inline: true }
    )
    .setFooter({ text: 'Made for Degens. By Degens.' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/**
 * Register activity button handlers with the dispatcher
 */
export function registerActivityButtonHandlers(manager: DiscordActivityManager): void {
  setActivityManager(manager);

  registerButtonHandler('launch-activity:', async (interaction: any) => {
    if (activityManager) {
      await handleActivityButtonInteraction(interaction, activityManager);
    }
  });

  registerButtonHandler('activity-info:', async (interaction: any) => {
    if (activityManager) {
      await handleActivityButtonInteraction(interaction, activityManager);
    }
  });

  console.log('[ActivityButtons] Button handlers registered');
}

