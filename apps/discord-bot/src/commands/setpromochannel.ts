// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Set Promo Channel Command (Mod Only)
 * Configure the channel where promo submissions are posted
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
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
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('SERVER ONLY').setDescription('This command can only be used in a server.').setFooter({ text: 'Made for Degens. By Degens.' })],
        ephemeral: true,
      });
      return;
    }

    // Check permissions
    const member = interaction.member;
    if (!member || typeof member.permissions === 'string') {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('PERMISSION ERROR').setDescription('Unable to verify permissions.').setFooter({ text: 'Made for Degens. By Degens.' })],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);

    // Store the promo channel for this guild
    promoChannels.set(interaction.guild.id, channel.id);

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x22d3a6).setTitle('PROMO CHANNEL SET').setDescription(`Promo submissions will now be posted in <#${channel.id}>`).setFooter({ text: 'Made for Degens. By Degens.' })],
    });
  },
};
