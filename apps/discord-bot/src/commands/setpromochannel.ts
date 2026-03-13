/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    .setDescription('Set the official shill channel for promo links. (Mods Only)')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Which channel are we spamming with promos?')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This is a server-only command, you ape.',
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member;
    if (!member || typeof member.permissions === 'string' || !member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: 'You don\'t have the stones (permissions) for that.',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);

    promoChannels.set(interaction.guild.id, channel.id);

    await interaction.reply({
      content: `Done. The shill zone is now <#${channel.id}>.`,
    });
  },
};
