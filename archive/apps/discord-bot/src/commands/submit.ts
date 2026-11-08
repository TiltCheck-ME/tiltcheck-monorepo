// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { suslink } from '@tiltcheck/suslink';
import { isValidUrl } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';
import { getAlertService } from '../services/alert-service.js';

function buildReplyEmbed(title: string, description: string, color: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'Made for Degens. By Degens.' });
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

async function handleBonusSubmission(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const casinoName = interaction.options.getString('casino', true).trim();
  const bonusLink = interaction.options.getString('link', true).trim();
  const details = interaction.options.getString('details', true).trim();

  if (!isValidUrl(bonusLink)) {
    await interaction.editReply({
      embeds: [
        buildReplyEmbed(
          'INVALID BONUS LINK',
          'That link is busted. Use a real http:// or https:// bonus URL.',
          0xef4444
        ),
      ],
    });
    return;
  }

  if (details.length < 10) {
    await interaction.editReply({
      embeds: [
        buildReplyEmbed(
          'DETAILS TOO THIN',
          'Give more than a two-word shrug. Add enough detail so people know what they are claiming.',
          0xef4444
        ),
      ],
    });
    return;
  }

  const scanResult = await suslink.scanUrl(bonusLink, interaction.user.id);
  if (scanResult.riskLevel !== 'safe') {
    await interaction.editReply({
      embeds: [
        buildReplyEmbed(
          'BONUS NOT VERIFIED',
          `SusLink flagged that link as **${scanResult.riskLevel.toUpperCase()}**.\nReason: ${truncate(scanResult.reason, 500)}\n\nNot posting that into bonus alerts.`,
          0xf59e0b
        ),
      ],
    });
    return;
  }

  await getAlertService().postSubmittedBonus({
    casinoName,
    bonusUrl: scanResult.url,
    details: truncate(details, 1024),
    submittedBy: interaction.user.tag,
    submittedById: interaction.user.id,
    scanReason: truncate(scanResult.reason, 1024),
  });

  await interaction.editReply({
    embeds: [
      buildReplyEmbed(
        'BONUS SUBMITTED',
        `Safe scan cleared. ${casinoName} is now posted in bonus alerts.`,
        0x22d3a6
      ),
    ],
  });
}

export const submit: Command = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit community intel that should be routed through the bot.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('bonus')
        .setDescription('Submit a bonus link for safety validation and bonus-alert posting.')
        .addStringOption((option) =>
          option
            .setName('casino')
            .setDescription('Casino or brand name')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('link')
            .setDescription('Direct bonus claim link')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('details')
            .setDescription('What the bonus is and anything worth knowing')
            .setRequired(true)
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'bonus':
        await handleBonusSubmission(interaction);
        return;
      default:
        await interaction.reply({
          content: 'Unknown submission target.',
          ephemeral: true,
        });
    }
  },
};
