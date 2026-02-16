/**
 * Set Promo Channel Command (Mod Only)
 * Configure the channel where promo submissions are posted
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed, errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

// In-memory storage for promo channel config (per guild)
// In production, this should be persisted to a database
const promoChannels = new Map<string, string>();

export function getPromoChannel(guildId: string): string | undefined {
  return promoChannels.get(guildId);
}

export const setpromochannel: Command = {
  data: new SlashCommandBuilder()
    .setName('setpromochannel')
    .setDescription('Set the channel for promo submissions (mods only)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to post promo submissions')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    // Check if in a guild
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed('Server Only', 'This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    // Check permissions
    const member = interaction.member;
    if (!member || typeof member.permissions === 'string') {
      await interaction.reply({
        embeds: [errorEmbed('Permission Error', 'Unable to verify permissions.')],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);

    // Store the promo channel for this guild
    promoChannels.set(interaction.guild.id, channel.id);

    await interaction.reply({
      embeds: [successEmbed(
        '✅ Promo Channel Set',
        `Promo submissions will now be posted in <#${channel.id}>`
      )],
    });
  },
};
