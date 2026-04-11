// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

import { linkWalletToUser, findOrCreateUserByDiscord } from '@tiltcheck/db';
import { PublicKey } from '@solana/web3.js';

export const linkwallet: Command = {
  data: new SlashCommandBuilder()
    .setName('linkwallet')
    .setDescription('Link your Solana wallet address for payouts and juice drops')
    .addStringOption(opt =>
      opt
        .setName('address')
        .setDescription('Your Solana wallet address (e.g., Phantom, Trust, Solflare)')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const address = interaction.options.getString('address', true);

    // Validate Solana Address
    try {
      new PublicKey(address);
    } catch {
      await interaction.reply({ content: 'Invalid Solana address. Check the format and try again.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // 1. Sync to Truth Layer (Neon)
      const discordUser = await findOrCreateUserByDiscord(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      await linkWalletToUser(discordUser.id, address);

      const embed = new EmbedBuilder()
        .setColor(0x22d3a6)
        .setTitle('WALLET LINKED')
        .setDescription(`Wallet connected to TiltCheck. You are in the system.
        
**User:** \`${interaction.user.username}\`
**Address:** \`${address.substring(0, 4)}...${address.substring(address.length - 4)}\`

Log in to the Hub to see live telemetry.`)
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[LinkWallet] Error:', error);
      await interaction.editReply({ content: 'Wallet save failed. Try again.' });
    }
  },
};